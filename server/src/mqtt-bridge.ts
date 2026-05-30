import mqtt from 'mqtt';
import { supabase } from './db.js';

type BroadcastFn = (event: string, data: unknown) => void;

let broadcast: BroadcastFn = () => {};
let mqttClient: mqtt.MqttClient | null = null;

const HIVEMQ_HOST = process.env.HIVEMQ_HOST!;
const HIVEMQ_PORT = parseInt(process.env.HIVEMQ_PORT || '8883', 10);
const HIVEMQ_USERNAME = process.env.HIVEMQ_USERNAME!;
const HIVEMQ_PASSWORD = process.env.HIVEMQ_PASSWORD!;

const MQTT_URL = `mqtts://${HIVEMQ_HOST}:${HIVEMQ_PORT}`;

/**
 * Start the MQTT bridge. Called after server is listening.
 * @param broadcastFn — SSE broadcaster function from sse.ts
 */
export function startMqttBridge(broadcastFn: BroadcastFn): void {
  broadcast = broadcastFn;

  console.log(`[MQTT] Connecting to ${MQTT_URL}...`);

  mqttClient = mqtt.connect(MQTT_URL, {
    username: HIVEMQ_USERNAME,
    password: HIVEMQ_PASSWORD,
    clientId: `smartgarden-server-${Date.now()}`,
    reconnectPeriod: 5000,
    connectTimeout: 30_000,
  });

  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to HiveMQ Cloud');
    mqttClient!.subscribe('smartgarden/#', { qos: 0 }, (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error:', err);
      } else {
        console.log('[MQTT] Subscribed to smartgarden/#');
      }
    });
  });

  mqttClient.on('message', handleMessage);

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error:', err.message);
  });

  mqttClient.on('offline', () => {
    console.warn('[MQTT] Client offline — will reconnect automatically');
  });
}

export async function handleMessage(topic: string, payload: Buffer): Promise<void> {
  // Parse topic: smartgarden/{device_code}/{type}/{subtype}
  const parts = topic.split('/');
  if (parts.length < 3 || parts[0] !== 'smartgarden') return;

  const deviceCode = parts[1];
  const subTopic = parts[2];
  const subSubTopic = parts[3] || '';

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(payload.toString());
  } catch {
    console.warn(`[MQTT] Invalid JSON on ${topic}: ${payload.toString().slice(0, 100)}`);
    return;
  }

  console.log(`[MQTT] ${topic}:`, JSON.stringify(data).slice(0, 120));

  switch (subTopic) {
    case 'sensor':
      await handleSensorMessage(deviceCode, subSubTopic, data);
      break;
    case 'ai':
      await handleAiMessage(deviceCode, subSubTopic, data);
      break;
    case 'pump':
      await handlePumpMessage(deviceCode, subSubTopic, data);
      break;
    case 'device':
      await handleDeviceMessage(deviceCode, subSubTopic, data);
      break;
    default:
      break;
  }
}

async function handleSensorMessage(
  deviceCode: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'weather') {
    const { error } = await supabase.from('sensor_data').insert({
      device_code: deviceCode,
      temp: data.temp,
      humidity: data.humidity,
      rain_intensity: data.rain ?? 0,
      timestamp: data.ts,
    });

    if (error) {
      console.error('[MQTT] sensor_data insert error:', error);
    } else {
      broadcast('sensor:weather', { device_code: deviceCode, ...data });
    }
  }

  if (type === 'soil') {
    const { error } = await supabase.from('sensor_data').insert({
      device_code: deviceCode,
      soil_moisture: data.moisture ?? data.moisture_pct,
      timestamp: data.ts,
    });

    if (error) {
      console.error('[MQTT] soil_data insert error:', error);
    } else {
      broadcast('sensor:soil', { device_code: deviceCode, ...data });
    }
  }
}

async function handleAiMessage(
  deviceCode: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'dryout') {
    const { error } = await supabase.from('ai_predictions').insert({
      device_code: deviceCode,
      predicted_hours: data.hours,
      confidence: data.confidence,
    });

    if (error) {
      console.error('[MQTT] ai_predictions insert error:', error);
    } else {
      broadcast('ai:dryout', { device_code: deviceCode, ...data });
    }
  }
}

async function handlePumpMessage(
  deviceCode: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'status') {
    const { error } = await supabase.from('pump_status').insert({
      device_code: deviceCode,
      running: data.running,
      remaining_sec: data.remaining,
      timestamp: data.ts,
    });

    if (error) {
      console.error('[MQTT] pump_status insert error:', error);
    } else {
      broadcast('pump:status', { device_code: deviceCode, ...data });
    }
  }

  if (type === 'ack') {
    // Log ack — useful for debugging, not displayed on dashboard
    console.log(`[MQTT] Pump ack: cmd_id=${data.cmd_id}, accepted=${data.accepted}`);
  }
}

async function handleDeviceMessage(
  deviceCode: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'heartbeat') {
    const { error } = await supabase
      .from('devices')
      .update({
        last_seen: new Date().toISOString(),
        is_active: true,
      })
      .eq('device_code', deviceCode);

    if (error) {
      console.error('[MQTT] heartbeat update error:', error);
    }
  }
}

/**
 * Publish a message to HiveMQ. Used by pump commands and device resets.
 */
export async function publishMqtt(
  topic: string,
  payload: string,
  opts: { qos?: 0 | 1 | 2; retain?: boolean } = {}
): Promise<void> {
  if (!mqttClient?.connected) {
    throw new Error('MQTT client not connected');
  }

  return new Promise((resolve, reject) => {
    mqttClient!.publish(
      topic,
      payload,
      { qos: opts.qos ?? 0, retain: opts.retain ?? false },
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function isMqttConnected(): boolean {
  return mqttClient?.connected ?? false;
}
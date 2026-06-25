import mqtt from 'mqtt';
import { query } from './db.js';

type BroadcastFn = (event: string, data: unknown) => void;

let broadcast: BroadcastFn = () => {};
let mqttClient: mqtt.MqttClient | null = null;

const isProd = process.env.NODE_ENV === 'production';

/**
 * Resolve MQTT broker URL and options based on environment.
 * Dev: local Mosquitto on port 1883 (TCP, no auth).
 * Prod: HiveMQ Cloud over TLS with credentials.
 */
function getMqttConfig(): { url: string; opts: mqtt.IClientOptions } {
  if (isProd) {
    return {
      url: `mqtts://${process.env.HIVEMQ_HOST}:${process.env.HIVEMQ_PORT || 8883}`,
      opts: {
        username: process.env.HIVEMQ_USERNAME,
        password: process.env.HIVEMQ_PASSWORD,
      },
    };
  }
  return {
    url: process.env.MQTT_URL || 'mqtt://localhost:1883',
    opts: {},
  };
}

/**
 * Start the MQTT bridge. Called after server is listening.
 * @param broadcastFn — SSE broadcaster function from sse.ts
 */
export function startMqttBridge(broadcastFn: BroadcastFn): void {
  broadcast = broadcastFn;

  const { url, opts } = getMqttConfig();
  const brokerLabel = isProd
    ? `HiveMQ Cloud (${process.env.HIVEMQ_HOST})`
    : url;

  console.log(`[MQTT] Connecting to ${brokerLabel}...`);

  mqttClient = mqtt.connect(url, {
    ...opts,
    clientId: `smartgarden-server-${Date.now()}`,
    reconnectPeriod: 5000,
    connectTimeout: 30_000,
  });

  mqttClient.on('connect', () => {
    console.log(`[MQTT] Connected to ${brokerLabel}`);
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

  // Update last seen and active status for the device
  try {
    const result = await query(
      'UPDATE devices SET last_seen = NOW(), is_active = true WHERE device_code = $1 AND (is_active = false OR last_seen IS NULL) RETURNING device_code',
      [deviceCode]
    );
    if (result.rows.length > 0) {
      console.log(`[Devices] Device ${deviceCode} came online`);
      broadcast('device:status', { device_code: deviceCode, is_active: true });
    } else {
      // Just update last_seen if already active
      await query(
        'UPDATE devices SET last_seen = NOW() WHERE device_code = $1',
        [deviceCode]
      );
    }
  } catch (error) {
    console.error(`[MQTT] Failed to update device activity for ${deviceCode}:`, error);
  }

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
    case 'heartbeat':
      await handleHeartbeatMessage(deviceCode, data);
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
    try {
      await query(
        'INSERT INTO sensor_data (device_code, temp, humidity, rain_intensity, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [deviceCode, data.temp, data.humidity, data.rain ?? 0, data.ts]
      );
      broadcast('sensor:weather', { device_code: deviceCode, ...data });
    } catch (error) {
      console.error('[MQTT] sensor_data insert error:', error);
    }
  }

  if (type === 'soil') {
    try {
      await query(
        'INSERT INTO sensor_data (device_code, soil_moisture, timestamp) VALUES ($1, $2, $3)',
        [deviceCode, data.moisture ?? data.moisture_pct, data.ts]
      );
      broadcast('sensor:soil', { device_code: deviceCode, ...data });
    } catch (error) {
      console.error('[MQTT] soil_data insert error:', error);
    }
  }
}

async function handleAiMessage(
  deviceCode: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'dryout') {
    try {
      await query(
        'INSERT INTO ai_predictions (device_code, predicted_hours, confidence) VALUES ($1, $2, $3)',
        [deviceCode, data.hours, data.confidence]
      );
      broadcast('ai:dryout', { device_code: deviceCode, ...data });
    } catch (error) {
      console.error('[MQTT] ai_predictions insert error:', error);
    }
  }
}

async function handlePumpMessage(
  deviceCode: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'status') {
    try {
      await query(
        'INSERT INTO pump_status (device_code, running, remaining_sec, timestamp) VALUES ($1, $2, $3, $4)',
        [deviceCode, data.running, data.remaining, data.ts]
      );
      broadcast('pump:status', { device_code: deviceCode, ...data });
    } catch (error) {
      console.error('[MQTT] pump_status insert error:', error);
    }
  }

  if (type === 'ack') {
    // Log ack — useful for debugging, not displayed on dashboard
    console.log(`[MQTT] Pump ack: cmd_id=${data.cmd_id}, accepted=${data.accepted}`);
  }
}

async function handleHeartbeatMessage(
  deviceCode: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const rssi = data.rssi !== undefined ? Number(data.rssi) : null;
    const uptime = data.uptime !== undefined ? Number(data.uptime) : null;
    const ip = typeof data.ip === 'string' ? data.ip : null;

    await query(
      'UPDATE devices SET rssi = COALESCE($1, rssi), uptime = COALESCE($2, uptime), ip_address = COALESCE($3, ip_address) WHERE device_code = $4',
      [rssi, uptime, ip, deviceCode]
    );
  } catch (error) {
    console.error('[MQTT] handleHeartbeatMessage update error:', error);
  }
}

async function handleDeviceMessage(
  deviceCode: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'heartbeat') {
    try {
      const rssi = data.rssi !== undefined ? Number(data.rssi) : null;
      const uptime = data.uptime !== undefined ? Number(data.uptime) : null;
      const ip = typeof data.ip === 'string' ? data.ip : null;

      await query(
        'UPDATE devices SET rssi = COALESCE($1, rssi), uptime = COALESCE($2, uptime), ip_address = COALESCE($3, ip_address) WHERE device_code = $4',
        [rssi, uptime, ip, deviceCode]
      );
    } catch (error) {
      console.error('[MQTT] handleDeviceMessage heartbeat update error:', error);
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

export function setBroadcast(broadcastFn: BroadcastFn): void {
  broadcast = broadcastFn;
}

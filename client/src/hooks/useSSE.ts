import { API_BASE } from './useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SensorData {
  device_code: string;
  temp: number;
  humidity: number;
  soil_moisture: number;
  rain: number;
  ts: number;
}

export interface DryoutData {
  device_code: string;
  hours: number;
  confidence: number;
  ts: number;
}

export interface PumpStatus {
  device_code: string;
  running: boolean;
  remaining: number;
  cmd_id: string;
}

export type ConnectionState = 'connecting' | 'sse' | 'polling' | 'disconnected';

export interface SensorState {
  sensor: SensorData | null;
  dryout: DryoutData | null;
  pump: PumpStatus | null;
  connection: ConnectionState;
  lastUpdate: number | null; // ms timestamp
}

// ── SSE + Polling Hybrid ──────────────────────────────────────────────────────

type MessageHandler = (data: SensorData | DryoutData | PumpStatus | object) => void;

const SSE_RETRY_DELAYS = [2000, 5000, 10000];

export function createSSEConnection(onMessage: MessageHandler, onConnectionChange: (s: ConnectionState) => void): () => void {
  let es: EventSource | null = null;
  let retryCount = 0;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  function connectSSE() {
    if (destroyed) return;
    onConnectionChange('connecting');

    es = new EventSource(`${API_BASE}/api/events`, { withCredentials: true });

    es.addEventListener('init', () => {
      retryCount = 0;
      stopPolling();
      onConnectionChange('sse');
    });

    es.addEventListener('sensor:weather', (e) => {
      const d = JSON.parse(e.data);
      // soil_moisture=0 acts as sentinel; useSensorData only updates it from soil events
      onMessage({ device_code: d.device_code, temp: d.temp, humidity: d.humidity, rain: d.rain, soil_moisture: 0, ts: d.ts });
    });

    es.addEventListener('sensor:soil', (e) => {
      const d = JSON.parse(e.data);
      onMessage({ device_code: d.device_code, temp: 0, humidity: 0, rain: 0, soil_moisture: d.moisture, ts: d.ts });
    });

    es.addEventListener('ai:dryout', (e) => {
      onMessage(JSON.parse(e.data));
    });

    es.addEventListener('pump:status', (e) => {
      onMessage(JSON.parse(e.data));
    });

    es.onerror = () => {
      es?.close();
      es = null;
      if (destroyed) return;
      scheduleRetry();
    };
  }

  function scheduleRetry() {
    const delay = SSE_RETRY_DELAYS[Math.min(retryCount, SSE_RETRY_DELAYS.length - 1)];
    retryCount++;
    if (retryCount >= SSE_RETRY_DELAYS.length) {
      startPolling();
    } else {
      setTimeout(connectSSE, delay);
    }
  }

  function startPolling() {
    onConnectionChange('polling');
    poll();
    pollingTimer = setInterval(poll, 30_000);
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  async function poll() {
    try {
      const [sensorRes, dryoutRes] = await Promise.all([
        fetch(`${API_BASE}/api/sensors/latest`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/sensors/dryout`, { credentials: 'include' }),
      ]);
      if (!sensorRes.ok || !dryoutRes.ok) throw new Error('Poll failed');
      const sensor = await sensorRes.json();
      const dryout = await dryoutRes.json();
      onMessage(sensor);
      onMessage(dryout);
    } catch {
      onConnectionChange('disconnected');
    }
  }

  connectSSE();

  return () => {
    destroyed = true;
    es?.close();
    stopPolling();
  };
}
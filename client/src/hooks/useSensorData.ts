import { useState, useEffect } from 'react';
import { DEFAULT_SENSOR_CODE, DEFAULT_PUMP_CODE, API_BASE } from '../config';
import { createSSEConnection, type SensorState, type SensorData, type DryoutData, type PumpStatus } from './useSSE';

export interface HistoryPoint {
  recorded_at: string;
  temp: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  rain_intensity: number | null;
}

export interface DeviceInfo {
  id: string;
  device_code: string;
  device_type: 'sensor' | 'pump';
  device_name: string;
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface SensorStateWithHistory extends SensorState {
  history: HistoryPoint[];
  historyLoading: boolean;
  devices: DeviceInfo[];
  devicesLoading: boolean;
}

/** Fetch latest sensor + pump + dryout from DB (initial load) */
async function fetchLatest(): Promise<{
  sensor: SensorData | null;
  pump: PumpStatus | null;
  dryout: DryoutData | null;
}> {
  const [sensorRes, pumpRes, dryoutRes] = await Promise.all([
    fetch(`${API_BASE}/api/sensors/latest`, { credentials: 'include' }),
    fetch(`${API_BASE}/api/pump/status`, { credentials: 'include' }),
    fetch(`${API_BASE}/api/sensors/dryout`, { credentials: 'include' }),
  ]);

  const sensorRaw = sensorRes.ok ? await sensorRes.json() : null;
  const pumpRaw = pumpRes.ok ? await pumpRes.json() : null;
  const dryoutRaw = dryoutRes.ok ? await dryoutRes.json() : null;

  // Map DB column names → SensorData shape
  const sensor: SensorData | null = sensorRaw && (sensorRaw.temp !== null || sensorRaw.soil_moisture !== null)
    ? {
        device_code: sensorRaw.device_code ?? DEFAULT_SENSOR_CODE,
        temp: Number(sensorRaw.temp ?? 0),
        humidity: Number(sensorRaw.humidity ?? 0),
        rain: Number(sensorRaw.rain_intensity ?? sensorRaw.rain ?? 0),
        soil_moisture: Number(sensorRaw.soil_moisture ?? 0),
        ts: sensorRaw.recorded_at ? new Date(sensorRaw.recorded_at).getTime() : Date.now(),
      }
    : null;

  const pump: PumpStatus | null = pumpRaw
    ? {
        device_code: pumpRaw.device_code ?? DEFAULT_PUMP_CODE,
        running: Boolean(pumpRaw.running),
        remaining: Number(pumpRaw.remaining_sec ?? pumpRaw.remaining ?? 0),
        cmd_id: pumpRaw.cmd_id ?? '',
      }
    : null;

  const dryout: DryoutData | null =
    dryoutRaw && dryoutRaw.predicted_hours !== null && dryoutRaw.predicted_hours !== undefined
      ? {
          device_code: dryoutRaw.device_code ?? DEFAULT_SENSOR_CODE,
          hours: Number(dryoutRaw.predicted_hours ?? dryoutRaw.hours ?? 0),
          confidence: Number(dryoutRaw.confidence ?? 0),
          ts: dryoutRaw.created_at ? new Date(dryoutRaw.created_at).getTime() : Date.now(),
        }
      : null;

  return { sensor, pump, dryout };
}

/** Fetch sensor history (last N rows) from DB */
async function fetchHistory(limit = 50): Promise<HistoryPoint[]> {
  const res = await fetch(`${API_BASE}/api/sensors/history?limit=${limit}`, { credentials: 'include' });
  if (!res.ok) return [];
  const rows: any[] = await res.json();
  return rows
    .map(r => ({
      recorded_at: r.recorded_at,
      temp: r.temp !== null && r.temp !== undefined ? Number(r.temp) : null,
      humidity: r.humidity !== null && r.humidity !== undefined ? Number(r.humidity) : null,
      soil_moisture: r.soil_moisture !== null && r.soil_moisture !== undefined ? Number(r.soil_moisture) : null,
      rain_intensity: r.rain_intensity !== null && r.rain_intensity !== undefined ? Number(r.rain_intensity) : null,
    }))
    .reverse(); // API trả về DESC, chart cần ASC
}

/** Fetch registered devices list from DB */
async function fetchDevices(): Promise<DeviceInfo[]> {
  const res = await fetch(`${API_BASE}/api/devices`, { credentials: 'include' });
  if (!res.ok) return [];
  return res.json();
}

export function useSensorData() {
  const [state, setState] = useState<SensorStateWithHistory>({
    sensor: null,
    dryout: null,
    pump: null,
    connection: 'connecting',
    lastUpdate: null,
    history: [],
    historyLoading: true,
    devices: [],
    devicesLoading: true,
  });

  // ── Initial fetch from DB ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [latest, history, devices] = await Promise.all([
          fetchLatest(),
          fetchHistory(50),
          fetchDevices()
        ]);
        if (cancelled) return;
        setState(s => ({
          ...s,
          sensor: latest.sensor ?? s.sensor,
          pump: latest.pump ?? s.pump,
          dryout: latest.dryout ?? s.dryout,
          history,
          historyLoading: false,
          devices,
          devicesLoading: false,
          lastUpdate: latest.sensor ? latest.sensor.ts : s.lastUpdate,
        }));
      } catch (err) {
        console.error('[useSensorData] Error loading database data:', err);
        if (!cancelled) {
          setState(s => ({ ...s, historyLoading: false, devicesLoading: false }));
        }
      }
    };

    loadData();

    // Poll database every 150 seconds to keep dashboard fresh even if SSE is idle
    const intervalId = setInterval(loadData, 150 * 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // ── SSE realtime updates ───────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = createSSEConnection(
      (data) => {
        if (!data || typeof data !== 'object') return;
        if ('temp' in data || 'soil_moisture' in data || 'moisture' in data) {
          const incoming = data as any;
          setState(s => {
            const prev = s.sensor;

            // Extract values supporting both SSE format and REST database format
            const tempVal = incoming.temp;
            const humVal = incoming.humidity;
            const rainVal = incoming.rain !== undefined ? incoming.rain : incoming.rain_intensity;
            const soilVal = incoming.soil_moisture !== undefined ? incoming.soil_moisture : incoming.moisture;

            const newSensor: SensorData = {
              device_code: incoming.device_code || prev?.device_code || DEFAULT_SENSOR_CODE,
              ts: incoming.ts || Date.now(),
              temp: (tempVal !== null && tempVal !== undefined && tempVal !== 0)
                ? Number(tempVal)
                : (prev?.temp ?? 0),
              humidity: (humVal !== null && humVal !== undefined && humVal !== 0)
                ? Number(humVal)
                : (prev?.humidity ?? 0),
              rain: (rainVal !== null && rainVal !== undefined && rainVal !== 0)
                ? Number(rainVal)
                : (prev?.rain ?? 0),
              soil_moisture: (soilVal !== null && soilVal !== undefined && soilVal !== 0)
                ? Number(soilVal)
                : (prev?.soil_moisture ?? 0),
            };

            // Thêm điểm mới vào history (giữ tối đa 50 điểm)
            const newHistoryPoint: HistoryPoint = {
              recorded_at: new Date().toISOString(),
              temp: newSensor.temp || null,
              humidity: newSensor.humidity || null,
              soil_moisture: soilVal || null,
              rain_intensity: rainVal || null,
            };
            const updatedHistory = [...s.history, newHistoryPoint].slice(-50);

            return {
              ...s,
              sensor: newSensor,
              history: updatedHistory,
              lastUpdate: Date.now(),
            };
          });
        } else if ('hours' in data) {
          setState(s => ({ ...s, dryout: data as DryoutData }));
        } else if ('running' in data) {
          setState(s => ({ ...s, pump: data as PumpStatus }));
        }
      },
      (connection) => setState(s => ({ ...s, connection }))
    );
    return cleanup;
  }, []);

  return state;
}
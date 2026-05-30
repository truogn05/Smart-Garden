import { useState, useEffect } from 'react';
import { createSSEConnection, type SensorState, type SensorData, type DryoutData, type PumpStatus } from './useSSE';

export function useSensorData() {
  const [state, setState] = useState<SensorState>({
    sensor: null,
    dryout: null,
    pump: null,
    connection: 'connecting',
    lastUpdate: null,
  });

  useEffect(() => {
    const cleanup = createSSEConnection(
      (data) => {
        if ('temp' in data && 'humidity' in data) {
          const incoming = data as SensorData;
          setState(s => ({
            ...s,
            sensor: {
              device_code: incoming.device_code,
              ts: incoming.ts,
              temp: incoming.temp,
              humidity: incoming.humidity,
              rain: incoming.rain,
              // weather event sends soil_moisture=0 as sentinel; soil events carry real values
              soil_moisture: incoming.soil_moisture || (s.sensor?.soil_moisture ?? 0),
            },
            lastUpdate: Date.now(),
          }));
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
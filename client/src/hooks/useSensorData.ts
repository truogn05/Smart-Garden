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
          setState(s => ({
            ...s,
            sensor: data as SensorData,
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
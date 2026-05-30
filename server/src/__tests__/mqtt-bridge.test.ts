import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../db.js';
import { handleMessage } from '../mqtt-bridge.js';

const broadcastCalls: Array<{ event: string; data: unknown }> = [];
vi.stubGlobal('broadcast', (event: string, data: unknown) => {
  broadcastCalls.push({ event, data });
});

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
  if (table === 'devices') {
    return { update: mockUpdate } as unknown as ReturnType<typeof supabase.from>;
  }
  return { insert: mockInsert } as unknown as ReturnType<typeof supabase.from>;
});

beforeEach(() => {
  vi.clearAllMocks();
  broadcastCalls.length = 0;
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockInsert.mockReturnValue({ error: null });
  mockUpdate.mockReturnValue({ error: null });
});

describe('MQTT bridge message handling', () => {
  it('drops invalid JSON without crashing', async () => {
    await expect(
      handleMessage('smartgarden/SENSOR_001/sensor/weather', Buffer.from('not json'))
    ).resolves.not.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('ignores unknown topic prefixes', async () => {
    await expect(
      handleMessage('otherprefix/SENSOR_001/sensor/weather', Buffer.from('{}'))
    ).resolves.not.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('ignores topics with fewer than 3 parts', async () => {
    await expect(
      handleMessage('smartgarden/SENSOR_001', Buffer.from('{}'))
    ).resolves.not.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('handles weather sensor message and broadcasts via SSE', async () => {
    await handleMessage(
      'smartgarden/SENSOR_001/sensor/weather',
      Buffer.from(JSON.stringify({ temp: 25.5, humidity: 65, rain: 0, ts: Date.now() }))
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        device_code: 'SENSOR_001',
        temp: 25.5,
        humidity: 65,
        rain_intensity: 0,
      })
    );
    expect(broadcastCalls).toContainEqual(
      expect.objectContaining({ event: 'sensor:weather', data: expect.objectContaining({ device_code: 'SENSOR_001' }) })
    );
  });

  it('handles soil sensor message and broadcasts via SSE', async () => {
    await handleMessage(
      'smartgarden/SENSOR_001/sensor/soil',
      Buffer.from(JSON.stringify({ moisture: 45, ts: Date.now() }))
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        device_code: 'SENSOR_001',
        soil_moisture: 45,
      })
    );
    expect(broadcastCalls).toContainEqual(
      expect.objectContaining({ event: 'sensor:soil', data: expect.objectContaining({ device_code: 'SENSOR_001' }) })
    );
  });

  it('does not broadcast when Supabase insert fails', async () => {
    mockInsert.mockReturnValue({ error: { message: 'insert failed' } });

    await handleMessage(
      'smartgarden/SENSOR_001/sensor/weather',
      Buffer.from(JSON.stringify({ temp: 25.5, humidity: 65, rain: 0, ts: Date.now() }))
    );

    expect(broadcastCalls).toHaveLength(0);
  });

  it('handles ai/dryout message', async () => {
    await handleMessage(
      'smartgarden/SENSOR_001/ai/dryout',
      Buffer.from(JSON.stringify({ hours: 4.5, confidence: 0.85 }))
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        device_code: 'SENSOR_001',
        predicted_hours: 4.5,
        confidence: 0.85,
      })
    );
    expect(broadcastCalls).toContainEqual(
      expect.objectContaining({ event: 'ai:dryout' })
    );
  });

  it('handles pump/status message', async () => {
    await handleMessage(
      'smartgarden/PUMP_001/pump/status',
      Buffer.from(JSON.stringify({ running: true, remaining: 60, ts: Date.now() }))
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        device_code: 'PUMP_001',
        running: true,
        remaining_sec: 60,
      })
    );
    expect(broadcastCalls).toContainEqual(
      expect.objectContaining({ event: 'pump:status' })
    );
  });

  it('handles heartbeat and updates device last_seen', async () => {
    await handleMessage(
      'smartgarden/SENSOR_001/device/heartbeat',
      Buffer.from(JSON.stringify({ uptime: 3600, rssi: -45 }))
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        last_seen: expect.any(String),
      })
    );
  });

  it('does not broadcast on heartbeat', async () => {
    await handleMessage(
      'smartgarden/SENSOR_001/device/heartbeat',
      Buffer.from(JSON.stringify({ uptime: 3600 }))
    );

    expect(broadcastCalls).toHaveLength(0);
  });

  it('logs pump ack without broadcasting', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleMessage(
      'smartgarden/PUMP_001/pump/ack',
      Buffer.from(JSON.stringify({ cmd_id: 'test-cmd', accepted: true }))
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Pump ack')
    );
    expect(broadcastCalls).toHaveLength(0);
    consoleSpy.mockRestore();
  });
});
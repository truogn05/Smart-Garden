import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../db.js';
import { handleMessage } from '../mqtt-bridge.js';

const broadcastCalls: Array<{ event: string; data: unknown }> = [];
vi.stubGlobal('broadcast', (event: string, data: unknown) => {
  broadcastCalls.push({ event, data });
});

// Mock the query function to track calls
vi.mock('../db.js', () => ({
  query: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  broadcastCalls.length = 0;
  // Default: successful insert
  (query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });
});

describe('MQTT bridge message handling', () => {
  it('drops invalid JSON without crashing', async () => {
    await expect(
      handleMessage('smartgarden/SENSOR_001/sensor/weather', Buffer.from('not json'))
    ).resolves.not.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('ignores unknown topic prefixes', async () => {
    await expect(
      handleMessage('otherprefix/SENSOR_001/sensor/weather', Buffer.from('{}'))
    ).resolves.not.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('ignores topics with fewer than 3 parts', async () => {
    await expect(
      handleMessage('smartgarden/SENSOR_001', Buffer.from('{}'))
    ).resolves.not.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('handles weather sensor message and broadcasts via SSE', async () => {
    await handleMessage(
      'smartgarden/SENSOR_001/sensor/weather',
      Buffer.from(JSON.stringify({ temp: 25.5, humidity: 65, rain: 0, ts: Date.now() }))
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sensor_data'),
      expect.arrayContaining(['SENSOR_001', 25.5, 65, 0])
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

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sensor_data'),
      expect.arrayContaining(['SENSOR_001', 45])
    );
    expect(broadcastCalls).toContainEqual(
      expect.objectContaining({ event: 'sensor:soil', data: expect.objectContaining({ device_code: 'SENSOR_001' }) })
    );
  });

  it('does not broadcast when query fails', async () => {
    (query as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('insert failed'));

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

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ai_predictions'),
      expect.arrayContaining(['SENSOR_001', 4.5, 0.85])
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

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pump_status'),
      expect.arrayContaining(['PUMP_001', true, 60])
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

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE devices'),
      expect.arrayContaining(['SENSOR_001'])
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

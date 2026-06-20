import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/latest', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { device } = req.query as { device?: string };

  let sql = '';
  const params: unknown[] = [];
  if (device) {
    sql = `
      SELECT 
        $1::text as device_code,
        (SELECT temp FROM sensor_data WHERE device_code = $1 AND temp IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as temp,
        (SELECT humidity FROM sensor_data WHERE device_code = $1 AND humidity IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as humidity,
        (SELECT rain_intensity FROM sensor_data WHERE device_code = $1 AND rain_intensity IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as rain_intensity,
        (SELECT soil_moisture FROM sensor_data WHERE device_code = $1 AND soil_moisture IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as soil_moisture,
        (SELECT recorded_at FROM sensor_data WHERE device_code = $1 ORDER BY recorded_at DESC LIMIT 1) as recorded_at,
        (SELECT timestamp FROM sensor_data WHERE device_code = $1 ORDER BY recorded_at DESC LIMIT 1) as timestamp
    `;
    params.push(device);
  } else {
    sql = `
      SELECT 
        (SELECT device_code FROM sensor_data ORDER BY recorded_at DESC LIMIT 1) as device_code,
        (SELECT temp FROM sensor_data WHERE temp IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as temp,
        (SELECT humidity FROM sensor_data WHERE humidity IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as humidity,
        (SELECT rain_intensity FROM sensor_data WHERE rain_intensity IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as rain_intensity,
        (SELECT soil_moisture FROM sensor_data WHERE soil_moisture IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as soil_moisture,
        (SELECT recorded_at FROM sensor_data ORDER BY recorded_at DESC LIMIT 1) as recorded_at,
        (SELECT timestamp FROM sensor_data ORDER BY recorded_at DESC LIMIT 1) as timestamp
    `;
  }

  try {
    const result = await query(sql, params);
    const data = result.rows[0] || null;
    res.json(data || { temp: null, humidity: null, soil_moisture: null, rain: null, device_code: device || 'SENSOR_001' });
  } catch (error) {
    console.error('[Sensors] getLatest error:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { device, limit = '100', range } = req.query as {
    device?: string;
    limit?: string;
    range?: '1h' | '24h' | '3d';
  };

  const params: unknown[] = [];
  if (device) {
    params.push(device);
  }

  let sql = '';
  if (range === '1h') {
    sql = `
      SELECT 
        time_bucket as recorded_at,
        AVG(temp) as temp,
        AVG(humidity) as humidity,
        AVG(soil_moisture) as soil_moisture,
        AVG(rain_intensity) as rain_intensity
      FROM (
        SELECT 
          temp,
          humidity,
          soil_moisture,
          rain_intensity,
          to_timestamp(floor(extract(epoch from recorded_at) / 150) * 150) as time_bucket
        FROM sensor_data
        WHERE recorded_at >= NOW() - INTERVAL '1 hour'
          ${device ? 'AND device_code = $1' : ''}
      ) t
      GROUP BY time_bucket
      ORDER BY time_bucket DESC
    `;
  } else if (range === '24h') {
    sql = `
      SELECT 
        time_bucket as recorded_at,
        AVG(temp) as temp,
        AVG(humidity) as humidity,
        AVG(soil_moisture) as soil_moisture,
        AVG(rain_intensity) as rain_intensity
      FROM (
        SELECT 
          temp,
          humidity,
          soil_moisture,
          rain_intensity,
          date_trunc('hour', recorded_at) as time_bucket
        FROM sensor_data
        WHERE recorded_at >= NOW() - INTERVAL '24 hours'
          ${device ? 'AND device_code = $1' : ''}
      ) t
      GROUP BY time_bucket
      ORDER BY time_bucket DESC
    `;
  } else if (range === '3d') {
    sql = `
      SELECT 
        time_bucket as recorded_at,
        AVG(temp) as temp,
        AVG(humidity) as humidity,
        AVG(soil_moisture) as soil_moisture,
        AVG(rain_intensity) as rain_intensity
      FROM (
        SELECT 
          temp,
          humidity,
          soil_moisture,
          rain_intensity,
          to_timestamp(floor(extract(epoch from date_trunc('hour', recorded_at)) / (3 * 3600)) * (3 * 3600)) as time_bucket
        FROM sensor_data
        WHERE recorded_at >= NOW() - INTERVAL '3 days'
          ${device ? 'AND device_code = $1' : ''}
      ) t
      GROUP BY time_bucket
      ORDER BY time_bucket DESC
    `;
  } else {
    // Default raw history
    const limitNum = Math.min(parseInt(limit, 10), 1000);
    sql = 'SELECT * FROM sensor_data';
    if (device) {
      sql += ' WHERE device_code = $1';
    }
    sql += ' ORDER BY recorded_at DESC LIMIT $' + (params.length + 1);
    params.push(limitNum);
  }

  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[Sensors] getHistory error:', error);
    res.status(500).json({ error: 'Failed to fetch sensor history' });
  }
});

router.get('/dryout', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { device = 'SENSOR_001' } = req.query as { device?: string };

  try {
    const result = await query(
      'SELECT * FROM ai_predictions WHERE device_code = $1 ORDER BY created_at DESC LIMIT 1',
      [device]
    );
    const data = result.rows[0] || null;
    if (!data) {
      res.json({ hours: null, confidence: null });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error('[Sensors] getDryout error:', error);
    res.status(500).json({ error: 'Failed to fetch dryout prediction' });
  }
});

router.get('/predictions', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { device = 'SENSOR_001', limit = '5' } = req.query as { device?: string; limit?: string };
  const limitNum = Math.min(parseInt(limit, 10), 50);

  try {
    const result = await query(
      'SELECT * FROM ai_predictions WHERE device_code = $1 ORDER BY created_at DESC LIMIT $2',
      [device, limitNum]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[Sensors] getPredictions error:', error);
    res.status(500).json({ error: 'Failed to fetch predictions history' });
  }
});

export default router;

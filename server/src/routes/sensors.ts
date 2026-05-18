import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../db.js';

const router = Router();

router.get('/latest', async (req: Request, res: Response) => {
  const { device } = req.query as { device?: string };

  let query = supabase
    .from('sensor_data')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(1);

  if (device) query = query.eq('device_code', device);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[Sensors] getLatest error:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
    return;
  }
  res.json(data || {});
});

router.get('/history', async (req: Request, res: Response) => {
  const { device, limit = '100' } = req.query as { device?: string; limit?: string };
  const limitNum = Math.min(parseInt(limit, 10), 1000);

  let query = supabase
    .from('sensor_data')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(limitNum);

  if (device) query = query.eq('device_code', device);

  const { data, error } = await query;
  if (error) {
    console.error('[Sensors] getHistory error:', error);
    res.status(500).json({ error: 'Failed to fetch sensor history' });
    return;
  }
  res.json(data || []);
});

router.get('/dryout', async (req: Request, res: Response) => {
  const { device = 'SENSOR_001' } = req.query as { device?: string };

  const { data, error } = await supabase
    .from('ai_predictions')
    .select('*')
    .eq('device_code', device)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Sensors] getDryout error:', error);
    res.status(500).json({ error: 'Failed to fetch dryout prediction' });
    return;
  }
  res.json(data || { hours: null, confidence: null });
});

export default router;
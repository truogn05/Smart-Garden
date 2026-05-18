import { Router } from 'express';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db.js';
import { publishMqtt } from '../mqtt-bridge.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/requireUser.js';

const router = Router();

router.post('/command', async (req: AuthRequest, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { device_code = 'PUMP_001', duration = 90 } = req.body as {
    device_code?: string;
    duration?: number;
  };
  const cmd_id = req.body.cmd_id || uuidv4();

  await supabase.from('pump_events').insert({
    device_code,
    action: 'start',
    duration,
    cmd_id,
  });

  const topic = `smartgarden/${device_code}/pump/command`;
  const payload = JSON.stringify({ action: 'start', duration, cmd_id });

  try {
    await publishMqtt(topic, payload, { qos: 1 });
    res.json({ accepted: true, cmd_id });
  } catch (err) {
    console.error('[Pump] sendCommand MQTT error:', err);
    res.status(500).json({ accepted: false, error: 'Failed to send command' });
  }
});

router.get('/status', async (req: Request, res: Response) => {
  const { device = 'PUMP_001' } = req.query as { device?: string };

  const { data, error } = await supabase
    .from('pump_status')
    .select('*')
    .eq('device_code', device)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Pump] getStatus error:', error);
    res.status(500).json({ error: 'Failed to fetch pump status' });
    return;
  }
  res.json(data || { running: false, remaining_sec: 0 });
});

export default router;
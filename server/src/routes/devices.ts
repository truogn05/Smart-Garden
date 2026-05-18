import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../db.js';
import { publishMqtt } from '../mqtt-bridge.js';

const router = Router();

router.post('/:code/reset', async (req: Request, res: Response) => {
  const { code } = req.params as { code?: string };
  if (!code) {
    res.status(400).json({ error: 'device code required' });
    return;
  }

  const { data: device } = await supabase
    .from('devices')
    .select('device_code')
    .eq('device_code', code)
    .maybeSingle();

  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  const topic = `smartgarden/${code}/reset/command`;
  const payload = JSON.stringify({ action: 'clear_wifi' });

  try {
    await publishMqtt(topic, payload, { qos: 1 });
    res.json({ success: true, message: `Reset command sent to ${code}` });
  } catch (err) {
    console.error('[Devices] resetDevice MQTT error:', err);
    res.status(500).json({ error: 'Failed to send reset command' });
  }
});

router.get('/:code/status', async (req: Request, res: Response) => {
  const { code } = req.params as { code?: string };
  if (!code) {
    res.status(400).json({ error: 'device code required' });
    return;
  }

  const { data: device } = await supabase
    .from('devices')
    .select('device_code, device_type, device_name, is_active, last_seen')
    .eq('device_code', code)
    .maybeSingle();

  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }
  res.json(device);
});

export default router;
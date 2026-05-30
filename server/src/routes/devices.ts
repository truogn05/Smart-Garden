import { Router } from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../db.js';
import { publishMqtt } from '../mqtt-bridge.js';

const router = Router();

// In-memory reset tokens (device_code → { token, expiresAt })
const resetTokens = new Map<string, { token: string; expiresAt: number }>();

// Sweep expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of resetTokens) {
    if (now > entry.expiresAt) resetTokens.delete(code);
  }
}, 60_000);

router.get('/:code/reset/init', async (req: Request, res: Response) => {
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

  const token = randomUUID();
  resetTokens.set(code, { token, expiresAt: Date.now() + 60_000 });

  res.json({ token, expires_in: 60 });
});

router.post('/:code/reset', async (req: Request, res: Response) => {
  const { code } = req.params as { code?: string };
  const { token } = req.body as { token?: string };

  if (!code) {
    res.status(400).json({ error: 'device code required' });
    return;
  }

  const entry = resetTokens.get(code);
  if (!entry || entry.token !== token || Date.now() > entry.expiresAt) {
    res.status(400).json({ error: 'Invalid or expired reset token — call /reset/init first' });
    resetTokens.delete(code);
    return;
  }
  resetTokens.delete(code);

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
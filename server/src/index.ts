import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { broadcast, addClient, removeClient } from './sse.js';
import { requireAuth } from './middleware/auth.js';
import { startMqttBridge } from './mqtt-bridge.js';
import { query } from './db.js';
import authRoutes from './routes/auth.js';
import sensorRoutes from './routes/sensors.js';
import pumpRoutes from './routes/pump.js';
import deviceRoutes from './routes/devices.js';
import weatherRoutes from './routes/weather.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.DASHBOARD_ORIGIN  // must be exact URL, e.g. https://my-app.vercel.app
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Health check (no auth)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/weather', weatherRoutes);

// SSE endpoint (JWT via httpOnly cookie — EventSource auto-sends cookies with credentials: true)
app.get('/api/events', (req, res) => {
  if (!requireAuth(req, res)) return;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`event: init\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  addClient(res);
  req.on('close', () => removeClient(res));
});

async function ensureSchema() {
  try {
    console.log('[DB] Ensuring devices table columns exist...');
    await query(`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS rssi INTEGER,
      ADD COLUMN IF NOT EXISTS uptime BIGINT
    `);
    console.log('[DB] Schema verification completed.');
  } catch (error: any) {
    console.error('[DB] Failed to ensure schema columns:', error.message);
  }
}

async function updateDeviceStatuses() {
  try {
    const result = await query(`
      UPDATE devices 
      SET is_active = false 
      WHERE (last_seen < NOW() - INTERVAL '5 minutes' OR last_seen IS NULL) 
        AND is_active = true
      RETURNING device_code
    `);
    
    if (result.rows.length > 0) {
      for (const row of result.rows) {
        console.log(`[Devices] Device ${row.device_code} went offline (no heartbeat for 5m)`);
        broadcast('device:status', { device_code: row.device_code, is_active: false });
      }
    }
  } catch (err: any) {
    console.error('[Devices] Status update error:', err.message);
  }
}

async function cleanOldData() {
  try {
    console.log('[DB] Running database retention cleanup (older than 3 days)...');
    const cutoff = "NOW() - INTERVAL '3 days'";
    await query(`DELETE FROM sensor_data WHERE recorded_at < ${cutoff}`);
    await query(`DELETE FROM pump_status WHERE recorded_at < ${cutoff}`);
    await query(`DELETE FROM pump_events WHERE created_at < ${cutoff}`);
    await query(`DELETE FROM ai_predictions WHERE created_at < ${cutoff}`);
    console.log('[DB] Cleanup completed successfully.');
  } catch (err: any) {
    console.error('[DB] Cleanup error:', err.message);
  }
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[Server] SmartGarden server running on port ${PORT}`);
    
    // Ensure DB columns exist
    await ensureSchema();
    
    startMqttBridge(broadcast);
    
    // Run cleanup on startup, then every hour
    cleanOldData();
    setInterval(cleanOldData, 60 * 60 * 1000);
    
    // Sweeper check on startup, then every 10 seconds
    updateDeviceStatuses();
    setInterval(updateDeviceStatuses, 10 * 1000);
  });
}

export default app;
export { broadcast };
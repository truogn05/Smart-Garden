import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { broadcast, addClient, removeClient } from './sse.js';
import { requireAuth } from './middleware/auth.js';
import { startMqttBridge } from './mqtt-bridge.js';
import authRoutes from './routes/auth.js';
import sensorRoutes from './routes/sensors.js';
import pumpRoutes from './routes/pump.js';
import deviceRoutes from './routes/devices.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.DASHBOARD_ORIGIN || 'https://*.vercel.app'
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

app.listen(PORT, () => {
  console.log(`[Server] SmartGarden server running on port ${PORT}`);
  startMqttBridge(broadcast);
});

export default app;
export { broadcast };
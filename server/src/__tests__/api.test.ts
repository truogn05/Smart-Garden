import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { supabase } from '../db.js';
import { signToken } from '../middleware/auth.js';

const TEST_EMAIL = 'test@smartgarden.local';
const TEST_PASSWORD = 'testpassword123';

describe('Auth endpoints', () => {
  let testUserId: string;
  const validToken = signToken({ userId: 'test-id', email: TEST_EMAIL });

  afterAll(async () => {
    // Clean up test user
    await supabase.from('users').delete().eq('email', TEST_EMAIL);
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('jwt');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(TEST_EMAIL);
      testUserId = res.body.user.id;
    });

    it('returns 409 for duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: TEST_PASSWORD });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: TEST_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('6 characters');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials and returns JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('jwt');
      expect(res.body.user.email).toBe(TEST_EMAIL);
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@smartgarden.local', password: TEST_PASSWORD });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user data with valid JWT', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(TEST_EMAIL);
    });

    it('returns 401 without Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });
});

describe('Sensor endpoints', () => {
  it('GET /api/sensors/latest returns 200', async () => {
    const res = await request(app).get('/api/sensors/latest');
    expect(res.status).toBe(200);
  });

  it('GET /api/sensors/history returns 200', async () => {
    const res = await request(app).get('/api/sensors/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/sensors/dryout returns 200', async () => {
    const res = await request(app).get('/api/sensors/dryout');
    expect(res.status).toBe(200);
  });
});

describe('Health endpoint', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('Device endpoints', () => {
  it('GET /api/devices/SENSOR_001/status returns device info', async () => {
    const res = await request(app).get('/api/devices/SENSOR_001/status');
    expect(res.status).toBe(200);
    expect(res.body.device_code).toBe('SENSOR_001');
  });

  it('GET /api/devices/UNKNOWN/status returns 404', async () => {
    const res = await request(app).get('/api/devices/UNKNOWN/status');
    expect(res.status).toBe(404);
  });

  it('POST /api/devices/SENSOR_001/reset returns 500 when MQTT not connected', async () => {
    // MQTT isn't connected in tests, so this should fail gracefully
    const res = await request(app).post('/api/devices/SENSOR_001/reset');
    expect(res.status).toBe(500);
  });
});
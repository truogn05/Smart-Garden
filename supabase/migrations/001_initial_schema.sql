-- SmartGarden Hackathon Demo — Initial Schema
-- 6 tables, no RLS (single-user demo), server-managed JWT auth

-- Users (server-managed, not Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices (pre-registered with fixed codes)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT UNIQUE NOT NULL,  -- e.g. SENSOR_001, PUMP_001
  device_type TEXT NOT NULL CHECK (device_type IN ('sensor', 'pump')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensor readings (weather + soil combined)
CREATE TABLE IF NOT EXISTS sensor_data (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT NOT NULL,
  temp DECIMAL(5,2),
  humidity DECIMAL(5,2),
  soil_moisture INTEGER,
  rain_intensity DECIMAL(5,2),
  timestamp BIGINT,        -- device millis() at read time
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI predictions (dryout estimates from ESP32)
CREATE TABLE IF NOT EXISTS ai_predictions (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT NOT NULL,
  predicted_hours DECIMAL(5,2),
  confidence DECIMAL(4,3),
  actual_hours DECIMAL(5,2),  -- filled in after watering cycle completes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump commands (issued by dashboard)
CREATE TABLE IF NOT EXISTS pump_events (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('start', 'stop')),
  duration INTEGER,         -- seconds
  cmd_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump status (reported by ESP32)
CREATE TABLE IF NOT EXISTS pump_status (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT NOT NULL,
  running BOOLEAN DEFAULT false,
  remaining_sec INTEGER,
  timestamp BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data(device_code, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_device_time ON ai_predictions(device_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pump_events_device ON pump_events(device_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pump_status_device ON pump_status(device_code, recorded_at DESC);

-- Enable RLS (write policies allow all — server uses service role key, so RLS doesn't apply)
-- Read policies are public since this is a single-user hackathon demo
-- For production: move to Supabase Auth and use auth.uid() / auth.role() policies

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_status ENABLE ROW LEVEL SECURITY;

-- All tables: public read (demo single-user), server uses service role key for writes
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public read devices" ON devices FOR SELECT USING (true);
CREATE POLICY "Public read sensor_data" ON sensor_data FOR SELECT USING (true);
CREATE POLICY "Public read ai_predictions" ON ai_predictions FOR SELECT USING (true);
CREATE POLICY "Public read pump_events" ON pump_events FOR SELECT USING (true);
CREATE POLICY "Public read pump_status" ON pump_status FOR SELECT USING (true);

-- Seed pre-registered devices (hardcoded per plan)
INSERT INTO devices (device_code, device_type, device_name) VALUES
  ('SENSOR_001', 'sensor', 'Garden Sensor'),
  ('PUMP_001', 'pump', 'Water Pump')
ON CONFLICT (device_code) DO NOTHING;
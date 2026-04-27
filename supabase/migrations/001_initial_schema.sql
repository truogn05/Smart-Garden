-- SmartGarden Database Schema
-- Apply via: supabase db push

-- Devices (ESP32)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT UNIQUE NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('sensor', 'water_pump')),
  device_name TEXT,
  mac_address TEXT UNIQUE,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weather data from DHT22 + rain sensor
CREATE TABLE IF NOT EXISTS weather_data (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT REFERENCES devices(device_code) ON DELETE CASCADE,
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  is_raining BOOLEAN,
  rain_intensity DECIMAL(5,2),
  timestamp BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soil moisture data
CREATE TABLE IF NOT EXISTS soil_data (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT REFERENCES devices(device_code) ON DELETE CASCADE,
  moisture_raw INTEGER,
  moisture_percentage INTEGER,
  timestamp BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump commands
CREATE TABLE IF NOT EXISTS pump_commands (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT REFERENCES devices(device_code) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('start', 'stop')),
  duration INTEGER,
  source TEXT NOT NULL CHECK (source IN ('manual', 'scheduled', 'google_home', 'ai_predicted')),
  cmd_id TEXT UNIQUE,
  executed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Pump status history
CREATE TABLE IF NOT EXISTS pump_status (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT REFERENCES devices(device_code) ON DELETE CASCADE,
  pump_running BOOLEAN,
  pump_duration INTEGER,
  timestamp BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watering schedules
CREATE TABLE IF NOT EXISTS watering_schedules (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT REFERENCES devices(device_code) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL CHECK (duration BETWEEN 10 AND 120),
  recurring BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Watering logs
CREATE TABLE IF NOT EXISTS watering_logs (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT REFERENCES devices(device_code) ON DELETE CASCADE,
  duration INTEGER,
  trigger_reason TEXT CHECK (trigger_reason IN ('scheduled', 'manual', 'ai_predicted', 'google_home')),
  triggered_by TEXT,
  schedule_id BIGINT REFERENCES watering_schedules(id) ON DELETE SET NULL,
  moisture_before INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI predictions
CREATE TABLE IF NOT EXISTS ai_predictions (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT REFERENCES devices(device_code) ON DELETE CASCADE,
  prediction_type TEXT CHECK (prediction_type IN ('watering_time', 'weather', 'soil_trend')),
  predicted_value JSONB,
  confidence_score DECIMAL(4,3),
  actual_value JSONB,
  was_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  polling_interval INTEGER DEFAULT 30000,
  auto_refresh_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  water_liters_per_hour DECIMAL(10,2) DEFAULT 500.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weather_device_time ON weather_data(device_code, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_soil_device_time ON soil_data(device_code, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_status_time ON watering_schedules(status, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_pump_commands_pending ON pump_commands(device_code, executed, created_at) WHERE NOT executed;
CREATE INDEX IF NOT EXISTS idx_pump_status_device ON pump_status(device_code, recorded_at DESC);

-- RLS (Row Level Security)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE watering_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE watering_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Users can read all device data
CREATE POLICY "Authenticated users can read device data" ON devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read weather data" ON weather_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read soil data" ON soil_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read pump status" ON pump_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read schedules" ON watering_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read logs" ON watering_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read AI predictions" ON ai_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read own profile" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read settings" ON system_settings FOR SELECT TO authenticated USING (true);

-- Users can write their own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access devices" ON devices FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access weather" ON weather_data FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access soil" ON soil_data FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access pump_commands" ON pump_commands FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access pump_status" ON pump_status FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access schedules" ON watering_schedules FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access logs" ON watering_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access predictions" ON ai_predictions FOR ALL TO service_role USING (true);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

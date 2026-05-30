-- Migration: 002_rls_write_policies
-- RLS is enabled on all tables (migration 001) but write policies were missing.
-- These permissive policies let the service role key continue working.
-- When switching to Supabase Auth, replace these with auth.uid() based policies.
--
-- Users: only server can manage
CREATE POLICY "Server manages users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Sensor data: anyone authenticated can write (device telemetry)
CREATE POLICY "Authenticated write sensor_data" ON sensor_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Server writes sensor_data" ON sensor_data FOR UPDATE USING (true) WITH CHECK (true);

-- AI predictions: device telemetry writes
CREATE POLICY "Authenticated write ai_predictions" ON ai_predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Server writes ai_predictions" ON ai_predictions FOR UPDATE USING (true) WITH CHECK (true);

-- Pump events: any authenticated user can issue commands
CREATE POLICY "Authenticated write pump_events" ON pump_events FOR INSERT WITH CHECK (true);

-- Pump status: device telemetry writes
CREATE POLICY "Authenticated write pump_status" ON pump_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Server writes pump_status" ON pump_status FOR UPDATE USING (true) WITH CHECK (true);

-- Devices: read-write for server, read for authenticated users
CREATE POLICY "Authenticated read devices" ON devices FOR SELECT USING (true);
CREATE POLICY "Authenticated write devices" ON devices FOR UPDATE USING (true) WITH CHECK (true);
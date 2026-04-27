-- ============================================================
-- Migration 006: RLS Policies for Main Tables
-- ============================================================

-- Ensure RLS is enabled on tables (optional, but good practice if you want to use policies)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_settings ENABLE ROW LEVEL SECURITY;

-- Schools Policies
CREATE POLICY "Allow public select on schools" ON schools FOR SELECT USING (true);
CREATE POLICY "Allow public insert on schools" ON schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on schools" ON schools FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on schools" ON schools FOR DELETE USING (true);

-- Supervisors Policies
CREATE POLICY "Allow public select on supervisors" ON supervisors FOR SELECT USING (true);
CREATE POLICY "Allow public insert on supervisors" ON supervisors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on supervisors" ON supervisors FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on supervisors" ON supervisors FOR DELETE USING (true);

-- Supervisor Wishes Policies
CREATE POLICY "Allow public select on supervisor_wishes" ON supervisor_wishes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on supervisor_wishes" ON supervisor_wishes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on supervisor_wishes" ON supervisor_wishes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on supervisor_wishes" ON supervisor_wishes FOR DELETE USING (true);

-- Distribution Runs Policies
CREATE POLICY "Allow public select on distribution_runs" ON distribution_runs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on distribution_runs" ON distribution_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on distribution_runs" ON distribution_runs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on distribution_runs" ON distribution_runs FOR DELETE USING (true);

-- Distribution Results Policies
CREATE POLICY "Allow public select on distribution_results" ON distribution_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert on distribution_results" ON distribution_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on distribution_results" ON distribution_results FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on distribution_results" ON distribution_results FOR DELETE USING (true);

-- Settings Policies
CREATE POLICY "Allow public select on distribution_settings" ON distribution_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on distribution_settings" ON distribution_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on distribution_settings" ON distribution_settings FOR UPDATE USING (true);

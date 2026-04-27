-- ============================================================
-- Migration 005: RLS Policies for Users Table
-- ============================================================

-- Enable RLS on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (so the login system can verify credentials)
CREATE POLICY "Allow public select on users" 
ON users FOR SELECT 
USING (true);

-- Allow insert/update (if you want to create users from the app later)
CREATE POLICY "Allow public insert on users" 
ON users FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on users" 
ON users FOR UPDATE 
USING (true);

-- Ensure the admin user exists
INSERT INTO users (username, password_hash, role)
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

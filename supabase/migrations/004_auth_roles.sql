-- ============================================================
-- Migration 004: Authentication & Roles
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'guidance',
        -- admin | guidance
    specialty TEXT,
        -- If role is guidance, this links them to a specific subject (e.g. 'لغة عربية')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create a default admin user
-- NOTE: In a real production system, use a secure hash function.
-- Here we insert a plain text 'admin' password for the default admin,
-- which should be hashed properly in the application layer. 
-- For simplicity in this demo, the backend will check the hash or plain text initially.
-- Let's assume the frontend/backend will use a simple hashing mechanism or we just store 'admin' for now and change it later.
INSERT INTO users (username, password_hash, role)
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

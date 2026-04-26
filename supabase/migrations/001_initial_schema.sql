-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Standalone Distribution System Initial Schema
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_code TEXT UNIQUE NOT NULL,
    school_name TEXT NOT NULL,
    stage TEXT, -- ابتدائي، إعدادي، ثانوي
    school_type TEXT, -- عام، فني، تجريبي
    needs_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Supervisors Table
CREATE TABLE IF NOT EXISTS supervisors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    national_id TEXT UNIQUE,
    name TEXT NOT NULL,
    specialty TEXT, -- اللغة العربية، الرياضيات، الخ
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Wishes Table
CREATE TABLE IF NOT EXISTS supervisor_wishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE CASCADE UNIQUE,
    wish_1 UUID REFERENCES schools(id),
    wish_2 UUID REFERENCES schools(id),
    wish_3 UUID REFERENCES schools(id),
    wish_4 UUID REFERENCES schools(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Results Table
CREATE TABLE IF NOT EXISTS distribution_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE CASCADE,
    assigned_school_id UUID REFERENCES schools(id),
    rank_achieved INTEGER DEFAULT 0, -- 1-4 for wishes, 0 for forced
    distribution_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS distribution_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default Settings for Giza / Omraniya
INSERT INTO distribution_settings (setting_key, setting_value) VALUES
('directorate_name', 'إدارة العمرانية التعليمية'),
('governorate_name', 'محافظة الجيزة'),
('academic_year', '2025/2026')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

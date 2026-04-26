-- =============================================================================
-- Migration: 002_enterprise_schema.sql
-- Enterprise-Grade Distribution System Schema
-- محافظة الجيزة - إدارة العمرانية التعليمية
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP & RECREATE: Full schema upgrade
-- ============================================================

-- Drop old tables (order matters for FK)
DROP TABLE IF EXISTS distribution_results CASCADE;
DROP TABLE IF EXISTS supervisor_wishes CASCADE;
DROP TABLE IF EXISTS supervisors CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS distribution_settings CASCADE;

-- ============================================================
-- 1. SCHOOLS TABLE
-- ============================================================
CREATE TABLE schools (
    id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_code       TEXT UNIQUE NOT NULL,
    school_name       TEXT NOT NULL,
    stage             TEXT NOT NULL DEFAULT 'ابتدائي',
        -- Values: ابتدائي | إعدادي | ثانوي
    school_type       TEXT NOT NULL DEFAULT 'حكومي',
        -- Values: حكومي | لغات | خاص | تجريبي | فني
    specialization    TEXT,
        -- Main specialization needed
    needs_count       INTEGER NOT NULL DEFAULT 1,
        -- How many evaluators needed
    address           TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schools_stage ON schools(stage);
CREATE INDEX idx_schools_type ON schools(school_type);
CREATE INDEX idx_schools_active ON schools(is_active);

-- ============================================================
-- 2. EVALUATORS (SUPERVISORS) TABLE
-- ============================================================
CREATE TABLE supervisors (
    id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    national_id       TEXT UNIQUE,
    name              TEXT NOT NULL,
    specialty         TEXT NOT NULL DEFAULT 'عام',
        -- Main subject/specialization
    stage             TEXT DEFAULT 'ابتدائي',
        -- Preferred stage
    school_type       TEXT DEFAULT 'حكومي',
        -- Preferred school type
    home_school_id    UUID REFERENCES schools(id) ON DELETE SET NULL,
        -- Cannot be assigned to own school
    max_assignments   INTEGER DEFAULT 1,
        -- Max number of schools this evaluator can cover
    phone             TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supervisors_specialty ON supervisors(specialty);
CREATE INDEX idx_supervisors_home_school ON supervisors(home_school_id);
CREATE INDEX idx_supervisors_active ON supervisors(is_active);

-- ============================================================
-- 3. EVALUATOR PREFERENCES TABLE
-- ============================================================
CREATE TABLE supervisor_wishes (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supervisor_id   UUID REFERENCES supervisors(id) ON DELETE CASCADE UNIQUE,
    wish_1          UUID REFERENCES schools(id) ON DELETE SET NULL,
    wish_2          UUID REFERENCES schools(id) ON DELETE SET NULL,
    wish_3          UUID REFERENCES schools(id) ON DELETE SET NULL,
    wish_4          UUID REFERENCES schools(id) ON DELETE SET NULL,
    notes           TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wishes_supervisor ON supervisor_wishes(supervisor_id);

-- ============================================================
-- 4. DISTRIBUTION RUNS (AUDIT)
-- ============================================================
CREATE TABLE distribution_runs (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    run_name        TEXT NOT NULL DEFAULT 'توزيع جديد',
    academic_year   TEXT NOT NULL DEFAULT '2025/2026',
    status          TEXT NOT NULL DEFAULT 'draft',
        -- draft | completed | archived
    algorithm_params JSONB DEFAULT '{}',
        -- Parameters used in this run
    total_assigned  INTEGER DEFAULT 0,
    total_forced    INTEGER DEFAULT 0,
    satisfaction_rate NUMERIC(5,2) DEFAULT 0,
        -- % of wish-based assignments
    created_by      TEXT DEFAULT 'admin',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ASSIGNMENTS / RESULTS TABLE
-- ============================================================
CREATE TABLE distribution_results (
    id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    run_id              UUID REFERENCES distribution_runs(id) ON DELETE CASCADE,
    supervisor_id       UUID REFERENCES supervisors(id) ON DELETE CASCADE,
    assigned_school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,

    -- Scoring
    final_score         NUMERIC(10,2) DEFAULT 0,
    rank_achieved       INTEGER DEFAULT 0,
        -- 1=wish1 2=wish2 3=wish3 4=wish4 0=forced
    is_forced           BOOLEAN DEFAULT FALSE,
    is_manual_override  BOOLEAN DEFAULT FALSE,

    -- Explainability (JSON score breakdown)
    score_breakdown     JSONB DEFAULT '{}',
    rejection_reasons   JSONB DEFAULT '[]',

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_results_run ON distribution_results(run_id);
CREATE INDEX idx_results_supervisor ON distribution_results(supervisor_id);
CREATE INDEX idx_results_school ON distribution_results(assigned_school_id);

-- ============================================================
-- 6. OVERRIDE LOG TABLE
-- ============================================================
CREATE TABLE override_logs (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    run_id          UUID REFERENCES distribution_runs(id) ON DELETE CASCADE,
    result_id       UUID REFERENCES distribution_results(id) ON DELETE CASCADE,
    previous_school_id UUID REFERENCES schools(id),
    new_school_id   UUID REFERENCES schools(id),
    override_reason TEXT,
    overridden_by   TEXT DEFAULT 'admin',
    overridden_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. SETTINGS TABLE
-- ============================================================
CREATE TABLE distribution_settings (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key     TEXT UNIQUE NOT NULL,
    setting_value   TEXT NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================
INSERT INTO distribution_settings (setting_key, setting_value) VALUES
('directorate_name',    'إدارة العمرانية التعليمية'),
('governorate_name',    'محافظة الجيزة'),
('academic_year',       '2025/2026'),
('wish1_score',         '100'),
('wish2_score',         '80'),
('wish3_score',         '60'),
('wish4_score',         '40'),
('forced_score',        '10'),
('specialization_bonus','30'),
('stage_bonus',         '20'),
('type_bonus',          '20'),
('workload_penalty',    '15'),
('max_default_load',    '1')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ============================================================
-- HELPER: Update updated_at automatically
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schools_updated_at
    BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_supervisors_updated_at
    BEFORE UPDATE ON supervisors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

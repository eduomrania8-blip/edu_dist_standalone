-- =============================================================================
-- Migration: 007_expansion_phase1.sql
-- إضافة الوظيفة على الكادر للموجهين وتتبع المدارس التي يزورونها طوال العام
-- =============================================================================

-- 1. إضافة الحقول الجديدة لجدول الموجهين
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS appointment_type TEXT;

-- 2. جدول المدارس السنوية (المتابعة الدورية للموجهين)
CREATE TABLE IF NOT EXISTS supervisor_annual_schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- الموجه لا يمكن أن يُخصص لنفس المدرسة أكثر من مرة في المتابعة
    UNIQUE(supervisor_id, school_id)
);

-- 3. إضافة سياسات الأمان RLS
ALTER TABLE supervisor_annual_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
    ON supervisor_annual_schools FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable all actions for admin"
    ON supervisor_annual_schools FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        (auth.jwt() ->> 'email') = 'admin@edu.local'
    );

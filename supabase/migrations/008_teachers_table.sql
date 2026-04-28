-- =============================================================================
-- Migration: 008_teachers_table.sql
-- جدول المعلمين للتسجيل والمتابعة السنوية
-- =============================================================================

CREATE TABLE IF NOT EXISTS teachers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,         -- الرقم القومي (14 رقم)
    name TEXT NOT NULL,                       -- الاسم رباعي
    phone TEXT,                               -- المحمول
    address TEXT,                             -- العنوان
    subject TEXT,                             -- المادة التدريسية
    teacher_code TEXT,                        -- كود المعلم
    qualification TEXT,                       -- المؤهل العلمي
    university TEXT,                          -- الجامعة
    grad_year INT,                            -- سنة التخرج
    grade TEXT,                               -- التقدير
    contract_type TEXT DEFAULT 'بالأجر',      -- نوع التعيين
    start_date DATE,                          -- تاريخ العمل
    diploma TEXT,                             -- الدبلوم التربوي
    dob DATE,                                 -- تاريخ الميلاد (من الرقم القومي)
    gov TEXT,                                 -- المحافظة (من الرقم القومي)
    base_school_id UUID REFERENCES base_schools(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_teachers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_teachers_updated_at();

-- RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for own record"
    ON teachers FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public insert"
    ON teachers FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public update own record"
    ON teachers FOR UPDATE
    TO anon, authenticated
    USING (true);

CREATE POLICY "Enable all actions for admin"
    ON teachers FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'email') = 'admin@edu.local'
    );

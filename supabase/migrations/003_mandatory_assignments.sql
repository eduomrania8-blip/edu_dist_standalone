-- ============================================================
-- Migration 003: Mandatory Assignments & Administration Data
-- ============================================================

-- 1. Add mandatory_supervisor_id to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS mandatory_supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL;

-- 2. Insert the new required administration settings
INSERT INTO distribution_settings (setting_key, setting_value) VALUES
('officials_gm_name',    'أ/ خالد عبد الحميد'),
('officials_gm_title',   'مدير عام الإدارة'),
('officials_gm_phone',   ''),
('officials_deputy_name','أ/ أحمد محمود'),
('officials_deputy_title','وكيل الإدارة'),
('officials_deputy_phone',''),
('officials_security_name','أ/ طارق محمد'),
('officials_security_title','مسؤول أمن الإدارة'),
('officials_security_phone',''),
('officials_mgr_primary','أ/ مصطفى كامل'),
('officials_mgr_primary_phone',''),
('officials_mgr_prep',   'أ/ علي إبراهيم'),
('officials_mgr_prep_phone',''),
('officials_mgr_sec',    'أ/ محمود سعيد'),
('officials_mgr_sec_phone','')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSettings, updateSetting } from '@/services/distributionService';

const SETTING_LABELS: Record<string, string> = {
  directorate_name:    'اسم الإدارة التعليمية',
  governorate_name:    'اسم المحافظة',
  academic_year:       'العام الدراسي',
  wish1_score:         'نقاط الرغبة الأولى',
  wish2_score:         'نقاط الرغبة الثانية',
  wish3_score:         'نقاط الرغبة الثالثة',
  wish4_score:         'نقاط الرغبة الرابعة',
  forced_score:        'نقاط التوزيع الاضطراري',
  specialization_bonus:'مكافأة التخصص',
  stage_bonus:         'مكافأة المرحلة',
  type_bonus:          'مكافأة نوع المدرسة',
  workload_penalty:    'عقوبة العبء الزائد',
  max_default_load:    'الحد الأقصى الافتراضي للمدارس',
};

const SETTING_GROUPS = [
  {
    title: 'بيانات الإدارة',
    keys: ['directorate_name', 'governorate_name', 'academic_year'],
  },
  {
    title: 'نقاط الرغبات',
    keys: ['wish1_score', 'wish2_score', 'wish3_score', 'wish4_score', 'forced_score'],
  },
  {
    title: 'معاملات الخوارزمية',
    keys: ['specialization_bonus', 'stage_bonus', 'type_bonus', 'workload_penalty', 'max_default_load'],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setDrafts(s);
    }).finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setDrafts(d => ({ ...d, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await updateSetting(key, drafts[key] ?? '');
      setSettings(s => ({ ...s, [key]: drafts[key] }));
      toast.success('تم الحفظ بنجاح');
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (key: string) => {
    setDrafts(d => ({ ...d, [key]: settings[key] ?? '' }));
  };

  const isNumeric = (key: string) =>
    !['directorate_name', 'governorate_name', 'academic_year'].includes(key);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">إعدادات النظام</h1>
          <p className="page-subtitle">تخصيص معاملات الخوارزمية وبيانات الإدارة</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 16 }} />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="skeleton" style={{ height: 38, marginBottom: 12, borderRadius: 8 }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SETTING_GROUPS.map(group => (
            <div key={group.title} className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Settings size={15} color="#22d3ee" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                  {group.title}
                </h3>
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {group.keys.map(key => {
                  const isDirty = drafts[key] !== settings[key];
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label className="form-label" style={{ margin: 0, minWidth: 220, flex: 'none' }}>
                        {SETTING_LABELS[key] ?? key}
                      </label>
                      <input
                        className="form-input"
                        type={isNumeric(key) ? 'number' : 'text'}
                        value={drafts[key] ?? ''}
                        onChange={e => handleChange(key, e.target.value)}
                        style={{
                          borderColor: isDirty ? 'rgba(34,211,238,0.4)' : undefined,
                          flex: 1,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isDirty && (
                          <button
                            onClick={() => handleReset(key)}
                            style={{
                              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                              color: '#64748b', display: 'flex', alignItems: 'center',
                            }}
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        <button
                          className={isDirty ? 'btn-primary' : 'btn-secondary'}
                          style={{ padding: '6px 14px', fontSize: 12, opacity: isDirty ? 1 : 0.5 }}
                          onClick={() => handleSave(key)}
                          disabled={!isDirty || saving === key}
                        >
                          {saving === key
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Save size={12} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* System Info */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>معلومات النظام</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'الإصدار', value: '2.0 Enterprise' },
                { label: 'إطار العمل', value: 'Next.js 16 + Supabase' },
                { label: 'قاعدة البيانات', value: 'PostgreSQL (Supabase)' },
                { label: 'الخوارزمية', value: 'Scoring + Swap Optimization' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10, padding: '10px 14px',
                }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{item.label}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

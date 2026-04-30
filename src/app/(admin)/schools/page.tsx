'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAllSchools, createSchool, updateSchool, deleteSchool, getUniqueStages
} from '@/services/distributionService';
import { School, SchoolFormData, SCHOOL_TYPES } from '@/types/database';

const EMPTY_FORM: SchoolFormData = {
  school_code: '',
  school_name: '',
  stage: 'ابتدائي',
  school_type: 'رسمى',
  specialization: '',
  needs_count: 1,
  address: '',
  mandatory_supervisor_id: '',
  is_active: true,
};

const stageColor: Record<string, string> = {
  'ابتدائي': 'badge-cyan',
  'إعدادي': 'badge-purple',
  'ثانوي': 'badge-amber',
};

const typeColor: Record<string, string> = {
  'رسمى': 'badge-green',
  'رسمى لغات': 'badge-blue',
  'خاص عربى': 'badge-rose',
  'خاص لغات': 'badge-purple',
  'دولى': 'badge-amber',
  'ثقافى': 'badge-cyan',
  'فنى': 'badge-purple',
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<SchoolFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, uniqueStages] = await Promise.all([
        getAllSchools(), getUniqueStages()
      ]);
      setSchools(data);
      setStages(uniqueStages);
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = schools.filter(s => {
    const matchSearch = s.school_name.includes(search) || s.school_code.includes(search) || (s.address ?? '').includes(search);
    const matchStage = stageFilter ? s.stage === stageFilter : true;
    const matchType = typeFilter ? s.school_type === typeFilter : true;
    return matchSearch && matchStage && matchType;
  });

  // Stats by stage
  const stageCounts = stages.map(st => ({
    label: st,
    count: schools.filter(s => s.stage === st).length,
  }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (school: School) => {
    setEditing(school);
    setForm({
      school_code: school.school_code,
      school_name: school.school_name,
      stage: school.stage,
      school_type: school.school_type,
      specialization: school.specialization ?? '',
      needs_count: school.needs_count ?? 1,
      address: school.address ?? '',
      mandatory_supervisor_id: school.mandatory_supervisor_id ?? '',
      is_active: school.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.school_code.trim() || !form.school_name.trim()) {
      toast.error('كود المقر والاسم مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, mandatory_supervisor_id: form.mandatory_supervisor_id || undefined };
      if (editing) {
        await updateSchool(editing.id, payload);
        toast.success('تم تحديث المقر بنجاح');
      } else {
        await createSchool(payload);
        toast.success('تمت إضافة المقر بنجاح');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (school: School) => {
    if (!confirm(`هل تريد حذف "${school.school_name}"؟`)) return;
    try {
      await deleteSchool(school.id);
      toast.success('تم الحذف');
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">مقرات اللجان</h1>
          <p className="page-subtitle">{schools.length} مقر مسجّل</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> إضافة مقر
        </button>
      </div>

      {/* Stage Quick Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {stageCounts.map(({ label, count }) => (
          <button
            key={label}
            onClick={() => setStageFilter(stageFilter === label ? '' : label)}
            style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              border: stageFilter === label ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: stageFilter === label ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)',
              color: stageFilter === label ? '#22d3ee' : '#94a3b8',
              transition: 'all 0.15s',
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={15} style={{ color: '#64748b', flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            className="form-input"
            style={{ paddingRight: 36 }}
            placeholder="بحث بالاسم أو الكود أو العنوان..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ width: 150, flex: '0 0 auto' }}
          value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="">كل المراحل</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-input" style={{ width: 150, flex: '0 0 auto' }}
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">كل الأنواع</option>
          {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{filtered.length} نتيجة</span>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الكود</th>
                <th>اسم المقر / المدرسة</th>
                <th>المرحلة</th>
                <th>النوع</th>
                <th>العنوان</th>
                <th>الموجهين المطلوبين</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                    لا توجد مقرات مطابقة
                  </td>
                </tr>
              ) : (
                filtered.map((school, idx) => (
                  <tr key={school.id}>
                    <td style={{ color: '#64748b', fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: 13 }}>{school.school_code}</td>
                    <td style={{ fontWeight: 600 }}>{school.school_name}</td>
                    <td><span className={`badge ${stageColor[school.stage] ?? 'badge-blue'}`}>{school.stage}</span></td>
                    <td><span className={`badge ${typeColor[school.school_type] ?? 'badge-blue'}`}>{school.school_type}</span></td>
                    <td style={{ color: '#64748b', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {school.address || '—'}
                    </td>
                    <td>
                      <span className="badge badge-green">{school.needs_count ?? 1}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openEdit(school)}
                          style={{
                            padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer',
                            fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <Pencil size={12} /> تعديل
                        </button>
                        <button className="btn-danger" style={{ padding: '5px 9px' }} onClick={() => handleDelete(school)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 800 }}>
              {editing ? 'تعديل مقر اللجنة' : 'إضافة مقر جديد'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">كود المقر *</label>
                <input className="form-input" value={form.school_code}
                  onChange={e => setForm(f => ({ ...f, school_code: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">اسم المدرسة / المقر *</label>
                <input className="form-input" value={form.school_name}
                  onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">المرحلة الدراسية</label>
                <select className="form-input" value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value as any }))}>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">نوع المدرسة</label>
                <select className="form-input" value={form.school_type}
                  onChange={e => setForm(f => ({ ...f, school_type: e.target.value as any }))}>
                  {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">عدد الموجهين المطلوبين</label>
                <input className="form-input" type="number" min={1} max={20}
                  value={form.needs_count}
                  onChange={e => setForm(f => ({ ...f, needs_count: Number(e.target.value) }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">العنوان (اختياري)</label>
                <input className="form-input" value={form.address ?? ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

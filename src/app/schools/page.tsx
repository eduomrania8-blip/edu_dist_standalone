'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAllSchools, createSchool, updateSchool, deleteSchool, getAllSupervisors
} from '@/services/distributionService';
import {
  School, SchoolFormData, STAGES, SCHOOL_TYPES, SPECIALIZATIONS, Supervisor
} from '@/types/database';

const EMPTY_FORM: SchoolFormData = {
  school_code: '',
  school_name: '',
  stage: 'ابتدائي',
  school_type: 'حكومي',
  specialization: '',
  needs_count: 1,
  address: '',
  mandatory_supervisor_id: '',
  is_active: true,
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<SchoolFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sups] = await Promise.all([getAllSchools(), getAllSupervisors()]);
      setSchools(data);
      setSupervisors(sups);
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = schools.filter(s => {
    const matchSearch = s.school_name.includes(search) || s.school_code.includes(search);
    const matchStage = stageFilter ? s.stage === stageFilter : true;
    return matchSearch && matchStage;
  });

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
      toast.error('كود المدرسة والاسم مطلوبان');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateSchool(editing.id, form);
        toast.success('تم تحديث المدرسة بنجاح');
      } else {
        await createSchool(form);
        toast.success('تمت إضافة المدرسة بنجاح');
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

  const stageColor: Record<string, string> = {
    'ابتدائي': 'badge-cyan',
    'إعدادي': 'badge-purple',
    'ثانوي': 'badge-amber',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة المدارس</h1>
          <p className="page-subtitle">{schools.length} مدرسة مسجّلة</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> إضافة مدرسة
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            className="form-input"
            style={{ paddingRight: 36 }}
            placeholder="بحث بالاسم أو الكود..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          style={{ width: 160 }}
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
        >
          <option value="">كل المراحل</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>اسم المدرسة</th>
                <th>المرحلة</th>
                <th>النوع</th>
                <th>التخصص</th>
                <th>الموجه الإجباري</th>
                <th>الاحتياج</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                    لا توجد مدارس مطابقة
                  </td>
                </tr>
              ) : (
                filtered.map(school => (
                  <tr key={school.id}>
                    <td style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: 13 }}>{school.school_code}</td>
                    <td style={{ fontWeight: 600 }}>{school.school_name}</td>
                    <td><span className={`badge ${stageColor[school.stage] ?? 'badge-blue'}`}>{school.stage}</span></td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{school.school_type}</td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{school.specialization || '—'}</td>
                    <td>
                      {school.mandatory_supervisor_id ? (
                        <span className="badge badge-purple">
                          {supervisors.find(s => s.id === school.mandatory_supervisor_id)?.name || 'إجباري'}
                        </span>
                      ) : (
                        <span style={{ color: '#475569', fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-green">{school.needs_count ?? 1} موجه</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => openEdit(school)}
                          style={{
                            padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer',
                            fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <Pencil size={12} /> تعديل
                        </button>
                        <button className="btn-danger" onClick={() => handleDelete(school)}>
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
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 800 }}>
              {editing ? 'تعديل مدرسة' : 'إضافة مدرسة جديدة'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">كود المدرسة *</label>
                <input className="form-input" value={form.school_code}
                  onChange={e => setForm(f => ({ ...f, school_code: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">اسم المدرسة *</label>
                <input className="form-input" value={form.school_name}
                  onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">المرحلة</label>
                <select className="form-input" value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value as any }))}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">النوع</label>
                <select className="form-input" value={form.school_type}
                  onChange={e => setForm(f => ({ ...f, school_type: e.target.value as any }))}>
                  {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">التخصص المطلوب</label>
                <select className="form-input" value={form.specialization}
                  onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}>
                  <option value="">عام (أي تخصص)</option>
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">عدد الموجهين المطلوبين</label>
                <input className="form-input" type="number" min={1} max={10}
                  value={form.needs_count}
                  onChange={e => setForm(f => ({ ...f, needs_count: Number(e.target.value) }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">العنوان (اختياري)</label>
                <input className="form-input" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">الموجه الإجباري (التكليف الإداري المسبق - اختياري)</label>
                <select className="form-input" value={form.mandatory_supervisor_id || ''}
                  onChange={e => setForm(f => ({ ...f, mandatory_supervisor_id: e.target.value || undefined }))}>
                  <option value="">-- بدون موجه إجباري --</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.specialty})</option>
                  ))}
                </select>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>سيقوم النظام بتسكين هذا الموجه على هذه المدرسة فوراً وتخطي خوارزمية النقاط.</p>
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

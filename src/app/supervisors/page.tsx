'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAllSupervisors, createSupervisor, updateSupervisor, deleteSupervisor, getAllSchools,
} from '@/services/distributionService';
import {
  Supervisor, SupervisorFormData, School, STAGES, SCHOOL_TYPES, SPECIALIZATIONS,
} from '@/types/database';

const EMPTY_FORM: SupervisorFormData = {
  national_id: '',
  name: '',
  specialty: 'عام',
  stage: 'ابتدائي',
  school_type: 'حكومي',
  home_school_id: undefined,
  max_assignments: 1,
  phone: '',
  is_active: true,
};

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supervisor | null>(null);
  const [form, setForm] = useState<SupervisorFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sups, schs] = await Promise.all([getAllSupervisors(), getAllSchools()]);
      setSupervisors(sups);
      setSchools(schs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = supervisors.filter(s =>
    s.name.includes(search) || s.specialty.includes(search) || (s.national_id ?? '').includes(search)
  );

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (sup: Supervisor) => {
    setEditing(sup);
    setForm({
      national_id: sup.national_id ?? '',
      name: sup.name,
      specialty: sup.specialty,
      stage: sup.stage ?? 'ابتدائي',
      school_type: sup.school_type ?? 'حكومي',
      home_school_id: sup.home_school_id,
      max_assignments: sup.max_assignments ?? 1,
      phone: sup.phone ?? '',
      is_active: sup.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('اسم الموجه مطلوب'); return; }
    setSaving(true);
    try {
      const payload = { ...form, home_school_id: form.home_school_id || undefined };
      if (editing) {
        await updateSupervisor(editing.id, payload);
        toast.success('تم تحديث الموجه');
      } else {
        await createSupervisor(payload);
        toast.success('تم إضافة الموجه');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sup: Supervisor) => {
    if (!confirm(`هل تريد حذف "${sup.name}"؟`)) return;
    try {
      await deleteSupervisor(sup.id);
      toast.success('تم الحذف');
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الموجهين</h1>
          <p className="page-subtitle">{supervisors.length} موجه مسجّل</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> إضافة موجه
        </button>
      </div>

      {/* Search */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="form-input" style={{ paddingRight: 36 }}
            placeholder="بحث بالاسم أو التخصص أو الرقم القومي..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>التخصص</th>
                <th>المرحلة</th>
                <th>مدرسته</th>
                <th>الحد الأقصى</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#475569' }}>لا توجد نتائج</td></tr>
              ) : (
                filtered.map(sup => (
                  <tr key={sup.id}>
                    <td style={{ fontWeight: 600 }}>{sup.name}</td>
                    <td><span className="badge badge-purple">{sup.specialty}</span></td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{sup.stage ?? '—'}</td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>
                      {(sup.home_school as any)?.school_name ?? '—'}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{sup.max_assignments ?? 1} مدرسة</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(sup)} style={{
                          padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer',
                          fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Pencil size={12} /> تعديل
                        </button>
                        <button className="btn-danger" onClick={() => handleDelete(sup)}>
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
              {editing ? 'تعديل موجه' : 'إضافة موجه جديد'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">الاسم الكامل *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">الرقم القومي</label>
                <input className="form-input" value={form.national_id}
                  onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">رقم الهاتف</label>
                <input className="form-input" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">التخصص</label>
                <select className="form-input" value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المرحلة</label>
                <select className="form-input" value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value as any }))}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">نوع المدرسة المفضّل</label>
                <select className="form-input" value={form.school_type}
                  onChange={e => setForm(f => ({ ...f, school_type: e.target.value as any }))}>
                  {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">الحد الأقصى للمدارس</label>
                <input className="form-input" type="number" min={1} max={10}
                  value={form.max_assignments}
                  onChange={e => setForm(f => ({ ...f, max_assignments: Number(e.target.value) }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">مدرسته الأصلية (لا يجوز التوزيع عليها)</label>
                <select className="form-input" value={form.home_school_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, home_school_id: e.target.value || undefined }))}>
                  <option value="">بدون تحديد</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
                </select>
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

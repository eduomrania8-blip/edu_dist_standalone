'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAllBaseSchools, createBaseSchool, updateBaseSchool, deleteBaseSchool
} from '@/services/distributionService';
import { BaseSchool, BaseSchoolFormData, SCHOOL_TYPES } from '@/types/database';

const EMPTY_FORM: BaseSchoolFormData = {
  school_code: '',
  school_name: '',
  stage: 'ابتدائي',
  school_type: 'حكومي',
  administration: 'العمرانية',
};

const stageColor: Record<string, string> = {
  'ابتدائي': 'badge-cyan',
  'إعدادي': 'badge-purple',
  'ثانوي': 'badge-amber',
  'متعدد المراحل': 'badge-green',
};

const typeColor: Record<string, string> = {
  'حكومي': 'badge-green',
  'لغات': 'badge-blue',
  'خاص': 'badge-rose',
  'تجريبي': 'badge-amber',
  'فني': 'badge-purple',
};

export default function BaseSchoolsPage() {
  const [schools, setSchools] = useState<BaseSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BaseSchool | null>(null);
  const [form, setForm] = useState<BaseSchoolFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllBaseSchools();
      setSchools(data);
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = schools.filter(s => {
    const matchSearch = s.school_name.includes(search) || (s.school_code || '').includes(search);
    const matchStage = stageFilter ? s.stage === stageFilter : true;
    const matchType = typeFilter ? s.school_type === typeFilter : true;
    return matchSearch && matchStage && matchType;
  });

  // Calculate unique stages from current schools
  const uniqueStages = Array.from(new Set(schools.map(s => s.stage))).filter(Boolean);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (school: BaseSchool) => {
    setEditing(school);
    setForm({
      school_code: school.school_code || '',
      school_name: school.school_name,
      stage: school.stage,
      school_type: school.school_type,
      administration: school.administration || 'العمرانية',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.school_name.trim()) {
      toast.error('اسم المدرسة مطلوب');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, school_code: form.school_code || undefined };
      if (editing) {
        await updateBaseSchool(editing.id, payload);
        toast.success('تم تحديث المدرسة');
      } else {
        await createBaseSchool(payload);
        toast.success('تم إضافة المدرسة');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (school: BaseSchool) => {
    if (!confirm(`هل أنت متأكد من حذف المدرسة "${school.school_name}" نهائياً؟\nسيتم حذف جميع المعلمين المرتبطين بها!`)) return;
    try {
      await deleteBaseSchool(school.id);
      toast.success('تم الحذف بنجاح');
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">المدارس الأساسية</h1>
          <p className="page-subtitle">
            قاعدة بيانات المدارس لربط المعلمين وميزانية الإدارة والمتابعة السنوية.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> إضافة مدرسة
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card filters-bar" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px', minWidth: 200, width: '100%' }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="form-input" style={{ paddingRight: 36 }}
            placeholder="بحث باسم أو كود المدرسة..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, flex: '1 1 auto' }}>
          <select className="form-input" style={{ minWidth: 140 }}
            value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            <option value="">كل المراحل</option>
            {uniqueStages.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input" style={{ minWidth: 140 }}
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">كل الأنواع</option>
            {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
          {filtered.length} نتيجة
        </span>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>الكود</th>
                <th>اسم المدرسة</th>
                <th>المرحلة</th>
                <th>النوع</th>
                <th>الإدارة</th>
                <th style={{ width: 100 }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#475569' }}>لا توجد مدارس مطابقة للبحث</td></tr>
              ) : (
                filtered.map((school) => (
                  <tr key={school.id}>
                    <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{school.school_code || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{school.school_name}</td>
                    <td><span className={`badge ${stageColor[school.stage] || 'badge-blue'}`}>{school.stage}</span></td>
                    <td><span className={`badge ${typeColor[school.school_type] || 'badge-cyan'}`}>{school.school_type}</span></td>
                    <td style={{ color: '#94a3b8' }}>{school.administration || 'العمرانية'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(school)} style={{
                          padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <Pencil size={12} />
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

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>
              {editing ? 'تعديل بيانات المدرسة' : 'إضافة مدرسة جديدة'}
            </h3>
            
            <div className="responsive-grid">
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">اسم المدرسة *</label>
                <input className="form-input" value={form.school_name} autoFocus
                  onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
              </div>
              
              <div>
                <label className="form-label">كود المدرسة</label>
                <input className="form-input" value={form.school_code || ''}
                  onChange={e => setForm(f => ({ ...f, school_code: e.target.value }))} />
              </div>
              
              <div>
                <label className="form-label">الإدارة التعليمية</label>
                <input className="form-input" value={form.administration}
                  onChange={e => setForm(f => ({ ...f, administration: e.target.value }))} />
              </div>
              
              <div>
                <label className="form-label">المرحلة الدراسية</label>
                <input className="form-input" value={form.stage} placeholder="ابتدائي، إعدادي، الخ"
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                  list="stages-list" />
                <datalist id="stages-list">
                  <option value="رياض أطفال" />
                  <option value="ابتدائي" />
                  <option value="إعدادي" />
                  <option value="ثانوي" />
                  <option value="ابتدائى - اعدادى" />
                </datalist>
              </div>
              
              <div>
                <label className="form-label">نوع المدرسة</label>
                <select className="form-input" value={form.school_type}
                  onChange={e => setForm(f => ({ ...f, school_type: e.target.value as any }))}>
                  {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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

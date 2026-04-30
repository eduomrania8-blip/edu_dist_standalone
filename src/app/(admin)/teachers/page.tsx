'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Users, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllTeachers, deleteTeacher, getAllBaseSchools } from '@/services/distributionService';
import { Teacher, BaseSchool } from '@/types/database';

const stageColor: Record<string, string> = {
  'ابتدائي': 'badge-cyan', 'إعدادي': 'badge-purple', 'ثانوي': 'badge-amber',
};

export default function TeachersAdminPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<BaseSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, schs] = await Promise.all([getAllTeachers(), getAllBaseSchools()]);
      setTeachers(data);
      setSchools(schs);
    } catch (e: any) {
      toast.error('خطأ في التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, schoolFilter, subjectFilter]);

  const filtered = teachers.filter(t => {
    const matchSearch = t.name.includes(search) || t.national_id.includes(search) || (t.phone || '').includes(search);
    const matchSchool = schoolFilter ? t.base_school_id === schoolFilter : true;
    const matchSubject = subjectFilter ? t.subject === subjectFilter : true;
    const matchContract = contractFilter ? t.contract_type === contractFilter : true;
    return matchSearch && matchSchool && matchSubject && matchContract;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const uniqueSubjects = Array.from(new Set(teachers.map(t => t.subject).filter(Boolean)));

  const handleDelete = async (t: Teacher) => {
    if (!confirm(`هل تريد حذف "${t.name}"؟`)) return;
    try {
      await deleteTeacher(t.id);
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
          <h1 className="page-title">بيانات المعلمين</h1>
          <p className="page-subtitle">عرض وإدارة جميع المعلمين المسجلين عبر البوابة الإلكترونية</p>
        </div>
        <a
          href="/portal/teachers"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <ExternalLink size={16} /> فتح بوابة المعلمين
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'إجمالي المعلمين', value: teachers.length, color: '#3b82f6' },
          { label: 'بالأجر', value: teachers.filter(t => t.contract_type === 'بالأجر').length, color: '#f59e0b' },
          { label: 'أساسي', value: teachers.filter(t => t.contract_type === 'أساسي').length, color: '#10b981' },
          { label: 'عدد المدارس', value: new Set(teachers.map(t => t.base_school_id).filter(Boolean)).size, color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding: '16px 20px', borderRight: `3px solid ${stat.color}` }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card filters-bar" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="form-input" style={{ paddingRight: 36 }} placeholder="بحث بالاسم أو الرقم القومي أو الهاتف..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ minWidth: 180 }} value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
          <option value="">كل المدارس</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
        </select>
        <select className="form-input" style={{ minWidth: 140 }} value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
          <option value="">كل المواد</option>
          {uniqueSubjects.map(s => <option key={s} value={s!}>{s}</option>)}
        </select>
        <select className="form-input" style={{ minWidth: 140 }} value={contractFilter} onChange={e => setContractFilter(e.target.value)}>
          <option value="">كل أنواع التعيين</option>
          <option value="بالأجر">بالأجر</option>
          <option value="أساسي">أساسي</option>
          <option value="بالمعاش">بالمعاش</option>
        </select>
        <button className="btn-secondary" onClick={() => window.print()} style={{ minWidth: 100 }}>
          🖨️ طباعة
        </button>
        <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{filtered.length} معلم</span>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>الرقم القومي</th>
                <th>المدرسة</th>
                <th>المادة</th>
                <th>المؤهل</th>
                <th>التعيين</th>
                <th>المحمول</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                    <Users size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                    لا يوجد معلمون مسجلون
                  </td>
                </tr>
              ) : (
                paginated.map((t, idx) => (
                  <tr key={t.id}>
                    <td style={{ color: '#475569' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td style={{ fontWeight: 700 }}>
                      {t.name}
                      {t.gov && <div style={{ fontSize: 11, color: '#64748b' }}>📍 {t.gov}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{t.national_id}</td>
                    <td>
                      {t.base_school ? (
                        <>
                          <span style={{ fontSize: 13 }}>{t.base_school.school_name}</span>
                          <div>
                            <span className={`badge ${stageColor[t.base_school.stage] || 'badge-blue'}`} style={{ fontSize: 10 }}>{t.base_school.stage}</span>
                          </div>
                        </>
                      ) : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td><span className="badge badge-purple">{t.subject || '—'}</span></td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      {t.qualification || '—'}
                      {t.university && <div style={{ fontSize: 11 }}>{t.university}</div>}
                    </td>
                    <td>
                      <span className={`badge ${t.contract_type === 'بالأجر' ? 'badge-amber' : t.contract_type === 'أساسي' ? 'badge-green' : 'badge-blue'}`}>
                        {t.contract_type || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>{t.phone || '—'}</td>
                    <td>
                      <button className="btn-danger" style={{ padding: '5px 9px' }} onClick={() => handleDelete(t)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filtered.length)} من أصل {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: 12 }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                السابق
              </button>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#f1f5f9', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                {currentPage} / {totalPages}
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: 12 }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

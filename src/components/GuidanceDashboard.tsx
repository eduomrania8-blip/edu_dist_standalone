'use client';

import { useState } from 'react';
import { updateSupervisorActive, saveSupervisorWishes } from '@/actions/guidanceActions';
import { generateGuidanceTemplate, importGuidanceExcel } from '@/actions/guidanceExcelActions';
import toast from 'react-hot-toast';
import {
  Users, Edit3, CheckCircle2, XCircle, Download, Upload,
  UserPlus, RefreshCw, FileSpreadsheet, ChevronDown, ChevronUp
} from 'lucide-react';

export default function GuidanceDashboard({ data, user }: { data: any, user: any }) {
  const [supervisors, setSupervisors] = useState(data.supervisors || []);
  const [wishes, setWishes] = useState(data.wishes || []);
  const [schools] = useState(data.schools || []);

  const [selectedSup, setSelectedSup] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showExcelSection, setShowExcelSection] = useState(false);

  const [wishForm, setWishForm] = useState({
    wish_1: '', wish_2: '', wish_3: '', wish_4: '', notes: ''
  });
  const [addForm, setAddForm] = useState({
    national_id: '', name: '', phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ---------- Toggle Active ----------
  const toggleActive = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setSupervisors((prev: any[]) => prev.map(s => s.id === id ? { ...s, is_active: newStatus } : s));

    const res = await updateSupervisorActive(id, newStatus);
    if (res?.error) {
      toast.error('حدث خطأ أثناء تحديث الحالة');
      setSupervisors((prev: any[]) => prev.map(s => s.id === id ? { ...s, is_active: currentStatus } : s));
    } else {
      toast.success('تم تحديث الحالة بنجاح');
    }
  };

  // ---------- Wishes Modal ----------
  const openWishesModal = (sup: any) => {
    setSelectedSup(sup);
    const supWishes = wishes.find((w: any) => w.supervisor_id === sup.id);
    if (supWishes) {
      setWishForm({
        wish_1: supWishes.wish_1 || '',
        wish_2: supWishes.wish_2 || '',
        wish_3: supWishes.wish_3 || '',
        wish_4: supWishes.wish_4 || '',
        notes: supWishes.notes || ''
      });
    } else {
      setWishForm({ wish_1: '', wish_2: '', wish_3: '', wish_4: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveWishes = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await saveSupervisorWishes(selectedSup.id, wishForm);
    setLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('تم حفظ الرغبات بنجاح');
      setIsModalOpen(false);
      setWishes((prev: any[]) => {
        const existing = prev.findIndex(w => w.supervisor_id === selectedSup.id);
        const newWish = { supervisor_id: selectedSup.id, ...wishForm };
        if (existing >= 0) {
          const newArr = [...prev];
          newArr[existing] = newWish;
          return newArr;
        }
        return [...prev, newWish];
      });
    }
  };

  // ---------- Add Supervisor (Manual) ----------
  const handleAddSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.national_id || !addForm.name) {
      toast.error('يرجى إدخال الكود والاسم');
      return;
    }
    setLoading(true);
    try {
      // We import supabase dynamically to keep this as a client action
      const { addSupervisorManually } = await import('@/actions/guidanceActions');
      const res = await addSupervisorManually(addForm);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('تم إضافة الموجه بنجاح');
        setIsAddModalOpen(false);
        setAddForm({ national_id: '', name: '', phone: '' });
        // Refresh page to get new data
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Download Template ----------
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const result = await generateGuidanceTemplate();
      if ('error' in result) {
        toast.error(String(result.error));
        return;
      }
      // Convert base64 to blob and download
      const byteCharacters = atob(result.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تنزيل التمبلت بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التنزيل');
    } finally {
      setDownloading(false);
    }
  };

  // ---------- Upload Filled Template ----------
  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const res = await importGuidanceExcel(formData);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الرفع');
    } finally {
      setUploading(false);
    }
  };

  const activeCount = supervisors.filter((s: any) => s.is_active).length;
  const wishFilledCount = supervisors.filter((s: any) =>
    wishes.some((w: any) => w.supervisor_id === s.id && (w.wish_1 || w.wish_2 || w.wish_3 || w.wish_4))
  ).length;

  return (
    <div>
      {/* ══════ Header ══════ */}
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة توجيه {user.specialty}</h1>
          <p className="page-subtitle">إدارة الموجهين وتسجيل الرغبات الخاصة بتخصصك</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn-secondary" onClick={() => setIsAddModalOpen(true)} style={{ padding: '8px 16px', fontSize: 13 }}>
            <UserPlus size={16} />
            إضافة موجه
          </button>
        </div>
      </div>

      {/* ══════ Stats Cards ══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي الموجهين</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{supervisors.length}</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>موجهين متاحين</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{activeCount}</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
            <Edit3 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>سجلوا رغبات</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{wishFilledCount}</div>
          </div>
        </div>
      </div>

      {/* ══════ Excel Template Section ══════ */}
      <div className="glass-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <button
          onClick={() => setShowExcelSection(!showExcelSection)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={18} color="#22d3ee" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>استيراد / تصدير عبر Excel</span>
          </div>
          {showExcelSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showExcelSection && (
          <div style={{
            padding: '0 20px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              {/* Download Template */}
              <div style={{
                background: 'rgba(34,211,238,0.04)',
                borderRadius: 12,
                padding: 20,
                border: '1px solid rgba(34,211,238,0.1)',
                textAlign: 'center',
              }}>
                <Download size={28} color="#22d3ee" style={{ marginBottom: 10 }} />
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                  تنزيل التمبلت
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  قم بتنزيل ملف Excel يحتوي على بيانات الموجهين الحاليين وقائمة المدارس المتاحة. أكمل البيانات والرغبات ثم أعد رفعه.
                </p>
                <button
                  className="btn-primary"
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  style={{ padding: '10px 24px', fontSize: 13 }}
                >
                  {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  {downloading ? 'جاري التنزيل...' : 'تنزيل التمبلت'}
                </button>
              </div>

              {/* Upload Filled Template */}
              <div style={{
                background: 'rgba(167,139,250,0.04)',
                borderRadius: 12,
                padding: 20,
                border: '1px solid rgba(167,139,250,0.1)',
                textAlign: 'center',
              }}>
                <Upload size={28} color="#a78bfa" style={{ marginBottom: 10 }} />
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                  رفع التمبلت المكتمل
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  بعد ملء البيانات والرغبات في الملف، قم برفعه هنا لتحديث قاعدة البيانات تلقائياً.
                </p>
                <form onSubmit={handleUploadTemplate} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                  <input
                    type="file"
                    name="file"
                    accept=".xlsx,.xls"
                    required
                    className="form-input"
                    style={{ fontSize: 12, width: '100%' }}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={uploading}
                    style={{ padding: '10px 24px', fontSize: 13, background: 'linear-gradient(135deg, #a78bfa, #818cf8)' }}
                  >
                    {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? 'جاري الرفع...' : 'رفع واستيراد البيانات'}
                  </button>
                </form>
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              marginTop: 16,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 10,
              padding: '14px 18px',
              fontSize: 12,
              color: '#94a3b8',
              lineHeight: 1.8,
            }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>📋 تعليمات الاستخدام:</p>
              <ol style={{ margin: 0, paddingRight: 20 }}>
                <li>قم بتنزيل التمبلت — سيحتوي على بيانات الموجهين المسجلين حالياً (إن وجد).</li>
                <li>في شيت <strong>&quot;الموجهين&quot;</strong>: أضف أو عدّل بيانات الموجهين (الكود، الاسم، التليفون، الحالة).</li>
                <li>في شيت <strong>&quot;الرغبات&quot;</strong>: اكتب <strong>كود المدرسة</strong> المطابق لكل رغبة (راجع شيت &quot;دليل المدارس&quot;).</li>
                <li>احفظ الملف وارفعه من خلال زر &quot;رفع واستيراد البيانات&quot;.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* ══════ Supervisors Table ══════ */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الرقم القومي</th>
              <th>التليفون</th>
              <th>الرغبات المسجلة</th>
              <th>الإتاحة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {supervisors.map((sup: any) => {
              const supWishes = wishes.find((w: any) => w.supervisor_id === sup.id);
              const wishesCount = supWishes ? [supWishes.wish_1, supWishes.wish_2, supWishes.wish_3, supWishes.wish_4].filter(Boolean).length : 0;

              return (
                <tr key={sup.id}>
                  <td style={{ fontWeight: 600 }}>{sup.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{sup.national_id || '---'}</td>
                  <td style={{ fontSize: 13, color: '#94a3b8' }}>{sup.phone || '---'}</td>
                  <td>
                    <span className={`badge ${wishesCount > 0 ? 'badge-green' : 'badge-rose'}`}>
                      {wishesCount} رغبات
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(sup.id, sup.is_active)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        color: sup.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)'
                      }}
                    >
                      {sup.is_active ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {sup.is_active ? 'متاح' : 'غير متاح'}
                      </span>
                    </button>
                  </td>
                  <td>
                    <button onClick={() => openWishesModal(sup)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      <Edit3 size={14} />
                      تعديل الرغبات
                    </button>
                  </td>
                </tr>
              );
            })}
            {supervisors.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  لا يوجد موجهين مسجلين. يمكنك إضافتهم يدوياً أو عبر رفع ملف Excel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ══════ Wishes Modal ══════ */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>رغبات: {selectedSup?.name}</h2>

            <form onSubmit={handleSaveWishes} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3, 4].map(num => (
                <div key={num}>
                  <label className="form-label">الرغبة {num}</label>
                  <select
                    className="form-input"
                    value={(wishForm as any)[`wish_${num}`]}
                    onChange={e => setWishForm({ ...wishForm, [`wish_${num}`]: e.target.value })}
                  >
                    <option value="">-- اختر مدرسة --</option>
                    {schools.map((school: any) => (
                      <option key={school.id} value={school.id}>
                        {school.school_name} - {school.stage}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div>
                <label className="form-label">ملاحظات إضافية (اختياري)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={wishForm.notes}
                  onChange={e => setWishForm({ ...wishForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ الرغبات'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ Add Supervisor Modal ══════ */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>إضافة موجه جديد</h2>

            <form onSubmit={handleAddSupervisor} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">كود الموجه (الرقم القومي) *</label>
                <input
                  className="form-input"
                  type="text"
                  required
                  value={addForm.national_id}
                  onChange={e => setAddForm({ ...addForm, national_id: e.target.value })}
                  placeholder="أدخل الكود أو الرقم القومي"
                />
              </div>

              <div>
                <label className="form-label">اسم الموجه *</label>
                <input
                  className="form-input"
                  type="text"
                  required
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="الاسم الثلاثي أو الرباعي"
                />
              </div>

              <div>
                <label className="form-label">رقم التليفون</label>
                <input
                  className="form-input"
                  type="text"
                  value={addForm.phone}
                  onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'جاري الإضافة...' : 'إضافة الموجه'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

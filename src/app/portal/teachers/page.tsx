'use client';

import { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { getTeacherByNID, upsertTeacher, getAllBaseSchools } from '@/services/distributionService';
import { Teacher, TeacherFormData, TEACHER_SUBJECTS, TEACHER_GRADES, CONTRACT_TYPES, BaseSchool } from '@/types/database';

// NID parser - extract DOB and gov from Egyptian national ID
function parseNID(nid: string): { dob: string | null; gov: string | null } {
  if (nid.length !== 14) return { dob: null, gov: null };
  const century = nid[0] === '2' ? '19' : '20';
  const y = century + nid.slice(1, 3);
  const m = nid.slice(3, 5);
  const d = nid.slice(5, 7);
  const govCode = nid.slice(7, 9);
  const govMap: Record<string, string> = {
    '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بور سعيد', '04': 'السويس',
    '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
    '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
    '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
    '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا',
    '28': 'أسوان', '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد',
    '33': 'مطروح', '34': 'شمال سيناء', '35': 'جنوب سيناء',
  };
  return {
    dob: `${y}-${m}-${d}`,
    gov: govMap[govCode] || null,
  };
}

const EMPTY_FORM: Partial<TeacherFormData> = {
  national_id: '',
  name: '',
  phone: '',
  address: '',
  subject: '',
  teacher_code: '',
  qualification: '',
  university: '',
  grad_year: undefined,
  grade: 'جيد',
  contract_type: 'بالأجر',
  start_date: '',
  diploma: '',
  base_school_id: '',
  is_active: true,
};

type ViewState = 'login' | 'form' | 'success';

export default function TeacherPortalPage() {
  const [view, setView] = useState<ViewState>('login');
  const [nidInput, setNidInput] = useState('');
  const [nidLoading, setNidLoading] = useState(false);
  const [form, setForm] = useState<Partial<TeacherFormData>>({ ...EMPTY_FORM });
  const [baseSchools, setBaseSchools] = useState<BaseSchool[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedTeacher, setSavedTeacher] = useState<Teacher | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getAllBaseSchools().then(setBaseSchools).catch(() => {});
  }, []);

  const nidInfo = form.national_id ? parseNID(form.national_id) : null;

  const handleNIDLookup = async () => {
    if (nidInput.length !== 14 || !/^\d+$/.test(nidInput)) {
      toast.error('الرقم القومي يجب أن يكون 14 رقماً');
      return;
    }
    setNidLoading(true);
    try {
      const teacher = await getTeacherByNID(nidInput);
      if (teacher) {
        setForm({
          national_id: teacher.national_id,
          name: teacher.name,
          phone: teacher.phone || '',
          address: teacher.address || '',
          subject: teacher.subject || '',
          teacher_code: teacher.teacher_code || '',
          qualification: teacher.qualification || '',
          university: teacher.university || '',
          grad_year: teacher.grad_year,
          grade: teacher.grade || 'جيد',
          contract_type: teacher.contract_type || 'بالأجر',
          start_date: teacher.start_date || '',
          diploma: teacher.diploma || '',
          base_school_id: teacher.base_school_id || '',
          dob: teacher.dob || '',
          gov: teacher.gov || '',
          is_active: true,
        });
        setIsEditing(true);
        toast.success(`مرحباً بك مجدداً ${teacher.name}`);
      } else {
        const parsed = parseNID(nidInput);
        setForm({ ...EMPTY_FORM, national_id: nidInput, dob: parsed.dob || '', gov: parsed.gov || '' });
        setIsEditing(false);
      }
      setView('form');
    } catch (e: any) {
      toast.error('خطأ في الاتصال: ' + e.message);
    } finally {
      setNidLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('الاسم مطلوب'); return; }
    if (!form.phone?.trim()) { toast.error('رقم الهاتف مطلوب'); return; }
    if (!form.subject) { toast.error('المادة مطلوبة'); return; }
    if (!form.base_school_id) { toast.error('يرجى اختيار المدرسة'); return; }

    setSaving(true);
    try {
      const payload: TeacherFormData = {
        national_id: form.national_id!,
        name: form.name!,
        phone: form.phone,
        address: form.address,
        subject: form.subject,
        teacher_code: form.teacher_code,
        qualification: form.qualification,
        university: form.university,
        grad_year: form.grad_year,
        grade: form.grade,
        contract_type: form.contract_type,
        start_date: form.start_date || undefined,
        diploma: form.diploma,
        dob: form.dob || nidInfo?.dob || undefined,
        gov: form.gov || nidInfo?.gov || undefined,
        base_school_id: form.base_school_id,
        is_active: true,
      };
      const saved = await upsertTeacher(payload);
      setSavedTeacher(saved);
      toast.success('تم حفظ البيانات بنجاح!');
      setView('success');
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Cairo', sans-serif" }} dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>
          🎓
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', margin: '0 0 8px' }}>بوابة المعلمين</h1>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>إدارة العمرانية التعليمية — تسجيل وتحديث البيانات</p>
      </div>

      {/* Login View */}
      {view === 'login' && (
        <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36 }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>تسجيل الدخول</h2>
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: 24 }}>أدخل رقمك القومي للبدء أو المراجعة</p>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>الرقم القومي (14 رقماً)</label>
          <input
            type="text"
            maxLength={14}
            value={nidInput}
            onChange={e => setNidInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleNIDLookup()}
            placeholder="أدخل رقمك القومي المكون من 14 رقم"
            style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#f1f5f9', fontSize: 18, fontFamily: 'monospace', letterSpacing: 4, marginBottom: 20, boxSizing: 'border-box', outline: 'none', direction: 'ltr', textAlign: 'center' }}
          />
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 20, padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
            {nidInput.length === 14 ? (
              <>
                <span>📅 تاريخ الميلاد: {parseNID(nidInput).dob || '—'}</span>
                <span style={{ marginRight: 12 }}>📍 {parseNID(nidInput).gov || '—'}</span>
              </>
            ) : (
              <span>سيتم استخراج تاريخ الميلاد والمحافظة تلقائياً</span>
            )}
          </div>
          <button
            onClick={handleNIDLookup}
            disabled={nidLoading || nidInput.length !== 14}
            style={{ width: '100%', padding: '14px', background: nidInput.length === 14 ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: nidInput.length === 14 ? 'pointer' : 'not-allowed', opacity: nidInput.length === 14 ? 1 : 0.5 }}
          >
            {nidLoading ? 'جاري البحث...' : 'دخول / تسجيل'}
          </button>
        </div>
      )}

      {/* Form View */}
      {view === 'form' && (
        <div style={{ width: '100%', maxWidth: 760, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: 0 }}>
                {isEditing ? '✏️ تحديث بياناتك' : '📝 تسجيل معلم جديد'}
              </h2>
              <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>
                الرقم القومي: <span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>{form.national_id}</span>
                {nidInfo?.gov && <span style={{ marginRight: 12, color: '#10b981' }}>📍 {nidInfo.gov}</span>}
              </p>
            </div>
            <button onClick={() => { setView('login'); setNidInput(''); }} style={{ padding: '6px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>تغيير الرقم</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>الاسم رباعي *</label>
              <input style={inputStyle} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="أدخل الاسم الرباعي كاملاً" />
            </div>
            {/* Phone */}
            <div>
              <label style={labelStyle}>رقم المحمول *</label>
              <input style={inputStyle} type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="01xxxxxxxxx" maxLength={11} />
            </div>
            {/* Address */}
            <div>
              <label style={labelStyle}>العنوان</label>
              <input style={inputStyle} value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="العنوان التفصيلي" />
            </div>
            {/* School */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>المدرسة التي تعمل بها *</label>
              <select style={inputStyle} value={form.base_school_id || ''} onChange={e => setForm(f => ({ ...f, base_school_id: e.target.value }))}>
                <option value="">— اختر المدرسة —</option>
                {baseSchools.map(s => <option key={s.id} value={s.id}>{s.school_name} ({s.stage})</option>)}
              </select>
            </div>
            {/* Subject */}
            <div>
              <label style={labelStyle}>المادة التدريسية *</label>
              <select style={inputStyle} value={form.subject || ''} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                <option value="">— اختر المادة —</option>
                {TEACHER_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Teacher Code */}
            <div>
              <label style={labelStyle}>كود المعلم</label>
              <input style={inputStyle} value={form.teacher_code || ''} onChange={e => setForm(f => ({ ...f, teacher_code: e.target.value }))} placeholder="الكود الوظيفي" />
            </div>
            {/* Contract Type */}
            <div>
              <label style={labelStyle}>نوع التعيين</label>
              <select style={inputStyle} value={form.contract_type || 'بالأجر'} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}>
                {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Start Date */}
            <div>
              <label style={labelStyle}>تاريخ بدء العمل</label>
              <input style={inputStyle} type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            {/* Qualification */}
            <div>
              <label style={labelStyle}>المؤهل العلمي *</label>
              <input style={inputStyle} value={form.qualification || ''} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="ليسانس / بكالوريوس..." />
            </div>
            {/* University */}
            <div>
              <label style={labelStyle}>الجامعة</label>
              <input style={inputStyle} value={form.university || ''} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} placeholder="جامعة القاهرة مثلاً" />
            </div>
            {/* Grad Year */}
            <div>
              <label style={labelStyle}>سنة التخرج</label>
              <input style={inputStyle} type="number" value={form.grad_year || ''} onChange={e => setForm(f => ({ ...f, grad_year: Number(e.target.value) }))} placeholder="2024" min={1980} max={2030} />
            </div>
            {/* Grade */}
            <div>
              <label style={labelStyle}>التقدير</label>
              <select style={inputStyle} value={form.grade || 'جيد'} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                {TEACHER_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {/* Diploma */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>الدبلوم التربوي</label>
              <input style={inputStyle} value={form.diploma || ''} onChange={e => setForm(f => ({ ...f, diploma: e.target.value }))} placeholder="دبلوم تربوي سنة ..." />
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setView('login')} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#94a3b8', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              إلغاء
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>
              {saving ? 'جاري الحفظ...' : isEditing ? '💾 تحديث البيانات' : '✅ إتمام التسجيل'}
            </button>
          </div>
        </div>
      )}

      {/* Success View */}
      {view === 'success' && savedTeacher && (
        <div style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: '#10b981', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>تم الحفظ بنجاح!</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>تم تسجيل بياناتك بنجاح في النظام</p>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, textAlign: 'right', marginBottom: 24 }}>
            <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{savedTeacher.name}</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>📖 {savedTeacher.subject}</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>🏫 {savedTeacher.base_school?.school_name || '—'}</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>📞 {savedTeacher.phone}</div>
          </div>
          <button onClick={() => { setView('login'); setNidInput(''); setSavedTeacher(null); }} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>
            العودة للرئيسية
          </button>
        </div>
      )}

      <p style={{ color: '#334155', fontSize: 11, marginTop: 32 }}>إدارة العمرانية التعليمية © 2026</p>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

'use client';

import { useState } from 'react';
import { updateSupervisorActive, saveSupervisorWishes } from '@/actions/guidanceActions';
import { generateGuidanceTemplate, importGuidanceExcel } from '@/actions/guidanceExcelActions';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  settingsToReport, renderHeader, generatePDF, wrapPages, renderGMSignature
} from '@/components/reports/reportUtils';
import {
  Users, Edit3, CheckCircle2, XCircle, Download, Upload,
  UserPlus, RefreshCw, FileSpreadsheet, ChevronDown, ChevronUp,
  Building2, Map, GraduationCap, ClipboardList, Search, Printer
} from 'lucide-react';

const TABS = [
  { id: 'supervisors', label: 'الموجهون', icon: Users },
  { id: 'base-schools', label: 'المدارس الأساسية', icon: Building2 },
  { id: 'distribution', label: 'توزيع الموجهون', icon: Map },
  { id: 'teachers', label: 'بيانات المعلمين', icon: GraduationCap },
  { id: 'followup', label: 'خطة المتابعة', icon: ClipboardList },
];

export default function GuidanceDashboard({ data, user }: { data: any, user: any }) {
  const [activeTab, setActiveTab] = useState('supervisors');

  const [supervisors, setSupervisors] = useState(data.supervisors || []);
  const [wishes, setWishes] = useState(data.wishes || []);
  const [schools] = useState(data.schools || []);
  const [baseSchools] = useState(data.base_schools || []);
  const [annualSchools] = useState(data.annual_schools || []);
  const [teachers] = useState(data.teachers || []);
  const [cfg] = useState(() => data.settings ? settingsToReport(data.settings) : null);
  const [pdfProgress, setPdfProgress] = useState('');

  const [selectedSup, setSelectedSup] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showExcelSection, setShowExcelSection] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSupAssign, setSelectedSupAssign] = useState<any>(null);
  const [assignedSchools, setAssignedSchools] = useState<string[]>([]);

  const [teacherSearch, setTeacherSearch] = useState('');
  const [baseSchoolSearch, setBaseSchoolSearch] = useState('');
  const [teacherContractFilter, setTeacherContractFilter] = useState('');

  const [wishForm, setWishForm] = useState({
    wish_1: '', wish_2: '', wish_3: '', wish_4: '', notes: ''
  });
  const [addForm, setAddForm] = useState({
    national_id: '', name: '', phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // ---------- PDF & Excel Exports ----------
  const printTeachersPDF = async () => {
    if (!cfg) return toast.error('إعدادات الطباعة غير متوفرة');
    const rows = filteredTeachers.map((t: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align:right; font-weight:600;">${t.name || ''}</td>
        <td style="font-family:monospace;">${t.national_id || ''}</td>
        <td>${t.subject || ''}</td>
        <td>${t.base_school?.school_name || 'غير مسكن'}</td>
        <td>${t.contract_type || ''}</td>
      </tr>
    `).join('');

    const page = `
      ${renderHeader(cfg, 'كشف بيانات المعلمين', \`توجيه: \${user.specialty}\`)}
      <table class="data-tbl">
        <thead>
          <tr>
            <th style="width:40px;">م</th>
            <th>الاسم</th>
            <th style="width:120px;">الرقم القومي</th>
            <th style="width:100px;">المادة</th>
            <th style="width:150px;">المدرسة</th>
            <th style="width:80px;">التعيين</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${renderGMSignature(cfg)}
    `;
    try {
      await generatePDF(wrapPages([page]), \`معلمين_\${user.specialty}.pdf\`, setPdfProgress);
      toast.success('تم إنشاء PDF بنجاح');
    } catch { toast.error('خطأ في الطباعة'); setPdfProgress(''); }
  };

  const exportTeachersExcel = () => {
    const dataToExport = filteredTeachers.map((t: any, i: number) => ({
      'م': i + 1,
      'الاسم': t.name,
      'الرقم القومي': t.national_id,
      'المادة': t.subject,
      'المدرسة': t.base_school?.school_name || 'غير مسكن',
      'نوع التعيين': t.contract_type
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المعلمين');
    XLSX.writeFile(wb, \`معلمين_\${user.specialty}.xlsx\`);
  };

  const printDistributionPDF = async () => {
    if (!cfg) return toast.error('إعدادات الطباعة غير متوفرة');
    const rows = supervisors.map((sup: any, i: number) => {
      const mySchools = annualSchools.filter((a: any) => a.supervisor_id === sup.id);
      const schoolsText = mySchools.length > 0 
        ? mySchools.map((a: any) => a.base_school?.school_name).join(' - ') 
        : 'لا توجد مدارس مسندة';
      return \`
        <tr>
          <td>\${i + 1}</td>
          <td style="text-align:right; font-weight:600;">\${sup.name || ''}</td>
          <td style="text-align:right;">\${schoolsText}</td>
        </tr>
      \`;
    }).join('');

    const page = \`
      \${renderHeader(cfg, 'توزيع الموجهين (خطة المتابعة السنوية)', \`توجيه: \${user.specialty}\`)}
      <table class="data-tbl">
        <thead>
          <tr>
            <th style="width:40px;">م</th>
            <th style="width:200px;">الموجه</th>
            <th>المدارس المسندة</th>
          </tr>
        </thead>
        <tbody>\${rows}</tbody>
      </table>
      \${renderGMSignature(cfg)}
    \`;
    try {
      await generatePDF(wrapPages([page]), \`توزيع_\${user.specialty}.pdf\`, setPdfProgress);
      toast.success('تم إنشاء PDF بنجاح');
    } catch { toast.error('خطأ في الطباعة'); setPdfProgress(''); }
  };

  const exportDistributionExcel = () => {
    const dataToExport = supervisors.map((sup: any, i: number) => {
      const mySchools = annualSchools.filter((a: any) => a.supervisor_id === sup.id);
      const schoolsText = mySchools.length > 0 
        ? mySchools.map((a: any) => a.base_school?.school_name).join(' - ') 
        : 'لا توجد مدارس مسندة';
      return {
        'م': i + 1,
        'الموجه': sup.name,
        'المدارس المسندة': schoolsText
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التوزيع');
    XLSX.writeFile(wb, \`توزيع_\${user.specialty}.xlsx\`);
  };

  const printSupervisorsPDF = async () => {
    if (!cfg) return toast.error('إعدادات الطباعة غير متوفرة');
    const rows = supervisors.map((sup: any, i: number) => {
      const supWishes = wishes.find((w: any) => w.supervisor_id === sup.id);
      return \`
        <tr>
          <td>\${i + 1}</td>
          <td style="text-align:right; font-weight:600;">\${sup.name || ''}</td>
          <td style="font-family:monospace;">\${sup.national_id || ''}</td>
          <td dir="ltr" style="font-family:monospace;">\${sup.phone || ''}</td>
          <td>\${supWishes ? 'تم الإدخال' : 'لم يتم الإدخال'}</td>
          <td>\${sup.is_active ? 'متاح' : 'غير متاح'}</td>
        </tr>
      \`;
    }).join('');

    const page = \`
      \${renderHeader(cfg, 'بيانات الموجهين', \`توجيه: \${user.specialty}\`)}
      <table class="data-tbl">
        <thead>
          <tr>
            <th style="width:40px;">م</th>
            <th>اسم الموجه</th>
            <th style="width:120px;">الرقم القومي</th>
            <th style="width:100px;">التليفون</th>
            <th style="width:90px;">الرغبات</th>
            <th style="width:70px;">الحالة</th>
          </tr>
        </thead>
        <tbody>\${rows}</tbody>
      </table>
      \${renderGMSignature(cfg)}
    \`;
    try {
      await generatePDF(wrapPages([page]), \`الموجهون_\${user.specialty}.pdf\`, setPdfProgress);
      toast.success('تم إنشاء PDF بنجاح');
    } catch { toast.error('خطأ في الطباعة'); setPdfProgress(''); }
  };

  const printBaseSchoolsPDF = async () => {
    if (!cfg) return toast.error('إعدادات الطباعة غير متوفرة');
    const rows = baseSchools.map((bs: any, i: number) => \`
      <tr>
        <td>\${i + 1}</td>
        <td style="text-align:right; font-weight:600;">\${bs.school_name || ''}</td>
        <td style="font-family:monospace;">\${bs.school_code || ''}</td>
        <td>\${bs.stage || ''}</td>
        <td>\${bs.school_type || ''}</td>
      </tr>
    \`).join('');

    const page = \`
      \${renderHeader(cfg, 'المدارس الأساسية (مقر اللجان)', \`توجيه: \${user.specialty}\`)}
      <table class="data-tbl">
        <thead>
          <tr>
            <th style="width:40px;">م</th>
            <th>اسم المدرسة</th>
            <th style="width:100px;">كود المدرسة</th>
            <th style="width:100px;">المرحلة</th>
            <th style="width:100px;">النوعية</th>
          </tr>
        </thead>
        <tbody>\${rows}</tbody>
      </table>
      \${renderGMSignature(cfg)}
    \`;
    try {
      await generatePDF(wrapPages([page]), \`المدارس_الأساسية.pdf\`, setPdfProgress);
      toast.success('تم إنشاء PDF بنجاح');
    } catch { toast.error('خطأ في الطباعة'); setPdfProgress(''); }
  };

  const exportSupervisorsExcel = () => {
    const dataToExport = supervisors.map((sup: any, i: number) => {
      const supWishes = wishes.find((w: any) => w.supervisor_id === sup.id);
      return {
        'م': i + 1,
        'الاسم': sup.name,
        'الرقم القومي': sup.national_id,
        'التليفون': sup.phone,
        'الرغبات': supWishes ? 'تم الإدخال' : 'لم يتم الإدخال',
        'الحالة': sup.is_active ? 'متاح' : 'غير متاح'
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الموجهين');
    XLSX.writeFile(wb, \`الموجهون_\${user.specialty}.xlsx\`);
  };

  const exportBaseSchoolsExcel = () => {
    const dataToExport = baseSchools.map((bs: any, i: number) => ({
      'م': i + 1,
      'اسم المدرسة': bs.school_name,
      'كود المدرسة': bs.school_code,
      'المرحلة': bs.stage,
      'النوعية': bs.school_type
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المدارس');
    XLSX.writeFile(wb, \`المدارس_الأساسية.xlsx\`);
  };

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
      const { addSupervisorManually } = await import('@/actions/guidanceActions');
      const res = await addSupervisorManually(addForm);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('تم إضافة الموجه بنجاح');
        setIsAddModalOpen(false);
        setAddForm({ national_id: '', name: '', phone: '' });
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
        toast.success(String(res.message));
        window.location.reload();
      } else {
        toast.error(String(res.message));
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

  const filteredTeachers = teachers.filter((t: any) => {
    const matchSearch = (t.name || '').includes(teacherSearch) || (t.national_id || '').includes(teacherSearch);
    const matchContract = teacherContractFilter ? t.contract_type === teacherContractFilter : true;
    return matchSearch && matchContract;
  });

  const filteredBaseSchools = baseSchools.filter((s: any) => {
    return s.school_name.includes(baseSchoolSearch) || s.school_code.includes(baseSchoolSearch);
  });

  return (
    <div>
      {/* ══════ Header ══════ */}
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة توجيه {user.specialty}</h1>
          <p className="page-subtitle">إدارة الموجهين وتسجيل الرغبات الخاصة بتخصصك</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {activeTab === 'supervisors' && (
            <button className="btn-secondary" onClick={() => setIsAddModalOpen(true)} style={{ padding: '8px 16px', fontSize: 13 }}>
              <UserPlus size={16} />
              إضافة موجه
            </button>
          )}
        </div>
      </div>

      {/* ══════ Tabs Navigation ══════ */}
      <div className="no-print" style={{ 
        display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                background: isActive ? 'rgba(34,211,238,0.1)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                fontWeight: isActive ? 700 : 500, fontSize: 14, whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════ TAB CONTENT: Supervisors ══════ */}
      {activeTab === 'supervisors' && (
        <>
          {/* Stats Cards */}
          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
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

          {/* Excel Template Section */}
          <div className="glass-card no-print" style={{ marginBottom: 20, overflow: 'hidden' }}>
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
                    <li>في شيت <strong>"الموجهين"</strong>: أضف أو عدّل بيانات الموجهين (الكود، الاسم، التليفون، الحالة).</li>
                    <li>في شيت <strong>"الرغبات"</strong>: اكتب <strong>كود المدرسة</strong> المطابق لكل رغبة (راجع شيت "دليل المدارس").</li>
                    <li>احفظ الملف وارفعه من خلال زر "رفع واستيراد البيانات".</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="filters-bar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={exportSupervisorsExcel} disabled={!!pdfProgress}>
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button className="btn-secondary" onClick={printSupervisorsPDF} disabled={!!pdfProgress}>
                <Printer size={16} /> PDF
              </button>
            </div>
          </div>

          {/* Supervisors Table */}
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
                        <button onClick={() => openWishesModal(sup)} className="btn-secondary no-print" style={{ padding: '6px 12px', fontSize: 12 }}>
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
        </>
      )}

      {/* ══════ TAB CONTENT: Base Schools ══════ */}
      {activeTab === 'base-schools' && (
        <>
          <div className="glass-card filters-bar" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input className="form-input" style={{ paddingRight: 36 }} placeholder="بحث باسم أو كود المدرسة..."
                value={baseSchoolSearch} onChange={e => setBaseSchoolSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={exportBaseSchoolsExcel} disabled={!!pdfProgress}>
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button className="btn-secondary" onClick={printBaseSchoolsPDF} disabled={!!pdfProgress}>
                <Printer size={16} /> PDF
              </button>
            </div>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{filteredBaseSchools.length} مدرسة</span>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>المدرسة</th>
                  <th>المرحلة</th>
                  <th>النوع</th>
                </tr>
              </thead>
              <tbody>
                {filteredBaseSchools.map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8' }}>{s.school_code}</td>
                    <td style={{ fontWeight: 600 }}>{s.school_name}</td>
                    <td><span className="badge badge-purple">{s.stage}</span></td>
                    <td><span className="badge badge-blue">{s.school_type}</span></td>
                  </tr>
                ))}
                {filteredBaseSchools.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>لا توجد مدارس</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════ TAB CONTENT: Supervisor Distribution ══════ */}
      {activeTab === 'distribution' && (
        <>
          <div className="filters-bar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={exportDistributionExcel} disabled={!!pdfProgress}>
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button className="btn-secondary" onClick={printDistributionPDF} disabled={!!pdfProgress}>
                <Printer size={16} /> PDF
              </button>
            </div>
          </div>
          
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموجه</th>
                  <th>المدارس المسندة (مدارس المتابعة السنوية)</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map((sup: any) => {
                  const mySchools = annualSchools.filter((a: any) => a.supervisor_id === sup.id);
                  return (
                    <tr key={sup.id}>
                      <td style={{ fontWeight: 600 }}>{sup.name}</td>
                      <td>
                        {mySchools.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {mySchools.map((a: any) => (
                              <span key={a.id} className="badge badge-cyan">
                                {a.base_school?.school_name || 'مدرسة غير معروفة'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: 12 }}>لا توجد مدارس مسندة حتى الآن</span>
                        )}
                        <div style={{ marginTop: 12 }}>
                          <button onClick={() => {
                            setSelectedSupAssign(sup);
                            setAssignedSchools(mySchools.map((a: any) => a.base_school_id));
                            setIsAssignModalOpen(true);
                          }} className="btn-secondary no-print" style={{ padding: '6px 12px', fontSize: 12 }}>
                            <Edit3 size={14} /> تعديل المدارس المسندة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════ TAB CONTENT: Teachers ══════ */}
      {activeTab === 'teachers' && (
        <>
          <div className="glass-card filters-bar" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input className="form-input" style={{ paddingRight: 36 }} placeholder="بحث بالاسم أو الرقم القومي..."
                value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
            </div>
            <select className="form-input" style={{ minWidth: 140 }} value={teacherContractFilter} onChange={e => setTeacherContractFilter(e.target.value)}>
              <option value="">كل أنواع التعيين</option>
              <option value="بالأجر">بالأجر</option>
              <option value="أساسي">أساسي</option>
              <option value="بالمعاش">بالمعاش</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={exportTeachersExcel} disabled={!!pdfProgress}>
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button className="btn-secondary" onClick={printTeachersPDF} disabled={!!pdfProgress}>
                <Printer size={14} /> PDF
              </button>
            </div>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{filteredTeachers.length} معلم</span>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الرقم القومي</th>
                  <th>المادة</th>
                  <th>المدرسة</th>
                  <th>نوع التعيين</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t: any) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8' }}>{t.national_id}</td>
                    <td>{t.subject}</td>
                    <td>{t.base_school?.school_name || 'غير مسكن'}</td>
                    <td>
                      <span className={`badge ${t.contract_type === 'بالأجر' ? 'badge-amber' : 'badge-green'}`}>
                        {t.contract_type}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTeachers.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>لا يوجد معلمين</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════ TAB CONTENT: Follow Up Plan ══════ */}
      {activeTab === 'followup' && (
        <div className="glass-card" style={{ padding: 64, textAlign: 'center' }}>
          <ClipboardList size={64} color="var(--accent-purple)" style={{ opacity: 0.5, margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#f1f5f9' }}>خطة المتابعة</h2>
          <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
            هذه الميزة قيد التطوير. قريباً سيتمكن الموجه من إنشاء جداول خطة المتابعة اليومية والأسبوعية للمدارس المسندة إليه.
          </p>
        </div>
      )}

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

      {/* ══════ Assign Schools Modal ══════ */}
      {isAssignModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>إسناد المدارس للموجه: {selectedSupAssign?.name}</h2>

            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 12, maxHeight: 300, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 8
            }}>
              {baseSchools.length === 0 ? (
                <span style={{ fontSize: 12, color: '#64748b' }}>لا توجد مدارس أساسية مسجلة</span>
              ) : (
                baseSchools.map((bs: any) => {
                  const isSelected = assignedSchools.includes(bs.id);
                  return (
                    <label key={bs.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedSchools(prev => [...prev, bs.id]);
                          } else {
                            setAssignedSchools(prev => prev.filter(id => id !== bs.id));
                          }
                        }}
                      />
                      {bs.school_name}
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button 
                type="button" 
                className="btn-primary" 
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const { assignAnnualSchools } = await import('@/actions/guidanceActions');
                  const res = await assignAnnualSchools(selectedSupAssign.id, assignedSchools);
                  setLoading(false);
                  if (res?.error) {
                    toast.error(res.error);
                  } else {
                    toast.success('تم الحفظ بنجاح');
                    setIsAssignModalOpen(false);
                    window.location.reload();
                  }
                }}
              >
                {loading ? 'جاري الحفظ...' : 'حفظ الإسناد'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setIsAssignModalOpen(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Print Styles — shared across all printable reports
   ═══════════════════════════════════════════════════════ */

export const PRINT_STYLES = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Cairo', 'Arial', sans-serif; direction:rtl; color:#000; background:#fff; }
  .report-page {
    width: 210mm; min-height: 297mm; padding: 12mm 15mm;
    margin: 0 auto; position: relative;
    page-break-after: always;
  }
  .report-page:last-child { page-break-after: auto; }
  .report-header {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding-bottom:10px; margin-bottom:12px;
    border-bottom: 3px double #1e3a5f;
  }
  .report-title-box {
    text-align:center; border:2px solid #1e3a5f;
    padding:6px 10px; border-radius:4px;
    background: linear-gradient(180deg, #f0f4f8, #fff);
  }
  .official-table {
    width:100%; border-collapse:collapse;
    border: 2px solid #1e3a5f; font-size:11px;
  }
  .official-table th {
    background:#1e3a5f; color:#fff;
    padding:6px 5px; border:1px solid #1e3a5f;
    text-align:center; font-weight:700;
  }
  .official-table td {
    padding:5px 6px; border:1px solid #d1d5db;
    text-align:center; vertical-align:middle;
  }
  .official-table tr:nth-child(even) { background:#f9fafb; }
  .instructions-list { margin-right:20px; font-size:10.5px; line-height:1.4; }
  .instructions-list li { margin-bottom:2px; }
  .signature-block { text-align:center; min-width:150px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 8mm; size: A4; }
  }
</style>`;

export interface ReportSettings {
  governorate: string;
  directorate: string;
  academicYear: string;
  semester: string;
  gm_name: string;
  gm_title: string;
  gm_phone: string;
  deputy_name: string;
  deputy_title: string;
  deputy_phone: string;
  security_name: string;
  security_title: string;
  security_phone: string;
  mgr_primary: string;
  mgr_primary_phone: string;
  mgr_prep: string;
  mgr_prep_phone: string;
  mgr_sec: string;
  mgr_sec_phone: string;
}

export function settingsToReport(s: Record<string, string>): ReportSettings {
  return {
    governorate: s.governorate_name || 'محافظة الجيزة',
    directorate: s.directorate_name || 'إدارة العمرانية التعليمية',
    academicYear: s.academic_year || '2025/2026',
    semester: 'آخر العام',
    gm_name: s.officials_gm_name || '',
    gm_title: s.officials_gm_title || 'مدير عام الإدارة',
    gm_phone: s.officials_gm_phone || '',
    deputy_name: s.officials_deputy_name || '',
    deputy_title: s.officials_deputy_title || 'وكيل الإدارة',
    deputy_phone: s.officials_deputy_phone || '',
    security_name: s.officials_security_name || '',
    security_title: s.officials_security_title || 'مسئول أمن الإدارة',
    security_phone: s.officials_security_phone || '',
    mgr_primary: s.officials_mgr_primary || '',
    mgr_primary_phone: s.officials_mgr_primary_phone || '',
    mgr_prep: s.officials_mgr_prep || '',
    mgr_prep_phone: s.officials_mgr_prep_phone || '',
    mgr_sec: s.officials_mgr_sec || '',
    mgr_sec_phone: s.officials_mgr_sec_phone || '',
  };
}

export function renderHeader(cfg: ReportSettings, title: string, subtitle?: string): string {
  const today = new Date().toLocaleDateString('ar-EG');
  return `
    <div class="report-header">
      <div style="text-align:right">
        <p style="font-weight:900; font-size:13px;">${cfg.governorate}</p>
        <p style="font-weight:900; font-size:13px;">${cfg.directorate}</p>
        <p style="font-size:10px; margin-top:4px; color:#555;">التاريخ: ${today}</p>
      </div>
      <div class="report-title-box" style="flex:1; margin:0 12px;">
        <div style="font-weight:900; font-size:15px;">${title}</div>
        ${subtitle ? `<div style="font-size:12px; font-weight:normal; margin-top:3px;">${subtitle}</div>` : ''}
      </div>
      <div style="text-align:left">
        <div style="width:75px; height:75px; border:2px solid #1e3a5f; display:flex; align-items:center; justify-content:center; background:#f8f9fa;">
          <img src="/logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة" />
        </div>
        <p style="font-size:7px; margin-top:2px; font-weight:bold; text-align:center;">لجنة الإدارة</p>
      </div>
    </div>
  `;
}

export function renderOfficials(cfg: ReportSettings): string {
  return `
    <div style="display:flex; flex-direction:column; gap:3px; margin-top:5px;">
      <div style="border:1.5px solid #000; padding:3px 10px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <span>${cfg.gm_name} ( ${cfg.gm_title} )</span>
        <span dir="ltr">${cfg.gm_phone}</span>
      </div>
      <div style="border:1.5px solid #000; padding:3px 10px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <span>${cfg.deputy_name} ( ${cfg.deputy_title} )</span>
        <span dir="ltr">${cfg.deputy_phone}</span>
      </div>
      <div style="border:1.5px solid #000; padding:3px 10px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <span>${cfg.security_name} ( ${cfg.security_title} )</span>
        <span dir="ltr">${cfg.security_phone}</span>
      </div>
    </div>
  `;
}

export function renderManagersTable(cfg: ReportSettings): string {
  const managers = [
    { stage: 'مدير التعليم الابتدائي', name: cfg.mgr_primary, phone: cfg.mgr_primary_phone },
    { stage: 'مدير التعليم الإعدادي', name: cfg.mgr_prep, phone: cfg.mgr_prep_phone },
    { stage: 'مدير التعليم الثانوي', name: cfg.mgr_sec, phone: cfg.mgr_sec_phone },
  ];
  return `
    <div style="border:1.5px solid #000; padding:0;">
      <div style="background:#e9ecef; color:#000; text-align:center; font-weight:900; padding:3px; font-size:10px; border-bottom:1.5px solid #000;">جدول تليفونات مديرى المراحل</div>
      <div style="font-size:10px; padding:2px;">
        ${managers.map(m => `
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:1px 4px;">
            <span>${m.stage}</span>
            <strong>${m.name}</strong>
            <span dir="ltr">${m.phone}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderSignatures(cfg: ReportSettings): string {
  return `
    <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
      <div class="signature-block">
        <p style="font-weight:bold;">يعتمد،، الموجه الأول</p>
        <p style="margin-top:25px;">................................</p>
      </div>
      <div class="signature-block">
        <p style="font-weight:bold;">${cfg.deputy_title}</p>
        <br>
        <p style="font-weight:bold; font-size:1.1rem;">${cfg.deputy_name}</p>
      </div>
      <div class="signature-block">
        <p style="font-weight:bold;">${cfg.gm_title}</p>
        <br>
        <p style="font-weight:bold; font-size:1.1rem;">${cfg.gm_name}</p>
      </div>
    </div>
  `;
}

export function renderGMSignature(cfg: ReportSettings): string {
  return `
    <div style="margin-top:25px; display:flex; justify-content:space-between; align-items:flex-start;">
      <div style="border:1.5px solid #000; padding:8px 15px; font-size:11px;">
        <p style="margin-bottom:3px;"><strong>ملاحظات هامة:</strong></p>
        <p style="margin:2px 0;">• يُرجى الالتزام بالمدرسة المحددة</p>
        <p style="margin:2px 0;">• التواصل الفوري مع غرفة العمليات</p>
      </div>
      <div class="signature-block" style="min-width:200px;">
        <p style="font-weight:bold; margin-bottom:5px;">يعتمد،،</p>
        <p style="font-weight:900; font-size:1.1rem; margin:3px 0;">${cfg.gm_title}</p>
        <p style="font-weight:bold; font-size:1.05rem; margin-top:8px;">${cfg.gm_name}</p>
        <p style="margin-top:30px; border-top:1px solid #000; padding-top:3px; font-size:10px;">التوقيع</p>
      </div>
    </div>
  `;
}

export const INSTRUCTIONS = [
  'التزام الموجه المقيم بتواجده مع مدير المدرسة لاستلام مظاريف الأسئلة من المطبعة السرية وتأمين سرية الامتحانات.',
  'الالتزام بالحضور قبل فتح مظاريف الأسئلة بوقت كاف مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.',
  'التواجد بالمدرسة قبل بدء الامتحان بوقت كاف للتأكد من استيفاء جميع الإجراءات المتصلة بالامتحان وقبل فتح مظاريف الأسئلة مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.',
  'الالتزام بجدول الامتحان كما هو وارد من الإدارة التعليمية وعدم مخالفته مطلقا.',
  'عمل تقرير يومي عن سير الامتحان مرفق به نسخة من اسئلة المواد التي تم تأدية الامتحان فيها في ذات اليوم وكذلك نسخة من الإملاء لمادة اللغة العربية ونسخة من اسئلة الاستماع للغة الانجليزية بعد انتهاء الامتحانات.',
  'عمل تقرير شامل في نهاية الامتحانات عن سير الامتحان بالمدرسة وتسليم التقارير اليومية والتقرير الشامل للمراحل في آخر يوم من أيام الامتحان لكل مرحلة.',
  'الالتزام بخروج الطلاب آخر الوقت وعدم مغادرة المدرسة إلا بعد خروج آخر طالب ومتابعة ذلك مع مدير المدرسة ومراقبي الأدوار.',
  'التواصل مع غرفة العمليات بالإدارة على الفور في حال حدوث مخالفة أو أي عارض ذو شأن أثناء سير الامتحان اليومي أو في حال وجود زائر من خارج الإدارة سواء من المديرية التعليمية أو الوزارة حيث أن ذلك سيتم تدوينه في التقرير اليومي للإدارة.',
];

export function openPrintWindow(title: string, html: string) {
  const w = window.open('', '_blank', 'width=1000,height=800');
  if (!w) { alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }
  w.document.write(`<html><head><title>${title}</title>${PRINT_STYLES}</head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}

/* ═══════════════════════════════════════════════════════
   Print Styles — shared across all printable reports
   ═══════════════════════════════════════════════════════ */

export const PRINT_STYLES = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Cairo', 'Arial', sans-serif; direction:rtl; color:#000; background:#fff; }

  .report-page {
    width: 210mm; min-height: 297mm; padding: 10mm 14mm;
    margin: 0 auto; position: relative;
    page-break-after: always;
  }
  .report-page:last-child { page-break-after: auto; }

  /* ─── Header ─── */
  .report-header {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding-bottom:10px; margin-bottom:10px;
    border-bottom: 3px double #1e3a5f;
  }
  .report-title-box {
    text-align:center; border:2px solid #1e3a5f;
    padding:6px 14px; border-radius:4px;
    background: linear-gradient(180deg, #eef2f7 0%, #fff 100%);
    flex: 1; margin: 0 12px;
  }

  /* ─── Officials Boxes ─── */
  .officials-box {
    border:1.5px solid #333; padding:3px 10px; font-size:11px;
    display:flex; justify-content:space-between; align-items:center;
    margin-bottom: 3px;
  }

  /* ─── Data Table (repeating header on print) ─── */
  .print-table {
    width: 100%; border-collapse: collapse;
    border: 2px solid #1e3a5f;
    font-size: 11px;
    margin-top: 10px;
  }
  .print-table thead {
    display: table-header-group; /* 🔑 Repeats header on every printed page */
  }
  .print-table thead tr th {
    background: #1e3a5f; color: #fff;
    padding: 7px 6px; border: 1px solid #1e3a5f;
    text-align: center; font-weight: 700; font-size: 11px;
  }
  .print-table tbody tr td {
    padding: 6px 8px; border: 1px solid #ccc;
    text-align: center; vertical-align: middle;
  }
  .print-table tbody tr:nth-child(even) { background: #f5f7fa; }
  .print-table tbody tr { page-break-inside: avoid; }

  /* ─── Stage color badges ─── */
  .badge-primary { background:#dbeafe; color:#1e40af; padding:1px 6px; border-radius:3px; font-size:10px; font-weight:700; }
  .badge-prep    { background:#ede9fe; color:#5b21b6; padding:1px 6px; border-radius:3px; font-size:10px; font-weight:700; }
  .badge-sec     { background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:3px; font-size:10px; font-weight:700; }

  /* ─── Signature Block ─── */
  .signature-block { text-align:center; min-width:150px; }
  .signatures-row {
    margin-top:22px; display:flex; justify-content:space-between; align-items:flex-end;
  }

  /* ─── Instructions ─── */
  .instructions-list { margin-right:18px; font-size:10px; line-height:1.6; }
  .instructions-list li { margin-bottom:3px; }

  /* ─── Managers phone table ─── */
  .managers-table { width:100%; border-collapse:collapse; border:1.5px solid #000; }
  .managers-table th { background:#e9ecef; padding:3px 6px; font-size:10px; border:1px solid #ccc; }
  .managers-table td { padding:3px 6px; font-size:10px; border:1px solid #eee; }

  /* ─── Print media overrides ─── */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 8mm; size: A4 portrait; }
    .report-page { margin: 0; }
    .no-print { display: none !important; }
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
      <div style="text-align:right; min-width:140px;">
        <p style="font-weight:900; font-size:13px; margin-bottom:2px;">${cfg.governorate}</p>
        <p style="font-weight:800; font-size:12px; margin-bottom:4px;">${cfg.directorate}</p>
        <p style="font-size:10px; color:#555;">التاريخ: ${today}</p>
      </div>
      <div class="report-title-box">
        <div style="font-weight:900; font-size:16px; margin-bottom:3px;">${title}</div>
        ${subtitle ? `<div style="font-size:12px; color:#444; margin-top:2px;">${subtitle}</div>` : ''}
        <div style="font-size:10px; color:#666; margin-top:2px;">العام الدراسي: ${cfg.academicYear}</div>
      </div>
      <div style="text-align:center; min-width:80px;">
        <div style="width:70px; height:70px; border:2px solid #1e3a5f; display:flex; align-items:center; justify-content:center; background:#f8f9fa; margin:0 auto;">
          <img src="/logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار" />
        </div>
        <p style="font-size:8px; margin-top:2px; font-weight:bold;">إدارة العمرانية</p>
      </div>
    </div>
  `;
}

export function renderOfficials(cfg: ReportSettings): string {
  return `
    <div style="margin-top:5px;">
      <div class="officials-box">
        <span style="font-weight:700;">${cfg.gm_name}</span>
        <span style="color:#555;">${cfg.gm_title}</span>
        <span dir="ltr" style="color:#1e3a5f; font-weight:600;">${cfg.gm_phone}</span>
      </div>
      <div class="officials-box">
        <span style="font-weight:700;">${cfg.deputy_name}</span>
        <span style="color:#555;">${cfg.deputy_title}</span>
        <span dir="ltr" style="color:#1e3a5f; font-weight:600;">${cfg.deputy_phone}</span>
      </div>
      <div class="officials-box">
        <span style="font-weight:700;">${cfg.security_name}</span>
        <span style="color:#555;">${cfg.security_title}</span>
        <span dir="ltr" style="color:#1e3a5f; font-weight:600;">${cfg.security_phone}</span>
      </div>
    </div>
  `;
}

export function renderManagersTable(cfg: ReportSettings): string {
  const managers = [
    { stage: 'التعليم الابتدائي', name: cfg.mgr_primary, phone: cfg.mgr_primary_phone },
    { stage: 'التعليم الإعدادي', name: cfg.mgr_prep, phone: cfg.mgr_prep_phone },
    { stage: 'التعليم الثانوي', name: cfg.mgr_sec, phone: cfg.mgr_sec_phone },
  ];
  return `
    <table class="managers-table" style="margin-top:5px;">
      <thead><tr>
        <th>المرحلة</th><th>الاسم</th><th>التليفون</th>
      </tr></thead>
      <tbody>
        ${managers.map(m => `
          <tr>
            <td style="font-weight:600;">${m.stage}</td>
            <td>${m.name}</td>
            <td dir="ltr">${m.phone}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

export function renderSignatures(cfg: ReportSettings): string {
  return `
    <div class="signatures-row">
      <div class="signature-block">
        <p style="font-weight:700; font-size:11px;">يعتمد،، الموجه الأول للمادة</p>
        <p style="margin-top:28px; border-top:1px solid #000; padding-top:3px; font-size:10px;">التوقيع</p>
      </div>
      <div class="signature-block">
        <p style="font-weight:700; font-size:11px;">${cfg.deputy_title}</p>
        <p style="font-weight:900; font-size:13px; margin-top:4px;">${cfg.deputy_name}</p>
        <p style="margin-top:24px; border-top:1px solid #000; padding-top:3px; font-size:10px;">التوقيع</p>
      </div>
      <div class="signature-block">
        <p style="font-weight:700; font-size:11px;">${cfg.gm_title}</p>
        <p style="font-weight:900; font-size:13px; margin-top:4px;">${cfg.gm_name}</p>
        <p style="margin-top:24px; border-top:1px solid #000; padding-top:3px; font-size:10px;">التوقيع</p>
      </div>
    </div>
  `;
}

export function renderGMSignature(cfg: ReportSettings): string {
  return `
    <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-start; gap:20px;">
      <div style="border:1.5px solid #000; padding:8px 12px; font-size:10.5px; flex:1;">
        <p style="font-weight:700; margin-bottom:5px;">ملاحظات هامة:</p>
        <p style="margin:2px 0;">• يُرجى الالتزام بالمدرسة المحددة.</p>
        <p style="margin:2px 0;">• التواصل الفوري مع غرفة العمليات عند أي طارئ.</p>
        <p style="margin:2px 0;">• الحضور قبل بدء الامتحان بوقت كافٍ.</p>
      </div>
      <div class="signature-block" style="min-width:180px;">
        <p style="font-weight:700; font-size:11px;">يعتمد،،</p>
        <p style="font-weight:900; font-size:12px; margin:4px 0;">${cfg.gm_title}</p>
        <p style="font-weight:800; font-size:11px; margin-top:4px;">${cfg.gm_name}</p>
        <p style="margin-top:28px; border-top:1px solid #000; padding-top:3px; font-size:10px;">التوقيع</p>
      </div>
    </div>
  `;
}

export const INSTRUCTIONS = [
  'التزام الموجه المقيم بتواجده مع مدير المدرسة لاستلام مظاريف الأسئلة من المطبعة السرية وتأمين سرية الامتحانات.',
  'الالتزام بالحضور قبل فتح مظاريف الأسئلة بوقت كاف مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.',
  'التواجد بالمدرسة قبل بدء الامتحان بوقت كاف للتأكد من استيفاء جميع الإجراءات المتصلة بالامتحان وقبل فتح مظاريف الأسئلة مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.',
  'الالتزام بجدول الامتحان كما هو وارد من الإدارة التعليمية وعدم مخالفته مطلقا.',
  'عمل تقرير يومي عن سير الامتحان مرفق به نسخة من أسئلة المواد التي تم تأدية الامتحان فيها في ذات اليوم وكذلك نسخة من الإملاء لمادة اللغة العربية ونسخة من أسئلة الاستماع للغة الإنجليزية بعد انتهاء الامتحانات.',
  'عمل تقرير شامل في نهاية الامتحانات عن سير الامتحان بالمدرسة وتسليم التقارير اليومية والتقرير الشامل للمراحل في آخر يوم من أيام الامتحان لكل مرحلة.',
  'الالتزام بخروج الطلاب آخر الوقت وعدم مغادرة المدرسة إلا بعد خروج آخر طالب ومتابعة ذلك مع مدير المدرسة ومراقبي الأدوار.',
  'التواصل مع غرفة العمليات بالإدارة على الفور في حال حدوث مخالفة أو أي عارض ذو شأن أثناء سير الامتحان اليومي أو في حال وجود زائر من خارج الإدارة سواء من المديرية التعليمية أو الوزارة حيث أن ذلك سيتم تدوينه في التقرير اليومي للإدارة.',
];

export function openPrintWindow(title: string, html: string) {
  const w = window.open('', '_blank', 'width=1050,height=850');
  if (!w) { alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }
  w.document.write(`<!DOCTYPE html><html lang="ar"><head><meta charset="UTF-8"><title>${title}</title>${PRINT_STYLES}</head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 600);
}

'use client';

import { useRef } from 'react';
import { DistributionResult } from '@/types/database';
import { Printer, Download } from 'lucide-react';

export default function PrintableAssignment({ 
  results, 
  settings 
}: { 
  results: DistributionResult[],
  settings: any[]
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (typeof window === 'undefined') return;
    const html2pdf = (await import('html2pdf.js')).default;
    
    const element = printRef.current;
    const opt = {
      margin: 10,
      filename: `نشرة_توزيع_${new Date().toLocaleDateString('ar-EG')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
  };

  return (
    <div dir="rtl" className="font-serif">
      <div className="flex justify-end gap-2 mb-6 no-print">
        <button 
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>تحميل PDF</span>
        </button>
      </div>

      <div ref={printRef} className="bg-white p-10 border border-slate-200 min-h-[297mm] text-black">
        {/* Official Header */}
        <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-double border-slate-800">
          <div className="text-center">
            <h4 className="font-bold text-lg">وزارة التربية والتعليم</h4>
            <h4 className="font-bold">مديرية التربية والتعليم بالجيزة</h4>
            <h4 className="font-bold">إدارة العمرانية التعليمية</h4>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-100 border-2 border-slate-800 flex items-center justify-center mb-2 font-bold text-xs">شعار الوزارة</div>
          </div>
          <div className="text-right">
            <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p>السنة الدراسية: 2025 / 2026</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold underline underline-offset-8 decoration-double">نشرة توزيع الموجهين الرسمية</h2>
        </div>

        <p className="mb-6 leading-relaxed text-lg">
          بناءً على القواعد المنظمة والاحتياجات الفعلية للمدارس ورغبات السادة الموجهين، تقرر توزيع السادة المذكورين أدناه على المدارس الموضحة قرين كل اسم، وعلى الجهات المختصة تنفيذ ذلك.
        </p>

        <table className="w-full border-collapse border-2 border-slate-800 text-right">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-slate-800 p-3 w-12 text-center">م</th>
              <th className="border-2 border-slate-800 p-3">اسم الموجه</th>
              <th className="border-2 border-slate-800 p-3">التخصص</th>
              <th className="border-2 border-slate-800 p-3">المدرسة الموزع عليها</th>
              <th className="border-2 border-slate-800 p-3">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res, i) => (
              <tr key={i} className="odd:bg-white even:bg-slate-50">
                <td className="border-2 border-slate-800 p-3 text-center">{i + 1}</td>
                <td className="border-2 border-slate-800 p-3 font-bold">{res.supervisor?.name}</td>
                <td className="border-2 border-slate-800 p-3">{res.supervisor?.specialty}</td>
                <td className="border-2 border-slate-800 p-3">{res.school?.school_name}</td>
                <td className="border-2 border-slate-800 p-3 text-sm">
                  {res.rank_achieved > 0 ? `بناءً على الرغبة (${res.rank_achieved})` : 'توزيع لصالح العمل'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Signatures */}
        <div className="mt-20 grid grid-cols-2 gap-12 text-center">
          <div className="space-y-12">
            <p className="font-bold">يعتمد،،،</p>
            <div className="space-y-1">
              <p className="font-bold underline">مدير عام الإدارة</p>
              <p>( ................................ )</p>
            </div>
          </div>
          <div className="space-y-12">
            <p className="font-bold">يعتمد،،،</p>
            <div className="space-y-1">
              <p className="font-bold underline">مدير التوجيه الفني</p>
              <p>( ................................ )</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-20 text-xs text-slate-500 flex justify-between border-t border-slate-200 italic">
          <p>تم استخراج هذا المستند إلكترونياً عبر منظومة التوزيع الذكي - {new Date().toLocaleString('ar-EG')}</p>
          <p>صفحة 1 من 1</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .min-h-screen { min-height: 0 !important; }
        }
      `}</style>
    </div>
  );
}

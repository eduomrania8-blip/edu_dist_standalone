'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Play, 
  Printer, 
  Database, 
  Users, 
  School as SchoolIcon,
  ChevronLeft,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { syncDataFromGoogleSheets } from '@/actions/syncActions';
import { executeDistribution } from '@/actions/distributionActions';
import { getDistributionResults, getAllSchools, getAllSupervisors } from '@/services/distributionService';
import { DistributionResult, School, Supervisor } from '@/types/database';
import dynamic from 'next/dynamic';

const PrintableAssignment = dynamic(() => import('@/components/PrintableAssignment'), { ssr: false });

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resData, schoolData, supervisorData] = await Promise.all([
        getDistributionResults(),
        getAllSchools(),
        getAllSupervisors()
      ]);
      setResults(resData);
      setSchools(schoolData);
      setSupervisors(supervisorData);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    const res = await syncDataFromGoogleSheets();
    if (res.success) {
      toast.success('تمت المزامنة بنجاح');
      fetchData();
    } else {
      toast.error('خطأ في المزامنة: ' + res.message);
    }
    setLoading(false);
  };

  const handleRunDistribution = async () => {
    setLoading(true);
    const res = await executeDistribution();
    if (res.success) {
      toast.success(`تم التوزيع لعدد ${res.count} موجه`);
      fetchData();
    } else {
      toast.error('خطأ في التوزيع: ' + res.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            لوحة إدارة <span className="text-cyan-400">التوزيع الذكي</span>
          </h1>
          <p className="text-slate-400 text-lg">إدارة العمرانية التعليمية - محافظة الجيزة</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleSync}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>مزامنة من Google Sheets</span>
          </button>
          
          <button 
            onClick={handleRunDistribution}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>تشغيل التوزيع الذكي</span>
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'إجمالي المدارس', value: schools.length, icon: SchoolIcon, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'إجمالي الموجهين', value: supervisors.length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'موجهين تم توزيعهم', value: results.length, icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center gap-5"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-400 font-medium">{stat.label}</p>
              <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400 w-6 h-6" />
            نتائج التوزيع الأخيرة
          </h2>
          {results.length > 0 && (
            <button 
              onClick={() => setShowPrint(true)}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span>طباعة النتائج (PDF)</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-400 uppercase text-sm">
                <th className="p-4 font-semibold">الموجه</th>
                <th className="p-4 font-semibold">التخصص</th>
                <th className="p-4 font-semibold">المدرسة الموزع عليها</th>
                <th className="p-4 font-semibold">الرغبة المحققة</th>
                <th className="p-4 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    لا توجد نتائج توزيع حالياً. قم بالمزامنة ثم تشغيل التوزيع.
                  </td>
                </tr>
              ) : (
                results.map((res, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white">{res.supervisor?.name}</td>
                    <td className="p-4 text-slate-300">{res.supervisor?.specialty}</td>
                    <td className="p-4 text-slate-300">{res.school?.school_name}</td>
                    <td className="p-4">
                      {res.rank_achieved > 0 ? (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs border border-emerald-500/20">
                          الرغبة {res.rank_achieved}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs border border-amber-500/20">
                          توزيع اضطراري
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-emerald-400 text-sm">مكتمل</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Modal */}
      <AnimatePresence>
        {showPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrint(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl"
            >
              <div className="sticky top-0 p-4 bg-[#0f172a]/80 backdrop-blur border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">معاينة الطباعة المتقدمة</h3>
                <button onClick={() => setShowPrint(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <ChevronLeft className="w-6 h-6 rotate-180" />
                </button>
              </div>
              <div className="p-8 bg-white text-black min-h-screen">
                <PrintableAssignment results={results} settings={[]} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

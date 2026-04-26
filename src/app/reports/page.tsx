'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, School,
  Download, FileText, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { getAllRuns, getResultsByRun } from '@/services/distributionService';
import { DistributionRun, DistributionResult } from '@/types/database';
import { getRankLabel } from '@/lib/distributionAlgorithm';

export default function ReportsPage() {
  const [runs, setRuns] = useState<DistributionRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRuns().then(r => {
      setRuns(r);
      if (r.length > 0) setSelectedRun(r[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedRun) getResultsByRun(selectedRun).then(setResults);
  }, [selectedRun]);

  const run = runs.find(r => r.id === selectedRun);

  const byWish = [1, 2, 3, 4, 0].map(rank => ({
    label: getRankLabel(rank),
    count: results.filter(r => r.rank_achieved === rank).length,
    color: rank === 1 ? '#34d399' : rank === 2 ? '#22d3ee' : rank === 3 ? '#a78bfa' : rank === 4 ? '#60a5fa' : '#fbbf24',
  }));

  const maxCount = Math.max(...byWish.map(b => b.count), 1);

  // Group by school
  const bySchool = Object.entries(
    results.reduce<Record<string, { name: string; count: number }>>((acc, r) => {
      const id = r.assigned_school_id;
      const name = r.school?.school_name ?? id;
      if (!acc[id]) acc[id] = { name, count: 0 };
      acc[id].count++;
      return acc;
    }, {})
  ).sort((a, b) => b[1].count - a[1].count);

  // Group by specialty
  const bySpecialty = Object.entries(
    results.reduce<Record<string, number>>((acc, r) => {
      const spec = r.supervisor?.specialty ?? 'غير محدد';
      acc[spec] = (acc[spec] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const exportCSV = () => {
    const headers = ['الموجه', 'التخصص', 'المرحلة', 'المدرسة', 'الرغبة المحققة', 'النقاط'];
    const rows = results.map(r => [
      r.supervisor?.name ?? '',
      r.supervisor?.specialty ?? '',
      r.supervisor?.stage ?? '',
      r.school?.school_name ?? '',
      getRankLabel(r.rank_achieved),
      r.final_score?.toFixed(1) ?? '',
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `توزيع_${run?.run_name ?? 'نتائج'}.csv`;
    a.click();
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير والإحصائيات</h1>
          <p className="page-subtitle">تحليل شامل لنتائج التوزيع</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-input" style={{ width: 220 }}
            value={selectedRun} onChange={e => setSelectedRun(e.target.value)}>
            {runs.map(r => <option key={r.id} value={r.id}>{r.run_name}</option>)}
          </select>
          <button className="btn-secondary" onClick={exportCSV} disabled={results.length === 0}>
            <Download size={14} /> تصدير CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ height: 120, padding: 20 }}>
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 32, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : !run ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: '#475569' }}>
          <BarChart3 size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          لا توجد عمليات توزيع بعد. قم بتشغيل التوزيع أولاً.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'إجمالي التوزيعات', value: results.length, icon: Users, color: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
              { label: 'توزيع بالرغبة الأولى', value: results.filter(r => r.rank_achieved === 1).length, icon: CheckCircle2, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
              { label: 'توزيع اضطراري', value: results.filter(r => r.rank_achieved === 0).length, icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
              { label: 'نسبة الرضا', value: run.satisfaction_rate + '%', icon: TrendingUp, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
              { label: 'متوسط النقاط', value: results.length > 0 ? (results.reduce((s, r) => s + (r.final_score ?? 0), 0) / results.length).toFixed(1) : '—', icon: BarChart3, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
              { label: 'مدارس مغطاة', value: new Set(results.map(r => r.assigned_school_id)).size, icon: School, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
            ].map((stat, i) => (
              <div key={i} className="glass-card stat-card">
                <div className="stat-icon" style={{ background: stat.bg }}>
                  <stat.icon size={18} color={stat.color} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>{stat.label}</p>
                  <h3 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Wish Distribution Chart */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#22d3ee" /> توزيع الرغبات
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byWish.map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.count}</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(item.count / maxCount) * 100}%`,
                        background: item.color,
                        borderRadius: 4,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Specialty */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#a78bfa" /> توزيع التخصصات
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {bySpecialty.map(([spec, count]) => (
                  <div key={spec} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{spec}</span>
                    <span className="badge badge-purple">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Results Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} color="#22d3ee" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>كشف التوزيع الكامل</h3>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, background: '#0d1526', zIndex: 1 }}>
                  <tr>
                    <th>#</th>
                    <th>الموجه</th>
                    <th>التخصص</th>
                    <th>المرحلة</th>
                    <th>المدرسة الموزع عليها</th>
                    <th>الرغبة المحققة</th>
                    <th>النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, i) => (
                    <tr key={res.id}>
                      <td style={{ color: '#475569', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{res.supervisor?.name}</td>
                      <td style={{ color: '#94a3b8', fontSize: 13 }}>{res.supervisor?.specialty}</td>
                      <td style={{ color: '#94a3b8', fontSize: 13 }}>{res.supervisor?.stage}</td>
                      <td style={{ color: '#94a3b8', fontSize: 13 }}>{res.school?.school_name}</td>
                      <td>
                        <span className={`badge ${
                          res.rank_achieved === 1 ? 'badge-green' :
                          res.rank_achieved === 2 ? 'badge-cyan' :
                          res.rank_achieved === 3 ? 'badge-purple' :
                          res.rank_achieved === 4 ? 'badge-blue' : 'badge-amber'
                        }`}>{getRankLabel(res.rank_achieved)}</span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                        {res.final_score?.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

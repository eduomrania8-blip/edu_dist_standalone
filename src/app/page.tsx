'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  School, Users, Database, BarChart3,
  TrendingUp, CheckCircle2, AlertTriangle, Clock,
  Play, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { getAllSchools, getAllSupervisors, getAllRuns, getLatestResults } from '@/services/distributionService';
import { School as SchoolType, Supervisor, DistributionRun, DistributionResult } from '@/types/database';
import { getRankColor, getRankLabel } from '@/lib/distributionAlgorithm';

export default function Dashboard() {
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [runs, setRuns] = useState<DistributionRun[]>([]);
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllSchools(),
      getAllSupervisors(),
      getAllRuns(),
      getLatestResults(),
    ]).then(([s, sup, r, res]) => {
      setSchools(s);
      setSupervisors(sup);
      setRuns(r);
      setResults(res);
    }).finally(() => setLoading(false));
  }, []);

  const lastRun = runs[0];
  const totalNeeded = schools.reduce((sum, s) => sum + (s.needs_count ?? 1), 0);
  const supervisorsWithWishes = supervisors.length; // simplified

  const stats = [
    {
      label: 'إجمالي المدارس',
      value: schools.length,
      sub: `تحتاج ${totalNeeded} موجه`,
      icon: School,
      color: '#22d3ee',
      bg: 'rgba(34,211,238,0.1)',
    },
    {
      label: 'إجمالي الموجهين',
      value: supervisors.length,
      sub: 'موجه نشط في النظام',
      icon: Users,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
    },
    {
      label: 'عمليات التوزيع',
      value: runs.length,
      sub: runs.length > 0 ? 'آخر تشغيل: ' + new Date(runs[0]?.created_at).toLocaleDateString('ar-EG') : 'لم يتم التشغيل بعد',
      icon: Database,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
    },
    {
      label: 'نسبة الرضا',
      value: lastRun ? `${lastRun.satisfaction_rate}%` : '—',
      sub: lastRun ? `${lastRun.total_assigned} موجه وُزِّع` : 'لا توجد نتائج بعد',
      icon: TrendingUp,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.1)',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة التحكم الرئيسية</h1>
          <p className="page-subtitle">
            منظومة التوزيع الذكي — إدارة العمرانية التعليمية — محافظة الجيزة
          </p>
        </div>
        <Link href="/distribution" className="btn-primary">
          <Play size={16} />
          تشغيل التوزيع
        </Link>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="glass-card stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            {loading ? (
              <>
                <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '70%' }} />
                </div>
              </>
            ) : (
              <>
                <div className="stat-icon" style={{ background: stat.bg }}>
                  <stat.icon size={22} color={stat.color} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{stat.label}</p>
                  <h3 style={{ margin: '4px 0 2px', fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{stat.value}</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{stat.sub}</p>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* Latest Results Table */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#34d399" />
              آخر نتائج التوزيع
            </h2>
            {results.length > 0 && (
              <Link href="/distribution" style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: '#22d3ee', textDecoration: 'none',
              }}>
                عرض الكل <ArrowLeft size={12} />
              </Link>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموجه</th>
                  <th>التخصص</th>
                  <th>المدرسة</th>
                  <th>الرغبة</th>
                  <th>النقاط</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                      ))}
                    </tr>
                  ))
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                      <AlertTriangle size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
                      لا توجد نتائج بعد. قم بتشغيل التوزيع أولاً.
                    </td>
                  </tr>
                ) : (
                  results.slice(0, 10).map((res) => (
                    <tr key={res.id}>
                      <td style={{ fontWeight: 600 }}>{res.supervisor?.name}</td>
                      <td style={{ color: '#94a3b8', fontSize: 13 }}>{res.supervisor?.specialty}</td>
                      <td style={{ color: '#94a3b8', fontSize: 13 }}>{res.school?.school_name}</td>
                      <td>
                        <span className={`badge ${res.rank_achieved === 0 ? 'badge-amber' : res.rank_achieved === 1 ? 'badge-green' : res.rank_achieved === 2 ? 'badge-cyan' : 'badge-purple'}`}>
                          {getRankLabel(res.rank_achieved)}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>
                        {res.final_score?.toFixed(0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right Panel: Run History */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#a78bfa" />
              سجل التوزيعات
            </h2>
          </div>

          <div style={{ padding: '12px 8px' }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: '10px 12px', marginBottom: 4 }}>
                  <div className="skeleton" style={{ height: 13, width: '70%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '50%' }} />
                </div>
              ))
            ) : runs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#475569', padding: 24, fontSize: 13 }}>
                لا توجد عمليات توزيع مسبقة
              </p>
            ) : (
              runs.slice(0, 8).map(run => (
                <div key={run.id} style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  marginBottom: 4,
                  transition: 'background 0.15s',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                      {run.run_name}
                    </p>
                    <span className="badge badge-green" style={{ fontSize: 10 }}>
                      {run.satisfaction_rate}%
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748b' }}>
                    {run.total_assigned} موجه · {new Date(run.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/distribution" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              <BarChart3 size={14} />
              عرض كل التوزيعات
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

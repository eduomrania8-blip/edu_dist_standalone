'use client';

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RefreshCw, ChevronDown, ChevronUp, Info,
  CheckCircle2, AlertTriangle, Trash2, Printer,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { executeDistribution } from '@/actions/distributionActions';
import {
  getAllRuns, getResultsByRun, deleteRun,
} from '@/services/distributionService';
import {
  DistributionRun, DistributionResult, AlgorithmParams, DEFAULT_PARAMS,
} from '@/types/database';
import { getRankLabel } from '@/lib/distributionAlgorithm';
import dynamic from 'next/dynamic';

const PrintableAssignment = dynamic(() => import('@/components/PrintableAssignment'), { ssr: false });

export default function DistributionPage() {
  const [runs, setRuns] = useState<DistributionRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<DistributionRun | null>(null);
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [runName, setRunName] = useState('توزيع ' + new Date().getFullYear());
  const [params, setParams] = useState<AlgorithmParams>(DEFAULT_PARAMS);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllRuns();
      setRuns(data);
      if (data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  useEffect(() => {
    if (selectedRun) {
      getResultsByRun(selectedRun.id).then(setResults);
    }
  }, [selectedRun]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await executeDistribution(runName, '2025/2026', params);
      if (res.success) {
        toast.success(res.message ?? 'تم التوزيع بنجاح');
        await loadRuns();
      } else {
        toast.error(res.message ?? 'فشل التوزيع');
      }
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteRun = async (run: DistributionRun) => {
    if (!confirm(`هل تريد حذف "${run.run_name}"؟`)) return;
    try {
      await deleteRun(run.id);
      toast.success('تم الحذف');
      setSelectedRun(null);
      setResults([]);
      loadRuns();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  const rankBadge = (rank: number) => {
    const classes = rank === 1 ? 'badge-green' : rank === 2 ? 'badge-cyan' : rank === 3 ? 'badge-purple' : rank === 4 ? 'badge-blue' : 'badge-amber';
    return <span className={`badge ${classes}`}>{getRankLabel(rank)}</span>;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">محرك التوزيع الذكي</h1>
          <p className="page-subtitle">تشغيل وإدارة عمليات التوزيع مع الشرح الكامل</p>
        </div>
      </div>

      {/* Run Control Panel */}
      <div className="glass-card glass-card-accent" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">اسم عملية التوزيع</label>
            <input className="form-input" value={runName}
              onChange={e => setRunName(e.target.value)} />
          </div>

          <button
            className="btn-secondary"
            onClick={() => setShowParams(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Info size={14} />
            معاملات الخوارزمية
            {showParams ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button className="btn-primary" onClick={handleRun} disabled={running}
            style={{ minWidth: 160, justifyContent: 'center' }}>
            {running
              ? <><RefreshCw size={15} className="animate-spin" /> جاري التوزيع...</>
              : <><Play size={15} /> تشغيل التوزيع</>}
          </button>
        </div>

        {/* Algorithm Params */}
        <AnimatePresence>
          {showParams && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginTop: 20, paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14,
              }}>
                {([
                  { key: 'wish1_score', label: 'نقاط الرغبة الأولى' },
                  { key: 'wish2_score', label: 'نقاط الرغبة الثانية' },
                  { key: 'wish3_score', label: 'نقاط الرغبة الثالثة' },
                  { key: 'wish4_score', label: 'نقاط الرغبة الرابعة' },
                  { key: 'specialization_bonus', label: 'مكافأة التخصص' },
                  { key: 'stage_bonus', label: 'مكافأة المرحلة' },
                  { key: 'type_bonus', label: 'مكافأة نوع المدرسة' },
                  { key: 'workload_penalty', label: 'عقوبة العبء الزائد' },
                ] as const).map(({ key, label }) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" type="number"
                      value={(params as any)[key]}
                      onChange={e => setParams(p => ({ ...p, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="opt" checked={params.run_optimization}
                    onChange={e => setParams(p => ({ ...p, run_optimization: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label htmlFor="opt" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    تشغيل التحسين بالتبادل
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Runs List + Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Runs sidebar */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
            سجل العمليات
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="skeleton" style={{ height: 13, width: '70%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '50%' }} />
                </div>
              ))
            ) : runs.length === 0 ? (
              <p style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 }}>
                لا توجد عمليات بعد
              </p>
            ) : (
              runs.map(run => (
                <div
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    background: selectedRun?.id === run.id ? 'rgba(34,211,238,0.06)' : 'transparent',
                    borderRight: selectedRun?.id === run.id ? '3px solid #22d3ee' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{run.run_name}</p>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteRun(run); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748b' }}>
                    {run.total_assigned} موجه · {run.satisfaction_rate}% رضا
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: '#334155' }}>
                    {new Date(run.created_at).toLocaleString('ar-EG')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Results Table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#34d399" />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                {selectedRun ? selectedRun.run_name : 'اختر عملية توزيع'}
              </h2>
              {selectedRun && (
                <span className="badge badge-green">{results.length} نتيجة</span>
              )}
            </div>
            {results.length > 0 && (
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setShowPrint(true)}>
                <Printer size={13} /> طباعة
              </button>
            )}
          </div>

          {/* Stats Bar */}
          {selectedRun && (
            <div style={{
              display: 'flex', gap: 0,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {[
                { label: 'رغبة أولى', value: results.filter(r => r.rank_achieved === 1).length, color: '#34d399' },
                { label: 'رغبة ثانية', value: results.filter(r => r.rank_achieved === 2).length, color: '#22d3ee' },
                { label: 'رغبة ثالثة', value: results.filter(r => r.rank_achieved === 3).length, color: '#a78bfa' },
                { label: 'رغبة رابعة', value: results.filter(r => r.rank_achieved === 4).length, color: '#60a5fa' },
                { label: 'اضطراري', value: results.filter(r => r.rank_achieved === 0).length, color: '#fbbf24' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: '10px 0', textAlign: 'center',
                  borderLeft: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#0d1526' }}>
                <tr>
                  <th>الموجه</th>
                  <th>التخصص</th>
                  <th>المدرسة</th>
                  <th>الرغبة</th>
                  <th>النقاط</th>
                  <th>الشرح</th>
                </tr>
              </thead>
              <tbody>
                {!selectedRun ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                    اختر عملية توزيع من القائمة
                  </td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                    <AlertTriangle size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                    لا توجد نتائج لهذه العملية
                  </td></tr>
                ) : (
                  results.map(res => (
                    <Fragment key={res.id}>
                      <tr style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedRow(expandedRow === res.id ? null : res.id)}>
                        <td style={{ fontWeight: 600 }}>{res.supervisor?.name}</td>
                        <td style={{ color: '#94a3b8', fontSize: 13 }}>{res.supervisor?.specialty}</td>
                        <td style={{ color: '#94a3b8', fontSize: 13 }}>{res.school?.school_name}</td>
                        <td>{rankBadge(res.rank_achieved)}</td>
                        <td style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                          {res.final_score?.toFixed(1)}
                        </td>
                        <td>
                          <button style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                          }}>
                            <Info size={13} />
                            {expandedRow === res.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </td>
                      </tr>

                      {/* Explainability Row */}
                      {expandedRow === res.id && (
                        <tr key={res.id + '_exp'}>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div style={{
                              background: 'rgba(34,211,238,0.03)',
                              borderBottom: '1px solid rgba(34,211,238,0.1)',
                              padding: '14px 20px',
                            }}>
                              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                                ⚡ تفصيل النقاط
                              </p>
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                {[
                                  { label: 'الرغبة', value: res.score_breakdown?.preference_score },
                                  { label: 'التخصص', value: res.score_breakdown?.specialization_score },
                                  { label: 'المرحلة', value: res.score_breakdown?.stage_score },
                                  { label: 'النوع', value: res.score_breakdown?.type_score },
                                  { label: 'عقوبة العبء', value: -(res.score_breakdown?.workload_penalty ?? 0) },
                                ].map(item => (
                                  <div key={item.label} style={{
                                    background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                                    padding: '8px 14px', textAlign: 'center',
                                  }}>
                                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{item.label}</p>
                                    <p style={{
                                      margin: '2px 0 0', fontSize: 15, fontWeight: 800,
                                      color: (item.value ?? 0) >= 0 ? '#34d399' : '#f87171',
                                    }}>
                                      {(item.value ?? 0) > 0 ? '+' : ''}{item.value ?? 0}
                                    </p>
                                  </div>
                                ))}
                                <div style={{
                                  background: 'rgba(34,211,238,0.08)', borderRadius: 8,
                                  padding: '8px 14px', textAlign: 'center',
                                  border: '1px solid rgba(34,211,238,0.2)',
                                }}>
                                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>المجموع</p>
                                  <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#22d3ee' }}>
                                    {res.final_score?.toFixed(1)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      <AnimatePresence>
        {showPrint && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPrint(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, width: '100%', maxWidth: 900,
                maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, background: '#0d1526', zIndex: 1,
              }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>معاينة الطباعة</h3>
                <button onClick={() => setShowPrint(false)} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '4px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12,
                }}>إغلاق</button>
              </div>
              <div style={{ padding: 24, background: 'white', color: 'black' }}>
                <PrintableAssignment 
                  results={results} 
                  runName={selectedRun?.run_name ?? ''} 
                  stats={{
                    total: results.length,
                    by_wish_1: results.filter(r => r.rank_achieved === 1).length,
                    by_wish_2: results.filter(r => r.rank_achieved === 2).length,
                    by_wish_3: results.filter(r => r.rank_achieved === 3).length,
                    by_wish_4: results.filter(r => r.rank_achieved === 4).length,
                    forced: results.filter(r => r.rank_achieved === 0).length,
                    unassigned: 0,
                    satisfaction_rate: selectedRun?.satisfaction_rate ?? 0,
                    avg_score: 0
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

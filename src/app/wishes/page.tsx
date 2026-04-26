'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, Save, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllSupervisors, getAllSchools, getAllWishes, upsertWish, deleteWish } from '@/services/distributionService';
import { Supervisor, School, SupervisorWish, WishFormData } from '@/types/database';

export default function WishesPage() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [wishes, setWishes] = useState<SupervisorWish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  // Local wish edits keyed by supervisor_id
  const [drafts, setDrafts] = useState<Record<string, WishFormData>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sups, schs, wsh] = await Promise.all([
        getAllSupervisors(), getAllSchools(), getAllWishes(),
      ]);
      setSupervisors(sups);
      setSchools(schs);
      setWishes(wsh);

      // Init drafts from existing wishes
      const init: Record<string, WishFormData> = {};
      sups.forEach(s => {
        const existing = wsh.find(w => w.supervisor_id === s.id);
        init[s.id] = {
          supervisor_id: s.id,
          wish_1: existing?.wish_1 ?? '',
          wish_2: existing?.wish_2 ?? '',
          wish_3: existing?.wish_3 ?? '',
          wish_4: existing?.wish_4 ?? '',
          notes: existing?.notes ?? '',
        };
      });
      setDrafts(init);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (supervisorId: string, field: keyof WishFormData, value: string) => {
    setDrafts(d => ({ ...d, [supervisorId]: { ...d[supervisorId], [field]: value } }));
  };

  const handleSave = async (supervisorId: string) => {
    setSaving(supervisorId);
    try {
      const draft = drafts[supervisorId];
      // Remove empty strings → undefined
      const payload: WishFormData = {
        supervisor_id: supervisorId,
        wish_1: draft.wish_1 || undefined,
        wish_2: draft.wish_2 || undefined,
        wish_3: draft.wish_3 || undefined,
        wish_4: draft.wish_4 || undefined,
        notes: draft.notes || undefined,
      };
      await upsertWish(payload);
      toast.success('تم حفظ الرغبات');
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleClear = async (supervisorId: string) => {
    try {
      await deleteWish(supervisorId);
      setDrafts(d => ({
        ...d,
        [supervisorId]: { supervisor_id: supervisorId, wish_1: '', wish_2: '', wish_3: '', wish_4: '', notes: '' },
      }));
      toast.success('تم مسح الرغبات');
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  const filtered = supervisors.filter(s =>
    s.name.includes(search) || s.specialty.includes(search)
  );

  const wishLabels = [
    { key: 'wish_1', label: 'الرغبة الأولى', color: '#34d399' },
    { key: 'wish_2', label: 'الرغبة الثانية', color: '#22d3ee' },
    { key: 'wish_3', label: 'الرغبة الثالثة', color: '#a78bfa' },
    { key: 'wish_4', label: 'الرغبة الرابعة', color: '#fbbf24' },
  ] as const;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدخال الرغبات</h1>
          <p className="page-subtitle">حدد تفضيلات كل موجه (حتى 4 رغبات مرتبة)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heart size={16} color="#f87171" />
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            {wishes.length} موجه سجّل رغباته من أصل {supervisors.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="form-input" style={{ paddingRight: 36 }}
            placeholder="بحث بالاسم أو التخصص..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Wishes Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 16, width: '30%', marginBottom: 12 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="skeleton" style={{ height: 38, borderRadius: 8 }} />
                ))}
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: '#475569' }}>
            لا توجد نتائج
          </div>
        ) : (
          filtered.map(sup => {
            const draft = drafts[sup.id] ?? { supervisor_id: sup.id };
            const hasWishes = draft.wish_1 || draft.wish_2 || draft.wish_3 || draft.wish_4;

            return (
              <div key={sup.id} className="glass-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(167,139,250,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#a78bfa',
                    }}>
                      {sup.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{sup.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{sup.specialty} • {sup.stage}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {hasWishes && (
                      <button onClick={() => handleClear(sup.id)} style={{
                        padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)',
                        background: 'rgba(248,113,113,0.08)', color: '#f87171', cursor: 'pointer', fontSize: 12,
                      }}>
                        مسح
                      </button>
                    )}
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: 12 }}
                      onClick={() => handleSave(sup.id)}
                      disabled={saving === sup.id}
                    >
                      <Save size={12} />
                      {saving === sup.id ? 'حفظ...' : 'حفظ'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {wishLabels.map(({ key, label, color }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color, display: 'block', marginBottom: 5 }}>
                        {label}
                      </label>
                      <select
                        className="form-input"
                        style={{ fontSize: 13 }}
                        value={(draft as any)[key] ?? ''}
                        onChange={e => handleChange(sup.id, key, e.target.value)}
                      >
                        <option value="">— بدون رغبة —</option>
                        {schools.map(s => (
                          <option key={s.id} value={s.id}>{s.school_name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10 }}>
                  <input
                    className="form-input"
                    style={{ fontSize: 12 }}
                    placeholder="ملاحظات (اختياري)..."
                    value={draft.notes ?? ''}
                    onChange={e => handleChange(sup.id, 'notes', e.target.value)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/actions/authActions';
import { Zap, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      if (result.role === 'admin') {
        router.push('/');
      } else {
        router.push('/guidance');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundImage: `
        radial-gradient(ellipse 80% 50% at 20% -20%, rgba(34,211,238,0.1) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 120%, rgba(167,139,250,0.08) 0%, transparent 60%)
      `
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px', position: 'relative' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(167,139,250,0.2)'
          }}>
            <Zap size={28} color="#000" />
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f1f5f9' }}>
            تسجيل الدخول
          </h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            منظومة التوزيع الذكي - إدارة العمرانية
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '24px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="form-label" htmlFor="username">اسم المستخدم</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="username"
                name="username"
                type="text" 
                className="form-input" 
                style={{ paddingRight: '40px' }}
                placeholder="أدخل اسم المستخدم"
                required
              />
              <User size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="password">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="password"
                name="password"
                type="password" 
                className="form-input" 
                style={{ paddingRight: '40px' }}
                placeholder="أدخل كلمة المرور"
                required
              />
              <Lock size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

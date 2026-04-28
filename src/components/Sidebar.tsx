'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  School,
  Users,
  Heart,
  Play,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logout, getUser } from '@/actions/authActions';
import { Building2 } from 'lucide-react';

const navItems = [
  { href: '/',              label: 'لوحة التحكم',          icon: LayoutDashboard },
  { href: '/base-schools',  label: 'المدارس الأساسية',      icon: Building2 },
  { href: '/supervisors',   label: 'الموجهون',              icon: Users },
  { href: '/schools',       label: 'لجان الامتحانات',       icon: School },
  { href: '/wishes',        label: 'الرغبات',               icon: Heart },
  { href: '/mandatory',     label: 'التكليفات الإجبارية',    icon: Zap },
  { href: '/distribution',  label: 'تشغيل التوزيع',         icon: Play },
  { href: '/reports',       label: 'التقارير والطباعة',      icon: BarChart3 },
  { href: '/users',         label: 'إدارة المستخدمين',      icon: Shield },
  { href: '/settings',      label: 'الإعدادات',             icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      router.push('/login');
    }
  };

  if (pathname === '/login') return null;

  const filteredItems = navItems.filter(item => {
    if (!user) return true;
    if (user.role === 'admin') return true;
    return item.href === '/';
  });

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="mobile-toggle no-print"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none', // Hidden on desktop, shown via CSS on mobile
          position: 'fixed', top: 16, right: 16, zIndex: 110,
          background: 'rgba(7,11,20,0.8)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: 8, color: '#f1f5f9', cursor: 'pointer',
          backdropFilter: 'blur(10px)'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {mobileOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay no-print"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99,
            backdropFilter: 'blur(4px)'
          }}
        />
      )}

      <nav className={`sidebar no-print ${mobileOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} color="#000" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#f1f5f9' }}>
              التوزيع الذكي
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              إدارة العمرانية
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ padding: '16px 12px', flex: 1 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#475569',
          textTransform: 'uppercase', letterSpacing: 1,
          padding: '0 8px', marginBottom: 8,
        }}>
          القائمة الرئيسية
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout Button */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{ 
              color: 'var(--accent-rose)',
              background: 'rgba(248,113,113,0.05)',
            }}
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 11,
        color: '#475569',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0 }}>محافظة الجيزة</p>
        <p style={{ margin: '2px 0 0', color: '#334155' }}>الإصدار 2.0 Enterprise</p>
        </div>
      </nav>
    </>
  );
}

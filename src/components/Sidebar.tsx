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

const navItems = [
  { href: '/',              label: 'لوحة التحكم',          icon: LayoutDashboard },
  { href: '/schools',       label: 'المدارس',               icon: School },
  { href: '/supervisors',   label: 'الموجهون',              icon: Users },
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

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      router.push('/login');
    }
  };

  if (pathname === '/login') return null;

  const filteredItems = navItems.filter(item => {
    // If user is still loading, show all items to avoid blank sidebar
    if (!user) return true;
    if (user.role === 'admin') return true;
    // Guidance users only see dashboard
    return item.href === '/';
  });

  return (
    <nav className="sidebar no-print">
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
  );
}

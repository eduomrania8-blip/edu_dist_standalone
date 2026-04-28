import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'بوابة المعلمين | إدارة العمرانية التعليمية',
  description: 'بوابة تسجيل وتحديث بيانات المعلمين - إدارة العمرانية التعليمية',
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Portal is fully independent — no sidebar, no admin UI
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {children}
    </div>
  );
}

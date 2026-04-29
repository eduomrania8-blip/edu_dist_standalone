import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "منظومة التوزيع الذكي | إدارة العمرانية التعليمية",
  description: "نظام متكامل لتوزيع الموجهين المقيمين على لجان الامتحانات - إدارة العمرانية التعليمية - محافظة الجيزة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.variable} suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-left"
          toastOptions={{
            style: {
              background: '#0d1526',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'Cairo, sans-serif',
              fontSize: '14px',
              direction: 'rtl',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#0d1526' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0d1526' } },
          }}
        />
      </body>
    </html>
  );
}

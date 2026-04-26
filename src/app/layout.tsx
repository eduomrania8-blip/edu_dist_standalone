import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "منظومة التوزيع الذكي | إدارة العمرانية",
  description: "نظام مستقل لتوزيع الموجهين باستخدام الذكاء الاصطناعي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-[#0f172a] text-slate-200 min-h-screen selection:bg-cyan-500/30">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-black"></div>
        <div className="fixed inset-0 -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        
        <main className="relative z-10">
          {children}
        </main>
        
        <Toaster position="top-center" reverseOrder={false} />
      </body>
    </html>
  );
}

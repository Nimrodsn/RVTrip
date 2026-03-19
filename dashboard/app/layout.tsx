import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'מפקד השיירה - RVTrip Dashboard',
  description: 'Dashboard for the Czechia-Slovakia RV Convoy 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto pt-14 lg:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import OfflineBanner from '@/components/OfflineBanner';
import { DrivingModeProvider } from '@/lib/DrivingModeContext';

export const metadata: Metadata = {
  title: 'מפקד השיירה - RVTrip Dashboard',
  description: 'Dashboard for the Czechia-Slovakia RV Convoy 2026',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RVTrip',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <DrivingModeProvider>
          <OfflineBanner />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto pt-14 lg:pt-0">
              {children}
            </main>
          </div>
        </DrivingModeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

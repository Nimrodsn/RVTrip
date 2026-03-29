'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDrivingMode } from '@/lib/DrivingModeContext';
import { strings } from '@/lib/strings';

const navItems = [
  { href: '/', label: 'ראשי', icon: '🏠' },
  { href: '/map', label: 'מפה ומסלול', icon: '🗺️' },
  { href: '/today', label: 'תוכנית להיום', icon: '📋' },
  { href: '/weather', label: 'מזג אוויר', icon: '🌤️' },
  { href: '/budget', label: 'תקציב והוצאות', icon: '💰' },
  { href: '/checklist', label: 'בדיקה לפני יציאה', icon: '✅' },
  { href: '/commander', label: 'המפקד (AI)', icon: '🤖' },
  { href: '/journal', label: 'יומן תמונות', icon: '📸' },
  { href: '/documents', label: 'מסמכי נסיעה', icon: '📎' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { drivingMode, toggleDrivingMode } = useDrivingMode();

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-primary text-white flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-xl"
          aria-label="תפריט"
        >
          {open ? '✕' : '☰'}
        </button>
        <h1 className="text-base font-extrabold">מפקד השיירה</h1>
        <div className="w-10" />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static z-50 top-0 right-0 h-full w-64 bg-primary text-white flex flex-col shrink-0 transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold">מפקד השיירה</h1>
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-white/60 mt-1">Czechia-Slovakia RV 2026</p>
          <p className="text-xs text-white/40 mt-1">3.2m גובה · 3.5t משקל</p>
        </div>
        <nav className="flex-1 py-4 overflow-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pt-3 pb-1 border-t border-white/10">
          <button
            onClick={toggleDrivingMode}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors',
              drivingMode
                ? 'bg-amber-400 text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            )}
          >
            <span className="text-lg">{drivingMode ? '☀️' : '🚗'}</span>
            <span>{drivingMode ? strings.drivingMode.on : strings.drivingMode.toggle}</span>
          </button>
        </div>
        <div className="p-4 border-t border-white/10 text-xs text-white/30 text-center">
          RVTrip Dashboard v1.0
        </div>
      </aside>
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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

  return (
    <aside className="w-64 min-h-screen bg-primary text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-extrabold">מפקד השיירה</h1>
        <p className="text-sm text-white/60 mt-1">Czechia-Slovakia RV 2026</p>
        <p className="text-xs text-white/40 mt-1">3.2m גובה · 3.5t משקל</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="p-4 border-t border-white/10 text-xs text-white/30 text-center">
        RVTrip Dashboard v1.0
      </div>
    </aside>
  );
}

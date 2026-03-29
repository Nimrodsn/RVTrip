'use client';

import { useEffect, useState } from 'react';
import { strings } from '@/lib/strings';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white text-center py-2 px-4 text-sm font-semibold shadow-md">
      ⚡ {strings.offline.offlineBanner}
    </div>
  );
}

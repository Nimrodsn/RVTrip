'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import MapView from '@/components/MapView';
import type { LocationType } from '@/lib/types';

export default function MapPage() {
  const [customStops, setCustomStops] = useState<
    Array<{ id: string; day: number; name: string; type: LocationType; lat: number; lng: number; note: string }>
  >([]);

  useEffect(() => {
    supabase
      .from('custom_stops')
      .select('*')
      .then(({ data }) => {
        if (data) setCustomStops(data as typeof customStops);
      });
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <MapView customStops={customStops} />
    </div>
  );
}

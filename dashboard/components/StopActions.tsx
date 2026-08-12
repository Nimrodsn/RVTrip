'use client';

import { useState } from 'react';
import { strings } from '@/lib/strings';
import { buildMapyCzUrl } from '@/lib/mapyCzUrl';
import type { LocationType } from '@/lib/types';

interface StopActionsProps {
  lat: number;
  lng: number;
  type: LocationType;
  url?: string;
}

/**
 * One large primary navigate target, with the secondary links tucked away so a stop card
 * stays scannable at a glance while driving.
 */
export default function StopActions({ lat, lng, type, url }: StopActionsProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-1.5">
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-primary px-3 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-gray-800"
      >
        🚗 {strings.today.navigateNow}
      </a>

      <button
        onClick={() => setShowMore(!showMore)}
        aria-expanded={showMore}
        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
      >
        {showMore ? '✕' : '⋯'}
      </button>

      {showMore && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-gray-50 p-2">
          <a
            href={buildMapyCzUrl(lat, lng, type)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-green-700 hover:underline"
          >
            🥾 {strings.map.navigateHike} ↗
          </a>
          <a
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            📷 {strings.map.viewEntrance} ↗
          </a>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              🌐 {strings.map.website} ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

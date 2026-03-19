'use client';

import { itinerary, days } from '@/lib/itinerary';
import { TYPE_COLORS, TYPE_EMOJI, type LocationType } from '@/lib/types';

export default function DayTimeline() {
  const grouped: Record<number, typeof itinerary.locations> = {};
  for (const loc of itinerary.locations) {
    if (!grouped[loc.day]) grouped[loc.day] = [];
    grouped[loc.day].push(loc);
  }

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <div key={day} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
            {day}
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {grouped[day].map((loc, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: TYPE_COLORS[loc.type].bg,
                  color: TYPE_COLORS[loc.type].text,
                }}
              >
                <span>{TYPE_EMOJI[loc.type]}</span>
                <span className="max-w-[160px] truncate">{loc.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

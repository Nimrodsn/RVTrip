'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { itinerary, days } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import DayTimeline from '@/components/DayTimeline';
import HomeMapPreview from '@/components/HomeMapPreview';

const CHECKLIST_KEYS = [
  'roofHatch', 'stepRetracted', 'gasOff', 'cabinetsLocked',
  'greyWaterEmpty', 'waterFull', 'fridgeOk', 'tiresOk',
];

const quickNav = [
  { href: '/today', emoji: '📋', label: strings.home.todayPlan },
  { href: '/weather', emoji: '🌤️', label: strings.home.weather },
  { href: '/budget', emoji: '💰', label: strings.home.budget },
  { href: '/journal', emoji: '📸', label: strings.home.journal },
  { href: '/documents', emoji: '📎', label: strings.home.documents },
  { href: '/checklist', emoji: '✅', label: strings.home.preFlight },
];

export default function HomePage() {
  const [checklistDone, setChecklistDone] = useState(0);

  useEffect(() => {
    supabase
      .from('checklist')
      .select('checked')
      .eq('checked', true)
      .then(({ data }) => setChecklistDone(data?.length ?? 0));
  }, []);

  const allDone = checklistDone >= CHECKLIST_KEYS.length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary">{strings.home.title}</h1>
        <p className="text-lg text-gray-600 mt-1">{itinerary.trip_name}</p>
        <p className="text-sm text-gray-400 mt-1">
          {strings.home.rvSpecs}: {itinerary.rv_specs.height}m גובה, {itinerary.rv_specs.weight}t משקל
        </p>
      </div>

      {/* Checklist Banner */}
      <Link
        href="/checklist"
        className={`block rounded-xl p-4 text-center font-bold border ${
          allDone
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-orange-50 border-orange-200 text-orange-800'
        }`}
      >
        {allDone
          ? `✅ ${strings.home.checklistOk}`
          : `⚠️ ${strings.home.checklistWarning} (${checklistDone}/${CHECKLIST_KEYS.length})`}
      </Link>

      {/* Map Preview */}
      <HomeMapPreview />

      {/* Quick Nav Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="text-sm font-bold text-primary">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Trip Overview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-primary mb-4">{strings.home.tripOverview}</h2>
        <div className="flex gap-6 mb-6 text-sm text-gray-500">
          <span>{days.length} {strings.home.days}</span>
          <span>{itinerary.locations.length} {strings.home.stops}</span>
          <span>📅 {itinerary.start_date}</span>
        </div>
        <DayTimeline />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Link
          href="/map"
          className="block text-center py-4 px-8 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors"
        >
          {strings.home.map}
        </Link>
        <Link
          href="/commander"
          className="block text-center py-4 px-8 bg-gray-100 text-primary rounded-xl font-semibold text-lg border-2 border-gray-200 hover:bg-gray-200 transition-colors"
        >
          {strings.home.commander}
        </Link>
      </div>
    </div>
  );
}

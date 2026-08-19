'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { itinerary, days, getTripDateRange } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import DayTimeline from '@/components/DayTimeline';
import HomeMapPreview from '@/components/HomeMapPreview';
import PageHeader from '@/components/PageHeader';
import TodayAtGlance from '@/components/TodayAtGlance';
import Reveal from '@/components/ui/Reveal';
import SpotlightTile from '@/components/ui/SpotlightTile';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import Card from '@/components/ui/Card';
import HighlightBanner from '@/components/ui/HighlightBanner';
import StaggerList from '@/components/ui/StaggerList';
import { buttonClasses } from '@/components/ui/Button';

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
  { href: '/notes', emoji: '📝', label: strings.home.notes },
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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={strings.home.title}
        subtitle={itinerary.trip_name}
        meta={`${strings.home.rvSpecs}: ${itinerary.rv_specs.height}m גובה, ${itinerary.rv_specs.weight}t משקל`}
      />

      <Reveal delay={80}>
        <TodayAtGlance />
      </Reveal>

      <Reveal delay={120}>
        <HighlightBanner
          as={Link}
          href="/checklist"
          tone={allDone ? 'green' : 'orange'}
          contentClassName="p-4 text-center font-bold transition-colors hover:brightness-95"
        >
          {allDone ? (
            `✅ ${strings.home.checklistOk}`
          ) : (
            <>
              ⚠️ {strings.home.checklistWarning} (
              <AnimatedNumber value={checklistDone} />/{CHECKLIST_KEYS.length})
            </>
          )}
        </HighlightBanner>
      </Reveal>

      <Reveal delay={160}>
        <HomeMapPreview />
      </Reveal>

      <StaggerList className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickNav.map((item) => (
          <SpotlightTile key={item.href} className="h-full">
            <Link
              href={item.href}
              className="flex flex-col items-center gap-2 p-6 rounded-xl transition-transform hover:-translate-y-0.5"
            >
              <span className="text-3xl" aria-hidden>{item.emoji}</span>
              <span className="text-sm font-bold text-primary text-center">{item.label}</span>
            </Link>
          </SpotlightTile>
        ))}
      </StaggerList>

      <Reveal>
        <Card className="p-6">
          <h2 className="text-lg font-bold text-primary mb-4">{strings.home.tripOverview}</h2>
          <div className="flex gap-6 mb-6 text-sm text-gray-500">
            <span>{days.length} {strings.home.days}</span>
            <span>{itinerary.locations.length} {strings.home.stops}</span>
            <span>📅 {getTripDateRange()}</span>
          </div>
          <DayTimeline />
        </Card>
      </Reveal>

      <Reveal>
        <div className="flex flex-col gap-3">
          <Link href="/map" className={buttonClasses({ size: 'lg', className: 'w-full rounded-xl' })}>
            {strings.home.map}
          </Link>
          <Link
            href="/commander"
            className={buttonClasses({ variant: 'outline', size: 'lg', className: 'w-full rounded-xl' })}
          >
            {strings.home.commander}
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

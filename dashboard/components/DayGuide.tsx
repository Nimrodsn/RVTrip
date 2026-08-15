'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Reveal from '@/components/ui/Reveal';
import AccordionSection from '@/components/ui/AccordionSection';
import { strings } from '@/lib/strings';
import type { DayGuide as DayGuideData, DayTheme } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Written as literal class strings so Tailwind keeps gradients that are only picked at runtime. */
const THEME_GRADIENT: Record<DayTheme, string> = {
  rock: 'from-stone-400 via-stone-500 to-stone-700',
  water: 'from-sky-400 via-sky-500 to-blue-700',
  cave: 'from-slate-500 via-slate-700 to-slate-900',
  forest: 'from-emerald-400 via-emerald-600 to-green-800',
  city: 'from-amber-400 via-orange-500 to-orange-700',
  road: 'from-indigo-400 via-indigo-500 to-indigo-800',
};

interface DayGuideProps {
  guide: DayGuideData;
  className?: string;
}

/** The story of one trip day: what you do, where you sleep, and what to know beforehand. */
export default function DayGuide({ guide, className }: DayGuideProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(guide.image) && !imageFailed;

  return (
    <Reveal duration={400} className={className}>
      <Card className="overflow-hidden">
        <div className={cn('day-guide-hero relative h-36 bg-gradient-to-br sm:h-44', THEME_GRADIENT[guide.theme])}>
          {showImage && guide.image && (
            <img
              src={guide.image.src}
              alt={guide.image.alt}
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* Keeps the white text legible over both a photo and the lighter gradients. */}
          <div className="day-guide-scrim absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                {strings.budget.day} {guide.day}
              </span>
              <span className="text-3xl drop-shadow-md" aria-hidden>
                {guide.icon}
              </span>
            </div>
            <h2 className="text-lg font-bold leading-snug text-white drop-shadow-md sm:text-xl">
              {guide.title}
            </h2>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {guide.drive && (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
              🛣️ {strings.today.driveToday}: {guide.drive}
            </p>
          )}

          <section>
            <h3 className="mb-2 text-sm font-bold text-primary">🎯 {strings.today.whatToDo}</h3>
            <ul className="space-y-2">
              {guide.doing.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-gray-700">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <h3 className="mb-1 text-sm font-bold text-primary">🛏️ {strings.today.whereToSleep}</h3>
            <p className="text-sm leading-relaxed text-gray-700">{guide.sleeping}</p>
          </section>

          {guide.image?.credit && (
            <p className="text-[11px] text-gray-400">{guide.image.credit}</p>
          )}
        </div>
      </Card>

      <AccordionSection
        title={`💡 ${strings.today.goodToKnow}`}
        meta={<span className="text-xs font-medium text-gray-400">{guide.knowBefore.length}</span>}
        className="mt-3"
      >
        <ul className="space-y-2">
          {guide.knowBefore.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-gray-700">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </AccordionSection>
    </Reveal>
  );
}

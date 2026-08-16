'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Reveal from '@/components/ui/Reveal';
import AccordionSection from '@/components/ui/AccordionSection';
import { strings } from '@/lib/strings';
import type { DayGuide as DayGuideData, DayTheme } from '@/lib/types';
import { cn } from '@/lib/utils';

export const GUIDE_SECTION_IDS = ['doing', 'sleeping', 'knowBefore'] as const;

export type GuideSection = (typeof GUIDE_SECTION_IDS)[number];
export type GuideSectionState = Record<GuideSection, boolean>;

/** Matches how the guide first shipped: the day is readable at a glance, the tips are opt-in. */
export const DEFAULT_GUIDE_SECTIONS: GuideSectionState = {
  doing: true,
  sleeping: true,
  knowBefore: false,
};

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
  /** Owned by the page so the choice survives switching days, which remounts this component. */
  openSections: GuideSectionState;
  onToggleSection: (section: GuideSection) => void;
  onSetAllSections: (open: boolean) => void;
  className?: string;
}

/** The story of one trip day: what you do, where you sleep, and what to know beforehand. */
export default function DayGuide({
  guide,
  openSections,
  onToggleSection,
  onSetAllSections,
  className,
}: DayGuideProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(guide.image) && !imageFailed;
  const allOpen = GUIDE_SECTION_IDS.every((id) => openSections[id]);
  const allClosed = GUIDE_SECTION_IDS.every((id) => !openSections[id]);

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

        <div className="flex flex-wrap items-center gap-3 p-4">
          {guide.drive && (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
              🛣️ {strings.today.driveToday}: {guide.drive}
            </p>
          )}
          {/* ms-auto keeps the buttons at the inline end whether or not the drive badge is there. */}
          <div className="flex gap-2 ms-auto">
            <Button size="sm" variant="secondary" onClick={() => onSetAllSections(true)} disabled={allOpen}>
              {strings.today.expandAll}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onSetAllSections(false)} disabled={allClosed}>
              {strings.today.collapseAll}
            </Button>
          </div>
        </div>
      </Card>

      {/* Siblings rather than nested, because AccordionSection carries its own card surface. */}
      <div className="mt-3 space-y-3">
        <AccordionSection
          title={`🎯 ${strings.today.whatToDo}`}
          meta={<span className="text-xs font-medium text-gray-400">{guide.doing.length}</span>}
          open={openSections.doing}
          onOpenChange={() => onToggleSection('doing')}
        >
          <ul className="space-y-2">
            {guide.doing.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-gray-700">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </AccordionSection>

        <AccordionSection
          title={`🛏️ ${strings.today.whereToSleep}`}
          open={openSections.sleeping}
          onOpenChange={() => onToggleSection('sleeping')}
        >
          <p className="text-sm leading-relaxed text-gray-700">{guide.sleeping}</p>
        </AccordionSection>

        <AccordionSection
          title={`💡 ${strings.today.goodToKnow}`}
          meta={<span className="text-xs font-medium text-gray-400">{guide.knowBefore.length}</span>}
          open={openSections.knowBefore}
          onOpenChange={() => onToggleSection('knowBefore')}
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
      </div>

      {guide.image?.credit && (
        <p className="mt-2 text-[11px] text-gray-400">{guide.image.credit}</p>
      )}
    </Reveal>
  );
}

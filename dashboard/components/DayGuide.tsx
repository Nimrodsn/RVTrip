'use client';

import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import Card from '@/components/ui/Card';
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
  /** Owned by the page, which closes the other days when one is opened. */
  open: boolean;
  onToggle: () => void;
  /** The day the stops list below is showing, marked so the pairing stays obvious. */
  active?: boolean;
  className?: string;
}

/** The story of one trip day, collapsed to its header until it is opened. */
export default function DayGuide({ guide, open, onToggle, active = false, className }: DayGuideProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const motionEnabled = useMotionEnabled();
  const panelId = useId();
  const showImage = Boolean(guide.image) && !imageFailed;

  return (
    <Card className={cn('overflow-hidden', active && 'ring-2 ring-primary/30', className)}>
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'day-guide-hero relative block h-36 w-full bg-gradient-to-br text-start sm:h-44',
            THEME_GRADIENT[guide.theme]
          )}
        >
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
              <span className="flex items-center gap-2">
                <span className="text-3xl drop-shadow-md" aria-hidden>
                  {guide.icon}
                </span>
                <span
                  className={cn('text-xl text-white drop-shadow-md transition-transform', open && 'rotate-180')}
                  aria-hidden
                >
                  ▾
                </span>
              </span>
            </div>
            <span className="text-lg font-bold leading-snug text-white drop-shadow-md sm:text-xl">
              {guide.title}
            </span>
          </div>
        </button>
      </h2>

      {/* Outside the panel, so the list still answers "how far do we drive" while collapsed. */}
      {guide.drive && (
        <p className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-gray-600">
          🛣️ {strings.today.driveToday}: {guide.drive}
        </p>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            data-motion=""
            initial={motionEnabled ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: motionEnabled ? 0.25 : 0, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              <section className="p-4">
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

              <section className="p-4">
                <h3 className="mb-2 text-sm font-bold text-primary">🛏️ {strings.today.whereToSleep}</h3>
                <p className="text-sm leading-relaxed text-gray-700">{guide.sleeping}</p>
              </section>

              <section className="p-4">
                <h3 className="mb-2 text-sm font-bold text-primary">💡 {strings.today.goodToKnow}</h3>
                <ul className="space-y-2">
                  {guide.knowBefore.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-gray-700">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {guide.image?.credit && (
              <p className="px-4 pb-3 text-[11px] text-gray-400">{guide.image.credit}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

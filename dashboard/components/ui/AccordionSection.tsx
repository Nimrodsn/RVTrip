'use client';

import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import { CARD_SURFACE } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface AccordionSectionProps {
  title: ReactNode;
  /** Shown next to the chevron, for status such as a live-rate badge or a count. */
  meta?: ReactNode;
  /** Starting state when the panel manages itself. Ignored once `open` is passed. */
  defaultOpen?: boolean;
  /** Hand control to the parent, for cases like an expand-all button driving several panels. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Collapsible panel that keeps secondary tools out of the way until they are needed. */
export default function AccordionSection({
  title,
  meta,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  contentClassName,
}: AccordionSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const motionEnabled = useMotionEnabled();
  const panelId = useId();

  function toggle() {
    const next = !open;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div className={cn(CARD_SURFACE, 'overflow-hidden', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center justify-between gap-3 p-4 text-sm font-bold text-primary transition-colors hover:bg-gray-50"
      >
        <span>{title}</span>
        <span className="flex items-center gap-2">
          {meta}
          <span className={cn('transition-transform', open && 'rotate-180')} aria-hidden>
            ▾
          </span>
        </span>
      </button>

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
            <div className={cn('border-t border-gray-100 p-4', contentClassName)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

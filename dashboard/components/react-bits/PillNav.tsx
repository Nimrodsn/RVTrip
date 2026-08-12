'use client';

import { motion } from 'motion/react';

/**
 * Adapted from React Bits "Pill Nav" (https://reactbits.dev/components/pill-nav).
 * Upstream drives router links via react-router-dom; this version selects a value instead,
 * so it can act as the day picker. The sliding highlight uses a shared layout animation,
 * which stays correct under RTL.
 */

interface PillNavItem<T> {
  value: T;
  label: string;
}

const SIZES = {
  sm: 'min-h-9 px-3.5 text-xs',
  md: 'min-h-11 px-4 text-sm',
} as const;

interface PillNavProps<T extends string | number> {
  items: PillNavItem<T>[];
  activeValue: T;
  onChange: (value: T) => void;
  layoutId: string;
  animated?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
  ariaLabel?: string;
}

export default function PillNav<T extends string | number>({
  items,
  activeValue,
  onChange,
  layoutId,
  animated = true,
  size = 'md',
  className = '',
  ariaLabel,
}: PillNavProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => {
        const isActive = item.value === activeValue;

        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={`relative inline-flex items-center justify-center rounded-full py-2 font-bold transition-colors ${
              SIZES[size]
            } ${isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {isActive &&
              (animated ? (
                <motion.span
                  layoutId={layoutId}
                  data-motion=""
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-full bg-primary" />
              ))}
            <span className="relative z-10 whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

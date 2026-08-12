'use client';

import type { ElementType, ReactNode } from 'react';
import StarBorder from '@/components/react-bits/StarBorder';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import { cn } from '@/lib/utils';

export type BannerTone = 'amber' | 'green' | 'orange' | 'red' | 'blue';

const TONES: Record<BannerTone, { star: string; surface: string }> = {
  amber: { star: '#f59e0b', surface: 'bg-amber-50 text-amber-900' },
  green: { star: '#22c55e', surface: 'bg-green-50 text-green-800' },
  orange: { star: '#f97316', surface: 'bg-orange-50 text-orange-800' },
  red: { star: '#ef4444', surface: 'bg-red-600 text-white' },
  blue: { star: '#3b82f6', surface: 'bg-blue-50 text-blue-800' },
};

interface HighlightBannerProps {
  children: ReactNode;
  tone?: BannerTone;
  as?: ElementType;
  className?: string;
  contentClassName?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Draws attention to the things that matter mid-trip — an incomplete departure checklist, the SOS
 * button, the currency warning — with a travelling star border that stops in driving mode.
 */
export default function HighlightBanner({
  children,
  tone = 'amber',
  as = 'div',
  className,
  contentClassName,
  ...rest
}: HighlightBannerProps) {
  const motionEnabled = useMotionEnabled();
  const { star, surface } = TONES[tone];
  const content = cn(surface, contentClassName);

  if (!motionEnabled) {
    const Component = as;
    return (
      <Component className={cn('block rounded-xl', className)} {...rest}>
        <div className={cn('rounded-xl', content)}>{children}</div>
      </Component>
    );
  }

  return (
    <StarBorder as={as} color={star} speed="5s" className={className} contentClassName={content} {...rest}>
      {children}
    </StarBorder>
  );
}

'use client';

import type { ReactNode } from 'react';
import FadeContent from '@/components/react-bits/FadeContent';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import { cn } from '@/lib/utils';

/** The scrollable element in app/layout.tsx; ScrollTrigger needs it to measure correctly. */
const SCROLL_CONTAINER = '#app-scroll';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  blur?: boolean;
  className?: string;
}

export default function Reveal({ children, delay = 0, duration = 600, blur = false, className }: RevealProps) {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <FadeContent
      container={SCROLL_CONTAINER}
      delay={delay}
      duration={duration}
      blur={blur}
      threshold={0.05}
      className={cn('rb-motion', className)}
    >
      {children}
    </FadeContent>
  );
}

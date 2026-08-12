'use client';

import type { ReactNode } from 'react';
import GlareHover from '@/components/react-bits/GlareHover';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import { cn } from '@/lib/utils';

interface GlareCardProps {
  children: ReactNode;
  className?: string;
  glareColor?: string;
  glareOpacity?: number;
}

/**
 * Sweeps a light glare across its content on hover. Purely the effect: the surface itself
 * (background, border, padding) comes from className so it can wrap any existing card.
 */
export default function GlareCard({ children, className, glareColor = '#93c5fd', glareOpacity = 0.35 }: GlareCardProps) {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <GlareHover className={cn('glare-card', className)} glareColor={glareColor} glareOpacity={glareOpacity}>
      {children}
    </GlareHover>
  );
}

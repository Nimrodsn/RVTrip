'use client';

import type { ReactNode } from 'react';
import SpotlightCard from '@/components/react-bits/SpotlightCard';
import { CARD_SURFACE } from '@/components/ui/Card';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import { cn } from '@/lib/utils';

interface SpotlightTileProps {
  children: ReactNode;
  className?: string;
}

/** Card that lights up under the cursor, for the tiles a user is choosing between. */
export default function SpotlightTile({ children, className }: SpotlightTileProps) {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return <div className={cn(CARD_SURFACE, className)}>{children}</div>;
  }

  return <SpotlightCard className={cn('spotlight-card', CARD_SURFACE, className)}>{children}</SpotlightCard>;
}

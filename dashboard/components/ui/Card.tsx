import type { ReactNode } from 'react';
import GlareCard from '@/components/ui/GlareCard';
import { cn } from '@/lib/utils';

export const CARD_SURFACE = 'rounded-xl border border-gray-100 bg-white shadow-sm';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds the hover glare sweep, for cards that represent something the user can act on. */
  interactive?: boolean;
}

/** The single white card surface used across the dashboard. */
export default function Card({ children, className, interactive = false }: CardProps) {
  if (interactive) {
    return <GlareCard className={cn(CARD_SURFACE, className)}>{children}</GlareCard>;
  }

  return <div className={cn(CARD_SURFACE, className)}>{children}</div>;
}

import { CARD_SURFACE } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-200', className)} />;
}

/** Placeholder rows sized like the card lists used across the dashboard. */
export function SkeletonCards({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(CARD_SURFACE, 'p-4')}>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

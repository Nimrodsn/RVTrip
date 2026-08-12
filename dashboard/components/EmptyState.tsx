import type { ReactNode } from 'react';
import Reveal from '@/components/ui/Reveal';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <Reveal duration={350}>
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="text-5xl" aria-hidden>
          {emoji}
        </span>
        <p className="text-lg font-bold text-primary">{title}</p>
        {description && <p className="max-w-sm text-sm leading-relaxed text-gray-500">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </Reveal>
  );
}

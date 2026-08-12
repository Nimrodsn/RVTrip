import type { ReactNode } from 'react';
import AnimatedTitle from '@/components/ui/AnimatedTitle';
import Reveal from '@/components/ui/Reveal';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, meta, action }: PageHeaderProps) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <AnimatedTitle text={title} className="text-2xl font-extrabold text-primary md:text-3xl" />
          {subtitle && <p className="text-base md:text-lg text-gray-600 mt-1">{subtitle}</p>}
          {meta && <p className="text-sm text-gray-400 mt-1">{meta}</p>}
        </div>
        {action}
      </div>
    </Reveal>
  );
}

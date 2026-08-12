'use client';

import AnimatedNumber from '@/components/ui/AnimatedNumber';
import Card from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  emphasis?: boolean;
  className?: string;
}

export default function StatCard({
  label,
  value,
  decimals = 0,
  prefix,
  suffix,
  emphasis = false,
  className,
}: StatCardProps) {
  return (
    <Card interactive className={cn('p-4', className)}>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className={cn('mt-1 font-extrabold', emphasis ? 'text-2xl text-primary' : 'text-xl text-gray-800')}>
        {prefix && <span className="text-sm font-bold text-gray-400">{prefix} </span>}
        <AnimatedNumber value={value} decimals={decimals} />
        {suffix && <span className="text-sm font-bold text-gray-400"> {suffix}</span>}
      </p>
    </Card>
  );
}

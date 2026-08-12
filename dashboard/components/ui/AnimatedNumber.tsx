'use client';

import CountUp from '@/components/react-bits/CountUp';
import { useMotionEnabled } from '@/lib/useMotionEnabled';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  separator?: string;
  className?: string;
}

/** Counts up to a value, or prints it directly when motion is off. */
export default function AnimatedNumber({ value, decimals = 0, separator = ',', className }: AnimatedNumberProps) {
  const motionEnabled = useMotionEnabled();
  const rounded = Number(value.toFixed(decimals));

  if (!motionEnabled) {
    return <span className={className}>{rounded.toLocaleString('en-US', { minimumFractionDigits: decimals })}</span>;
  }

  return <CountUp to={rounded} duration={1.2} separator={separator} className={className} />;
}

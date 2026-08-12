'use client';

import type { ElementType } from 'react';
import BlurText from '@/components/react-bits/BlurText';
import { useMotionEnabled } from '@/lib/useMotionEnabled';

interface AnimatedTitleProps {
  text: string;
  as?: ElementType;
  className?: string;
}

/** Resolves a title out of a soft blur, or prints it directly when motion is off. */
export default function AnimatedTitle({ text, as = 'h1', className }: AnimatedTitleProps) {
  const motionEnabled = useMotionEnabled();
  const Component = as;

  if (!motionEnabled) {
    return <Component className={className}>{text}</Component>;
  }

  return <BlurText text={text} as={as} className={className} delay={60} stepDuration={0.3} />;
}

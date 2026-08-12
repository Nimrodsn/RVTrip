'use client';

import { Children, type ReactNode } from 'react';
import AnimatedList, { type ListTag } from '@/components/react-bits/AnimatedList';
import { useMotionEnabled } from '@/lib/useMotionEnabled';

interface StaggerListProps {
  children: ReactNode;
  /** With 'ul', each child is wrapped in its own <li>. */
  as?: ListTag;
  className?: string;
  itemClassName?: string;
}

export default function StaggerList({ children, as = 'div', className, itemClassName }: StaggerListProps) {
  const motionEnabled = useMotionEnabled();

  if (motionEnabled) {
    return (
      <AnimatedList as={as} className={className} itemClassName={itemClassName}>
        {children}
      </AnimatedList>
    );
  }

  if (as === 'ul') {
    return (
      <ul className={className}>
        {Children.toArray(children).map((child, index) => (
          <li key={index} className={itemClassName}>
            {child}
          </li>
        ))}
      </ul>
    );
  }

  return <div className={className}>{children}</div>;
}

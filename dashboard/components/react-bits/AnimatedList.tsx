'use client';

import { Children, useRef, type ReactNode } from 'react';
import { motion, useInView } from 'motion/react';

/**
 * Adapted from React Bits "Animated List" (https://reactbits.dev/components/animated-list).
 * The upstream component renders a fixed-width dark list of strings; this version keeps the
 * same in-view scale/fade motion but wraps arbitrary children so it can animate the
 * itinerary, expense and forecast cards this app already renders.
 */

const MAX_STAGGER_STEPS = 8;

/** `ul` keeps list semantics for content that really is a list, such as the trip tips. */
export type ListTag = 'div' | 'ul';

const MOTION_ITEM = { div: motion.div, ul: motion.li } as const;

interface AnimatedItemProps {
  children: ReactNode;
  index: number;
  tag: ListTag;
  className?: string;
}

export function AnimatedItem({ children, index, tag, className = '' }: AnimatedItemProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: true });
  const delay = Math.min(index, MAX_STAGGER_STEPS) * 0.05;
  const Item = MOTION_ITEM[tag];

  return (
    <Item
      ref={ref as never}
      data-index={index}
      data-motion=""
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </Item>
  );
}

interface AnimatedListProps {
  children: ReactNode;
  as?: ListTag;
  className?: string;
  itemClassName?: string;
}

export default function AnimatedList({ children, as = 'div', className = '', itemClassName = '' }: AnimatedListProps) {
  const Container = as;

  return (
    <Container className={className}>
      {Children.toArray(children).map((child, index) => (
        <AnimatedItem key={index} index={index} tag={as} className={itemClassName}>
          {child}
        </AnimatedItem>
      ))}
    </Container>
  );
}

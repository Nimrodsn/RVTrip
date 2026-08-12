'use client';

import PillNav from '@/components/react-bits/PillNav';
import { useMotionEnabled } from '@/lib/useMotionEnabled';

interface FilterPillsProps<T extends string | number> {
  items: { value: T; label: string }[];
  activeValue: T;
  onChange: (value: T) => void;
  layoutId: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

/** Single-select pill row used for the day picker and the document/map filters. */
export default function FilterPills<T extends string | number>({
  items,
  activeValue,
  onChange,
  layoutId,
  size,
  ariaLabel,
  className,
}: FilterPillsProps<T>) {
  const motionEnabled = useMotionEnabled();

  return (
    <PillNav
      items={items}
      activeValue={activeValue}
      onChange={onChange}
      layoutId={layoutId}
      animated={motionEnabled}
      size={size}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}

'use client';

import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Adapted from React Bits "Star Border" (https://reactbits.dev/animations/star-border).
 * Upstream hard-codes a dark gradient pill and defaults to a <button>; this version exposes the
 * inner surface through contentClassName so trip alerts keep their light amber/green/red palette,
 * and renders a <div> by default so it can also wrap links and non-interactive banners.
 * Requires the star-movement keyframes registered in tailwind.config.ts.
 */

interface StarBorderProps {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  color?: string;
  speed?: CSSProperties['animationDuration'];
  thickness?: number;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export default function StarBorder({
  as,
  children,
  className = '',
  contentClassName = '',
  color = 'white',
  speed = '6s',
  thickness = 2,
  ...rest
}: StarBorderProps) {
  const Component = as || 'div';

  return (
    <Component
      className={`relative block overflow-hidden rounded-xl ${className}`}
      style={{ padding: `${thickness}px 0` }}
      {...rest}
    >
      <span
        data-motion=""
        aria-hidden
        className="absolute bottom-[-11px] right-[-250%] z-0 h-1/2 w-[300%] animate-star-movement-bottom rounded-full opacity-70"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <span
        data-motion=""
        aria-hidden
        className="absolute left-[-250%] top-[-10px] z-0 h-1/2 w-[300%] animate-star-movement-top rounded-full opacity-70"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <div className={`relative z-10 rounded-xl ${contentClassName}`}>{children}</div>
    </Component>
  );
}

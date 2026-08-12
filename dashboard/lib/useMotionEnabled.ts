'use client';

import { useEffect, useState } from 'react';
import { useDrivingMode } from './DrivingModeContext';

/**
 * Decorative motion is suppressed while driving so the UI stays readable at a glance,
 * and whenever the OS asks for reduced motion.
 */
export function useMotionEnabled() {
  const { drivingMode } = useDrivingMode();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return !drivingMode && !reducedMotion;
}

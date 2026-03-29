'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface DrivingModeContextValue {
  drivingMode: boolean;
  toggleDrivingMode: () => void;
}

const DrivingModeContext = createContext<DrivingModeContextValue>({
  drivingMode: false,
  toggleDrivingMode: () => {},
});

const STORAGE_KEY = 'driving-mode';

export function DrivingModeProvider({ children }: { children: ReactNode }) {
  const [drivingMode, setDrivingMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setDrivingMode(true);
      document.documentElement.classList.add('driving-mode');
    }
  }, []);

  function toggleDrivingMode() {
    setDrivingMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('driving-mode');
      } else {
        document.documentElement.classList.remove('driving-mode');
      }
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <DrivingModeContext.Provider value={{ drivingMode, toggleDrivingMode }}>
      {children}
    </DrivingModeContext.Provider>
  );
}

export function useDrivingMode() {
  return useContext(DrivingModeContext);
}

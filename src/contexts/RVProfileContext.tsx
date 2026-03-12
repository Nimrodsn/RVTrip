import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface RVProfileState {
  height: number; // meters
  width: number;  // meters
  weight: number; // tons
}

const DEFAULT_RV_PROFILE: RVProfileState = {
  height: 3.2,
  width: 2.5,
  weight: 3.5,
};

interface RVProfileContextValue extends RVProfileState {
  setHeight: (h: number) => void;
  setWidth: (w: number) => void;
  setWeight: (w: number) => void;
  setProfile: (p: Partial<RVProfileState>) => void;
}

const RVProfileContext = createContext<RVProfileContextValue | null>(null);

export function RVProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<RVProfileState>(DEFAULT_RV_PROFILE);

  const setHeight = useCallback((height: number) => {
    setProfileState((prev) => ({ ...prev, height }));
  }, []);
  const setWidth = useCallback((width: number) => {
    setProfileState((prev) => ({ ...prev, width }));
  }, []);
  const setWeight = useCallback((weight: number) => {
    setProfileState((prev) => ({ ...prev, weight }));
  }, []);
  const setProfile = useCallback((p: Partial<RVProfileState>) => {
    setProfileState((prev) => ({ ...prev, ...p }));
  }, []);

  const value: RVProfileContextValue = {
    ...profile,
    setHeight,
    setWidth,
    setWeight,
    setProfile,
  };

  return (
    <RVProfileContext.Provider value={value}>
      {children}
    </RVProfileContext.Provider>
  );
}

export function useRVProfile(): RVProfileContextValue {
  const ctx = useContext(RVProfileContext);
  if (!ctx) throw new Error('useRVProfile must be used within RVProfileProvider');
  return ctx;
}

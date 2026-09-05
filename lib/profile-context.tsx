"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_PROFILE, PROFILE_STORAGE_KEY } from "@/lib/constants";
import type { CulturalProfile } from "@/lib/types";

interface ProfileContextValue {
  profile: CulturalProfile;
  setProfile: (profile: CulturalProfile) => void;
  /** True once the visitor has finished the onboarding flow. */
  isCustomized: boolean;
  markCustomized: () => void;
  resetProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readProfile(): CulturalProfile {
  if (typeof window === "undefined") return DEMO_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEMO_PROFILE;
    return { ...DEMO_PROFILE, ...JSON.parse(raw) } as CulturalProfile;
  } catch {
    return DEMO_PROFILE;
  }
}

function readCustomized(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("my-people:customized") === "1";
  } catch {
    return false;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<CulturalProfile>(readProfile);
  const [isCustomized, setCustomized] = useState<boolean>(readCustomized);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* storage unavailable — profile still works in memory */
    }
  }, [profile]);

  const setProfile = useCallback((next: CulturalProfile) => {
    setProfileState(next);
  }, []);

  const markCustomized = useCallback(() => {
    setCustomized(true);
    try {
      window.localStorage.setItem("my-people:customized", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const resetProfile = useCallback(() => {
    setProfileState(DEMO_PROFILE);
    setCustomized(false);
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      window.localStorage.removeItem("my-people:customized");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ profile, setProfile, isCustomized, markCustomized, resetProfile }),
    [profile, setProfile, isCustomized, markCustomized, resetProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
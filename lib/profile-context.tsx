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
import {
  DEMO_PROFILE,
  PROFILE_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
} from "@/lib/constants";
import {
  UNKNOWN_USER,
  createLearningProgress,
  emptyUserProfile,
} from "@/lib/types";
import type {
  CultureBankCategory,
  CultureBankItem,
  FamilyDiscovery,
  LearnedConcept,
  LearningProgress,
  PracticedConcept,
  QuizAttempt,
  UserProfile,
} from "@/lib/types";

/**
 * Onboarding answers gathered in Screen 2. `createProfile` persists them as a
 * UserProfile and seeds a fresh LearningProgress at day 1.
 */
export interface OnboardingAnswers {
  location: UserProfile["location"];
  culturalConnectionLevel: UserProfile["culturalConnectionLevel"];
  familyKnowledgeLevel: UserProfile["familyKnowledgeLevel"];
  learningGoals: UserProfile["learningGoals"];
  preferredLearningStyle: UserProfile["preferredLearningStyle"];
}

interface ProfileContextValue {
  profile: UserProfile | null;
  progress: LearningProgress | null;
  isCustomized: boolean;
  /** Current playable day (progress.currentDay). */
  currentDay: number;
  /** Days still ahead of the playable day, desc (0 = journey complete). */
  daysRemaining: number;
  createProfile: (answers: OnboardingAnswers) => void;
  recordLearned: (concept: LearnedConcept) => void;
  recordPractice: (entry: PracticedConcept) => void;
  answerQuiz: (attempt: QuizAttempt) => void;
  updateConfidence: (concept: string, correct: boolean) => void;
  saveFamilyDiscovery: (disc: Omit<FamilyDiscovery, "id" | "createdAt">) => void;
  addBankItems: (items: Omit<CultureBankItem, "id" | "createdAt">[]) => void;
  completeDay: (day: number) => void;
  resetProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — state still works in memory */
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    readJson<UserProfile>(PROFILE_STORAGE_KEY),
  );
  const [progress, setProgress] = useState<LearningProgress | null>(() =>
    readJson<LearningProgress>(PROGRESS_STORAGE_KEY),
  );

  useEffect(() => {
    if (profile) writeJson(PROFILE_STORAGE_KEY, profile);
  }, [profile]);

  useEffect(() => {
    if (progress) writeJson(PROGRESS_STORAGE_KEY, progress);
  }, [progress]);

  const createProfile = useCallback((answers: OnboardingAnswers) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `u-${Date.now()}`;
    const next: UserProfile = {
      ...emptyUserProfile(),
      id,
      ...answers,
      createdAt: Date.now(),
    };
    setProfile(next);
    setProgress(createLearningProgress(id));
  }, []);

  const ensureIds = useCallback(
    (fallback: string) =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${fallback}-${Date.now()}`,
    [],
  );

  const recordLearned = useCallback(
    (concept: LearnedConcept) => {
      setProgress((prev) => {
        if (!prev) return prev;
        if (prev.learnedConcepts.some((c) => c.day === concept.day && c.concept === concept.concept)) {
          return prev;
        }
        return { ...prev, learnedConcepts: [...prev.learnedConcepts, concept] };
      });
    },
    [],
  );

  const recordPractice = useCallback(
    (entry: PracticedConcept) => {
      setProgress((prev) => {
        if (!prev) return prev;
        return { ...prev, practicedConcepts: [...prev.practicedConcepts, entry] };
      });
    },
    [],
  );

  const answerQuiz = useCallback(
    (attempt: QuizAttempt) => {
      setProgress((prev) => {
        if (!prev) return prev;
        const confidenceScores = { ...prev.confidenceScores };
        const cur = confidenceScores[attempt.promptType] ?? 0.5;
        confidenceScores[attempt.promptType] = attempt.correct
          ? Math.min(1, cur + 0.2)
          : Math.max(0, cur - 0.25);
        return {
          ...prev,
          confidenceScores,
          quizResults: [...prev.quizResults, attempt],
        };
      });
    },
    [],
  );

  const updateConfidence = useCallback((concept: string, correct: boolean) => {
    setProgress((prev) => {
      if (!prev) return prev;
      const confidenceScores = { ...prev.confidenceScores };
      const cur = confidenceScores[concept] ?? 0.5;
      confidenceScores[concept] = correct
        ? Math.min(1, cur + 0.15)
        : Math.max(0, cur - 0.2);
      return { ...prev, confidenceScores };
    });
  }, []);

  const saveFamilyDiscovery = useCallback(
    (disc: Omit<FamilyDiscovery, "id" | "createdAt">) => {
      setProgress((prev) => {
        if (!prev) return prev;
        const discovery: FamilyDiscovery = {
          ...disc,
          id: ensureIds("fd"),
          createdAt: Date.now(),
        };
        const item: CultureBankItem = {
          id: ensureIds("bank"),
          category: "family-discovery",
          text: disc.answer,
          detail: disc.question,
          day: disc.day,
          source: "family",
          createdAt: discovery.createdAt,
        };
        return {
          ...prev,
          familyDiscoveries: [...prev.familyDiscoveries, discovery],
          cultureBank: [...prev.cultureBank, item],
        };
      });
    },
    [ensureIds],
  );

  const addBankItems = useCallback(
    (items: Omit<CultureBankItem, "id" | "createdAt">[]) => {
      setProgress((prev) => {
        if (!prev) return prev;
        const now = Date.now();
        const next = items.map((item) => ({
          ...item,
          id: ensureIds("bank"),
          createdAt: now,
        }));
        return { ...prev, cultureBank: [...prev.cultureBank, ...next] };
      });
    },
    [ensureIds],
  );

  const completeDay = useCallback((day: number) => {
    setProgress((prev) => {
      if (!prev) return prev;
      if (prev.completedDays.includes(day)) return prev;
      const completedDays = [...prev.completedDays, day].sort((a, b) => a - b);
      const currentDay = Math.min(7, day + 1);
      return {
        ...prev,
        completedDays,
        currentDay,
      };
    });
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(null);
    setProgress(null);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const currentDay = progress?.currentDay ?? 1;
  const daysRemaining = Math.max(0, 7 - (progress?.completedDays.length ?? 0));

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      progress,
      isCustomized: profile !== null,
      currentDay,
      daysRemaining,
      createProfile,
      recordLearned,
      recordPractice,
      answerQuiz,
      updateConfidence,
      saveFamilyDiscovery,
      addBankItems,
      completeDay,
      resetProfile,
    }),
    [
      profile,
      progress,
      currentDay,
      daysRemaining,
      createProfile,
      recordLearned,
      recordPractice,
      answerQuiz,
      updateConfidence,
      saveFamilyDiscovery,
      addBankItems,
      completeDay,
      resetProfile,
    ],
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

/** All Culture Bank items grouped by category, lower-cased counts. */
export function useCultureBank() {
  const { progress } = useProfile();
  return useMemo(() => {
    const byCategory = new Map<CultureBankCategory, CultureBankItem[]>();
    for (const cat of ["word", "saying", "people", "story", "family-discovery", "insight"] as CultureBankCategory[]) {
      byCategory.set(cat, []);
    }
    for (const item of progress?.cultureBank ?? []) {
      byCategory.get(item.category)?.push(item);
    }
    return { items: progress?.cultureBank ?? [], byCategory };
  }, [progress]);
}

// ─── Demo helpers (kept for the landing screen's "personal starting point") ──

export function demoIdentity(): string {
  const p = DEMO_PROFILE;
  return `Asante · ${p.location} · ${p.language} · ${UNKNOWN_USER}`;
}
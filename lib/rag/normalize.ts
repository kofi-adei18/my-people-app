import type {
  CulturalConnectionLevel,
  CultureBankItem,
  FamilyKnowledgeLevel,
  LearningGoal,
  LearningPreference,
  LearningProgress,
  UserLocation,
  UserProfile,
} from "@/lib/types";
import {
  CULTURAL_CONNECTIONS,
  FAMILY_KNOWLEDGE_LEVELS,
  LEARNING_GOALS,
  LEARNING_PREFERENCES,
  LOCATIONS,
  createLearningProgress,
} from "@/lib/types";

const toChoice = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Best-effort parse of a UserProfile from an untrusted API body. */
export function normalizeProfile(input: unknown): UserProfile {
  const p = (input ?? {}) as Partial<UserProfile>;
  const id = typeof p.id === "string" && p.id ? p.id : "unknown";
  const goals = Array.isArray(p.learningGoals)
    ? p.learningGoals.filter((g): g is LearningGoal =>
        LEARNING_GOALS.includes(g as LearningGoal),
      )
    : [];
  const now = typeof p.createdAt === "number" ? p.createdAt : Date.now();
  return {
    id,
    location: toChoice<UserLocation>(p.location, LOCATIONS, "Other"),
    culturalConnectionLevel: toChoice<CulturalConnectionLevel>(
      p.culturalConnectionLevel,
      CULTURAL_CONNECTIONS,
      "not-sure",
    ),
    familyKnowledgeLevel: toChoice<FamilyKnowledgeLevel>(
      p.familyKnowledgeLevel,
      FAMILY_KNOWLEDGE_LEVELS,
      "not-sure",
    ),
    learningGoals: goals,
    preferredLearningStyle: toChoice<LearningPreference>(
      p.preferredLearningStyle,
      LEARNING_PREFERENCES,
      "bit-of-everything",
    ),
    culturalGroup: "Asante",
    language: "Asante Twi",
    createdAt: now,
  };
}

const asDay = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
};

/** Best-effort parse of LearningProgress from an untrusted API body. */
export function normalizeProgress(input: unknown): LearningProgress {
  const p = (input ?? {}) as Partial<LearningProgress>;
  const userId = typeof p.userId === "string" ? p.userId : "unknown";
  const base = createLearningProgress(userId);

  const completedDays = Array.isArray(p.completedDays)
    ? p.completedDays
        .map(asDay)
        .filter((d): d is number => d !== null)
        .sort((a, b) => a - b)
    : [];

  const clampsDay = (raw: unknown): number => {
    const n = asDay(raw);
    return n === null ? 1 : Math.max(1, Math.min(7, n));
  };
  const currentDay = Math.max(
    1,
    ...completedDays.map((d) => d + 1),
    clampsDay(p.currentDay),
  );

  const cultureBank: CultureBankItem[] = Array.isArray(p.cultureBank)
    ? (p.cultureBank as CultureBankItem[]).filter(
        (it) => it && typeof it.text === "string" && it.category,
      )
    : [];

  return {
    ...base,
    currentDay: Math.min(7, currentDay),
    completedDays,
    learnedConcepts: Array.isArray(p.learnedConcepts) ? p.learnedConcepts : [],
    practicedConcepts: Array.isArray(p.practicedConcepts) ? p.practicedConcepts : [],
    familyQuestions: Array.isArray(p.familyQuestions) ? p.familyQuestions : [],
    familyDiscoveries: Array.isArray(p.familyDiscoveries) ? p.familyDiscoveries : [],
    quizResults: Array.isArray(p.quizResults) ? p.quizResults : [],
    confidenceScores:
      p.confidenceScores && typeof p.confidenceScores === "object"
        ? (p.confidenceScores as Record<string, number>)
        : {},
    cultureBank,
  };
}
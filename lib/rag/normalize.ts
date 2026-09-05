import type { CulturalProfile, Interest, KnowledgeLevel, Language } from "@/lib/types";

const LANGUAGES: Language[] = ["Twi", "Fante", "English / Learning Twi", "Other"];
const LEVELS: KnowledgeLevel[] = ["beginner", "some", "familiar"];
const INTERESTS: Interest[] = [
  "stories",
  "proverbs",
  "names",
  "traditions",
  "history",
  "language",
];

export function normalizeProfile(input: unknown): CulturalProfile {
  const p = (input ?? {}) as Partial<CulturalProfile>;
  return {
    heritage: "Akan",
    language: LANGUAGES.includes(p.language as Language)
      ? (p.language as Language)
      : "Twi",
    knowledgeLevel: LEVELS.includes(p.knowledgeLevel as KnowledgeLevel)
      ? (p.knowledgeLevel as KnowledgeLevel)
      : "beginner",
    interests: Array.isArray(p.interests)
      ? p.interests.filter((i): i is Interest =>
          INTERESTS.includes(i as Interest),
        )
      : [],
  };
}
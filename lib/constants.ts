import type {
  CulturalProfile,
  Interest,
  KnowledgeLevel,
  Language,
  Lesson,
} from "@/lib/types";

export const HERITAGE_OPTIONS = ["Akan"] as const;

export const LANGUAGE_OPTIONS: Language[] = [
  "Twi",
  "Fante",
  "English / Learning Twi",
  "Other",
];

export const KNOWLEDGE_LEVELS: {
  value: KnowledgeLevel;
  label: string;
  blurb: string;
}[] = [
  {
    value: "beginner",
    label: "I'm just starting",
    blurb: "Fresh to the culture — every word is new and welcome.",
  },
  {
    value: "some",
    label: "I know a little",
    blurb: "Bits and pieces from home, school, or visits.",
  },
  {
    value: "familiar",
    label: "I know quite a bit",
    blurb: "Comfortable with the basics, ready to go deeper.",
  },
];

export const INTERESTS: { value: Interest; label: string; blurb: string }[] = [
  { value: "stories", label: "Stories", blurb: "Folktales, myth, oral tradition" },
  { value: "proverbs", label: "Proverbs", blurb: "Wisdom in a few words" },
  { value: "names", label: "Names & family", blurb: "Naming and kinship" },
  { value: "traditions", label: "Traditions", blurb: "Ceremony and custom" },
  { value: "history", label: "History", blurb: "Origins and the past" },
  { value: "language", label: "Language", blurb: "Twi words and usage" },
];

export const LEVEL_LABELS: Record<KnowledgeLevel, string> = {
  beginner: "Just starting",
  some: "A little",
  familiar: "Quite a bit",
};

export const INTEREST_LABELS: Record<Interest, string> = {
  stories: "Stories",
  proverbs: "Proverbs",
  names: "Names & family",
  traditions: "Traditions",
  history: "History",
  language: "Language",
};

export const DEMO_PROFILE: CulturalProfile = {
  heritage: "Akan",
  language: "Twi",
  knowledgeLevel: "beginner",
  interests: ["proverbs", "names", "traditions"],
};

export const LESSONS: Lesson[] = [
  {
    slug: "understanding-your-akan-heritage",
    title: "Understanding Your Akan Heritage",
    description:
      "Meet the Akan world: where it begins, what holds it together, and what heritage actually means.",
  },
  {
    slug: "akan-names-and-family",
    title: "Akan Names & Family",
    description:
      "The naming ceremony, day names, and the bonds that make Akan kinship.",
  },
  {
    slug: "the-wisdom-of-proverbs",
    title: "The Wisdom of Proverbs",
    description:
      "Learn how a few words carry generations of counsel.",
  },
  {
    slug: "traditions-and-ceremonies",
    title: "Traditions & Ceremonies",
    description:
      "The rites and festivals that mark an Akan year.",
  },
  {
    slug: "discover-your-family-story",
    title: "Discover Your Family Story",
    description:
      "Open the door to your own family's history — and the people who keep it.",
  },
];

export const SUGGESTED_QUESTIONS: { label: string; question: string }[] = [
  {
    label: "Why are proverbs important in Akan culture?",
    question: "Why are proverbs important in Akan culture?",
  },
  {
    label: "What does my Akan heritage mean?",
    question: "What does my Akan heritage mean?",
  },
  {
    label: "Why are family and ancestry important?",
    question: "Why are family and ancestry important?",
  },
  {
    label: "Tell me about Akan naming traditions.",
    question: "Tell me about Akan naming traditions.",
  },
  {
    label: "Teach me a Twi word connected to today's lesson.",
    question: "Teach me a Twi word connected to today's lesson.",
  },
];

export const ASK_FAMILY_PROMPT =
  "Ask a parent or grandparent: Where does our family come from, and what traditions did you grow up with?";

export const LEARN_LESSON_STORAGE = "my-people:completed-lessons";
export const PROFILE_STORAGE_KEY = "my-people:profile";
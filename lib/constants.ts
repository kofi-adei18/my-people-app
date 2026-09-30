import type {
  EventType,
  CulturalConnectionLevel,
  FamilyKnowledgeLevel,
  LearningGoal,
  LearningPreference,
  UserLocation,
} from "@/lib/types";

// ─── Onboarding (5 questions, spec §3) ────────────────────────────────────────

export const LOCATION_OPTIONS: { value: UserLocation; label: string; blurb: string }[] = [
  {
    value: "Ghana",
    label: "Ghana",
    blurb: "You're currently immersed in Ghanaian life.",
  },
  {
    value: "United Kingdom",
    label: "United Kingdom",
    blurb: "Living in the UK — learning from abroad.",
  },
  {
    value: "United States",
    label: "United States",
    blurb: "Living in the US — learning from abroad.",
  },
  {
    value: "Canada",
    label: "Canada",
    blurb: "Living in Canada — learning from abroad.",
  },
  {
    value: "Europe",
    label: "Europe",
    blurb: "Somewhere in Europe — learning from abroad.",
  },
  {
    value: "Other",
    label: "Other",
    blurb: "Somewhere else — you'll tell us more.",
  },
];

export const CULTURAL_CONNECTION_OPTIONS: {
  value: CulturalConnectionLevel;
  label: string;
  blurb: string;
}[] = [
  { value: "very", label: "Very connected", blurb: "The culture is a live part of your everyday life." },
  { value: "somewhat", label: "Somewhat connected", blurb: "You feel a real but partial tie to it." },
  { value: "some", label: "I know some things", blurb: "You carry pieces of it, even if unevenly." },
  { value: "barely", label: "I barely know anything", blurb: "The culture feels distant right now." },
  { value: "not-sure", label: "I'm not sure", blurb: "You're still figuring out what it means to you." },
];

export const LEARNING_GOAL_OPTIONS: {
  value: LearningGoal;
  label: string;
  blurb: string;
}[] = [
  { value: "language", label: "Language", blurb: "Asante Twi words and how to use them" },
  { value: "greetings-etiquette", label: "Greetings & etiquette", blurb: "How people greet and show respect" },
  { value: "history", label: "History", blurb: "Where the Asante story comes from" },
  { value: "traditions", label: "Traditions", blurb: "Ceremonies, customs and everyday practice" },
  { value: "family-heritage", label: "Family heritage", blurb: "Your own family's hand in the culture" },
  { value: "stories", label: "Stories", blurb: "The tales and accounts that carry meaning" },
  { value: "names-meanings", label: "Names & meanings", blurb: "Names and what they say about a person" },
  { value: "cultural-events", label: "How to behave at cultural events", blurb: "Feeling confident at gatherings and ceremonies" },
];

export const FAMILY_KNOWLEDGE_OPTIONS: {
  value: FamilyKnowledgeLevel;
  label: string;
  blurb: string;
}[] = [
  { value: "a-lot", label: "A lot", blurb: "You know your family's Asante background well." },
  { value: "some", label: "Some things", blurb: "You know meaningful pieces of it." },
  { value: "very-little", label: "Very little", blurb: "A few fragments, at most." },
  { value: "almost-nothing", label: "Almost nothing", blurb: "There's a gap you'd like to close." },
  { value: "not-sure", label: "I'm not sure", blurb: "You're not ready to say — and that's fine." },
];

export const LEARNING_PREFERENCE_OPTIONS: {
  value: LearningPreference;
  label: string;
  blurb: string;
}[] = [
  { value: "speaking", label: "Speaking the language", blurb: "Words, phrases, pronunciation first." },
  { value: "behavior", label: "Understanding how people behave", blurb: "Etiquette, respect, body language." },
  { value: "history", label: "Understanding history", blurb: "The story behind what people do." },
  { value: "family", label: "Connecting with family", blurb: "Discoveries that involve the people you love." },
  { value: "events", label: "Being confident at cultural events", blurb: "Walking into gatherings and ceremonies ready." },
  { value: "bit-of-everything", label: "A bit of everything", blurb: "All of it, gradually." },
];

export const CONNECTION_LABELS: Record<CulturalConnectionLevel, string> = {
  very: "Very connected",
  somewhat: "Somewhat connected",
  some: "Knows some things",
  barely: "Barely knows anything",
  "not-sure": "Not sure yet",
};

export const FAMILY_KNOWLEDGE_LABELS: Record<FamilyKnowledgeLevel, string> = {
  "a-lot": "A lot",
  some: "Some things",
  "very-little": "Very little",
  "almost-nothing": "Almost nothing",
  "not-sure": "Not sure",
};

export const GOAL_LABELS: Record<LearningGoal, string> = {
  language: "Language",
  "greetings-etiquette": "Greetings & etiquette",
  history: "History",
  traditions: "Traditions",
  "family-heritage": "Family heritage",
  stories: "Stories",
  "names-meanings": "Names & meanings",
  "cultural-events": "How to behave at cultural events",
};

export const PREFERENCE_LABELS: Record<LearningPreference, string> = {
  speaking: "Speaking the language",
  behavior: "How people behave",
  history: "Understanding history",
  family: "Connecting with family",
  events: "Confidence at cultural events",
  "bit-of-everything": "A bit of everything",
};

// ─── Demo seed ────────────────────────────────────────────────────────────────

export const DEMO_PROFILE = {
  id: "demo",
  location: "United Kingdom" as const,
  culturalConnectionLevel: "somewhat" as const,
  familyKnowledgeLevel: "very-little" as const,
  learningGoals: ["greetings-etiquette", "language", "family-heritage"] as const,
  preferredLearningStyle: "bit-of-everything" as const,
  culturalGroup: "Asante" as const,
  language: "Asante Twi" as const,
  createdAt: 0,
};

// ─── Suggested questions for the Ask screen ───────────────────────────────────

export const SUGGESTED_QUESTIONS: { label: string; question: string }[] = [
  {
    label: "Why do greetings matter so much in Asante culture?",
    question: "Why do greetings matter so much in Asante culture?",
  },
  {
    label: "How do I greet an elder respectfully?",
    question: "How do I greet an elder respectfully?",
  },
  {
    label: "What does Mepa wo kyɛw mean?",
    question: "What does Mepa wo kyɛw mean?",
  },
  {
    label: "Teach me an Asante Twi greeting.",
    question: "Teach me an Asante Twi greeting.",
  },
];

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const PROFILE_STORAGE_KEY = "my-people:profile:v2";
export const PROGRESS_STORAGE_KEY = "my-people:progress:v2";
export const RESET_STORAGE_KEYS = [PROFILE_STORAGE_KEY, PROGRESS_STORAGE_KEY];

// ─── Calendar events ──────────────────────────────────────────────────────────

export const EVENTS_STORAGE_KEY = "my-people:events:v1";

// ─── Event prep journeys ───────────────────────────────────────────────────────

/** Fixed stage order for a prep journey walk-through. */
export const PREP_STEP_ORDER = [
  "what",
  "happens",
  "who",
  "say",
  "wear",
  "avoid",
] as const;

export const PREP_STEP_LABELS: Record<
  (typeof PREP_STEP_ORDER)[number],
  string
> = {
  what: "What is it?",
  happens: "What will happen",
  who: "Who matters",
  say: "What to say",
  wear: "What to wear",
  avoid: "What not to do",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  funeral: "Funeral",
  wedding: "Wedding / engagement",
};

export const LEAD_TIME_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: "3 days before" },
  { value: 7, label: "7 days before" },
  { value: 14, label: "2 weeks before" },
  { value: 30, label: "30 days before" },
];

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
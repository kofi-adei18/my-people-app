// ─────────────────────────────────────────────────────────────────────────────
// My People — core domain types for the 7-day Asante cultural journey.
//
// MVP scope is deliberately narrow: Ghana · Asante · Asante Twi · 7 days.
// Persistence is localStorage-only; AI endpoints receive profile + learning
// state in the request body and stay stateless.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Onboarding -----------------------------------------------------------------

export const LOCATIONS = [
  "Ghana",
  "United Kingdom",
  "United States",
  "Canada",
  "Europe",
  "Other",
] as const;
export type UserLocation = (typeof LOCATIONS)[number];

export const CULTURAL_CONNECTIONS = [
  "very",
  "somewhat",
  "some",
  "barely",
  "not-sure",
] as const;
export type CulturalConnectionLevel = (typeof CULTURAL_CONNECTIONS)[number];

export const LEARNING_GOALS = [
  "language",
  "greetings-etiquette",
  "history",
  "traditions",
  "family-heritage",
  "stories",
  "names-meanings",
  "cultural-events",
] as const;
export type LearningGoal = (typeof LEARNING_GOALS)[number];

export const FAMILY_KNOWLEDGE_LEVELS = [
  "a-lot",
  "some",
  "very-little",
  "almost-nothing",
  "not-sure",
] as const;
export type FamilyKnowledgeLevel = (typeof FAMILY_KNOWLEDGE_LEVELS)[number];

export const LEARNING_PREFERENCES = [
  "speaking",
  "behavior",
  "history",
  "family",
  "events",
  "bit-of-everything",
] as const;
export type LearningPreference = (typeof LEARNING_PREFERENCES)[number];

export interface UserProfile {
  id: string;
  location: UserLocation;
  culturalConnectionLevel: CulturalConnectionLevel;
  familyKnowledgeLevel: FamilyKnowledgeLevel;
  learningGoals: LearningGoal[];
  preferredLearningStyle: LearningPreference;
  culturalGroup: "Asante";
  language: "Asante Twi";
  createdAt: number;
}

// ─── Learning progress ----------------------------------------------------------

export interface LearnedConcept {
  day: number;
  title: string;
  concept: string;
}

export interface PracticedConcept {
  day: number;
  concept: string;
  status: "correct" | "review";
}

export interface FamilyQuestion {
  id: string;
  day: number;
  question: string;
  relatedConcept: string;
}

export interface FamilyDiscovery {
  id: string;
  day: number;
  question: string;
  answer: string;
  relatedConcept: string;
  insights: string[];
  createdAt: number;
}

export interface QuizAttempt {
  id: string;
  day: number;
  prompt: string;
  promptType: string;
  choices: string[];
  selected: string;
  correct: boolean;
  createdAt: number;
}

export type CultureBankCategory =
  | "word"
  | "saying"
  | "people"
  | "story"
  | "family-discovery"
  | "insight";

export interface CultureBankItem {
  id: string;
  category: CultureBankCategory;
  text: string;
  detail?: string;
  /** Journey day (1–7). Undefined for event-briefing items. */
  day?: number;
  source: "lesson" | "family" | "challenge" | "reflection" | "event";
  createdAt: number;
}

export interface LearningProgress {
  userId: string;
  /** Next day to play (1–7). Always capped at 7. */
  currentDay: number;
  /** Days fully finished (lesson + family mission where present). */
  completedDays: number[];
  learnedConcepts: LearnedConcept[];
  practicedConcepts: PracticedConcept[];
  familyQuestions: FamilyQuestion[];
  familyDiscoveries: FamilyDiscovery[];
  quizResults: QuizAttempt[];
  /** conceptKey → 0..1 estimate of the learner's grasp. */
  confidenceScores: Record<string, number>;
  /** The persistent Culture Bank (spec §22). */
  cultureBank: CultureBankItem[];
}

// ─── RAG sources & chunks ------------------------------------------------------

export type SourceType = "academic" | "educational" | "cultural" | "community" | "video";
export type AuthorityLevel = "high" | "medium" | "low";
export type AsanteSpecificity = "explicit" | "Akan_general" | "Ghana_general";
export type ClaimType = "language" | "etiquette" | "history" | "tradition";
export type Confidence = "high" | "medium" | "low";

/** Source-level metadata, stored in the manifest (spec §7). */
export interface SourceMetadata {
  source_id: string;
  title: string;
  url?: string;
  source_type: SourceType;
  cultural_group: string[];
  language: string[];
  country: string;
  topic: string[];
  lesson_days: number[];
  content_type: string[];
  audience: string[];
  authority_level: AuthorityLevel;
  asante_specificity: AsanteSpecificity;
  verified: boolean;
  notes?: string;
}

/** Per-chunk metadata stamped from the source at ingest time (spec §20). */
export interface ChunkMetadata {
  source_url?: string;
  source_type: SourceType;
  cultural_group: string[];
  language: string[];
  country: string;
  topic: string[];
  lesson_days: number[];
  content_type: string[];
  authority_level: AuthorityLevel;
  asante_specificity: AsanteSpecificity;
  claim_type: ClaimType;
  confidence: Confidence;
  verified: boolean;
}

export interface RagChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  page?: number;
  text: string;
  tokens: number;
  meta?: ChunkMetadata;
  /** TF-IDF sparse vector [vocabIndex, weight][] (present in the index file). */
  vector?: [number, number][];
  /** OpenAI embedding vector, present only when ingestion used OpenAI. */
  openai?: number[];
}

export interface RagIndex {
  version: number;
  vocabulary: string[];
  idf: number[];
  documents: RagChunk[];
  embedding?: {
    provider: "tfidf" | "openai";
    model?: string;
    dimensions?: number;
  };
}

export interface SourceReference {
  title: string;
  page?: number;
  url?: string;
  authority?: AuthorityLevel;
  specificity?: AsanteSpecificity;
  verified?: boolean;
}

// ─── Lesson content ------------------------------------------------------------

export interface Phrase {
  twi: string;
  english: string;
  pronunciation?: string;
  notes?: string;
}

export interface ConceptBlock {
  title: string;
  explanation: string;
  phrases: Phrase[];
}

export interface PracticeItem {
  prompt: string;
  answer: string;
  concept: string;
  choices?: string[];
}

export interface ScenarioQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  concept: string;
}

export interface FamilyMission {
  question: string;
  relatedConcept: string;
  why: string;
}

export type DayType = "lesson" | "family" | "reflection" | "challenge";
export type LessonMode = "rag" | "demo";

/** Response shape for /api/day (days 1–5). */
export interface StoryBlock {
  title: string;
  text: string;
  /** false → UI banner: "Akan_history_unverified". Defaults to false in demo. */
  verified: boolean;
}

export interface DayLesson {
  day: number;
  dayType: "lesson" | "family";
  title: string;
  theme: string;
  claim: string;
  hook: string;
  estimatedMinutes: number;
  concept?: ConceptBlock;
  practice?: PracticeItem[];
  scenario?: ScenarioQuestion[];
  culturalInsight?: string;
  story?: StoryBlock;
  familyMission: FamilyMission;
  flex: string;
  sources: SourceReference[];
  mode: LessonMode;
}

/** Response shape for /api/reflection (day 6). */
export interface Day6Reflection {
  day: 6;
  title: string;
  hook: string;
  summary: {
    language: number;
    culture: number;
    history: number;
    family: number;
  };
  counts: {
    phrases: number;
    concepts: number;
    stories: number;
    discoveries: number;
  };
  interests: string[];
  insight: string;
  recommendation: string;
  bankSelect: CultureBankItem[];
  sources: SourceReference[];
  mode: LessonMode;
}

export interface ChallengeStep {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  concept: string;
}

/** Response shape for /api/challenge (day 7). */
export interface Day7Challenge {
  day: 7;
  title: string;
  scene: string;
  steps: ChallengeStep[];
  summary: {
    phrases: number;
    concepts: number;
    stories: number;
    discoveries: number;
  };
  chapter: string;
  sources: SourceReference[];
  mode: LessonMode;
}

/** Result of /api/family-analyze. */
export interface FamilyAnalysis {
  insights: string[];
  bankItems: CultureBankItem[];
  nextFocus: string;
  mode: LessonMode;
}

// ─── Chat (Ask screen) ------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  sources?: SourceReference[];
  mode?: LessonMode;
  suggested?: string[];
}

// ─── Calendar & cultural events ------------------------------------------------

/** Event types the MVP can detect and brief on. */
export const EVENT_TYPES = ["funeral", "wedding"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type EventConfidence = "high" | "low";

/** How the calendar was connected. */
export interface CalendarConnection {
  provider: "google" | "ics" | "manual";
  connectedAt: number;
  /** .ics source label (file name or URL) when provider is "ics". */
  icsLabel?: string;
  /** Raw .ics text, kept so events can be re-parsed without the file. */
  icsText?: string;
}

/** A normalized calendar event. */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  /** Start time, epoch ms. */
  start: number;
  end?: number;
  allDay: boolean;
  source: "google" | "ics" | "manual";
}

/** Result of the local keyword detector for one event. */
export interface DetectedEvent {
  eventId: string;
  eventType: EventType | null;
  confidence: EventConfidence;
  matchedKeywords: string[];
  /** Set once the learner confirms (or corrects) the detected type. */
  userConfirmed: boolean;
}

/** Questionnaire answers that shape the briefing. */
export interface EventBriefingDetails {
  /** e.g. "immediate family", "in-law", "friend of the family", "colleague". */
  role?: string;
  /** Whether the dress code is already known to the learner. */
  dressCodeKnown?: boolean;
  /** Region/community the event takes place in, free text. */
  region?: string;
  /** Anything else the learner knows about the event. */
  notes?: string;
}

export interface EventBriefingSection {
  id: string;
  title: string;
  body: string;
  phrases?: Phrase[];
  items?: string[];
  /** false → amber "unverified" treatment in the UI. */
  verified?: boolean;
}

export interface EventBriefing {
  id: string;
  eventId: string;
  eventType: EventType;
  eventTitle: string;
  eventDate: number;
  details: EventBriefingDetails;
  summary: string;
  sections: EventBriefingSection[];
  sources: SourceReference[];
  mode: LessonMode;
  createdAt: number;
}

// ─── Event prep journeys --------------------------------------------------------

/** Ordered step ids of an event prep journey arc. */
export const PREP_STEPS = [
  "understand",
  "mouth",
  "body",
  "wear",
  "gifts",
  "family",
  "rehearse",
] as const;
export type PrepStepId = (typeof PREP_STEPS)[number];

export interface PrepStepContent {
  id: PrepStepId;
  title: string;
  theme: string;
  hook: string;
  concept: { title: string; explanation: string; items?: string[] };
  /** Corpus-gated phrases only. */
  phrases?: Phrase[];
  /** 1–2 scenario questions; answers feed the shared confidence scores. */
  scenario?: ScenarioQuestion[];
  /** Family step: the personalised mission (reuse of Day-5 mechanics). */
  familyMission?: { question: string; why: string };
  /** Rehearse step: the day-of checklist. */
  checklist?: string[];
  sources: SourceReference[];
  /** false → amber unverified treatment. */
  verified?: boolean;
  /** prose refinement mode for this step ("demo" = deterministic base). */
  mode: LessonMode;
}

export interface CalendarPrepJourney {
  eventId: string;
  eventType: EventType;
  eventTitle: string;
  eventDate: number;
  /** The composed (possibly compressed) arc, ordered. */
  stepIds: PrepStepId[];
  steps: Record<PrepStepId, PrepStepContent>;
  /** The full briefing, rendered on the rehearse step as the day-of rundown. */
  briefing: EventBriefing;
  completedSteps: PrepStepId[];
  /** Advisory pacing only — never gates navigation. */
  pacing: { totalDays: number; daysLeft: number; hint: string };
  createdAt: number;
}

export interface EventReflection {
  eventId: string;
  wentWell: string;
  wouldChange: string;
  insights: string[];
  bankItems: Omit<CultureBankItem, "id" | "createdAt">[];
  createdAt: number;
}

export interface EventBriefingSettings {
  /** Master switch for calendar event briefings. */
  enabled: boolean;
  /** How many days before an event the briefing is offered. Default 7. */
  leadTimeDays: number;
  /** Surface events the detector flagged with low confidence. */
  showLowConfidence: boolean;
}

/** Everything the events feature persists (one localStorage key). */
export interface EventsStore {
  settings: EventBriefingSettings;
  connection: CalendarConnection | null;
  events: CalendarEvent[];
  detections: Record<string, DetectedEvent>;
  briefings: EventBriefing[];
  /** Event ids the learner dismissed from the "Coming up" surface. */
  dismissedEventIds: string[];
  /** Manually requested prep journeys (the "Prepare me" feature). */
  prepJourneys: EventPrepJourney[];
  /** Per-journey checklist/quiz/completion state, keyed by journey id. */
  prepProgress: Record<string, PrepProgress>;
  /** Calendar prep journeys, keyed by eventId. */
  calendarJourneys: Record<string, CalendarPrepJourney>;
  /** Post-event reflections, keyed by eventId. */
  reflections: Record<string, EventReflection>;
}

// ─── Event prep journeys (manual, free-form) -----------------------------------

export type PrepGrounding = "high" | "low";

export interface PrepQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** A learner's saved interaction with one prep journey. */
export interface PrepProgress {
  journeyId: string;
  /** Checklist items the learner has ticked. */
  checkedItems: number[];
  /** Quiz answers already given, in question order. */
  quizAnswers: { selected: number; correct: boolean }[];
  /** Set once the learner walks every step. */
  completed: boolean;
  updatedAt: number;
}

export interface EventPrepStep {
  id: "what" | "happens" | "who" | "say" | "wear" | "avoid";
  title: string;
  body: string;
  phrases?: Phrase[];
  items?: string[];
  /** Always false for prep journeys — user-described events, provisional. */
  verified?: boolean;
}

export interface EventPrepJourney {
  id: string;
  eventTitle: string;
  /** Epoch ms, 0 when the learner didn't give a date. */
  eventDate: number;
  /** LLM's best guess at the event kind, e.g. "naming ceremony". Free text. */
  eventTypeGuess?: string;
  details: {
    role?: string;
    region?: string;
    notes?: string;
  };
  /** One-line orientation shown before the steps begin. */
  summary: string;
  /** The six content stages, in fixed display order. */
  steps: EventPrepStep[];
  quiz: PrepQuizQuestion[];
  /** Day-of checklist, shown as its own final stage. */
  checklist: string[];
  /** Low = the knowledge base has little on this event; expect general guidance. */
  grounding: PrepGrounding;
  sources: SourceReference[];
  mode: LessonMode;
  createdAt: number;
}

/** Everything a prep journey generation needs from the learner. */
export interface PrepDetails {
  role?: string;
  region?: string;
  notes?: string;
}

// ─── Constructors & seeds --------------------------------------------------------

export const UNKNOWN_USER = "New journey";

export function emptyUserProfile(): UserProfile {
  return {
    id: "",
    location: "Other",
    culturalConnectionLevel: "not-sure",
    familyKnowledgeLevel: "not-sure",
    learningGoals: [],
    preferredLearningStyle: "bit-of-everything",
    culturalGroup: "Asante",
    language: "Asante Twi",
    createdAt: Date.now(),
  };
}

export function createLearningProgress(userId: string): LearningProgress {
  return {
    userId,
    currentDay: 1,
    completedDays: [],
    learnedConcepts: [],
    practicedConcepts: [],
    familyQuestions: [],
    familyDiscoveries: [],
    quizResults: [],
    confidenceScores: {},
    cultureBank: [],
  };
}

export function emptyEventsStore(): EventsStore {
  return {
    settings: {
      enabled: true,
      leadTimeDays: 7,
      showLowConfidence: false,
    },
    connection: null,
    events: [],
    detections: {},
    briefings: [],
    dismissedEventIds: [],
    prepJourneys: [],
    prepProgress: {},
    calendarJourneys: {},
    reflections: {},
  };
}
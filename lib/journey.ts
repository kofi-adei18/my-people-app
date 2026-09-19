import type {
  ClaimType,
  DayType,
} from "@/lib/types";

/**
 * The fixed seven-day journey scaffold (spec §8).
 *
 * This is the ONLY curriculum in the MVP. Days are not seven unrelated
 * lessons — they are one continuous arc:
 *
 *   DAY 1 Mouth       → I can say something.
 *   DAY 2 Meaning     → I understand what I'm saying.
 *   DAY 3 Body        → I understand how people behave.
 *   DAY 4 Story       → I understand where something comes from.
 *   DAY 5 Family      → I discover something from my own family.
 *   DAY 6 Identity    → I connect what I've learned to myself.
 *   DAY 7 Performance → I demonstrate what I've learned.
 *
 * Personalization happens INSIDE each day (content, ordering, emphasis) —
 * never by swapping the scaffold itself.
 */

export interface RetrievalSpec {
  topics: string[];
  lessonDays: number[];
  contentTypes?: string[];
  claimTypes?: ClaimType[];
}

export interface DayDefinition {
  day: number;
  dayType: Extract<DayType, "lesson" | "family"> | "reflection" | "challenge";
  theme: string;
  claim: string;
  title: string;
  hook: string;
  estimatedMinutes: number;
  retrieval: RetrievalSpec;
  /** Default family mission; Day 5's question is personalized at runtime. */
  familyMission?: {
    question: string;
    relatedConcept: string;
    why: string;
  };
  flex: string;
}

export const JOURNEY_DAYS: DayDefinition[] = [
  {
    day: 1,
    dayType: "lesson",
    theme: "Mouth",
    claim: "I can say something.",
    title: "Say It Like You Mean It",
    hook: "Walk away able to greet someone in Asante Twi — the right greeting, for the right time, for the right person.",
    estimatedMinutes: 6,
    retrieval: {
      topics: ["greetings", "language"],
      lessonDays: [1],
      contentTypes: ["language", "culture"],
      claimTypes: ["language", "etiquette"],
    },
    familyMission: {
      question:
        "Ask someone in your family: What greeting did you use when you were growing up?",
      relatedConcept: "greetings",
      why: "Your family's greeting is a living thread connecting today's lesson to your own history.",
    },
    flex: "You can now greet someone in Asante Twi according to the time of day.",
  },
  {
    day: 2,
    dayType: "lesson",
    theme: "Meaning",
    claim: "I understand what I'm saying.",
    title: "There's More Inside a Greeting",
    hook: "Greetings carry respect, wellbeing and relationship — today you learn what is actually inside them.",
    estimatedMinutes: 7,
    retrieval: {
      topics: ["greetings", "politeness", "etiquette"],
      lessonDays: [1, 2],
      contentTypes: ["language", "culture"],
      claimTypes: ["language", "etiquette"],
    },
    familyMission: {
      question:
        "Ask an older family member: What did your parents teach you about greeting elders?",
      relatedConcept: "greetings",
      why: "Elder-greeting rules are passed by example — someone in your family was taught exactly this.",
    },
    flex: "You know that a greeting is a doorway — and that respect travels inside the words.",
  },
  {
    day: 3,
    dayType: "lesson",
    theme: "Body",
    claim: "I understand how people behave.",
    title: "Your Body Speaks Too",
    hook: "Words are only half the greeting. Today is about how the body shows respect.",
    estimatedMinutes: 6,
    retrieval: {
      topics: ["etiquette", "respect", "politeness"],
      lessonDays: [2, 3],
      contentTypes: ["culture"],
      claimTypes: ["etiquette"],
    },
    familyMission: {
      question:
        "Ask someone older in your family: What was considered disrespectful when greeting elders?",
      relatedConcept: "etiquette",
      why: "Every family remembers a rule that 'you just knew' — this question surfaces yours.",
    },
    flex: "You now know that greeting isn't only about words.",
  },
  {
    day: 4,
    dayType: "lesson",
    theme: "Story",
    claim: "I understand where something comes from.",
    title: "The Story Behind the Behaviour",
    hook: "The respect you've been learning isn't random. Today, in a short story, you find out why it exists.",
    estimatedMinutes: 6,
    retrieval: {
      topics: ["etiquette", "greetings", "history"],
      lessonDays: [1, 2, 3],
      contentTypes: ["culture"],
      claimTypes: ["etiquette", "history"],
    },
    familyMission: {
      question:
        "Ask a family member: What story were you told as a child about why we respect elders?",
      relatedConcept: "story",
      why: "Stories are how this meaning travels through families. Yours has one too.",
    },
    flex: "You can tell someone the story behind the behaviour — not just the behaviour itself.",
  },
  {
    day: 5,
    dayType: "family",
    theme: "Family",
    claim: "I discover something from my own family.",
    title: "Go Ask Someone Who Knows",
    hook: "No new lesson today. Instead, a question built from what you've told me — go ask someone who knows.",
    estimatedMinutes: 8,
    retrieval: {
      topics: ["greetings", "etiquette", "family"],
      lessonDays: [1, 2, 3],
      contentTypes: ["culture", "language"],
      claimTypes: ["etiquette", "tradition"],
    },
    flex: "Your family just told you something worth keeping. It's now part of your culture bank.",
  },
  {
    day: 6,
    dayType: "reflection",
    theme: "Identity",
    claim: "I connect what I've learned to myself.",
    title: "This Is Yours",
    hook: "No new material. Today you get to see your own journey — and where it points next.",
    estimatedMinutes: 5,
    retrieval: {
      topics: [],
      lessonDays: [],
    },
    flex: "This is your journey, collected in one place.",
  },
  {
    day: 7,
    dayType: "challenge",
    theme: "Performance",
    claim: "I demonstrate what I've learned.",
    title: "Show Me What You've Learned",
    hook: "You're at a family gathering in Kumasi. Let's see what you do — and why.",
    estimatedMinutes: 8,
    retrieval: {
      topics: ["greetings", "etiquette"],
      lessonDays: [1, 2, 3],
      contentTypes: ["culture", "language"],
      claimTypes: ["language", "etiquette"],
    },
    flex: "Seven days. One journey. You can walk into that gathering now.",
  },
];

export const journeyDay = (day: number): DayDefinition | undefined =>
  JOURNEY_DAYS.find((d) => d.day === day);

export const isLessonDay = (day: number): boolean =>
  day >= 1 && day <= 4;

export const DAY_COUNT = JOURNEY_DAYS.length;

/** Time-of-day window used to personalise Day 1's opening greeting. */
export type DayPart = "morning" | "afternoon" | "evening" | "night";

export function dayPartFromHour(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
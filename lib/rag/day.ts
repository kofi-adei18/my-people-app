import type {
  ConceptBlock,
  Day6Reflection,
  Day7Challenge,
  DayLesson,
  FamilyMission,
  LearningProgress,
  Phrase,
  PracticeItem,
  ScenarioQuestion,
  SourceReference,
  UserProfile,
} from "@/lib/types";
import { GOAL_LABELS } from "@/lib/constants";
import {
  JOURNEY_DAYS,
  dayPartFromHour,
  journeyDay,
  type DayPart,
} from "@/lib/journey";
import { retrieveForDay } from "@/lib/rag/index";
import {
  formatContext,
  sourceReferences,
  type ContextHit,
} from "@/lib/rag/prompt";
import { extractJson, tryLLM } from "@/lib/rag/llm-utils";

export type JourneyContent = DayLesson | Day6Reflection | Day7Challenge;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

// ─── Grounding helpers ─────────────────────────────────────────────────────────

function hasTokens(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.every((t) => lower.includes(t.toLowerCase()));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^["“']+|["“']+$/g, ""))
    .filter((s) => s.length > 20);
}

function sentenceContaining(hits: ContextHit[], terms: string[]): string | null {
  for (const h of hits) {
    for (const s of splitSentences(clean(h.text))) {
      if (terms.some((t) => s.toLowerCase().includes(t.toLowerCase()))) return s;
    }
  }
  return null;
}

function combinedText(hits: ContextHit[]): string {
  return clean(hits.map((h) => h.text).join(" "));
}

function toSources(hits: ContextHit[]): SourceReference[] {
  return sourceReferences(hits);
}

function toContext(hits: { text: string; sourceTitle: string; page?: number; meta?: import("@/lib/types").ChunkMetadata }[]): ContextHit[] {
  return hits.map((c) => ({
    text: c.text,
    title: c.sourceTitle,
    page: c.page,
    url: c.meta?.source_url,
    authority: c.meta?.authority_level,
    specificity: c.meta?.asante_specificity,
    verified: c.meta?.verified,
  }));
}

/** A phrase only makes the cut if its required tokens exist in the corpus. */
function pickPhrases(
  candidates: { twi: string; english: string; pronunciation?: string; notes?: string; tokens: string[] }[],
  corpus: string,
): Phrase[] {
  return candidates
    .filter((c) => hasTokens(corpus, c.tokens))
    .map((c) => ({
      twi: c.twi,
      english: c.english,
      pronunciation: c.pronunciation,
      notes: c.notes,
    }));
}

// ─── Canonical content (every phrase/answer is grounded in the curated set) ───

const DAY1_GREETINGS: (Phrase & { tokens: string[] })[] = [
  { twi: "Maakye", english: "Good morning", notes: "Shortened form of 'Me ma wo akye o'", tokens: ["maakye", "akye"] },
  { twi: "Maaha", english: "Good afternoon", notes: "Shortened form of 'Me ma wo aha o'", tokens: ["maaha"] },
  { twi: "Maadwo", english: "Good evening", notes: "Shortened form of 'Me ma wo adwo o'", tokens: ["maadwo"] },
  { twi: "Yaa agya", english: "Response to an older man", tokens: ["yaa agya"] },
  { twi: "Yaa ena", english: "Response to an older woman", tokens: ["yaa ena"] },
  { twi: "Yaa nua", english: "Response to someone your age", tokens: ["yaa nua"] },
];

const DAY2_POLITENESS: (Phrase & { tokens: string[] })[] = [
  { twi: "Wo ho te sɛn?", english: "How are you?", tokens: ["wo ho te sɛn"] },
  { twi: "Me ho yɛ", english: "I am fine", tokens: ["me ho yɛ"] },
  { twi: "Mepa wo kyɛw", english: "Please — literally 'I remove my hat to you'", pronunciation: "mepaakyɛw", tokens: ["mepa wo kyɛw", "hat"] },
  { twi: "Meda wo ase", english: "Thank you — literally 'I lay at your feet'", pronunciation: "medaase", tokens: ["meda wo ase", "feet"] },
];

const DAY3_TITLES: (Phrase & { tokens: string[] })[] = [
  { twi: "Owura", english: "Sir / Mr", tokens: ["owura"] },
  { twi: "Awuraa", english: "Ma'am / Lady", tokens: ["awuraa"] },
  { twi: "Maame", english: "An adult woman your mother's age", tokens: ["maame"] },
  { twi: "Nana", english: "A chief, or an honoured elder", tokens: ["nana"] },
  { twi: "ɔpanyin", english: "Male elder", tokens: ["ɔpanyin"] },
  { twi: "ɔbaa panyin", english: "Female elder", tokens: ["ɔbaa panyin"] },
];

// ─── Refinement plumbing ───────────────────────────────────────────────────────

const TUTOR_SYSTEM = `You are the Asante culture tutor inside My People, composing the conversational parts of a 7-day lesson. You write in a warm, plain, beginner-friendly voice for a learner reconnecting with their Asante heritage.

Rules (in priority order): Accuracy before Relevance before Simplicity before Memorability.
1. Ground EVERY explanation in the retrieved sources only. Never invent traditions, phrases, titles, or etymology.
2. Flag any claim that comes from an unverified source — do not present it as certain.
3. Keep prose under 5 sentences unless asked for more. No academic jargon without a quick gloss.`;

async function refineJSON<T>(userTask: string, context: ContextHit[]): Promise<T | null> {
  const result = await tryLLM(
    TUTOR_SYSTEM,
    `${userTask}\n\nRetrieved sources from the My People knowledge base:\n${formatContext(context)}\n\nReturn valid JSON only.`,
    700,
  );
  if (!result.ok) return null;
  return extractJson<T>(result.content);
}

// ─── Day 1: Mouth ──────────────────────────────────────────────────────────────

function buildDay1(
  profile: UserProfile,
  progress: LearningProgress,
  hits: ContextHit[],
  part: DayPart,
): DayLesson {
  const def = journeyDay(1)!;
  const corpus = combinedText(hits);
  const phrases = pickPhrases(DAY1_GREETINGS, corpus);

  const greetingFor = (p: DayPart) =>
    p === "morning" ? "Maakye" : p === "afternoon" ? "Maaha" : "Maadwo";
  const lead = phrases.find((f) => f.twi === greetingFor(part)) ?? phrases[0];

  const handshakeLine =
    sentenceContaining(hits, ["left to right", "right hand"]) ??
    "When shaking hands, use only your right hand, and shake hands with people in a group from left to right.";

  const concept: ConceptBlock = {
    title: "Formal Daily Twi Greetings",
    explanation: clean(
      `A greeting is the doorway in Asante culture — you are expected to shake hands, greet correctly for the occasion, and be especially polite with elders. It is not enough to say a plain "hello": the greeting changes with the time of day and the person. Right now (${part}) the greeting to lead with is ${lead?.twi ?? "Maakye"} — ${lead?.english ?? ""}. ${handshakeLine}`,
    ),
    phrases,
  };

  const practice: PracticeItem[] = [
    { prompt: "Good morning, ma'am — say it in Asante Twi.", answer: "Awura, maakye", concept: "greetings" },
    { prompt: "Good afternoon, sir — say it in Asante Twi.", answer: "Owura, maaha", concept: "greetings" },
    { prompt: "Good evening, cousin — say it in Asante Twi.", answer: "Onua, maadwo", concept: "greetings" },
    { prompt: "An older man greets you — what is his reply?", answer: "Yaa agya", concept: "greetings" },
  ].filter((p) => hasTokens(corpus, p.answer.toLowerCase().split(/\s+/).filter(Boolean)));

  const scenario: ScenarioQuestion[] = [
    {
      question: "It is morning and your elder aunt greets you first: 'Maakye'. What do you reply?",
      choices: ["Yaa ena", "Maadwo", "Owura, maaha", "Medaase"],
      correctIndex: 0,
      explanation: hasTokens(corpus, ["akua", "yaa ena"])
        ? "In the sources, the older woman's morning greeting to Akua is answered with 'Yaa ena'."
        : "An older woman's greeting is answered with 'Yaa ena'.",
      concept: "greetings",
    },
    {
      question: "A friend your own age greets you in the afternoon. How do you greet back?",
      choices: ["Yaa agya", "Yaa nua", "Yaa ena", "Mepa wo kyɛw"],
      correctIndex: 1,
      explanation: "Someone your age is greeted with 'Yaa nua'.",
      concept: "greetings",
    },
    {
      question: "You're meeting an older man in the evening. What do you say?",
      choices: ["Owura, maadwo", "Awuraa, maakye", "Onua, maaha", "Wo ho te sɛn?"],
      correctIndex: 0,
      explanation: "Evening greeting to a man: 'Owura, maadwo'.",
      concept: "greetings",
    },
  ];

  const familyMission: FamilyMission = def.familyMission ?? {
    question: "Ask someone in your family: What greeting did you use when you were growing up?",
    relatedConcept: "greetings",
    why: "Your family's greeting is a living thread connecting today's lesson to your own history.",
  };

  return {
    day: 1,
    dayType: "lesson",
    title: def.title,
    theme: def.theme,
    claim: def.claim,
    hook: def.hook,
    estimatedMinutes: def.estimatedMinutes,
    concept,
    practice,
    scenario,
    culturalInsight: clean(
      `Respect travels before the words: shake only with your right hand, greet a group from left to right, and let the time of day pick your greeting. ${handshakeLine}`,
    ),
    familyMission,
    flex: def.flex,
    sources: toSources(hits),
    mode: "rag",
  };
}

// ─── Day 2: Meaning ────────────────────────────────────────────────────────────

function buildDay2(
  profile: UserProfile,
  progress: LearningProgress,
  hits: ContextHit[],
): DayLesson {
  const def = journeyDay(2)!;
  const corpus = combinedText(hits);
  const phrases = pickPhrases(DAY2_POLITENESS, corpus);

  const polity =
    sentenceContaining(hits, ["health", "not enough", "asked"]) ??
    "People are expected to ask after each other's health — it is not enough to say 'Hello' or 'Good morning.'";

  const concept: ConceptBlock = {
    title: "There's More Inside a Greeting",
    explanation: clean(
      `A greeting carries more than a 'hello' — it carries respect, care and relationship. ${polity} ${phrases[0]?.twi ?? "Wo ho te sɛn?"} ('How are you?') is the key that unlocks the rest: instead of walking past, you ask after the person. That single habit is what a greeting is really for.`,
    ),
    phrases,
  };

  const practice: PracticeItem[] = (
    [
      { prompt: "How do you ask how someone is?", answer: "Wo ho te sɛn?" },
      { prompt: "How do you answer 'Wo ho te sɛn?'", answer: "Me ho yɛ" },
      { prompt: "How do you say 'please'?", answer: "Mepa wo kyɛw" },
      { prompt: "How do you say 'thank you'?", answer: "Meda wo ase" },
    ] as PracticeItem[]
  ).filter((p) => hasTokens(corpus, p.answer.replace("?", "").split(/\s+/).filter(Boolean)));

  const scenario: ScenarioQuestion[] = [
    {
      question: "An auntie hands you something and asks 'Wo ho te sɛn?' — you're fine. What's the reply?",
      choices: ["Me ho yɛ", "Mepa wo kyɛw", "Medaase", "Yaa nua"],
      correctIndex: 0,
      explanation: "'I am fine' is 'Me ho yɛ' — the answer to 'Wo ho te sɛn?'",
      concept: "politeness",
    },
    {
      question: "You want to ask someone politely to do something. Which phrase shows the deepest respect?",
      choices: ["Mepa wo kyɛw", "Medaase", "Anopa", "Onua"],
      correctIndex: 0,
      explanation: "Mepa wo kyɛw means 'please' — literally 'I remove my hat to you'.",
      concept: "politeness",
    },
    {
      question: "After someone helps you, the polite response is…",
      choices: ["Meda wo ase", "Owura", "Maaha", "Yaa ena"],
      correctIndex: 0,
      explanation: "Meda wo ase means 'thank you' — literally 'I lay at your feet'.",
      concept: "politeness",
    },
  ];

  const familyMission: FamilyMission = def.familyMission ?? {
    question: "Ask an older family member: What did your parents teach you about greeting elders?",
    relatedConcept: "greetings",
    why: "Elder-greeting rules are passed by example — someone in your family was taught exactly this.",
  };

  return {
    day: 2,
    dayType: "lesson",
    title: def.title,
    theme: def.theme,
    claim: def.claim,
    hook: def.hook,
    estimatedMinutes: def.estimatedMinutes,
    concept,
    practice,
    scenario,
    culturalInsight: clean(`The literal meanings are the poetry: Mepa wo kyɛw is 'I remove my hat to you'; Meda wo ase is 'I lay at your feet'. The words themselves bow.`),
    familyMission,
    flex: def.flex,
    sources: toSources(hits),
    mode: "rag",
  };
}

// ─── Day 3: Body ───────────────────────────────────────────────────────────────

function buildDay3(
  profile: UserProfile,
  progress: LearningProgress,
  hits: ContextHit[],
): DayLesson {
  const def = journeyDay(3)!;
  const corpus = combinedText(hits);
  const phrases = pickPhrases(DAY3_TITLES, corpus);

  const handshakeLine =
    sentenceContaining(hits, ["left to right", "right hand"]) ??
    "When shaking hands, only use your right hand, and shake hands with people in a group from left to right.";

  const concept: ConceptBlock = {
    title: "Your Body Speaks Too",
    explanation: clean(
      `Words are only half the greeting. ${handshakeLine} Titles matter just as much: use ${phrases.slice(0, 3).map((f) => `${f.twi} (${f.english})`).join(", ") || "the right title for the person"} and respect shows before you say anything.`,
    ),
    phrases,
  };

  const practice: PracticeItem[] = (
    [
      { prompt: "What do you call an adult woman your mother's age?", answer: "Maame" },
      { prompt: "What do you call a male elder?", answer: "ɔpanyin" },
      { prompt: "What title fits a chief or honoured elder?", answer: "Nana" },
      { prompt: "Which hand is used for handshakes?", answer: "The right hand" },
    ] as PracticeItem[]
  ).filter((p) => hasTokens(corpus, [p.answer.toLowerCase().split(/\s+/g)[0]]));

  const scenario: ScenarioQuestion[] = [
    {
      question: "You are introduced to an honoured elder. Which is the respectful greeting?",
      choices: ["Nana, maakye — with the right hand", "A fist bump", "A passing 'hey'", "A left-handed wave"],
      correctIndex: 0,
      explanation: "Use the title, the time-appropriate greeting, and only your right hand.",
      concept: "etiquette",
    },
    {
      question: "A group of elders is standing in a row. How do you greet them?",
      choices: ["From right to left", "From left to right", "Only the oldest one", "Wait to be approached"],
      correctIndex: 1,
      explanation: "Greet individuals in a group from left to right.",
      concept: "etiquette",
    },
    {
      question: "Someone offers their LEFT hand. What do you do?",
      choices: ["Take it — any hand works", "Politely offer your right hand instead", "Refuse to greet them", "Walk away"],
      correctIndex: 1,
      explanation: "Only the right hand is used for shaking hands.",
      concept: "etiquette",
    },
  ];

  const familyMission: FamilyMission = def.familyMission ?? {
    question: "Ask someone older in your family: What was considered disrespectful when greeting elders?",
    relatedConcept: "etiquette",
    why: "Every family remembers a rule that 'you just knew' — this question surfaces yours.",
  };

  return {
    day: 3,
    dayType: "lesson",
    title: def.title,
    theme: def.theme,
    claim: def.claim,
    hook: def.hook,
    estimatedMinutes: def.estimatedMinutes,
    concept,
    practice,
    scenario,
    culturalInsight: "Your body greets before your mouth does — the right hand, the title, the direction of the greeting.",
    familyMission,
    flex: def.flex,
    sources: toSources(hits),
    mode: "rag",
  };
}

// ─── Day 4: Story ──────────────────────────────────────────────────────────────

function buildDay4(
  profile: UserProfile,
  progress: LearningProgress,
  hits: ContextHit[],
): DayLesson {
  const def = journeyDay(4)!;
  const corpus = combinedText(hits);

  const greetingExample = sentenceContaining(hits, ["maakye", "yaa ena"]) ?? "";
  const concept: ConceptBlock = {
    title: "Why Respect Has a Shape",
    explanation: clean(
      `Every rule you've practised — the right hand, the title, the time-of-day greeting — is a way of saying 'I see you, and I honour you'. The lesson below tells that as a story. It is composed for this journey and NOT yet a verified traditional account. ${greetingExample}`,
    ),
    phrases: pickPhrases(DAY1_GREETINGS, corpus).slice(0, 3),
  };

  const deterministicStory = {
    title: "The Right Hand",
    text: clean(
      `An elder sat at the edge of the courtyard as visitors arrived. Each visitor came with the right hand open and the correct greeting for the time of day — and he answered each one. Then a young man rushed in, hardly looking up, and put out his left hand with a distracted 'hey'. The elder simply folded his hands and waited until the young man offered the right hand and said a proper greeting, at which point the courtyard opened to him. "My child," the elder said, "the greeting is not politeness — it is how we show each other that we matter." ${greetingExample}`,
    ),
  };

  const scenario: ScenarioQuestion[] = [
    {
      question: "The young man's mistake was…",
      choices: ["Offering the left hand and skipping a real greeting", "Arriving too late", "Not bringing a gift", "Speaking English"],
      correctIndex: 0,
      explanation: "Once he offers the right hand and greets properly, the courtyard welcomes him.",
      concept: "etiquette",
    },
    {
      question: "What does the elder's patience teach about respect?",
      choices: [
        "Respect is a formality you can skip when busy",
        "Respect comes first, and love follows it",
        "Only elders deserve respect",
        "Handshakes are optional",
      ],
      correctIndex: 1,
      explanation: "The greeting is how Asante culture shows that each person matters.",
      concept: "etiquette",
    },
  ];

  const familyMission: FamilyMission = def.familyMission ?? {
    question: "Ask a family member: What story were you told as a child about why we respect elders?",
    relatedConcept: "story",
    why: "Stories are how this meaning travels through families. Yours has one too.",
  };

  return {
    day: 4,
    dayType: "lesson",
    title: def.title,
    theme: def.theme,
    claim: def.claim,
    hook: def.hook,
    estimatedMinutes: def.estimatedMinutes,
    concept,
    practice: [],
    scenario,
    story: { ...deterministicStory, verified: false },
    familyMission,
    flex: def.flex,
    sources: toSources(hits),
    mode: "rag",
  };
}

// ─── Day 5: Family ─────────────────────────────────────────────────────────────

function buildDay5(
  profile: UserProfile,
  progress: LearningProgress,
  hits: ContextHit[],
): DayLesson {
  const def = journeyDay(5)!;

  const question = personalizeFamilyQuestion(profile);
  const familyMission: FamilyMission = {
    question,
    relatedConcept: "family",
    why: def.familyMission?.why ?? "The answer you bring back belongs in your culture bank.",
  };

  const scenario: ScenarioQuestion[] = [
    {
      question: "A family member is hesitant to answer. What do you do?",
      choices: ["Let it go and drop the question", "Share the greeting you learned today first, then ask again warmly", "Answer for them", "Record them secretly"],
      correctIndex: 1,
      explanation: "Leading with your own lesson opens the door — the mission is a gift, not an interrogation.",
      concept: "family",
    },
    {
      question: "What's the most valuable thing you can bring back?",
      choices: ["Their exact words and the story behind them", "Just a yes or no", "A photo of the food", "Their phone number"],
      correctIndex: 0,
      explanation: "Save what they say into your culture bank — that's the discovery Day 6 will reflect on.",
      concept: "family",
    },
  ];

  const concept: ConceptBlock = {
    title: "Go Ask Someone Who Knows",
    explanation:
      "Today has no new material. Your mission is one question, asked with the respect you've been practising — and the answer becomes yours. Use the greeting you know, use the right hand, then ask.",
    phrases: [],
  };

  return {
    day: 5,
    dayType: "family",
    title: def.title,
    theme: def.theme,
    claim: def.claim,
    hook: def.hook,
    estimatedMinutes: def.estimatedMinutes,
    concept,
    practice: [],
    scenario,
    familyMission,
    flex: def.flex,
    sources: toSources(hits),
    mode: "rag",
  };
}

/** Day 5's question is personalised from the learner's profile. */
function personalizeFamilyQuestion(profile: UserProfile): string {
  const style = profile.preferredLearningStyle;
  const level = profile.familyKnowledgeLevel;
  const goals = profile.learningGoals;

  if (goals.includes("history")) {
    return "Ask a family member: What's one story from our family's past that no one should forget?";
  }
  if (goals.includes("family-heritage") || style === "family") {
    return "Ask a family member: When you think of our family's Asante heritage, what's the first thing that comes to mind — and why?";
  }
  if (style === "speaking") {
    return "Ask a family member: Do you remember any Asante Twi phrase from our family? Say it for me, and tell me when it was used.";
  }
  if (style === "events") {
    return "Ask a family member: What should I know or do before I walk into a big family gathering for the first time?";
  }
  if (level === "almost-nothing" || level === "not-sure" || level === "very-little") {
    return "Ask any family member: Is there a greeting, a saying, or a story from our Asante side you could share with me to start with?";
  }
  return "Ask an elder in your family: What was the first thing your parents taught you about greeting and respect?";
}

// ─── Day 6: Reflection ─────────────────────────────────────────────────────────

function buildDay6(
  profile: UserProfile,
  progress: LearningProgress,
  hits: ContextHit[],
): Day6Reflection {
  const counts = {
    phrases: progress.practicedConcepts.length + progress.cultureBank.filter((c) => c.category === "word").length,
    concepts: progress.learnedConcepts.length,
    stories: progress.cultureBank.filter((c) => c.category === "story").length,
    discoveries: progress.familyDiscoveries.length,
  };

  const insight = `Over your journey you have practised ${counts.phrases} phrase${counts.phrases === 1 ? "" : "s"}, gathered ${counts.concepts} concept${counts.concepts === 1 ? "" : "s"}, and collected ${counts.discoveries} discovery ${counts.discoveries === 1 ? "from your own family" : "from your own family"}. The greeting you can now give is the greeting your family would have used.`;

  const recommendation = recommendNext(profile, progress);

  const bankSelect = [...progress.cultureBank].slice(-3).reverse();

  return {
    day: 6,
    title: journeyDay(6)!.title,
    hook: journeyDay(6)!.hook,
    summary: {
      language: progress.practicedConcepts.filter((c) => ["greetings", "politeness"].includes(c.concept)).length,
      culture: progress.learnedConcepts.length,
      history: counts.stories,
      family: counts.discoveries,
    },
    counts,
    interests: profile.learningGoals.map((g) => GOAL_LABELS[g]),
    insight,
    recommendation,
    bankSelect,
    sources: toSources(hits),
    mode: "rag",
  };
}

function recommendNext(profile: UserProfile, progress: LearningProgress): string {
  const weakest = Object.entries(progress.confidenceScores).sort(
    (a, b) => a[1] - b[1],
  )[0];
  if (weakest) {
    return `Your ${weakest[0]} needs a little more care — spend a minute reviewing it before Day 7, then you're ready to show what you know.`;
  }
  return "You've been consistent — Day 7 is your chance to shine at a real gathering. Re-read the greetings one more time, then go.";
}

// ─── Day 7: Challenge ──────────────────────────────────────────────────────────

const CORE_STEPS: ScenarioQuestion[] = [
  {
    question: "It's morning in Kumasi and your grandmother (Maame) greets you first. You say…",
    choices: ["Maakye, Maame", "Maadwo, Maame", "Owura, maaha", "Yaa nua"],
    correctIndex: 0,
    explanation: "Morning + elder woman → 'Maakye, Maame'.",
    concept: "greetings",
  },
  {
    question: "Maame answers. Which reply does an older woman give you?",
    choices: ["Yaa ena", "Yaa agya", "Yaa nua", "Medaase"],
    correctIndex: 0,
    explanation: "An older woman's reply is 'Yaa ena'.",
    concept: "greetings",
  },
  {
    question: "An ɔpanyin (male elder) walks into the courtyard at midday. You greet him with…",
    choices: ["Owura, maaha", "Awuraa, maakye", "Onua, maadwo", "Mepa wo kyɛw"],
    correctIndex: 0,
    explanation: "Afternoon + older man → 'Owura, maaha'.",
    concept: "greetings",
  },
  {
    question: "Your cousin offers his LEFT hand to shake. You…",
    choices: [
      "Take it — any hand works",
      "Offer your right hand and greet him properly",
      "Refuse to greet him",
      "Tap his shoulder instead",
    ],
    correctIndex: 1,
    explanation: "Only the right hand is used for handshakes.",
    concept: "etiquette",
  },
  {
    question: "An auntie asks 'Wo ho te sɛn?' — you're fine. You reply…",
    choices: ["Me ho yɛ", "Wo ho te sɛn", "Mepa wo kyɛw", "Medaase"],
    correctIndex: 0,
    explanation: "'I am fine' is the answer to 'Wo ho te sɛn?'.",
    concept: "politeness",
  },
  {
    question: "Before the meal, everyone thanks the elder who prepared it. Which phrase fits?",
    choices: ["Meda wo ase", "Maaha", "Yaa agya", "Onua"],
    correctIndex: 0,
    explanation: "Meda wo ase — 'I lay at your feet', thank you.",
    concept: "politeness",
  },
];

function buildDay7(
  profile: UserProfile,
  progress: LearningProgress,
  hits: ContextHit[],
): Day7Challenge {
  const counts = {
    phrases: progress.practicedConcepts.length + progress.cultureBank.filter((c) => c.category === "word").length,
    concepts: progress.learnedConcepts.length,
    stories: progress.cultureBank.filter((c) => c.category === "story").length,
    discoveries: progress.familyDiscoveries.length,
  };

  const weakFirst: Day7Challenge["steps"] = [...CORE_STEPS]
    .map((s, i): Day7Challenge["steps"][number] => ({
      id: `step-${i + 1}`,
      prompt: s.question,
      choices: s.choices,
      correctIndex: s.correctIndex,
      explanation: s.explanation,
      concept: s.concept,
    }))
    .sort((a, b) => {
    const wa = progress.confidenceScores[a.concept] ?? 0.5;
    const wb = progress.confidenceScores[b.concept] ?? 0.5;
    if (weakestConcept(progress)[0] === a.concept) return -1;
    if (weakestConcept(progress)[0] === b.concept) return 1;
    return wa - wb;
  });

  const summary = counts;
  return {
    day: 7,
    title: journeyDay(7)!.title,
    scene:
      "You arrive at a family gathering in Kumasi. Elders are seated by the courtyard wall, cousins are laughing by the door, and the aunties are already asking after your health. Show the family what seven days have taught you.",
    steps: weakFirst,
    summary,
    chapter:
      "Seven days. One journey. You can now walk into that gathering — and the respect you carry will open every door in it.",
    sources: toSources(hits),
    mode: "rag",
  };
}

function weakestConcept(progress: LearningProgress): [string, number] {
  const entries = Object.entries(progress.confidenceScores);
  if (entries.length === 0) return ["", 0.5];
  return entries.sort((a, b) => a[1] - b[1])[0];
}

// ─── LLM refinement (prose-only — structured content stays deterministic) ─────

async function refineLessonProse(lesson: DayLesson, hits: ContextHit[]): Promise<DayLesson> {
  if (lesson.day === 4 || lesson.day === 5) return lesson;
  const json = await refineJSON<{ concept?: string; culturalInsight?: string }>(
    `Compose a warm, conversational explanation for day ${lesson.day} of the journey (title: "${lesson.title}"). The learner is ${lesson.concept?.phrases?.length ?? 0 > 0 ? "learning these phrases: " + (lesson.concept?.phrases?.map((p) => `${p.twi} (${p.english})`).join(", ") ?? "") : "preparing for a family conversation"}. Replace ONLY the concept explanation body and the optional cultural insight. Return JSON as {"concept":"...","culturalInsight":"..."}. Keep the concept under 4 sentences.`,
    hits,
  );
  if (!json) return lesson;
  return {
    ...lesson,
    concept: json.concept ? { ...lesson.concept!, explanation: json.concept } : lesson.concept,
    culturalInsight: json.culturalInsight ?? lesson.culturalInsight,
    mode: "rag",
  };
}

async function refineDay4Story(lesson: DayLesson, hits: ContextHit[]): Promise<DayLesson> {
  if (lesson.day !== 4 || !lesson.story) return lesson;
  const json = await refineJSON<{ story?: { title?: string; text?: string } }>(
    `Write a short traditional-style tale (under 220 words) that a grandparent in Asante might tell, showing WHY greeting elders properly and shaking only with the right hand matters. Ground it in the retrieved sources — use only names and phrases that appear there. Do not invent historical figures. Return JSON as {"story":{"title":"...","text":"..."}}. It will be shown to the learner with a banner saying it is an unverified account, so do not present it as historically certain.`,
    hits,
  );
  if (!json?.story?.text) return lesson;
  return {
    ...lesson,
    story: {
      ...lesson.story,
      title: json.story.title?.trim() || lesson.story.title,
      text: json.story.text.trim(),
      verified: false,
    },
  };
}

async function refineReflection(
  reflection: Day6Reflection,
  hits: ContextHit[],
): Promise<Day6Reflection> {
  const counts = reflection.counts;
  const json = await refineJSON<{ insight?: string; recommendation?: string }>(
    `The learner finished ${counts.discoveries} family discoveries, practised ${counts.phrases} phrases, and learned ${counts.concepts} concepts. Write a warm 2-3 sentence insight celebrating their progress and a 1-sentence recommendation for Day 7. Return JSON as {"insight":"...","recommendation":"..."}.`,
    hits,
  );
  if (!json) return reflection;
  return {
    ...reflection,
    insight: json.insight ?? reflection.insight,
    recommendation: json.recommendation ?? reflection.recommendation,
    mode: "rag",
  };
}

async function refineChallenge(
  challenge: Day7Challenge,
  hits: ContextHit[],
): Promise<Day7Challenge> {
  const json = await refineJSON<{ scene?: string; chapter?: string }>(
    `Rewrite the opening scene of a family gathering in Kumasi (under 3 sentences, warm and vivid) and a closing chapter line (1 sentence) that celebrates the learner finishing a 7-day Asante culture journey. Return JSON as {"scene":"...","chapter":"..."}.`,
    hits,
  );
  if (!json) return challenge;
  return {
    ...challenge,
    scene: json.scene ?? challenge.scene,
    chapter: json.chapter ?? challenge.chapter,
    mode: "rag",
  };
}

// ─── Public generator ───────────────────────────────────────────────────────────

/**
 * Generate the content for a journey day. Deterministic structure (phrases,
 * scenarios, steps) grounded in the retrieved knowledge base, with optional
 * LLM refinement of prose only — so scoring stays exact and content stays
 * accurate even with no provider configured.
 */
export async function generateDay(
  day: number,
  profile: UserProfile,
  progress: LearningProgress,
  hour = new Date().getHours(),
): Promise<JourneyContent> {
  const def = journeyDay(day);
  if (!def) throw new Error(`Unknown day ${day}`);
  const part: DayPart = dayPartFromHour(hour);

  const retrieval = def.retrieval;
  const hits = await retrieveForDay(day, retrieval, 6);
  const context = toContext(hits.map((h) => h.chunk));

  const base: JourneyContent =
    day === 6
      ? buildDay6(profile, progress, context)
      : day === 7
        ? buildDay7(profile, progress, context)
        : day === 5
          ? buildDay5(profile, progress, context)
          : day === 4
            ? buildDay4(profile, progress, context)
            : day === 3
              ? buildDay3(profile, progress, context)
              : day === 2
                ? buildDay2(profile, progress, context)
                : buildDay1(profile, progress, context, part);

  if (day === 6) return refineReflection(base as Day6Reflection, context);
  if (day === 7) return refineChallenge(base as Day7Challenge, context);

  let lesson = base as DayLesson;
  if (day === 4) lesson = await refineDay4Story(lesson, context);
  return refineLessonProse(lesson, context);
}

export { JOURNEY_DAYS }; // re-export so API/UI share one scaffold source
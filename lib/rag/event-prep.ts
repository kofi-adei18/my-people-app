import type {
  EventPrepJourney,
  EventPrepStep,
  Phrase,
  PrepDetails,
  PrepQuizQuestion,
  UserProfile,
} from "@/lib/types";
import { retrieve } from "@/lib/rag/index";
import {
  formatContext,
  formatProfile,
  sourceReferences,
  type ContextHit,
} from "@/lib/rag/prompt";
import { tryLLM, extractJson } from "@/lib/rag/llm-utils";
import { PREP_STEP_ORDER } from "@/lib/constants";

/**
 * Manual event-prep journey pipeline.
 *
 * Unlike the calendar briefing (curated playbooks, LLM refines prose only),
 * prep journeys describe events the learner typed in — naming ceremony,
 * outdooring, chieftaincy gathering, anything Akan. The LLM generates the
 * whole structure, but under strict grounding:
 * - The retrieved corpus is the only source of cultural claims.
 * - Twi phrases are restricted to a corpus-gated allowlist.
 * - Every step is stamped verified:false; family confirmation is built in.
 * With no API key, a deterministic generic-Akan-gathering skeleton is
 * returned so the demo never breaks.
 */

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function toContext(hits: {
  text: string;
  sourceTitle: string;
  page?: number;
  meta?: import("@/lib/types").ChunkMetadata;
}[]): ContextHit[] {
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

/** Corpus-gated universal phrases — the ONLY Twi the LLM may use. */
const PHRASE_ALLOWLIST: (Phrase & { tokens: string[] })[] = [
  { twi: "Maakye", english: "Good morning", notes: "Lead with the time-of-day greeting", tokens: ["maakye"] },
  { twi: "Maaha", english: "Good afternoon", tokens: ["maaha"] },
  { twi: "Maadwo", english: "Good evening", tokens: ["maadwo"] },
  { twi: "Owura", english: "Sir / Mr", tokens: ["owura"] },
  { twi: "Awuraa", english: "Ma'am / Lady", tokens: ["awuraa"] },
  { twi: "Maame", english: "An adult woman your mother's age", tokens: ["maame"] },
  { twi: "Nana", english: "A chief, or an honoured elder", tokens: ["nana"] },
  { twi: "Mepa wo kyɛw", english: "Please — 'I remove my hat to you'", tokens: ["mepa wo kyɛw"] },
  { twi: "Meda wo ase", english: "Thank you — 'I lay at your feet'", tokens: ["meda wo ase"] },
];

/** Deterministic fallback used when no LLM key is configured. */
function fallbackSteps(): EventPrepStep[] {
  return [
    {
      id: "what",
      title: "What is it?",
      body: "You've told us the name of the gathering, but the knowledge base doesn't have a write-up for this exact event yet. What an event is called usually tells you its purpose — ask your family for one sentence about why people gather, and hold that as your anchor for everything below.",
      verified: false,
    },
    {
      id: "happens",
      title: "What will happen",
      body: "Akan gatherings move through periods: arrivals and greetings, speeches or rites, and a shared moment before people disperse. Ask your family what the middle of this one looks like so you're not caught off guard by the flow.",
      verified: false,
    },
    {
      id: "who",
      title: "Who matters",
      body: "Elders and chiefs carry the room. A chief or honoured elder is addressed as Nana; an adult woman about your mother's age is Maame; an older man is Owura. Greet the most senior people first and wait to be introduced rather than assuming.",
      verified: false,
    },
    {
      id: "say",
      title: "What to say",
      body: "Arrive greeting — a time-of-day greeting plus a respectful title opens almost any door. Keep your Twi short and polite; effort is received better than fluency.",
      phrases: [],
      verified: false,
    },
    {
      id: "wear",
      title: "What to wear",
      body: "Err towards modest and covered; if the family wears cloth, match their tone rather than outshining it. When in doubt, ask one simple question before the day: 'what are people wearing?'",
      verified: false,
    },
    {
      id: "avoid",
      title: "What not to do",
      body: "Don't push to the front, don't interrupt proceedings for photos, and never point at a chief. If something starts that you don't understand, stay calm and follow the room — elders will guide you.",
      verified: false,
    },
  ];
}

function fallbackQuiz(): PrepQuizQuestion[] {
  return [
    {
      question: "You arrive and see an elderly woman you don't know. What's the safe move?",
      options: [
        "Wait near the entrance until someone notices you",
        "Greet her first, using a respectful title like Maame",
        "Walk past her to find your seat",
        "Shake her hand firmly with your left hand",
      ],
      correctIndex: 1,
      explanation:
        "Greeting elders first is the backbone of Akan etiquette — a respectful title plus a time-of-day greeting is almost always right. (Practices vary; confirm with your family.)",
    },
    {
      question: "Which hand should you offer when shaking hands or receiving something?",
      options: ["Your left hand", "Your right hand", "Whichever is closer", "Both hands together"],
      correctIndex: 1,
      explanation:
        "The right hand is the hand of respect across Akan settings. (The corpus confirms this general rule; specifics vary by family.)",
    },
    {
      question: "You're unsure whether photos are welcome. What should you do?",
      options: [
        "Take photos discreetly and ask later if anyone objects",
        "Ask an elder or your family contact before raising your phone",
        "Photograph freely — ceremonies are public",
        "Only photograph the chief from the front",
      ],
      correctIndex: 1,
      explanation:
        "Asking first costs you nothing and signals respect; pointing a camera at a chief or a rite uninvited does not.",
    },
  ];
}

function fallbackChecklist(): string[] {
  return [
    "Confirm the exact time and place with your family",
    "Ask what people are wearing, and match that tone",
    "Practise your greeting out loud once",
    "Ask one family member what the event is for, in a sentence",
    "Confirm with your family what you should NOT do there",
    "Plan to arrive early enough to greet before proceedings begin",
  ];
}

export interface GeneratePrepInput {
  eventTitle: string;
  /** Epoch ms; 0 when unknown. */
  eventDate: number;
  details: PrepDetails;
  profile: UserProfile;
}

export type PrepFailure =
  | { ok: true; journey: EventPrepJourney }
  | { ok: false; reason: "not-cultural" | "error"; message: string };

function journeyId(): string {
  return `prep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Normalise whatever the LLM returned into a safe journey, or null. */
function buildFromLLM(
  parsed: unknown,
  input: GeneratePrepInput,
  allowedPhrases: Phrase[],
  context: ContextHit[],
  summaryFallback: string,
): EventPrepJourney | null {
  const raw = parsed as {
    eventTypeGuess?: string;
    summary?: string;
    grounded?: string;
    steps?: { id?: string; title?: string; body?: string; items?: unknown }[];
    quiz?: unknown;
    checklist?: unknown;
  };
  if (!raw || !Array.isArray(raw.steps) || raw.steps.length === 0) return null;

  const byId = new Map<string, { title?: string; body?: string; items?: unknown }>();
  for (const s of raw.steps) {
    if (s?.id) byId.set(String(s.id), s);
  }

  const steps: EventPrepStep[] = [];
  for (const id of PREP_STEP_ORDER) {
    const s = byId.get(id);
    if (!s || typeof s.body !== "string" || s.body.trim().length < 20) return null;
    steps.push({
      id,
      title: clean(String(s.title ?? "")) || fallbackStepTitle(id),
      body: clean(s.body),
      phrases: id === "say" ? allowedPhrases : undefined,
      items:
        id === "who" && Array.isArray(s.items)
          ? s.items.filter((i): i is string => typeof i === "string").slice(0, 8)
          : undefined,
      verified: false,
    });
  }

  const quiz = sanitizeQuiz(raw.quiz);
  if (quiz.length < 3) return null;

  const checklist = sanitizeChecklist(raw.checklist);
  if (checklist.length < 4) return null;

  return {
    id: journeyId(),
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    eventTypeGuess: clean(String(raw.eventTypeGuess ?? "")) || undefined,
    details: input.details,
    summary: clean(String(raw.summary ?? "")) || summaryFallback,
    steps,
    quiz,
    checklist,
    grounding: raw.grounded === "low" ? "low" : "high",
    sources: sourceReferences(context),
    mode: "rag",
    createdAt: Date.now(),
  };
}

function fallbackStepTitle(id: EventPrepStep["id"]): string {
  const titles: Record<EventPrepStep["id"], string> = {
    what: "What is it?",
    happens: "What will happen",
    who: "Who matters",
    say: "What to say",
    wear: "What to wear",
    avoid: "What not to do",
  };
  return titles[id];
}

function sanitizeQuiz(raw: unknown): PrepQuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: PrepQuizQuestion[] = [];
  for (const q of raw) {
    const qq = q as {
      question?: unknown;
      options?: unknown;
      correctIndex?: unknown;
      explanation?: unknown;
    };
    if (
      typeof qq.question !== "string" ||
      !Array.isArray(qq.options) ||
      qq.options.length < 3 ||
      qq.options.length > 5
    ) {
      continue;
    }
    const options = qq.options
      .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
      .slice(0, 5);
    const correctIndex = Number(qq.correctIndex);
    if (options.length < 3 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      continue;
    }
    out.push({
      question: clean(qq.question),
      options,
      correctIndex,
      explanation:
        typeof qq.explanation === "string" ? clean(qq.explanation) : "Practices vary — confirm with your family.",
    });
    if (out.length >= 5) break;
  }
  return out;
}

function sanitizeChecklist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is string => typeof i === "string" && i.trim().length > 3)
    .map((i) => clean(i))
    .slice(0, 10);
}

/** Build the journey. Always succeeds (fallback when the LLM is absent). */
export async function generateEventPrep(
  input: GeneratePrepInput,
): Promise<PrepFailure> {
  const query = [
    "asante akan",
    input.eventTitle,
    input.details.role,
    input.details.region,
    "greetings respect elder etiquette tradition ceremony",
  ]
    .filter(Boolean)
    .join(" ");

  const hits = await retrieve(query, {}, 8);
  const context = toContext(hits.map((h) => h.chunk));
  const sources = sourceReferences(context);

  const corpus = context.map((c) => c.text).join(" ").toLowerCase();
  const allowedPhrases = PHRASE_ALLOWLIST.filter((p) =>
    p.tokens.every((t) => corpus.includes(t.toLowerCase())),
  ).map((p) => ({ twi: p.twi, english: p.english, pronunciation: p.pronunciation, notes: p.notes }));

  const groundingLow = hits.length === 0;
  const summaryFallback = groundingLow
    ? "The knowledge base doesn't cover this event well, so this is general Akan-gathering preparation — treat it as a starting point and lean on your family for the specifics."
    : "Here's your preparation for this gathering, grounded in the My People knowledge base where it could be — confirm the specifics with your family before the day.";

  const llm = await tryLLM(PREP_SYSTEM, prepUserPrompt(input, context, allowedPhrases, groundingLow), 2000);
  if (llm.ok) {
    const parsed = extractJson<unknown>(llm.content);
    if (parsed && (parsed as { notCultural?: unknown }).notCultural === true) {
      return {
        ok: false,
        reason: "not-cultural",
        message:
          "My People prepares you for Akan cultural gatherings — naming ceremonies, outdooring, funerals, festivals, family occasions. That event looks outside that scope, so the tutor would be guessing rather than teaching.",
      };
    }
    const built = buildFromLLM(parsed, input, allowedPhrases, context, summaryFallback);
    if (built) return { ok: true, journey: built };
  }

  // ─── Fallback: deterministic generic-Akan-gathering skeleton ───
  const steps = fallbackSteps().map((s) =>
    s.id === "say" ? { ...s, phrases: allowedPhrases } : s,
  );
  const journey: EventPrepJourney = {
    id: journeyId(),
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    eventTypeGuess: undefined,
    details: input.details,
    summary: summaryFallback,
    steps,
    quiz: fallbackQuiz(),
    checklist: fallbackChecklist(),
    grounding: groundingLow ? "low" : "high",
    sources,
    mode: "rag",
    createdAt: Date.now(),
  };
  return { ok: true, journey };
}

// ─── Prompting ─────────────────────────────────────────────────────────────────

const PREP_SYSTEM = `You are the Asante culture tutor inside My People, preparing a learner for an Akan cultural event they described themselves. You write in a warm, plain, beginner-friendly voice.

Rules (in priority order): Accuracy before Relevance before Simplicity before Memorability.
1. Ground EVERY explanation in the retrieved sources given. Never invent traditions, phrases, titles, names, or customs. If the sources don't cover a detail, say what is generally safe and explicitly tell the learner to confirm with their family.
2. Flag uncertainty. Practices vary between families, towns and Akan subgroups (Asante, Fante, Akuapem...). Never present one group's practice as universal.
3. Scope: My People prepares learners for Akan cultural gatherings (naming ceremony/outdooring, funeral, wedding, festival, chieftaincy occasion, family gathering...). If the described event is clearly NOT an Akan/cultural gathering (job interview, work party, sports event, non-Ghanaian occasion), set "notCultural": true and skip everything else.
4. Twi: you may ONLY use phrases from the ALLOWED PHRASES list. Never write any other Twi word or phrase.
5. Keep each step body under 5 sentences. Quiz explanations under 2 sentences.
6. Return valid JSON only, no markdown fences, with exactly this shape:
{"eventTypeGuess":"...","summary":"2-3 sentences","grounded":"high"|"low","notCultural":false,
 "steps":[{"id":"what","title":"...","body":"..."},{"id":"happens",...},{"id":"who","title":"...","body":"...","items":["..."]},{"id":"say","title":"...","body":"..."},{"id":"wear",...},{"id":"avoid",...}],
 "quiz":[{"question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}, ...3-5 items],
 "checklist":["...","..."]}

Step ids and titles are fixed: what (What is it? — what the event is about), happens (What will happen — the flow of the gathering), who (Who matters — key people and how to address them; add "items" with 3-6 names/roles), say (What to say — greetings and polite moves), wear (What to wear), avoid (What not to do).
Set "grounded":"low" when the retrieved sources barely cover this event type.
The checklist is a day-of checklist: 5-8 concrete, checkable things to do before or on the day.`;

function prepUserPrompt(
  input: GeneratePrepInput,
  context: ContextHit[],
  allowedPhrases: Phrase[],
  groundingLow: boolean,
): string {
  const d = input.details;
  const date = input.eventDate
    ? new Date(input.eventDate).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "no date given";

  return `The learner is preparing for this event: "${input.eventTitle}" (${date}).
Their details:
- Role at the event: ${d.role?.trim() || "unspecified"}
- Where: ${d.region?.trim() || "unspecified"}
- Notes: ${d.notes?.trim() || "none"}

Learner profile: ${formatProfile(input.profile)}

ALLOWED PHRASES (the only Twi you may reference — pick whichever genuinely apply):
${allowedPhrases.length > 0 ? allowedPhrases.map((p) => `- ${p.twi} — ${p.english}${p.notes ? ` (${p.notes})` : ""}`).join("\n") : "- (none confirmed against the corpus; write the say step without Twi and point the learner to their family)"}

${groundingLow ? "NOTE: retrieval found little relevant material for this event — set grounded to 'low' and keep claims general and safety-first." : ""}

Retrieved sources from the My People knowledge base:
${formatContext(context)}

Generate the prep journey now as the JSON described in the rules.`;
}

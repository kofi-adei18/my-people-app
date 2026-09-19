import { retrieve } from "@/lib/rag/index";
import { tryLLM, extractJson } from "@/lib/rag/llm-utils";
import type { SourceReference } from "@/lib/types";
import type {
  ExtractedStory,
  FamilyKnowledge,
  FamilyStory,
} from "@/lib/family/types";

// ─── AI capabilities for the family loop ──────────────────────────────────────
// Exactly three: question suggestion, story extraction, family Q&A.
// Every call funnels through tryLLM and has a deterministic fallback so the
// demo never breaks when no provider key is configured.

const MAX_QUESTION_CHARS = 8000;

function clampList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 120))
    .slice(0, max);
}

// ─── 1. Question suggestion ───────────────────────────────────────────────────

const FALLBACK_QUESTIONS = [
  "Why was I given my name?",
  "Where does our family come from?",
  "What traditions did Grandma and Grandpa always keep?",
  "What was Grandfather like when he was young?",
  "What language did you grow up speaking at home?",
  "How did you and Mum meet?",
];

export interface QuestionSuggestion {
  label: string;
  question: string;
}

function knowledgeSummary(knowledge: FamilyKnowledge): string {
  const lines = [
    knowledge.origins.length ? `Origins: ${knowledge.origins.join("; ")}` : null,
    knowledge.people.length ? `People already in the story: ${knowledge.people.join("; ")}` : null,
    knowledge.traditions.length ? `Traditions: ${knowledge.traditions.join("; ")}` : null,
    knowledge.names.length ? `Names: ${knowledge.names.join("; ")}` : null,
    knowledge.languages.length ? `Languages: ${knowledge.languages.join("; ")}` : null,
  ].filter(Boolean);
  return lines.join("\n") || "Nothing has been collected yet.";
}

export async function suggestQuestions(
  childName: string,
  knowledge: FamilyKnowledge,
): Promise<QuestionSuggestion[]> {
  const system = `You help a child discover their family heritage by suggesting short, meaningful questions to ask their parent or grandparent. Each question must be something a family member can answer from memory about THEIR OWN family (not general knowledge), and must not already be covered by what the family has shared. Reply with valid JSON only, no markdown fences: {"questions":[{"label":"3-6 word summary","question":"the full question"}]} with exactly 4 questions.`;
  const user = `The child's name is ${childName}. This is what the family has already shared:\n${knowledgeSummary(knowledge)}\n\nSuggest 4 new questions ${childName} could ask.`;

  const llm = await tryLLM(system, user, 500);
  if (llm.ok) {
    const parsed = extractJson<{ questions?: { label?: string; question?: string }[] }>(
      llm.content,
    );
    const questions = parsed?.questions
      ?.map((q) => ({
        label: (q.label ?? q.question ?? "").trim().slice(0, 60),
        question: (q.question ?? "").trim().slice(0, 300),
      }))
      .filter((q) => q.question);
    if (questions && questions.length > 0) return questions.slice(0, 4);
  }

  return FALLBACK_QUESTIONS.slice(0, 4).map((q) => ({ label: q, question: q }));
}

// ─── 2. Story extraction ──────────────────────────────────────────────────────

interface TranscriptTurn {
  sender: "child" | "relative";
  text: string;
  isNew: boolean;
}

export interface ExtractionResult {
  stories: ExtractedStory[];
  mode: "llm" | "fallback";
}

export async function extractStories(
  turns: TranscriptTurn[],
): Promise<ExtractionResult> {
  const transcript = turns
    .map((t) => {
      const who = t.sender === "child" ? "Child" : "Family member";
      const marker =
        t.isNew && t.sender === "relative" ? " [NEW ANSWER]" : " [ALREADY PRESERVED]";
      return `${who}${marker}: ${t.text}`;
    })
    .join("\n\n")
    .slice(0, MAX_QUESTION_CHARS);

  const system = `You preserve family memories. You are given a chat transcript between a child and a family member (usually the parent). Separate the family member's NEW answers into one or more self-contained family stories.

STRICT RULES:
- ONLY extract from messages marked [NEW ANSWER]. Messages marked [ALREADY PRESERVED] are context only — never re-extract them, even if they look interesting.
- Only use facts actually said in the transcript. NEVER invent names, places, dates, people or traditions. If a detail was not mentioned, leave it out.
- Each story should cover one coherent topic (a name, a place, a tradition, a person…). Split a NEW answer into multiple stories only when it naturally covers several distinct topics.
- Write each story in third person, referring to the family member as "Dad" (or the relation used in the transcript). Keep it warm but factual, 2-6 sentences.
- "names" lists names WITH their meaning as stated (e.g. "Kwame — Saturday-born"). Empty array if none.
- If the NEW answers contain nothing substantive, return an empty list.

Reply with valid JSON only, no markdown fences:
{"stories":[{"title":"short evocative title","story":"the narrative","topics":["..."],"people":["..."],"places":["..."],"traditions":["..."],"languages":["..."],"names":["..."]}]}`;

  const user = `Transcript:\n\n${transcript}`;

  const llm = await tryLLM(system, user, 1200);
  if (llm.ok) {
    const parsed = extractJson<{ stories?: ExtractedStory[] }>(llm.content);
    const stories = (parsed?.stories ?? [])
      .map((s) => ({
        title: (s.title ?? "").trim().slice(0, 120),
        story: (s.story ?? "").trim().slice(0, 4000),
        topics: clampList(s.topics),
        people: clampList(s.people),
        places: clampList(s.places),
        traditions: clampList(s.traditions),
        languages: clampList(s.languages),
        names: clampList(s.names),
      }))
      .filter((s) => s.title && s.story);
    if (stories.length > 0) return { stories, mode: "llm" };
    if (parsed) return { stories: [], mode: "llm" };
  }

  return { stories: fallbackStories(turns), mode: "fallback" };
}

/** No provider key (or bad response): preserve the answer verbatim as one story. */
function fallbackStories(turns: TranscriptTurn[]): ExtractedStory[] {
  const answers = turns.filter((t) => t.isNew && t.sender === "relative");
  if (answers.length === 0) return [];
  const question = turns.find((t) => t.sender === "child")?.text ?? "";
  const text = answers.map((a) => a.text).join("\n\n");
  if (!text.trim()) return [];
  return [
    {
      title: question.trim()
        ? `About: ${question.trim().slice(0, 60)}`
        : "A Family Answer",
      story: text.slice(0, 4000),
      topics: [],
      people: [],
      places: [],
      traditions: [],
      languages: [],
      names: [],
    },
  ];
}

// ─── 3. Family Q&A ────────────────────────────────────────────────────────────

export interface FamilyAnswer {
  family: string;
  cultural: string;
  sources: SourceReference[];
  mode: "llm" | "fallback";
}

function storiesContext(stories: FamilyStory[]): string {
  return stories
    .map(
      (s) =>
        `- "${s.title}" (told by ${s.speaker}): ${s.story}\n  Topics: ${s.topics.join(", ") || "—"}`,
    )
    .join("\n");
}

export async function answerFamilyQuestion(
  question: string,
  stories: FamilyStory[],
): Promise<FamilyAnswer> {
  // Verified cultural context from the curated RAG index.
  const hits = await retrieve(question, {}, 4);
  const sources: SourceReference[] = hits.map((h) => ({
    title: h.chunk.sourceTitle,
    page: h.chunk.page,
    url: h.chunk.meta?.source_url,
    authority: h.chunk.meta?.authority_level,
    specificity: h.chunk.meta?.asante_specificity,
    verified: h.chunk.meta?.verified,
  }));
  const culturalContext = hits
    .map((h) => `[${h.chunk.sourceTitle}]\n${h.chunk.text}`)
    .join("\n\n")
    .slice(0, 6000);

  const system = `You answer questions about a family's heritage in TWO clearly separated parts.

PART 1 — "family": What the family has actually shared. Use ONLY the collected family stories below. Quote or attribute them ("Dad says…"). If the stories don't cover the question, say plainly that the family hasn't shared this yet — NEVER fill gaps with general knowledge or invention.

PART 2 — "cultural": Helpful cultural context about the wider culture, grounded in the provided verified sources. 2-4 sentences. If no source is relevant, return an empty string.

Reply with valid JSON only, no markdown fences: {"family":"...","cultural":"..."}`;

  const user = `Question: ${question}

Collected family stories:
${stories.length > 0 ? storiesContext(stories) : "(none collected yet)"}

Verified cultural sources:
${culturalContext || "(none retrieved)"}`;

  const llm = await tryLLM(system, user, 900);
  if (llm.ok) {
    const parsed = extractJson<{ family?: string; cultural?: string }>(llm.content);
    if (parsed?.family) {
      return {
        family: parsed.family.trim(),
        cultural: (parsed.cultural ?? "").trim(),
        sources,
        mode: "llm",
      };
    }
  }

  return { ...fallbackAnswer(question, stories), sources, mode: "fallback" };
}

function fallbackAnswer(
  question: string,
  stories: FamilyStory[],
): { family: string; cultural: string } {
  const words = question
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const relevant = stories
    .map((s) => {
      const haystack = `${s.title} ${s.story} ${s.topics.join(" ")} ${s.people.join(" ")}`.toLowerCase();
      const score = words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
      return { s, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const family = relevant.length
    ? `Here is what your family has shared so far:\n\n${relevant
        .map((r) => `${r.s.speaker} says: ${r.s.story}`)
        .join("\n\n")}`
    : "Your family hasn't shared anything about this yet. Ask them in Ask My Family, and their answer will be preserved here.";

  const cultural = ""; // Without a provider we don't synthesise cultural context.
  return { family, cultural };
}

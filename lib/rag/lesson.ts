import type {
  CulturalProfile,
  Lesson,
  LessonContent,
  LessonQuiz,
} from "@/lib/types";
import { INTEREST_LABELS, LEVEL_LABELS } from "@/lib/constants";
import { retrieve } from "@/lib/rag/index";
import {
  buildSystemPrompt,
  formatContext,
  sourceReferences,
  type ContextHit,
} from "@/lib/rag/prompt";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^["“']+|["“']+$/g, ""))
    .filter((s) => s.length > 24 && s.length < 320);
}

function bestContextSentences(
  hits: ContextHit[],
  terms: string[],
  count: number,
): string[] {
  const pool: string[] = [];
  for (const h of hits) {
    for (const sentence of splitSentences(h.text)) {
      const lower = sentence.toLowerCase();
      const relevance = terms.filter((t) => lower.includes(t)).length;
      pool.push(sentence);
      if (relevance > 0) pool.push(`★${relevance} ${sentence}`);
    }
  }
  const ranked = [...pool].sort((a, b) => {
    const ra = a.startsWith("★") ? Number(a.slice(1, 2)) : 0;
    const rb = b.startsWith("★") ? Number(b.slice(1, 2)) : 0;
    return rb - ra;
  });
  return ranked
    .map((s) => s.replace(/^★\d+\s/, ""))
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, count);
}

function buildIntro(hits: ContextHit[], topic: string): string {
  const lead = splitSentences(hits[0]?.text ?? "");
  const opener =
    lead.find((s) => s.toLowerCase().includes(topic.toLowerCase())) ?? lead[0];
  return opener
    ? `When you step into ${topic.toLowerCase()}, one idea holds the door open: ${opener}`
    : `Let's begin where My People begins — understanding what it means to carry an Akan heritage.`;
}

function buildMeaningForYou(profile: CulturalProfile): string {
  const interests =
    profile.interests.length > 1
      ? `${INTEREST_LABELS[profile.interests[0]].toLowerCase()} and ${INTEREST_LABELS[profile.interests[1]].toLowerCase()}`
      : "all of it";
  return `For you — ${LEVEL_LABELS[profile.knowledgeLevel].toLowerCase()} in your journey — this is a starting thread you can pull. Follow your interest in ${interests}, and the bigger picture will keep making sense.`;
}

const LESSON_QUIZZES: Record<string, LessonQuiz> = {
  "understanding-your-akan-heritage": {
    question:
      "What is one reason oral traditions are important when studying Akan history?",
    choices: [
      "They are the only written records that exist",
      "They preserve accounts kept by Indigenous keepers of the tradition",
      "They mostly describe European explorers' routes",
      "They were first written down in the 20th century",
    ],
    correctIndex: 1,
    explanation:
      "Accounts such as those collected by Reindorf, Fynn and others preserve Akan history from within the culture — the ground that written records stand on.",
  },
  "akan-names-and-family": {
    question: "What role do day names play in Akan naming?",
    choices: [
      "They are chosen only by elders during festivals",
      "They connect a person to the day they were born",
      "They are reserved for royalty",
      "They replaced family names in the 1900s",
    ],
    correctIndex: 1,
    explanation:
      "Day names connect each person to the weekday they were born — a simple, everyday thread between identity and community.",
  },
  "the-wisdom-of-proverbs": {
    question: "Why do Akan elders often speak in proverbs?",
    choices: [
      "To make conversations longer",
      "Because proverbs carry shared wisdom in a small number of words",
      "Because proverbs are forbidden in formal speech",
      "To hide meaning from children",
    ],
    correctIndex: 1,
    explanation:
      "A single proverb can hold generations of counsel — that economy is exactly why it travels so well.",
  },
  "traditions-and-ceremonies": {
    question: "How do Akan festivals and ceremonies connect people to the past?",
    choices: [
      "They are purely entertainment events",
      "They commemorate ancestors and renew the community's history",
      "They were introduced recently",
      "They only take place outside Ghana",
    ],
    correctIndex: 1,
    explanation:
      "Rites and festivals anchor the community to its ancestors and to the stories that shaped it.",
  },
};

/** Divide a lesson question into the query words that will retrieve well. */
function lessonQuery(lesson: Lesson, profile: CulturalProfile): string {
  return `${lesson.title} ${lesson.description} ${profile.interests
    .map((i) => INTEREST_LABELS[i])
    .join(" ")}`.toLowerCase();
}

export async function generateLessonContent(
  lesson: Lesson,
  profile: CulturalProfile,
): Promise<LessonContent> {
  const hits = await retrieve(lessonQuery(lesson, profile), profile, 8);
  const context: ContextHit[] = hits.map((h) => ({
    text: h.chunk.text,
    title: h.chunk.sourceTitle,
    page: h.chunk.page,
  }));
  const sources = sourceReferences(context);

  const intro = buildIntro(context, lesson.title);
  const keyIdeas = bestContextSentences(context, lessonWords(lesson), 3).map(
    (s) => (s.startsWith(s.charAt(0).toUpperCase()) ? s : capitalize(s)),
  );
  const example =
    bestContextSentences(context, ["example", "such as", "for instance", "asante", "fante"], 1)[0] ??
    keyIdeas[0];
  const meaningForYou = buildMeaningForYou(profile);
  const quiz =
    LESSON_QUIZZES[lesson.slug] ??
    LESSON_QUIZZES["understanding-your-akan-heritage"];

  // Optional: use the LLM to rewrite the prose when available. Keep the
  // deterministic assembly as the structurual backbone so the lesson never
  // depends on network availability.
  const prose = await tryLessonProse(lesson, profile, context, {
    intro,
    keyIdeas,
    example,
    meaningForYou,
  });

  return {
    slug: lesson.slug,
    title: lesson.title,
    ...prose,
    quiz,
    sources,
    mode: prose.proseMode,
  };
}

function lessonWords(lesson: Lesson): string[] {
  return lesson.title
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => !["the", "of", "&", "your", "a"].includes(w));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function tryLessonProse(
  lesson: Lesson,
  profile: CulturalProfile,
  context: ContextHit[],
  base: { intro: string; keyIdeas: string[]; example: string; meaningForYou: string },
): Promise<{
  intro: string;
  keyIdeas: string[];
  example: string;
  meaningForYou: string;
  proseMode: "rag" | "demo";
}> {
  const key = process.env.OPENAI_API_KEY
    ? "openai"
    : process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : null;
  if (!key) return { ...base, proseMode: "demo" };

  const system = buildSystemPrompt(profile);

  const userPrompt = `Write a short lesson called "${lesson.title}" for a beginner learner using ONLY this retrieved context. Return JSON exactly shaped as {"intro":"...","keyIdeas":["...","...","..."],"example":"...","meaningForYou":"..."}. Keep intro under 60 words, 3 key ideas of under 40 words each, one culturally relevant example under 50 words, and a personalised meaningForYou under 50 words. Do not invent facts outside the context.\n\nRetrieved context:\n${formatContext(context)}`;

  try {
    const text =
      key === "anthropic"
        ? await callAnthropic(system, userPrompt)
        : await callOpenAI(system, userPrompt);
    const parsed = extractJson(text);
    if (parsed) {
      return {
        intro: parsed.intro ?? base.intro,
        keyIdeas: Array.isArray(parsed.keyIdeas)
          ? parsed.keyIdeas.slice(0, 3)
          : base.keyIdeas,
        example: parsed.example ?? base.example,
        meaningForYou: parsed.meaningForYou ?? base.meaningForYou,
        proseMode: "rag",
      };
    }
  } catch {
    /* fall through to deterministic prose */
  }
  return { ...base, proseMode: "demo" };
}

function extractJson(text: string): {
  intro?: string;
  keyIdeas?: string[];
  example?: string;
  meaningForYou?: string;
} | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system: `${system}\nAlways respond with valid JSON only, no markdown fences.`,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (
    json.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("") ?? ""
  );
}

export { extractJson };
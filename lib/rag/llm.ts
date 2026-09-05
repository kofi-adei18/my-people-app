import type { CulturalProfile, SourceReference } from "@/lib/types";
import { retrieve } from "@/lib/rag/index";
import {
  buildSystemPrompt,
  buildUserPrompt,
  formatContext,
  sourceReferences,
  type ContextHit,
} from "@/lib/rag/prompt";
import { buildFallbackAnswer } from "@/lib/rag/fallback";

export interface GuideResult {
  content: string;
  mode: "rag" | "demo";
  sources: SourceReference[];
  provider?: string;
}

interface LllmResult {
  ok: true;
  content: string;
  provider: string;
}

async function callAnthropic(system: string, user: string): Promise<LllmResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = json.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("anthropic empty response");
  return { ok: true, content: text, provider: "anthropic" };
}

async function callOpenAI(system: string, user: string): Promise<LllmResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("openai empty response");
  return { ok: true, content: text, provider: "openai" };
}

async function tryLLM(
  question: string,
  profile: CulturalProfile,
  context: ContextHit[],
): Promise<LllmResult | { ok: false }> {
  const system = buildSystemPrompt(profile);
  const user = buildUserPrompt(question, formatContext(context));

  const forced = process.env.LLM_PROVIDER;
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(system, user);
  }
  if (forced === "openai" && process.env.OPENAI_API_KEY) {
    return callOpenAI(system, user);
  }
  if (process.env.OPENAI_API_KEY) return callOpenAI(system, user);
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic(system, user);
  return { ok: false };
}

/** Full pipeline: retrieve → prompt → LLM (or demo fallback). */
export async function askGuide(
  question: string,
  profile: CulturalProfile,
): Promise<GuideResult> {
  const hits = await retrieve(question, profile, 6);
  const context: ContextHit[] = hits.map((h) => ({
    text: h.chunk.text,
    title: h.chunk.sourceTitle,
    page: h.chunk.page,
  }));
  const sources = sourceReferences(context);

  const llm = await tryLLM(question, profile, context);
  if (llm.ok) {
    return { content: llm.content, mode: "rag", sources, provider: llm.provider };
  }

  const content = buildFallbackAnswer(question, context, profile);
  return { content, mode: "demo", sources };
}
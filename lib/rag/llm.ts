import type { SourceReference, UserProfile } from "@/lib/types";
import { retrieve } from "@/lib/rag/index";
import {
  buildChatSystemPrompt,
  buildUserPrompt,
  formatContext,
  sourceReferences,
  type ContextHit,
} from "@/lib/rag/prompt";
import { tryLLM } from "@/lib/rag/llm-utils";
import { buildFallbackAnswer } from "@/lib/rag/fallback";

export interface GuideResult {
  content: string;
  mode: "rag" | "demo";
  sources: SourceReference[];
  provider?: string;
}

function toContextHits(
  chunks: { text: string; sourceTitle: string; page?: number; meta?: import("@/lib/types").ChunkMetadata }[],
): ContextHit[] {
  return chunks.map((c) => ({
    text: c.text,
    title: c.sourceTitle,
    page: c.page,
    url: c.meta?.source_url,
    authority: c.meta?.authority_level,
    specificity: c.meta?.asante_specificity,
    verified: c.meta?.verified,
  }));
}

/** Full pipeline for the free-form /ask screen: retrieve → prompt → LLM
 *  (or a demo fallback when no provider is configured). */
export async function askGuide(
  question: string,
  profile: UserProfile,
): Promise<GuideResult> {
  const hits = await retrieve(question, {}, 6);
  const context: ContextHit[] = toContextHits(hits.map((h) => h.chunk));
  const sources = sourceReferences(context);

  const system = buildChatSystemPrompt(profile);
  const user = buildUserPrompt(question, formatContext(context));
  const llm = await tryLLM(system, user);

  if (llm.ok) {
    return { content: llm.content, mode: "rag", sources, provider: llm.provider };
  }

  const content = buildFallbackAnswer(question, context, profile);
  return { content, mode: "demo", sources };
}
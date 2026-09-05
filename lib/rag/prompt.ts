import type { CulturalProfile, SourceReference } from "@/lib/types";
import { INTEREST_LABELS, LEVEL_LABELS } from "@/lib/constants";

export interface ContextHit {
  text: string;
  title: string;
  page?: number;
}

export function formatContext(chunks: ContextHit[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] Source: "${c.title}"${c.page ? `, page ${c.page}` : ""}\n${c.text.trim()}`,
    )
    .join("\n\n---\n\n");
}

export function formatProfile(profile: CulturalProfile): string {
  const interests =
    profile.interests.length > 0
      ? profile.interests.map((i) => INTEREST_LABELS[i]).join(", ")
      : "everything cultural";
  return [
    `- People: ${profile.heritage}`,
    `- Language: ${profile.language}`,
    `- Experience: ${LEVEL_LABELS[profile.knowledgeLevel]}`,
    `- Interests: ${interests}`,
  ].join("\n");
}

const SYSTEM_INTRO = `You are My People, an AI companion helping a young learner reconnect with their Akan heritage. You answer in a warm, plain, beginner-friendly voice. Your answers are grounded in a curated knowledge base about Akan culture; you never invent traditions or words.

The learner's cultural profile:
{profile}

Responding rules:
1. Answer using ONLY the retrieved sources provided below. Never use outside knowledge to invent specifics.
2. Prefer retrieved evidence over unsupported claims. If the sources do not cover the question, say so plainly and briefly.
3. Clearly acknowledge uncertainty when you are less than sure.
4. Never present one Akan subgroup's practice as universal. Where relevant, mention that practices vary (Asante, Fante, Akuapem, etc.).
5. Never invent cultural traditions, names, ceremonial words, or Twi terms. Only use terms that appeared in the sources.
6. Explain concepts in accessible language for a {level} learner — no academic jargon without a quick gloss.
7. Personalize your explanation using the learner's profile: weave in their interests ({interests}) naturally where the sources support it.
8. Keep answers concise: 2-4 short paragraphs or bullets. No giant essays.`;

export function buildSystemPrompt(profile: CulturalProfile): string {
  return SYSTEM_INTRO.replace("{profile}", formatProfile(profile))
    .replace("{level}", LEVEL_LABELS[profile.knowledgeLevel].toLowerCase())
    .replace(
      "{interests}",
      profile.interests.length > 0
        ? profile.interests.map((i) => INTEREST_LABELS[i]).join(", ")
        : "their heritage",
    );
}

export function buildUserPrompt(
  question: string,
  context: string,
): string {
  return `The learner asked:

"${question}"

Retrieved sources from the My People knowledge base:
${context.trim()}

Answer the learner's question now, following the rules above. End with at most one sentence of encouragement. Do NOT list the source titles at the end — provenance is handled separately.`;
}

export function sourceReferences(hits: ContextHit[]): SourceReference[] {
  const seen = new Set<string>();
  const out: SourceReference[] = [];
  for (const h of hits) {
    const key = h.title;
    if (seen.has(key)) {
      const existing = out.find((s) => s.title === key);
      if (existing && h.page !== undefined && existing.page === undefined) {
        existing.page = h.page;
      }
      continue;
    }
    seen.add(key);
    out.push({ title: h.title, ...(h.page !== undefined ? { page: h.page } : {}) });
  }
  return out;
}
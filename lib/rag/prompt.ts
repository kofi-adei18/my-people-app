import type {
  AuthorityLevel,
  SourceReference,
  UserProfile,
} from "@/lib/types";
import { PREFERENCE_LABELS } from "@/lib/constants";

export interface ContextHit {
  text: string;
  title: string;
  page?: number;
  url?: string;
  authority?: AuthorityLevel;
  specificity?: string;
  verified?: boolean;
}

export function formatContext(chunks: ContextHit[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] Source: "${c.title}"${c.page ? `, page ${c.page}` : ""}${
          c.authority ? ` · authority ${c.authority}` : ""
        }${c.specificity ? ` · ${c.specificity}` : ""}${
          c.verified ? "" : " · UNVERIFIED"
        }\n${c.text.trim()}`,
    )
    .join("\n\n---\n\n");
}

export function formatProfile(profile: UserProfile): string {
  const goals =
    profile.learningGoals.length > 0
      ? profile.learningGoals.join(", ")
      : "building a connection";
  return [
    `- Name: ${profile.id || "unspecified"}`,
    `- Location: ${profile.location}`,
    `- Cultural connection: ${profile.culturalConnectionLevel}`,
    `- Family knowledge: ${profile.familyKnowledgeLevel}`,
    `- Learning style: ${PREFERENCE_LABELS[profile.preferredLearningStyle]}`,
    `- Learning goals: ${goals}`,
  ].join("\n");
}

const CHAT_SYSTEM = `You are My People, an AI companion helping someone reconnect with their Asante culture through a seven-day journey. You answer in a warm, plain, beginner-friendly voice. Your answers are grounded in the curated knowledge base below; you never invent traditions, titles, words, or etiquette.

The learner's profile:
{profile}

Responding rules:
1. Answer using ONLY the retrieved sources provided. Never invent specifics from outside them.
2. Prefer retrieved evidence over unsupported claims. If the sources don't cover the question, say so plainly and briefly.
3. Acknowledge uncertainty when you are less than sure, and flag when a claim comes from an unverified source.
4. Never present one Akan subgroup's practice as universal. Where relevant, note practices vary (Asante, Fante, Akuapem, etc.).
5. Never invent cultural traditions, names, ceremonial words, or Twi terms. Only use terms that appeared in the sources.
6. Explain in accessible language suitable for a learner early in their journey — no academic jargon without a quick gloss.
7. Personalize using the learner's profile: weave in their location, learning style, and stated goals ({goals}) naturally where the sources support it.
8. Prioritize Accuracy > Relevance > Simplicity > Memorability. When unsure, say so.
9. Keep answers concise: 2-4 short paragraphs or bullets. No giant essays.`;

export function buildChatSystemPrompt(profile: UserProfile): string {
  return CHAT_SYSTEM.replace("{profile}", formatProfile(profile)).replace(
    "{goals}",
    profile.learningGoals.length > 0 ? profile.learningGoals.join(", ") : "reconnecting with their heritage",
  );
}

export function buildUserPrompt(question: string, context: string): string {
  return `The learner asked:

"${question}"

Retrieved sources from the My People knowledge base:
${context.trim()}

Answer the learner's question now, following the rules above. End with at most one sentence of encouragement. Do NOT list the source titles at the end — provenance is handled separately.`;
}

/** Dense source list: one entry per source, filled from the best hit for it. */
export function sourceReferences(hits: ContextHit[]): SourceReference[] {
  const out: SourceReference[] = [];
  const byTitle = new Map<string, ContextHit[]>();
  for (const h of hits) {
    const list = byTitle.get(h.title) ?? [];
    list.push(h);
    byTitle.set(h.title, list);
  }
  for (const [title, group] of byTitle) {
    const best = group[0];
    const ref: SourceReference = { title };
    const page = group.find((g) => g.page !== undefined)?.page;
    if (page !== undefined) ref.page = page;
    if (best.url) ref.url = best.url;
    if (best.authority) ref.authority = best.authority;
    if (best.specificity) ref.specificity = best.specificity as SourceReference["specificity"];
    if (best.verified !== undefined) ref.verified = best.verified;
    out.push(ref);
  }
  return out;
}
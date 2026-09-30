import type {
  EventBriefing,
  EventBriefingDetails,
  EventBriefingSection,
  EventType,
  Phrase,
  SourceReference,
  UserProfile,
} from "@/lib/types";
import { retrieve } from "@/lib/rag/index";
import {
  formatContext,
  sourceReferences,
  type ContextHit,
} from "@/lib/rag/prompt";
import { tryLLM, extractJson } from "@/lib/rag/llm-utils";
import { gatePhrases } from "@/lib/rag/phrase-bank";
import {
  PLAYBOOKS,
  PLAYBOOK_SOURCE_NOTE,
  fillBody,
} from "@/lib/events/playbooks";

/**
 * Cultural-event briefing pipeline.
 *
 * Mirrors the day-generator philosophy in `day.ts`:
 * - Structure comes from the curated playbook (deterministic, provenance-stamped).
 * - Twi phrases come ONLY from the retrieved greetings/politeness corpus via
 *   `hasTokens` gating — the playbook never introduces Twi.
 * - The LLM refines prose only, when a key is configured; with no key the
 *   deterministic base is returned and the demo never breaks.
 */

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

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

function roleLine(details: EventBriefingDetails): string {
  const role = details.role?.trim();
  if (!role) {
    return "Since we don't yet know exactly what part you play, this briefing leans toward guest-of-the-family etiquette — you can regenerate it after telling us more.";
  }
  return `Given your role (${role}), lean towards the family-side expectations below and confirm specifics with your people.`;
}

export interface GenerateBriefingInput {
  eventId?: string;
  eventTitle: string;
  eventDate: number;
  eventType: EventType;
  details: EventBriefingDetails;
  profile: UserProfile;
}

function briefingId(): string {
  return `brief-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Build the briefing deterministically from the playbook + retrieved corpus,
 * then optionally let the LLM warm up the prose. Always succeeds.
 */
export async function generateEventBriefing(
  input: GenerateBriefingInput,
): Promise<EventBriefing> {
  const playbook = PLAYBOOKS[input.eventType];

  const hits = await retrieve(
    `asante ${input.eventType} greetings politeness elder respect etiquette`,
    { topics: ["greetings", "politeness", "etiquette"] },
    6,
  );
  const context = toContext(hits.map((h) => h.chunk));
  const sources = sourceReferences(context);
  // The playbook itself is a (provisional) source — surface it honestly.
  sources.push({
    title: playbook.sourceTitle,
    authority: "medium",
    specificity: "explicit",
    verified: false,
  });

  const corpus = clean(context.map((c) => c.text).join(" "));
  const phrases = gatePhrases(corpus);

  return buildBriefingFromContext(input, context, phrases, sources);
}

/**
 * Deterministic briefing composition from an existing retrieval result —
 * shared by /api/event-briefing and the calendar prep journey generator.
 */
export async function buildBriefingFromContext(
  input: GenerateBriefingInput,
  context: ContextHit[],
  phrases: Phrase[],
  sources: SourceReference[],
): Promise<EventBriefing> {
  const playbook = PLAYBOOKS[input.eventType];

  const vars = {
    roleLine: roleLine(input.details),
    corpusNote: "",
  };

  const sections: EventBriefingSection[] = playbook.sections.map((s) => ({
    id: s.id,
    title: s.title,
    body: clean(fillBody(s.body, vars)),
    items: s.items,
    verified: false,
  }));

  // Final section: personalized family questions — the app never invents the
  // specifics it doesn't have; it points the learner at their own people.
  const region = input.details.region?.trim();
  sections.push({
    id: "ask-your-family",
    title: "Ask your family before you go",
    body: clean(
      `Every family and town does this differently — the details that matter most live with your people. ${
        region ? `You mentioned this is in ${region}; ask about local expectations there. ` : ""
      }${PLAYBOOK_SOURCE_NOTE}`,
    ),
    items: playbook.familyQuestions,
    verified: false,
  });

  const phrasesSection: EventBriefingSection = {
    id: "phrases",
    title: "Phrases you can use",
    body:
      phrases.length > 0
        ? "From the verified greetings corpus:"
        : "None of the verified greeting phrases could be confirmed against the current corpus — ask your family instead of guessing.",
    phrases,
    verified: true,
  };
  sections.push(phrasesSection);

  const base: EventBriefing = {
    id: briefingId(),
    eventId: input.eventId ?? "",
    eventType: input.eventType,
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    details: input.details,
    summary: playbook.summary,
    sections,
    sources,
    mode: "rag",
    createdAt: Date.now(),
  };

  return refineBriefingProse(base, input, context);
}

const BRIEFING_SYSTEM = `You are the Asante culture tutor inside My People, preparing a learner for an upcoming cultural event. You write in a warm, plain, beginner-friendly voice.

Rules (in priority order): Accuracy before Relevance before Simplicity before Memorability.
1. Ground EVERY explanation in the retrieved sources and the playbook given. Never invent traditions, phrases, titles, or customs.
2. Flag uncertainty. Practices vary between families, towns and Akan subgroups — say so where relevant.
3. Keep each rewritten summary or section body under 4 sentences.`;

async function refineBriefingProse(
  briefing: EventBriefing,
  input: GenerateBriefingInput,
  context: ContextHit[],
): Promise<EventBriefing> {
  const details = input.details;
  const json = await tryLLM(
    BRIEFING_SYSTEM,
    `The learner (${input.profile.location}, connection level ${input.profile.culturalConnectionLevel}, role at the event: ${details.role?.trim() || "unspecified"}) is preparing for an upcoming ${input.eventType}: "${input.eventTitle}"${details.region ? ` in ${details.region}` : ""}.
Their notes: ${details.notes?.trim() || "none"}.

Rewrite ONLY the summary and each section's body text below, keeping every item list and the structure intact. Keep the playbook's substance; make the prose warmer and personal to their role. Never add new customs or Twi terms. Return valid JSON only, as {"summary":"...","sections":[{"id":"...","body":"..."}]}.

SUMMARY: ${briefing.summary}

${briefing.sections.map((s) => `SECTION ${s.id}: ${s.body}`).join("\n\n")}

Retrieved sources from the My People knowledge base:
${formatContext(context)}`,
    1200,
  );
  if (!json.ok) return briefing;

  const parsed = extractJson<{
    summary?: string;
    sections?: { id: string; body: string }[];
  }>(json.content);
  if (!parsed) return briefing;

  const byId = new Map((parsed.sections ?? []).map((s) => [s.id, s.body]));
  return {
    ...briefing,
    summary: parsed.summary?.trim() || briefing.summary,
    sections: briefing.sections.map((s) => {
      const refined = byId.get(s.id)?.trim();
      return refined ? { ...s, body: refined } : s;
    }),
    mode: "rag",
  };
}
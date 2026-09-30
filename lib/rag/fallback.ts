import type { UserProfile } from "@/lib/types";
import { PREFERENCE_LABELS } from "@/lib/constants";
import type { ContextHit } from "@/lib/rag/prompt";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function connectionIntro(profile: UserProfile): string {
  switch (profile.culturalConnectionLevel) {
    case "very":
      return "Nice question — here's what my sources say, taking you a little deeper since the culture is close to you already.";
    case "somewhat":
    case "some":
      return "Good question. Here's what my sources say — enough to add a real thread to what you already know.";
    default:
      return "Great question — here's what my sources say about it, in plain terms, as you begin your journey.";
  }
}

const CLOSING =
  "Where the sources go quiet, I'd rather say I don't know than guess — the whole point of My People is that the answers stay grounded in real cultural knowledge.";

function quotedWord(text: string): string | null {
  const m = text.match(/["“'’]([a-zA-Z]+(?:['’-][a-zA-Z]+)*)["”'’]/g);
  if (!m) return null;
  for (const candidate of m) {
    const word = candidate.replace(/["“'’]/g, "").trim();
    if (word.length >= 3 && !/^(doi|c|p|pp|afh|r|vol|no)$/i.test(word)) {
      return word;
    }
  }
  return null;
}

function sentenceContaining(text: string, terms: string[]): string[] {
  const out: string[] = [];
  for (const sentence of splitSentences(text)) {
    const lower = sentence.toLowerCase();
    if (terms.some((t) => lower.includes(t))) out.push(sentence);
    if (out.length >= 2) break;
  }
  return out;
}

function buildCore(primaryText: string, profile: UserProfile): string[] {
  const sentences = splitSentences(primaryText);
  if (sentences.length === 0) return [primaryText.slice(0, 400)];
  const goalTerms = profile.learningGoals.map((g) => g.toLowerCase());
  const chosen = sentenceContaining(primaryText, goalTerms);
  const opener = sentences[0];
  const body = chosen.length >= 1 ? chosen[0] : sentences.slice(1, 3).join(" ");
  return [opener, body].filter(Boolean);
}

export function buildFallbackAnswer(
  question: string,
  hits: ContextHit[],
  profile: UserProfile,
): string {
  if (hits.length === 0) {
    return `I'd love to help with that, but I don't have anything in my curated sources yet. Right now my knowledge base is strong on Asante Twi greetings and everyday politeness — try asking about Maakye, Owura/Awuraa, Wo ho te sɛn, or handshake etiquette.`;
  }

  const primary = hits[0];
  const primaryText = clean(primary.text);

  const isWordRequest =
    /\b(twi word|word in twi|say.+in twi)\b/i.test(question) ||
    /\bteach me a twi word\b/i.test(question);

  if (isWordRequest) {
    const term = quotedWord(primaryText + (hits[1] ? clean(hits[1].text) : ""));
    if (term) {
      const sentence = splitSentences(primaryText).find((s) =>
        s.toLowerCase().includes(term.toLowerCase()),
      );
      return `${connectionIntro(profile)}\n\nIn my sources I found the term *${term}*. It appears in a discussion of ${primary.title.toLowerCase().replace(/\.?$/, "")}: "${sentence ?? "..."}" Keep listening for it as you learn — these small words carry a lot of the culture.\n\n${CLOSING}`;
    }
    return `${connectionIntro(profile)}\n\nI looked for a Twi word connected to this in my curated sources and didn't find one safely quotable yet — I'd rather not make one up. Ask me about greetings, politeness, or titles and I can often pull out real terms used in those sources.`;
  }

  const [opener, body] = buildCore(primaryText, profile);

  let paragraph = `${opener}`;
  if (body) paragraph += ` ${body}`;

  if (paragraph.length > 700) {
    paragraph = paragraph.slice(0, 700).replace(/[^.!?]*$/, "") + ".";
  }

  const goalLine =
    profile.learningGoals.length > 0
      ? `Since ${profile.learningGoals[0]} is one of your goals, keep an eye out for how the sources return to it again and again.`
      : "";

  return [connectionIntro(profile), paragraph, goalLine, CLOSING]
    .filter(Boolean)
    .join("\n\n");
}

export function fallbackMeta(): { mode: "demo" } {
  return { mode: "demo" };
}

export function profileLabel(profile: UserProfile): string {
  return `${profile.culturalConnectionLevel} · ${PREFERENCE_LABELS[profile.preferredLearningStyle]}`;
}
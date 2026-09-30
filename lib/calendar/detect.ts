import type { CalendarEvent, DetectedEvent, EventConfidence, EventType } from "@/lib/types";

/**
 * Local, private cultural-event detection.
 *
 * Runs entirely on the client against keyword dictionaries — no network, no
 * calendar data ever leaves the device during detection. Strong terms score
 * high confidence; weaker/ambiguous terms score low and only surface when
 * the learner opts in. The learner always confirms (or corrects) the type
 * before a briefing is generated.
 */

interface KeywordRule {
  term: string;
  weight: number;
}

/** Weighted keywords per event type. Matched against title (x2), then
 *  description and location (x1). Weights: strong = 3, medium = 2, weak = 1. */
const KEYWORDS: Record<EventType, KeywordRule[]> = {
  funeral: [
    { term: "funeral", weight: 3 },
    { term: "final funeral rites", weight: 3 },
    { term: "burial", weight: 3 },
    { term: "obituary", weight: 3 },
    { term: "laying in state", weight: 3 },
    { term: "wake", weight: 2 },
    { term: "memorial", weight: 2 },
    { term: "celebration of life", weight: 2 },
    { term: "one week", weight: 2 },
    { term: "1 week", weight: 2 },
    { term: "one-week", weight: 2 },
    { term: "ns kontakye", weight: 2 },
    { term: "condolence", weight: 2 },
    { term: "in memoriam", weight: 2 },
    { term: "repose", weight: 1 },
    { term: "tribute", weight: 1 },
    { term: "mourning", weight: 1 },
    { term: "passed away", weight: 1 },
    { term: "resting", weight: 1 },
  ],
  wedding: [
    { term: "wedding", weight: 3 },
    { term: "marriage", weight: 3 },
    { term: "engagement", weight: 3 },
    { term: "knocking", weight: 2 },
    { term: "tiri nsa", weight: 2 },
    { term: "traditional marriage", weight: 3 },
    { term: "engagement ceremony", weight: 3 },
    { term: "white wedding", weight: 3 },
    { term: "bride", weight: 2 },
    { term: "groom", weight: 2 },
    { term: "nuptial", weight: 2 },
    { term: "betrothal", weight: 2 },
    { term: "dowry", weight: 2 },
    { term: "reception", weight: 1 },
    { term: "bridal", weight: 2 },
    { term: "matrimony", weight: 2 },
    { term: "wedded", weight: 2 },
  ],
};

export interface DetectionResult {
  eventType: EventType | null;
  confidence: EventConfidence;
  matchedKeywords: string[];
}

/** Detect the likely cultural-event type for a single calendar event. */
export function detectEvent(event: {
  title: string;
  description?: string;
  location?: string;
}): DetectionResult {
  const title = event.title.toLowerCase();
  const description = (event.description ?? "").toLowerCase();
  const location = (event.location ?? "").toLowerCase();

  const best: Partial<Record<EventType, { score: number; keywords: string[] }>> = {};

  for (const [type, rules] of Object.entries(KEYWORDS) as [EventType, KeywordRule[]][]) {
    let score = 0;
    const matched: string[] = [];
    for (const rule of rules) {
      const term = rule.term.toLowerCase();
      let hit = false;
      if (title.includes(term)) {
        score += rule.weight * 2;
        hit = true;
      }
      if (description.includes(term) || location.includes(term)) {
        score += rule.weight;
        hit = true;
      }
      if (hit) matched.push(rule.term);
    }
    if (score > 0) best[type] = { score, keywords: matched };
  }

  const entries = Object.entries(best) as [EventType, { score: number; keywords: string[] }][];
  if (entries.length === 0) {
    return { eventType: null, confidence: "low", matchedKeywords: [] };
  }
  entries.sort((a, b) => b[1].score - a[1].score);
  const [topType, top] = entries[0];

  // A clear winner beats the runner-up by a healthy margin — otherwise the
  // event is ambiguous (e.g. "wedding reception at the funeral home") and
  // needs confirmation.
  const runnerUp = entries[1]?.[1].score ?? 0;
  const decisive = top.score >= 4 && top.score >= runnerUp * 2;
  return {
    eventType: topType,
    confidence: decisive ? "high" : "low",
    matchedKeywords: top.keywords,
  };
}

/** Detect across a list, returning only events with some signal. */
export function detectEvents(events: CalendarEvent[]): Record<string, DetectedEvent> {
  const out: Record<string, DetectedEvent> = {};
  for (const event of events) {
    const result = detectEvent(event);
    if (!result.eventType) continue;
    out[event.id] = {
      eventId: event.id,
      eventType: result.eventType,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      userConfirmed: false,
    };
  }
  return out;
}
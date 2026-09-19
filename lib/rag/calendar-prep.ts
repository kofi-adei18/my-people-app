import type {
  CalendarPrepJourney,
  EventBriefing,
  PrepStepContent,
  PrepStepId,
  ScenarioQuestion,
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
import { PLAYBOOKS, PLAYBOOK_SOURCE_NOTE } from "@/lib/events/playbooks";
import {
  composeArc,
  pacingHint,
  stepTitle,
  STEP_META,
} from "@/lib/events/prep-arc";

/**
 * Calendar prep-journey pipeline (distinct from the manual free-form
 * prep journeys in event-prep.ts).
 *
 * Generates the whole multi-step journey in one deterministic call: arc
 * composed from the days left, step content drawn from the curated playbook
 * for the event type, phrases gated against the greetings corpus, and the
 * full briefing (from event-briefing.ts) attached as the rehearse step's
 * day-of rundown. The LLM only ever refines a single step's prose, lazily,
 * via refineCalendarStep — with no key the deterministic base stands.
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

export interface GenerateCalendarPrepInput {
  eventId: string;
  eventTitle: string;
  eventDate: number;
  eventType: "funeral" | "wedding";
  details: {
    role?: string;
    dressCodeKnown?: boolean;
    region?: string;
    notes?: string;
  };
  profile: UserProfile;
  leadTimeDays: number;
}

// ─── Scenario banks (deterministic, consistent with the playbooks) ─────────────

const SCENARIOS: Record<
  "funeral" | "wedding",
  Partial<Record<PrepStepId, ScenarioQuestion[]>>
> = {
  funeral: {
    mouth: [
      {
        question:
          "You arrive and meet the bereaved family's elder first. How do you open?",
        choices: [
          "A quiet time-of-day greeting with their title, then a brief word of condolence",
          "A cheerful 'hello, how are we all doing?'",
          "Wait silently until they speak to you",
          "Go straight to asking about the funeral programme",
        ],
        correctIndex: 0,
        explanation:
          "Keep it subdued: title + time-of-day greeting first, then a short expression of sympathy. A funeral is not the place for bright small talk.",
        concept: "greetings",
      },
    ],
    body: [
      {
        question: "You're waiting to be received among a crowd of mourners. What shows respect?",
        choices: [
          "Push forward so you're seen",
          "Wait patiently and take your cue from the elders",
          "Announce your arrival loudly",
          "Seat yourself wherever there's space",
        ],
        correctIndex: 1,
        explanation:
          "The wait is itself part of the respect. Follow the elders' lead on when to sit, stand or leave.",
        concept: "etiquette",
      },
    ],
    wear: [
      {
        question: "Which of these is the safest funeral choice?",
        choices: [
          "Black or very dark colours, modest and covered",
          "Bright celebratory patterns",
          "All-white formal wear",
          "Whatever is most fashionable",
        ],
        correctIndex: 0,
        explanation:
          "Dark colours — black and dark red are the mourning colours. Avoid anything bright or celebratory; if the family set a theme, follow it.",
        concept: "etiquette",
      },
    ],
    gifts: [
      {
        question: "How do you hand your monetary donation to the collectors?",
        choices: [
          "With your right hand, quietly, to the designated collectors only",
          "Toss it onto the table from a distance",
          "Announce the amount so others can hear",
          "Hand it to any family member who looks free",
        ],
        correctIndex: 0,
        explanation:
          "Give with your right hand and quietly, only to the designated collectors. The amount matters less than the act.",
        concept: "etiquette",
      },
    ],
    rehearse: [
      {
        question: "During the service you see mourners perform a custom you don't recognise. You should…",
        choices: [
          "Imitate it as best you can immediately",
          "Observe, follow quietly, and ask your family afterwards",
          "Stop and ask the person next to you to explain, loudly",
          "Step outside until it's over",
        ],
        correctIndex: 1,
        explanation:
          "When unsure of a rite, watch and follow rather than improvise — and let your family fill in the meaning later.",
        concept: "etiquette",
      },
    ],
  },
  wedding: {
    mouth: [
      {
        question:
          "You're introduced to the groom's family head for the first time. What's respectful?",
        choices: [
          "Greet by title with the time-appropriate greeting, standing",
          "Wave from your seat",
          "Sit and nod politely",
          "Ask them for a drink first",
        ],
        correctIndex: 0,
        explanation:
          "Elders first, by title, standing when you're introduced — and only your right hand for handshakes.",
        concept: "greetings",
      },
    ],
    body: [
      {
        question: "The formal presentations are running long and guests chat around you. You…",
        choices: [
          "Join the chatter — everyone else is",
          "Stay attentive and quiet until the presentations close",
          "Step out for a call mid-presentation",
          "Start your own side conversation with the elders",
        ],
        correctIndex: 1,
        explanation:
          "The formality is the point. Defer to the elders running the programme and keep commentary minimal during presentations.",
        concept: "etiquette",
      },
    ],
    wear: [
      {
        question: "The couple set a gold-and-green theme but you prefer your blue outfit. You…",
        choices: [
          "Wear blue anyway — they'll understand",
          "Follow the colour theme the couple set",
          "Wear blue but add a gold scarf",
          "Ask the couple to make an exception",
        ],
        correctIndex: 1,
        explanation:
          "If the family set a colour scheme, follow it — cloth and colour carry meaning, and upstaging the theme reads badly.",
        concept: "etiquette",
      },
    ],
    gifts: [
      {
        question: "What's the customary way to give at a traditional engagement?",
        choices: [
          "A monetary gift with your right hand, plus a spoken blessing",
          "Nothing — the drinks are the groom's family's duty",
          "A gift handed over with your left hand",
          "A public announcement of your donation",
        ],
        correctIndex: 0,
        explanation:
          "Guests typically give money, often in an envelope or at a designated point — right hand, with a warm spoken blessing alongside.",
        concept: "etiquette",
      },
    ],
    rehearse: [
      {
        question: "You're given a small role carrying gifts to the family. That means…",
        choices: [
          "Do it quickly to get it over with",
          "Decline politely — you don't want to be noticed",
          "Accept it as an honour and take direction well",
          "Delegate it to someone younger",
        ],
        correctIndex: 2,
        explanation:
          "Being given a role is an honour at an engagement. Accept it and take direction from the elders organising things.",
        concept: "etiquette",
      },
    ],
  },
};

// ─── Step construction ────────────────────────────────────────────────────────

const FAMILY_MISSIONS: Record<"funeral" | "wedding", { question: string; why: string }[]> = {
  funeral: [
    {
      question:
        "Ask your family: What do we wear to funerals in our family, and is there a cloth or colour we specifically use?",
      why: "Dress codes are the detail families hold onto most tightly — yours will have one.",
    },
    {
      question:
        "Ask an elder: What should a young person say when condoling the bereaved family?",
      why: "Condolence phrases are best learned from your own people — that's what makes them yours.",
    },
    {
      question:
        "Ask your family: How much do people usually give, and how is it handed over?",
      why: "Giving customs are practical, local, and different in every family.",
    },
  ],
  wedding: [
    {
      question:
        "Ask your family: What is our family's custom at engagements — what do guests typically give?",
      why: "Giving customs are the part guests get wrong most often; your family knows the local answer.",
    },
    {
      question:
        "Ask an elder: What should a young person never do at a traditional marriage?",
      why: "Every family has a line you must not cross — better to hear it now than on the day.",
    },
    {
      question:
        "Ask your family: Is there a phrase or blessing our family says at weddings?",
      why: "A family blessing is exactly the kind of thing worth carrying into the day.",
    },
  ],
};

function checklistFor(eventType: "funeral" | "wedding"): string[] {
  const shared = [
    "Confirm the exact time and place — and how early to arrive",
    "Practise your greeting out loud once: title + time-of-day greeting",
    "Check your outfit against the guidance (and any family colour theme)",
    "Decide how you're giving: amount ready, right hand",
  ];
  return eventType === "funeral"
    ? [...shared, "Ask your family what to say when you meet the bereaved", "Plan to keep your phone away and follow the elders' lead"]
    : [...shared, "Ask your family if there's a blessing or phrase to offer", "Find out if you've been given any role in the programme"];
}

export async function generateCalendarPrep(
  input: GenerateCalendarPrepInput,
): Promise<CalendarPrepJourney> {
  const playbook = PLAYBOOKS[input.eventType];
  const sectionByTitle = new Map(playbook.sections.map((s) => [s.title, s]));

  const hits = await retrieve(
    `asante ${input.eventType} greetings politeness elder respect etiquette`,
    { topics: ["greetings", "politeness", "etiquette"] },
    6,
  );
  const context = toContext(hits.map((h) => h.chunk));
  const corpus = clean(context.map((c) => c.text).join(" "));
  const phrases = gatePhrases(corpus);

  const sources = sourceReferences(context);
  sources.push({
    title: playbook.sourceTitle,
    authority: "medium",
    specificity: "explicit",
    verified: false,
  });

  const briefing = await generateBriefingInternal(input, context, phrases, sources);

  const arc = composeArc(
    Math.max(1, Math.ceil((input.eventDate - Date.now()) / 86_400_000)) || 7,
  );

  const role = input.details.role?.trim();

  const steps: Record<PrepStepId, PrepStepContent> = {} as Record<
    PrepStepId,
    PrepStepContent
  >;

  for (const stepId of arc) {
    const themes = themesCovered(stepId, arc);
    const meta = STEP_META[stepId];
    const bodies: string[] = [];
    const items: string[] = [];

    for (const theme of themes) {
      const section =
        theme === "understand"
          ? sectionByTitle.get("What to expect")
          : theme === "mouth"
            ? sectionByTitle.get("Greetings & how to address people")
            : theme === "body"
              ? sectionByTitle.get("Conduct during the funeral") ??
                sectionByTitle.get("Conduct during the ceremony")
              : theme === "wear"
                ? sectionByTitle.get("What to wear")
                : theme === "gifts"
                  ? sectionByTitle.get("Gifts & donations") ??
                    sectionByTitle.get("Gifts & contributions")
                  : undefined;
      if (section) {
        bodies.push(fillBody(section.body, role));
        items.push(...(section.items ?? []));
      }
    }

    let step: PrepStepContent = {
      id: stepId,
      title: stepTitle(stepId, arc),
      theme: themes.map((t) => STEP_META[t].theme).join(" & "),
      hook: hookFor(stepId),
      concept: {
        title: meta.title,
        explanation: clean(bodies.join(" ")) || meta.title,
        items: items.length > 0 ? items : undefined,
      },
      phrases: stepId === "mouth" ? phrases : undefined,
      scenario: SCENARIOS[input.eventType][themes[0]] ?? SCENARIOS[input.eventType][stepId],
      sources,
      verified: false,
      mode: "rag",
    };

    if (stepId === "family") {
      const missions = FAMILY_MISSIONS[input.eventType];
      step = {
        ...step,
        concept: {
          title: "Ask Your People",
          explanation: clean(
            `No briefing can know your family's way of doing this. Pick one question and ask before the day — the answer becomes part of your Culture Bank, and it shapes how you carry yourself. ${PLAYBOOK_SOURCE_NOTE}`,
          ),
        },
        familyMission: missions[0],
      };
    }

    if (stepId === "rehearse") {
      step = {
        ...step,
        concept: {
          title: "Rehearse & Get Ready",
          explanation: clean(
            `Test yourself on the essentials, then walk the day-of checklist — the full rundown is right here so you can review it on the morning itself. ${role ? `You're going as ${role}.` : ""}`,
          ),
        },
        checklist: checklistFor(input.eventType),
      };
    }

    steps[stepId] = step;
  }

  return {
    eventId: input.eventId,
    eventType: input.eventType,
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    stepIds: arc,
    steps,
    briefing,
    completedSteps: [],
    pacing: pacingHint(input.eventDate, input.leadTimeDays, arc),
    createdAt: Date.now(),
  };
}

/** Themes a composed step covers (merged arcs span two themes). */
function themesCovered(stepId: PrepStepId, arc: PrepStepId[]): PrepStepId[] {
  const covered = (s: PrepStepId) => !arc.includes(s);
  if (stepId === "understand" && covered("body")) return ["understand", "body"];
  if (stepId === "gifts" && covered("family")) return ["gifts", "family"];
  return [stepId];
}

function hookFor(stepId: PrepStepId): string {
  switch (stepId) {
    case "understand":
      return "Before you can act right, know what you're walking into.";
    case "mouth":
      return "Walk away knowing exactly what to say, and to whom.";
    case "body":
      return "Your body speaks before your mouth does.";
    case "wear":
      return "What you wear says you understand the day.";
    case "gifts":
      return "Giving is a language — learn how it's spoken here.";
    case "family":
      return "The details that matter most live with your people.";
    case "rehearse":
      return "Test yourself, then walk in ready.";
  }
}

function fillBody(body: string, role: string | undefined): string {
  const roleLine = role
    ? `Given your role (${role}), lean towards family-side expectations and confirm specifics with your people.`
    : "Practices vary between families and towns — treat this as orientation, not law.";
  return clean(body.replace("{roleLine}", roleLine).replace("{corpusNote}", ""));
}

// ─── Briefing reuse ───────────────────────────────────────────────────────────

async function generateBriefingInternal(
  input: GenerateCalendarPrepInput,
  context: ContextHit[],
  phrases: import("@/lib/types").Phrase[],
  sources: import("@/lib/types").SourceReference[],
): Promise<EventBriefing> {
  const { buildBriefingFromContext } = await import(
    "@/lib/rag/event-briefing"
  );
  return buildBriefingFromContext(
    {
      eventId: input.eventId,
      eventTitle: input.eventTitle,
      eventDate: input.eventDate,
      eventType: input.eventType,
      details: input.details,
      profile: input.profile,
    },
    context,
    phrases,
    sources,
  );
}

// ─── Lazy per-step prose refinement ───────────────────────────────────────────

const STEP_SYSTEM = `You are the Asante culture tutor inside My People, preparing a learner for an upcoming cultural event. You write in a warm, plain, beginner-friendly voice.

Rules (in priority order): Accuracy before Relevance before Simplicity before Memorability.
1. Ground EVERYTHING in the retrieved sources and the step content given. Never invent traditions, phrases, titles, or customs.
2. Flag uncertainty. Practices vary between families, towns and Akan subgroups — say so where relevant.
3. Keep the rewritten explanation under 5 sentences. Keep every item and phrase list intact.`;

/** Refine one step's prose. Falls back to the input step on any failure. */
export async function refineCalendarStep(
  journey: CalendarPrepJourney,
  stepId: PrepStepId,
  profile: UserProfile,
): Promise<PrepStepContent> {
  const step = journey.steps[stepId];
  if (!step) return step;

  const hits = await retrieve(
    `asante ${journey.eventType} greetings etiquette`,
    { topics: ["greetings", "politeness", "etiquette"] },
    4,
  );
  const contextText =
    hits.length > 0
      ? formatContext(toContext(hits.map((h) => h.chunk)))
      : "(corpus empty)";

  const result = await tryLLM(
    STEP_SYSTEM,
    `The learner (${profile.location}, connection level ${profile.culturalConnectionLevel}) is preparing for a ${journey.eventType}: "${journey.eventTitle}" on ${new Date(journey.eventDate).toDateString()}.

Rewrite ONLY the explanation of this step, keeping its structure, items, phrases and quiz intact. Return valid JSON as {"explanation":"..."}.

STEP (${step.title}): ${step.concept.explanation}

Retrieved sources from the My People knowledge base:
${contextText}`,
    700,
  );
  if (!result.ok) return step;

  const parsed = extractJson<{ explanation?: string }>(result.content);
  if (!parsed?.explanation?.trim()) return step;
  return {
    ...step,
    concept: { ...step.concept, explanation: clean(parsed.explanation) },
    mode: "rag",
  };
}
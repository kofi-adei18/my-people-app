import type { EventType } from "@/lib/types";

/**
 * Curated event playbooks — the structured knowledge behind cultural-event
 * briefings.
 *
 * These follow the same discipline as the journey days in `lib/rag/day.ts`:
 * deterministic structure, provenance stamped (`verified: false` until the
 * owner reviews them), and an explicit "practices vary" stance. Twi terms do
 * NOT live here — phrases are only ever pulled from the RAG corpus via
 * `hasTokens` gating in `event-briefing.ts`, so the corpus stays the single
 * source of language truth.
 */

export interface PlaybookSection {
  id: string;
  title: string;
  body: string;
  items?: string[];
}

export interface EventPlaybook {
  eventType: EventType;
  title: string;
  /** Source reference shown under "Sources" — provisional by design. */
  sourceTitle: string;
  summary: string;
  sections: PlaybookSection[];
  /** Personalised "ask your family" prompts, appended as the final section. */
  familyQuestions: string[];
}

const EVENT_SOURCE_NOTE =
  "Composed playbook, provisionally tagged pending owner review. Practices vary between families, towns and Akan subgroups — treat this as orientation, not law.";

const FUNERAL_PLAYBOOK: EventPlaybook = {
  eventType: "funeral",
  title: "Preparing for an Asante funeral",
  sourceTitle: `My People playbook — Asante funerals (provisional)`,
  summary:
    "Funerals are among the most significant gatherings in Asante life — a public act of respect for the dead and support for the bereaved. This briefing covers what to expect, how to greet and dress, how to conduct yourself, and what to ask your family before you go.",
  sections: [
    {
      id: "overview",
      title: "What to expect",
      body:
        "An Asante funeral is a major communal occasion, often held over a day or more, with the body laid in state, mourning songs, drumming, and long streams of visitors paying their respects to the family. {roleLine} Expect formal structure: you will likely be received by family members stationed to receive mourners, and the tone is solemn rather than celebratory. It is normal for a funeral to be a large, semi-public event where distant relatives, friends, and acquaintances of the deceased all attend.",
    },
    {
      id: "greetings",
      title: "Greetings & how to address people",
      body:
        "You are there primarily to console the bereaved family, so your greeting should be brief, subdued and respectful. Lead with the time-of-day greeting you have learned, use the right title for elders you meet, and keep conversation quiet. When approaching the bereaved, a short expression of sympathy and a handshake (right hand) is appropriate — do not launch into small talk. {corpusNote}The phrases below come from the verified greetings corpus; condolence-specific Twi phrases are best asked of your family, which is what the final section is for.",
      items: [
        "Greet elders first, using their title (Nana, Maame, ɔpanyin) before anything else.",
        "Keep your voice low — a funeral is not the place for loud greetings.",
        "Let the family lead: wait to be received rather than seeking people out.",
      ],
    },
    {
      id: "clothing",
      title: "What to wear",
      body:
        "Dark colours are the norm — black and dark red are the traditional mourning colours, and red-and-black cloth is closely associated with mourning in Ghana. Avoid bright colours, flashy patterns, and anything celebratory. Modest, conservative dress is safest: covered shoulders for women, formal or smart-traditional attire for men. Some families provide or specify cloth (a common practice is wearing cloth in honour of the deceased) — if you are unsure, ask the family in advance.",
      items: [
        "Wear black or very dark colours; avoid bright patterns and whites.",
        "Modesty first: covered shoulders, nothing flashy or celebratory.",
        "If the family specifies a dress theme, follow it exactly.",
      ],
    },
    {
      id: "conduct",
      title: "Conduct during the funeral",
      body:
        "Follow the flow of the event and take your cues from elders: sit where you are directed, keep your phone away, and do not rush the family — mourners may wait a long while to be received, and that patience is itself a sign of respect. Right-hand handshakes apply as always. Photographs are generally inappropriate unless the family invites them. Accept what you are offered graciously, even if only water.",
      items: [
        "Use only your right hand for handshakes.",
        "Wait to be seated or directed — do not choose your own place.",
        "Keep photography to a minimum and only where clearly welcome.",
        "Follow the elders' lead on when to sit, stand, eat or leave.",
      ],
    },
    {
      id: "gifts",
      title: "Gifts & donations",
      body:
        "Funerals carry real costs, and it is customary for attendees to contribute — typically money placed in a collection or book of condolence managed by designated family members. Drinks (and sometimes cloth) are also traditional condolence gifts in Akan practice. If you give money, hand it respectfully with your right hand. The amount matters less than the act; do not feel pressured to match others.",
      items: [
        "Bring a monetary donation — give it only to the designated collectors.",
        "Traditional condolence gifts include drinks and cloth.",
        "Give and receive everything with your right hand.",
      ],
    },
    {
      id: "avoid",
      title: "What to avoid",
      body:
        "Avoid loud laughter, celebratory chatter, and treating the occasion as a social catch-up. Do not overstay or crowd the bereaved. Never put anything in the collection ostentatiously — giving is quiet. If customs during the service are unfamiliar to you (prostration or specific gestures of mourning), watch others and follow rather than improvise.",
      items: [
        "No loud laughter, joking or celebratory behaviour.",
        "Do not photograph the bereaved or the body without explicit permission.",
        "When unsure of a ritual, observe and follow — don't improvise.",
      ],
    },
  ],
  familyQuestions: [
    "Ask your family: What do we wear to funerals in our family, and is there a cloth or colour we specifically use?",
    "Ask an elder: What should a young person say when condoling the bereaved family?",
    "Ask your family: How much do people usually give, and how is it handed over?",
  ],
};

const WEDDING_PLAYBOOK: EventPlaybook = {
  eventType: "wedding",
  title: "Preparing for an Asante wedding or engagement",
  sourceTitle: `My People playbook — Asante weddings & engagements (provisional)`,
  summary:
    "An Asante engagement or traditional marriage is a formal joining of two families, not just of two people. This briefing covers what happens, how to greet and address the elders, what to wear, how to conduct yourself, and what gifts are expected.",
  sections: [
    {
      id: "overview",
      title: "What to expect",
      body:
        "A traditional Asante engagement (often called traditional marriage or, for the first formal step, the knocking ceremony) is led by the couple's families and elders. Expect formal speeches, the presentation of drinks and gifts to the bride's family, and an exchange where the groom's family asks formally for the bride's hand — and her family formally accepts. {roleLine} The atmosphere is joyful but the proceedings themselves are formal: elders speak on behalf of the families rather than the couple.",
    },
    {
      id: "greetings",
      title: "Greetings & how to address people",
      body:
        "Greet elders first, by title, with a time-appropriate greeting and your right hand. Family heads and elders on both sides deserve particular respect — Nana for chiefs and honoured elders, Maame or Owura/Awuraa as you learned in the journey. If you are introduced, receive the introduction standing. {corpusNote}The phrases below come from the verified greetings corpus.",
      items: [
        "Greet elders first, by title, with the time-appropriate greeting.",
        "Stand when you are introduced or greeted.",
        "Use only your right hand for handshakes and giving or receiving.",
      ],
    },
    {
      id: "clothing",
      title: "What to wear",
      body:
        "Traditional events call for cloth: women commonly wear kaba and slit (a tailored blouse and wrap skirt) or kente for close family, and men wear kente or cloth wrappers with a matching shirt for major occasions. Guests usually wear elegant African print or cloth in celebratory colours — the opposite of a funeral. If there is an assigned colour scheme (common for weddings), follow it. Dress modestly and comfortably; ceremonies run long.",
      items: [
        "Cloth, kente or African print — bright, celebratory colours are welcome here.",
        "Check whether the couple has set a colour theme and follow it.",
        "Dress modestly; ceremonies and photos run long, so be comfortable.",
      ],
    },
    {
      id: "conduct",
      title: "Conduct during the ceremony",
      body:
        "Defer to the elders running the programme: wait to be seated or directed, don't wander during formal presentations, and keep commentary during speeches minimal. Applause and ululation are welcome at the right moments — follow the room. If you are given a role (carrying gifts, assisting the family), treat it as an honour and take direction well.",
      items: [
        "Wait to be directed to your seat; follow the programme.",
        "Keep noise down during formal presentations and speeches.",
        "If assigned a role, accept it as an honour and follow instructions.",
      ],
    },
    {
      id: "gifts",
      title: "Gifts & contributions",
      body:
        "Drinks and money are the traditional pillars of the occasion — the groom's family formally presents drinks (and other agreed items) to the bride's family, and guests typically contribute monetary gifts, often in an envelope or via a designated collection point. Hand anything you give with your right hand. A warm spoken blessing alongside your gift is appreciated more than an elaborate amount.",
      items: [
        "Bring a monetary gift; envelopes or a designated point are typical.",
        "Give and receive everything with your right hand.",
        "Add a short spoken blessing — words carry as much weight as the gift.",
      ],
    },
    {
      id: "avoid",
      title: "What to avoid",
      body:
        "Do not upstage the couple with loud personal announcements or dressing that overshadows the families' colour theme. Avoid interrupting the formal presentations even if proceedings feel slow — the formality is the point. And never hand things with your left hand, even casually.",
      items: [
        "Don't upstage the couple or the families' colour theme.",
        "Don't interrupt formal presentations, even when they run long.",
        "Never use your left hand to give or receive.",
      ],
    },
  ],
  familyQuestions: [
    "Ask your family: What is our family's custom at engagements — what do guests typically give?",
    "Ask an elder: What should a young person never do at a traditional marriage?",
    "Ask your family: Is there a phrase or blessing our family says at weddings?",
  ],
};

export const PLAYBOOKS: Record<EventType, EventPlaybook> = {
  funeral: FUNERAL_PLAYBOOK,
  wedding: WEDDING_PLAYBOOK,
};

export const PLAYBOOK_SOURCE_NOTE = EVENT_SOURCE_NOTE;

/** Fill a body template with learner-specific lines. */
export function fillBody(
  body: string,
  vars: { roleLine: string; corpusNote: string },
): string {
  return body.replace("{roleLine}", vars.roleLine).replace("{corpusNote}", vars.corpusNote);
}

/**
 * Client-safe helper: build the Culture Bank items a learner can save from a
 * briefing. Lives here (not in `lib/rag/event-briefing.ts`) because that
 * module is server-only.
 */
export function briefingToBankItems(
  briefing: Pick<
    import("@/lib/types").EventBriefing,
    "eventTitle" | "sections"
  >,
): { text: string; detail?: string; category: "word" | "saying" | "insight" }[] {
  const items: { text: string; detail?: string; category: "word" | "saying" | "insight" }[] = [];
  for (const section of briefing.sections) {
    for (const phrase of section.phrases ?? []) {
      items.push({
        text: `${phrase.twi} — ${phrase.english}`,
        detail: phrase.notes ?? `${briefing.eventTitle} · ${section.title}`,
        category: "word",
      });
    }
    for (const item of section.items ?? []) {
      items.push({ text: item, detail: section.title, category: "insight" });
    }
  }
  return items;
}
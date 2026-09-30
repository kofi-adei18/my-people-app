import type {
  FamilyData,
  FamilyMessage,
  FamilyStory,
  FamilyThread,
} from "@/lib/family/types";

// ─── Seed data ────────────────────────────────────────────────────────────────
// Preconfigured demo family: the child (you) + Dad, connected. Four family
// stories already exist so /heritage feels alive from the first visit. The
// live demo creates "Why We Named You Kwame" in real time.

const DAY = 24 * 60 * 60 * 1000;

const CHILD_ID = "user-child";
const DAD_ID = "user-dad";

interface SeedExchange {
  question: string;
  answer: string;
  story: Omit<
    import("@/lib/family/types").FamilyStory,
    "id" | "threadId" | "messageIds" | "createdAt" | "seeded"
  >;
  daysAgo: number;
}

const EXCHANGES: SeedExchange[] = [
  {
    question: "Dad, where does our family actually come from?",
    answer:
      "Our people come from Ejisu, a town just outside Kumasi in the Ashanti Region. Your great-great-grandfather was a cocoa farmer there, and the family land is still in Ejisu today. Your grandfather moved to Accra for work in the sixties, and that is where I was born — but every Christmas when I was a boy we travelled back to Ejisu for the harvest. That is where our family story begins, and it is why I always tell you we are Ashanti before anything else.",
    story: {
      title: "Where Our Family Comes From",
      story:
        "The family's roots are in Ejisu, a town just outside Kumasi in Ghana's Ashanti Region. Great-great-grandfather farmed cocoa on family land that still exists in Ejisu today. In the sixties, Grandfather moved to Accra for work, where Dad was born — yet every Christmas of Dad's boyhood the family travelled back to Ejisu for the harvest. Being Ashanti, Dad says, comes before anything else.",
      transcript:
        "Our people come from Ejisu, a town just outside Kumasi in the Ashanti Region. Your great-great-grandfather was a cocoa farmer there, and the family land is still in Ejisu today. Your grandfather moved to Accra for work in the sixties, and that is where I was born — but every Christmas when I was a boy we travelled back to Ejisu for the harvest. That is where our family story begins, and it is why I always tell you we are Ashanti before anything else.",
      speaker: "Dad",
      topics: ["origins", "Ejisu", "Kumasi", "cocoa farming", "family history"],
      people: ["Great-great-grandfather", "Grandfather", "Dad"],
      places: ["Ejisu", "Kumasi", "Ashanti Region", "Accra"],
      traditions: ["returning to Ejisu for the Christmas harvest"],
      languages: [],
      names: [],
    },
    daysAgo: 21,
  },
  {
    question: "What traditions did Grandma and Grandpa always keep?",
    answer:
      "The one I remember most is the outdooring — the naming ceremony on the eighth day after a child is born. Your grandmother made sure every one of us had one; family gathers at dawn, and the baby is carried outside and shown to the world for the first time, and the elders announce the name. And whenever there was a big milestone — a wedding, a funeral, even your christening — we wore kente, the proper handwoven kind from Bonwire. Grandma used to say a milestone is not complete until the kente is on.",
    story: {
      title: "The Tradition We Always Keep",
      story:
        "The tradition Dad remembers most is the outdooring — the naming ceremony held at dawn on the eighth day after a child is born, when the family gathers and elders carry the baby outside to be shown to the world and named. Grandmother made sure every child in the family had one. For every milestone — weddings, funerals, christenings — the family wears proper handwoven kente from Bonwire. Grandma's rule: a milestone is not complete until the kente is on.",
      transcript:
        "The one I remember most is the outdooring — the naming ceremony on the eighth day after a child is born. Your grandmother made sure every one of us had one; family gathers at dawn, and the baby is carried outside and shown to the world for the first time, and the elders announce the name. And whenever there was a big milestone — a wedding, a funeral, even your christening — we wore kente, the proper handwoven kind from Bonwire. Grandma used to say a milestone is not complete until the kente is on.",
      speaker: "Dad",
      topics: ["outdooring", "naming ceremony", "kente", "traditions"],
      people: ["Grandmother", "Dad"],
      places: ["Bonwire"],
      traditions: ["outdooring (naming ceremony on the eighth day)", "wearing handwoven kente from Bonwire at milestones"],
      languages: [],
      names: [],
    },
    daysAgo: 14,
  },
  {
    question: "Tell me a story about Grandfather.",
    answer:
      "Your grandfather Kofi was a patient man — he had to be, farming cocoa in Ejisu. As a boy I followed him around the farm carrying his cutlass, and he taught me to read the sky: when the clouds gathered over the escarpment, we raced to cover the drying cocoa beans before the rain. He was also the family's storyteller. At night we sat around the lamp and he told Ananse stories, and he always stopped at the good part and said, 'The rest will keep.' I think that is where I get my slowness to speak — Grandfather believed the best stories are told unhurried.",
    story: {
      title: "A Story About Grandfather",
      story:
        "Grandfather Kofi farmed cocoa in Ejisu with a patience the work demanded. As a boy, Dad followed him around the farm carrying his cutlass, learning to read the sky — when clouds gathered over the escarpment, they raced to cover the drying cocoa beans before the rain. At night Grandfather was the family's storyteller, telling Ananse stories by lamplight, always stopping at the best part to say, 'The rest will keep.' Dad traces his own unhurried way of speaking to him: Grandfather believed the best stories are told slowly.",
      transcript:
        "Your grandfather Kofi was a patient man — he had to be, farming cocoa in Ejisu. As a boy I followed him around the farm carrying his cutlass, and he taught me to read the sky: when the clouds gathered over the escarpment, we raced to cover the drying cocoa beans before the rain. He was also the family's storyteller. At night we sat around the lamp and he told Ananse stories, and he always stopped at the good part and said, 'The rest will keep.' I think that is where I get my slowness to speak — Grandfather believed the best stories are told unhurried.",
      speaker: "Dad",
      topics: ["Grandfather", "cocoa farming", "Ananse stories", "Ejisu"],
      people: ["Grandfather Kofi", "Dad"],
      places: ["Ejisu"],
      traditions: ["telling Ananse stories by lamplight"],
      languages: [],
      names: ["Kofi — Akan day name, born on a Friday"],
    },
    daysAgo: 7,
  },
  {
    question: "What language did you grow up speaking at home?",
    answer:
      "Twi — Asante Twi, the kind spoken back home. At home with your grandparents it was Twi only; English was for school. Grandma would pretend she could not hear me if I answered her in English, so I learned fast. The first thing every child in this family learns is the greeting: you never walk past an elder without saying Me ma wo akye in the morning, and you greet with a slight bow. Even now, when I call my cousin in Kumasi, we slip into Twi within the first minute without noticing.",
    story: {
      title: "The Language We Grew Up Speaking",
      story:
        "Dad grew up speaking Asante Twi at home — English was only for school. Grandmother would pretend not to hear him if he answered in English, so he learned quickly. The first thing every child in the family learns is the greeting: never pass an elder without saying Me ma wo akye in the morning, given with a slight bow. Even today, calls with cousins in Kumasi slip into Twi within the first minute.",
      transcript:
        "Twi — Asante Twi, the kind spoken back home. At home with your grandparents it was Twi only; English was for school. Grandma would pretend she could not hear me if I answered her in English, so I learned fast. The first thing every child in this family learns is the greeting: you never walk past an elder without saying Me ma wo akye in the morning, and you greet with a slight bow. Even now, when I call my cousin in Kumasi, we slip into Twi within the first minute without noticing.",
      speaker: "Dad",
      topics: ["language", "Asante Twi", "greetings", "etiquette"],
      people: ["Grandmother", "Dad"],
      places: ["Kumasi"],
      traditions: ["greeting elders with Me ma wo akye and a slight bow"],
      languages: ["Asante Twi"],
      names: [],
    },
    daysAgo: 3,
  },
];

export function buildSeedFamily(): FamilyData {
  const now = Date.now();
  const messages: FamilyMessage[] = [];
  const stories: FamilyStory[] = [];

  // One thread per relative — all seed exchanges live in the single Dad thread.
  const threadId = "thread-dad";
  const threads: FamilyThread[] = [
    {
      id: threadId,
      userId: CHILD_ID,
      recipientId: DAD_ID,
      createdAt: now - 22 * DAY,
    },
  ];

  for (const exchange of EXCHANGES) {
    const questionId = `msg-seed-q-${exchange.daysAgo}`;
    const answerId = `msg-seed-a-${exchange.daysAgo}`;
    const createdAt = now - exchange.daysAgo * DAY;

    messages.push({
      id: questionId,
      threadId,
      sender: "child" as const,
      text: exchange.question,
      extracted: true,
      createdAt: createdAt - 60_000,
    });
    messages.push({
      id: answerId,
      threadId,
      sender: "relative" as const,
      text: exchange.answer,
      extracted: true,
      createdAt,
    });
    stories.push({
      id: `story-seed-${exchange.daysAgo}`,
      threadId,
      messageIds: [questionId, answerId],
      ...exchange.story,
      createdAt,
      seeded: true,
    });
  }

  return {
    users: [
      {
        id: CHILD_ID,
        name: "Kwame",
        role: "child",
        relation: "You",
        connected: true,
      },
      {
        id: DAD_ID,
        name: "Kwame's Dad",
        role: "relative",
        relation: "Dad",
        connected: true,
      },
    ],
    threads,
    messages,
    stories,
    knowledge: {
      familyId: "family-demo",
      origins: ["Ejisu, near Kumasi, Ashanti Region", "Accra"],
      languages: ["Asante Twi"],
      traditions: [
        "outdooring (naming ceremony on the eighth day)",
        "wearing handwoven kente from Bonwire at milestones",
        "returning to Ejisu for the Christmas harvest",
        "greeting elders with Me ma wo akye and a slight bow",
      ],
      names: ["Kofi — Akan day name, born on a Friday"],
      people: [
        "Dad",
        "Grandfather Kofi",
        "Grandmother",
        "Great-great-grandfather",
      ],
    },
  };
}

export const SEED_IDS = { CHILD_ID, DAD_ID };

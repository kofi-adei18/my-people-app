import { NextRequest, NextResponse } from "next/server";
import type { CultureBankItem, FamilyDiscovery, FamilyAnalysis } from "@/lib/types";
import { normalizeProfile } from "@/lib/rag/normalize";
import { tryLLM, extractJson } from "@/lib/rag/llm-utils";

export const runtime = "nodejs";

/**
 * Receive a family discovery (question → answer) and return enriched
 * insights, culture bank items, and a next-focus suggestion.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      discovery?: unknown;
      profile?: unknown;
      progress?: unknown;
    };
    const discovery = body.discovery as Partial<FamilyDiscovery> | undefined;
    if (
      !discovery ||
      typeof discovery.answer !== "string" ||
      !discovery.answer.trim()
    ) {
      return NextResponse.json(
        { error: "A family discovery with an answer is required." },
        { status: 400 },
      );
    }

    const profile = normalizeProfile(body.profile);
    const id = `disc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const normalized: FamilyDiscovery = {
      id,
      day: discovery.day ?? 5,
      question: String(discovery.question ?? "What did your family say?"),
      answer: String(discovery.answer ?? ""),
      relatedConcept: String(discovery.relatedConcept ?? "family"),
      insights: Array.isArray(discovery.insights) ? discovery.insights : [],
      createdAt: Date.now(),
    };

    const enriched = await enrichDiscovery(normalized, profile);
    return NextResponse.json({ ok: true, ...enriched });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while analysing the discovery.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

async function enrichDiscovery(
  d: FamilyDiscovery,
  profile: import("@/lib/types").UserProfile,
): Promise<FamilyAnalysis> {
  const base = buildFallback(d);
  const system = `You are the Asante culture tutor inside My People. A family member shared something with the learner during the Day 5 family mission. Provide 2-3 brief, grounded insights drawn from their words; one culture bank item (category "family-discovery", text under 30 words); and a next-focus recommendation (1 sentence, under 30 words). Return JSON as {"insights":["..."],"bankItem":{"text":"...","detail":"..."},"nextFocus":"..."}.`;
  const user = `Learner profile: ${profile.location}, connection level ${profile.culturalConnectionLevel}, goals: ${profile.learningGoals.join(", ") || "none"}.
Question: ${d.question}
Answer: ${d.answer}
Related concept: ${d.relatedConcept}`;

  const result = await tryLLM(system, user, 600);
  if (!result.ok) return base;

  const json = extractJson<{ insights?: string[]; bankItem?: { text?: string; detail?: string }; nextFocus?: string }>(result.content);
  if (!json) return base;

  const bankItems: CultureBankItem[] = json.bankItem?.text
    ? [
        {
          id: d.id,
          category: "family-discovery",
          text: json.bankItem.text.trim(),
          detail: json.bankItem.detail?.trim(),
          day: d.day,
          source: "family",
          createdAt: Date.now(),
        },
      ]
    : base.bankItems;

  return {
    insights: json.insights?.length ? json.insights : base.insights,
    bankItems,
    nextFocus: json.nextFocus?.trim() || base.nextFocus,
    mode: "rag",
  };
}

function buildFallback(d: FamilyDiscovery): FamilyAnalysis {
  const bankItems: CultureBankItem[] = [
    {
      id: d.id,
      category: "family-discovery",
      text: d.answer.slice(0, 120),
      detail: d.question,
      day: d.day,
      source: "family",
      createdAt: Date.now(),
    },
  ];
  const conceptFocus = d.relatedConcept.includes("etiquette") || d.relatedConcept.includes("politeness")
    ? "politeness and etiquette"
    : d.relatedConcept.includes("greeting")
      ? "greetings"
      : "the core greetings and politeness phrases";
  return {
    insights: [
      d.insights?.[0] ?? `"${d.question}" → "${d.answer.slice(0, 80)}"`,
      `This tells you that ${conceptFocus} is something your family already carries.`,
    ],
    bankItems,
    nextFocus: `Review ${conceptFocus} once more before tomorrow, then you're ready for the final challenge.`,
    mode: "demo",
  };
}
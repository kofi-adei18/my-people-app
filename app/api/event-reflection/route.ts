import { NextRequest, NextResponse } from "next/server";
import { normalizeProfile } from "@/lib/rag/normalize";
import { tryLLM, extractJson } from "@/lib/rag/llm-utils";
import type { EventType } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Post-event reflection: two prompts ("what went well", "what to change")
 * become grounded insights and Culture Bank items. LLM if a key exists;
 * extractive fallback otherwise — mirrors /api/family-analyze.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId?: string;
      eventType?: string;
      eventTitle?: string;
      wentWell?: string;
      wouldChange?: string;
      profile?: unknown;
    };

    const wentWell = String(body.wentWell ?? "").trim();
    const wouldChange = String(body.wouldChange ?? "").trim();
    if (!wentWell && !wouldChange) {
      return NextResponse.json(
        { error: "Share at least one of the two reflections." },
        { status: 400 },
      );
    }
    if (wentWell.length > 1000 || wouldChange.length > 1000) {
      return NextResponse.json(
        { error: "Please keep reflections under 1000 characters each." },
        { status: 400 },
      );
    }

    const profile = normalizeProfile(body.profile);
    const eventType = (body.eventType as EventType | undefined) ?? "funeral";
    const eventTitle = String(body.eventTitle ?? "the event").slice(0, 200);

    const base = fallback(wentWell, wouldChange);
    const system = `You are the Asante culture tutor inside My People. A learner just attended a ${eventType} ("${eventTitle}") they prepared for. From their two reflections, produce 2-3 brief, encouraging insights (each under 30 words) and 1-2 culture bank items worth keeping (each under 30 words). Never invent traditions. Return JSON as {"insights":["..."],"bankItems":[{"text":"...","detail":"..."}]}.`;
    const user = `Went well: ${wentWell || "(not given)"}
Would change / unsure about: ${wouldChange || "(not given)"}
Learner: ${profile.location}, connection level ${profile.culturalConnectionLevel}.`;

    const result = await tryLLM(system, user, 500);
    if (result.ok) {
      const parsed = extractJson<{
        insights?: string[];
        bankItems?: { text?: string; detail?: string }[];
      }>(result.content);
      if (parsed) {
        const insights = (parsed.insights ?? []).filter((i) => typeof i === "string" && i.trim()).slice(0, 3);
        const bankItems = (parsed.bankItems ?? [])
          .filter((b) => typeof b?.text === "string" && b.text.trim())
          .slice(0, 2)
          .map((b) => ({ text: b.text!.trim(), detail: b.detail?.trim() || "Event reflection" }));
        return NextResponse.json({
          ok: true,
          insights: insights.length > 0 ? insights : base.insights,
          bankItems: bankItems.length > 0 ? bankItems : base.bankItems,
        });
      }
    }

    return NextResponse.json({ ok: true, ...base });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while reflecting on the event.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

function fallback(wentWell: string, wouldChange: string): {
  insights: string[];
  bankItems: { text: string; detail: string }[];
} {
  const insights: string[] = [];
  if (wentWell) {
    insights.push(`What went well — "${wentWell.slice(0, 100)}" — is worth repeating at the next gathering.`);
  }
  if (wouldChange) {
    insights.push(`Your "next time" note ("${wouldChange.slice(0, 100)}") is exactly what preparation is for.`);
  }
  if (insights.length === 0) {
    insights.push("You showed up prepared — that already sets you apart.");
  }
  insights.push("Every event you attend with intention deepens the thread to your people.");
  const bankItems = [
    wentWell && { text: wentWell.slice(0, 120), detail: "What went well at the event" },
    wouldChange && { text: wouldChange.slice(0, 120), detail: "To try differently next time" },
  ].filter((b): b is { text: string; detail: string } => Boolean(b));
  return { insights, bankItems };
}
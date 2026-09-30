import { NextRequest, NextResponse } from "next/server";
import { generateEventPrep } from "@/lib/rag/event-prep";
import { normalizeProfile } from "@/lib/rag/normalize";

export const runtime = "nodejs";

/**
 * Generate a manual event-prep journey. Stateless: the learner describes the
 * event in the request body; structure comes from the tutor LLM under strict
 * RAG grounding, with a deterministic fallback when no key is configured.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventTitle?: string;
      eventDate?: number;
      details?: {
        role?: string;
        region?: string;
        notes?: string;
      };
      profile?: unknown;
    };

    const eventTitle = String(body.eventTitle ?? "").trim();
    const eventDate = Number(body.eventDate) || 0;

    if (!eventTitle || eventTitle.length > 200) {
      return NextResponse.json(
        { error: "An event title (under 200 characters) is required." },
        { status: 400 },
      );
    }
    for (const [key, value] of Object.entries(body.details ?? {})) {
      if (typeof value === "string" && value.length > 1000) {
        return NextResponse.json(
          { error: `Please keep ${key} under 1000 characters.` },
          { status: 400 },
        );
      }
    }

    const profile = normalizeProfile(body.profile);
    const result = await generateEventPrep({
      eventTitle,
      eventDate,
      details: {
        role: body.details?.role?.trim() || undefined,
        region: body.details?.region?.trim() || undefined,
        notes: body.details?.notes?.trim() || undefined,
      },
      profile,
    });

    if (!result.ok) {
      if (result.reason === "not-cultural") {
        return NextResponse.json(
          { ok: false, error: result.message, reason: "not-cultural" },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { ok: false, error: result.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, journey: result.journey });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while preparing your journey.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

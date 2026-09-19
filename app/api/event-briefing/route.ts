import { NextRequest, NextResponse } from "next/server";
import { generateEventBriefing } from "@/lib/rag/event-briefing";
import { normalizeProfile } from "@/lib/rag/normalize";
import { EVENT_TYPES, type EventType } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Generate a cultural-event briefing (greetings, clothing, conduct) for a
 * detected upcoming event. Stateless: profile arrives in the body, the
 * playbook + retrieved corpus provide grounding, LLM refines prose only.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId?: string;
      eventTitle?: string;
      eventDate?: number;
      eventType?: string;
      details?: {
        role?: string;
        dressCodeKnown?: boolean;
        region?: string;
        notes?: string;
      };
      profile?: unknown;
    };

    const eventTitle = String(body.eventTitle ?? "").trim();
    const eventDate = Number(body.eventDate);
    const eventType = body.eventType as EventType | undefined;

    if (!eventTitle || eventTitle.length > 200) {
      return NextResponse.json(
        { error: "An event title (under 200 characters) is required." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(eventDate)) {
      return NextResponse.json({ error: "A valid event date is required." }, { status: 400 });
    }
    if (!eventType || !EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `An event type (${EVENT_TYPES.join(" or ")}) is required.` },
        { status: 400 },
      );
    }
    if (body.details?.notes && body.details.notes.length > 1000) {
      return NextResponse.json(
        { error: "Please keep notes under 1000 characters." },
        { status: 400 },
      );
    }

    const profile = normalizeProfile(body.profile);
    const briefing = await generateEventBriefing({
      eventTitle,
      eventDate,
      eventType,
      details: {
        role: body.details?.role?.trim() || undefined,
        dressCodeKnown: body.details?.dressCodeKnown,
        region: body.details?.region?.trim() || undefined,
        notes: body.details?.notes?.trim() || undefined,
      },
      profile,
    });

    // Bind to the caller's event id if provided.
    if (body.eventId) briefing.eventId = body.eventId;
    return NextResponse.json({ ok: true, briefing });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while preparing the briefing.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
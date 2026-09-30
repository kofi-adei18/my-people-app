import { NextRequest, NextResponse } from "next/server";
import { generateCalendarPrep } from "@/lib/rag/calendar-prep";
import { normalizeProfile } from "@/lib/rag/normalize";
import { EVENT_TYPES, type EventType } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Generate a calendar prep journey: dynamic arc composed from the days left,
 * playbook-grounded step content, corpus-gated phrases, and the full briefing
 * attached as the rehearse step's day-of rundown. Distinct from the manual
 * free-form /api/event-prep journeys.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId?: string;
      eventTitle?: string;
      eventDate?: number;
      eventType?: string;
      leadTimeDays?: number;
      details?: {
        role?: string;
        dressCodeKnown?: boolean;
        region?: string;
        notes?: string;
      };
      profile?: unknown;
    };

    const eventId = String(body.eventId ?? "").trim();
    const eventTitle = String(body.eventTitle ?? "").trim();
    const eventDate = Number(body.eventDate);
    const eventType = body.eventType as EventType | undefined;

    if (!eventId || !eventTitle || eventTitle.length > 200) {
      return NextResponse.json(
        { error: "An event id and title (under 200 characters) are required." },
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

    const profile = normalizeProfile(body.profile);
    const journey = await generateCalendarPrep({
      eventId,
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
      leadTimeDays:
        Number.isFinite(body.leadTimeDays) && Number(body.leadTimeDays) >= 1
          ? Math.min(30, Number(body.leadTimeDays))
          : 7,
    });

    return NextResponse.json({ ok: true, journey });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while preparing the journey.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
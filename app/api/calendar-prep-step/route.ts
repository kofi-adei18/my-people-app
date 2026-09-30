import { NextRequest, NextResponse } from "next/server";
import { refineCalendarStep } from "@/lib/rag/calendar-prep";
import { normalizeProfile } from "@/lib/rag/normalize";
import { PREP_STEPS, type CalendarPrepJourney, type PrepStepId } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Lazy prose refinement for a single prep-journey step. The journey's
 * deterministic base is always shown first; this warms up the prose when a
 * key is configured. Falls back to the input step on any failure.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      journey?: CalendarPrepJourney;
      stepId?: string;
      profile?: unknown;
    };

    const journey = body.journey;
    const stepId = body.stepId as PrepStepId | undefined;

    if (
      !journey ||
      typeof journey.eventId !== "string" ||
      !journey.stepIds ||
      !Array.isArray(journey.stepIds) ||
      !journey.steps
    ) {
      return NextResponse.json({ error: "A valid journey is required." }, { status: 400 });
    }
    if (!stepId || !PREP_STEPS.includes(stepId) || !journey.steps[stepId]) {
      return NextResponse.json({ error: "A valid step id is required." }, { status: 400 });
    }

    const profile = normalizeProfile(body.profile);
    const step = await refineCalendarStep(journey, stepId, profile);
    return NextResponse.json({ ok: true, step });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while refining this step.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
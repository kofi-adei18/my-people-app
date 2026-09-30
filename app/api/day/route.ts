import { NextRequest, NextResponse } from "next/server";
import { generateDay } from "@/lib/rag/day";
import { normalizeProfile, normalizeProgress } from "@/lib/rag/normalize";
import { journeyDay } from "@/lib/journey";

export const runtime = "nodejs";

/**
 * Day content for days 1–5 (lesson + family mission days).
 * Day 6 → /api/reflection, Day 7 → /api/challenge.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      day?: number;
      profile?: unknown;
      progress?: unknown;
      hour?: number;
    };
    const day = Number(body.day);
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return NextResponse.json({ error: "A valid day (1–7) is required." }, { status: 400 });
    }
    const def = journeyDay(day);
    if (!def || (def.dayType !== "lesson" && def.dayType !== "family")) {
      return NextResponse.json(
        { error: "This day is not served by /api/day (see /api/reflection or /api/challenge)." },
        { status: 400 },
      );
    }
    const profile = normalizeProfile(body.profile);
    const progress = normalizeProgress(body.progress);
    const hour = typeof body.hour === "number" ? body.hour : new Date().getHours();
    const content = await generateDay(day, profile, progress, hour);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while preparing this day.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { generateDay } from "@/lib/rag/day";
import { normalizeProfile, normalizeProgress } from "@/lib/rag/normalize";

export const runtime = "nodejs";

/** Day 6 reflection — an identity snapshot built from the learner's progress. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { profile?: unknown; progress?: unknown };
    const profile = normalizeProfile(body.profile);
    const progress = normalizeProgress(body.progress);
    const content = await generateDay(6, profile, progress);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while preparing your reflection.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
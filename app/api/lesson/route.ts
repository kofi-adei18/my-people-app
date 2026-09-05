import { NextRequest, NextResponse } from "next/server";
import { LESSONS } from "@/lib/constants";
import { generateLessonContent } from "@/lib/rag/lesson";
import { normalizeProfile } from "@/lib/rag/normalize";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { slug?: string; profile?: unknown };
    const slug = String(body.slug ?? "").trim();
    const lesson = LESSONS.find((l) => l.slug === slug);
    if (!lesson) {
      return NextResponse.json(
        { error: "Unknown lesson." },
        { status: 404 },
      );
    }
    const profile = normalizeProfile(body.profile);
    const content = await generateLessonContent(lesson, profile);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while preparing this lesson.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
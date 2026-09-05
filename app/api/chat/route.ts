import { NextRequest, NextResponse } from "next/server";
import { askGuide } from "@/lib/rag/llm";
import { normalizeProfile } from "@/lib/rag/normalize";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { question?: string; profile?: unknown };
    const question = String(body.question ?? "").trim();
    if (!question) {
      return NextResponse.json(
        { error: "A question is required." },
        { status: 400 },
      );
    }
    if (question.length > 800) {
      return NextResponse.json(
        { error: "Please keep questions under 800 characters." },
        { status: 400 },
      );
    }
    const profile = normalizeProfile(body.profile);
    const result = await askGuide(question, profile);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while reaching the cultural guide.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
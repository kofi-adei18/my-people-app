import { NextRequest, NextResponse } from "next/server";
import { storiesFor } from "@/lib/family/store";
import { answerFamilyQuestion } from "@/lib/family/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { question?: string };
    const question = String(body.question ?? "").trim();
    if (!question) {
      return NextResponse.json({ ok: false, error: "Ask a question first." }, { status: 400 });
    }
    if (question.length > 800) {
      return NextResponse.json(
        { ok: false, error: "Please keep questions under 800 characters." },
        { status: 400 },
      );
    }
    const answer = await answerFamilyQuestion(question, storiesFor());
    return NextResponse.json({ ok: true, ...answer });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while answering.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

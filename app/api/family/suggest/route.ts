import { NextResponse } from "next/server";
import { childUser, knowledge, readFamily } from "@/lib/family/store";
import { suggestQuestions } from "@/lib/family/ai";

export const runtime = "nodejs";

const GENERIC_QUESTIONS = [
  { label: "Why was I given my name?", question: "Why was I given my name?" },
  { label: "Where does our family come from?", question: "Where does our family come from?" },
  { label: "What traditions did Grandma and Grandpa keep?", question: "What traditions did Grandma and Grandpa always keep?" },
  { label: "What was Grandfather like?", question: "What was Grandfather like when he was young?" },
];

export async function GET() {
  try {
    const data = readFamily();
    const answeredTitles = new Set(data.stories.map((s) => s.title.toLowerCase()));
    const suggestions = await suggestQuestions(childUser().name, knowledge());
    const filtered = suggestions.filter(
      (q) => !answeredTitles.has(q.question.toLowerCase()),
    );
    return NextResponse.json({
      ok: true,
      suggestions: (filtered.length > 0 ? filtered : suggestions).slice(0, 4),
    });
  } catch {
    return NextResponse.json({ ok: true, suggestions: GENERIC_QUESTIONS.slice(0, 4) });
  }
}

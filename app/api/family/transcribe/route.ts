import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AUDIO_DIR } from "@/lib/family/store";
import { transcribeAudio } from "@/lib/family/transcribe";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXT = new Set(["webm", "mp4", "m4a", "mp3", "wav", "ogg", "oga"]);

function extOf(name: string, type: string): string {
  const fromName = name.includes(".") ? name.split(".").pop()! : "";
  if (fromName && ALLOWED_EXT.has(fromName.toLowerCase())) return fromName.toLowerCase();
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4") || type.includes("aac")) return "m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  return "webm";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No audio recording was received." },
        { status: 400 },
      );
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "The recording is empty or too large (max 25 MB)." },
        { status: 400 },
      );
    }

    const ext = extOf(file.name, file.type);
    const bytes = new Uint8Array(await file.arrayBuffer());

    const text = await transcribeAudio(bytes, `answer.${ext}`);
    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Transcription isn't available right now — please type your answer instead.",
        },
        { status: 503 },
      );
    }

    // Keep the recording so the family story can be played back later.
    const audioId = randomUUID();
    await writeFile(join(AUDIO_DIR, `${audioId}.${ext}`), bytes);

    return NextResponse.json({ ok: true, text, audioId });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Transcription failed — please type your answer instead.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

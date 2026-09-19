import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { AUDIO_DIR } from "@/lib/family/store";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  webm: "audio/webm",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Ids are server-generated UUIDs — reject anything else (path traversal).
  if (!/^[a-f0-9-]{8,64}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid audio id." }, { status: 400 });
  }
  if (!existsSync(AUDIO_DIR)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const match = readdirSync(AUDIO_DIR).find((f) => f.startsWith(`${id}.`));
  if (!match) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const ext = match.split(".").pop() ?? "";
  const bytes = readFileSync(join(AUDIO_DIR, match));
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": "private, max-age=3600",
      "accept-ranges": "none",
    },
  });
}

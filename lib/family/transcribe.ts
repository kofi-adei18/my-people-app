// Speech-to-text for family voice answers, via OpenAI's transcription API
// (reuses the existing OPENAI_API_KEY). Returns null on any failure so the
// family member can always fall back to typing.

export async function transcribeAudio(
  bytes: Uint8Array,
  filename: string,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }),
      filename,
    );
    form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1");
    form.append("response_format", "json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string };
    const text = json.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

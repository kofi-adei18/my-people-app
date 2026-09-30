/**
 * Shared LLM plumbing for My People: provider calls + JSON extraction.
 *
 * Both the free-form chat (askGuide) and the per-day lesson generator
 * (day.ts) funnel through here so the provider selection and error handling
 * stay consistent. Pure Node fetch, no SDK dependency.
 */

interface LlmResultOk {
  ok: true;
  content: string;
  provider: string;
}

type LlmResult = LlmResultOk | { ok: false };

export async function callOpenAI(system: string, user: string, maxTokens = 700): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("openai empty response");
  return text;
}

export async function callAnthropic(system: string, user: string, maxTokens = 700): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      system: `${system}\nRespond with valid JSON only, no markdown fences.`,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = json.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("anthropic empty response");
  return text;
}

/** Provider choice honours LLM_PROVIDER override, else OpenAI → Anthropic. */
function pickProvider(): "openai" | "anthropic" | null {
  const forced = process.env.LLM_PROVIDER;
  if (forced) {
    if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
    if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/** Call whichever provider is configured; returns ok:false when no key. */
export async function tryLLM(
  system: string,
  user: string,
  maxTokens = 700,
): Promise<LlmResult> {
  const provider = pickProvider();
  if (!provider) return { ok: false };
  try {
    const content =
      provider === "anthropic"
        ? await callAnthropic(system, user, maxTokens)
        : await callOpenAI(system, user, maxTokens);
    return { ok: true, content, provider };
  } catch {
    return { ok: false };
  }
}

/** Pull the first JSON object out of an LLM response (handles stray prose). */
export function extractJson<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}
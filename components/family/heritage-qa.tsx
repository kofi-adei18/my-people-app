"use client";

import { useState } from "react";
import { BookOpenIcon, LoaderIcon, SendIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourcesList } from "@/components/sources-list";
import type { SourceReference } from "@/lib/types";

interface FamilyQaResult {
  family: string;
  cultural: string;
  sources: SourceReference[];
  mode: "llm" | "fallback";
}

const STARTERS = [
  "What have I learned about my family?",
  "Where do we come from?",
  "What traditions do we keep?",
];

function Multiline({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block">
          {line || "\u00A0"}
        </span>
      ))}
    </>
  );
}

export function HeritageQa() {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FamilyQaResult | null>(null);

  const ask = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text || pending) return;
    setQuestion(text);
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/family/qa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string } & FamilyQaResult;
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      setResult(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The answer could not be reached.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-label="Ask what you have learned about your family"
      className="mt-12 rounded-3xl border border-border/80 bg-card/50 p-6"
    >
      <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
        What have I learned about my family?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask anything — the answer comes only from the stories your family has
        shared, with cultural context clearly separated.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
        className="mt-4 flex items-end gap-2"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={1}
          maxLength={800}
          placeholder="What have I learned about my family?"
          aria-label="Your question about your family"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          disabled={pending}
        />
        <Button
          type="submit"
          size="sm"
          className="h-11 shrink-0 rounded-full px-4"
          disabled={!question.trim() || pending}
        >
          {pending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <SendIcon data-icon="inline-end" className="size-4" />
          )}
          <span className="sr-only">{pending ? "Thinking…" : "Ask"}</span>
        </Button>
      </form>

      {!result && !pending && (
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTERS.map((q) => (
            <Button
              key={q}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void ask(q)}
            >
              <SparklesIcon data-icon="inline-start" className="text-gold-deep" />
              {q}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {pending && (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          Gathering what your family has shared…
        </p>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-gold-deep/30 bg-gold/10 p-4">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-gold-deep">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              Your family
            </p>
            <div className="text-sm leading-relaxed text-foreground">
              <Multiline text={result.family} />
            </div>
          </div>
          {result.cultural && (
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <BookOpenIcon className="size-3.5" aria-hidden="true" />
                Cultural context
              </p>
              <div className="text-sm leading-relaxed text-muted-foreground">
                <Multiline text={result.cultural} />
              </div>
            </div>
          )}
          {result.sources.length > 0 && (
            <SourcesList sources={result.sources} />
          )}
        </div>
      )}
    </section>
  );
}

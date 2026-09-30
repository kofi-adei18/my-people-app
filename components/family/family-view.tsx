"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightIcon,
  LoaderIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatThread } from "@/components/family/chat-thread";
import { useProfile } from "@/lib/profile-context";
import { uid, stamp } from "@/lib/id";
import type { QuestionSuggestion } from "@/lib/family/ai";
import type { ThreadPayload } from "@/lib/family/types";

export function FamilyView() {
  const { isCustomized } = useProfile();
  const router = useRouter();

  const [payload, setPayload] = useState<ThreadPayload | null>(null);
  const [suggestions, setSuggestions] = useState<QuestionSuggestion[]>([]);
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/family/thread", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean } & ThreadPayload;
      if (json.ok) setPayload(json);
    } catch {
      // Keep the current state; the poll will retry.
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/family/thread", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean } & ThreadPayload;
        if (json.ok) setPayload(json);
      } catch {
        // The poll below will retry.
      }
    })();
  }, []);

  // Dad may answer from his own device — poll lightly while the tab is open.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && !pending) void refresh();
    }, 5000);
    return () => window.clearInterval(id);
  }, [refresh, pending]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/family/suggest", { cache: "no-store" });
        const json = (await res.json()) as {
          ok: boolean;
          suggestions?: QuestionSuggestion[];
        };
        if (json.ok && json.suggestions) setSuggestions(json.suggestions);
      } catch {
        // Chips are optional; silent fallback to none.
      }
    })();
  }, []);

  const send = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || pending) return;
    setError(null);
    setInput("");
    setPending(true);
    const optimisticId = uid("msg");
    setOptimistic(optimisticId);
    setPayload((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: optimisticId,
                threadId: prev.threadId,
                sender: "child",
                text,
                extracted: false,
                createdAt: stamp(),
              },
            ],
          }
        : prev,
    );
    try {
      const res = await fetch("/api/family/thread", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sender: "child", text }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string } & ThreadPayload;
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      setPayload(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The question could not be sent.",
      );
      setPayload((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) }
          : prev,
      );
    } finally {
      setOptimistic(null);
      setPending(false);
      inputRef.current?.focus();
    }
  };

  if (!isCustomized) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display mt-5 text-3xl font-medium tracking-tight text-foreground">
          Ask My Family
        </h1>
        <p className="mt-3 text-balance text-muted-foreground">
          Set up your cultural profile first so your family&apos;s answers can be
          connected to your heritage.
        </p>
        <Button className="mt-6 rounded-full" onClick={() => router.push("/onboarding")}>
          Create My Cultural Profile
        </Button>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-8 h-[45svh] w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  const openQuestions = (() => {
    let lastRelativeAt = -1;
    for (const m of payload.messages) {
      if (m.sender === "relative") lastRelativeAt = m.createdAt;
    }
    return payload.messages.filter(
      (m) => m.sender === "child" && m.createdAt > lastRelativeAt,
    );
  })();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6">
      <header className="mx-auto w-full max-w-2xl px-2 pt-10 text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          Ask My Family
        </h1>
        <p className="mt-3 text-balance text-muted-foreground">
          Ask the questions only your family can answer. Every answer is
          preserved as a family story.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
            <ShieldCheckIcon className="size-3.5 text-forest-deep" aria-hidden="true" />
            {payload.recipient.relation} — Connected ✓
          </span>
          <Link
            href="/family/respond"
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Answering as {payload.recipient.relation}?
          </Link>
        </div>
      </header>

      {error && (
        <p className="mx-auto mt-4 max-w-2xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <section
        aria-label={`Chat with ${payload.recipient.relation}`}
        className="mt-6 h-[50svh] max-h-[600px] overflow-hidden rounded-2xl border border-border/80 bg-card/50"
      >
        <ChatThread payload={payload} viewer="child" optimisticId={optimistic} />
      </section>

      {openQuestions.length === 0 && suggestions.length > 0 && (
        <div className="mx-auto mt-6 w-full max-w-2xl">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Or pick a question
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((q) => (
              <Button
                key={q.question}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void send(q.question)}
                disabled={pending}
              >
                <SparklesIcon data-icon="inline-start" className="text-gold-deep" />
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mx-auto mt-6 flex w-full max-w-2xl items-end gap-2 pb-4"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          maxLength={800}
          placeholder={`Ask ${payload.recipient.relation} about your heritage…`}
          aria-label="Your question for your family"
          className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <Button
          type="submit"
          className="rounded-full px-5"
          disabled={!input.trim() || pending}
        >
          {pending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
          <span className="sr-only">{pending ? "Sending…" : "Send"}</span>
        </Button>
      </form>
    </main>
  );
}

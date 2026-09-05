"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, SparklesIcon, ShieldIcon, LoaderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Message, MessageAvatar, MessageContent, MessageHeader } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { SourcesList } from "@/components/sources-list";
import { SankofaMark } from "@/components/brand";
import { Markdown } from "@/components/markdown";
import { useProfile } from "@/lib/profile-context";
import { SUGGESTED_QUESTIONS } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";

export function AskView() {
  const { profile, isCustomized } = useProfile();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: `Hello, ${profile.language === "English / Learning Twi" ? "and welcome — I speak a little Twi too!" : "and welcome"}. Ask me anything about your Akan heritage — your family, your names, your proverbs, your past — and I'll ground my answer in My People's curated sources.`,
      createdAt: Date.now(),
      suggested: SUGGESTED_QUESTIONS.map((s) => s.question),
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!isCustomized) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
        <SankofaMark className="size-12 text-gold" />
        <h1 className="font-display mt-5 text-3xl font-medium tracking-tight text-foreground">
          Ask My People
        </h1>
        <p className="mt-3 text-balance text-muted-foreground">
          Set up your cultural profile first so I can personalise every answer to
          your heritage.
        </p>
        <Button className="mt-6 rounded-full" onClick={() => router.push("/onboarding")}>
          Create My Cultural Profile
        </Button>
      </main>
    );
  }

  const send = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || pending) return;
    setError(null);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPending(true);

    const thinkingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: "assistant", content: "", createdAt: Date.now() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, profile }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        content?: string;
        sources?: ChatMessage["sources"];
        mode?: "rag" | "demo";
        error?: string;
      };
      if (!json.ok) throw new Error(json.error ?? "Request failed");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: json.content ?? "",
                sources: json.sources ?? [],
                mode: json.mode,
              }
            : m,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "My People couldn't answer just now.",
      );
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6">
      <header className="mx-auto w-full max-w-2xl px-2 pt-10 text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          Ask My People
        </h1>
        <p className="mt-3 text-balance text-muted-foreground">
          Ask questions about your heritage and I&apos;ll help you explore them —
          grounded in real sources, shaped for where you are.
        </p>
      </header>

      {error && (
        <p className="mx-auto mt-4 max-w-2xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <section
        aria-label="Chat with My People"
        className="mt-6 h-[55svh] max-h-[640px] overflow-hidden rounded-2xl border border-border/80 bg-card/50"
      >
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {messages.map((m, index) => (
                  <MessageScrollerItem
                    key={m.id}
                    messageId={m.id}
                    scrollAnchor={index % 2 === 1}
                  >
                    <Message align={m.role === "user" ? "end" : "start"}>
                      <MessageAvatar>
                        {m.role === "assistant" ? (
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <SankofaMark className="size-5" />
                          </span>
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <ShieldIcon className="size-4" />
                          </span>
                        )}
                      </MessageAvatar>
                      <MessageContent>
                        <MessageHeader>
                          {m.role === "assistant" ? "My People" : "You"}
                        </MessageHeader>

                        {m.content ? (
                          <Bubble
                            variant={m.role === "user" ? "default" : "tinted"}
                            align={m.role === "user" ? "end" : "start"}
                          >
                            <BubbleContent className="max-w-full">
                              {m.role === "assistant" ? (
                                <Markdown>{m.content}</Markdown>
                              ) : (
                                <span className="whitespace-pre-wrap">
                                  {m.content}
                                </span>
                              )}
                            </BubbleContent>
                          </Bubble>
                        ) : (
                          <Bubble variant="muted" align="start">
                            <BubbleContent className="inline-flex items-center gap-2 text-muted-foreground">
                              <Spinner className="size-3.5" />
                              Thinking…
                            </BubbleContent>
                          </Bubble>
                        )}

                        {m.sources && m.sources.length > 0 && (
                          <div className="px-1">
                            <SourcesList sources={m.sources} />
                          </div>
                        )}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </section>

      {messages.length <= 1 && (
        <div className="mx-auto mt-6 w-full max-w-2xl">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Or pick a question
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <Button
                key={q.question}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => send(q.question)}
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
          send();
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
              send();
            }
          }}
          rows={1}
          maxLength={800}
          placeholder="Ask about your heritage…"
          aria-label="Your question"
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
          <span className="sr-only">{pending ? "Thinking…" : "Send"}</span>
        </Button>
      </form>
    </main>
  );
}
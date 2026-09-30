"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  LoaderIcon,
  MicIcon,
  SparklesIcon,
  SquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatThread, MicHint } from "@/components/family/chat-thread";
import { uid, stamp } from "@/lib/id";
import type { FamilyStory, ThreadPayload } from "@/lib/family/types";

export function FamilyRespondView() {
  const [payload, setPayload] = useState<ThreadPayload | null>(null);
  const [savedStories, setSavedStories] = useState<FamilyStory[]>([]);
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [pendingAudioId, setPendingAudioId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/family/thread", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean } & ThreadPayload;
      if (json.ok) setPayload(json);
    } catch {
      // The poll retries shortly.
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

  // The child may ask a new question from their own device — keep listening.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !pending &&
        !recording &&
        !transcribing
      ) {
        void refresh();
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [refresh, pending, recording, transcribing]);

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const form = new FormData();
          form.append(
            "audio",
            new File([blob], "answer.webm", { type: blob.type }),
          );
          const res = await fetch("/api/family/transcribe", {
            method: "POST",
            body: form,
          });
          const json = (await res.json()) as {
            ok: boolean;
            text?: string;
            audioId?: string;
            error?: string;
          };
          if (!json.ok || !json.text) throw new Error(json.error ?? "Transcription failed");
          setInput(json.text);
          setPendingAudioId(json.audioId ?? null);
          inputRef.current?.focus();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Transcription failed — please type your answer instead.",
          );
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError(
        "Microphone access was denied. You can type your answer instead.",
      );
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    setPending(true);
    const optimisticId = uid("msg");
    setOptimistic(optimisticId);
    setInput("");
    setPayload((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: optimisticId,
                threadId: prev.threadId,
                sender: "relative",
                text,
                audioId: pendingAudioId ?? undefined,
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
        body: JSON.stringify({
          sender: "relative",
          text,
          audioId: pendingAudioId,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        savedStories?: FamilyStory[];
        error?: string;
      } & ThreadPayload;
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      setPayload(json);
      if (json.savedStories && json.savedStories.length > 0) {
        setSavedStories(json.savedStories);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The answer could not be sent.",
      );
      setPayload((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) }
          : prev,
      );
    } finally {
      setPendingAudioId(null);
      setOptimistic(null);
      setPending(false);
      inputRef.current?.focus();
    }
  };

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
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold-deep">
          Answering as {payload.recipient.relation}
        </p>
        <h1 className="font-display mt-2 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {payload.child.name} wants to know…
        </h1>
        {openQuestions.length > 0 ? (
          <div className="mx-auto mt-4 max-w-xl space-y-2">
            {openQuestions.map((q) => (
              <p
                key={q.id}
                className="rounded-2xl border border-gold-deep/30 bg-gold/10 px-4 py-3 text-sm text-foreground"
              >
                &ldquo;{q.text}&rdquo;
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-balance text-muted-foreground">
            No new questions right now. {payload.child.name} will be glad you
            are here.
          </p>
        )}
        <div className="mt-4">
          <Link
            href="/family"
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Back to {payload.child.name}&apos;s view
          </Link>
        </div>
      </header>

      {error && (
        <p className="mx-auto mt-4 max-w-2xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {savedStories.length > 0 && (
        <div className="mx-auto mt-4 w-full max-w-2xl space-y-1 rounded-2xl border border-forest-deep/30 bg-forest/10 px-4 py-3 text-sm">
          {savedStories.map((s) => (
            <p key={s.id} className="inline-flex flex-wrap items-center gap-1.5">
              <SparklesIcon className="size-4 text-forest-deep" aria-hidden="true" />
              Preserved as a Family Story:{" "}
              <Link
                href={`/family/story/${s.id}`}
                className="font-medium text-forest-deep underline underline-offset-4"
              >
                {s.title}
              </Link>
            </p>
          ))}
        </div>
      )}

      <section
        aria-label={`Chat with ${payload.child.name}`}
        className="mt-6 h-[45svh] max-h-[560px] overflow-hidden rounded-2xl border border-border/80 bg-card/50"
      >
        <ChatThread payload={payload} viewer="relative" optimisticId={optimistic} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mx-auto mt-6 w-full max-w-2xl pb-4"
      >
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant={recording ? "destructive" : "outline"}
            size="icon"
            aria-label={recording ? "Stop recording" : "Record a voice answer"}
            title={recording ? "Stop recording" : "Record a voice answer"}
            className="size-12 shrink-0 rounded-full"
            onClick={() => void toggleRecording()}
            disabled={pending || transcribing}
          >
            {recording ? <SquareIcon className="size-4" /> : <MicIcon className="size-4" />}
          </Button>
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
            maxLength={4000}
            placeholder={
              transcribing
                ? "Listening…"
                : recording
                  ? "Recording… tap the mic when you are done"
                  : `Answer ${payload.child.name} in your own words…`
            }
            aria-label="Your answer"
            disabled={transcribing || recording}
            className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button
            type="submit"
            className="h-12 shrink-0 rounded-full px-5"
            disabled={!input.trim() || pending || recording || transcribing}
          >
            {pending ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon data-icon="inline-end" />
            )}
            <span className="sr-only">
              {pending ? "Sending…" : "Send answer"}
            </span>
          </Button>
        </div>
        <div className="mt-2 flex h-5 items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            {transcribing
              ? "Transcribing your voice…"
              : pendingAudioId
                ? "Voice transcribed — edit if needed, then send."
                : MicHint({ recording })}
          </span>
          <span>Speak or type — either is fine.</span>
        </div>
      </form>
    </main>
  );
}

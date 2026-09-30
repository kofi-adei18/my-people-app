"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEvents } from "@/lib/events-context";
import { useProfile } from "@/lib/profile-context";
import type { EventReflection } from "@/lib/types";

/**
 * Post-event reflection: two prompts → grounded insights → Culture Bank.
 * Shown once per event after the date passes and the journey is complete.
 */
export function EventReflectionView({
  eventId,
  eventType,
  eventTitle,
  onDone,
  onBack,
}: {
  eventId: string;
  eventType: "funeral" | "wedding";
  eventTitle: string;
  onDone: (reflection: EventReflection) => void;
  onBack: () => void;
}) {
  const { saveEventReflection } = useEvents();
  const { profile, addBankItems } = useProfile();
  const [wentWell, setWentWell] = useState("");
  const [wouldChange, setWouldChange] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/event-reflection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId,
          eventType,
          eventTitle,
          wentWell: wentWell.trim() || undefined,
          wouldChange: wouldChange.trim() || undefined,
          profile,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        insights?: string[];
        bankItems?: { text: string; detail: string }[];
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "The reflection could not be saved.");
      }
      const reflection: EventReflection = {
        eventId,
        wentWell: wentWell.trim(),
        wouldChange: wouldChange.trim(),
        insights: json.insights ?? [],
        bankItems: (json.bankItems ?? []).map((b) => ({
          category: "insight" as const,
          text: b.text,
          detail: b.detail,
          source: "event" as const,
        })),
        createdAt: Date.now(),
      };
      saveEventReflection(eventId, reflection);
      // Bank the reflection items too (profile-guarded by the caller).
      if (profile && reflection.bankItems.length > 0) {
        addBankItems(reflection.bankItems);
      }
      onDone(reflection);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <SparklesIcon className="size-4" aria-hidden="true" />
        Back to the journey
      </button>

      <header className="mt-4">
        <p className="eyebrow">After the event</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight text-foreground text-balance">
          How did {eventTitle} go?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Two short notes is all it takes. What you write becomes part of your
          Culture Bank — the record of how you&apos;re reconnecting.
        </p>
      </header>

      <section className="mt-8 rounded-3xl border border-gold/40 bg-card p-6 sm:p-8">
        <div className="grid gap-5">
          <div>
            <Label htmlFor="reflect-well" className="text-sm font-semibold">
              What went well?
            </Label>
            <Textarea
              id="reflect-well"
              rows={3}
              className="mt-2"
              placeholder="e.g. I greeted the elders first and got Maame's title right. My aunt noticed."
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reflect-change" className="text-sm font-semibold">
              What would you do differently next time?
            </Label>
            <Textarea
              id="reflect-change"
              rows={3}
              className="mt-2"
              placeholder="e.g. I still froze when Nana spoke to me directly — I want to practise that."
              value={wouldChange}
              onChange={(e) => setWouldChange(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            className="rounded-full px-6"
            onClick={submit}
            disabled={submitting || (!wentWell.trim() && !wouldChange.trim())}
          >
            {submitting && <Spinner className="size-4" />}
            Save reflection
          </Button>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Reflections live alongside your journey. Without a profile, they stay
        on this page only —{" "}
        <a href="/onboarding" className="underline underline-offset-4">
          set up your profile
        </a>{" "}
        to keep bank items too.
      </p>
    </main>
  );
}
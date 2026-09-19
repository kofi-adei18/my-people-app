"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEvents } from "@/lib/events-context";
import { useProfile } from "@/lib/profile-context";
import type { EventPrepJourney } from "@/lib/types";

/**
 * The manual entry point for prep journeys: the learner describes an event
 * that isn't on their calendar, and the tutor builds an 8-stage preparation
 * journey for it. Works with or without API keys (deterministic fallback).
 */
export function EventPrepCreate() {
  const router = useRouter();
  const { savePrepJourney } = useEvents();
  const { profile } = useProfile();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notCultural, setNotCultural] = useState(false);

  const submit = async () => {
    setError(null);
    setNotCultural(false);
    setGenerating(true);
    try {
      const eventDate = date ? new Date(`${date}T09:00:00`).getTime() : 0;
      const res = await fetch("/api/event-prep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventTitle: title.trim(),
          eventDate: Number.isFinite(eventDate) ? eventDate : 0,
          details: {
            role: role.trim() || undefined,
            region: region.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          profile,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        journey?: EventPrepJourney;
        error?: string;
        reason?: string;
      };
      if (!res.ok || !json.ok || !json.journey) {
        if (json.reason === "not-cultural") setNotCultural(true);
        throw new Error(json.error ?? "The journey could not be generated.");
      }
      savePrepJourney(json.journey);
      router.push(`/events/prep/${json.journey.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Upcoming events
      </Link>

      <header className="mt-4">
        <p className="eyebrow">Prepare me</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight text-foreground text-balance">
          Build a prep journey
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An Akan gathering that isn&apos;t on your calendar — a naming
          ceremony, an outdooring, a festival, a family occasion you heard
          about. Tell us what it is and we&apos;ll build you an eight-stage
          preparation walk.
        </p>
      </header>

      <section
        aria-label="Describe the event"
        className="mt-8 rounded-3xl border border-gold/40 bg-card p-6 sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="prep-title" className="text-sm font-semibold">
              What is the event?
            </Label>
            <Input
              id="prep-title"
              className="mt-2"
              placeholder="e.g. My niece's naming ceremony in Kumasi"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="prep-date" className="text-sm font-semibold">
              When is it? <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="prep-date"
              type="date"
              className="mt-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="prep-role" className="text-sm font-semibold">
              Your role
            </Label>
            <Input
              id="prep-role"
              className="mt-2"
              placeholder="e.g. uncle of the baby, family friend"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="prep-region" className="text-sm font-semibold">
              Where is it happening?
            </Label>
            <Input
              id="prep-region"
              className="mt-2"
              placeholder="e.g. a town near Kumasi, Accra, London"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="prep-notes" className="text-sm font-semibold">
              Anything else we should know?
            </Label>
            <Textarea
              id="prep-notes"
              className="mt-2"
              rows={3}
              placeholder="e.g. It's my first time attending one. My aunt says there will be a libation pouring."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {notCultural && (
          <Alert className="mt-4">
            <AlertDescription>
              My People prepares you for Akan cultural gatherings — naming
              ceremonies, outdooring, funerals, festivals, family occasions.
              That event looks outside that scope, so the tutor would be
              guessing rather than teaching.
            </AlertDescription>
          </Alert>
        )}

        {error && !notCultural && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            className="rounded-full px-6"
            disabled={!title.trim() || generating}
            onClick={submit}
          >
            {generating ? <Spinner className="size-4" /> : <SparklesIcon data-icon="inline-start" />}
            {generating ? "Building your journey…" : "Build my prep journey"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Works with or without API keys — every step is provisional until
            your family confirms it.
          </span>
        </div>
      </section>
    </main>
  );
}

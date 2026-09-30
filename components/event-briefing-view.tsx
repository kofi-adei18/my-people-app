"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BookMarkedIcon,
  CalendarDaysIcon,
  MapPinIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { SourcesList } from "@/components/sources-list";
import { CalendarPrepJourneyView } from "@/components/calendar-prep-journey";
import { EventReflectionView } from "@/components/event-reflection-view";
import { useEvents } from "@/lib/events-context";
import { useProfile } from "@/lib/profile-context";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { briefingToBankItems } from "@/lib/events/playbooks";
import type { CalendarPrepJourney, EventBriefing, EventType } from "@/lib/types";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * The /events/[id] experience. Priority order:
 * 1. Prep journey (default once started).
 * 2. Post-event reflection — offered once, after the date passes.
 * 3. Questionnaire — "Start prep journey" primary, "Quick briefing" secondary.
 * 4. Briefing-only display (the secondary path, or a legacy briefing).
 */
export function EventBriefingView({ eventId }: { eventId: string }) {
  const {
    events,
    detections,
    briefings,
    upcomingEvents,
    calendarJourneys,
    confirmEventType,
    saveBriefing,
    saveCalendarJourney,
  } = useEvents();
  const { profile } = useProfile();

  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [dressCodeKnown, setDressCodeKnown] = useState(false);
  const [typeChoice, setTypeChoice] = useState<EventType | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflectMode, setReflectMode] = useState(false);

  // Resolve from the FULL stored lists — not the filtered `upcomingEvents`
  // view — so an event stays preparable even when it sits outside the lead
  // window, was dismissed, or its detection is low-confidence.
  const entry = useMemo(() => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      const viaUpcoming = upcomingEvents.find((u) => u.event.id === eventId);
      return viaUpcoming ?? null;
    }
    return {
      event: ev,
      detection: detections[eventId] ?? null,
      briefing: briefings.find((b) => b.eventId === eventId) ?? null,
    };
  }, [events, detections, briefings, upcomingEvents, eventId]);

  const journey = calendarJourneys[eventId] ?? null;
  const briefing = entry?.briefing ?? null;
  const event = entry?.event ?? null;
  const detection = entry?.detection ?? null;
  const chosenType: EventType | null = typeChoice ?? detection?.eventType ?? null;

  if (!event) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-20">
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyTitle>That event isn&apos;t on your list</EmptyTitle>
            <EmptyDescription>
              Connect your calendar or check the events page for what&apos;s coming up.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/events"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              View upcoming events
            </Link>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const allDone = journey
    ? journey.stepIds.every((s) => journey.completedSteps.includes(s))
    : false;
  // Wall-clock check for the post-event reflection trigger. Not reactive
  // by design — it re-evaluates whenever this component re-renders
  // (i.e., on each app open / navigation).
  // eslint-disable-next-line react-hooks/purity
  const pastEvent = Date.now() > event.start + 86_400_000;

  // ── Post-event reflection ──
  if (journey && allDone && pastEvent && reflectMode) {
    return (
      <EventReflectionView
        eventId={event.id}
        eventType={journey.eventType}
        eventTitle={event.title}
        onBack={() => setReflectMode(false)}
        onDone={() => setReflectMode(false)}
      />
    );
  }

  if (journey) {
    return (
      <CalendarPrepJourneyView
        journey={journey}
        onReflect={allDone && pastEvent ? () => setReflectMode(true) : undefined}
      />
    );
  }

  // ── Questionnaire (no journey yet) ──
  const startJourney = async () => {
    if (!chosenType) return;
    setError(null);
    setJourneyLoading(true);
    try {
      const res = await fetch("/api/calendar-prep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.start,
          eventType: chosenType,
          details: {
            role: role.trim() || undefined,
            dressCodeKnown: dressCodeKnown || undefined,
            region: region.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          profile,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; journey?: CalendarPrepJourney; error?: string };
      if (!res.ok || !json.ok || !json.journey) {
        throw new Error(json.error ?? "The journey could not be generated.");
      }
      confirmEventType(event.id, chosenType);
      saveCalendarJourney(json.journey);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setJourneyLoading(false);
    }
  };

  const quickBriefing = async () => {
    if (!chosenType) return;
    setError(null);
    setBriefingLoading(true);
    try {
      const res = await fetch("/api/event-briefing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.start,
          eventType: chosenType,
          details: {
            role: role.trim() || undefined,
            dressCodeKnown: dressCodeKnown || undefined,
            region: region.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          profile,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; briefing?: EventBriefing; error?: string };
      if (!res.ok || !json.ok || !json.briefing) {
        throw new Error(json.error ?? "The briefing could not be generated.");
      }
      confirmEventType(event.id, chosenType);
      saveBriefing(json.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBriefingLoading(false);
    }
  };

  // Briefing-only result (secondary path, or a legacy briefing).
  if (briefing && !journey) {
    return <BriefingDisplay briefing={briefing} eventId={event.id} />;
  }

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
          {event.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="size-3.5 text-gold-deep" aria-hidden="true" />
            {formatDate(event.start)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 text-gold-deep" aria-hidden="true" />
              {event.location}
            </span>
          )}
        </div>
      </header>

      <section
        aria-label="A few details"
        className="mt-8 rounded-3xl border border-gold/40 bg-card p-6 sm:p-8"
      >
        <h2 className="font-display text-xl font-medium text-foreground">
          A few details first
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          What kind of event is this, and what part do you play? The answers
          shape your preparation — your calendar data never leaves your device;
          only what you type here reaches the tutor.
        </p>

        <div className="mt-6">
          <Label className="text-sm font-semibold">What kind of event is it?</Label>
          <RadioGroup
            className="mt-3 grid gap-2"
            value={chosenType ?? ""}
            onValueChange={(v) => setTypeChoice(v as EventType)}
          >
            {(["funeral", "wedding"] as const).map((t) => (
              <Label
                key={t}
                htmlFor={`etype-${t}`}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-background/60 p-4 text-sm font-medium transition-colors ${
                  chosenType === t
                    ? "border-gold-deep/50 bg-gold/5"
                    : "border-border/70 hover:border-foreground/20"
                }`}
              >
                <RadioGroupItem value={t} id={`etype-${t}`} />
                {EVENT_TYPE_LABELS[t]}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brief-role" className="text-sm font-semibold">
              Your role
            </Label>
            <Input
              id="brief-role"
              className="mt-2"
              placeholder="e.g. cousin of the groom, family friend"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="brief-region" className="text-sm font-semibold">
              Where is it happening?
            </Label>
            <Input
              id="brief-region"
              className="mt-2"
              placeholder="e.g. Kumasi, London, a specific town"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="brief-notes" className="text-sm font-semibold">
            Anything else we should know?
          </Label>
          <Textarea
            id="brief-notes"
            className="mt-2"
            rows={3}
            placeholder="e.g. It's a one-week observance for my grandmother's sister. My mother says we're wearing black cloth."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Checkbox
            id="brief-dress"
            checked={dressCodeKnown}
            onCheckedChange={(v) => setDressCodeKnown(v === true)}
          />
          <Label htmlFor="brief-dress" className="cursor-pointer text-sm">
            I already know what I&apos;m wearing
          </Label>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            size="lg"
            className="rounded-full px-6"
            disabled={!chosenType || journeyLoading}
            onClick={startJourney}
          >
            {journeyLoading && <Spinner className="size-4" />}
            <SparklesIcon data-icon="inline-start" />
            Start prep journey
          </Button>
          <p className="text-xs text-muted-foreground">
            A step-by-step journey paced to the days you have left — understand
            the occasion, what to say, how to carry yourself, what to wear,
            giving, family questions, and a day-of checklist. All steps are
            open; go at your own speed.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="self-start rounded-full px-4 text-xs text-muted-foreground"
            disabled={!chosenType || briefingLoading}
            onClick={quickBriefing}
          >
            {briefingLoading && <Spinner className="size-3.5" />}
            Just give me a quick briefing instead
          </Button>
        </div>
      </section>
    </main>
  );
}

// ─── Briefing-only display (secondary path) ───────────────────────────────────

function BriefingDisplay({
  briefing,
  eventId,
}: {
  briefing: EventBriefing;
  eventId: string;
}) {
  const { addBankItems, progress } = useProfile();
  const [savedToBank, setSavedToBank] = useState(false);
  const bankItems = useMemo(() => briefingToBankItems(briefing), [briefing]);

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
        <p className="eyebrow">{EVENT_TYPE_LABELS[briefing.eventType]} briefing</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight text-foreground text-balance">
          {briefing.eventTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{formatDate(briefing.eventDate)}</p>
      </header>

      <section className="mt-6 rounded-3xl border border-gold/40 bg-card p-6 sm:p-8">
        <p className="text-balance leading-relaxed text-foreground">{briefing.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">
            {briefing.mode === "rag" ? "AI-grounded" : "demo mode"}
          </span>
          <span className="rounded-full bg-gold-deep/15 px-2.5 py-1 font-medium text-gold-deep">
            Provisional guidance — confirm with your family
          </span>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        {briefing.sections.map((section) => (
          <section
            key={section.id}
            aria-label={section.title}
            className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
          >
            <h2 className="font-display text-lg font-medium text-foreground">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
            {section.phrases && section.phrases.length > 0 && (
              <ul className="mt-4 grid gap-2">
                {section.phrases.map((p) => (
                  <li
                    key={p.twi}
                    className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-foreground">{p.twi}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.english}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {section.items && section.items.length > 0 && (
              <ul className="mt-4 list-disc space-y-1.5 ps-5 text-sm text-muted-foreground">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {section.verified === false && (
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gold-deep">
                Unverified account — practices vary; confirm with your people.
              </p>
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button
          className="rounded-full px-5"
          onClick={() => {
            if (savedToBank || !progress || bankItems.length === 0) return;
            addBankItems(
              bankItems.map((item) => ({
                category: item.category,
                text: item.text,
                detail: item.detail,
                source: "event" as const,
              })),
            );
            setSavedToBank(true);
          }}
          disabled={!progress || savedToBank || bankItems.length === 0}
        >
          <BookMarkedIcon data-icon="inline-start" />
          {savedToBank ? "Saved to Culture Bank" : "Save phrases to Culture Bank"}
        </Button>
        {!progress && (
          <Link
            href="/onboarding"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Set up your profile to save
          </Link>
        )}
        <Link
          href="/culture-bank"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Open Culture Bank
        </Link>
      </div>

      <SourcesList sources={briefing.sources} />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Want the fuller experience? A step-by-step prep journey is available for
        this event —{" "}
        <Link href={`/events/${eventId}`} className="underline underline-offset-4">
          start it here
        </Link>
        .
      </p>
    </main>
  );
}
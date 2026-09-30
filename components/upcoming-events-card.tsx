"use client";

import Link from "next/link";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ListChecksIcon,
  SparklesIcon,
} from "lucide-react";
import { useEvents } from "@/lib/events-context";
import { EVENT_TYPE_LABELS } from "@/lib/constants";

const DAY_MS = 86_400_000;

function countdown(ms: number): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const d = new Date(ms);
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((eventDay - today) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Journey-page card for events inside the lead window ("7 days before"). */
export function UpcomingEventsCard() {
  const { dueEvents, upcomingEvents, hydrated, settings, connection } = useEvents();
  if (!hydrated || !connection || !settings.enabled) return null;

  const briefingReady = upcomingEvents.find((u) => u.due && u.briefing && !u.journey);

  if (dueEvents.length === 0) {
    if (!briefingReady) return null;
    return (
      <section aria-label="Cultural events coming up" className="mt-4">
        <Link
          href={`/events/${briefingReady.event.id}`}
          className="flex items-center gap-4 rounded-3xl border border-forest/40 bg-forest/5 p-5 transition-colors hover:border-foreground/20"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest-deep">
            <CalendarDaysIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Your briefing is ready
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {briefingReady.event.title} · {countdown(briefingReady.event.start)}
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest-deep">
            Open
          </span>
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Cultural events coming up" className="mt-4">
      <Link
        href={`/events/${dueEvents[0].event.id}`}
        className="animate-rise flex flex-col gap-4 rounded-3xl border border-gold/50 bg-gold/5 p-6 shadow-sm sm:flex-row sm:items-center"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-deep/15 text-gold-deep">
          <CalendarDaysIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {dueEvents[0].event.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dueEvents[0].detection
              ? EVENT_TYPE_LABELS[dueEvents[0].detection.eventType!]
              : "Cultural event"}{" "}
            · {countdown(dueEvents[0].event.start)}
            {dueEvents.length > 1 ? ` · +${dueEvents.length - 1} more` : ""}
          </p>
          <p className="mt-1.5 text-xs text-gold-deep">
            Before this day arrives, let&apos;s get you ready — greetings, what
            to wear, how to carry yourself.
          </p>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-gold-deep px-4 py-2 text-xs font-semibold text-primary-foreground">
          <SparklesIcon className="size-3.5" aria-hidden="true" />
          Prepare me
        </span>
      </Link>
    </section>
  );
}

/**
 * Journey-page section for events with active or completed prep journeys.
 * Sits above the seven-day arc; each card shows progress and the next step.
 */
export function EventJourneysSection() {
  const { journeyEvents, hydrated } = useEvents();
  if (!hydrated || journeyEvents.length === 0) return null;

  return (
    <section aria-label="Event preparation journeys" className="mt-10">
      <h2 className="font-display text-lg font-medium text-foreground">
        Getting ready for…
      </h2>
      <ul className="mt-3 grid gap-2">
        {journeyEvents.map(({ event, journey }) => {
          if (!journey) return null;
          const total = journey.stepIds.length;
          const completed = journey.completedSteps.length;
          const allDone = completed >= total;
          const nextStepId = journey.stepIds.find((s) => !journey.completedSteps.includes(s));
          const pct = Math.round((completed / total) * 100);
          return (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex items-center gap-4 rounded-2xl border border-gold/40 bg-gold/5 px-4 py-3 transition-colors hover:border-foreground/20"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-deep/15 text-xs font-semibold text-gold-deep">
                  {pct}%
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {event.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {allDone
                      ? "All steps done — you're ready."
                      : nextStepId
                        ? `Next: ${journey.steps[nextStepId].title} · ${countdown(event.start)}`
                        : `${completed}/${total} steps`}
                  </p>
                </div>
                {allDone ? (
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest-deep">
                    <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                    Ready
                  </span>
                ) : (
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-gold-deep px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    <ListChecksIcon className="size-3.5" aria-hidden="true" />
                    {completed}/{total}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
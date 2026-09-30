"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  MapIcon,
  ShieldQuestionIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { useEvents } from "@/lib/events-context";
import { EventPrepList } from "@/components/event-prep-list";
import { useProfile } from "@/lib/profile-context";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import type { UpcomingEvent } from "@/lib/events-context";

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

function eventDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function EventsView() {
  const router = useRouter();
  const { isCustomized } = useProfile();
  const { connection, upcomingEvents, settings, hydrated } = useEvents();

  if (!hydrated) {
    return <main className="mx-auto w-full max-w-2xl px-6 py-20" aria-busy="true" />;
  }

  if (!connection) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-20">
        <Empty className="border-0">
          <EmptyMedia variant="icon">
            <CalendarDaysIcon className="size-4 text-gold" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No calendar connected yet</EmptyTitle>
            <EmptyDescription>
              Connect Google Calendar or upload an .ics file, and My People will
              watch for cultural events coming up — then teach you greetings,
              clothing and conduct before they arrive.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="rounded-full px-5" onClick={() => router.push("/settings")}>
              Connect a calendar
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </EmptyContent>
        </Empty>

        <section
          aria-label="Prepare for an event without a calendar"
          className="mt-8 rounded-3xl border border-gold/40 bg-card p-6 text-center"
        >
          <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-gold-deep/15 text-gold-deep">
            <MapIcon className="size-5" aria-hidden="true" />
          </span>
          <h2 className="font-display mt-3 text-lg font-medium text-foreground">
            No calendar? No problem.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Describe any Akan gathering you&apos;re heading to and My People
            will build a step-by-step preparation journey for it.
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-full px-5"
            onClick={() => router.push("/events/prep")}
          >
            Build a prep journey
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </section>

        <EventPrepList canDelete />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow">Coming up</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight text-foreground">
          Upcoming cultural events
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Detected from your {connection.provider === "google" ? "Google Calendar" : "imported calendar"} —
          briefings appear {settings.leadTimeDays} day{settings.leadTimeDays === 1 ? "" : "s"} before each event.{" "}
          <Link href="/settings" className="underline underline-offset-4">
            Change lead time
          </Link>
        </p>
      </header>

      {upcomingEvents.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-border/60 bg-card p-8 text-center">
          <ShieldQuestionIcon className="mx-auto size-8 text-gold-deep" aria-hidden="true" />
          <h2 className="font-display mt-4 text-xl font-medium text-foreground">
            Nothing cultural coming up yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            My People watches for funerals and weddings in your calendar. If
            something looks ambiguous, you can add or correct it yourself.
          </p>
          <Button
            variant="outline"
            className="mt-5 rounded-full px-5"
            onClick={() => router.push("/settings")}
          >
            <CalendarPlusIcon data-icon="inline-start" />
            Add an event manually
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {upcomingEvents.map((u) => (
            <EventCard key={u.event.id} entry={u} />
          ))}
        </ul>
      )}

      <EventPrepList />

      <section
        aria-label="Prepare for another event"
        className="mt-8 rounded-3xl border border-gold/40 bg-card p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-deep/15 text-gold-deep">
            <MapIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-medium text-foreground">
              Preparing for something else?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              An event that never made it onto your calendar — a naming
              ceremony, an outdooring, a festival. Describe it and My People
              will build a step-by-step preparation journey.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full px-5"
              onClick={() => router.push("/events/prep")}
            >
              Build a prep journey
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>

      {!isCustomized && (
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Tip: complete{" "}
          <Link href="/onboarding" className="underline underline-offset-4">
            onboarding
          </Link>{" "}
          so briefings can be personalised to your journey.
        </p>
      )}
    </main>
  );
}

function EventCard({ entry }: { entry: UpcomingEvent }) {
  const { event, detection, journey, due } = entry;
  const isLow = detection && !detection.userConfirmed && detection.confidence === "low";

  let progressLabel: string | null = null;
  if (journey) {
    const total = journey.stepIds.length;
    const completed = journey.completedSteps.length;
    progressLabel = completed >= total ? "All steps done" : `${completed}/${total} steps`;
  }

  const status = (() => {
    switch (entry.status) {
      case "needs-details":
        return <Badge variant="outline">Confirm type</Badge>;
      case "start-preparing":
        return due ? (
          <Badge className="bg-gold-deep/15 text-gold-deep">Prepare me</Badge>
        ) : (
          <Badge variant="outline">Outside lead window</Badge>
        );
      case "preparing":
        return <Badge className="bg-gold-deep/15 text-gold-deep">Preparing</Badge>;
      case "ready":
        return <Badge className="bg-forest/10 text-forest-deep">Ready</Badge>;
      case "briefing-ready":
        return <Badge className="bg-forest/10 text-forest-deep">Briefing ready</Badge>;
      case "reflect":
        return <Badge className="bg-gold-deep/15 text-gold-deep">Reflect</Badge>;
      case "done":
        return <Badge className="bg-forest/10 text-forest-deep">Done</Badge>;
    }
  })();

  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-foreground/20 sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest text-primary-foreground">
          <CalendarDaysIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {eventDate(event.start)} · {countdown(event.start)}
            {event.location ? ` · ${event.location}` : ""}
            {progressLabel ? ` · ${progressLabel}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {detection ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {EVENT_TYPE_LABELS[detection.eventType!]}
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              Unrecognised
            </span>
          )}
          {isLow && entry.status === "needs-details" && (
            <span className="rounded-full bg-gold-deep/15 px-2.5 py-1 text-xs font-medium text-gold-deep">
              Confirm type
            </span>
          )}
          {status}
        </div>
      </Link>
    </li>
  );
}
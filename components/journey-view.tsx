"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ClockIcon, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty";
import { SankofaMark } from "@/components/brand";
import {
  UpcomingEventsCard,
  EventJourneysSection,
} from "@/components/upcoming-events-card";
import { EventPrepList } from "@/components/event-prep-list";
import { useProfile } from "@/lib/profile-context";
import { JOURNEY_DAYS, journeyDay } from "@/lib/journey";

const CLAIM_LEADER: Record<number, string> = {
  1: "I can say something.",
  2: "I understand what I'm saying.",
  3: "I understand how people behave.",
  4: "I understand where something comes from.",
  5: "I discover something from my own family.",
  6: "I connect what I've learned to myself.",
  7: "I demonstrate what I've learned.",
};

export function JourneyView() {
  const router = useRouter();
  const { profile, progress, currentDay } = useProfile();

  if (!profile || !progress) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-20">
        <Empty className="border-0">
          <EmptyMedia variant="icon">
            <SankofaMark className="size-6 text-gold" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Your journey hasn&apos;t started yet</EmptyTitle>
            <EmptyDescription>
              Five quick questions shape the whole seven-day journey — where
              you are, how connected you feel, what your family knows, and how
              you like to learn.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="rounded-full px-5" onClick={() => router.push("/onboarding")}>
              Begin your journey
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const def = journeyDay(currentDay);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="eyebrow text-center">Today&apos;s journey</p>

      <UpcomingEventsCard />

      <EventJourneysSection />

      <section
        aria-label="Preparing for an event"
        className="animate-rise mt-4 rounded-3xl border border-border/70 bg-card p-5"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-deep/15 text-gold-deep">
            <MapIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Heading to a gathering?
            </p>
            <p className="text-xs text-muted-foreground">
              Build a prep journey for any Akan event — even one that&apos;s
              not on your calendar.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4"
            onClick={() => router.push("/events/prep")}
          >
            Prepare
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </section>

      <EventPrepList />

      {def ? (
        <section
          aria-label={`Day ${def.day} — ${def.theme}`}
          className="animate-rise mt-4 rounded-3xl border border-gold/40 bg-card p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-forest text-lg font-semibold text-primary-foreground">
              {def.day}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Day {def.day} · {def.theme}
              </p>
              <p className="text-xs text-muted-foreground">
                ~{def.estimatedMinutes} min · {CLAIM_LEADER[def.day]}
              </p>
            </div>
          </div>

          <h1 className="font-display mt-5 text-3xl font-medium tracking-tight text-foreground text-balance">
            {def.title}
          </h1>
          <p className="mt-3 text-balance leading-relaxed text-muted-foreground">
            {def.hook}
          </p>

          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <ClockIcon className="size-3.5 text-gold-deep" aria-hidden="true" />
            {def.flex}
          </p>

          <Button
            size="lg"
            className="mt-6 rounded-full px-6"
            onClick={() => router.push(`/journey/${def.day}`)}
          >
            Start Day {def.day}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </section>
      ) : (
        <section className="mt-4 rounded-3xl border border-border/60 bg-card p-6 text-center">
          <p className="font-display text-xl font-medium text-foreground">
            The journey is complete.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            You can replay any day below, or look at what you&apos;ve collected.
          </p>
        </section>
      )}

      <section aria-label="The seven-day arc" className="mt-10">
        <h2 className="font-display text-lg font-medium text-foreground">
          The seven-day arc
        </h2>
        <ol className="mt-3 grid gap-2">
          {JOURNEY_DAYS.map((day) => {
            const done = (progress.completedDays ?? []).includes(day.day);
            const current = day.day === currentDay;
            const reachable = day.day <= currentDay;
            return (
              <li key={day.day}>
                <Link
                  href={reachable ? `/journey/${day.day}` : "#"}
                  aria-disabled={!reachable}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-3 transition-colors ${
                    current
                      ? "border-gold/60 bg-gold/10"
                      : done
                        ? "border-border/70 bg-card/60 hover:border-foreground/20"
                        : reachable
                          ? "border-border/70 bg-card/40 hover:border-foreground/20"
                          : "border-border/50 bg-card/20 opacity-50"
                  }`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-primary-foreground">
                    {day.day}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {day.theme}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {CLAIM_LEADER[day.day]}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {day.title}
                    </p>
                  </div>
                  {done && (
                    <span className="ml-auto shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest-deep">
                      Done
                    </span>
                  )}
                  {current && (
                    <span className="ml-auto shrink-0 rounded-full bg-gold-deep/15 px-2.5 py-1 text-xs font-medium text-gold-deep">
                      Today
                    </span>
                  )}
                  {!done && !current && reachable && (
                    <span
                      aria-hidden="true"
                      className="ml-auto shrink-0 text-xs text-muted-foreground"
                    >
                      …
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Curious about something specific?{" "}
        <Link href="/ask" className="underline underline-offset-4 hover:text-foreground">
          Ask My People
        </Link>
      </p>
    </main>
  );
}
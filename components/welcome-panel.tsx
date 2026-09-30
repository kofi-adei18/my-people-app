"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SankofaMark } from "@/components/brand";
import { useProfile } from "@/lib/profile-context";
import { JOURNEY_DAYS } from "@/lib/journey";

const CLAIM_LEADER = [
  "I can say something.",
  "I understand what I'm saying.",
  "I understand how people behave.",
  "I understand where something comes from.",
  "I discover something from my own family.",
  "I connect what I've learned to myself.",
  "I demonstrate what I've learned.",
];

export function WelcomePanel() {
  const router = useRouter();
  const { isCustomized, currentDay } = useProfile();

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-10%] h-96 w-96 rounded-full bg-gold/20 blur-3xl"
      />
      <main className="relative mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
        <div className="animate-rise flex flex-col items-center text-center">
          <SankofaMark className="size-14 text-gold" />
          <p className="eyebrow mt-6">Go back and fetch it</p>
          <h1 className="font-display mt-3 text-5xl font-medium tracking-tight text-foreground text-balance sm:text-6xl">
            My People
          </h1>
          <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
            A seven-day journey into your Asante heritage — greetings, meaning,
            family, and the story behind it all. Personal, grounded, and yours.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="rounded-full px-6"
              onClick={() => router.push(isCustomized ? "/journey" : "/onboarding")}
            >
              {isCustomized ? `Continue — Day ${currentDay}` : "Begin your journey"}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            {isCustomized && (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-6"
                onClick={() => router.push("/onboarding")}
              >
                Reset my journey
              </Button>
            )}
          </div>
        </div>

        <section aria-label="The seven-day arc" className="animate-rise mt-16" style={{ animationDelay: "120ms" }}>
          <ol className="grid gap-2">
            {JOURNEY_DAYS.map((day, i) => {
              const done = isCustomized && day.day < currentDay;
              const current = isCustomized && day.day === currentDay;
              return (
                <li
                  key={day.day}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${
                    current
                      ? "border-gold/60 bg-gold/10 shadow-sm"
                      : done
                        ? "border-border/70 bg-card/60"
                        : "border-border/70 bg-card/40"
                  }`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-primary-foreground">
                    {day.day}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {day.theme}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {CLAIM_LEADER[i]}
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
                </li>
              );
            })}
          </ol>
        </section>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Grounded in a curated knowledge base · Asante · Asante Twi · Ghana
          <div className="mt-2">
            <Link
              href="/family"
              className="underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
            >
              Ask My Family
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
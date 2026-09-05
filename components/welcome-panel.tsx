"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SankofaMark } from "@/components/brand";
import { useProfile } from "@/lib/profile-context";
import { ArrowRightIcon } from "lucide-react";
import { LEVEL_LABELS } from "@/lib/constants";

export function WelcomePanel() {
  const { isCustomized } = useProfile();

  const heroInterests = ["Proverbs", "Family", "Traditions"];
  const startHref = isCustomized ? "/journey" : "/onboarding";

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--gold)_16%,transparent),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-24 -z-10 hidden text-gold/40 lg:block"
      >
        <SankofaMark className="size-72 rotate-12" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="eyebrow animate-rise inline-flex items-center gap-2">
          <span aria-hidden="true" className="text-gold-deep">
            <SankofaMark className="size-6" />
          </span>
          Sankofa 
        </p>

        <h1
          className="font-display animate-rise mt-6 text-balance text-5xl font-medium leading-[1.02] tracking-[-0.02em] text-foreground sm:text-6xl md:text-7xl"
          style={{ animationDelay: "80ms" }}
        >
          Discover Your People.
        </h1>

        <p
          className="animate-rise mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl"
          style={{ animationDelay: "160ms" }}
        >
          Learn the stories, traditions and wisdom that connect you to
          your heritage.
        </p>

        <div
          className="animate-rise mt-10 flex flex-col items-center gap-4"
          style={{ animationDelay: "240ms" }}
        >
          <Button asChild size="lg" className="h-11 rounded-full px-7 text-base">
            <Link href={startHref}>
              Start My Journey
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Currently exploring Akan heritage
          </p>
        </div>

        <div
          className="animate-rise mt-14 inline-flex flex-col items-center gap-2 rounded-2xl border border-border/80 bg-card/70 px-6 py-4 backdrop-blur-sm sm:flex-row sm:gap-4"
          style={{ animationDelay: "320ms" }}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <SankofaMark className="size-5" />
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              Your personal starting profile
            </p>
            <p className="text-xs text-muted-foreground">
              Akan · Twi · {LEVEL_LABELS.beginner} ·{" "}
              {heroInterests.join(" · ")}
            </p>
          </div>
          <Button variant="ghost" asChild size="sm" className="rounded-full">
            <Link href="/onboarding">Customize</Link>
          </Button>
        </div>
      </div>

      <footer className="border-t border-border/60 px-6 py-6">
        <p className="mx-auto max-w-6xl text-center text-xs text-muted-foreground">
          My People · a living library of your heritage
        </p>
      </footer>
    </main>
  );
}
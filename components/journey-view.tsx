"use client";

import Link from "next/link";
import { cn } from "cn";
import { CheckIcon, SparklesIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/lib/profile-context";
import { DEMO_PROFILE, LESSONS } from "@/lib/constants";
import { useCompletedLessons } from "@/lib/use-completed-lessons";

export function JourneyView() {
  const { profile } = useProfile();
  const { completed } = useCompletedLessons();

  const completedCount = completed.size;
  const total = LESSONS.length;
  const progress = total ? Math.round((completedCount / total) * 100) : 0;
  const firstOpen = LESSONS.find((l) => !completed.has(l.slug));

  const accent =
    profile.knowledgeLevel === "beginner" ? "Just starting" : "On your way";

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="mb-10">
        <p className="eyebrow">Your path forward</p>
        <h1 className="font-display mt-3 text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          Your Akan Journey
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A personalized introduction to the culture connected to your heritage.
          Follow the thread — each lesson builds on the last.
        </p>
      </header>

      <section
        aria-label="Journey progress"
        className="mb-10 rounded-2xl border border-border/80 bg-card p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {accent} · {completedCount} of {total} lessons complete
            </p>
            <p className="font-display mt-1 text-5xl font-medium text-foreground">
              {progress}
              <span className="text-xl text-muted-foreground">%</span>
            </p>
          </div>
          {firstOpen ? (
            <Button asChild className="rounded-full">
              <Link href={`/journey/${firstOpen.slug}`}>
                Continue · {firstOpen.title}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <Badge variant="secondary">
              <SparklesIcon data-icon="inline-start" />
              Journey complete
            </Badge>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Journey completion"
          className="mt-5 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <ol className="flex flex-col gap-3">
        {LESSONS.map((lesson, index) => {
          const isDone = completed.has(lesson.slug);
          const isNext = lesson.slug === firstOpen?.slug;
          return (
            <li key={lesson.slug}>
              {isDone || isNext ? (
                <Link
                  href={`/journey/${lesson.slug}`}
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30",
                  )}
                >
                  <LessonCardContent lesson={lesson} index={index} isDone={isDone} isNext={isNext} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 cursor-default opacity-70",
                  )}
                >
                  <LessonCardContent lesson={lesson} index={index} isDone={isDone} isNext={isNext} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Based on your profile · Akan · {profile.language} ·{" "}
        {DEMO_PROFILE.knowledgeLevel === profile.knowledgeLevel
          ? "Just starting"
          : "Personalized"}
      </p>
    </main>
  );
}

function LessonCardContent({
  lesson,
  index,
  isDone,
  isNext,
}: {
  lesson: (typeof LESSONS)[number];
  index: number;
  isDone: boolean;
  isNext: boolean;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : isNext
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border text-muted-foreground",
        )}
      >
        {isDone ? <CheckIcon className="size-4" /> : index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{lesson.title}</span>
          {isNext && (
            <Badge variant="outline" className="text-gold-deep">
              Up next
            </Badge>
          )}
          {isDone && (
            <Badge variant="secondary">
              <CheckIcon data-icon="inline-start" />
              Complete
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {lesson.description}
        </span>
      </span>

      {isNext && (
        <span
          aria-hidden="true"
          className="text-muted-foreground transition-transform group-hover:translate-x-1"
        >
          <ArrowRightIcon className="size-5" />
        </span>
      )}
    </>
  );
}
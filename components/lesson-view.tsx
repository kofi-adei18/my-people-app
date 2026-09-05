"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckIcon, LoaderIcon, ArrowLeftIcon, QuoteIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { SourcesList } from "@/components/sources-list";
import { useProfile } from "@/lib/profile-context";
import { LESSONS, ASK_FAMILY_PROMPT } from "@/lib/constants";
import { cn } from "cn";
import type { LessonContent, LessonQuiz } from "@/lib/types";

export function LessonView() {
  const params = useParams<{ lesson: string }>();
  const slug = params.lesson;
  const { profile } = useProfile();
  const [content, setContent] = useState<LessonContent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, profile }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (ignore) return;
        if (json.ok) setContent(json.content);
        else setError(true);
      })
      .catch(() => !ignore && setError(true));
    return () => {
      ignore = true;
    };
  }, [slug, profile]);

  const lesson = LESSONS.find((l) => l.slug === slug);
  if (!lesson) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-20 text-center">
        <p className="text-muted-foreground">We couldn't find that lesson.</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link href="/journey">Back to my journey</Link>
        </Button>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <Alert>
          <AlertTitle>{lesson.title}</AlertTitle>
          <AlertDescription>
            My People couldn't reach its knowledge base for this lesson. Please
            try again in a moment.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-24 text-center">
        <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">
          Gathering sources for {lesson.title}…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Button asChild variant="ghost" size="sm" className="mb-6 rounded-full">
        <Link href="/journey">
          <ArrowLeftIcon data-icon="inline-start" />
          My Journey
        </Link>
      </Button>

      <p className="eyebrow">Lesson · Akan heritage</p>
      <h1 className="font-display mt-3 text-balance text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
        {content.title}
      </h1>

      <p className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-card p-5 text-lg leading-relaxed text-foreground">
        {content.intro}
      </p>

      <section className="mt-10" aria-labelledby="key-ideas">
        <h2 id="key-ideas" className="font-display text-2xl font-medium text-foreground">
          What matters most
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {content.keyIdeas.map((idea, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/70 p-4 text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
              >
                {i + 1}
              </span>
              {idea}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-label="An example from your heritage">
        <figure className="rounded-2xl border-l-4 border-gold-deep bg-card/70 p-5">
          <QuoteIcon className="size-5 text-gold-deep" aria-hidden="true" />
          <blockquote className="mt-3 font-display text-xl leading-relaxed text-foreground">
            {content.example}
          </blockquote>
          <figcaption className="mt-3 text-sm text-muted-foreground">
            An example grounded in the curated sources
          </figcaption>
        </figure>
      </section>

      <section className="mt-10 rounded-2xl bg-primary/5 p-6" aria-labelledby="meaning">
        <h2
          id="meaning"
          className="eyebrow"
        >
          What this means for you
        </h2>
        <p className="mt-2 leading-relaxed text-foreground">{content.meaningForYou}</p>
      </section>

      <QuizView quiz={content.quiz} />

      <SourcesList sources={content.sources} />

      <AskFamily />
    </main>
  );
}

function QuizView({ quiz }: { quiz: LessonQuiz }) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;
  const correct = quiz.choices[quiz.correctIndex];

  return (
    <section
      className="mt-12 rounded-3xl border border-border bg-card p-6"
      aria-labelledby="quiz-heading"
    >
      <p className="eyebrow" id="quiz-heading">
        Quick check
      </p>
      <h2 className="font-display mt-2 text-2xl font-medium text-foreground">
        {quiz.question}
      </h2>

      <div role="radiogroup" aria-label={quiz.question} className="mt-5 flex flex-col gap-2.5">
        {quiz.choices.map((choice, i) => {
          const isCorrect = i === quiz.correctIndex;
          const isChosen = i === selected;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={revealed}
              onClick={() => setSelected(i)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                !revealed && "border-border bg-background hover:bg-muted",
                revealed && isCorrect && "border-primary/60 bg-primary/10 text-foreground",
                revealed && isChosen && !isCorrect && "border-destructive bg-destructive/10 text-destructive-foreground",
                revealed && !isChosen && !isCorrect && "border-border bg-background opacity-60",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  revealed && isCorrect ? "border-primary bg-primary text-primary-foreground" :
                  revealed && isChosen && !isCorrect ? "border-destructive text-destructive" :
                  "border-border",
                )}
              >
                {revealed && isCorrect && <CheckIcon className="size-3" />}
              </span>
              {choice}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className={cn(
            "mt-4 rounded-xl p-4 text-sm",
            selected === quiz.correctIndex
              ? "bg-primary/5 text-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <p className="font-medium">
            {selected === quiz.correctIndex
              ? "That's right."
              : `The answer is: ${correct}.`}
          </p>
          <p className="mt-1">{quiz.explanation}</p>
        </div>
      )}
    </section>
  );
}

function AskFamily() {
  return (
    <section className="mt-14 rounded-3xl border border-dashed border-gold-deep/50 bg-gradient-to-b from-gold/8 to-transparent p-6">
      <p className="eyebrow">Go further</p>
      <h2 className="font-display mt-2 text-2xl font-medium text-foreground">
        Ask Someone in Your Family
      </h2>
      <p className="mt-2 max-w-xl rounded-xl border border-border/70 bg-card/80 p-4 text-muted-foreground">
        “{ASK_FAMILY_PROMPT}”
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Learn → Ask your family → Discover the story → Preserve your heritage.
        This is where My People grows with your own family's memory.
      </p>
      <Button asChild variant="outline" className="mt-4 rounded-full">
        <Link href="/ask">
          I'll Bring Back Their Story
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
    </section>
  );
}
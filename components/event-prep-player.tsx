"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  XIcon,
  UsersIcon,
  LightbulbIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { SourcesList } from "@/components/sources-list";
import { useEvents } from "@/lib/events-context";
import { PREP_STEP_LABELS, PREP_STEP_ORDER } from "@/lib/constants";
import type { EventPrepJourney } from "@/lib/types";

/**
 * The step machine for a saved prep journey. Stages:
 * overview → 6 content steps → quiz → day-of checklist → wrap-up.
 * Checklist ticks and quiz answers persist per journey.
 */

type Stage =
  | { kind: "overview" }
  | { kind: "step"; stepIndex: number }
  | { kind: "quiz"; questionIndex: number }
  | { kind: "checklist" }
  | { kind: "done" };

const TOTAL_STAGES = 1 + PREP_STEP_ORDER.length + 1 + 1;

function stageNumber(stage: Stage): number {
  switch (stage.kind) {
    case "overview":
      return 1;
    case "step":
      return 2 + stage.stepIndex;
    case "quiz":
      return 2 + PREP_STEP_ORDER.length;
    case "checklist":
      return 3 + PREP_STEP_ORDER.length;
    default:
      return TOTAL_STAGES;
  }
}

function formatDate(ms: number): string | null {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function EventPrepPlayer({ journeyId }: { journeyId: string }) {
  const { prepJourneys, prepProgress, updatePrepProgress } = useEvents();

  const journey = useMemo(
    () => prepJourneys.find((j) => j.id === journeyId) ?? null,
    [prepJourneys, journeyId],
  );
  const progress = prepProgress[journeyId] ?? null;

  const [stage, setStage] = useState<Stage>({ kind: "overview" });

  if (!journey) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-20">
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyTitle>That prep journey isn&apos;t here</EmptyTitle>
            <EmptyDescription>
              It may have been removed, or it was created on another device.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/events/prep"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              See your prep journeys
            </Link>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const goNext = () => {
    setStage((s) => {
      if (s.kind === "overview") return { kind: "step", stepIndex: 0 };
      if (s.kind === "step") {
        if (s.stepIndex < journey.steps.length - 1) {
          return { kind: "step", stepIndex: s.stepIndex + 1 };
        }
        return { kind: "quiz", questionIndex: 0 };
      }
      if (s.kind === "quiz") {
        if (s.questionIndex < journey.quiz.length - 1) {
          return { kind: "quiz", questionIndex: s.questionIndex + 1 };
        }
        return { kind: "checklist" };
      }
      if (s.kind === "checklist") {
        updatePrepProgress(journeyId, { completed: true });
        return { kind: "done" };
      }
      return s;
    });
  };

  const backLink = "/events/prep";
  const current = stageNumber(stage);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={backLink}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Prep journeys
      </Link>

      {/* Progress rail */}
      <div className="mx-auto mt-6 flex w-full items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Step {Math.min(current, TOTAL_STAGES)} of {TOTAL_STAGES}
        </span>
        <span>{journey.eventTypeGuess ? journey.eventTypeGuess : "Prep journey"}</span>
      </div>
      <div className="mx-auto mt-2 flex h-1.5 w-full gap-1">
        {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 rounded-full ${
              i < current - 1 ? "bg-gold-deep" : i === current - 1 ? "bg-forest" : "bg-border"
            }`}
          />
        ))}
      </div>

      {journey.grounding === "low" && (
        <Alert className="mt-6 border-gold/50">
          <AlertDescription>
            The knowledge base doesn&apos;t cover this event well, so treat this
            as general Akan-gathering preparation — your family&apos;s word
            comes first.
          </AlertDescription>
        </Alert>
      )}

      {stage.kind === "overview" && (
        <OverviewStage journey={journey} onNext={goNext} />
      )}

      {stage.kind === "step" && (
        <StepStage
          journey={journey}
          stepIndex={stage.stepIndex}
          onNext={goNext}
        />
      )}

      {stage.kind === "quiz" && (
        <QuizStage
          key={stage.questionIndex}
          journey={journey}
          questionIndex={stage.questionIndex}
          progress={progress}
          onAnswer={(selected, correct) => {
            updatePrepProgress(journeyId, {
              quizAnswers: [
                ...(progress?.quizAnswers ?? []),
                { selected, correct },
              ],
            });
          }}
          onNext={goNext}
        />
      )}

      {stage.kind === "checklist" && (
        <ChecklistStage
          journey={journey}
          progress={progress}
          onToggle={(index, checked) => {
            const set = new Set(progress?.checkedItems ?? []);
            if (checked) set.add(index);
            else set.delete(index);
            updatePrepProgress(journeyId, { checkedItems: [...set] });
          }}
          onNext={goNext}
        />
      )}

      {stage.kind === "done" && (
        <section className="animate-rise mt-8 rounded-3xl border border-gold/40 bg-card p-8 text-center">
          <p className="font-display text-3xl font-medium text-gold-deep">
            You&apos;re prepared.
          </p>
          <p className="mx-auto mt-3 max-w-md text-balance leading-relaxed text-muted-foreground">
            Walk the journey again any time before the day — and let your
            family&apos;s answers override anything here. Nu merɛase!
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button className="rounded-full px-5" onClick={() => setStage({ kind: "overview" })}>
              Walk it again
            </Button>
            <Button variant="outline" className="rounded-full px-5" asChild>
              <Link href="/events">Back to events</Link>
            </Button>
          </div>
        </section>
      )}

      {stage.kind === "done" || stage.kind === "overview" ? (
        <SourcesList sources={journey.sources} />
      ) : null}
    </main>
  );
}

function OverviewStage({
  journey,
  onNext,
}: {
  journey: EventPrepJourney;
  onNext: () => void;
}) {
  const date = formatDate(journey.eventDate);
  return (
    <section className="animate-rise mt-6 rounded-3xl border border-gold/40 bg-card p-6 sm:p-8">
      <p className="eyebrow">Prep journey</p>
      <h1 className="font-display mt-1 text-3xl font-medium tracking-tight text-foreground text-balance">
        {journey.eventTitle}
      </h1>
      {date && <p className="mt-2 text-sm text-muted-foreground">{date}</p>}
      <p className="mt-4 text-balance leading-relaxed text-foreground">
        {journey.summary}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1">
          {journey.mode === "rag" ? "AI-grounded" : "demo mode"}
        </span>
        <span className="rounded-full bg-gold-deep/15 px-2.5 py-1 font-medium text-gold-deep">
          Provisional guidance — confirm with your family
        </span>
      </div>

      <ol className="mt-6 grid gap-2 text-sm text-muted-foreground">
        {[
          ...journey.steps.map((s) => PREP_STEP_LABELS[s.id]),
          "Quick quiz",
          "Day-of checklist",
        ].map((label, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-deep/10 text-[10px] font-semibold text-gold-deep">
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <Button size="lg" className="mt-6 rounded-full px-6" onClick={onNext}>
        Start
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </section>
  );
}

function StepStage({
  journey,
  stepIndex,
  onNext,
}: {
  journey: EventPrepJourney;
  stepIndex: number;
  onNext: () => void;
}) {
  const step = journey.steps[stepIndex];
  const isLast = stepIndex === journey.steps.length - 1;
  return (
    <section className="animate-rise mt-6" aria-label={step.title}>
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <p className="eyebrow">
          Step {stepIndex + 1} · {PREP_STEP_LABELS[step.id]}
        </p>
        <h2 className="font-display mt-2 text-2xl font-medium text-foreground">
          {step.title}
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{step.body}</p>

        {step.items && step.items.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {step.items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
              >
                <UsersIcon className="mt-0.5 size-4 shrink-0 text-gold-deep" aria-hidden="true" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        )}

        {step.phrases && step.phrases.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {step.phrases.map((p) => (
              <li key={p.twi} className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{p.twi}</p>
                <p className="text-xs text-muted-foreground">
                  {p.english}
                  {p.notes ? ` · ${p.notes}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gold-deep">
          <LightbulbIcon className="size-3.5" aria-hidden="true" />
          Unverified — practices vary; confirm with your people.
        </p>

        <div className="mt-5">
          <Button className="rounded-full px-5" onClick={onNext}>
            {isLast ? "Quick quiz" : "Next"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function QuizStage({
  journey,
  questionIndex,
  progress,
  onAnswer,
  onNext,
}: {
  journey: EventPrepJourney;
  questionIndex: number;
  progress: ReturnType<typeof useEvents>["prepProgress"][string] | null;
  onAnswer: (selected: number, correct: boolean) => void;
  onNext: () => void;
}) {
  const question = journey.quiz[questionIndex];
  // A previously-answered question (walked before) pre-fills its answer.
  const existing = progress?.quizAnswers?.[questionIndex];
  const [selected, setSelected] = useState<number | null>(existing?.selected ?? null);
  const [revealed, setRevealed] = useState(existing !== undefined);

  const isLast = questionIndex === journey.quiz.length - 1;

  const choose = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    onAnswer(i, i === question.correctIndex);
  };

  return (
    <section className="animate-rise mt-6">
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <p className="eyebrow">
          Quick quiz · {questionIndex + 1} of {journey.quiz.length}
        </p>
        <h2 className="font-display mt-2 text-xl font-medium leading-snug text-foreground text-balance">
          {question.question}
        </h2>
        <div className="mt-5 grid gap-2">
          {question.options.map((option, i) => {
            const isSel = selected === i;
            const isCorrect = revealed && i === question.correctIndex;
            const isWrong = revealed && isSel && i !== question.correctIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                disabled={revealed}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isCorrect
                    ? "border-forest/50 bg-forest/10 text-foreground"
                    : isWrong
                      ? "border-destructive/40 bg-destructive/5 text-foreground"
                      : isSel
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/70 bg-background/60 hover:border-foreground/25"
                }`}
              >
                {isCorrect ? (
                  <CheckIcon className="size-4 shrink-0 text-forest-deep" />
                ) : isWrong ? (
                  <XIcon className="size-4 shrink-0 text-destructive" />
                ) : (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                )}
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className="mt-4">
            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {question.explanation}
            </p>
            <Button className="mt-4 rounded-full px-5" onClick={onNext}>
              {isLast ? "Day-of checklist" : "Next question"}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ChecklistStage({
  journey,
  progress,
  onToggle,
  onNext,
}: {
  journey: EventPrepJourney;
  progress: ReturnType<typeof useEvents>["prepProgress"][string] | null;
  onToggle: (index: number, checked: boolean) => void;
  onNext: () => void;
}) {
  const checked = new Set(progress?.checkedItems ?? []);
  const allChecked = journey.checklist.every((_, i) => checked.has(i));
  return (
    <section className="animate-rise mt-6">
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <p className="eyebrow">
          Day-of checklist · {checked.size}/{journey.checklist.length}
        </p>
        <h2 className="font-display mt-2 text-2xl font-medium text-foreground">
          Before you walk in
        </h2>
        <ul className="mt-4 grid gap-2">
          {journey.checklist.map((item, i) => (
            <li key={i}>
              <label
                htmlFor={`prep-check-${i}`}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm transition-colors hover:border-foreground/25"
              >
                <Checkbox
                  id={`prep-check-${i}`}
                  className="mt-0.5"
                  checked={checked.has(i)}
                  onCheckedChange={(v) => onToggle(i, v === true)}
                />
                <span
                  className={
                    checked.has(i)
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }
                >
                  {item}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center gap-3">
          <Button className="rounded-full px-5" onClick={onNext}>
            {allChecked ? "Finish" : "Finish (you can tick these later)"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}

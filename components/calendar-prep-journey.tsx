"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookMarkedIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleIcon,
  Clock3Icon,
  HelpCircleIcon,
  ListChecksIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SourcesList } from "@/components/sources-list";
import { useEvents } from "@/lib/events-context";
import { useProfile } from "@/lib/profile-context";
import { briefingToBankItems } from "@/lib/events/playbooks";
import { suggestedStepIndex } from "@/lib/events/prep-arc";
import type {
  CalendarPrepJourney,
  PrepStepContent,
  PrepStepId,
} from "@/lib/types";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * The calendar prep-journey hub: ready-score, advisory pacing, a fully open
 * step rail (self-paced by design — every step is reachable), and the step
 * player. The full briefing is rendered on the rehearse step as the day-of
 * rundown.
 */
export function CalendarPrepJourneyView({
  journey,
  onReflect,
}: {
  journey: CalendarPrepJourney;
  onReflect?: () => void;
}) {
  const { completeCalendarStep } = useEvents();
  const firstIncomplete =
    journey.stepIds.find((s) => !journey.completedSteps.includes(s)) ?? journey.stepIds[0];
  const [selectedStep, setSelectedStep] = useState<PrepStepId>(firstIncomplete);

  const allDone = journey.stepIds.every((s) => journey.completedSteps.includes(s));

  const step = journey.steps[selectedStep] ?? journey.steps[journey.stepIds[0]];

  const nextStepId = useMemo(() => {
    const idx = journey.stepIds.indexOf(selectedStep);
    return journey.stepIds[idx + 1] ?? null;
  }, [journey.stepIds, selectedStep]);

  const done = journey.completedSteps.includes(selectedStep);
  const progressPct = Math.round(
    (journey.completedSteps.length / journey.stepIds.length) * 100,
  );
  const suggested = suggestedStepIndex(journey.eventDate, journey.stepIds, journey.completedSteps);

  if (allDone) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <JourneyHeader journey={journey} />
        <section className="animate-rise mt-6 rounded-3xl border border-forest/40 bg-forest/5 p-6 text-center sm:p-8">
          <CheckCircle2Icon className="mx-auto size-10 text-forest" aria-hidden="true" />
          <h2 className="font-display mt-4 text-2xl font-medium text-foreground">
            You&apos;re ready for this.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Every step of the {journey.eventTitle} prep journey is done. Revisit
            the day-of checklist anytime — it lives on the Rehearse step.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" className="rounded-full px-5" onClick={() => setSelectedStep("rehearse")}>
              <ListChecksIcon data-icon="inline-start" />
              Open day-of checklist
            </Button>
            <Link
              href="/events"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Back to events
            </Link>
          </div>
        </section>
        {onReflect && (
          <div className="mt-6 text-center">
            <Button variant="ghost" className="rounded-full px-5" onClick={onReflect}>
              <SparklesIcon data-icon="inline-start" />
              How did it go? Reflect
            </Button>
          </div>
        )}
        <StepRail
          journey={journey}
          selectedStep={selectedStep}
          onSelect={setSelectedStep}
          suggested={suggested}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <JourneyHeader journey={journey} />

      <section className="mt-6 rounded-3xl border border-gold/40 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {journey.completedSteps.length} of {journey.stepIds.length} steps done
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3Icon className="size-3.5 text-gold-deep" aria-hidden="true" />
              {journey.pacing.hint}
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Journey progress"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold/10 text-sm font-semibold text-gold-deep"
          >
            {progressPct}%
          </div>
        </div>
      </section>

      <PrepStepPlayer
        key={selectedStep}
        journey={journey}
        step={step}
        done={done}
        isSuggested={selectedStep === journey.stepIds[suggested]}
        nextStepId={nextStepId}
        onComplete={() => {
          completeCalendarStep(journey.eventId, selectedStep);
          if (nextStepId) setSelectedStep(nextStepId);
        }}
        onSelect={setSelectedStep}
      />

      <StepRail
        journey={journey}
        selectedStep={selectedStep}
        onSelect={setSelectedStep}
        suggested={suggested}
      />
    </main>
  );
}

function JourneyHeader({ journey }: { journey: CalendarPrepJourney }) {
  return (
    <>
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <CalendarDaysIcon className="size-4" aria-hidden="true" />
        Upcoming events
      </Link>
      <header className="mt-4">
        <p className="eyebrow">
          {journey.eventType === "funeral" ? "Funeral" : "Wedding"} prep journey
        </p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight text-foreground text-balance">
          {journey.eventTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{formatDate(journey.eventDate)}</p>
      </header>
    </>
  );
}

function StepRail({
  journey,
  selectedStep,
  onSelect,
  suggested,
}: {
  journey: CalendarPrepJourney;
  selectedStep: PrepStepId;
  onSelect: (id: PrepStepId) => void;
  suggested: number;
}) {
  return (
    <nav aria-label="Journey steps" className="mt-6 grid gap-2">
      {journey.stepIds.map((id, i) => {
        const isDone = journey.completedSteps.includes(id);
        const isSuggested = i === suggested && !isDone;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={selectedStep === id ? "step" : undefined}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
              selectedStep === id
                ? "border-gold-deep/50 bg-gold/5"
                : isDone
                  ? "border-forest/30 bg-forest/5 hover:border-foreground/20"
                  : "border-border/70 bg-card hover:border-foreground/20"
            }`}
          >
            {isDone ? (
              <CheckCircle2Icon className="size-5 shrink-0 text-forest" aria-hidden="true" />
            ) : (
              <CircleIcon
                className={`size-5 shrink-0 ${isSuggested ? "text-gold-deep" : "text-muted-foreground/50"}`}
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {journey.steps[id].title}
              </span>
              <span className="block text-xs text-muted-foreground">
                Step {i + 1} · {journey.steps[id].theme}
                {isSuggested ? " · suggested now" : ""}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Step player ───────────────────────────────────────────────────────────────

function PrepStepPlayer({
  journey,
  step,
  done,
  isSuggested,
  nextStepId,
  onComplete,
  onSelect,
}: {
  journey: CalendarPrepJourney;
  step: PrepStepContent;
  done: boolean;
  isSuggested: boolean;
  nextStepId: PrepStepId | null;
  onComplete: () => void;
  onSelect: (id: PrepStepId) => void;
}) {
  return (
    <section aria-label={step.title} className="mt-4 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        {isSuggested && (
          <span className="rounded-full bg-gold-deep/15 px-2.5 py-1 text-xs font-medium text-gold-deep">
            Suggested now
          </span>
        )}
        {done && (
          <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest-deep">
            Done
          </span>
        )}
        {step.verified === false && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-gold-deep">
            Provisional — confirm with your family
          </span>
        )}
      </div>

      <h2 className="font-display mt-3 text-2xl font-medium tracking-tight text-foreground">
        {step.title}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{step.hook}</p>

      <p className="mt-5 text-sm leading-relaxed text-foreground sm:text-[0.95rem]">
        {step.concept.explanation}
      </p>

      {step.concept.items && step.concept.items.length > 0 && (
        <ul className="mt-4 list-disc space-y-1.5 ps-5 text-sm text-muted-foreground">
          {step.concept.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {step.phrases && step.phrases.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow">Phrases you can use</p>
          <ul className="mt-2 grid gap-2">
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
        </div>
      )}

      {step.familyMission && (
        <FamilyMissionCard
          eventTitle={journey.eventTitle}
          mission={step.familyMission}
        />
      )}

      {step.scenario && step.scenario.length > 0 && (
        <StepQuiz journey={journey} stepId={step.id} questions={step.scenario} />
      )}

      {step.id === "rehearse" && (
        <RehearseExtras journey={journey} />
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {!done && (
          <Button className="rounded-full px-6" onClick={onComplete}>
            {nextStepId ? "Mark done & continue" : "Mark step done"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
        {done && nextStepId && (
          <Button className="rounded-full px-6" onClick={() => onSelect(nextStepId)}>
            Next: {journey.steps[nextStepId].theme}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
      </div>
    </section>
  );
}

// ─── Family mission (Day-5 mechanics, profile-guarded) ────────────────────────

function FamilyMissionCard({
  eventTitle,
  mission,
}: {
  eventTitle: string;
  mission: { question: string; why: string };
}) {
  const { profile, saveFamilyDiscovery } = useProfile();
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  const canSave = Boolean(profile);

  return (
    <div className="mt-6 rounded-2xl border border-forest/30 bg-forest/5 p-5">
      <p className="eyebrow inline-flex items-center gap-2">
        <UsersIcon className="size-4" aria-hidden="true" />
        Family mission
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{mission.question}</p>
      <p className="mt-1 text-xs text-muted-foreground">{mission.why}</p>
      <Textarea
        rows={3}
        className="mt-3"
        placeholder="Write down what they said, in their words…"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          className="rounded-full px-4"
          disabled={!canSave || !answer.trim() || saved}
          onClick={() => {
            if (saved || !answer.trim()) return;
            saveFamilyDiscovery({
              day: 0,
              question: mission.question,
              answer: answer.trim(),
              relatedConcept: "family",
              insights: [`From prep for ${eventTitle}`],
            });
            setSaved(true);
          }}
        >
          <BookMarkedIcon data-icon="inline-start" />
          {saved ? "Saved to Culture Bank" : "Save their answer"}
        </Button>
        {!canSave && (
          <Link href="/onboarding" className="text-xs text-muted-foreground underline underline-offset-4">
            Set up your profile to save
          </Link>
        )}
      </div>
      {saved && (
        <p className="mt-2 text-xs text-forest-deep">
          Their words are in your Culture Bank — they may reshape how you carry yourself on the day.
        </p>
      )}
    </div>
  );
}

// ─── Step quiz (feeds the shared confidence scores) ───────────────────────────

function StepQuiz({
  journey,
  stepId,
  questions,
}: {
  journey: CalendarPrepJourney;
  stepId: PrepStepId;
  questions: { question: string; choices: string[]; correctIndex: number; explanation: string; concept: string }[];
}) {
  const { updateConfidence } = useProfile();
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const conceptKey = `${journey.eventType}-${stepId}`;

  return (
    <div className="mt-6">
      <p className="eyebrow inline-flex items-center gap-2">
        <HelpCircleIcon className="size-4" aria-hidden="true" />
        Quick check
      </p>
      <div className="mt-2 grid gap-4">
        {questions.map((q, qi) => {
          const selected = answers[qi];
          const answered = selected !== undefined;
          const correct = selected === q.correctIndex;
          return (
            <fieldset key={qi} className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <legend className="px-1 text-sm font-medium text-foreground">{q.question}</legend>
              <div className="mt-1 grid gap-1.5">
                {q.choices.map((choice, ci) => {
                  const isPicked = selected === ci;
                  const isCorrect = ci === q.correctIndex;
                  return (
                    <button
                      key={ci}
                      type="button"
                      disabled={answered}
                      onClick={() => {
                        setAnswers((prev) => ({ ...prev, [qi]: ci }));
                        updateConfidence(conceptKey, ci === q.correctIndex);
                      }}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        answered && isCorrect
                          ? "border-forest/50 bg-forest/10 text-foreground"
                          : answered && isPicked && !isCorrect
                            ? "border-destructive/50 bg-destructive/10 text-foreground"
                            : "border-border/70 hover:border-foreground/20"
                      }`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {correct ? "Right — " : "Not quite — "}
                  {q.explanation}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

// ─── Rehearse extras: checklist + the full briefing ───────────────────────────

function RehearseExtras({ journey }: { journey: CalendarPrepJourney }) {
  const { addBankItems, progress } = useProfile();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [savedToBank, setSavedToBank] = useState(false);
  const bankItems = useMemo(() => briefingToBankItems(journey.briefing), [journey.briefing]);
  const checklist = journey.steps.rehearse?.checklist ?? [];

  return (
    <div className="mt-6">
      <p className="eyebrow inline-flex items-center gap-2">
        <ListChecksIcon className="size-4" aria-hidden="true" />
        Day-of checklist
      </p>
      <ul className="mt-2 grid gap-2">
        {checklist.map((item, i) => {
              const isChecked = checked.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    aria-pressed={isChecked}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      isChecked
                        ? "border-forest/40 bg-forest/5 text-foreground"
                        : "border-border/70 bg-background/60 hover:border-foreground/20"
                    }`}
                  >
                    {isChecked ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-forest" aria-hidden="true" />
                    ) : (
                      <CircleIcon className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                    )}
                    <span className={isChecked ? "line-through opacity-70" : undefined}>{item}</span>
                  </button>
                </li>
              );
            })}
      </ul>

      <div className="mt-8 rounded-3xl border border-gold/40 bg-card p-6">
        <p className="eyebrow">Day-of rundown</p>
        <p className="mt-2 text-balance leading-relaxed text-foreground">
          {journey.briefing.summary}
        </p>
        <div className="mt-4 space-y-4">
          {journey.briefing.sections.map((section) => (
            <section key={section.id} aria-label={section.title}>
              <h3 className="font-display text-base font-medium text-foreground">
                {section.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
              {section.phrases && section.phrases.length > 0 && (
                <ul className="mt-2 grid gap-1.5">
                  {section.phrases.map((p) => (
                    <li key={p.twi} className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2">
                      <span className="text-sm font-semibold text-foreground">{p.twi}</span>
                      <span className="text-xs text-muted-foreground"> — {p.english}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.items && section.items.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            className="rounded-full px-4"
            disabled={savedToBank || bankItems.length === 0 || !progress}
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
          >
            <BookMarkedIcon data-icon="inline-start" />
            {savedToBank ? "Saved to Culture Bank" : "Save phrases & insights"}
          </Button>
          {!progress && (
            <Link href="/onboarding" className="text-xs text-muted-foreground underline underline-offset-4">
              Set up your profile to save
            </Link>
          )}
        </div>
        <SourcesList sources={journey.briefing.sources} />
      </div>
    </div>
  );
}
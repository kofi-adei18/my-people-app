"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SourcesList } from "@/components/sources-list";
import type { Day7Challenge, QuizAttempt } from "@/lib/types";
import { useProfile } from "@/lib/profile-context";
import { uid, stamp } from "@/lib/id";

export function ChallengeView() {
  const router = useRouter();
  const { profile, progress, answerQuiz, updateConfidence, completeDay } = useProfile();

  const [content, setContent] = useState<Day7Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!profile || !progress) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/challenge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile, progress }),
        });
        const json = (await res.json()) as { ok: boolean; content?: Day7Challenge; error?: string };
        if (!json.ok) throw new Error(json.error ?? "Request failed");
        if (!cancelled) setContent(json.content ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the challenge.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, progress]);

  const finish = () => {
    completeDay(7);
    router.push("/journey");
  };

  if (!profile || !progress) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-medium text-foreground">Day 7</h1>
        <p className="mt-3 text-muted-foreground">Your profile comes first.</p>
        <Button className="mt-6 rounded-full" onClick={() => router.push("/onboarding")}>
          Begin your journey
        </Button>
      </main>
    );
  }

  if (!content && !error) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32">
        <Spinner className="size-6 text-gold-deep" />
        <p className="mt-4 text-sm text-muted-foreground">Setting the scene…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
        <p className="font-display text-xl font-medium text-foreground">Hmm, that didn&apos;t load.</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6 rounded-full" onClick={() => location.reload()}>
          Try again
        </Button>
      </main>
    );
  }

  if (!content) return null;

  const step = content.steps[active];

  const choose = (i: number) => {
    if (revealed) return;
    setSelected(i);
    const correct = i === step.correctIndex;
    setRevealed(true);
    if (correct) setScore((s) => s + 1);
    answerQuiz({
      id: uid("c"),
      day: 7,
      prompt: step.prompt,
      promptType: step.concept,
      choices: step.choices,
      selected: step.choices[i],
      correct,
      createdAt: stamp(),
    } as QuizAttempt);
    updateConfidence(step.concept, correct);
  };

  const next = () => {
    setSelected(null);
    setRevealed(false);
    setActive((a) => a + 1);
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="animate-rise text-center">
        <p className="eyebrow">Day 7 · Performance</p>
        <h1 className="font-display mt-2 text-4xl font-medium tracking-tight text-foreground text-balance sm:text-5xl">
          {content.title}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-balance leading-relaxed text-muted-foreground">
          {content.scene}
        </p>
      </header>

      {/* Score rail */}
      <div className="mx-auto mt-6 flex w-full max-w-sm items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Step {active + 1} of {content.steps.length}
        </span>
        <span>
          {score}/{Math.max(1, active)} right
        </span>
      </div>
      <div className="mx-auto mt-2 flex h-1.5 w-full max-w-sm gap-1">
        {content.steps.map((_, i) => (
          <span
            key={i}
            className={`flex-1 rounded-full ${i < active ? "bg-gold-deep" : i === active ? "bg-forest" : "bg-border"}`}
          />
        ))}
      </div>

      {active >= content.steps.length ? (
        <section className="animate-rise mt-12 rounded-3xl border border-gold/40 bg-card p-8 text-center">
          <p className="font-display text-4xl font-medium text-gold-deep">
            {score}/{content.steps.length}
          </p>
          <h2 className="font-display mt-2 text-2xl font-medium text-foreground">
            You walked into the gathering.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-balance leading-relaxed text-muted-foreground">
            {content.chapter}
          </p>
          <Button size="lg" className="mt-6 rounded-full px-6" onClick={finish}>
            Finish my journey
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </section>
      ) : (
        <section className="animate-rise mt-8">
          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium leading-snug text-foreground text-balance">
              {step.prompt}
            </h2>
            <div className="mt-5 grid gap-2">
              {step.choices.map((choice, i) => {
                const isSel = selected === i;
                const isCorrect = revealed && i === step.correctIndex;
                const isWrong = revealed && isSel && i !== step.correctIndex;
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
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>
            {revealed && (
              <div className="mt-4">
                <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {step.explanation}
                </p>
                <Button className="mt-4 rounded-full px-5" onClick={next}>
                  {active === content.steps.length - 1 ? "See how I did" : "Next moment"}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {content.sources?.length ? <SourcesList sources={content.sources} /> : null}
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  MessageSquareTextIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { SourcesList } from "@/components/sources-list";
import type {
  DayLesson,
  FamilyAnalysis,
  QuizAttempt,
  ScenarioQuestion,
} from "@/lib/types";
import { useProfile } from "@/lib/profile-context";
import { uid, stamp } from "@/lib/id";

type Status = "loading" | "error" | "ready";

export function LessonView({
  day,
  isFamilyDay,
  storyDay,
}: {
  day: number;
  isFamilyDay: boolean;
  storyDay: boolean;
}) {
  const router = useRouter();
  const { profile, progress, recordLearned, recordPractice, answerQuiz, updateConfidence, saveFamilyDiscovery, addBankItems, completeDay } = useProfile();

  const [status, setStatus] = useState<Status>("loading");
  const [content, setContent] = useState<DayLesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [conceptAcked, setConceptAcked] = useState(false);
  const [practiceSaid, setPracticeSaid] = useState<Set<number>>(new Set());
  const [quiz, setQuiz] = useState<Record<number, number | null>>({});
  const [quizChecked, setQuizChecked] = useState<Record<number, boolean>>({});
  const [storySeen, setStorySeen] = useState(false);
  const [familyAnswer, setFamilyAnswer] = useState("");
  const [familyAnalysis, setFamilyAnalysis] = useState<FamilyAnalysis | null>(null);
  const [familyPending, setFamilyPending] = useState(false);

  const profileReady = profile && progress;

  useEffect(() => {
    if (!profileReady) return;
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/day", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ day, profile, progress }),
        });
        const json = (await res.json()) as { ok: boolean; content?: DayLesson; error?: string };
        if (!json.ok) throw new Error(json.error ?? "Request failed");
        if (cancelled) return;
        setContent(json.content ?? null);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load today's lesson.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileReady, day, profile, progress]);

  if (!profileReady) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-medium text-foreground">Day {day}</h1>
        <p className="mt-3 text-muted-foreground">
          Set up your cultural profile first so the journey can begin.
        </p>
        <Button className="mt-6 rounded-full" onClick={() => router.push("/onboarding")}>
          Begin your journey
        </Button>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32">
        <Spinner className="size-6 text-gold-deep" />
        <p className="mt-4 text-sm text-muted-foreground">Preparing Day {day} for you…</p>
      </main>
    );
  }

  if (status === "error" || !content) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
        <p className="font-display text-xl font-medium text-foreground">
          Couldn&apos;t load today&apos;s session.
        </p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6 rounded-full" onClick={() => location.reload()}>
          Try again
        </Button>
      </main>
    );
  }

  const concept = content.concept;
  const practice = content.practice ?? [];
  const scenario = content.scenario ?? [];
  const mission = content.familyMission;

  const conceptDone = conceptAcked || isFamilyDay;
  const practiceDone = practice.length === 0 || practiceSaid.size >= practice.length;
  const scenarioDone =
    scenario.length > 0 &&
    Object.keys(quiz).length === scenario.length &&
    quizChecked[scenario.length - 1];
  const storyDone = !storyDay || storySeen;
  const familyDone = !isFamilyDay || Boolean(familyAnalysis);

  const step =
    !conceptDone
      ? "concept"
      : !practiceDone
        ? "practice"
        : !scenarioDone && scenario.length > 0
          ? "scenario"
          : !storyDone
            ? "story"
            : !familyDone
              ? "family"
              : "flex";

  const ackConcept = () => {
    if (!concept) return;
    recordLearned({
      day,
      title: concept.title,
      concept: concept.title,
    });
    if (concept.phrases.length > 0) {
      addBankItems(
        concept.phrases.map((p) => ({
          category: "word",
          text: p.twi,
          detail: p.english,
          day,
          source: "lesson",
        })),
      );
    }
    setConceptAcked(true);
  };

  const sayPractice = (index: number) => {
    setPracticeSaid((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    const item = practice[index];
    if (item) recordPractice({ day, concept: item.concept, status: "correct" });
  };

  const pickScenario = (qIndex: number, choiceIndex: number) => {
    const q = scenario[qIndex];
    if (!q) return;
    setQuiz((prev) => ({ ...prev, [qIndex]: choiceIndex }));
    const correct = choiceIndex === q.correctIndex;
    setQuizChecked((prev) => ({ ...prev, [qIndex]: correct }));
    const attempt: QuizAttempt = {
      id: uid("q"),
      day,
      prompt: q.question,
      promptType: q.concept,
      choices: q.choices,
      selected: q.choices[choiceIndex],
      correct,
      createdAt: stamp(),
    };
    answerQuiz(attempt);
    updateConfidence(q.concept, correct);
  };

  const submitFamilyAnswer = async () => {
    if (!mission || !familyAnswer.trim()) return;
    setFamilyPending(true);
    saveFamilyDiscovery({
      day,
      question: mission.question,
      answer: familyAnswer.trim(),
      relatedConcept: mission.relatedConcept,
      insights: [],
    });
    try {
      const res = await fetch("/api/family-analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          discovery: {
            day,
            question: mission.question,
            answer: familyAnswer.trim(),
            relatedConcept: mission.relatedConcept,
          },
          profile,
          progress,
        }),
      });
      const json = (await res.json()) as { ok: boolean; insights?: string[]; bankItems?: FamilyAnalysis["bankItems"]; nextFocus?: string; error?: string };
      if (json.ok && json.bankItems) {
        setFamilyAnalysis({ insights: json.insights ?? [], bankItems: json.bankItems, nextFocus: json.nextFocus ?? "", mode: "rag" });
        const added = json.bankItems.map((b) => ({
          category: "family-discovery" as const,
          text: b.text,
          detail: b.detail,
          day,
          source: "family" as const,
        }));
        addBankItems(added);
      } else {
        setFamilyAnalysis({ insights: [familyAnswer.trim()], bankItems: [], nextFocus: "", mode: "demo" });
      }
    } catch {
      setFamilyAnalysis({ insights: [familyAnswer.trim()], bankItems: [], nextFocus: "", mode: "demo" });
    } finally {
      setFamilyPending(false);
    }
  };

  const finish = () => {
    completeDay(day);
    router.push("/journey");
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <header className="animate-rise">
        <p className="eyebrow text-center">
          Day {content.day} · {content.theme}
        </p>
        <h1 className="font-display mt-2 text-center text-4xl font-medium tracking-tight text-foreground text-balance sm:text-5xl">
          {content.title}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-balance leading-relaxed text-muted-foreground">
          {content.hook}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {content.claim}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            ~{content.estimatedMinutes} min
          </span>
        </div>

        {/* Step rail */}
        <div
          className="mx-auto mt-6 flex w-full max-w-sm items-center gap-1.5"
          role="list"
          aria-label="Lesson progress"
        >
          {["concept", "practice", "scenario", "family", "flex"]
            .filter((s) => (s === "practice" ? practice.length > 0 : true))
            .map((s, i) => {
              const done =
                s === "concept"
                  ? conceptDone
                  : s === "practice"
                    ? practiceDone
                    : s === "scenario"
                      ? scenarioDone || scenario.length === 0
                      : s === "family"
                        ? familyDone || !isFamilyDay
                        : true;
              return (
                <span
                  key={s}
                  role="listitem"
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    done ? "bg-gold-deep" : i === stepIndex(step, practice.length > 0) ? "bg-forest" : "bg-border"
                  }`}
                />
              );
            })}
        </div>
      </header>

      <div className="mt-8 space-y-8">
        {/* Concept */}
        {concept && !conceptDone && (
          <Section icon={<BookOpenIcon className="size-4" />} label="Concept">
            <h2 className="font-display text-2xl font-medium text-foreground">
              {concept.title}
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{concept.explanation}</p>

            {concept.phrases.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {concept.phrases.map((p) => (
                  <li
                    key={p.twi}
                    className="rounded-xl border border-border/70 bg-background/60 px-4 py-3"
                  >
                    <p className="font-display text-lg text-forest-deep">{p.twi}</p>
                    <p className="text-sm text-muted-foreground">{p.english}</p>
                    {p.pronunciation && (
                      <p className="mt-1 text-xs text-gold-deep">{p.pronunciation}</p>
                    )}
                    {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
                  </li>
                ))}
              </ul>
            )}

            <Button className="mt-5 rounded-full px-5" onClick={ackConcept}>
              I&apos;ve got it
              <CheckIcon data-icon="inline-end" />
            </Button>
          </Section>
        )}

        {/* Practice */}
        {practice.length > 0 && !practiceDone && (
          <Section icon={<SparklesIcon className="size-4" />} label="Say it">
            <p className="text-sm text-muted-foreground">
              Read each one aloud. Then mark it done — actually speaking is how
              the words start to feel like yours.
            </p>
            <ul className="mt-4 grid gap-2">
              {practice.map((p, i) => {
                const said = practiceSaid.has(i);
                return (
                  <li key={i} className={`rounded-xl border px-4 py-3 ${said ? "border-forest/40 bg-forest/5" : "border-border/70 bg-background/60"}`}>
                    <p className="text-sm">{p.prompt}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <p className="font-display text-lg text-forest-deep">{p.answer}</p>
                      <Button
                        variant={said ? "secondary" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => sayPractice(i)}
                        disabled={said}
                      >
                        {said ? <CheckIcon data-icon="inline-start" /> : null}
                        {said ? "Said it" : "I said it"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {/* Scenario */}
        {scenario.length > 0 && !scenarioDone && (
          <Section icon={<MessageSquareTextIcon className="size-4" />} label="In the moment">
            <p className="text-sm text-muted-foreground">
              A tiny situation — what would you actually do or say?
            </p>
            <div className="mt-4 space-y-6">
              {scenario.map((q, qi) => (
                <ScenarioQuiz
                  key={qi}
                  q={q}
                  selected={quiz[qi] ?? null}
                  checked={quizChecked[qi]}
                  onPick={(ci) => pickScenario(qi, ci)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Story (Day 4) */}
        {storyDay && content.story && !storyDone && (
          <Section icon={<BookOpenIcon className="size-4" />} label="A story">
            <div className="rounded-xl border border-gold/40 bg-gold/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                Unverified account
              </p>
              <h2 className="font-display mt-2 text-2xl font-medium text-foreground">
                {content.story.title}
              </h2>
              <p className="mt-3 leading-relaxed text-foreground/80">{content.story.text}</p>
            </div>
            <Button className="mt-5 rounded-full px-5" onClick={() => setStorySeen(true)}>
              I read the story
              <CheckIcon data-icon="inline-end" />
            </Button>
          </Section>
        )}

        {/* Cultural insight + family mission */}
        {step === "flex" || step === "family" ? (
          <>
            {content.culturalInsight && (
              <Section icon={<SparklesIcon className="size-4" />} label="The insight">
                <p className="rounded-xl bg-forest/5 px-4 py-3 leading-relaxed text-foreground/85">
                  {content.culturalInsight}
                </p>
              </Section>
            )}

            {isFamilyDay ? (
              <Section icon={<UsersIcon className="size-4" />} label="Family mission">
                <h2 className="font-display text-xl font-medium text-foreground">
                  {mission.question}
                </h2>
                {mission.why && (
                  <p className="mt-2 text-sm text-muted-foreground">{mission.why}</p>
                )}

                {familyAnalysis ? (
                  <div className="mt-4 rounded-xl border border-forest/30 bg-forest/5 p-4">
                    <p className="eyebrow">What your family said</p>
                    <p className="mt-2 leading-relaxed text-foreground/85">
                      {familyAnswer}
                    </p>
                    {familyAnalysis.insights.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                        {familyAnalysis.insights.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    )}
                    {familyAnalysis.nextFocus && (
                      <p className="mt-3 rounded-lg bg-card px-3 py-2 text-sm text-foreground/85">
                        {familyAnalysis.nextFocus}
                      </p>
                    )}
                    {familyAnalysis.bankItems.length > 0 && (
                      <p className="mt-2 text-xs text-forest-deep">
                        Saved to your Culture Bank.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={familyAnswer}
                      onChange={(e) => setFamilyAnswer(e.target.value)}
                      rows={4}
                      maxLength={600}
                      placeholder="Write what they told you — their words, as close as you can remember…"
                      aria-label="Your family's answer"
                    />
                    <Button
                      className="rounded-full px-5"
                      disabled={!familyAnswer.trim() || familyPending}
                      onClick={submitFamilyAnswer}
                    >
                      {familyPending ? <Spinner className="size-4" /> : <CheckIcon data-icon="inline-start" />}
                      {familyPending ? "Saving…" : "Save this discovery"}
                    </Button>
                  </div>
                )}
              </Section>
            ) : (
              <Section icon={<UsersIcon className="size-4" />} label="Family mission">
                <h2 className="font-display text-xl font-medium text-foreground">
                  {mission.question}
                </h2>
                {mission.why && (
                  <p className="mt-2 text-sm text-muted-foreground">{mission.why}</p>
                )}
                <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
                  You can answer this after the day — it&apos;s quick, and it becomes
                  part of your journey.
                </p>
              </Section>
            )}
          </>
        ) : null}
      </div>

      {step === "flex" && (
        <section className="animate-rise mt-10 rounded-3xl border border-gold/40 bg-card p-6 text-center">
          <SankofaLine />
          <h2 className="font-display mt-3 text-2xl font-medium text-foreground">
            Day {content.day} done.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-balance text-muted-foreground">
            {content.flex}
          </p>
          <Button size="lg" className="mt-5 rounded-full px-6" onClick={finish}>
            Back to my journey
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </section>
      )}

      {content.sources?.length ? <SourcesList sources={content.sources} /> : null}
    </main>
  );
}

function stepIndex(step: string, hasPractice: boolean): number {
  const order = hasPractice
    ? ["concept", "practice", "scenario", "story", "family", "flex"]
    : ["concept", "scenario", "story", "family", "flex"];
  return Math.max(0, order.indexOf(step));
}

function Section({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <section className="animate-rise">
      <p className="eyebrow flex items-center gap-2">
        <span className="text-gold-deep">{icon}</span>
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ScenarioQuiz({
  q,
  selected,
  checked,
  onPick,
}: {
  q: ScenarioQuestion;
  selected: number | null;
  checked: boolean | undefined;
  onPick: (choiceIndex: number) => void;
}) {
  const reveal = checked !== undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg font-medium">{q.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {q.choices.map((choice, i) => {
            const isSel = selected === i;
            const isCorrect = reveal && i === q.correctIndex;
            const isWrong = reveal && isSel && i !== q.correctIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onPick(i)}
                disabled={reveal}
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
        {reveal && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {q.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SankofaLine() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="mx-auto size-10 text-gold">
      <path d="M16 8.5c-6.5 2.2-9 8.4-7 15.4C10.9 30.8 18 35 27 35l6.5-2.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="19.5" cy="24" r="4.75" stroke="currentColor" strokeWidth="3" fill="none" />
    </svg>
  );
}
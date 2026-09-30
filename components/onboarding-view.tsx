"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SankofaMark } from "@/components/brand";
import { useProfile, type OnboardingAnswers } from "@/lib/profile-context";
import {
  CULTURAL_CONNECTION_OPTIONS,
  FAMILY_KNOWLEDGE_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  LEARNING_PREFERENCE_OPTIONS,
  LOCATION_OPTIONS,
} from "@/lib/constants";
import type { LearningGoal } from "@/lib/types";

const STEPS = [
  { title: "Where are you?", eyebrow: "Step 1 of 5", blurb: "It shapes how I frame everything for you." },
  { title: "How connected do you feel?", eyebrow: "Step 2 of 5", blurb: "There's no wrong answer — it's your starting point." },
  { title: "What does your family know?", eyebrow: "Step 3 of 5", blurb: "It lets me ask the right questions later." },
  { title: "What do you want out of this?", eyebrow: "Step 4 of 5", blurb: "Pick as many as you like — I'll weave them in." },
  { title: "How do you like to learn?", eyebrow: "Step 5 of 5", blurb: "Last one — the journey adapts to this." },
];

export function OnboardingView() {
  const router = useRouter();
  const { createProfile, isCustomized } = useProfile();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    location: undefined as never,
    culturalConnectionLevel: undefined as never,
    familyKnowledgeLevel: undefined as never,
    learningGoals: [],
    preferredLearningStyle: undefined as never,
  });

  const patch = (p: Partial<OnboardingAnswers>) =>
    setAnswers((prev) => ({ ...prev, ...p }));

  const canContinue =
    step === 0
      ? Boolean(answers.location)
      : step === 1
        ? Boolean(answers.culturalConnectionLevel)
        : step === 2
          ? Boolean(answers.familyKnowledgeLevel)
          : step === 3
            ? answers.learningGoals.length > 0
            : Boolean(answers.preferredLearningStyle);

  const toggleGoal = (goal: LearningGoal) => {
    patch({
      learningGoals: answers.learningGoals.includes(goal)
        ? answers.learningGoals.filter((g) => g !== goal)
        : [...answers.learningGoals, goal],
    });
  };

  const submit = () => {
    createProfile(answers);
    router.replace("/journey");
  };

  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-6 pt-8">
        <SankofaMark className="size-8 text-gold" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {STEPS[step].eyebrow}
        </span>
      </header>

      <div
        className="mt-6 h-1 w-full bg-border"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
      >
        <div
          className="h-full bg-gold-deep transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8">
        <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
          {STEPS[step].title}
        </h1>
        <p className="mt-2 text-balance text-muted-foreground">
          {STEPS[step].blurb}
        </p>

        <div className="mt-8 flex-1">
          {step === 0 && (
            <RadioGroup
              value={answers.location}
              onValueChange={(v) =>
                patch({ location: v as OnboardingAnswers["location"] })
              }
            >
              {LOCATION_OPTIONS.map((opt) => (
                <OptionCard key={opt.value} checked={answers.location === opt.value} htmlFor={`loc-${opt.value}`}>
                  <RadioGroupItem value={opt.value} id={`loc-${opt.value}`} />
                  <span className="font-semibold">{opt.label}</span>
                  <OptionBlurb>{opt.blurb}</OptionBlurb>
                </OptionCard>
              ))}
            </RadioGroup>
          )}

          {step === 1 && (
            <RadioGroup
              value={answers.culturalConnectionLevel}
              onValueChange={(v) =>
                patch({
                  culturalConnectionLevel: v as OnboardingAnswers["culturalConnectionLevel"],
                })
              }
            >
              {CULTURAL_CONNECTION_OPTIONS.map((opt) => (
                <OptionCard key={opt.value} checked={answers.culturalConnectionLevel === opt.value} htmlFor={`conn-${opt.value}`}>
                  <RadioGroupItem value={opt.value} id={`conn-${opt.value}`} />
                  <span className="font-semibold">{opt.label}</span>
                  <OptionBlurb>{opt.blurb}</OptionBlurb>
                </OptionCard>
              ))}
            </RadioGroup>
          )}

          {step === 2 && (
            <RadioGroup
              value={answers.familyKnowledgeLevel}
              onValueChange={(v) =>
                patch({
                  familyKnowledgeLevel: v as OnboardingAnswers["familyKnowledgeLevel"],
                })
              }
            >
              {FAMILY_KNOWLEDGE_OPTIONS.map((opt) => (
                <OptionCard key={opt.value} checked={answers.familyKnowledgeLevel === opt.value} htmlFor={`fam-${opt.value}`}>
                  <RadioGroupItem value={opt.value} id={`fam-${opt.value}`} />
                  <span className="font-semibold">{opt.label}</span>
                  <OptionBlurb>{opt.blurb}</OptionBlurb>
                </OptionCard>
              ))}
            </RadioGroup>
          )}

          {step === 3 && (
            <div className="grid gap-2">
              {LEARNING_GOAL_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  checked={answers.learningGoals.includes(opt.value)}
                >
                  <Checkbox
                    id={`goal-${opt.value}`}
                    checked={answers.learningGoals.includes(opt.value)}
                    onCheckedChange={() => toggleGoal(opt.value as LearningGoal)}
                  />
                  <Label htmlFor={`goal-${opt.value}`} className="cursor-pointer font-semibold">
                    {opt.label}
                  </Label>
                  <OptionBlurb>{opt.blurb}</OptionBlurb>
                </OptionCard>
              ))}
            </div>
          )}

          {step === 4 && (
            <RadioGroup
              value={answers.preferredLearningStyle}
              onValueChange={(v) =>
                patch({
                  preferredLearningStyle: v as OnboardingAnswers["preferredLearningStyle"],
                })
              }
            >
              {LEARNING_PREFERENCE_OPTIONS.map((opt) => (
                <OptionCard key={opt.value} checked={answers.preferredLearningStyle === opt.value} htmlFor={`style-${opt.value}`}>
                  <RadioGroupItem value={opt.value} id={`style-${opt.value}`} />
                  <span className="font-semibold">{opt.label}</span>
                  <OptionBlurb>{opt.blurb}</OptionBlurb>
                </OptionCard>
              ))}
            </RadioGroup>
          )}

          {step === 1 && isCustomized && (
            <p className="mt-4 text-xs text-muted-foreground">
              Editing your profile will restart your journey from Day 1.
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 pb-4">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-4"
            onClick={() =>
              step === 0 ? router.push(isCustomized ? "/journey" : "/") : setStep((s) => s - 1)
            }
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {step === 0 ? (isCustomized ? "Journey" : "Home") : "Back"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="rounded-full px-5"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-full px-5"
              disabled={!canContinue}
              onClick={submit}
            >
              {isCustomized ? "Save & restart journey" : "Begin my journey"}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function OptionCard({
  children,
  checked,
  htmlFor,
}: {
  children: React.ReactNode;
  checked?: boolean;
  htmlFor?: string;
}) {
  const classes = `relative grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3 rounded-xl border bg-card p-4 text-sm ring-1 ring-transparent transition-colors ${
    checked
      ? "border-gold-deep/50 ring-gold-deep/20 bg-gold/5"
      : "border-border/70 hover:border-foreground/20"
  }`;
  return htmlFor ? (
    <Label htmlFor={htmlFor} className={classes}>
      {children}
    </Label>
  ) : (
    <div data-slot="option-card" className={classes}>
      {children}
    </div>
  );
}

function OptionBlurb({ children }: { children: React.ReactNode }) {
  return <span className="col-start-2 text-xs text-muted-foreground">{children}</span>;
}
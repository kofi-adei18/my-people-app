"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldTitle } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { CheckIcon, ShieldIcon } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import {
  HERITAGE_OPTIONS,
  INTERESTS,
  KNOWLEDGE_LEVELS,
  LANGUAGE_OPTIONS,
} from "@/lib/constants";
import type { Interest, KnowledgeLevel, Language } from "@/lib/types";

export function OnboardingView() {
  const router = useRouter();
  const { profile, setProfile, markCustomized } = useProfile();

  const [language, setLanguage] = useState<Language>(profile.language);
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>(
    profile.knowledgeLevel,
  );
  const [interests, setInterests] = useState<Interest[]>(profile.interests);
  const [reviewing, setReviewing] = useState(false);

  const toggleInterest = (value: Interest) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  };

  const create = () => {
    setProfile({
      heritage: "Akan",
      language,
      knowledgeLevel,
      interests,
    });
    markCustomized();
    setReviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const begin = () => router.push("/journey");

  if (reviewing) {
    return <ProfileSummary {...{ language, knowledgeLevel, interests, onCreate: create, onBegin: begin }} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col px-6 py-12">
      <header className="mb-10 text-center">
        <p className="eyebrow">Build your profile</p>
        <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Your Cultural Profile
        </h1>
        <p className="mt-3 text-muted-foreground">
          Four quick answers shape everything My People teaches you.
        </p>
      </header>

      <FieldGroup className="gap-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldTitle>Where does your heritage connect to?</FieldTitle>
            <p className="text-sm font-medium text-foreground">{HERITAGE_OPTIONS[0]}</p>
          </Field>

          <Field>
            <FieldTitle>Which language are you most connected to?</FieldTitle>
            <ToggleGroup
              type="single"
              value={language}
              onValueChange={(v) => v && setLanguage(v as Language)}
              spacing={1.5}
              className="flex flex-wrap"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <ToggleGroupItem key={lang} value={lang}>
                  {lang}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </div>

        <Field>
          <FieldTitle>How familiar are you with your culture?</FieldTitle>
          <ToggleGroup
            type="single"
            value={knowledgeLevel}
            onValueChange={(v) => v && setKnowledgeLevel(v as KnowledgeLevel)}
            spacing={1.5}
            className="flex flex-col"
          >
            {KNOWLEDGE_LEVELS.map((opt) => (
              <OptionCard
                key={opt.value}
                active={knowledgeLevel === opt.value}
                title={opt.label}
                blurb={opt.blurb}
                onClick={() => setKnowledgeLevel(opt.value)}
              />
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldTitle>What would you like to discover?</FieldTitle>
          <FieldDescription>Select all that interest you.</FieldDescription>
          <ToggleGroup
            type="multiple"
            value={interests}
            onValueChange={(v) => setInterests(v as Interest[])}
            spacing={1.5}
            className="flex flex-col"
          >
            {INTERESTS.map((opt) => (
              <OptionCard
                key={opt.value}
                active={interests.includes(opt.value)}
                title={opt.label}
                blurb={opt.blurb}
                onClick={() => toggleInterest(opt.value)}
              />
            ))}
          </ToggleGroup>
        </Field>

        {interests.length === 0 && (
          <p className="-mt-4 text-sm text-destructive">
            Pick at least one interest so My People can personalise your journey.
          </p>
        )}

        <Button onClick={create} size="lg" className="h-11 rounded-full text-base">
          Create My Cultural Profile
        </Button>
      </FieldGroup>
    </main>
  );
}

function OptionCard({
  active,
  title,
  blurb,
  onClick,
}: {
  active: boolean;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/40 bg-primary/5 text-foreground"
          : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {active && <CheckIcon className="size-3.5" />}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{blurb}</span>
      </span>
    </button>
  );
}

function ProfileSummary({
  language,
  knowledgeLevel,
  interests,
  onBegin,
}: {
  language: Language;
  knowledgeLevel: KnowledgeLevel;
  interests: Interest[];
  onBegin: () => void;
}) {
  const levelLabel = KNOWLEDGE_LEVELS.find((l) => l.value === knowledgeLevel)?.label;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-12">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <ShieldIcon className="size-7" />
      </div>
      <p className="eyebrow mt-6 text-center">Your heritage, in one picture</p>
      <h1
        aria-label="Your Akan Heritage"
        className="font-display mt-3 text-center text-4xl font-medium tracking-tight text-foreground"
      >
        Your Akan Heritage
      </h1>

      <div className="mt-8 space-y-4">
        <SummaryRow label="People" value="Akan" />
        <SummaryRow label="Language" value={language} />
        <SummaryRow label="Experience" value={levelLabel ?? "Just starting"} />
        <div className="flex items-start justify-between gap-6 border-t border-border py-2">
          <dt className="pt-1.5 text-sm font-medium text-foreground">Interests</dt>
          <dd className="flex flex-wrap justify-end gap-1.5">
            {interests.length > 0 ? (
              interests.map((i) => {
                const opt = INTERESTS.find((o) => o.value === i);
                return (
                  <Badge key={i} variant="secondary">
                    {opt?.label ?? i}
                  </Badge>
                );
              })
            ) : (
              <span className="text-sm text-muted-foreground">None selected</span>
            )}
          </dd>
        </div>
      </div>

      <p className="mt-6 text-balance text-center text-muted-foreground">
        Your journey: a personalized introduction to the culture connected to your
        heritage.
      </p>

      <Button onClick={onBegin} size="lg" className="mt-8 h-11 rounded-full text-base">
        Begin My Journey
      </Button>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-border py-2">
      <dt className="text-sm font-medium text-foreground">{label}</dt>
      <dd className="text-sm text-muted-foreground">{value}</dd>
    </div>
  );
}
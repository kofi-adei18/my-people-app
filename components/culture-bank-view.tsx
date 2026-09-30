"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon, BookMarkedIcon } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { SankofaMark } from "@/components/brand";
import { useCultureBank, useProfile } from "@/lib/profile-context";
import type { CultureBankCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<CultureBankCategory, { label: string; hint: string }> = {
  word: { label: "Words & phrases", hint: "Twi you can actually say." },
  saying: { label: "Sayings", hint: "Proverbs and wisdom." },
  people: { label: "People", hint: "Titles and names that matter." },
  story: { label: "Stories", hint: "Accounts that carry meaning." },
  "family-discovery": { label: "Family discoveries", hint: "Told to you by your own people." },
  insight: { label: "Insights", hint: "Reflections you've gathered." },
};

const CATEGORY_ORDER: CultureBankCategory[] = [
  "word",
  "saying",
  "people",
  "story",
  "family-discovery",
  "insight",
];

export function CultureBankView() {
  const router = useRouter();
  const { isCustomized } = useProfile();
  const { items, byCategory } = useCultureBank();

  if (!isCustomized) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-20">
        <Empty className="border-0">
          <EmptyMedia variant="icon">
            <BookMarkedIcon className="size-4 text-gold" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Your Culture Bank is empty</EmptyTitle>
            <EmptyDescription>
              Everything you collect on the journey lives here — words, stories,
              and discoveries from your family.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="rounded-full px-5" onClick={() => router.push("/onboarding")}>
              Begin your journey
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const present = CATEGORY_ORDER.filter((c) => byCategory.get(c)?.length);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <header className="flex items-center gap-4">
        <SankofaMark className="size-10 text-gold" />
        <div>
          <p className="eyebrow">Culture Bank</p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
            {items.length} treasure{items.length === 1 ? "" : "s"} so far
          </h1>
        </div>
      </header>

      {present.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">
          Nothing saved yet — complete a day or two and this will fill up.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {present.map((cat) => {
            const list = byCategory.get(cat) ?? [];
            return (
              <section key={cat} aria-label={CATEGORY_LABELS[cat].label}>
                <h2 className="eyebrow">{CATEGORY_LABELS[cat].label}</h2>
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat].hint}</p>
                <ul className="mt-3 grid gap-2">
                  {list.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-border/70 bg-card px-4 py-3"
                    >
                      <p className="text-sm text-foreground">{item.text}</p>
                      {item.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                      )}
                      <p className="mt-1 text-xs text-gold-deep">
                        {item.day !== undefined ? `Day ${item.day}` : "From an event briefing"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Want to go deeper on any of it?{" "}
        <a href="/heritage" className="underline underline-offset-4 hover:text-foreground">
          Visit Your Heritage
        </a>
      </p>
    </main>
  );
}
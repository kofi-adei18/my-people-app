"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CompassIcon, HeartIcon, ScrollTextIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SourcesList } from "@/components/sources-list";
import type { Day6Reflection } from "@/lib/types";
import { useProfile } from "@/lib/profile-context";

export function ReflectionView() {
  const router = useRouter();
  const { profile, progress, completeDay } = useProfile();

  const [content, setContent] = useState<Day6Reflection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !progress) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reflection", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile, progress }),
        });
        const json = (await res.json()) as { ok: boolean; content?: Day6Reflection; error?: string };
        if (!json.ok) throw new Error(json.error ?? "Request failed");
        if (!cancelled) setContent(json.content ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load your reflection.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, progress]);

  const finish = () => {
    completeDay(6);
    router.push("/journey");
  };

  if (!profile || !progress) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-medium text-foreground">Day 6</h1>
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
        <p className="mt-4 text-sm text-muted-foreground">Gathering your journey…</p>
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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="animate-rise text-center">
        <p className="eyebrow">Day 6 · Identity</p>
        <h1 className="font-display mt-2 text-4xl font-medium tracking-tight text-foreground text-balance sm:text-5xl">
          {content.title}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-balance leading-relaxed text-muted-foreground">
          {content.hook}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Stat icon={<HeartIcon className="size-4" />} label="Language" value={content.summary.language} />
        <Stat icon={<CompassIcon className="size-4" />} label="Culture" value={content.summary.culture} />
        <Stat icon={<ScrollTextIcon className="size-4" />} label="History" value={content.summary.history} />
        <Stat icon={<UsersIcon className="size-4" />} label="Family" value={content.summary.family} />
      </div>

      <section className="animate-rise mt-8 rounded-2xl border border-gold/40 bg-gold/5 p-5">
        <p className="eyebrow">Your journey so far</p>
        <p className="mt-2 leading-relaxed text-foreground/85">{content.insight}</p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/70">{content.recommendation}</p>
      </section>

      {content.interests.length > 0 && (
        <section className="animate-rise mt-6">
          <h2 className="eyebrow">What you&apos;re curious about</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {content.interests.map((i) => (
              <span key={i} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
                {i}
              </span>
            ))}
          </div>
        </section>
      )}

      {content.bankSelect.length > 0 && (
        <section className="animate-rise mt-8">
          <h2 className="eyebrow">Recent treasures</h2>
          <ul className="mt-3 grid gap-2">
            {content.bankSelect.map((item) => (
              <li key={item.id} className="rounded-xl border border-border/70 bg-card px-4 py-3">
                <p className="text-sm text-foreground">{item.text}</p>
                {item.detail && <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 text-center">
        <Button size="lg" className="rounded-full px-6" onClick={finish}>
          On to Day 7
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>

      {content.sources?.length ? <SourcesList sources={content.sources} /> : null}
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card size="sm" className="items-center gap-1 p-4 text-center">
      <span className="text-gold-deep">{icon}</span>
      <p className="font-display text-3xl font-medium text-foreground">{value}</p>
      <CardContent className="px-0 py-0 text-xs text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
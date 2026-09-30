import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MicIcon, SparklesIcon } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { storyById, storiesFor } from "@/lib/family/store";
import { formatDate } from "@/lib/family/format";

export const dynamic = "force-dynamic";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function FamilyStoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const story = storyById(id);
  if (!story) notFound();

  const topics = [
    ...story.people.map((p) => `Person · ${p}`),
    ...story.places.map((p) => `Place · ${p}`),
    ...story.traditions.map((t) => `Tradition · ${t}`),
    ...story.languages.map((l) => `Language · ${l}`),
    ...story.names.map((n) => `Name · ${n}`),
    ...story.topics.filter(
      (t) =>
        !story.places.includes(t) &&
        !story.traditions.includes(t) &&
        !story.languages.includes(t) &&
        !story.names.includes(t) &&
        !story.people.includes(t),
    ),
  ];

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/heritage"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to Your Heritage
        </Link>

        <article className="mt-8">
          <header>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-gold-deep">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              Family Story
            </p>
            <h1 className="font-display mt-3 text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              {story.title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Told by {story.speaker} · {formatDate(story.createdAt)}
              {story.seeded && " · from the family archive"}
            </p>
          </header>

          {story.audioId && (
            <figure className="mt-6 rounded-2xl border border-border/80 bg-card/50 p-4">
              <figcaption className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MicIcon className="size-3.5" aria-hidden="true" />
                {story.speaker}&apos;s original voice
              </figcaption>
              <audio
                controls
                preload="none"
                src={`/api/family/audio/${story.audioId}`}
                className="w-full"
              />
            </figure>
          )}

          <div className="mt-6 rounded-2xl border border-border/80 bg-card/50 p-6">
            <p className="font-display text-lg leading-relaxed text-foreground">
              {story.story}
            </p>
          </div>

          {topics.length > 0 && (
            <section aria-label="Extracted topics" className="mt-6">
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                What this story holds
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <details className="group mt-8 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {story.speaker}&apos;s exact words
              <span className="ml-2 inline-block transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <p className="mt-3 border-t border-border/60 pt-3 text-sm leading-relaxed text-muted-foreground">
              {story.transcript}
            </p>
          </details>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            This is one of {storiesFor().length} preserved family stories.{" "}
            <Link
              href="/family"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Ask another question
            </Link>
          </p>
        </article>
      </main>
    </PageShell>
  );
}

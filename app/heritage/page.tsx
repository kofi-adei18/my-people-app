import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenIcon,
  GlobeIcon,
  MapPinIcon,
  MicIcon,
  SignatureIcon,
  UsersIcon,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { HeritageQa } from "@/components/family/heritage-qa";
import { knowledge, readFamily, relativeUsers } from "@/lib/family/store";
import { formatRelative } from "@/lib/family/format";
import type { FamilyStory } from "@/lib/family/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Heritage — My People",
};

function StoryCard({ story }: { story: FamilyStory }) {
  return (
    <li>
      <Link
        href={`/family/story/${story.id}`}
        className="block rounded-2xl border border-border/80 bg-card/50 p-4 transition-colors hover:border-gold-deep/50 hover:bg-card"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-medium text-foreground">
            {story.title}
          </h3>
          {story.audioId && (
            <span
              title="Voice recording available"
              className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
            >
              <MicIcon className="size-3.5" aria-hidden="true" />
              Voice
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {story.story}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Told by {story.speaker} · {formatRelative(story.createdAt)}
          {story.topics.length > 0 && ` · ${story.topics.slice(0, 3).join(", ")}`}
        </p>
      </Link>
    </li>
  );
}

function KnowledgeSection({
  icon,
  title,
  items,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section aria-label={title}>
      <h2 className="inline-flex items-center gap-2 font-display text-xl font-medium tracking-tight text-foreground">
        <span className="text-gold-deep">{icon}</span>
        {title}
        <span className="text-sm font-normal text-muted-foreground">
          ({items.length})
        </span>
      </h2>
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

export default function HeritagePage() {
  const data = readFamily();
  const knowledge_ = knowledge();
  const stories = [...data.stories].sort((a, b) => b.createdAt - a.createdAt);
  const relation = relativeUsers()[0]?.relation ?? "family";

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <header className="text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Your Heritage
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground">
            Everything here comes from what {relation} and your family have
            actually shared — preserved from real conversations, never invented.
          </p>
        </header>

        <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-border/80 bg-card/50 px-6 py-4 text-sm text-muted-foreground">
          <span>
            <strong className="font-semibold text-foreground">{stories.length}</strong>{" "}
            stories
          </span>
          <span>
            <strong className="font-semibold text-foreground">
              {knowledge_.people.length}
            </strong>{" "}
            people
          </span>
          <span>
            <strong className="font-semibold text-foreground">
              {knowledge_.traditions.length}
            </strong>{" "}
            traditions
          </span>
          <span>
            <strong className="font-semibold text-foreground">
              {knowledge_.names.length}
            </strong>{" "}
            names
          </span>
          <span>
            <strong className="font-semibold text-foreground">
              {knowledge_.origins.length}
            </strong>{" "}
            origins
          </span>
        </div>

        <div className="mt-12 space-y-10">
          <KnowledgeSection
            icon={<MapPinIcon className="size-5" aria-hidden="true" />}
            title="Origins"
            items={knowledge_.origins}
            empty="Ask your family where you come from — their answer will appear here."
          />
          <KnowledgeSection
            icon={<UsersIcon className="size-5" aria-hidden="true" />}
            title="People"
            items={knowledge_.people}
            empty="Ask about a family member — every person mentioned will appear here."
          />
          <KnowledgeSection
            icon={<GlobeIcon className="size-5" aria-hidden="true" />}
            title="Languages"
            items={knowledge_.languages}
            empty="Ask what language your family grew up speaking."
          />
          <KnowledgeSection
            icon={<BookOpenIcon className="size-5" aria-hidden="true" />}
            title="Traditions"
            items={knowledge_.traditions}
            empty="Ask about a tradition your family keeps."
          />
          <KnowledgeSection
            icon={<SignatureIcon className="size-5" aria-hidden="true" />}
            title="Names"
            items={knowledge_.names}
            empty="Ask why you were given your name."
          />
        </div>

        <section aria-label="Family stories" className="mt-12">
          <h2 className="inline-flex items-center gap-2 font-display text-xl font-medium tracking-tight text-foreground">
            <span className="text-gold-deep">
              <BookOpenIcon className="size-5" aria-hidden="true" />
            </span>
            Family Stories
            <span className="text-sm font-normal text-muted-foreground">
              ({stories.length})
            </span>
          </h2>
          {stories.length > 0 ? (
            <ul className="mt-3 grid gap-3">
              {stories.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
              No family stories yet.{" "}
              <Link href="/family" className="underline underline-offset-4">
                Ask your first question
              </Link>
              .
            </p>
          )}
        </section>

        <HeritageQa />

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Ready to grow your heritage?{" "}
          <Link href="/family" className="underline underline-offset-4 hover:text-foreground">
            Ask My Family
          </Link>
        </p>
      </main>
    </PageShell>
  );
}

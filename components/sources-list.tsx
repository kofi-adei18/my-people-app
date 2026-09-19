import type { SourceReference } from "@/lib/types";
import { BookOpenIcon, LinkIcon, ShieldCheckIcon } from "lucide-react";

export function SourcesList({ sources }: { sources: SourceReference[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <section
      aria-label="Sources"
      className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-5"
    >
      <p className="eyebrow flex items-center gap-2">
        <BookOpenIcon className="size-4" aria-hidden="true" />
        Sources
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Grounded in the curated My People knowledge base. References point to
        the source documents behind this.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {sources.map((src) => (
          <li
            key={src.title}
            className="flex items-start gap-2 rounded-lg bg-background/70 px-3 py-2 text-sm"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <BookOpenIcon className="size-2.5" />
            </span>
            <div className="min-w-0">
              <span className="text-foreground">
                {src.title}
                {src.page !== undefined && (
                  <span className="text-muted-foreground"> · p. {src.page}</span>
                )}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {src.verified === false && (
                  <span className="inline-flex items-center gap-1 font-medium text-gold-deep">
                    <ShieldCheckIcon className="size-3" aria-hidden="true" />
                    Unverified account
                  </span>
                )}
                {src.authority && (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {src.authority} authority
                  </span>
                )}
                {src.specificity && (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {src.specificity}
                  </span>
                )}
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                  >
                    <LinkIcon className="size-3" aria-hidden="true" />
                    Source
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
import type { SourceReference } from "@/lib/types";
import { BookOpenIcon, MapPinIcon } from "lucide-react";

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
        the source documents behind this answer.
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
              <MapPinIcon className="size-2.5" />
            </span>
            <span className="text-foreground">
              {src.title}
              {src.page !== undefined && (
                <span className="text-muted-foreground"> · p. {src.page}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
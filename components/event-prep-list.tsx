"use client";

import Link from "next/link";
import { CalendarDaysIcon, MapIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/lib/events-context";

/**
 * Compact list of saved prep journeys — shown on the events page and on the
 * prep index, with delete affordances.
 */
export function EventPrepList({ canDelete = false }: { canDelete?: boolean }) {
  const { prepJourneys, removePrepJourney, hydrated } = useEvents();

  if (!hydrated) return null;
  if (prepJourneys.length === 0) return null;

  return (
    <section aria-label="Saved prep journeys" className="mt-8">
      <h2 className="font-display text-lg font-medium text-foreground">
        Your prep journeys
      </h2>
      <ul className="mt-3 grid gap-2">
        {prepJourneys.map((j) => (
          <li key={j.id} className="flex items-stretch gap-2">
            <Link
              href={`/events/prep/${j.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-foreground/20"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-deep/15 text-gold-deep">
                <MapIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {j.eventTitle}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {j.eventTypeGuess ? `${j.eventTypeGuess} · ` : ""}
                  {j.eventDate
                    ? new Date(j.eventDate).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "no date"}
                  {" · "}
                  {j.grounding === "low" ? "general guidance" : "grounded"}
                </p>
              </div>
              {j.eventDate ? (
                <CalendarDaysIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${j.eventTitle}`}
                onClick={() => removePrepJourney(j.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <TrashIcon className="size-4" aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

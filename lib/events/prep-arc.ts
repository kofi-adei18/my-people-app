import type { PrepStepId } from "@/lib/types";

/**
 * Arc composition for calendar prep journeys.
 *
 * The full arc mirrors the 7-day journey's philosophy (Understand → Mouth →
 * Body → Wear → Gifts → Family → Rehearse). The number of steps is dynamic:
 * it matches the days left before the event, compressing by merging adjacent
 * themes as the window shrinks. The arc is ADVISORY ONLY in pacing — every
 * step is open from the start; a learner may finish the whole journey in one
 * sitting.
 */

const DAY_MS = 86_400_000;

export const FULL_ARC: PrepStepId[] = [
  "understand",
  "mouth",
  "body",
  "wear",
  "gifts",
  "family",
  "rehearse",
];

export const STEP_META: Record<PrepStepId, { title: string; theme: string }> = {
  understand: { title: "Understand the Occasion", theme: "Understand" },
  mouth: { title: "Say It Right", theme: "Mouth" },
  body: { title: "Carry Yourself Well", theme: "Body" },
  wear: { title: "Dress the Part", theme: "Wear" },
  gifts: { title: "Give Graciously", theme: "Gifts" },
  family: { title: "Ask Your People", theme: "Family" },
  rehearse: { title: "Rehearse & Get Ready", theme: "Rehearse" },
};

export const MERGED_TITLE_SUFFIX = " & more";

/** Compose the arc for the days available. ≥7 → full arc; below that, merge. */
export function composeArc(daysLeft: number): PrepStepId[] {
  if (daysLeft >= 7) return [...FULL_ARC];
  if (daysLeft >= 5) {
    // Merge gifts+family: "Give Graciously & Ask Your People".
    return ["understand", "mouth", "body", "wear", "gifts", "rehearse"];
  }
  if (daysLeft >= 3) {
    // Merge understand+body and gifts+family; keep mouth, wear, rehearse.
    return ["understand", "mouth", "wear", "gifts", "rehearse"];
  }
  // 1–2 day sprint.
  return ["mouth", "wear", "rehearse"];
}

/** Which themes a composed step covers (merged steps span two). */
export function themesForStep(stepId: PrepStepId, arc: PrepStepId[]): PrepStepId[] {
  if (stepId !== "understand" && stepId !== "gifts") return [stepId];
  const idx = arc.indexOf(stepId);
  const next = arc[idx + 1];
  if (stepId === "understand" && next === "mouth" && daysCompressed(arc, "understand")) {
    return ["understand", "body"];
  }
  if (stepId === "gifts" && next === "rehearse" && daysCompressed(arc, "gifts")) {
    return ["gifts", "family"];
  }
  return [stepId];
}

function daysCompressed(arc: PrepStepId[], stepId: PrepStepId): boolean {
  // A merged "understand" covers body when body is absent from the arc; the
  // same logic applies to gifts covering family.
  const covered = stepId === "understand" ? "body" : "family";
  return !arc.includes(covered);
}

export function stepTitle(stepId: PrepStepId, arc: PrepStepId[]): string {
  const themes = themesForStep(stepId, arc);
  if (themes.length === 1) return STEP_META[stepId].title;
  const [a, b] = themes;
  return `${STEP_META[a].theme} & ${STEP_META[b].theme}`;
}

/** Advisory pacing hint — "Day 2 of 7" style, never a gate. */
export function pacingHint(eventDate: number, leadTimeDays: number, arc: PrepStepId[]): {
  totalDays: number;
  daysLeft: number;
  hint: string;
} {
  const now = Date.now();
  const daysLeft = Math.max(1, Math.ceil((eventDate - now) / DAY_MS));
  const totalDays = Math.min(leadTimeDays, daysLeft);
  return {
    totalDays,
    daysLeft,
    hint:
      daysLeft >= arc.length
        ? `A comfortable pace is one step a day — you have ${daysLeft} days.`
        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} to go — a sensible pace is ${Math.max(1, Math.ceil(arc.length / daysLeft))} step${Math.ceil(arc.length / daysLeft) === 1 ? "" : "s"} a day. Take them at your own speed.`,
  };
}

/** Suggested next step index for the pacing hint (advisory only). */
export function suggestedStepIndex(
  eventDate: number,
  arc: PrepStepId[],
  completedSteps: PrepStepId[],
): number {
  const remaining = arc.filter((s) => !completedSteps.includes(s));
  if (remaining.length === 0) return arc.length - 1;
  const now = Date.now();
  const daysLeft = Math.max(1, Math.ceil((eventDate - now) / DAY_MS));
  const perDay = Math.max(1, Math.ceil(arc.length / daysLeft));
  return Math.min(arc.length - 1, arc.indexOf(remaining[0]) + perDay - 1);
}
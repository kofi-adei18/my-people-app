"use client";

import { journeyDay } from "@/lib/journey";
import { LessonView } from "@/components/lesson-view";
import { ReflectionView } from "@/components/reflection-view";
import { ChallengeView } from "@/components/challenge-view";

export function DayExperience({ day }: { day: number }) {
  const def = journeyDay(day);
  if (!def) return null;

  if (def.dayType === "reflection") return <ReflectionView />;
  if (def.dayType === "challenge") return <ChallengeView />;
  return (
    <LessonView
      day={day}
      isFamilyDay={day === 5}
      storyDay={day === 4}
    />
  );
}
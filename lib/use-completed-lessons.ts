"use client";

import { useEffect, useState } from "react";
import { LEARN_LESSON_STORAGE } from "@/lib/constants";

/** Track which lessons the learner has completed, in localStorage. */
export function useCompletedLessons() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LEARN_LESSON_STORAGE);
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const completeLesson = (slug: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(slug);
      try {
        window.localStorage.setItem(
          LEARN_LESSON_STORAGE,
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return { completed, completeLesson };
}
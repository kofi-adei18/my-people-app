import type { Phrase } from "@/lib/types";

/**
 * Corpus-gated Twi phrase bank shared by the calendar briefing and calendar
 * prep journey generators. The ONLY Twi those generators may surface — every
 * candidate carries the tokens that must exist in the retrieved corpus before
 * the phrase is shown (same gating as the journey days in day.ts).
 */

export const PHRASE_CANDIDATES: (Phrase & { tokens: string[] })[] = [
  { twi: "Maakye", english: "Good morning", notes: "Lead with the time-of-day greeting", tokens: ["maakye"] },
  { twi: "Maaha", english: "Good afternoon", tokens: ["maaha"] },
  { twi: "Maadwo", english: "Good evening", tokens: ["maadwo"] },
  { twi: "Owura", english: "Sir / Mr", tokens: ["owura"] },
  { twi: "Awuraa", english: "Ma'am / Lady", tokens: ["awuraa"] },
  { twi: "Maame", english: "An adult woman your mother's age", tokens: ["maame"] },
  { twi: "Nana", english: "A chief, or an honoured elder", tokens: ["nana"] },
  { twi: "Wo ho te sɛn?", english: "How are you?", tokens: ["wo ho te sɛn"] },
  { twi: "Mepa wo kyɛw", english: "Please — 'I remove my hat to you'", tokens: ["mepa wo kyɛw"] },
  { twi: "Meda wo ase", english: "Thank you — 'I lay at your feet'", tokens: ["meda wo ase"] },
];

/** Gate candidates against retrieved corpus text; strip the token metadata. */
export function gatePhrases(corpus: string): Phrase[] {
  const lower = corpus.toLowerCase();
  return PHRASE_CANDIDATES.filter((p) =>
    p.tokens.every((t) => lower.includes(t.toLowerCase())),
  ).map((p) => ({
    twi: p.twi,
    english: p.english,
    pronunciation: p.pronunciation,
    notes: p.notes,
  }));
}
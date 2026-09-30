# Knowledge Base — My People

Sources of truth for the My People cultural companion. Every AI answer and every daily
lesson is grounded in the curated documents below; nothing is fabricated.

## Sources

### 1. Introductory Lesson on Greetings in Asante Twi
- **File:** `akan-sources/Introductory-Lesson-on-Greetings-in-Asante-Twi.txt`
- **Source id:** `asante-twi-greetings-intro`
- **Used in:** Days 1–2 · topics: greetings, language, etiquette
- **Claim type:** language · authority: medium · specificity: explicit · verified: no

### 2. Being Polite in Asante Twi
- **File:** `akan-sources/Being polite in Asante Twi.txt`
- **Source id:** `asante-twi-politeness`
- **Used in:** Days 2–3 · topics: politeness, etiquette, greetings
- **Claim type:** etiquette · authority: medium · specificity: explicit · verified: no

> Metadata lives in `akan-sources/manifest.json`. Both files were provided by the
> project owner; they are the entire curated knowledge base for this MVP — a
> deliberate demo constraint, not the whole of Asante culture. Both are tagged
> **provisional** until the owner re-tags them against their originals.

## Corpus details

- Two whole-file chunks (~2.5 KB total, ~130 terms after tokenizing).
- Ingest normalizes glyphs so OCR-style characters match their intended letters:
  ⊃/ↄ → ɔ, Ɛ/Ɔ → ɛ/ɔ, NBSP → space, collapses runs of whitespace.
- TF-IDF ranking works as a fallback when no OpenAI key is present; embeddings are
  added when `OPENAI_API_KEY` is set.

## Indexing

- `npm run ingest` — extract text from `akan-sources/*.txt` (+ `.pdf` if present),
  normalize, chunk, stamp manifest metadata, add OpenAI embeddings when the key is
  present, and write `lib/rag/index.json` (v3).
- The server loads `lib/rag/index.json` at request time. If it is missing, the first
  request triggers an automatic re-ingest so the demo never breaks.

## Retrieval

- `retrieveForDay(day, spec, k)` filters chunks by `lesson_days` / topics metadata
  first, then scores the query against chunk text and a provenance boost
  (authority + asante-specificity + verified).
- Day 1–7 content in `lib/rag/day.ts` is **deterministic and grounded**: phrases
  appear only if their tokens are found in the retrieved corpus (`hasTokens` gating),
  so a missing source quietly shrinks a lesson instead of inventing content.

## Provenance rules

1. Every AI answer and every day view returns source references (title, page where
   known, authority, specificity, verified flag) rendered under **Sources**.
2. Unverified material is flagged inline and with an "Unverified account" badge —
   including the Day 4 composed story (`verified: false`).
3. If retrieval cannot support a claim, the content says so plainly and the schedule
   is kept honest rather than padded with fabrication.
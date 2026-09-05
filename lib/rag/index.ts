import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { cache } from "react";
import type { CulturalProfile, Interest, RagChunk, RagIndex } from "@/lib/types";
import {
  buildVocabulary,
  cosineSimilarity,
  tokenize,
  vectorize,
} from "./tfidf.mjs";

const INDEX_PATH = join(process.cwd(), "lib", "rag", "index.json");

/** Empty index used when no index file exists yet — lets the app answer in
 *  demo mode rather than throwing a 500 while the index is being built. */
const EMPTY_INDEX: RagIndex = {
  version: 2,
  vocabulary: [],
  idf: [],
  documents: [],
};

async function spawnIngest(): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn(process.execPath, ["scripts/ingest.mjs"], {
      cwd: process.cwd(),
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("exit", () => resolve());
    child.once("error", () => resolve());
  });
}

interface QueryResult {
  chunk: RagChunk;
  score: number;
}

const INTEREST_KEYWORDS: Record<Interest, string> = {
  stories: "stories story oral tradition folktale myth folktales",
  proverbs: "proverbs proverb wisdom speech sayings",
  names: "names naming name day birth names kinship",
  traditions: "traditions ceremony festival rites ritual custom adae",
  history: "history origins prehistory state formation past gold coast asante",
  language: "language twi fante akan language words asante",
};

let cachedIndex: RagIndex | null = null;
let indexPromise: Promise<void> | null = null;

/** Load the on-disk index; never throws — returns an empty index on read/parse
 *  failures so callers can fall back to demo mode instead of producing a 500. */
function loadIndex(): RagIndex {
  try {
    if (!existsSync(INDEX_PATH)) return EMPTY_INDEX;
    return parseIndex(readFileSync(INDEX_PATH, "utf8"));
  } catch {
    return EMPTY_INDEX;
  }
}

/** Kick off an async index rebuild exactly once per process. Does not block. */
function ensureIndexInBackground(): void {
  if (indexPromise) return;
  indexPromise = spawnIngest().finally(() => {
    indexPromise = null;
    cachedIndex = loadIndex();
  });
}

/** Index documents when instantiated — Nov 2024 journal + 2015 review. */
function parseIndex(raw: string): RagIndex {
  const data = JSON.parse(raw) as {
    version: number;
    vocabulary: string[];
    idf: number[];
    documents: (Omit<RagChunk, "vector"> & { vector: [number, number][] })[];
  };
  return {
    version: data.version,
    vocabulary: data.vocabulary,
    idf: data.idf,
    documents: data.documents.map(
      ({ id, sourceId, sourceTitle, page, text, tokens, vector }) => ({
        id,
        sourceId,
        sourceTitle,
        page,
        text,
        tokens,
        ...(vector ? { vector } : {}),
      }),
    ),
  };
}

/** Best-effort load of the index. Never blocks and never throws: if the index
 *  file is missing or unreadable, an empty index is returned and a rebuild is
 *  kicked off in the background (serialized, once per process). Requests
 *  served while the first build runs answer in demo mode instead of 500ing. */
function ensureIndex(): RagIndex {
  if (cachedIndex) return cachedIndex;
  if (!existsSync(INDEX_PATH)) ensureIndexInBackground();
  cachedIndex = loadIndex();
  return cachedIndex;
}

export function getIndex(): RagIndex {
  return ensureIndex();
}

export function interestKeywords(interests: Interest[]): string {
  return interests.map((i) => INTEREST_KEYWORDS[i] ?? "").join(" ");
}

/**
 * Retrieve the top-k chunks most relevant to a query, lightly personalised
 * by the learner's selected interests. Uses TF-IDF cosine similarity.
 */
export async function retrieve(
  query: string,
  profile: CulturalProfile,
  k = 6,
): Promise<QueryResult[]> {
  const index = ensureIndex();

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  if (index.embedding?.provider === "openai") {
    return retrieveWithOpenAI(query, index, k, queryTokens);
  }

  const enriched = [...queryTokens, ...tokenize(interestKeywords(profile.interests))];
  const vocab = new Map(index.vocabulary.map((t, i) => [t, i]));
  const qVector = vectorize(enriched, vocab, index.idf);

  const scored = index.documents.map((chunk) => ({
    chunk,
    score: cosineSimilarity(qVector, chunk.vector as [number, number][]),
  }));

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function retrieveWithOpenAI(
  query: string,
  index: RagIndex,
  k: number,
  _queryTokens: string[],
): Promise<QueryResult[]> {
  const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_EMBEDDING_KEY;
  if (!key) return hitByTokens(index, tokenize(query), k);

  const model = index.embedding?.model ?? "text-embedding-3-small";
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: query }),
    });
    if (!res.ok) return hitByTokens(index, tokenize(query), k);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    const q = json.data[0].embedding;
    const scored = index.documents.map((chunk) => {
      const doc = chunk.openai as number[] | undefined;
      return { chunk, score: doc ? cosine(q, doc) : 0 };
    });
    return scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  } catch {
    return hitByTokens(index, tokenize(query), k);
  }
}

function hitByTokens(
  index: RagIndex,
  queryTokens: string[],
  k: number,
): QueryResult[] {
  const vocab = new Map(index.vocabulary.map((t, i) => [t, i]));
  const q = vectorize(queryTokens, vocab, index.idf);
  return index.documents
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(q, chunk.vector as [number, number][]),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** React-cached index for server components. */
export const getIndexCached = cache(() => ensureIndex());
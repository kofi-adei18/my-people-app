import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { cache } from "react";
import type {
  AsanteSpecificity,
  AuthorityLevel,
  ClaimType,
  RagChunk,
  RagIndex,
} from "@/lib/types";
import {
  cosineSimilarity,
  tokenize,
  vectorize,
} from "./tfidf.mjs";

const INDEX_PATH = join(process.cwd(), "lib", "rag", "index.json");

/** Empty index used when no index file exists yet — lets the app answer in
 *  demo mode rather than throwing a 500 while the index is being built. */
const EMPTY_INDEX: RagIndex = {
  version: 3,
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

/** Parse index.json v3 (metadata per chunk); tolerates legacy v2 entries. */
function parseIndex(raw: string): RagIndex {
  const data = JSON.parse(raw) as {
    version: number;
    vocabulary: string[];
    idf: number[];
    documents: RagChunk[];
    embedding?: RagIndex["embedding"];
  };
  return {
    version: data.version,
    vocabulary: data.vocabulary,
    idf: data.idf,
    documents: data.documents.map(
      ({ id, sourceId, sourceTitle, page, text, tokens, vector, openai, meta }) => ({
        id,
        sourceId,
        sourceTitle,
        ...(page !== undefined ? { page } : {}),
        text,
        tokens,
        ...(meta ? { meta } : {}),
        ...(vector ? { vector } : {}),
        ...(openai ? { openai } : {}),
      }),
    ),
    ...(data.embedding ? { embedding: data.embedding } : {}),
  };
}

/** Best-effort load of the index. Never blocks and never throws: if the index
 *  file is missing or unreadable, an empty index is returned and a rebuild is
 *  kicked off in the background (serialized, once per process). */
function ensureIndex(): RagIndex {
  if (cachedIndex) return cachedIndex;
  if (!existsSync(INDEX_PATH)) ensureIndexInBackground();
  cachedIndex = loadIndex();
  return cachedIndex;
}

export function getIndex(): RagIndex {
  return ensureIndex();
}

// ─── Retrieval filters (spec §18, §19, §20) ───────────────────────────────────

export interface RetrievalFilters {
  /** At least one shared topic with the chunk. */
  topics?: string[];
  /** At least one shared journey day. */
  lessonDays?: number[];
  claimTypes?: ClaimType[];
  contentTypes?: string[];
}

const AUTHORITY_BOOST: Record<AuthorityLevel, number> = { high: 0.2, medium: 0.1, low: 0 };
const SPECIFICITY_BOOST: Record<AsanteSpecificity, number> = {
  explicit: 0.3,
  Akan_general: 0.15,
  Ghana_general: 0,
};

function matchesFilters(chunk: RagChunk, filters: RetrievalFilters): boolean {
  const meta = chunk.meta;
  if (!meta) return false;
  if (filters.topics && filters.topics.length > 0) {
    if (!meta.topic.some((t) => filters.topics!.includes(t))) return false;
  }
  if (filters.lessonDays && filters.lessonDays.length > 0) {
    if (!meta.lesson_days.some((d) => filters.lessonDays!.includes(d))) {
      return false;
    }
  }
  if (filters.claimTypes && filters.claimTypes.length > 0) {
    if (!filters.claimTypes.includes(meta.claim_type)) return false;
  }
  if (filters.contentTypes && filters.contentTypes.length > 0) {
    if (!meta.content_type.some((c) => filters.contentTypes!.includes(c))) {
      return false;
    }
  }
  return true;
}

function provenanceBoost(chunk: RagChunk): number {
  const meta = chunk.meta;
  if (!meta) return 0;
  return (
    AUTHORITY_BOOST[meta.authority_level] + SPECIFICITY_BOOST[meta.asante_specificity]
  );
}

/** TF-IDF-only ranking over a pre-filtered pool. The OpenAI path lives in
 *  `retrieve` (it needs the async embedding call). */
function rank(chunks: RagChunk[], queryText: string, k: number): QueryResult[] {
  const index = ensureIndex();
  const qTokens = tokenize(queryText);
  const vocab = new Map(index.vocabulary.map((t, i) => [t, i]));
  const qVector = vectorize(qTokens, vocab, index.idf);

  return chunks
    .map((chunk) => ({
      chunk,
      score:
        cosineSimilarity(qVector, chunk.vector as [number, number][]) +
        provenanceBoost(chunk),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function embedOnce(query: string, model: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_EMBEDDING_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: query }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data[0].embedding;
  } catch {
    return null;
  }
}

/** Synchronous cosine between two dense vectors. */
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
export async function retrieve(
  query: string,
  filters: RetrievalFilters = {},
  k = 6,
): Promise<QueryResult[]> {
  const index = ensureIndex();
  const pool = filters.topics?.length || filters.lessonDays?.length
    ? index.documents.filter((c) => matchesFilters(c, filters))
    : index.documents;

  if (pool.length === 0) return [];

  if (index.embedding?.provider === "openai") {
    const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_EMBEDDING_KEY;
    if (key) {
      const qv = await embedOnce(query, index.embedding?.model ?? "text-embedding-3-small");
      if (qv) {
        const scored = pool.map((chunk) => ({
          chunk,
          score:
            (chunk.openai ? cosine(qv, chunk.openai) : 0) + provenanceBoost(chunk),
        }));
        return scored
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, k);
      }
    }
  }

  return rank(pool, query, k);
}

/** Retrieve for a specific journey day using its retrieval spec. */
export async function retrieveForDay(
  day: number,
  spec: { topics: string[]; lessonDays: number[]; contentTypes?: string[]; claimTypes?: ClaimType[] },
  k = 6,
): Promise<QueryResult[]> {
  const query = [
    "asante twi",
    ...spec.topics,
    `day ${day}`,
    "greetings respect politeness elder",
  ].join(" ");
  return retrieve(
    query,
    {
      topics: spec.topics,
      lessonDays: spec.lessonDays,
      contentTypes: spec.contentTypes,
      claimTypes: spec.claimTypes,
    },
    k,
  );
}
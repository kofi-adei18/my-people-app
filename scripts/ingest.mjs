// My People — knowledge base ingestion.
//
// Reads all source documents in akan-sources/ (plain-text `.txt` and `.pdf`),
// normalizes Akan orthography artifacts, chunks them, computes TF-IDF vectors
// (plus optional OpenAI embeddings), stamps each chunk with provenance
// metadata from the manifest (spec §20), and writes lib/rag/index.json — the
// file the server reads at runtime.
//
//   node scripts/ingest.mjs            # full ingest
//   node scripts/ingest.mjs --meta     # print source preview only (no index)
//
// Env:
//   OPENAI_API_KEY or OPENAI_EMBEDDING_KEY  enables OpenAI embeddings
//   OPENAI_EMBEDDING_MODEL                   default text-embedding-3-small
//   RAG_TARGET_TOKENS                        chunk target (default 420)

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tokenize, buildVocabulary, vectorize } from "../lib/rag/tfidf.mjs";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local loader — `node scripts/ingest.mjs` does not run inside
// Next.js, which normally injects env vars. Only fills vars that are unset.
{
  const envPath = join(root, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const standardFontsDir = join(
  dirname(require.resolve("pdfjs-dist/package.json")),
  "standard_fonts",
);
const STANDARD_FONT_DATA_URL = pathToFileURL(standardFontsDir + "/").href;
const sourcesDir = join(root, "akan-sources");
const manifestPath = join(sourcesDir, "manifest.json");
const outPath = join(root, "lib", "rag", "index.json");

const TARGET_TOKENS = Number(process.env.RAG_TARGET_TOKENS ?? 420);
const MIN_TOKENS = 120;

function log(...args) {
  console.log("[ingest]", ...args);
}

// ─── Text normalization ────────────────────────────────────────────────────────

const GLYPH_FIXES = [
  [/\u2283/g, "ɔ"], // ⊃ (super-set) → ɔ  ['Ɔpanyin' artifact]
  [/\u2184/g, "ɔ"], // ↄ (reversed-c) → ɔ
  [/\u0190/g, "ɛ"], // Ɛ (capital open e) → ɛ
  [/\u0186/g, "ɔ"], // Ɔ (capital open o) → ɔ
  [/\u00a0/g, " "], // non-breaking spaces
  [/[ \t]+/g, " "],
  [/\n{3,}/g, "\n\n"],
];

function normalizeAkan(text) {
  let out = String(text);
  for (const [re, repl] of GLYPH_FIXES) out = out.replace(re, repl);
  return out.trim();
}

// ─── PDF helpers (reused from the PDF-era ingester) ───────────────────────────

async function loadPdf() {
  const { getDocument, GlobalWorkerOptions } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );
  if (!GlobalWorkerOptions.workerSrc) {
    try {
      GlobalWorkerOptions.workerSrc = require.resolve(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
      );
    } catch {
      /* main-thread extraction still works when no worker can be located */
    }
  }
  return getDocument;
}

async function extractPdf(getDocument, filePath) {
  const data = new Uint8Array(readFileSync(filePath));
  const loadingTask = getDocument({
    data,
    isEvalSupported: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  });
  const pdf = await loadingTask.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push({ n: i, text: normalizeAkan(text) });
  }
  await loadingTask.destroy().catch(() => {});
  return pages;
}

// ─── Chunking ──────────────────────────────────────────────────────────────────

/** Split one text blob into paragraphs (blank-line separated). */
function paragraphsFrom(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

/**
 * Chunk a sequence of { page, paragraphs } into token-sized blocks.
 * Mirrors the previous PDF-era buffer logic so chunking stays stable.
 */
function chunkBlocks(pagesWithParagraphs) {
  const chunks = [];
  let buffer = [];
  let words = 0;
  let lastPage = pagesWithParagraphs[0]?.page ?? 1;

  const flush = () => {
    if (!buffer.length) return;
    const text = buffer.join(" ");
    chunks.push({ text, page: lastPage, tokens: tokenize(text).length });
    buffer = [];
    words = 0;
  };

  const push = (para, page) => {
    const count = para.split(/\s+/).length;
    if (count > TARGET_TOKENS * 2.5) {
      for (const piece of para.match(/[^.!?]+[.!?]+|\S+$/g) ?? [para]) {
        const pc = piece.split(/\s+/).length;
        if (words + pc > TARGET_TOKENS && words >= MIN_TOKENS) {
          flush();
          lastPage = page;
        }
        buffer.push(piece.trim());
        words += pc;
      }
    } else {
      if (words + count > TARGET_TOKENS && words >= MIN_TOKENS) {
        flush();
        lastPage = page;
      }
      buffer.push(para);
      words += count;
    }
  };

  for (const { page, paragraphs } of pagesWithParagraphs) {
    for (const para of paragraphs) push(para, page);
    if (words >= TARGET_TOKENS * 1.4) flush();
  }
  flush();
  return chunks;
}

// ─── Manifest metadata ─────────────────────────────────────────────────────────

function inferClaimType(src) {
  const topics = src.topic ?? [];
  if (topics.includes("history")) return "history";
  if (
    topics.some((t) => ["etiquette", "politeness", "respect", "behavior"].includes(t))
  ) {
    return "etiquette";
  }
  if ((src.content_type ?? []).includes("language")) return "language";
  return "tradition";
}

function deriveConfidence(src) {
  const lvl = src.authority_level ?? "low";
  if (src.verified) return lvl;
  // Unverified: downgrade high → medium, keep medium/low.
  return lvl === "high" ? "medium" : lvl;
}

function chunkMetaFor(src) {
  return {
    source_url: src.url && src.url.trim() ? src.url.trim() : undefined,
    source_type: src.source_type ?? "cultural",
    cultural_group: src.cultural_group ?? [],
    language: src.language ?? [],
    country: src.country ?? "Ghana",
    topic: src.topic ?? [],
    lesson_days: src.lesson_days ?? [],
    content_type: src.content_type ?? [],
    authority_level: src.authority_level ?? "low",
    asante_specificity: src.asante_specificity ?? "Ghana_general",
    claim_type: src.claim_type ?? inferClaimType(src),
    confidence: deriveConfidence(src),
    verified: src.verified ?? false,
  };
}

// ─── Embeddings ─────────────────────────────────────────────────────────────────

async function openaiEmbedTexts(texts) {
  const key =
    process.env.OPENAI_API_KEY ??
    process.env.OPENAI_EMBEDDING_KEY ??
    "";
  if (!key) return null;
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const out = [];
  const BATCH = 96;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: batch }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    out.push(...json.data.map((d) => d.embedding));
  }
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const metaOnly = process.argv.includes("--meta");
  const getDocument = metaOnly ? null : await loadPdf();

  const files = readdirSync(sourcesDir)
    .filter((f) => /\.(txt|pdf)$/i.test(f))
    .sort();

  log(`found ${files.length} source file(s)`);

  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { sources: [] };
  const byFile = new Map((manifest.sources ?? []).map((s) => [s.file, s]));

  const allTokens = [];
  const docs = [];
  const previews = [];

  for (const file of files) {
    const src = byFile.get(file);
    if (!src) {
      log(`  ⚠ no manifest entry for "${file}" — skipping`);
      continue;
    }
    const path = join(sourcesDir, file);
    const ext = extname(file).toLowerCase();

    let pagesWithParagraphs;
    let preview;
    if (ext === ".pdf") {
      const pages = await extractPdf(getDocument, path);
      pagesWithParagraphs = pages.map(({ n, text }) => ({
        page: n,
        paragraphs: paragraphsFrom(text),
      }));
      preview = pages[1]?.text?.slice(0, 300) ?? "";
    } else {
      const text = normalizeAkan(readFileSync(path, "utf8"));
      preview = text.slice(0, 300);
      pagesWithParagraphs = [{ page: 1, paragraphs: paragraphsFrom(text) }];
    }

    previews.push({ file, first: preview });
    log(`[${file.slice(0, 48)}…] ${src.title}`);

    const chunks = chunkBlocks(pagesWithParagraphs);
    log(`  → ${chunks.length} chunk(s)`);

    const meta = chunkMetaFor(src);
    allTokens.push(...chunks.map((c) => tokenize(c.text)));
    docs.push(
      ...chunks.map((c, i) => ({
        id: `${src.source_id ?? src.id}:${i}`,
        sourceId: src.source_id ?? src.id,
        sourceTitle: src.title,
        page: c.page,
        text: c.text,
        tokens: c.tokens,
        meta,
      })),
    );
  }

  if (metaOnly) {
    for (const p of previews) {
      console.log("-----", p.file, "-----");
      console.log(p.first);
    }
    return;
  }

  if (!docs.length) {
    console.error(
      "No documents to index (missing manifest entries?). Run `node scripts/ingest.mjs --meta` first.",
    );
    process.exit(1);
  }

  const { vocabulary, idf, index } = buildVocabulary(allTokens);
  const documents = docs.map((d) => ({
    ...d,
    vector: vectorize(tokenize(d.text), index, idf),
  }));

  const indexFile = {
    version: 3,
    vocabulary,
    idf,
    documents,
    embedding: { provider: "tfidf" },
    builtAt: new Date().toISOString(),
  };

  if (process.env.OPENAI_API_KEY || process.env.OPENAI_EMBEDDING_KEY) {
    log("OpenAI key present — adding embedding vectors…");
    try {
      const vectors = await openaiEmbedTexts(documents.map((d) => d.text));
      if (vectors) {
        indexFile.embedding = {
          provider: "openai",
          model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
          dimensions: vectors[0].length,
        };
        documents.forEach((d, i) => (d.openai = vectors[i]));
        log(`embedded ${vectors.length} chunks`);
      }
    } catch (err) {
      log(`OpenAI embedding failed (${err.message}) — index stays TF-IDF.`);
    }
  }

  writeFileSync(outPath, JSON.stringify(indexFile));
  log(
    `wrote ${outPath} (${documents.length} chunks, ${vocabulary.length} terms, ${indexFile.embedding.provider})`,
  );
  log("metadata tags per chunk:");
  for (const d of documents) {
    const m = d.meta;
    log(`  - ${d.sourceTitle}: ${m.topic.join("/")} · days ${m.lesson_days.join(",")} · ${m.claim_type} · ${m.authority_level} · ${m.asante_specificity}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
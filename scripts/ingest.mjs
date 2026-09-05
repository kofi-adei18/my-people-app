// My People — knowledge base ingestion.
//
// Extracts text from the two source PDFs in akan-sources/, chunks it,
// computes TF-IDF vectors (plus optional OpenAI embeddings), and writes
// lib/rag/index.json — the file the server reads at runtime.
//
//   node scripts/ingest.mjs            # full ingest
//   node scripts/ingest.mjs --meta     # print PDF metadata only (no index)
//
// Env:
//   OPENAI_API_KEY or OPENAI_EMBEDDING_KEY  enables OpenAI embeddings
//   OPENAI_EMBEDDING_MODEL                   default text-embedding-3-small
//   RAG_TARGET_TOKENS                        chunk target (default 420)

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tokenize, buildVocabulary, vectorize } from "../lib/rag/tfidf.mjs";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  const meta = await pdf.getMetadata().catch(() => ({ info: {} }));
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push({ n: i, text: cleanText(text) });
  }
  await loadingTask.destroy().catch(() => {});
  return { meta: meta.info ?? {}, pages };
}

function cleanText(text) {
  return text
    .replace(/([a-z])-\s*\n\s*([a-z])/gi, "$1$2") // joined hyphenated wraps
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkPages(pages) {
  const chunks = [];
  let buffer = [];
  let words = 0;
  let lastPage = 1;

  const flush = () => {
    if (!buffer.length) return;
    const text = buffer.join(" ");
    chunks.push({ text, page: lastPage, tokens: tokenize(text).length });
    buffer = [];
    words = 0;
  };

  for (const { n, text } of pages) {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const para of paragraphs) {
      const count = para.split(/\s+/).length;
      if (count > TARGET_TOKENS * 2.5) {
        // Oversized paragraph (likely a page header blob) — split by sentence-ish breaks.
        for (const piece of para.match(/[^.!?]+[.!?]+|\S+$/g) ?? [para]) {
          const pc = piece.split(/\s+/).length;
          if (words + pc > TARGET_TOKENS && words >= MIN_TOKENS) {
            flush();
            lastPage = n;
          }
          buffer.push(piece.trim());
          words += pc;
        }
      } else {
        if (words + count > TARGET_TOKENS && words >= MIN_TOKENS) {
          flush();
          lastPage = n;
        }
        buffer.push(para);
        words += count;
      }
    }
    if (words >= TARGET_TOKENS * 1.4) flush();
  }
  flush();
  return chunks;
}

async function openaiEmbedTexts(texts) {
  const key =
    process.env.OPENAI_API_KEY ??
    process.env.OPENAI_EMBEDDING_KEY ??
    "";
  if (!key) {
    return null;
  }
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

async function main() {
  const metaOnly = process.argv.includes("--meta");
  const getDocument = await loadPdf();

  const pdfs = readdirSync(sourcesDir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();

  log(`found ${pdfs.length} PDF(s)`);

  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : null;
  const byFile = new Map((manifest?.sources ?? []).map((s) => [s.file, s]));

  const allTokens = [];
  const docs = [];
  const pagePreview = [];

  for (const file of pdfs) {
    const { meta, pages } = await extractPdf(getDocument, join(sourcesDir, file));
    infoFor(meta).forEach((kv) => log(`[${file.slice(0, 42)}…] ${kv}`));
    pagePreview.push({ file, first: pages[0]?.text.slice(0, 300) ?? "" });

    const src = byFile.get(file);
    if (!src) {
      log(`  ⚠ no manifest entry for "${file}" — skipping chunks`);
      continue;
    }
    const chunks = chunkPages(pages);
    log(`  → ${chunks.length} chunks from ${pages.length} pages`);
    allTokens.push(...chunks.map((c) => tokenize(c.text)));
    docs.push(
      ...chunks.map((c, i) => ({
        id: `${src.id}:${i}`,
        sourceId: src.id,
        sourceTitle: src.title,
        page: c.page,
        text: c.text,
        tokens: c.tokens,
      })),
    );
  }

  if (metaOnly) {
    for (const p of pagePreview) {
      console.log("-----", p.file, "-----");
      console.log(p.first);
    }
    return;
  }

  if (!docs.length) {
    console.error("No documents to index (missing manifest?). Run --meta first.");
    process.exit(1);
  }

  const { vocabulary, idf, index } = buildVocabulary(allTokens);
  const documents = docs.map((d) => ({
    ...d,
    vector: vectorize(tokenize(d.text), index, idf),
  }));

  const indexFile = {
    version: 2,
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
}

function infoFor(info) {
  const pick = ["Title", "Author", "Subject", "Producer", "PDFFormatVersion"];
  const out = [];
  for (const k of pick) {
    const v = info[k];
    if (v && typeof v === "string" && v.trim()) out.push(`${k}: ${v}`);
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
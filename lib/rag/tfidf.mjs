/**
 * Minimal TF-IDF vector space for the My People RAG retriever.
 *
 * Shared by the ingestion script (builds the index) and the server
 * (queries it). Pure ESM with zero dependencies so it runs in Node,
 * in `next dev`, and in `next start` alike.
 *
 * Vectors are sparse arrays of [vocabIndex, weight] pairs.
 */

const STOPWORDS = new Set(
  `a an and are as at be been but by can could did do does done for from had has have he her his how i if in into is it its just may me more most my no not of on or our over so some such than that the their them then there these they this those through to too under up upon us was we were what when where which while who whom why will with would you your`
    .split(/\s+/),
);

/**
 * Akan-or-fiw vocab classes: the classic Latin set plus the open vowels
 * ɛ (U+025B) and ɔ (U+0254) used in Asante Twi orthography. Uppercase Ɛ/Ɔ
 * lower via String.toLowerCase() before matching.
 */
const AKAN_CHARS = "a-z\u00dc\u00e4\u00f6\u00eb\u00ef\u00fc\u025b\u0254";

/** Tokenize + lightly stem. Lowercase, drop stops/numbers/punct. */
export function tokenize(text) {
  const matches = String(text)
    .toLowerCase()
    .match(new RegExp(`[${AKAN_CHARS}][${AKAN_CHARS}'-]*`, "g"));
  const out = [];
  for (const raw of matches ?? []) {
    let t = raw.replace(/^'+|'+$/g, "");
    if (t.endsWith("ing") && t.length > 5) t = t.slice(0, -3);
    else if (t.endsWith("ed") && t.length > 4) t = t.slice(0, -2);
    else if (t.endsWith("s") && !t.endsWith("ss") && t.length > 3)
      t = t.slice(0, -1);
    if (t.length < 3 || STOPWORDS.has(t)) continue;
    out.push(t);
  }
  return out;
}

function idfFor(numDocs, docFreq) {
  return Math.log((1 + numDocs) / (1 + docFreq)) + 1;
}

/**
 * Build vocabulary + IDF weights over the whole corpus.
 * corpusTokens: array of token arrays, one per document.
 */
export function buildVocabulary(corpusTokens) {
  const docFreq = new Map();
  for (const tokens of corpusTokens) {
    for (const t of new Set(tokens)) {
      docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
    }
  }
  const vocabulary = [...docFreq.keys()].sort();
  const idf = vocabulary.map((t) => idfFor(corpusTokens.length, docFreq.get(t)));
  const index = new Map(vocabulary.map((t, i) => [t, i]));
  return { vocabulary, idf, index };
}

/** Sparse vector for one document: [vocabIndex, weight][] with weight = tf*idf. */
export function vectorize(tokens, index, idf) {
  if (!tokens.length) return [];
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const n = tokens.length;
  const vec = new Map();
  for (const [t, c] of counts) {
    const i = index.get(t);
    if (i !== undefined) vec.set(i, (c / n) * idf[i]);
  }
  return [...vec.entries()].sort((a, b) => a[0] - b[0]);
}

/** Cosine similarity between two sparse arrays ([idx, val][]). */
export function cosineSimilarity(a, b) {
  if (!a.length || !b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, v] of a) na += v * v;
  for (const [, v] of b) nb += v * v;
  if (!na || !nb) return 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ia = a[i][0];
    const ib = b[j][0];
    if (ia === ib) {
      dot += a[i][1] * b[j][1];
      i++;
      j++;
    } else if (ia < ib) i++;
    else j++;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
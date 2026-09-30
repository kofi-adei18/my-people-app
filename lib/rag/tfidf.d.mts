export function tokenize(text: string): string[];

export interface Vocabulary {
  vocabulary: string[];
  idf: number[];
  index: Map<string, number>;
}

export function buildVocabulary(corpusTokens: string[][]): Vocabulary;

export function vectorize(
  tokens: string[],
  index: Map<string, number>,
  idf: number[],
): [number, number][];

export function cosineSimilarity(
  a: [number, number][],
  b: [number, number][],
): number;
export type Heritage = "Akan";

export type Language =
  | "Twi"
  | "Fante"
  | "English / Learning Twi"
  | "Other";

/** Stored as lowercase keys; labels live in @/lib/constants */
export type KnowledgeLevel = "beginner" | "some" | "familiar";

export type Interest =
  | "stories"
  | "proverbs"
  | "names"
  | "traditions"
  | "history"
  | "language";

export interface CulturalProfile {
  heritage: Heritage;
  language: Language;
  knowledgeLevel: KnowledgeLevel;
  interests: Interest[];
}

export interface SourceReference {
  /** Title from the source manifest (shows in the Sources section) */
  title: string;
  /** 1-based source page when known */
  page?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  sources?: SourceReference[];
  mode?: "rag" | "demo";
  suggested?: string[];
}

export interface LessonQuiz {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  slug: string;
  title: string;
  description: string;
}

export interface LessonContent {
  slug: string;
  title: string;
  intro: string;
  keyIdeas: string[];
  example: string;
  meaningForYou: string;
  quiz: LessonQuiz;
  sources: SourceReference[];
  mode: "rag" | "demo";
}

export interface RagChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  page: number;
  text: string;
  tokens: number;
  /** TF-IDF sparse vector [vocabIndex, weight][] (present in the index file). */
  vector?: [number, number][];
  /** OpenAI embedding vector, present only when ingestion used OpenAI. */
  openai?: number[];
}

export interface RagIndex {
  version: number;
  vocabulary: string[];
  idf: number[];
  documents: RagChunk[];
  embedding?: {
    provider: "tfidf" | "openai";
    model?: string;
    dimensions?: number;
  };
}
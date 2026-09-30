// My People — family loop domain types.
//
// This mirrors the planned Supabase/Postgres schema 1:1 (users,
// family_questions → threads+messages, family_stories, family_knowledge) so
// swapping the local JSON store for a real database later is a drop-in change.

export type FamilyRole = "child" | "relative";

/** Who sent a chat message inside a family thread. */
export type MessageSender = "child" | "relative";

export interface FamilyUser {
  id: string;
  name: string;
  role: FamilyRole;
  /** "Dad", "Mum", "Grandmother"… */
  relation: string;
  connected: boolean;
}

export interface FamilyThread {
  id: string;
  userId: string;
  recipientId: string;
  createdAt: number;
}

export interface FamilyMessage {
  id: string;
  threadId: string;
  sender: MessageSender;
  text: string;
  /** Present when the relative answered by voice. */
  audioId?: string;
  /** True once the AI has separated this answer into family story(ies). */
  extracted: boolean;
  createdAt: number;
}

export interface FamilyStory {
  id: string;
  threadId: string;
  messageIds: string[];
  title: string;
  /** The AI-cleaned, preserved story. */
  story: string;
  /** The verbatim raw answer from the family member. */
  transcript: string;
  /** Present when the answer was given by voice. */
  audioId?: string;
  speaker: string;
  topics: string[];
  people: string[];
  places: string[];
  traditions: string[];
  languages: string[];
  /** Names mentioned with their meanings, e.g. "Kwame — Saturday-born". */
  names: string[];
  createdAt: number;
  seeded?: boolean;
}

export interface FamilyKnowledge {
  familyId: string;
  origins: string[];
  languages: string[];
  traditions: string[];
  names: string[];
  people: string[];
}

export interface FamilyData {
  users: FamilyUser[];
  threads: FamilyThread[];
  messages: FamilyMessage[];
  stories: FamilyStory[];
  knowledge: FamilyKnowledge;
}

/** Shape returned by GET/POST /api/family/thread. */
export interface ThreadPayload {
  threadId: string;
  recipient: FamilyUser;
  child: FamilyUser;
  relatives: FamilyUser[];
  messages: FamilyMessage[];
  /** messageId → story ids preserved from it (drives status chips). */
  storyIdsByMessage: Record<string, string[]>;
}

/** Story extraction result (raw LLM shape before ids are attached). */
export interface ExtractedStory {
  title: string;
  story: string;
  topics: string[];
  people: string[];
  places: string[];
  traditions: string[];
  languages: string[];
  names: string[];
}

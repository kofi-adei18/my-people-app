import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import type {
  FamilyData,
  FamilyKnowledge,
  FamilyMessage,
  FamilyStory,
  FamilyThread,
  FamilyUser,
} from "@/lib/family/types";
import { buildSeedFamily, SEED_IDS } from "@/lib/family/seed";
import { uid } from "@/lib/id";

// ─── Local JSON store ─────────────────────────────────────────────────────────
// Mirrors the planned Supabase tables (users, threads+messages, stories,
// knowledge). `data/` is gitignored; it is created from the seed on first
// request. Swapping to Supabase later means reimplementing this module only.

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "family.json");
const AUDIO_DIR = join(DATA_DIR, "audio");

function ensureDirs(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });
}

export function ensureSeed(): void {
  ensureDirs();
  if (!existsSync(DATA_FILE)) {
    atomicWrite(buildSeedFamily());
  }
}

function atomicWrite(data: FamilyData): void {
  ensureDirs();
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, DATA_FILE);
}

// Mutations are synchronous (read-modify-write) so request handlers always see
// a consistent file. Good enough for a local demo store.

export function readFamily(): FamilyData {
  ensureSeed();
  return JSON.parse(readFileSync(DATA_FILE, "utf8")) as FamilyData;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function users(): FamilyUser[] {
  return readFamily().users;
}

export function relativeUsers(): FamilyUser[] {
  return users().filter((u) => u.role === "relative" && u.connected);
}

export function childUser(): FamilyUser {
  return readFamily().users.find((u) => u.role === "child") ?? users()[0];
}

// ─── Threads & messages ───────────────────────────────────────────────────────

export function threadFor(recipientId: string): FamilyThread {
  const data = readFamily();
  const existing = data.threads.find((t) => t.recipientId === recipientId);
  if (existing) return existing;
  const thread: FamilyThread = {
    id: uid("thread"),
    userId: childUser().id,
    recipientId,
    createdAt: Date.now(),
  };
  data.threads.push(thread);
  atomicWrite(data);
  return thread;
}

export function messagesFor(threadId: string): FamilyMessage[] {
  return readFamily().messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function appendMessage(
  message: Omit<FamilyMessage, "id" | "createdAt"> & { id?: string },
): FamilyMessage {
  const data = readFamily();
  const full: FamilyMessage = {
    id: message.id ?? uid("msg"),
    createdAt: Date.now(),
    ...message,
  };
  data.messages.push(full);
  atomicWrite(data);
  return full;
}

/** Relative messages in a thread the AI has not turned into stories yet. */
export function pendingRelativeMessages(threadId: string): FamilyMessage[] {
  return messagesFor(threadId).filter(
    (m) => m.sender === "relative" && !m.extracted,
  );
}

export function markMessagesExtracted(ids: string[]): void {
  if (ids.length === 0) return;
  const data = readFamily();
  for (const m of data.messages) {
    if (ids.includes(m.id)) m.extracted = true;
  }
  atomicWrite(data);
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export function storiesFor(threadId?: string): FamilyStory[] {
  const all = readFamily().stories;
  const list = threadId ? all.filter((s) => s.threadId === threadId) : all;
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export function storyById(id: string): FamilyStory | undefined {
  return readFamily().stories.find((s) => s.id === id);
}

export function saveStories(
  newStories: Array<
    Omit<
      FamilyStory,
      "id" | "threadId" | "messageIds" | "createdAt" | "seeded"
    > & { messageIds: string[]; threadId: string }
  >,
): FamilyStory[] {
  const data = readFamily();
  const saved = newStories.map((s) => ({
    id: uid("story"),
    createdAt: Date.now(),
    ...s,
  }));
  data.stories.push(...saved);
  for (const story of saved) mergeKnowledge(data.knowledge, story);
  atomicWrite(data);
  return saved;
}

// ─── Family knowledge (derived from real stories — never invented) ───────────

function mergeKnowledge(knowledge: FamilyKnowledge, story: FamilyStory): void {
  const push = (list: string[], value?: string) => {
    if (!value?.trim()) return;
    const trimmed = value.trim();
    if (!list.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      list.unshift(trimmed);
    }
  };
  for (const place of story.places) push(knowledge.origins, place);
  for (const language of story.languages) push(knowledge.languages, language);
  for (const tradition of story.traditions) push(knowledge.traditions, tradition);
  for (const name of story.names) push(knowledge.names, name);
  for (const person of story.people) push(knowledge.people, person);
}

export function knowledge(): FamilyKnowledge {
  return readFamily().knowledge;
}

export { AUDIO_DIR, SEED_IDS };

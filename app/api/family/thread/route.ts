import { NextRequest, NextResponse } from "next/server";
import {
  appendMessage,
  childUser,
  markMessagesExtracted,
  messagesFor,
  pendingRelativeMessages,
  readFamily,
  relativeUsers,
  saveStories,
  threadFor,
  users,
} from "@/lib/family/store";
import { extractStories } from "@/lib/family/ai";
import type { FamilyMessage, FamilyUser } from "@/lib/family/types";

export const runtime = "nodejs";

interface ThreadPayload {
  threadId: string;
  recipient: FamilyUser;
  child: FamilyUser;
  relatives: FamilyUser[];
  messages: FamilyMessage[];
  storyIdsByMessage: Record<string, string[]>;
}

function payload(recipientId: string): ThreadPayload {
  const thread = threadFor(recipientId);
  const data = readFamily();
  const messages = messagesFor(thread.id);
  const storyIdsByMessage: Record<string, string[]> = {};
  for (const story of data.stories) {
    for (const id of story.messageIds) {
      storyIdsByMessage[id] = [...(storyIdsByMessage[id] ?? []), story.id];
    }
  }
  return {
    threadId: thread.id,
    recipient:
      users().find((u) => u.id === recipientId) ?? relativeUsers()[0],
    child: childUser(),
    relatives: relativeUsers(),
    messages,
    storyIdsByMessage,
  };
}

export async function GET(req: NextRequest) {
  const recipientId =
    req.nextUrl.searchParams.get("recipient") ?? relativeUsers()[0]?.id;
  if (!recipientId) {
    return NextResponse.json({ ok: false, error: "No connected relatives." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...payload(recipientId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      recipientId?: string;
      sender?: "child" | "relative";
      text?: string;
      audioId?: string;
    };
    const text = String(body.text ?? "").trim().slice(0, 4000);
    const sender = body.sender === "relative" ? "relative" : "child";
    if (!text) {
      return NextResponse.json({ ok: false, error: "Message is empty." }, { status: 400 });
    }
    const recipientId = body.recipientId ?? relativeUsers()[0]?.id;
    if (!recipientId) {
      return NextResponse.json({ ok: false, error: "No connected relatives." }, { status: 404 });
    }

    const thread = threadFor(recipientId);
    appendMessage({
      threadId: thread.id,
      sender,
      text,
      audioId: body.audioId,
      extracted: false,
    });

    // A relative just answered → run the AI story extraction pipeline over
    // everything they have said that hasn't been preserved yet.
    let savedStories = [] as ReturnType<typeof saveStories>;
    if (sender === "relative") {
      const pending = pendingRelativeMessages(thread.id);
      if (pending.length > 0) {
        const all = messagesFor(thread.id);
        const newIds = new Set(pending.map((m) => m.id));
        const turns = all
          .slice(-12)
          .map((m) => ({ sender: m.sender, text: m.text, isNew: newIds.has(m.id) }));
        const { stories } = await extractStories(turns);
        if (stories.length > 0) {
          const transcript = pending.map((m) => m.text).join("\n\n");
          savedStories = saveStories(
            stories.map((s) => ({
              ...s,
              transcript,
              threadId: thread.id,
              messageIds: pending.map((m) => m.id),
              audioId: pending.find((m) => m.audioId)?.audioId,
              speaker: payload(recipientId).recipient.relation,
            })),
          );
        }
        // Mark handled either way so a failed extraction isn't retried forever.
        markMessagesExtracted(pending.map((m) => m.id));
      }
    }

    return NextResponse.json({
      ok: true,
      ...payload(recipientId),
      savedStories,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong while saving the message.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}


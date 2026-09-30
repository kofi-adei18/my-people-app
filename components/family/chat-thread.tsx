"use client";

// Shared chat thread used by both sides of the family conversation:
// the child on /family and the relative on /family/respond.

import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Message, MessageAvatar, MessageContent, MessageHeader } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Spinner } from "@/components/ui/spinner";
import type { ThreadPayload } from "@/lib/family/types";

export function relativeAvatar(relation: string): string {
  return relation.trim().charAt(0).toUpperCase() || "?";
}

interface ChatThreadProps {
  payload: ThreadPayload;
  viewer: "child" | "relative";
  /** messageId of a message that is still being saved/extracted. */
  optimisticId?: string | null;
}

export function ChatThread({ payload, viewer, optimisticId }: ChatThreadProps) {
  const { messages, recipient, storyIdsByMessage } = payload;

  const lastRelativeAt = Math.max(
    0,
    ...messages.filter((m) => m.sender === "relative").map((m) => m.createdAt),
  );

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {messages.map((m, index) => {
              const fromViewer = m.sender === viewer;
              const isRelative = m.sender === "relative";
              const storyIds = storyIdsByMessage[m.id] ?? [];
              const answered =
                m.sender === "child" && m.createdAt < lastRelativeAt;
              return (
                <MessageScrollerItem
                  key={m.id}
                  messageId={m.id}
                  scrollAnchor={index % 2 === 1}
                >
                  <Message align={fromViewer ? "end" : "start"}>
                    <MessageAvatar>
                      <span
                        className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                          isRelative
                            ? "bg-gold-deep text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isRelative ? relativeAvatar(recipient.relation) : "You".charAt(0)}
                      </span>
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader>
                        {isRelative ? recipient.relation : "You"}
                      </MessageHeader>
                      <Bubble
                        variant={fromViewer ? "default" : "tinted"}
                        align={fromViewer ? "end" : "start"}
                      >
                        <BubbleContent>
                          <span className="whitespace-pre-wrap">{m.text}</span>
                          {m.audioId && (
                            <audio
                              controls
                              preload="none"
                              src={`/api/family/audio/${m.audioId}`}
                              className="mt-2 h-9 w-56"
                            />
                          )}
                        </BubbleContent>
                      </Bubble>
                      {m.sender === "child" && viewer === "child" ? (
                        storyIds.length > 0 ? (
                          <MessageHeader>
                            <Link
                              href={`/family/story/${storyIds[0]}`}
                              className="inline-flex items-center gap-1 text-gold-deep underline underline-offset-4 hover:text-foreground"
                            >
                              <SparklesIcon className="size-3" aria-hidden="true" />
                              Preserved as a Family Story
                            </Link>
                          </MessageHeader>
                        ) : answered ? (
                          <MessageHeader>Answered ✓</MessageHeader>
                        ) : (
                          <MessageHeader className="inline-flex items-center gap-1.5">
                            <Spinner className="size-3" />
                            Waiting for {recipient.relation}…
                          </MessageHeader>
                        )
                      ) : null}
                      {m.sender === "relative" && viewer === "relative" && !m.extracted && (
                        <MessageHeader className="inline-flex items-center gap-1.5">
                          <Spinner className="size-3" />
                          {optimisticId === m.id ? "Preserving as a Family Story…" : ""}
                        </MessageHeader>
                      )}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              );
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

export function MicHint({ recording }: { recording: boolean }) {
  return recording ? (
    <span className="inline-flex items-center gap-2 text-xs text-destructive">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-2 animate-ping rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-destructive" />
      </span>
      Recording… tap to finish
    </span>
  ) : null;
}

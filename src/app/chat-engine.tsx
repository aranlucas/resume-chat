"use client";

import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect } from "react";

// The AI SDK client (and the zod, SSE and gateway code it pulls in) is most of
// the page's JavaScript but isn't needed until the first question, so the page
// loads this module lazily and keeps the landing view light.

export type ChatSnapshot = Pick<ReturnType<typeof useChat>, "messages" | "status" | "error">;

export function createChat(): Chat<UIMessage> {
  return new Chat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });
}

/** Subscribes to `chat` and reports each change; renders nothing. */
export function ChatEngine({
  chat,
  onChange,
}: {
  chat: Chat<UIMessage>;
  onChange: (snapshot: ChatSnapshot) => void;
}) {
  const { messages, status, error } = useChat({ chat, throttle: 50 });
  useEffect(() => onChange({ messages, status, error }), [messages, status, error, onChange]);
  return null;
}

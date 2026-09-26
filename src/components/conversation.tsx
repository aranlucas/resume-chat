"use client";

import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

// A transcript that follows new text while an answer streams, but lets the
// reader scroll up without being pulled back down; adapted from the AI SDK
// chatbot template's ai-elements/conversation.tsx.
export const Conversation = ({ className, ...props }: ComponentProps<typeof StickToBottom>) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export const ConversationContent = (props: ComponentProps<typeof StickToBottom.Content>) => (
  <StickToBottom.Content {...props} />
);

export const ConversationScrollButton = () => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <button
      type="button"
      onClick={() => scrollToBottom()}
      aria-label="Scroll to latest"
      className="bg-sheet text-slate hover:text-ink absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border p-2 shadow-sm"
    >
      <ArrowDownIcon aria-hidden="true" className="size-4" />
    </button>
  );
};

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

  if (isAtBottom) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        Promise.resolve(scrollToBottom()).catch(
          console.error.bind(console, "Failed to scroll to the latest message"),
        );
      }}
      aria-label="Scroll to latest"
      className="absolute inset-s-1/2 inset-be-4 -translate-x-1/2 rounded-full border bg-sheet p-2 text-slate shadow-sm hover:text-ink rtl:translate-x-1/2"
    >
      <ArrowDownIcon aria-hidden="true" className="size-4" />
    </button>
  );
};

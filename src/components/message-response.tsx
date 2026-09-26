"use client";

import { cn } from "@/lib/utils";
import { memo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";

// Markdown for a streaming answer, as in the AI SDK chatbot template: Streamdown
// renders half-finished Markdown (an unclosed **bold**, a partial list) cleanly,
// and memo skips re-rendering unless the text changed.
export const MessageResponse = memo(
  ({ className, ...props }: ComponentProps<typeof Streamdown>) => (
    <Streamdown className={cn("answer", className)} linkSafety={{ enabled: false }} {...props} />
  ),
  (prev, next) => prev.children === next.children && prev.className === next.className,
);

MessageResponse.displayName = "MessageResponse";

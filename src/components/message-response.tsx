"use client";

import { cn } from "@/lib/utils";
import { TypesetResponse } from "@/components/typeset-response";
import { memo, type ComponentProps } from "react";

// Markdown for a streaming answer, as in the AI SDK chatbot template: Streamdown
// renders half-finished Markdown (an unclosed **bold**, a partial list) cleanly,
// and memo skips re-rendering unless the text changed.
export const MessageResponse = memo(
  ({ className, ...props }: ComponentProps<typeof TypesetResponse>) => (
    <TypesetResponse
      className={cn("[--typeset-flow:0.75em] [--typeset-leading:1.625]", className)}
      {...props}
    />
  ),
  (prev, next) => prev.children === next.children && prev.className === next.className,
);

MessageResponse.displayName = "MessageResponse";

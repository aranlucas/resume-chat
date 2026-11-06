"use client";

import { cn } from "@/lib/utils";
import { TypesetResponse } from "@/components/typeset-response";
import { memo, type ComponentProps } from "react";

export const MessageResponse = memo(
  ({ className, ...props }: ComponentProps<typeof TypesetResponse>) => (
    <TypesetResponse className={cn("typeset-chat-prose", className)} {...props} />
  ),
);

MessageResponse.displayName = "MessageResponse";

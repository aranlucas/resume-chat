import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MessageProps {
  role: string;
  children: ReactNode;
}

const Message = ({ role, children }: MessageProps) => {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap sm:max-w-[75%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Message;

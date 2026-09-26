"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/conversation";
import { MessageResponse } from "@/components/message-response";
import { ThemeToggle } from "@/components/theme-toggle";
import { STARTERS, type Profile, type Role } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Fragment, useEffect, useRef, useState } from "react";

export function ProfileChat({ profile, roles }: { profile: Profile; roles: Role[] }) {
  const { messages, setMessages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const ask = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
    setInput("");
  };

  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-[minmax(360px,440px)_1fr]">
      <ProfilePanel
        profile={profile}
        roles={roles}
        hidden={hasMessages}
        onAsk={ask}
        disabled={isLoading}
      />

      <section className={cn("flex flex-col lg:h-dvh lg:min-h-0", hasMessages && "h-dvh")}>
        <header className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className={cn("font-semibold", hasMessages ? "lg:invisible" : "invisible")}>
            {profile.name}
          </p>
          <div className="flex items-center gap-1">
            {hasMessages && (
              <button
                type="button"
                onClick={() => {
                  stop();
                  setMessages([]);
                  inputRef.current?.focus();
                }}
                className="text-slate hover:text-ink rounded-md px-3 py-2 text-sm"
              >
                New conversation
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {hasMessages ? (
          <Conversation className="min-h-0">
            <ConversationContent className="mx-auto flex w-full max-w-[44rem] flex-col px-5 sm:px-8">
              <Transcript
                messages={messages}
                status={status}
                error={error}
                onRetry={() => regenerate()}
              />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        ) : (
          <div className="flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-5 sm:px-8">
              <Starters onAsk={ask} />
            </div>
          </div>
        )}

        <div className="bg-paper sticky bottom-0 px-5 pt-2 pb-4 sm:px-8">
          <form
            className="bg-sheet focus-within:border-cobalt mx-auto flex max-w-[44rem] items-end gap-2 rounded-lg border p-2 transition-colors"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <label htmlFor="question" className="sr-only">
              Your question
            </label>
            <textarea
              ref={inputRef}
              id="question"
              name="question"
              rows={1}
              placeholder="Ask about experience, projects, or skills"
              className="placeholder:text-slate/80 field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-base outline-none focus-visible:outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              autoComplete="off"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={() => stop()}
                className="text-ink hover:bg-cobalt-wash h-10 shrink-0 rounded-md border px-4 text-sm font-semibold"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-cobalt text-sheet h-10 shrink-0 rounded-md px-5 text-sm font-semibold transition-opacity disabled:opacity-40"
              >
                Ask
              </button>
            )}
          </form>
          <p className="text-slate mx-auto mt-2 max-w-[44rem] px-1 text-xs">
            Answers come from my resume via a free AI model and can be wrong.{" "}
            <a
              href="https://github.com/aranlucas/resume-chat"
              className="hover:text-ink underline underline-offset-2"
            >
              See how it&apos;s built
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

function ProfilePanel({
  profile,
  roles,
  hidden,
  onAsk,
  disabled,
}: {
  profile: Profile;
  roles: Role[];
  hidden: boolean;
  onAsk: (question: string) => void;
  disabled: boolean;
}) {
  return (
    <aside
      className={cn(
        "flex-col px-5 pt-10 pb-10 sm:px-8 lg:flex lg:overflow-y-auto lg:border-r lg:px-10 lg:pt-14",
        hidden ? "hidden" : "flex",
      )}
    >
      <h1 className="text-[clamp(2.75rem,6vw,4rem)] leading-[0.95] font-bold tracking-[-0.035em]">
        Lucas
        <br />
        Arango
      </h1>
      <p className="text-slate mt-6 max-w-[34ch] text-[17px] leading-relaxed">
        Senior software engineer in {profile.location}. Ten years at DoorDash, AWS, and Amazon. I
        led engineering on Ask DoorDash&apos;s grocery agent, which turns recipes and photos into
        carts.
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {profile.links.map((l) => (
          <a key={l.label} href={l.href} className="text-slate hover:text-cobalt">
            {l.label}
          </a>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold">Experience</h2>
      <ol className="mt-3 border-t">
        {roles.map((r) => (
          <li key={r.company} className="border-b">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(r.question)}
              title={r.question}
              className="group grid w-full grid-cols-[5.5rem_1fr] gap-3 py-3.5 text-left disabled:cursor-wait"
            >
              <span className="text-slate pt-px text-sm tabular-nums">{r.years}</span>
              <span>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="group-hover:text-cobalt group-focus-visible:text-cobalt font-semibold">
                    {r.company}
                  </span>
                  <span className="text-cobalt text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                    Ask
                  </span>
                </span>
                <span className="text-slate block text-sm">{r.role}</span>
                {r.note && <span className="mt-1 block text-sm leading-snug">{r.note}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function Starters({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-end pt-6 pb-6 lg:pt-16">
      <p className="text-slate max-w-[46ch] text-[17px] leading-relaxed">
        This page is a small agent that has read my resume. Ask it what you&apos;d ask me in a first
        call.
      </p>
      <ul className="mt-6 border-t">
        {STARTERS.map((q) => (
          <li key={q} className="border-b">
            <button
              type="button"
              onClick={() => onAsk(q)}
              className="hover:text-cobalt w-full py-4 text-left text-xl leading-snug font-semibold tracking-[-0.01em] sm:text-2xl"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Transcript({
  messages,
  status,
  error,
  onRetry,
}: {
  messages: UIMessage[];
  status: string;
  error: Error | undefined;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col pt-4 pb-8">
      {messages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          isFirst={index === 0}
          isLoading={status === "streaming" && index === messages.length - 1}
        />
      ))}

      {status === "submitted" && messages.at(-1)?.role !== "assistant" && <ThinkingMessage />}

      {error && (
        <div className="text-danger mt-4 text-[17px]" role="alert">
          {error.message || "The answer didn't come through."}{" "}
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function Message({
  message,
  isFirst,
  isLoading,
}: {
  message: UIMessage;
  isFirst: boolean;
  isLoading: boolean;
}) {
  const hasAnyContent = message.parts.some(
    (part) => (part.type === "text" || part.type === "reasoning") && part.text.trim().length > 0,
  );
  const isThinking = message.role === "assistant" && isLoading && !hasAnyContent;

  const parts = message.parts.map((part, index) => {
    const key = `message-${message.id}-part-${index}`;
    switch (part.type) {
      case "reasoning":
        // Only the part still streaming shows the indicator.
        return <MessageReasoning key={key} isLoading={isLoading && part.state === "streaming"} />;
      case "text":
        return message.role === "user" ? (
          <Fragment key={key}>{part.text}</Fragment>
        ) : (
          <MessageResponse
            key={key}
            className={cn(isLoading && index === message.parts.length - 1 && "caret")}
          >
            {part.text}
          </MessageResponse>
        );
      default:
        // Tool calls, files, etc. aren't shown in the transcript.
        return null;
    }
  });

  if (message.role === "user") {
    return (
      <h2
        className={cn(
          "text-cobalt text-xl leading-snug font-semibold tracking-[-0.01em] sm:text-2xl",
          !isFirst && "mt-10 border-t pt-10",
        )}
      >
        {parts}
      </h2>
    );
  }
  return (
    <div className="mt-4 text-[17px] leading-relaxed">
      {isThinking ? <Thinking labels={READING_LABELS} /> : parts}
    </div>
  );
}

/** Shown before the assistant message exists. */
function ThinkingMessage() {
  return (
    <div className="mt-4 text-[17px]">
      <Thinking labels={READING_LABELS} />
    </div>
  );
}

/** The model's reasoning isn't displayed; only that it's happening. */
function MessageReasoning({ isLoading }: { isLoading: boolean }) {
  return isLoading ? <Thinking labels={REASONING_LABELS} /> : null;
}

const READING_LABELS = ["Reading the resume"];
// Rotated while the model reasons, so long waits feel alive.
const REASONING_LABELS = ["Thinking it over", "Connecting the dots", "Picking the best examples"];

/** A tiny resume whose lines get highlighted one by one while the answer is on its way. */
function Thinking({ labels }: { labels: string[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (labels.length < 2) return;
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, [labels]);

  const label = labels[tick % labels.length];

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span className="resume-sheet" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span key={label} className="thinking-label">
        {label}
      </span>
    </div>
  );
}

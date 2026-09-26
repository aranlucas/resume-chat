"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { PROFILE, ROLES, STARTERS } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const textOf = (message: UIMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

// Keep the newest text in view as the transcript grows while an answer streams in.
const followLatest = (node: HTMLDivElement | null) => {
  if (!node) return;
  const observer = new ResizeObserver(() => node.scrollIntoView({ block: "end" }));
  observer.observe(node);
  return () => observer.disconnect();
};

export default function Home() {
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
      <Profile hidden={hasMessages} onAsk={ask} disabled={isLoading} />

      <section className={cn("flex flex-col lg:h-dvh lg:min-h-0", hasMessages && "min-h-dvh")}>
        <header className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className={cn("font-semibold", hasMessages ? "lg:invisible" : "invisible")}>
            {PROFILE.name}
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

        <div className="flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-5 sm:px-8">
            {hasMessages ? (
              <Transcript
                messages={messages}
                status={status}
                error={error}
                onRetry={() => regenerate()}
              />
            ) : (
              <Starters onAsk={ask} />
            )}
          </div>
        </div>

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

function Profile({
  hidden,
  onAsk,
  disabled,
}: {
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
        Senior software engineer in {PROFILE.location}. Ten years at DoorDash, AWS, and Amazon. I
        led engineering on Ask DoorDash&apos;s grocery agent, which turns recipes and photos into
        carts.
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href={`mailto:${PROFILE.email}`} className="hover:text-cobalt font-semibold">
          {PROFILE.email}
        </a>
        {PROFILE.links.map((l) => (
          <a key={l.label} href={l.href} className="text-slate hover:text-cobalt">
            {l.label}
          </a>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold">Experience</h2>
      <ol className="mt-3 border-t">
        {ROLES.map((r) => (
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
  const last = messages[messages.length - 1];
  const waiting = status === "submitted" || (status === "streaming" && !textOf(last));

  return (
    <div ref={followLatest} className="flex scroll-mb-32 flex-col pt-4 pb-8 lg:scroll-mb-0">
      {messages.map((m, i) => {
        const text = textOf(m);
        if (m.role === "user") {
          return (
            <h2
              key={m.id}
              className={cn(
                "text-cobalt text-xl leading-snug font-semibold tracking-[-0.01em] sm:text-2xl",
                i > 0 && "mt-10 border-t pt-10",
              )}
            >
              {text}
            </h2>
          );
        }
        const streaming = status === "streaming" && m.id === last.id;
        return (
          <div
            key={m.id}
            className={cn("answer mt-4 text-[17px] leading-relaxed", streaming && "caret")}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
          </div>
        );
      })}

      {waiting && (
        <p className="text-slate caret mt-4 text-[17px]" aria-live="polite">
          <span>Reading the resume</span>
        </p>
      )}

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

"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/conversation";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

// Streamdown is heavy, so it loads with the first question rather than the page.
const loadMessageResponse = () =>
  import("@/components/message-response").then((module) => module.MessageResponse);

const MessageResponse = dynamic(loadMessageResponse);

const createChat = () => new Chat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });

type ProfileChatProps = { profile: Profile };

type ProfilePanelProps = {
  profile: Profile;
  hidden: boolean;
  onAsk: (question: string) => void;
  disabled: boolean;
};

type ProfileHeroProps = { profile: Profile };

type ProfileLinksProps = { profile: Profile; className?: string };

type ExperienceProps = {
  profile: Profile;
  onAsk: (question: string) => void;
  disabled: boolean;
  className?: string;
};

type StartersProps = { onAsk: (question: string) => void };

type TranscriptProps = {
  messages: UIMessage[];
  status: string;
  error: Error | undefined;
  onRetry: () => void;
};

type MessageProps = { message: UIMessage; isFirst: boolean; isStreaming: boolean };

export function ProfileChat({ profile }: ProfileChatProps) {
  // A new Chat per conversation, so a stopped answer can't stream into the next one.
  const [chat, setChat] = useState(createChat);

  const { messages, status, error, sendMessage, stop, regenerate } = useChat({
    chat,
    throttle: 50,
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const ask = (text: string) => {
    if (!text.trim() || isLoading) {
      return;
    }

    loadMessageResponse().catch(
      console.error.bind(console, "Failed to load the response renderer"),
    );
    setInput("");
    sendMessage({ text: text.trim() }).catch(
      console.error.bind(console, "Failed to send the message"),
    );
  };

  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-chat">
      <ProfilePanel profile={profile} hidden={hasMessages} onAsk={ask} disabled={isLoading} />

      <section className={cn("flex flex-col lg:h-dvh lg:min-h-0", hasMessages && "h-dvh")}>
        <header
          className={cn(
            "flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 sm:px-8 lg:flex",
            hasMessages ? "flex" : "hidden",
          )}
        >
          <p className={cn("font-semibold", hasMessages ? "lg:invisible" : "invisible")}>
            {profile.name}
          </p>
          <div className="flex items-center gap-1">
            {hasMessages && (
              <button
                type="button"
                onClick={() => {
                  stop().catch(console.error.bind(console, "Failed to stop the response"));
                  setChat(createChat());
                  inputRef.current?.focus();
                }}
                className="rounded-md px-3 py-2 text-sm text-slate hover:text-ink"
              >
                New conversation
              </button>
            )}
            <ThemeToggle />
          </div>
          {hasMessages && <ProfileLinks profile={profile} className="w-full gap-x-4 lg:hidden" />}
        </header>

        {hasMessages ? (
          <Conversation className="min-h-0">
            <ConversationContent className="mx-auto flex w-full max-w-176 flex-col px-5 sm:px-8">
              <Transcript
                messages={messages}
                status={status}
                error={error}
                onRetry={() => void regenerate()}
              />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        ) : (
          <div className="flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
            <div className="mx-auto flex w-full max-w-176 flex-1 flex-col px-5 sm:px-8">
              <Starters onAsk={ask} />
            </div>
          </div>
        )}

        <div className="sticky inset-be-0 bg-paper px-5 pbs-2 pbe-4 sm:px-8">
          <form
            className="mx-auto flex max-w-176 items-end gap-2 rounded-lg border bg-sheet p-2 transition-colors focus-within:border-cobalt"
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
              className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-slate"
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
                onClick={() => void stop()}
                className="h-10 shrink-0 rounded-md border px-4 text-sm font-semibold text-ink hover:bg-cobalt-wash"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="h-10 shrink-0 rounded-md bg-cobalt px-5 text-sm font-semibold text-sheet transition-opacity disabled:opacity-40"
              >
                Ask
              </button>
            )}
          </form>
          <p className="mx-auto mbs-2 max-w-176 px-1 text-13px text-slate">
            Answers come from my resume via a free AI model and can be wrong.{" "}
            <a
              href="/resume"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-ink"
            >
              Check the resume
            </a>{" "}
            ·{" "}
            <a
              href="https://github.com/aranlucas/resume-chat"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-ink"
            >
              How it&apos;s built
            </a>
          </p>
        </div>
      </section>
      {!hasMessages && (
        <Experience
          profile={profile}
          onAsk={ask}
          disabled={isLoading}
          className="px-5 pbe-10 sm:px-8 lg:hidden"
        />
      )}
    </div>
  );
}

function ProfilePanel({ profile, hidden, onAsk, disabled }: ProfilePanelProps) {
  return (
    <aside
      className={cn(
        "lg:flex lg:flex-col lg:overflow-y-auto lg:border-e lg:px-10 lg:pbs-14 lg:pbe-10",
        hidden && "hidden",
      )}
    >
      <ProfileHero profile={profile} />
      <Experience profile={profile} onAsk={onAsk} disabled={disabled} className="hidden lg:block" />
    </aside>
  );
}

function ProfileHero({ profile }: ProfileHeroProps) {
  return (
    <div className="px-5 pbs-10 sm:px-8 lg:p-0">
      <div className="relative">
        <div className="absolute inset-e-0 inset-bs-0 lg:hidden">
          <ThemeToggle />
        </div>
        <h1 className="text-hero leading-hero font-bold tracking-hero">
          Lucas
          <br />
          Arango
        </h1>
      </div>
      <p className="mbs-6 max-w-34ch text-17px leading-relaxed text-slate">
        Senior software engineer in {profile.location}. Ten years at DoorDash, AWS, and Amazon. I
        led engineering on Ask DoorDash&apos;s grocery agent, which turns recipes and photos into
        carts.
      </p>

      <ProfileLinks profile={profile} className="mbs-5" />
    </div>
  );
}

function ProfileLinks({ profile, className }: ProfileLinksProps) {
  return (
    <div className={cn("flex flex-wrap gap-x-5 gap-y-2 text-sm", className)}>
      {[...profile.links, { label: "Resume", href: "/resume" }].map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate hover:text-cobalt"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

function Experience({ profile, onAsk, disabled, className }: ExperienceProps) {
  return (
    <div className={className}>
      <h2 className="mbs-10 text-sm font-semibold">Experience</h2>
      <ol className="mbs-3 border-bs">
        {profile.roles.map((r) => (
          <li
            key={r.company}
            className="group relative grid grid-cols-experience gap-x-3 border-be py-3.5"
          >
            <span className="row-span-3 pbs-px text-sm text-slate tabular-nums">{r.years}</span>
            <p className="font-semibold group-hover:text-cobalt group-has-[:focus-visible]:text-cobalt">
              {r.company}
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(r.question)}
              title={r.question}
              className="self-start pbs-px text-sm font-medium text-slate group-hover:text-cobalt group-has-[:focus-visible]:text-cobalt after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-cobalt disabled:cursor-wait"
            >
              Ask<span className="sr-only"> about {r.company}</span>{" "}
              <span aria-hidden="true">→</span>
            </button>
            <p className="col-span-2 col-start-2 text-sm text-slate">{r.role}</p>
            {r.note && (
              <p className="col-span-2 col-start-2 mbs-1 text-sm leading-snug">{r.note}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

const STARTERS = [
  "Why would Lucas be a strong hire for an AI agents team?",
  "How did the Ask DoorDash grocery agent go from prototype to launch?",
  "What kind of engineering work is he strongest at?",
  "What languages and platforms does he work in?",
];

function Starters({ onAsk }: StartersProps) {
  return (
    <div className="flex flex-1 flex-col justify-end py-6 lg:pbs-16">
      <p className="max-w-46ch text-17px leading-relaxed text-slate">
        Ask what you&apos;d ask me on a first call. Answers come from my resume, so you can skip the
        skim.
      </p>
      <ul className="mbs-6 border-bs">
        {STARTERS.map((q) => (
          <li key={q} className="border-be">
            <button
              type="button"
              onClick={() => onAsk(q)}
              className="w-full py-4 text-start text-xl leading-snug font-semibold tracking-micro hover:text-cobalt sm:text-2xl"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Transcript({ messages, status, error, onRetry }: TranscriptProps) {
  const last = messages.at(-1);

  const isWaiting =
    (status === "submitted" || status === "streaming") &&
    !(last?.role === "assistant" && hasText(last));

  return (
    <div className="flex flex-col pbs-4 pbe-8">
      {messages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          isFirst={index === 0}
          isStreaming={status === "streaming" && message === last}
        />
      ))}

      {isWaiting && <Thinking />}

      {error && (
        <div className="mbs-4 text-17px text-danger" role="alert">
          {error.message || "The answer didn't come through."}{" "}
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Try again
          </button>
          {" or "}
          <a href="/resume" target="_blank" rel="noopener noreferrer" className="underline">
            read the resume
          </a>
        </div>
      )}
    </div>
  );
}

const textParts = (message: UIMessage) =>
  message.parts.filter((part) => part.type === "text").map((part) => part.text);

const hasText = (message: UIMessage) => textParts(message).some((text) => text.trim());

function Message({ message, isFirst, isStreaming }: MessageProps) {
  const texts = textParts(message);

  if (message.role === "user") {
    return (
      <h2
        className={cn(
          "text-xl leading-snug font-semibold tracking-micro text-cobalt sm:text-2xl",
          !isFirst && "mbs-10 border-bs pbs-10",
        )}
      >
        {texts.join("")}
      </h2>
    );
  }

  // Until the first words arrive, the transcript shows <Thinking /> instead.
  if (!hasText(message)) {
    return null;
  }

  return (
    <div className="mbs-4 text-17px leading-relaxed">
      <MessageResponse className={cn(isStreaming && "caret")}>{texts.join("")}</MessageResponse>
    </div>
  );
}

/** A tiny resume whose lines get highlighted one by one while the answer is on its way. */
function Thinking() {
  return (
    <div className="mbs-4 flex items-center gap-3 text-17px" role="status" aria-live="polite">
      <span className="resume-sheet" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="thinking-label">Reading the resume</span>
    </div>
  );
}

"use client";

import Icon from "@/components/icons";
import Message from "@/components/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Where has Lucas worked?",
  "What skills does Lucas have?",
  "Tell me about the Ask DoorDash grocery agent",
  "Who is Lucas?",
];

export default function Home() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messageCount = messages.length;

  // Keep the latest message visible as the conversation grows or streams in.
  useEffect(() => {
    if (messageCount > 0 && status) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messageCount, status]);

  return (
    <>
      <div ref={scrollRef} className="flex grow flex-col overflow-y-scroll">
        {messages.length === 0 ? (
          <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-10 md:pt-12">
            <div className="bg-card rounded-2xl border p-6 shadow-sm md:p-8">
              <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                Powered by OpenRouter · free model
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                Ask anything about Lucas
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                This assistant answers from Lucas Arango&apos;s resume — 10+ years across DoorDash,
                AWS, and Amazon, plus AI agent platforms and cloud services.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      sendMessage({ text: suggestion });
                    }}
                    disabled={status !== "ready"}
                    className="group bg-muted/60 hover:bg-muted flex items-start gap-2 rounded-xl border p-3 text-left text-sm transition-colors disabled:opacity-50"
                  >
                    <Icon
                      name="arrow-right"
                      className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
            {messages.map((message) => (
              <Message key={message.id} role={message.role}>
                <span>
                  {message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("")}
                </span>
              </Message>
            ))}
            {(status === "submitted" || status === "streaming") && (
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                {status === "submitted" && (
                  <span className="flex items-center gap-2">
                    <Icon name="loader" className="h-4 w-4 animate-spin" />
                    Thinking…
                  </span>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={() => stop()}>
                  Stop
                </Button>
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-xl border p-3 text-sm">
                An error occurred.{" "}
                <button
                  type="button"
                  onClick={() => regenerate()}
                  className="font-medium underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t px-4 pt-4 pb-3">
        <form
          className="mx-auto flex w-full max-w-2xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
        >
          <Input
            name="message"
            type="text"
            placeholder="Ask about experience, skills, projects…"
            className="h-11 rounded-full px-5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "ready"}
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={status !== "ready"}
            className="h-11 shrink-0 rounded-full px-5 font-semibold"
          >
            Send
            <Icon name="send" className="ml-1.5 h-4 w-4" />
          </Button>
        </form>
        <p className="text-muted-foreground mt-2 text-center text-xs">
          Answers are generated from Lucas&apos;s resume and may be imperfect.
        </p>
      </div>
    </>
  );
}

"use client";

import Icon from "@/components/icons";
import Message from "@/components/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { useState, useRef } from "react";

export default function Home() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <>
      {messages.length === 0 ? (
        <div className="flex grow flex-col overflow-y-scroll">
          <div className="pt-4 pb-[200px] md:pt-10">
            <div className="mx-auto max-w-2xl px-4">
              <div className="bg-background rounded-lg border p-8">
                <h1 className="mb-2 text-lg font-semibold">Welcome to my Resume ChatBot</h1>
                <p className="text-muted-foreground mb-2 leading-normal">
                  This chatbot will answer any questions you may have about resume. Working on
                  building a question bank to answer more leadership answers
                </p>
                <p className="text-muted-foreground mb-2 leading-normal">
                  You can try asking any of the following questions:
                </p>
                <div className="mt-4 flex flex-col items-start space-y-2">
                  <button
                    onClick={() => {
                      sendMessage({ text: "Where has Lucas worked?" });
                    }}
                    className="text-primary ring-offset-background focus-visible:ring-ring inline-flex h-auto items-center justify-center rounded-md p-0 text-base font-medium underline-offset-4 shadow-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon name="arrow-right" className="text-muted-foreground mr-2 h-4 w-4" />
                    Where has Lucas worked?
                  </button>
                  <button
                    onClick={() => {
                      sendMessage({ text: "What skills does Lucas have?" });
                    }}
                    className="text-primary ring-offset-background focus-visible:ring-ring inline-flex h-auto items-center justify-center rounded-md p-0 text-base font-medium underline-offset-4 shadow-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon name="arrow-right" className="text-muted-foreground mr-2 h-4 w-4" />
                    What skills does Lucas have?
                  </button>
                  <button
                    onClick={() => {
                      sendMessage({ text: "Who is Lucas?" });
                    }}
                    className="text-primary ring-offset-background focus-visible:ring-ring inline-flex h-auto items-center justify-center rounded-md p-0 text-base font-medium underline-offset-4 shadow-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon name="arrow-right" className="text-muted-foreground mr-2 h-4 w-4" />
                    Who is Lucas?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div id="messages" className="flex grow flex-col space-y-4 overflow-y-scroll p-3">
          {messages.map((m) => {
            const text = m.parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("");
            return <Message message={text} role={m.role} key={m.id} />;
          })}
        </div>
      )}
      <div className="mb-2 border-t-2 px-4 pt-4">
        <form className="flex" onSubmit={onSubmit} ref={formRef}>
          <Input
            name="message"
            type="text"
            placeholder="Write your message!"
            className="mx-3 block w-full rounded-full py-2 pl-4 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="inset-y-0 right-0 items-center">
            <Button
              disabled={isLoading}
              variant="secondary"
              type="submit"
              className="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out focus:outline-none"
            >
              <span className="font-bold">Send</span>
              {isLoading ? (
                <Icon
                  name="loader"
                  className="ml-2 h-6 w-6 rotate-45 animate-spin fill-blue-600 dark:text-gray-600"
                />
              ) : (
                <Icon name="send" className="ml-2 h-6 w-6 rotate-45" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

"use client";

import Icon from "@/components/icons";
import Message from "@/components/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "ai/react";
import { useRef } from "react";

export default function Home() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput,
  } = useChat();

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      {messages.length === 0 ? (
        <div className="flex grow flex-col overflow-y-scroll">
          <div className="pb-[200px] pt-4 md:pt-10">
            <div className="mx-auto max-w-2xl px-4">
              <div className="rounded-lg border bg-background p-8">
                <h1 className="mb-2 text-lg font-semibold">
                  Welcome to my Resume ChatBot
                </h1>
                <p className="mb-2 leading-normal text-muted-foreground">
                  This chatbot will answer any questions you may have about
                  resume. Working on building a question bank to answer more
                  leadership answers
                </p>
                <p className="mb-2 leading-normal text-muted-foreground">
                  You can try asking any of the following questions:
                </p>
                <div className="mt-4 flex flex-col items-start space-y-2">
                  <button
                    onClick={() => {
                      setInput("Where has Lucas worked?");
                    }}
                    className="inline-flex h-auto items-center justify-center rounded-md p-0 text-base font-medium text-primary underline-offset-4 shadow-none ring-offset-background transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon name="arrow-right" className="mr-2 h-4 w-4 text-muted-foreground" />
                    Where has Lucas worked?
                  </button>
                  <button
                    onClick={() => {
                      setInput("What skills does Lucas have?");
                    }}
                    className="inline-flex h-auto items-center justify-center rounded-md p-0 text-base font-medium text-primary underline-offset-4 shadow-none ring-offset-background transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon name="arrow-right" className="mr-2 h-4 w-4 text-muted-foreground" />
                    What skills does Lucas have?
                  </button>
                  <button
                    onClick={() => {
                      setInput("Who is Lucas?");
                    }}
                    className="inline-flex h-auto items-center justify-center rounded-md p-0 text-base font-medium text-primary underline-offset-4 shadow-none ring-offset-background transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon name="arrow-right" className="mr-2 h-4 w-4 text-muted-foreground" />
                    Who is Lucas?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="messages"
          className="flex grow flex-col space-y-4 overflow-y-scroll p-3"
        >
          {messages.map((m, i) => {
            return <Message message={m.content} role={m.role} key={i} />;
          })}
        </div>
      )}
      <div className="mb-2 border-t-2 px-4 pt-4">
        <form className="flex" onSubmit={handleSubmit} ref={formRef}>
          <Input
            name="message"
            type="text"
            placeholder="Write your message!"
            className="mx-3 block w-full rounded-full py-2 pl-4 outline-none"
            value={input}
            onChange={handleInputChange}
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
                <Icon name="loader" className="ml-2 h-6 w-6 rotate-45 animate-spin fill-blue-600 dark:text-gray-600" />
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

"use client";

import { Icons } from "@/components/icons";
import Message from "@/components/message";
import NavBar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useChat } from "ai/react";
import { useRef } from "react";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <main className="flex h-screen w-full flex-col">
      <NavBar />
      <Separator />
      <div
        id="messages"
        className="flex grow flex-col space-y-4 overflow-y-scroll p-3"
      >
        {messages.map((m, i) => {
          return <Message message={m.content} role={m.role} key={i} />;
        })}
      </div>
      <div className="flex-2 mb-2 border-t-2 px-4 pt-4">
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
              variant="secondary"
              type="submit"
              className="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out focus:outline-none"
            >
              <span className="font-bold">Send</span>
              <Icons.send className="ml-2 h-6 w-6 rotate-45" />
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

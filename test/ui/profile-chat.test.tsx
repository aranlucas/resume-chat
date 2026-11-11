import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { ProfileChat } from "@/app/profile-chat";
import type { Profile } from "@/lib/profile";

const profile: Profile = {
  name: "Fictional Candidate",
  location: "Example City",
  links: [{ label: "Example", href: "https://example.com" }],
  roles: [],
};

type WireEvent = {
  type: string;
  id?: string;
  delta?: string;
  messageId?: string;
  finishReason?: string;
};

// Fixed AI SDK UI-message wire events, as /api/chat streams them.
function stream(events: WireEvent[]) {
  return new Response(
    [{ type: "start", messageId: crypto.randomUUID() }, ...events]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("") + "data: [DONE]\n\n",
    { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } },
  );
}

const text = (value: string) => [
  { type: "text-start", id: "text" },
  { type: "text-delta", id: "text", delta: value },
  { type: "text-end", id: "text" },
];

const answer = (value: string, finishReason = "stop") =>
  stream([...text(value), { type: "finish", finishReason }]);

const History = z.object({ messages: z.array(z.object({ role: z.string() })) });

function sentRoles([, init]: Parameters<typeof fetch>) {
  return History.parse(JSON.parse(z.string().parse(init?.body))).messages.map(
    (message) => message.role,
  );
}

function ask(question: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Your question" }), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ask" }));
}

beforeEach(() => {
  // use-stick-to-bottom observes the transcript's size; jsdom has no layout.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test.each([
  { label: "an empty reply", events: [{ type: "finish", finishReason: "stop" }] },
  {
    label: "reasoning that used the whole token budget",
    events: [
      { type: "reasoning-start", id: "reasoning" },
      { type: "reasoning-delta", id: "reasoning", delta: "Checking the resume." },
      { type: "reasoning-end", id: "reasoning" },
      { type: "finish", finishReason: "length" },
    ],
  },
])("$label can be retried without duplicating the question", async ({ events }) => {
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(stream(events))
    .mockResolvedValueOnce(answer("Recovered answer."));

  render(<ProfileChat profile={profile} />);
  ask("What are his skills?");

  const notice = await screen.findByRole("alert");
  expect(notice.textContent).toMatch(/No answer came through/);

  fireEvent.click(within(notice).getByRole("button", { name: "Try again" }));

  expect(await screen.findByText("Recovered answer.")).toBeDefined();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getAllByText("What are his skills?")).toHaveLength(1);
  expect(sentRoles(upstream.mock.calls[1])).toEqual(["user"]);
});

test("an answer stopped at the length limit says it may be cut off", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(answer("He led the grocery agent and", "length"))
    .mockResolvedValueOnce(answer("He also moved a console to React."));

  render(<ProfileChat profile={profile} />);
  ask("What did Lucas build?");

  expect(await screen.findByText("He led the grocery agent and")).toBeDefined();
  expect(await screen.findByText(/length limit/)).toBeDefined();
  expect(screen.queryByRole("alert")).toBeNull();

  ask("What else?");

  expect(await screen.findByText("He also moved a console to React.")).toBeDefined();
  await waitFor(() => expect(screen.queryByText(/length limit/)).toBeNull());
});

test("a complete answer shows no recovery notice", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(answer("Lucas built a grocery agent."));

  render(<ProfileChat profile={profile} />);
  ask("What did Lucas build?");

  expect(await screen.findByText("Lucas built a grocery agent.")).toBeDefined();
  // The Ask button returns once the response has finished.
  expect(await screen.findByRole("button", { name: "Ask" })).toBeDefined();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByText(/length limit/)).toBeNull();
});

test("a failed request shows only the server's error", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response("The assistant is temporarily unavailable. Please try again in a moment.", {
      status: 503,
    }),
  );

  render(<ProfileChat profile={profile} />);
  ask("What are his skills?");

  const notice = await screen.findByRole("alert");
  expect(notice.textContent).toMatch(/temporarily unavailable/);
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.queryByText(/No answer came through/)).toBeNull();
});

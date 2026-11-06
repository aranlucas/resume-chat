import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { z } from "zod";

const History = z.object({ messages: z.array(z.object({ role: z.string() })) });

// Fixed AI SDK wire events isolate UI journeys from paid or unavailable providers.
function answer(text: string) {
  return (
    [
      { type: "start", messageId: `fixture-${text}` },
      { type: "text-start", id: "text" },
      { type: "text-delta", id: "text", delta: text },
      { type: "text-end", id: "text" },
      { type: "finish" },
    ]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("") + "data: [DONE]\n\n"
  );
}

const headers = {
  "content-type": "text/event-stream",
  "x-vercel-ai-ui-message-stream": "v1",
};

test("question, follow-up and reset preserve the conversation boundary", async ({
  app,
  browser,
  screen,
}) => {
  let turns = 0;
  await browser.route("**/api/chat", async (route) => {
    const history = History.parse(JSON.parse(route.request.postData ?? "{}"));
    expect(history.messages.map((message) => message.role)).toEqual(
      turns === 1 ? ["user", "assistant", "user"] : ["user"],
    );
    turns += 1;
    await route.fulfill({ headers, body: answer(`Synthetic answer ${turns}.`) });
  });
  await app.open("/");
  await screen.getByRole("textbox", "Your question").fill("What did Lucas build?");
  await screen.getByRole("button", "Ask", { exact: true }).tap();
  await expect(screen.getByText("Synthetic answer 1.", { exact: true })).toBeVisible();
  await screen.getByRole("textbox", "Your question").fill("Tell me more.");
  await screen.getByRole("button", "Ask", { exact: true }).tap();
  await expect(screen.getByText("Synthetic answer 2.", { exact: true })).toBeVisible();
  await expect(screen.getByText("Synthetic answer 1.", { exact: true })).toBeVisible();
  await screen.getByRole("button", "New conversation").tap();
  await expect(screen.getByText("Synthetic answer 2.", { exact: true })).toHaveCount(0);
  await expect(screen.getByText("Synthetic answer 1.", { exact: true })).toHaveCount(0);
  await screen.getByRole("textbox", "Your question").fill("A fresh question.");
  await screen.getByRole("button", "Ask", { exact: true }).tap();
  await expect(screen.getByText("Synthetic answer 3.", { exact: true })).toBeVisible();
  expect(turns).toBe(3);
});

test("an unavailable answer can be retried without duplicating the question", async ({
  app,
  browser,
  screen,
}) => {
  let attempts = 0;
  await browser.route("**/api/chat", async (route) => {
    const history = History.parse(JSON.parse(route.request.postData ?? "{}"));
    expect(history.messages.map((message) => message.role)).toEqual(["user"]);
    attempts += 1;
    await route.fulfill(
      attempts === 1
        ? {
            status: 503,
            body: "The assistant is temporarily unavailable. Please try again in a moment.",
          }
        : { headers, body: answer("Recovered answer.") },
    );
  });
  await app.open("/");
  await screen.getByRole("textbox", "Your question").fill("What are his skills?");
  await screen.getByRole("button", "Ask", { exact: true }).tap();
  await expect(browser.locator('[role="log"]').getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await screen.getByRole("button", "Try again").tap();
  await expect(screen.getByText("Recovered answer.", { exact: true })).toBeVisible();
  await expect(browser.locator('[role="log"]').getByRole("alert")).toHaveCount(0);
  await expect(screen.getByText("What are his skills?", { exact: true })).toHaveCount(1);
  expect(attempts).toBe(2);
});

test("the source resume can be read and returns to the chat", async ({ app, screen, browser }) => {
  await app.open("/resume");
  await expect(screen.getByRole("heading", "Fictional Candidate")).toBeVisible();
  await expect(screen.getByText("Built synthetic demonstration systems.")).toBeVisible();
  await screen.getByRole("link", "← Ask Lucas").tap();
  await expect(browser).toHaveURL("/");
  await expect(screen.getByRole("textbox", "Your question")).toBeVisible();
});

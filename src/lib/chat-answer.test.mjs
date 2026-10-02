/* eslint-disable no-await-in-loop -- Cases and stream polling run sequentially with shared mocks. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { answerChat } from "./chat-answer.ts";
import { getSystemPrompt } from "./resume.ts";

const UNAVAILABLE = "The assistant is temporarily unavailable. Please try again in a moment.";
const INVALID =
  "The conversation is invalid or too long. Please shorten your question or start a new conversation.";
const user = (text = "What is this fictional person's experience?", id = "question-1") => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});
const assistant = (parts = [], id = "answer-1") => ({ id, role: "assistant", parts });
const request = (messages = [user()], signal) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages, id: "chat-1", trigger: "submit-message" }),
    signal,
  });
const finish = {
  type: "finish",
  finishReason: { unified: "stop", raw: "stop" },
  usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
};
const answerParts = [
  { type: "stream-start", warnings: [] },
  { type: "reasoning-start", id: "reasoning-1" },
  { type: "reasoning-delta", id: "reasoning-1", delta: "Reading the fixture." },
  { type: "reasoning-end", id: "reasoning-1" },
  { type: "text-start", id: "text-1" },
  { type: "text-delta", id: "text-1", delta: "Fictional candidate built a demo." },
  { type: "text-end", id: "text-1" },
  finish,
];
function fixture(parts = answerParts) {
  const model = new MockLanguageModelV4({
    doStream: () => ({ stream: ReadableStream.from(parts) }),
  });
  const dependencies = {
    getModel: () => model,
    loadPrompt: async () => "Synthetic resume: A fictional candidate built a demo.",
  };
  return { model, dependencies };
}
const chunks = (text) =>
  text
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)));

test("invalid bodies return a stable 400 without loading a resume or model", async (t) => {
  const bodies = {
    "malformed JSON": "{",
    "missing messages": "{}",
    "non-object JSON": "null",
    "non-array messages": JSON.stringify({ messages: "hello" }),
    "empty conversation": JSON.stringify({ messages: [] }),
    "missing id": JSON.stringify({ messages: [{ role: "user", parts: user().parts }] }),
    "untrusted system role": JSON.stringify({ messages: [{ ...user(), role: "system" }] }),
    "unsupported file": JSON.stringify({
      messages: [{ ...user(), parts: [{ type: "file", url: "https://example.invalid/private" }] }],
    }),
    "non-string text": JSON.stringify({
      messages: [{ ...user(), parts: [{ type: "text", text: 7 }] }],
    }),
    "user reasoning": JSON.stringify({
      messages: [{ ...user(), parts: [{ type: "reasoning", text: "hello" }] }],
    }),
    "empty question": JSON.stringify({ messages: [user(" \n ")] }),
    "oversized question": JSON.stringify({ messages: [user("a".repeat(4001))] }),
    "split oversized question": JSON.stringify({
      messages: [
        {
          ...user(),
          parts: [
            { type: "text", text: "a".repeat(2001) },
            { type: "text", text: "b".repeat(2000) },
          ],
        },
      ],
    }),
    "too many parts": JSON.stringify({
      messages: [
        { ...user(), parts: Array.from({ length: 17 }, () => ({ type: "text", text: "a" })) },
      ],
    }),
    "too many messages": JSON.stringify({
      messages: Array.from({ length: 41 }, (_, i) => user("question", `id-${i}`)),
    }),
    "too much total content": JSON.stringify({
      messages: Array.from({ length: 13 }, (_, i) => user("a".repeat(4000), `id-${i}`)),
    }),
    "oversized assistant content": JSON.stringify({
      messages: [
        user(),
        assistant([{ type: "reasoning", text: "a".repeat(16001) }]),
        user("next", "question-2"),
      ],
    }),
    "assistant-only conversation": JSON.stringify({ messages: [assistant()] }),
    "last message is assistant": JSON.stringify({ messages: [user(), assistant()] }),
    "oversized unknown field": JSON.stringify({
      messages: [user()],
      padding: "a".repeat(128 * 1024),
    }),
    "oversized UTF-8 bytes": JSON.stringify({ messages: [user()], padding: "🙂".repeat(40_000) }),
  };
  for (const [name, body] of Object.entries(bodies)) {
    await t.test(name, async () => {
      const response = await answerChat(
        new Request("http://localhost/api/chat", {
          method: "POST",
          body,
          headers: { "Content-Length": "1" },
        }),
        {
          getModel: () => assert.fail("invalid input must not obtain a model"),
          loadPrompt: () => assert.fail("invalid input must not load the resume"),
        },
      );
      assert.equal(response.status, 400);
      assert.equal(await response.text(), INVALID);
    });
  }
});

test("chunked oversized bodies are cancelled before reading unbounded content", async () => {
  let cancelled = false;
  let reads = 0;
  const body = new ReadableStream({
    pull(controller) {
      reads++;
      controller.enqueue(new Uint8Array(32 * 1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  const response = await answerChat(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body,
      duplex: "half",
    }),
    { getModel: () => assert.fail(), loadPrompt: () => assert.fail() },
  );
  assert.equal(response.status, 400);
  assert.equal(cancelled, true);
  assert.ok(reads <= 6);
});

test("accepted boundary sizes stream through the existing SDK transport", async () => {
  const { model, dependencies } = fixture();
  const messages = Array.from({ length: 12 }, (_, i) => user("a".repeat(4000), `q-${i}`));
  const response = await answerChat(request(messages), dependencies);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/event-stream/);
  assert.equal(response.headers.get("x-vercel-ai-ui-message-stream"), "v1");
  const events = chunks(await response.text());
  assert.ok(events.some((part) => part.type === "reasoning-delta"));
  assert.ok(events.some((part) => part.type === "text-delta" && part.delta.includes("Fictional")));
  assert.equal(model.doStreamCalls.length, 1);
  assert.equal(model.doStreamCalls[0].maxOutputTokens, 2048);
  assert.equal(
    model.doStreamCalls[0].prompt.filter((message) => message.role === "user").length,
    12,
  );
});

test("stopped/complete assistant parts round-trip; client provider metadata is not forwarded", async () => {
  for (const parts of [
    [],
    [{ type: "step-start" }],
    [
      { type: "step-start" },
      { type: "reasoning", text: "partial thought", state: "streaming" },
      {
        type: "text",
        text: "partial answer",
        state: "streaming",
        providerMetadata: { private: { secret: "do-not-forward" } },
      },
    ],
  ]) {
    const { model, dependencies } = fixture();
    const response = await answerChat(
      request([
        { ...user(), metadata: { ignored: true } },
        assistant(parts),
        user("Follow up", "q-2"),
      ]),
      dependencies,
    );
    assert.equal(response.status, 200);
    await response.text();
    assert.doesNotMatch(JSON.stringify(model.doStreamCalls[0].prompt), /do-not-forward|ignored/);
  }
});

test("configuration, resume HTTP failure, and prompt timeout share a safe 503", async () => {
  const { dependencies } = fixture();
  for (const overrides of [
    { getModel: () => undefined },
    {
      getModel: () => {
        throw new Error("sensitive provider setup");
      },
    },
    {
      loadPrompt: async () => {
        throw new Error("GET private-resume → 500");
      },
    },
    {
      loadPrompt: async () => {
        throw new DOMException("private timeout details", "TimeoutError");
      },
    },
  ]) {
    const response = await answerChat(request(), { ...dependencies, ...overrides });
    assert.equal(response.status, 503);
    assert.equal(await response.text(), UNAVAILABLE);
  }
});

test("provider startup and midstream failures expose only the safe stream error", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const doStream of [
    () => ({
      stream: ReadableStream.from(
        (async function* () {
          yield* answerParts.slice(0, 6);
          throw new Error("sensitive midstream transport failure");
        })(),
      ),
    }),
    () => {
      throw new Error("sensitive provider startup");
    },
    () => ({
      stream: ReadableStream.from([
        ...answerParts.slice(0, 6),
        { type: "error", error: new Error("sensitive provider failure") },
      ]),
    }),
    () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.error(new Error("sensitive transport failure"));
        },
      }),
    }),
  ]) {
    const model = new MockLanguageModelV4({ doStream });
    const response = await answerChat(request(), {
      ...fixture().dependencies,
      getModel: () => model,
    });
    const body = await response.text();
    assert.doesNotMatch(body, /sensitive/);
    assert.ok(chunks(body).some((part) => part.type === "error" && part.errorText === UNAVAILABLE));
  }
});

test("abort before parsing or while reading a body stops before any model/resume work", async () => {
  for (const beforeRead of [true, false]) {
    const abort = new AbortController();
    let bodyCancelled = false;
    const body = new ReadableStream({
      cancel() {
        bodyCancelled = true;
      },
    });
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body,
      duplex: "half",
      signal: abort.signal,
    });
    if (beforeRead) abort.abort();
    const pending = answerChat(req, {
      getModel: () => assert.fail(),
      loadPrompt: () => assert.fail(),
    });
    abort.abort();
    assert.equal((await pending).status, 499);
    if (!beforeRead) assert.equal(bodyCancelled, true);
  }
});

test(
  "generation deadline returns a safe error instead of a silent successful stop",
  { timeout: 5000 },
  async (t) => {
    const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
    t.mock.method(AbortSignal, "timeout", (milliseconds) =>
      originalTimeout(milliseconds === 45_000 ? 10 : milliseconds),
    );
    const model = new MockLanguageModelV4({
      doStream: ({ abortSignal }) => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: [] });
            abortSignal.addEventListener("abort", () => controller.error(abortSignal.reason), {
              once: true,
            });
          },
        }),
      }),
    });
    const response = await answerChat(request(), {
      ...fixture().dependencies,
      getModel: () => model,
    });
    const events = chunks(await response.text());
    assert.ok(events.some((part) => part.type === "error" && part.errorText === UNAVAILABLE));
    assert.ok(!events.some((part) => part.type === "abort"));
  },
);

test("the HTTP resume adapter receives cancellation and never starts generation after abort", async (t) => {
  const abort = new AbortController();
  const { model, dependencies } = fixture();
  const started = Promise.withResolvers();
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    started.resolve(options);
    await new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
    });
    return new Response("Synthetic resume");
  });
  const pending = answerChat(request([user()], abort.signal), {
    ...dependencies,
    loadPrompt: getSystemPrompt,
  });
  const options = await started.promise;
  assert.deepEqual(options.next.tags, ["resume"]);
  abort.abort();
  assert.equal((await pending).status, 499);
  assert.equal(options.signal.aborted, true);
  assert.equal(model.doStreamCalls.length, 0);
});

test(
  "a stalled HTTP resume fetch times out with the same unavailable response",
  { timeout: 15_000 },
  async (t) => {
    const { model, dependencies } = fixture();
    t.mock.method(
      globalThis,
      "fetch",
      (_url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const response = await answerChat(request(), { ...dependencies, loadPrompt: getSystemPrompt });
    assert.equal(response.status, 503);
    assert.equal(await response.text(), UNAVAILABLE);
    assert.equal(model.doStreamCalls.length, 0);
  },
);

test("real HTTP adapter normalizes failure and reads synthetic Markdown only", async (t) => {
  const { dependencies } = fixture();
  t.mock.method(globalThis, "fetch", async () => new Response("private error", { status: 500 }));
  const failure = await answerChat(request(), { ...dependencies, loadPrompt: getSystemPrompt });
  assert.equal(failure.status, 503);
  assert.equal(await failure.text(), UNAVAILABLE);
  globalThis.fetch.mock.mockImplementation(
    async () => new Response("# Fictional candidate\nBuilt demo systems."),
  );
  const prompt = await getSystemPrompt(new AbortController().signal);
  assert.match(prompt, /# Fictional candidate\nBuilt demo systems/);
});

function chatFixture() {
  let providerSignal;
  const model = new MockLanguageModelV4({
    doStream: ({ abortSignal }) => {
      providerSignal = abortSignal;
      if (model.doStreamCalls.length > 1) return { stream: ReadableStream.from(answerParts) };
      return {
        stream: new ReadableStream({
          start(controller) {
            for (const part of answerParts.slice(0, 6)) controller.enqueue(part);
            abortSignal.addEventListener("abort", () => controller.error(abortSignal.reason), {
              once: true,
            });
          },
        }),
      };
    },
  });
  const { dependencies } = fixture();
  const chat = new Chat({
    transport: new DefaultChatTransport({
      api: "http://localhost/api/chat",
      fetch: (url, init) =>
        answerChat(new Request(url, init), { ...dependencies, getModel: () => model }),
    }),
  });
  return { chat, model, getSignal: () => providerSignal };
}

test(
  "a visitor abort while streaming emits an abort without exposing its reason",
  { timeout: 5000 },
  async () => {
    const abort = new AbortController();
    const started = Promise.withResolvers();
    const model = new MockLanguageModelV4({
      doStream: ({ abortSignal }) => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: [] });
            abortSignal.addEventListener("abort", () => controller.error(abortSignal.reason), {
              once: true,
            });
            started.resolve();
          },
        }),
      }),
    });
    const response = await answerChat(request([user()], abort.signal), {
      ...fixture().dependencies,
      getModel: () => model,
    });
    const body = response.text();
    await started.promise;
    abort.abort(new Error("private abort reason"));
    const text = await body;
    assert.doesNotMatch(text, /private abort reason/);
    assert.ok(chunks(text).some((part) => part.type === "abort"));
    assert.ok(!chunks(text).some((part) => part.type === "error"));
  },
);

async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await delay(5);
  }
  assert.fail("chat did not reach the expected state");
}

test(
  "SDK Stop → follow-up retains partial history and cancels provider work",
  { timeout: 5000 },
  async () => {
    const { chat, model, getSignal } = chatFixture();
    const first = chat.sendMessage({ text: "First question" });
    await waitFor(() => chat.messages.at(-1)?.parts.some((part) => part.type === "text"));
    await chat.stop();
    await first;
    assert.equal(getSignal().aborted, true);
    assert.equal(chat.status, "ready");
    await chat.sendMessage({ text: "Follow-up question" });
    assert.equal(chat.error, undefined);
    assert.equal(chat.status, "ready");
    assert.equal(model.doStreamCalls.length, 2);
    assert.deepEqual(
      chat.messages
        .filter((message) => message.role === "user")
        .map((message) => message.parts[0].text),
      ["First question", "Follow-up question"],
    );
  },
);

test(
  "SDK New conversation → immediate send cannot restore the cancelled response",
  { timeout: 5000 },
  async () => {
    const { chat, model } = chatFixture();
    const first = chat.sendMessage({ text: "Old question" });
    await waitFor(() => chat.messages.at(-1)?.parts.some((part) => part.type === "text"));
    void chat.stop();
    chat.messages = [];
    await chat.sendMessage({ text: "Fresh question" });
    await first;
    assert.equal(chat.error, undefined);
    assert.equal(chat.status, "ready");
    assert.equal(chat.messages.length, 2);
    assert.equal(chat.messages[0].parts[0].text, "Fresh question");
    assert.doesNotMatch(JSON.stringify(model.doStreamCalls[1].prompt), /Old question/);
  },
);

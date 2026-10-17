import assert from "node:assert/strict";
import { z } from "zod";
import { afterEach, beforeEach, test, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { validateUIMessages } from "ai";

const originalKey = process.env.FREELLM_API_KEY;

beforeEach(() => {
  process.env.FREELLM_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();

  if (originalKey === undefined) {
    delete process.env.FREELLM_API_KEY;
  } else {
    process.env.FREELLM_API_KEY = originalKey;
  }
});

const question = {
  id: "question",
  role: "user",
  parts: [{ type: "text", text: "What did Lucas build?" }],
};

const JsonPayload = z.json();

type RequestPayload = z.infer<typeof JsonPayload>;

const ProviderRequest = z.object({
  model: z.string(),
  messages: z.array(z.object({ role: z.string(), content: z.json() })),
});

type ProviderRequestBody = z.infer<typeof ProviderRequest>;

function request(body: RequestPayload, signal?: AbortSignal) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

test("a missing server key reaches Railway and uses the normal provider error stream", async () => {
  delete process.env.FREELLM_API_KEY;
  vi.spyOn(console, "error").mockImplementation(() => {});

  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const upstreamRequest = new Request(input, init);

      if (upstreamRequest.url.endsWith("/resume.md")) {
        return new Response("Lucas's public resume.");
      }

      assert.equal(
        upstreamRequest.url,
        "https://freellmapi-production-1175.up.railway.app/v1/chat/completions",
      );
      assert.equal(upstreamRequest.headers.has("Authorization"), false);
      assert.equal(ProviderRequest.parse(await upstreamRequest.json()).model, "auto");

      return Response.json(
        { error: { message: "Invalid API key", type: "authentication_error" } },
        { status: 401 },
      );
    });

  const response = await POST(request({ messages: [question] }));
  const stream = await response.text();

  assert.equal(response.status, 200);
  assert.match(stream, /"type":"error"/);
  assert.match(stream, /temporarily unavailable/);
  assert.doesNotMatch(stream, /Invalid API key/);
  assert.equal(upstream.mock.calls.length, 2);
});

test("malformed requests return 400 before fetching the resume or calling the model", async () => {
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.reject(new Error("Unexpected upstream request")));

  const invalidBodies: RequestPayload[] = [
    null,
    [],
    {},
    { messages: null },
    { messages: [null] },
    { messages: [] },
    { messages: [{ role: "user", parts: question.parts }] },
    { messages: [{ ...question, parts: "not an array" }] },
    { messages: [{ ...question, parts: [{ type: "text", text: 42 }] }] },
    { messages: [{ ...question, parts: [{ type: "text" }] }] },
    { messages: [{ ...question, parts: [{ type: "text", text: "", state: "invalid" }] }] },
    { messages: [{ ...question, parts: [] }] },
    { messages: [{ ...question, parts: [{ type: "text", text: "  \n " }] }] },
    { messages: [{ ...question, parts: [{ type: "reasoning", text: "Thinking." }] }] },
    { messages: [{ ...question, parts: [{ type: "text", text: "x".repeat(128_000) }] }] },
    { messages: [{ ...question, role: "invalid-role" }] },
    { messages: [{ ...question, role: "system" }] },
  ];

  await Promise.all(
    invalidBodies.map((body) =>
      POST(request(body)).then(async (response) => {
        assert.equal(response.status, 400, JSON.stringify(body));
        assert.match(await response.text(), /conversation is invalid or too long/);

        return response;
      }),
    ),
  );

  const malformed = await POST(
    new Request("http://localhost/api/chat", { method: "POST", body: "{" }),
  );

  assert.equal(malformed.status, 400);
  assert.equal(upstream.mock.calls.length, 0);
});

test("valid history streams a follow-up answer without reasoning", async () => {
  let providerBody: ProviderRequestBody | undefined;
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const upstreamRequest = new Request(input, init);
      const { url } = upstreamRequest;

      if (url.endsWith("/resume.md")) {
        return new Response("Lucas built an AI grocery agent.");
      }

      assert.equal(url, "https://freellmapi-production-1175.up.railway.app/v1/chat/completions");
      assert.equal(upstreamRequest.headers.get("Authorization"), "Bearer test-key");
      providerBody = ProviderRequest.parse(await upstreamRequest.json());

      const chunks = [
        { choices: [{ delta: { role: "assistant", reasoning: "Checking the resume." } }] },
        { choices: [{ delta: { content: "Lucas built an AI grocery agent." } }] },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        },
      ];

      const stream = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("");

      return new Response(`${stream}data: [DONE]\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  );

  const history: RequestPayload[] = [
    { id: "stopped-answer", role: "assistant", parts: [{ type: "step-start" }] },
    { ...question, id: "first-question" },
    {
      id: "first-answer",
      role: "assistant",
      parts: [
        { type: "step-start" },
        { type: "reasoning", text: "Checking the resume.", state: "done" },
        { type: "text", text: "He built", state: "done" },
        { type: "text", text: " " },
        { type: "text", text: "a grocery agent.", state: "done" },
        { type: "file", mediaType: "text/plain", url: "https://example.com/private.txt" },
      ],
      metadata: { private: "Client metadata" },
    },
    {
      ...question,
      metadata: { instructions: "INJECTED metadata" },
      parts: [
        {
          type: "text",
          text: "What did Lucas build?",
          providerMetadata: { openrouter: { instructions: "INJECTED provider metadata" } },
        },
        { type: "file", mediaType: "text/plain", url: "https://attacker.invalid/INJECTED" },
        { type: "data-instructions", data: "INJECTED data" },
        {
          type: "dynamic-tool",
          toolName: "INJECTED",
          toolCallId: "untrusted",
          state: "input-available",
          input: { instructions: "INJECTED tool" },
        },
      ],
    },
    { id: "empty-answer", role: "assistant", parts: [] },
  ];

  const response = await POST(request({ messages: history }));
  const stream = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type") ?? "", /text\/event-stream/);
  assert.doesNotMatch(stream, /"type":"reasoning/);
  assert.match(stream, /"type":"text-delta"/);
  assert.match(stream, /Lucas built an AI grocery agent/);
  assert.match(stream, /"type":"finish"/);
  assert.doesNotMatch(stream, /"type":"error"/);
  assert.equal(providerBody?.model, "auto");
  assert.doesNotMatch(
    JSON.stringify(providerBody),
    /Checking the resume|private\.txt|Client metadata|stopped-answer/,
  );
  assert.deepEqual(
    providerBody?.messages.map((message) => message.role),
    ["system", "user", "assistant", "user"],
  );
  assert.match(
    JSON.stringify(providerBody?.messages[0].content),
    /Lucas built an AI grocery agent/,
  );
  assert.match(JSON.stringify(providerBody?.messages), /He built a grocery agent\./);
  assert.doesNotMatch(JSON.stringify(providerBody?.messages), /INJECTED|attacker/);
  assert.doesNotMatch(JSON.stringify(providerBody?.messages), /Checking the resume/);
});

test("a resume outage returns a useful 503 response", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("Source outage details", { status: 503 }));

  const response = await POST(request({ messages: [question] }));

  assert.equal(response.status, 503);
  assert.match(await response.text(), /temporarily unavailable/);
  assert.equal(upstream.mock.calls.length, 1);
});

test("a model failure becomes a safe error in the response stream", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const { url } = new Request(input);

    if (url.endsWith("/resume.md")) {
      return Promise.resolve(new Response("Lucas's public resume."));
    }

    return Promise.resolve(
      Response.json({ error: { message: "Private provider error", code: 400 } }, { status: 400 }),
    );
  });

  const response = await POST(request({ messages: [question] }));
  const stream = await response.text();

  assert.equal(response.status, 200);
  assert.match(stream, /"type":"error"/);
  assert.match(stream, /temporarily unavailable/);
  assert.doesNotMatch(stream, /Private provider error/);
});

test.each([
  { ...question, parts: [] },
  { ...question, parts: [{ type: "text", text: "" }] },
  { ...question, parts: [{ type: "text", text: " \n\t " }] },
  { ...question, parts: [{ type: "reasoning", text: "Hidden reasoning" }] },
  { ...question, parts: [{ type: "step-start" }] },
])("a history without usable text returns 400 before any upstream request: %j", async (message) => {
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.reject(new Error("Unexpected upstream request")));

  const response = await POST(request({ messages: [message] }));

  assert.equal(response.status, 400);
  assert.match(await response.text(), /conversation is invalid or too long/);
  assert.equal(upstream.mock.calls.length, 0);
});

test("oversized requests return 400 before any upstream request", async () => {
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.reject(new Error("Unexpected upstream request")));

  const response = await POST(
    request({ messages: [{ ...question, parts: [{ type: "text", text: "x".repeat(128_001) }] }] }),
  );

  assert.equal(response.status, 400);
  assert.equal(upstream.mock.calls.length, 0);
});

test("real SDK structure validation alone permits histories excluded by app policy", async () => {
  await assert.rejects(validateUIMessages({ messages: [] }));
  await assert.rejects(validateUIMessages({ messages: [{ ...question, parts: [] }] }));

  await Promise.all(
    [
      [{ ...question, role: "assistant", parts: [] }],
      [{ ...question, parts: [{ type: "text", text: "" }] }],
      [{ ...question, role: "system" }],
    ].map(async (messages) => {
      assert.deepEqual(await validateUIMessages({ messages }), messages);
    }),
  );
});

const malformedUIParts: Record<string, RequestPayload>[] = [
  { type: "text", text: "Question", state: "invalid-state" },
  { type: "text", text: "Question", providerMetadata: "invalid-metadata" },
  { type: "file", mediaType: "text/plain" },
  { type: "unknown-part", text: "Unsupported input" },
];

test.each(malformedUIParts)(
  "SDK rejects malformed UI parts before any upstream access: %j",
  async (part) => {
    const upstream = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected upstream"));

    const response = await POST(
      request({ messages: [{ ...question, parts: [...question.parts, part] }] }),
    );

    assert.equal(response.status, 400);
    assert.match(await response.text(), /conversation is invalid or too long/);
    assert.equal(upstream.mock.calls.length, 0);
  },
);

test("UTF-8 byte limit rejects a structurally valid history below the character limit", async () => {
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected upstream"));

  const body = {
    messages: [{ ...question, parts: [{ type: "text", text: "💬".repeat(33_000) }] }],
  };

  assert.ok(JSON.stringify(body).length < 128_000);
  assert.ok(new TextEncoder().encode(JSON.stringify(body)).byteLength > 128_000);
  const response = await POST(request(body));
  assert.equal(response.status, 400);
  assert.equal(upstream.mock.calls.length, 0);
});

test("a structurally valid oversized history is rejected before upstream access", async () => {
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected upstream"));

  const messages = Array.from({ length: 2_000 }, (_, index) => ({
    ...question,
    id: `message-${index}`,
  }));

  await validateUIMessages({ messages });
  const response = await POST(request({ messages }));
  assert.equal(response.status, 400);
  assert.equal(upstream.mock.calls.length, 0);
});

test("request cancellation aborts resume loading before model access", async () => {
  const controller = new AbortController();
  const started = Promise.withResolvers<AbortSignal>();

  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const upstreamRequest = new Request(input, init);
      assert.ok(upstreamRequest.url.endsWith("/resume.md"));
      started.resolve(upstreamRequest.signal);

      return new Promise<Response>((_resolve, reject) => {
        upstreamRequest.signal.addEventListener(
          "abort",
          () => reject(new DOMException("Private abort detail", "AbortError")),
          { once: true },
        );
      });
    });

  const pending = POST(request({ messages: [question] }, controller.signal));
  const signal = await started.promise;
  controller.abort();
  const response = await pending;
  assert.equal(signal.aborted, true);
  assert.equal(response.status, 503);
  assert.match(await response.text(), /temporarily unavailable/);
  assert.equal(upstream.mock.calls.length, 1);
});

test("request cancellation reaches the model stream without exposing provider details", async () => {
  const controller = new AbortController();
  const started = Promise.withResolvers<AbortSignal>();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const upstreamRequest = new Request(input, init);

      if (upstreamRequest.url.endsWith("/resume.md")) {
        return Promise.resolve(new Response("Public fixture resume."));
      }

      started.resolve(upstreamRequest.signal);

      return new Promise<Response>((_resolve, reject) => {
        upstreamRequest.signal.addEventListener(
          "abort",
          () => reject(new DOMException("Private model abort detail", "AbortError")),
          { once: true },
        );
      });
    },
  );
  const response = await POST(request({ messages: [question] }, controller.signal));
  const pending = response.text();
  const signal = await started.promise;
  controller.abort();
  assert.equal(signal.aborted, true);
  assert.doesNotMatch(await pending, /Private model abort detail/);
});

test.each([
  { messages: [{ ...question, parts: [{ type: "text", text: "x".repeat(127_000) }] }] },
  {
    messages: Array.from({ length: 128 }, (_, index) => ({
      ...question,
      id: `turn-${index}`,
      role: index % 2 ? "assistant" : "user",
    })),
  },
])(
  "valid text/history within the byte budget reaches the real SDK model conversion",
  async ({ messages }) => {
    let providerBody: ProviderRequestBody | undefined;

    const upstream = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const upstreamRequest = new Request(input, init);

        if (upstreamRequest.url.endsWith("/resume.md")) {
          return new Response("Public fixture resume.");
        }

        providerBody = ProviderRequest.parse(await upstreamRequest.json());

        return new Response(
          'data: {"choices":[{"delta":{"role":"assistant","content":"Fixture answer."}}]}\n\n' +
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
            "data: [DONE]\n\n",
          { headers: { "Content-Type": "text/event-stream" } },
        );
      });

    assert.ok(new TextEncoder().encode(JSON.stringify({ messages })).byteLength <= 128_000);
    const response = await POST(request({ messages }));
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Fixture answer/);
    assert.equal(upstream.mock.calls.length, 2);
    assert.deepEqual(
      providerBody?.messages.map(({ role }) => role),
      ["system", ...messages.map(({ role }) => role)],
    );
    assert.equal(providerBody?.messages.at(-1)?.content, messages.at(-1)?.parts[0].text);
  },
);

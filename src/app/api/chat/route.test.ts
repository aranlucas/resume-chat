import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import { POST } from "@/app/api/chat/route";

const originalKey = process.env.OPENROUTER_API_KEY;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});

const question = {
  id: "question",
  role: "user",
  parts: [{ type: "text", text: "What did Lucas build?" }],
};

interface ProviderMessage {
  role: string;
  content: unknown;
}

interface ProviderOptions {
  sort: string;
}

interface ProviderReasoning {
  effort: string;
}

interface ProviderRequestBody {
  model: string;
  models?: string[];
  provider: ProviderOptions;
  reasoning?: ProviderReasoning;
  messages: ProviderMessage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProviderRequestBody(value: unknown): value is ProviderRequestBody {
  return (
    isRecord(value) &&
    typeof value.model === "string" &&
    isRecord(value.provider) &&
    typeof value.provider.sort === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(
      (message) => isRecord(message) && typeof message.role === "string" && "content" in message,
    )
  );
}

function request(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("a missing server key returns 503 without making an upstream request", async () => {
  process.env.OPENROUTER_API_KEY = " ";
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.reject(new Error("Unexpected upstream request")));

  const response = await POST(request({ messages: [question] }));

  assert.equal(response.status, 503);
  assert.match(await response.text(), /temporarily unavailable/);
  assert.equal(upstream.mock.calls.length, 0);
});

test("malformed requests return 400 before fetching the resume or calling the model", async () => {
  const upstream = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.reject(new Error("Unexpected upstream request")));
  const invalidBodies = [
    null,
    [],
    {},
    { messages: null },
    { messages: [null] },
    { messages: [] },
    { messages: [{ role: "user", parts: question.parts }] },
    { messages: [{ ...question, parts: "not an array" }] },
    { messages: [{ ...question, parts: [{ type: "text", text: 42 }] }] },
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
    (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/resume.md")) {
        return Promise.resolve(new Response("Lucas built an AI grocery agent."));
      }
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      assert.ok(init && typeof init.body === "string");
      const parsedBody: unknown = JSON.parse(init.body);
      assert.ok(isProviderRequestBody(parsedBody));
      providerBody = parsedBody;

      const chunks = [
        { choices: [{ delta: { role: "assistant", reasoning: "Checking the resume." } }] },
        { choices: [{ delta: { content: "Lucas built an AI grocery agent." } }] },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        },
      ];
      const stream = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("");
      return Promise.resolve(
        new Response(`${stream}data: [DONE]\n\n`, {
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    },
  );
  const history = [
    { ...question, id: "first-question" },
    {
      id: "first-answer",
      role: "assistant",
      parts: [
        { type: "step-start" },
        { type: "reasoning", text: "Checking the resume.", state: "done" },
        { type: "text", text: "He built a grocery agent.", state: "done" },
      ],
    },
    question,
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
  assert.equal(providerBody?.model, "apodex/apodex-1.1-mini:free");
  assert.equal(providerBody?.models?.length, 3);
  assert.equal(providerBody?.reasoning?.effort, "none");
  assert.equal(providerBody?.provider.sort, "latency");
  assert.deepEqual(
    providerBody?.messages.map((message) => message.role),
    ["system", "user", "assistant", "user"],
  );
  assert.match(
    JSON.stringify(providerBody?.messages[0].content),
    /Lucas built an AI grocery agent/,
  );
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
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
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

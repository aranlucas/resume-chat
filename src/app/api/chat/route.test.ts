import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { POST } from "@/app/api/chat/route";

const originalKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.OPENROUTER_MODEL;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL = "";
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.OPENROUTER_MODEL;
  else process.env.OPENROUTER_MODEL = originalModel;
});

const question = {
  id: "question",
  role: "user",
  parts: [{ type: "text", text: "What did Lucas build?" }],
};

function request(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("a missing server key returns 503 without making an upstream request", async (t) => {
  process.env.OPENROUTER_API_KEY = " ";
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected upstream request");
  });

  const response = await POST(request({ messages: [question] }));

  assert.equal(response.status, 503);
  assert.match(await response.text(), /temporarily unavailable/);
  assert.equal(upstream.mock.callCount(), 0);
});

test("malformed requests return 400 before fetching the resume or calling the model", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected upstream request");
  });
  const invalidBodies = [
    null,
    [],
    {},
    { messages: null },
    { messages: [null] },
    { messages: [{ role: "user", parts: question.parts }] },
    { messages: [{ ...question, parts: "not an array" }] },
    { messages: [{ ...question, parts: [{ type: "text", text: 42 }] }] },
    { messages: [{ ...question, role: "invalid-role" }] },
  ];

  await Promise.all(
    invalidBodies.map(async (body) => {
      const response = await POST(request(body));
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.match(await response.text(), /conversation is invalid or too long/);
    }),
  );

  const malformed = await POST(
    new Request("http://localhost/api/chat", { method: "POST", body: "{" }),
  );
  assert.equal(malformed.status, 400);
  assert.equal(upstream.mock.callCount(), 0);
});

test("valid history streams follow-up answers and rejects assistant continuations", async (t) => {
  let providerBody:
    | {
        model: string;
        provider: { sort: string };
        messages: { role: string; content: unknown }[];
      }
    | undefined;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/resume.md")) return new Response("Lucas built an AI grocery agent.");
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    providerBody = JSON.parse(String(init?.body));

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
  });
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
  assert.match(stream, /"type":"reasoning-delta"/);
  assert.match(stream, /"type":"text-delta"/);
  assert.match(stream, /Lucas built an AI grocery agent/);
  assert.match(stream, /"type":"finish"/);
  assert.doesNotMatch(stream, /"type":"error"/);
  assert.equal(providerBody?.model, "openrouter/free");
  assert.equal(providerBody?.provider.sort, "latency");
  assert.deepEqual(
    providerBody?.messages.map((message) => message.role),
    ["system", "user", "assistant", "user"],
  );
  assert.match(
    JSON.stringify(providerBody?.messages[0].content),
    /Lucas built an AI grocery agent/,
  );

  const continuation = await POST(
    request({
      messages: [
        ...history,
        { id: "partial-answer", role: "assistant", parts: [{ type: "text", text: "Lucas built" }] },
      ],
    }),
  );
  assert.equal(continuation.status, 400);
  assert.match(await continuation.text(), /conversation is invalid or too long/);
  assert.equal(providerBody?.messages.at(-1)?.role, "user");
});

test("a resume outage returns a useful 503 response", async (t) => {
  t.mock.method(console, "error", () => {});
  const upstream = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Source outage details", { status: 503 }),
  );

  const response = await POST(request({ messages: [question] }));

  assert.equal(response.status, 503);
  assert.match(await response.text(), /temporarily unavailable/);
  assert.equal(upstream.mock.callCount(), 1);
});

test("a model failure becomes a safe error in the response stream", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/resume.md")) return new Response("Lucas's public resume.");
    return Response.json(
      { error: { message: "Private provider error", code: 400 } },
      { status: 400 },
    );
  });

  const response = await POST(request({ messages: [question] }));
  const stream = await response.text();

  assert.equal(response.status, 200);
  assert.match(stream, /"type":"error"/);
  assert.match(stream, /temporarily unavailable/);
  assert.doesNotMatch(stream, /Private provider error/);
});

import { SYSTEM_PROMPT } from "@/lib/resume";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30;

// Free OpenRouter model used by default. Override with OPENROUTER_MODEL, e.g.
// "openrouter/free" (auto-router) or any other ":free" model.
// See https://openrouter.ai/collections/free-models for the live list.
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 500 });
  }

  let messages: UIMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: UIMessage[] });
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages must be a non-empty array." }, { status: 422 });
  }

  const result = streamText({
    model: openrouter.chat(process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

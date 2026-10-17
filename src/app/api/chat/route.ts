import { getSystemPrompt } from "@/lib/resume";
import { openrouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

// Free providers can take longer to start streaming during busy periods.
export const maxDuration = 60;

// Free OpenRouter models, tried in order when one is rate limited or down.
// Every free model reasons by default, and the page never shows reasoning, so
// it's turned off: apodex then answers in ~1-3s versus ~4-11s for
// "openrouter/free", which also can't be asked to skip reasoning (it routes to
// a safety classifier instead). See
// https://openrouter.ai/collections/free-models for the live list.
const FREE_MODELS = [
  "apodex/apodex-1.1-mini:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
];

const UNAVAILABLE = "The assistant is temporarily unavailable. Please try again in a moment.";

const INVALID =
  "The conversation is invalid or too long. Please shorten your question or start a new conversation.";

// The whole history is resent with each question, so bound its UTF-8 byte size.
const MAX_BODY_BYTES = 128_000;

// The SDK owns message/part structure; this schema only reads the HTTP envelope.
const ChatRequest = z.object({ messages: z.unknown() });

export async function POST(req: Request) {
  let messages: UIMessage[];

  try {
    const body = await req.arrayBuffer();

    if (body.byteLength > MAX_BODY_BYTES) {
      throw new Error("Body too large");
    }

    const validated = await validateUIMessages({
      messages: ChatRequest.parse(JSON.parse(new TextDecoder().decode(body))).messages,
    });

    // Client instructions cannot replace the server-owned resume prompt.
    if (validated.some((message) => message.role !== "user" && message.role !== "assistant")) {
      throw new Error("Unsupported role");
    }

    // Only plain text reaches the model, without client metadata/tool payloads.
    // Preserve whitespace parts inside real answers; discard stopped/empty ones.
    messages = validated
      .map(({ id, role, parts }) => ({
        id,
        role,
        parts: parts.flatMap((part) =>
          part.type === "text" && part.text ? [{ type: "text" as const, text: part.text }] : [],
        ),
      }))
      .filter((message) => message.parts.some((part) => part.text.trim().length > 0));

    if (messages.length === 0) {
      throw new Error("No usable text");
    }
  } catch {
    return new Response(INVALID, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return new Response(UNAVAILABLE, { status: 503 });
  }

  let instructions: string;

  try {
    instructions = await getSystemPrompt(
      AbortSignal.any([req.signal, AbortSignal.timeout(10_000)]),
    );
  } catch {
    return new Response(UNAVAILABLE, { status: 503 });
  }

  const result = streamText({
    model: openrouter.chat(FREE_MODELS[0], {
      models: FREE_MODELS,
      reasoning: { effort: "none" },
      provider: { sort: "latency" },
    }),
    instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    maxOutputTokens: 2_048,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: false,
      // Provider errors can include internal details; visitors get a generic message.
      onError: () => UNAVAILABLE,
    }),
  });
}

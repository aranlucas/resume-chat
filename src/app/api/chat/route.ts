import { getSystemPrompt } from "@/lib/resume";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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

    // Keep assistant reasoning for follow-up requests, without client metadata/tool payloads.
    messages = validated
      .map(({ id, role, parts }) => ({
        id,
        role,
        parts: parts.flatMap((part) =>
          (part.type === "text" || (role === "assistant" && part.type === "reasoning")) && part.text
            ? [{ type: part.type, text: part.text }]
            : [],
        ),
      }))
      .filter((message) => message.parts.some((part) => part.text.trim().length > 0));

    if (messages.length === 0) {
      throw new Error("No usable content");
    }
  } catch {
    return new Response(INVALID, { status: 400 });
  }

  let instructions: string;

  try {
    instructions = await getSystemPrompt(
      AbortSignal.any([req.signal, AbortSignal.timeout(10_000)]),
    );
  } catch {
    return new Response(UNAVAILABLE, { status: 503 });
  }

  const freellm = createOpenAICompatible({
    name: "freellmapi",
    baseURL: "https://freellmapi-production-1175.up.railway.app/v1",
    apiKey: process.env.FREELLM_API_KEY,
  });

  const result = streamText({
    model: freellm("auto"),
    instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    maxOutputTokens: 2_048,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Provider errors can include internal details; visitors get a generic message.
      onError: () => UNAVAILABLE,
    }),
  });
}

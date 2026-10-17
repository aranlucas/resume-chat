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

// The whole history is resent with each question, so this caps the prompt size.
const MAX_BODY_CHARS = 128_000;

// validateUIMessages checks the message shapes; this only extracts the field.
const ChatRequest = z.object({ messages: z.unknown() });

export async function POST(req: Request) {
  let messages: UIMessage[];

  try {
    const body = await req.text();

    if (body.length > MAX_BODY_CHARS) {
      throw new Error("Body too large");
    }

    const payload = ChatRequest.parse(JSON.parse(body));
    messages = await validateUIMessages({ messages: payload.messages });

    if (messages.length === 0 || messages.some((message) => message.role === "system")) {
      throw new Error("Unsupported conversation");
    }

    // Only text reaches the model; omit reasoning, files, and client metadata.
    messages = messages
      .map(({ id, role, parts }) => ({
        id,
        role,
        parts: parts.flatMap((part) =>
          part.type === "text" && part.text.trim()
            ? [{ type: "text" as const, text: part.text }]
            : [],
        ),
      }))
      .filter((message) => message.parts.length > 0);

    if (messages.length === 0) {
      throw new Error("No conversation text");
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
      sendReasoning: false,
      // Provider errors can include internal details; visitors get a generic message.
      onError: () => UNAVAILABLE,
    }),
  });
}

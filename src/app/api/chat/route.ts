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

// Free providers can take longer to start streaming during busy periods.
export const maxDuration = 60;

const UNAVAILABLE = "The assistant is temporarily unavailable. Please try again in a moment.";

const INVALID = "The conversation is invalid. Please start a new conversation.";

export async function POST(req: Request) {
  let messages: UIMessage[];

  try {
    messages = await validateUIMessages({
      // oxlint-disable-next-line typescript/no-unsafe-member-access -- The SDK validates this untrusted input.
      messages: (await req.json()).messages,
    });
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

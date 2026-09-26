import { getSystemPrompt } from "@/lib/resume";
import { openrouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

// Free providers can take longer to start streaming during busy periods.
export const maxDuration = 60;

// Free OpenRouter model. Override with OPENROUTER_MODEL, e.g. "openrouter/free".
// See https://openrouter.ai/collections/free-models for the live list.
const DEFAULT_MODEL = "openrouter/free";

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return new Response("The assistant is temporarily unavailable. Please try again later.", {
      status: 503,
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  // Reasoning is streamed only so the client can show a "thinking" state; it
  // isn't displayed, and there's no need to send it back to the model.
  const history = messages.map((m) => ({
    ...m,
    parts: m.parts.filter((part) => part.type !== "reasoning"),
  }));

  const result = streamText({
    model: openrouter.chat(process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL),
    instructions: await getSystemPrompt(),
    messages: await convertToModelMessages(history),
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: true,
      onError: () => "The assistant is temporarily unavailable. Please try again in a moment.",
    }),
  });
}

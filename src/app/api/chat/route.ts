import { getSystemPrompt } from "@/lib/resume";
import { openrouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
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

// The whole history is resent with each question, so this caps the prompt size.
const MAX_BODY_CHARS = 128_000;

// Only user and assistant text reaches the model; anything else the client
// sends (step markers, metadata, system messages) is dropped.
const ChatRequest = z.object({
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        parts: z
          .array(z.object({ type: z.string(), text: z.string().optional() }))
          .transform((parts) =>
            parts.flatMap((part) =>
              part.type === "text" && part.text ? [{ type: "text" as const, text: part.text }] : [],
            ),
          ),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  let messages: z.infer<typeof ChatRequest>["messages"];
  try {
    const body = await req.text();
    if (body.length > MAX_BODY_CHARS) throw new Error("Body too large");
    ({ messages } = ChatRequest.parse(JSON.parse(body)));
  } catch {
    return new Response(INVALID, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY?.trim()) return new Response(UNAVAILABLE, { status: 503 });

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
    // A stopped answer can have no text left; providers reject empty messages.
    messages: await convertToModelMessages(messages.filter((m) => m.parts.length > 0)),
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

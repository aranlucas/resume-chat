import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessageChunk,
} from "ai";
import { z } from "zod";

const MAX_BODY_BYTES = 128 * 1024;
const MAX_QUESTION_CHARS = 4_000;
const MAX_MESSAGE_CHARS = 16_000;
const MAX_CONVERSATION_CHARS = 48_000;

const UNAVAILABLE = "The assistant is temporarily unavailable. Please try again in a moment.";
const INVALID =
  "The conversation is invalid or too long. Please shorten your question or start a new conversation.";

const TextPart = z.object({ type: z.literal("text"), text: z.string() });
const Message = z.discriminatedUnion("role", [
  z.object({
    id: z.string().min(1).max(128),
    role: z.literal("user"),
    parts: z.array(TextPart).min(1).max(16),
  }),
  z.object({
    id: z.string().min(1).max(128),
    role: z.literal("assistant"),
    // A stopped response may contain only reasoning, a step marker, or no parts.
    parts: z
      .array(
        z.union([
          TextPart,
          z.object({ type: z.literal("reasoning"), text: z.string() }),
          z.object({ type: z.literal("step-start") }),
        ]),
      )
      .max(16),
  }),
]);
const ChatRequest = z
  .object({ messages: z.array(Message).min(1).max(40) })
  .refine(({ messages }) => {
    let total = 0;
    for (const message of messages) {
      const text = message.parts.map((part) => ("text" in part ? part.text : "")).join("");
      const limit = message.role === "user" ? MAX_QUESTION_CHARS : MAX_MESSAGE_CHARS;
      if (text.length > limit || (message.role === "user" && !text.trim())) return false;
      total += text.length;
    }
    return (
      messages[0].role === "user" &&
      messages.at(-1)?.role === "user" &&
      total <= MAX_CONVERSATION_CHARS
    );
  });

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let size = 0;
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  request.signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      request.signal.throwIfAborted();
      // Streaming reads are intentionally sequential and bounded.
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      request.signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      // Count actual bytes, including unknown fields, rather than trusting Content-Length.
      if (size > MAX_BODY_BYTES) throw new Error("Body too large");
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    request.signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}

function cancelled() {
  return new Response(null, { status: 499 });
}

// Provider error chunks use onError below; a transport can instead reject the stream itself.
function safeStream(stream: ReadableStream<UIMessageChunk>, signal: AbortSignal) {
  const reader = stream.getReader();
  let closed = false;
  return new ReadableStream<UIMessageChunk>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (closed) return;
        if (done) {
          closed = true;
          reader.releaseLock();
          controller.close();
        } else {
          // SDK deadlines are server failures, while a visitor pressing Stop is expected.
          controller.enqueue(
            value.type === "abort"
              ? signal.aborted
                ? { type: "abort" }
                : { type: "error", errorText: UNAVAILABLE }
              : value,
          );
        }
      } catch {
        if (closed) return;
        closed = true;
        reader.releaseLock();
        controller.enqueue(
          signal.aborted ? { type: "abort" } : { type: "error", errorText: UNAVAILABLE },
        );
        controller.close();
      }
    },
    async cancel(reason) {
      if (closed) return;
      closed = true;
      try {
        await reader.cancel(reason);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/** The HTTP chat interface; production and fixture adapters share the same validation/stream. */
export async function answerChat(
  request: Request,
  dependencies: {
    getModel: () => LanguageModel | undefined;
    loadPrompt: (signal: AbortSignal) => Promise<string>;
  },
): Promise<Response> {
  if (request.signal.aborted) return cancelled();

  let parsed: z.infer<typeof ChatRequest>;
  try {
    // Zod strips client metadata/provider options; only supported conversation content is sent.
    parsed = ChatRequest.parse(await readBody(request));
  } catch {
    return request.signal.aborted ? cancelled() : new Response(INVALID, { status: 400 });
  }

  try {
    request.signal.throwIfAborted();
    const model = dependencies.getModel();
    if (!model) return new Response(UNAVAILABLE, { status: 503 });
    const promptSignal = AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]);
    const instructions = await dependencies.loadPrompt(promptSignal);
    promptSignal.throwIfAborted();
    const messages = await convertToModelMessages(parsed.messages);
    request.signal.throwIfAborted();
    const result = streamText({
      model,
      instructions,
      messages,
      abortSignal: request.signal,
      maxOutputTokens: 2_048,
      timeout: 45_000,
    });
    return createUIMessageStreamResponse({
      stream: safeStream(
        toUIMessageStream({
          stream: result.stream,
          sendReasoning: true,
          onError: () => UNAVAILABLE,
        }),
        request.signal,
      ),
    });
  } catch {
    return request.signal.aborted ? cancelled() : new Response(UNAVAILABLE, { status: 503 });
  }
}

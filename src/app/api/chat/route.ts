import { answerChat } from "@/lib/chat-answer";
import { getSystemPrompt } from "@/lib/resume";
import { openrouter } from "@openrouter/ai-sdk-provider";

// Free providers can take longer to start streaming during busy periods.
export const maxDuration = 60;

// Free OpenRouter model. Override with OPENROUTER_MODEL, e.g. "openrouter/free".
// See https://openrouter.ai/collections/free-models for the live list.
const DEFAULT_MODEL = "openrouter/free";

export async function POST(req: Request) {
  return answerChat(req, {
    getModel: () =>
      process.env.OPENROUTER_API_KEY?.trim()
        ? openrouter.chat(process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL)
        : undefined,
    loadPrompt: getSystemPrompt,
  });
}

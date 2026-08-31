import PineconeClient from "@/lib/pinecone";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { z } from "zod";

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        parts: z.array(
          z.object({
            type: z.literal("text"),
            text: z.string(),
          }),
        ),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const { messages: uiMessages } = ChatSchema.parse(await req.json());
    const messages = uiMessages.map(({ role, parts }) => ({
      role,
      content: parts.map((part) => part.text).join(""),
    }));
    const pinecone = await PineconeClient();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), {
      pineconeIndex,
    });

    const question = messages[messages.length - 1].content;
    const retriever = vectorStore.asRetriever();
    const docs = await retriever.invoke(question);
    const context = docs.map((d) => d.pageContent).join("\n\n");

    const result = streamText({
      model: openai("gpt-4o"),
      system: `You are a helpful assistant answering questions about Lucas's resume. Use the following context to answer the user's question:\n\n${context}`,
      messages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }
    return new Response(null, { status: 500 });
  }
}

import PineconeClient from "@/lib/pinecone";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { z } from "zod";

const ChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const { messages } = ChatSchema.parse(body);
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

    return result.toTextStreamResponse();
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }
    return new Response(null, { status: 500 });
  }
}

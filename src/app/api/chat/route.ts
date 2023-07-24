import PineconeClient from "@/lib/pinecone";
import { LangChainStream, StreamingTextResponse } from "ai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { AIMessage, HumanMessage, SystemMessage } from "langchain/schema";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { z } from "zod";

// { messages: [ { role: 'user', content: 'hi' } ] }
const ChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["function", "system", "user", "assistant"]),
      content: z.string(),
      id: z.string().optional(),
      createdAt: z.date().optional(),
    })
  ),
});

export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const { messages } = ChatSchema.parse(body);
    const pinecone = await PineconeClient();

    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex }
    );

    const pastMessages = messages.map((m) => {
      if (m.role === "user") {
        return new HumanMessage(m.content);
      }
      if (m.role === "system") {
        return new SystemMessage(m.content);
      }
      return new AIMessage(m.content);
    });

    const { stream, handlers } = LangChainStream();

    const model = new ChatOpenAI({
      temperature: 1,
      streaming: true,
    });

    const questionModel = new ChatOpenAI({
      temperature: 1,
    });

    const chain = ConversationalRetrievalQAChain.fromLLM(
      model,
      vectorStore.asRetriever(),
      {
        questionGeneratorChainOptions: {
          llm: questionModel,
        },
      }
    );

    const question = messages[messages.length - 1].content;

    chain
      .call(
        {
          verbose: true,
          question,
          chat_history: pastMessages,
        },
        [handlers]
      )
      .catch(console.error);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }

    return new Response(null, { status: 500 });
  }
}

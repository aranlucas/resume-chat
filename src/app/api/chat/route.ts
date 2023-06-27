import { LangChainStream } from "@/lib/LangChainStream";
import { PineconeClient } from "@pinecone-database/pinecone";
import { StreamingTextResponse } from "ai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import {
  AIChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import z from "zod";

// { messages: [ { role: 'user', content: 'hi' } ] }
const ChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
      id: z.string().optional(),
      createdAt: z.date().optional(),
    })
  ),
});

export const runtime = "edge";

let pinecone: PineconeClient | null = null;

const initPineconeClient = async () => {
  pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
  });
};

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const { messages } = ChatSchema.parse(body);

    if (pinecone == null) {
      await initPineconeClient();
    }

    const pineconeIndex = pinecone!.Index(process.env.PINECONE_INDEX_NAME!);

    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex }
    );

    const pastMessages = messages.map((m) => {
      if (m.role === "user") {
        return new HumanChatMessage(m.content);
      }
      if (m.role === "system") {
        return new SystemChatMessage(m.content);
      }
      return new AIChatMessage(m.content);
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
          question,
          chat_history: pastMessages,
        },
        [handlers]
      )
      .catch(console.error);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.log(JSON.stringify(error, null, 4));

    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }

    return new Response(null, { status: 500 });
  }
}

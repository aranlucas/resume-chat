import { PineconeClient } from "@pinecone-database/pinecone";
import { LangChainStream, StreamingTextResponse, type Message } from "ai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import {
  AIChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { PineconeStore } from "langchain/vectorstores/pinecone";

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
  const { messages } = (await req.json()) as { messages: Message[] };

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

  const model = new OpenAI({
    streaming: true,
    callbacks: [handlers],
  });

  const nonStreamingModel = new OpenAI({});

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(1),
    {
      memory: new BufferMemory({
        memoryKey: "chat_history", // Must be set to "chat_history"
        chatHistory: new ChatMessageHistory(pastMessages),
      }),
      questionGeneratorChainOptions: {
        llm: nonStreamingModel,
      },
    }
  );

  chain
    .call({
      question: messages[messages.length - 1].content,
    })
    .catch(console.error);

  return new StreamingTextResponse(stream);
}

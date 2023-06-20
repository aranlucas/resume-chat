import { PineconeClient } from "@pinecone-database/pinecone";
import { StreamingTextResponse, LangChainStream, Message } from "ai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { HumanChatMessage, AIChatMessage } from "langchain/schema";
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
  const { messages } = await req.json();

  if (!pinecone) {
    await initPineconeClient();
  }

  const pineconeIndex = pinecone!.Index(process.env.PINECONE_INDEX_NAME!);

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );

  const pastMessages = (messages as Message[]).map((m) =>
    m.role == "user"
      ? new HumanChatMessage(m.content)
      : new AIChatMessage(m.content)
  );

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

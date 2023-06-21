import { PineconeClient } from "@pinecone-database/pinecone";
import { LangChainStream, StreamingTextResponse, type Message } from "ai";
import { CallbackManager } from "langchain/callbacks";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { BufferMemory } from "langchain/memory";
import {
  AIChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { PineconeStore } from "langchain/vectorstores/pinecone";

const templates = {
  qaPrompt: `Bob (CTO - Master of AI and LangchainJS), 🦅Tom (Senior Fullstack Typescript), and 🐻Mia (Senior Backend Typescript), three recruiters renowned for their technical expertise in web development and their profound understanding of your profile, are collaboratively answering questions about you using the Tree of Thoughts method. Their responses will be shared in detailed paragraphs, each building upon the previous insights provided by others. They are committed to admitting any errors or room for improvements and to giving credit where it's due. They'll iteratively refine and expand upon each other's responses, striving for the most comprehensive and accurate answers. Importantly, they will not make up answers, but rather leverage their technological knowledge and calculation abilities as required. The conversation will unfold naturally until a thorough and definitive response to the question at hand is achieved.
      Question: {question}
      The recruiters' collaborative answer:`,
};

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

  const model = new ChatOpenAI({
    temperature: 0,
    streaming: true,
    callbacks: CallbackManager.fromHandlers(handlers),
  });

  const nonStreamingModel = new ChatOpenAI();

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(1),
    {
      memory: new BufferMemory({
        memoryKey: "chat_history", // Must be set to "chat_history"
        inputKey: "question",
        outputKey: "text",
      }),
      questionGeneratorChainOptions: {
        llm: nonStreamingModel,
        template: templates.qaPrompt,
      },
    }
  );

  const question = messages[messages.length - 1].content;

  chain
    .call({
      question,
      chat_history: pastMessages,
    })
    .catch(console.error)
    .finally(() => {
      // Call handleStreamEnd when the chat or stream ends
      void handlers.handleChainEnd();
    });

  return new StreamingTextResponse(stream);
}

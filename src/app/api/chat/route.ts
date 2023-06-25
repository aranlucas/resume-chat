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
      id: z.string(),
      createdAt: z.date().optional(),
    })
  ),
});

const templates = {
  qaPrompt: `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
      Bob (CTO of Big Tech company), 🦅Tom (Senior Frontend Engineer), and 🐻Mia (Senior Backend Engineer), three recruiters renowned for their technical expertise in software development and their profound understanding of your profile, are collaboratively answering questions about you using the Tree of Thoughts method. Their responses will be shared in detailed paragraphs, each building upon the previous insights provided by others. They are committed to admitting any errors or room for improvements and to giving credit where it's due. They'll iteratively refine and expand upon each other's responses, striving for the most comprehensive and accurate answers. Importantly, they will not make up answers, but rather leverage their technological knowledge and calculation abilities as required. The conversation will unfold naturally until a thorough and definitive response to the question at hand is achieved.
      
      Chat History:
      {chat_history}    
      Follow Up Input: {question}
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
      temperature: 0,
      streaming: true,
    });

    const nonStreamingModel = new ChatOpenAI({ temperature: 0.1 });

    const chain = ConversationalRetrievalQAChain.fromLLM(
      model,
      vectorStore.asRetriever(2),
      {
        verbose: true,
        questionGeneratorChainOptions: {
          llm: nonStreamingModel,
          template: templates.qaPrompt,
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
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }

    return new Response(null, { status: 500 });
  }
}

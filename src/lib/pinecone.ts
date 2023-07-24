import { PineconeClient } from "@pinecone-database/pinecone";

async function initPinecone() {
  try {
    const pinecone = new PineconeClient();

    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT ?? "",
      apiKey: process.env.PINECONE_API_KEY ?? "",
    });

    return pinecone;
  } catch (error) {
    console.error(error);
    throw new Error(
      "Failed to initialize Pinecone Client, please make sure you have the correct environment and api keys"
    );
  }
}

export default initPinecone;

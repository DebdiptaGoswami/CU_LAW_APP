import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Starting test...");
  try {
    const question = "Define privity of contract";
    let retrievedChunks = [];
    
    console.log("Initializing Pinecone...");
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log("Generating embedding...");
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embedResponse = await model.embedContent(question);
    const queryVector = embedResponse.embedding.values;
    
    console.log("Querying Pinecone...");
    const index = pinecone.Index('cu-law-index');
    const queryResponse = await index.query({
      vector: queryVector,
      topK: 3,
      includeMetadata: true
    });
    retrievedChunks = queryResponse.matches.map(m => m.metadata.textChunk);
    
    console.log("Retrieved chunks: ", retrievedChunks.length);
    
    const prompt = `You are an expert. Context: ${retrievedChunks.join('\n\n')} Answer this: ${question}`;
    
    console.log("Calling Gemini API...");
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt
    });
    
    console.log("Success:", response.text);
  } catch (error) {
    console.error("Test Failed. Full Error:", error);
  }
}
run();

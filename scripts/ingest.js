import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const INDEX_NAME = 'cu-law-index';
const KB_DIR = path.resolve(process.cwd(), 'knowledge_base');

const CHUNK_SIZE = 800; // ~800 words as token approximation
const OVERLAP = 100;

function chunkText(text) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
    i += (CHUNK_SIZE - OVERLAP);
  }
  return chunks;
}

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.txt') {
    return fs.promises.readFile(filePath, 'utf-8');
  } else if (ext === '.pdf') {
    const dataBuffer = await fs.promises.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }
  return '';
}

async function getFilesRecursively(dir) {
  const files = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getFilesRecursively(fullPath));
    } else if (['.pdf', '.txt'].includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  console.log(`Starting ingestion from ${KB_DIR}...`);
  
  if (!fs.existsSync(KB_DIR)) {
    console.error('knowledge_base directory not found!');
    process.exit(1);
  }

  const index = pinecone.Index(INDEX_NAME);
  const files = await getFilesRecursively(KB_DIR);
  console.log(`Found ${files.length} files to process.`);

  for (const file of files) {
    console.log(`\nProcessing ${file}...`);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        console.log(`No text found in ${file}, skipping.`);
        continue;
      }

      const chunks = chunkText(text);
      console.log(`Split into ${chunks.length} chunks.`);

      const fileName = path.basename(file);
      // Infer subject from the immediate parent folder name, if it's not knowledge_base
      const parentDirName = path.basename(path.dirname(file));
      const subject = parentDirName === 'knowledge_base' ? 'General' : parentDirName;

      for (let i = 0; i < chunks.length; i++) {
        const textChunk = chunks[i];
        
        // Generate embedding
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: textChunk,
        });
        
        const embedding = response.embeddings[0].values;
        
        // Upsert to Pinecone
        const vectorId = `${fileName.replace(/[^a-zA-Z0-9-]/g, '-')}-chunk-${i}`;
        await index.upsert([{
          id: vectorId,
          values: embedding,
          metadata: {
            fileName,
            subject,
            textChunk
          }
        }]);
        console.log(`Upserted chunk ${i + 1}/${chunks.length} for ${fileName}`);
        
        // Slight delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error(`Failed to process ${file}:`, err);
    }
  }
  console.log('\nIngestion complete!');
}

main().catch(console.error);

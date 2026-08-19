import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const INDEX_NAME = 'cu-law-index';
const KB_DIR = path.resolve(process.cwd(), 'knowledge_base');

const CHUNK_SIZE = 800; // ~800 words as token approximation
const OVERLAP = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
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
        
        let embedding = null;
        while (true) {
          await sleep(2000); // 2-second delay to ensure we stay under 15 RPM
          
          // Generate embedding using raw fetch to support specific API keys
          const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
              content: { parts: [{ text: textChunk }] },
              outputDimensionality: 1024
            })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            if (res.status === 429) {
              console.log(`Rate limit exceeded (429). Waiting 5 seconds and retrying chunk ${i + 1}/${chunks.length}...`);
              await sleep(5000);
              continue; // Retry this exact chunk
            }
            throw new Error(data.error?.message || 'Failed to generate embedding');
          }
          
          embedding = data.embedding.values;
          break; // Success, exit retry loop
        }
        
        // Upsert to Pinecone
        const vectorId = `${fileName.replace(/[^a-zA-Z0-9-]/g, '-')}-chunk-${i}`;
        await index.upsert({
          records: [{
            id: vectorId,
            values: embedding,
            metadata: {
              fileName,
              subject,
              textChunk
            }
          }]
        });
        console.log(`Upserted chunk ${i + 1}/${chunks.length} for ${fileName}`);
      }

      if (fileName === 'Muslim Law Notes-1.pdf') {
        console.log(`\n--- SUMMARY FOR Muslim Law Notes-1.pdf ---`);
        console.log(`Total chunks created: ${chunks.length}`);
        console.log(`Total chunks uploaded: ${chunks.length}`);
        console.log(`------------------------------------------\n`);
      }
    } catch (err) {
      console.error(`Failed to process ${file}:`, err);
    }
  }
  console.log('\nIngestion complete!');
}

main().catch(console.error);

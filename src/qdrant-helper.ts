import { QdrantClient } from '@qdrant/js-client-rest';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
dotenv.config();

const hf = new HfInference(process.env.HF_API_TOKEN);
const client = new QdrantClient({ url: 'http://localhost:6333' });
const COLLECTION = 'code-snippets';

export async function ensureCollection() {
  const collections = await client.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION);
  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: 384, distance: 'Cosine' },
    });
  }
}

export async function embedText(text: string): Promise<number[]> {
  const embedding = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text,
  });
  return embedding as number[];
}

export async function storeInQdrant(id: string, text: string) {
  const vector = await embedText(text);
  await client.upsert(COLLECTION, {
    points: [{ id, vector, payload: { text } }],
  });
}

export async function queryFromQdrant(query: string) {
  const vector = await embedText(query);
  return await client.search(COLLECTION, {
    vector,
    limit: 1,
  });
}

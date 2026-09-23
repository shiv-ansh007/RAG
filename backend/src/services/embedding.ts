import OpenAI from 'openai';
import { config } from '../config';

// ─── OpenAI Embedding Client ────────────────────────────────────────────────
const openaiClient = config.OPENAI_API_KEY
  ? new OpenAI({ apiKey: config.OPENAI_API_KEY })
  : null;

async function embedWithOllama(text: string): Promise<number[]> {
  const baseUrl = config.OLLAMA_EMBEDDING_BASE_URL ?? 'http://localhost:11434';
  const model = config.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text';

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text.trim() }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding request failed: ${response.status}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}

async function embedWithOpenAI(text: string): Promise<number[]> {
  if (!openaiClient) throw new Error('OpenAI client not initialised (missing OPENAI_API_KEY)');
  const response = await openaiClient.embeddings.create({
    model: config.EMBEDDING_MODEL,
    input: text.trim(),
  });
  return response.data[0].embedding;
}

async function embedWithGemini(text: string): Promise<number[]> {
  const apiKey = config.GEMINI_API_KEY || config.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for Gemini embeddings');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = config.EMBEDDING_MODEL && config.EMBEDDING_MODEL.startsWith('gemini')
    ? config.EMBEDDING_MODEL
    : 'gemini-embedding-001';

  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.embedContent({
    content: { parts: [{ text: text.trim() }], role: 'user' },
    outputDimensionality: config.EMBEDDING_DIMENSION,
  } as any);
  return result.embedding.values;
}

/**
 * Generate an embedding vector for the given text.
 * Supports 'openai', 'gemini', 'ollama', and 'auto' (with automatic Ollama fallback).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot embed empty text');
  }

  const provider = config.EMBEDDING_PROVIDER;

  if (provider === 'openai') {
    try {
      return await embedWithOpenAI(text);
    } catch (err) {
      console.warn('[embedding] OpenAI embedding failed, attempting local Ollama fallback...', (err as Error).message);
      return await embedWithOllama(text);
    }
  }

  if (provider === 'gemini') {
    try {
      return await embedWithGemini(text);
    } catch (err) {
      console.warn('[embedding] Gemini embedding failed, attempting local Ollama fallback...', (err as Error).message);
      return await embedWithOllama(text);
    }
  }

  if (provider === 'ollama') {
    return await embedWithOllama(text);
  }

  if (provider === 'auto') {
    // Try Gemini first if key available, then OpenAI, then Ollama
    if (config.GEMINI_API_KEY) {
      try {
        return await embedWithGemini(text);
      } catch (e) {
        console.warn('[embedding-auto] Gemini failed, falling back to Ollama...');
      }
    }
    if (config.OPENAI_API_KEY) {
      try {
        return await embedWithOpenAI(text);
      } catch (e) {
        console.warn('[embedding-auto] OpenAI failed, falling back to Ollama...');
      }
    }
    console.log('[embedding-auto] using local Ollama...');
    return await embedWithOllama(text);
  }

  throw new Error(`Unknown EMBEDDING_PROVIDER: ${provider}`);
}

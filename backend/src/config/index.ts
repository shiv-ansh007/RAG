import { z } from 'zod';
import 'dotenv/config';

const configSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Embedding
  EMBEDDING_PROVIDER: z.enum(['openai', 'ollama', 'gemini', 'auto']).default('gemini'),
  EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1536),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_EMBEDDING_BASE_URL: z.string().optional(),
  OLLAMA_EMBEDDING_MODEL: z.string().optional(),

  // LLM
  LLM_PROVIDER: z.enum(['openrouter', 'ollama', 'gemini', 'auto']).default('gemini'),
  GEMINI_LLM_MODEL: z.string().default('gemini-3.6-flash'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2'),

  // RAG
  RAG_TOP_K: z.coerce.number().int().positive().default(5),

  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

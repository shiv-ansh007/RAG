import { generateEmbedding } from '../src/services/embedding';
import { config } from '../src/config';

describe('Embedding Service', () => {
  it('should throw error for empty text input', async () => {
    await expect(generateEmbedding('')).rejects.toThrow('Cannot embed empty text');
    await expect(generateEmbedding('   ')).rejects.toThrow('Cannot embed empty text');
  });

  it('should throw error when gemini provider is configured without API key', async () => {
    const originalProvider = config.EMBEDDING_PROVIDER;
    const originalGeminiKey = config.GEMINI_API_KEY;
    const originalOpenAIKey = config.OPENAI_API_KEY;

    (config as any).EMBEDDING_PROVIDER = 'gemini';
    (config as any).GEMINI_API_KEY = undefined;
    (config as any).OPENAI_API_KEY = undefined;

    await expect(generateEmbedding('hello world')).rejects.toThrow();

    (config as any).EMBEDDING_PROVIDER = originalProvider;
    (config as any).GEMINI_API_KEY = originalGeminiKey;
    (config as any).OPENAI_API_KEY = originalOpenAIKey;
  });
});

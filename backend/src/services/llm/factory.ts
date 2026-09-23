import { config } from '../../config';
import { LLMProvider, LLMMessage, LLMOptions } from './interface';
import { OpenRouterAdapter } from './openrouter';
import { OllamaAdapter } from './ollama';
import { GeminiLLMAdapter } from './gemini';

class AutoFallbackLLMAdapter implements LLMProvider {
  private primary: LLMProvider;
  private fallback: LLMProvider;
  private primaryName: string;

  constructor(primary: LLMProvider, primaryName: string) {
    this.primary = primary;
    this.primaryName = primaryName;
    this.fallback = new OllamaAdapter();
  }

  async generateAnswer(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    try {
      return await this.primary.generateAnswer(messages, options);
    } catch (err) {
      console.warn(
        `[llm-fallback] ${this.primaryName} failed: ${(err as Error).message}. Falling back to local Ollama...`
      );
      return await this.fallback.generateAnswer(messages, options);
    }
  }
}

let instance: LLMProvider | null = null;

/**
 * Returns a singleton LLM provider selected by the LLM_PROVIDER env var.
 * Supports 'openrouter', 'gemini', 'ollama', and 'auto'.
 * Automatically falls back to local Ollama if cloud provider calls fail!
 */
export function getLLMProvider(): LLMProvider {
  if (instance) return instance;

  switch (config.LLM_PROVIDER) {
    case 'openrouter':
      instance = new AutoFallbackLLMAdapter(new OpenRouterAdapter(), 'OpenRouter');
      console.log('[llm-factory] using OpenRouter adapter (with Ollama fallback)');
      break;
    case 'gemini':
      instance = new AutoFallbackLLMAdapter(new GeminiLLMAdapter(), 'Gemini');
      console.log('[llm-factory] using Gemini adapter (with Ollama fallback)');
      break;
    case 'ollama':
      instance = new OllamaAdapter();
      console.log('[llm-factory] using local Ollama adapter');
      break;
    case 'auto':
      if (config.GEMINI_API_KEY) {
        instance = new AutoFallbackLLMAdapter(new GeminiLLMAdapter(), 'Gemini');
        console.log('[llm-factory-auto] selected Gemini adapter (with Ollama fallback)');
      } else if (config.OPENROUTER_API_KEY) {
        instance = new AutoFallbackLLMAdapter(new OpenRouterAdapter(), 'OpenRouter');
        console.log('[llm-factory-auto] selected OpenRouter adapter (with Ollama fallback)');
      } else {
        instance = new OllamaAdapter();
        console.log('[llm-factory-auto] selected local Ollama adapter');
      }
      break;
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
  }

  return instance;
}

/** Reset the singleton — used in tests to swap providers between test cases. */
export function resetLLMProvider(): void {
  instance = null;
}

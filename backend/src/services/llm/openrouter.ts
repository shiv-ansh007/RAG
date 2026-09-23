import OpenAI from 'openai';
import { config } from '../../config';
import { LLMMessage, LLMOptions, LLMProvider } from './interface';

export class OpenRouterAdapter implements LLMProvider {
  private client: OpenAI;

  constructor() {
    if (!config.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    this.client = new OpenAI({
      apiKey: config.OPENROUTER_API_KEY,
      baseURL: config.OPENROUTER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': 'https://ai-journal-rag',
        'X-Title': 'AI Journal RAG',
      },
    });
  }

  async generateAnswer(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    const model = config.OPENROUTER_MODEL;
    console.log(`[llm] OpenRouter → model: ${model}`);

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('OpenRouter returned an empty response');

      return content;
    } catch (err: unknown) {
      if (err instanceof OpenAI.APIError) {
        console.error(`[llm] OpenRouter API error: ${err.status} ${err.message}`);
        throw new Error(`OpenRouter error: ${err.message}`);
      }
      throw err;
    }
  }
}

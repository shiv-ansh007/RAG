import { config } from '../../config';
import { LLMMessage, LLMOptions, LLMProvider } from './interface';

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaChatResponse {
  message: { content: string };
}

export class OllamaAdapter implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = config.OLLAMA_BASE_URL;
    this.model = config.OLLAMA_MODEL;
  }

  async generateAnswer(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    console.log(`[llm] Ollama → model: ${this.model} @ ${this.baseUrl}`);

    const ollamaMessages: OllamaMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 1024,
          },
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      throw new Error(`Ollama request failed: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Ollama HTTP ${response.status}: ${body}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data?.message?.content;

    if (!content) throw new Error('Ollama returned an empty response');

    return content;
  }
}

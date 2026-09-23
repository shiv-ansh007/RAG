import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMMessage, LLMOptions } from './interface';
import { config } from '../../config';

export class GeminiLLMAdapter implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = config.GEMINI_API_KEY || config.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY (or OPENAI_API_KEY) is required when LLM_PROVIDER=gemini');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = config.GEMINI_LLM_MODEL ?? 'gemini-3.6-flash';
  }

  async generateAnswer(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      ...(systemMessage ? { systemInstruction: systemMessage } : {}),
    });

    const userMessages = messages.filter((m) => m.role !== 'system');
    const history = userMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = userMessages[userMessages.length - 1]?.content ?? '';

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      },
    });

    const result = await chat.sendMessage(lastMessage);
    return result.response.text();
  }
}

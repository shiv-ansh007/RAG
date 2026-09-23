export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  /**
   * Generate a completion from a list of messages.
   * Implementations must handle all provider-specific error cases
   * and throw descriptive errors for callers to handle.
   */
  generateAnswer(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
}

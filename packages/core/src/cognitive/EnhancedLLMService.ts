/**
 * Enhanced LLM Service with real API integration
 *
 * Supports multiple LLM providers:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude)
 * - OpenRouter (unified access)
 * - Local models via Ollama
 */

export interface LLMConfig {
  provider: "openai" | "anthropic" | "openrouter" | "ollama";
  apiKey?: string;
  baseURL?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

/**
 * Enhanced LLM Service with multiple provider support
 */
export class EnhancedLLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 2000,
      streaming: false,
      ...config,
    };
  }

  /**
   * Generate a completion from the LLM
   */
  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    switch (this.config.provider) {
      case "openai":
        return this.completeOpenAI(messages);
      case "anthropic":
        return this.completeAnthropic(messages);
      case "openrouter":
        return this.completeOpenRouter(messages);
      case "ollama":
        return this.completeOllama(messages);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * OpenAI completion
   */
  private async completeOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    const response = await fetch(
      this.config.baseURL || "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
      model: string;
    };
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    };
  }

  /**
   * Anthropic Claude completion
   */
  private async completeAnthropic(
    messages: LLMMessage[],
  ): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error("Anthropic API key is required");
    }

    // Convert messages format for Anthropic
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemMessage?.content,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
      usage: { input_tokens: number; output_tokens: number };
      model: string;
      stop_reason: string;
    };
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
      finishReason: data.stop_reason,
    };
  }

  /**
   * OpenRouter completion (unified API for multiple models)
   */
  private async completeOpenRouter(
    messages: LLMMessage[],
  ): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "HTTP-Referer": "https://deltecho.ai",
          "X-Title": "Deltecho",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
      model: string;
    };
    return {
      content: data.choices[0].message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    };
  }

  /**
   * Ollama local model completion
   */
  private async completeOllama(messages: LLMMessage[]): Promise<LLMResponse> {
    const baseURL = this.config.baseURL || "http://localhost:11434";

    const response = await fetch(`${baseURL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = (await response.json()) as {
      message: { content: string };
    };
    return {
      content: data.message.content,
      model: this.config.model,
      finishReason: "stop",
    };
  }

  /**
   * Streaming completion (for supported providers)
   */
  async *completeStream(messages: LLMMessage[]): AsyncGenerator<string> {
    if (!this.config.streaming) {
      const response = await this.complete(messages);
      yield response.content;
      return;
    }

    // Streaming implementation would go here
    // For now, fall back to non-streaming
    const response = await this.complete(messages);
    yield response.content;
  }

  /**
   * Estimate token count (approximate)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

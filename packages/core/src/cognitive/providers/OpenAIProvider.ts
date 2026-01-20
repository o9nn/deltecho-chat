/**
 * OpenAI Provider Implementation
 *
 * Production-ready implementation for OpenAI API integration.
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, and compatible APIs.
 */

import {
  LLMProvider,
  ChatMessage,
  CompletionConfig,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
  registerProvider,
} from "./LLMProvider";
import { getLogger } from "../../utils/logger";

const log = getLogger("deep-tree-echo-core/cognitive/providers/OpenAIProvider");

/**
 * OpenAI API response structure
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI streaming response chunk
 */
interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * OpenAI models list response
 */
interface OpenAIModelsResponse {
  data: Array<{
    id: string;
    object: string;
    owned_by: string;
  }>;
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends LLMProvider {
  private static readonly DEFAULT_BASE_URL = "https://api.openai.com/v1";
  private static readonly DEFAULT_MODELS = [
    "gpt-4-turbo-preview",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-4-0125-preview",
    "gpt-4-1106-preview",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
  ];

  constructor(apiKey: string, baseUrl?: string) {
    super(apiKey, baseUrl || OpenAIProvider.DEFAULT_BASE_URL, "OpenAI");
  }

  /**
   * Generate a completion from OpenAI
   */
  async complete(
    messages: ChatMessage[],
    config: CompletionConfig,
  ): Promise<CompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAI provider not configured: missing API key");
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.name && { name: m.name }),
          })),
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 1000,
          top_p: config.topP ?? 1,
          frequency_penalty: config.frequencyPenalty ?? 0,
          presence_penalty: config.presencePenalty ?? 0,
          ...(config.stopSequences && { stop: config.stopSequences }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`OpenAI API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenAIResponse;

      // Update health status
      this.health = {
        isHealthy: true,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
      };

      const choice = data.choices[0];
      return {
        content: choice.message.content,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
        provider: this.name,
      };
    } catch (error) {
      this.health = {
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
      throw error;
    }
  }

  /**
   * Generate a streaming completion from OpenAI
   */
  async completeStream(
    messages: ChatMessage[],
    config: CompletionConfig,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<CompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAI provider not configured: missing API key");
    }

    const startTime = Date.now();
    let fullContent = "";
    let finishReason: CompletionResponse["finishReason"] = "stop";

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.name && { name: m.name }),
          })),
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 1000,
          top_p: config.topP ?? 1,
          frequency_penalty: config.frequencyPenalty ?? 0,
          presence_penalty: config.presencePenalty ?? 0,
          ...(config.stopSequences && { stop: config.stopSequences }),
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`OpenAI API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              onChunk({ content: "", isComplete: true, finishReason });
              continue;
            }

            try {
              const chunk: OpenAIStreamChunk = JSON.parse(data);
              const delta = chunk.choices[0]?.delta;
              const content = delta?.content || "";

              if (content) {
                fullContent += content;
                onChunk({ content, isComplete: false });
              }

              if (chunk.choices[0]?.finish_reason) {
                finishReason = this.mapFinishReason(
                  chunk.choices[0].finish_reason,
                );
              }
            } catch (e) {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      // Update health status
      this.health = {
        isHealthy: true,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
      };

      // Estimate token usage for streaming (actual usage not provided in stream)
      const estimatedPromptTokens = Math.ceil(
        messages.reduce((acc, m) => acc + m.content.length, 0) / 4,
      );
      const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

      return {
        content: fullContent,
        finishReason,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        },
        model: config.model,
        provider: this.name,
      };
    } catch (error) {
      this.health = {
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
      throw error;
    }
  }

  /**
   * Check OpenAI API health
   */
  async checkHealth(): Promise<ProviderHealth> {
    if (!this.isConfigured()) {
      return {
        isHealthy: false,
        latencyMs: 0,
        lastCheck: Date.now(),
        errorMessage: "API key not configured",
      };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      this.health = {
        isHealthy: response.ok,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
        errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      this.health = {
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }

    return this.health;
  }

  /**
   * Get available OpenAI models
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.isConfigured()) {
      return OpenAIProvider.DEFAULT_MODELS;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        log.warn("Failed to fetch OpenAI models, using defaults");
        return OpenAIProvider.DEFAULT_MODELS;
      }

      const data = (await response.json()) as OpenAIModelsResponse;

      // Filter to only chat models
      const chatModels = data.data
        .filter((m) => m.id.startsWith("gpt-"))
        .map((m) => m.id)
        .sort();

      return chatModels.length > 0 ? chatModels : OpenAIProvider.DEFAULT_MODELS;
    } catch (error) {
      log.warn("Error fetching OpenAI models:", error);
      return OpenAIProvider.DEFAULT_MODELS;
    }
  }

  /**
   * Map OpenAI finish reason to standard format
   */
  private mapFinishReason(reason: string): CompletionResponse["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return "stop";
    }
  }
}

// Register the provider
registerProvider(
  "openai",
  (apiKey, baseUrl) => new OpenAIProvider(apiKey, baseUrl),
);
registerProvider(
  "openai-compatible",
  (apiKey, baseUrl) => new OpenAIProvider(apiKey, baseUrl),
);

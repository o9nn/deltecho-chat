/**
 * Anthropic Claude Provider Implementation
 *
 * Production-ready implementation for Anthropic Claude API integration.
 * Supports Claude 3 Opus, Sonnet, and Haiku models.
 */

import {
  LLMProvider,
  ChatMessage,
  CompletionConfig,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
  registerProvider,
} from './LLMProvider';
import { getLogger } from '../../utils/logger';

const log = getLogger('deep-tree-echo-core/cognitive/providers/AnthropicProvider');

/**
 * Anthropic API response structure
 */
interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic streaming event types
 */
interface AnthropicStreamEvent {
  type: string;
  message?: AnthropicResponse;
  index?: number;
  content_block?: {
    type: string;
    text: string;
  };
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
  };
  usage?: {
    output_tokens: number;
  };
}

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider extends LLMProvider {
  private static readonly DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
  private static readonly API_VERSION = '2023-06-01';
  private static readonly DEFAULT_MODELS = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-3-5-sonnet-20241022',
    'claude-2.1',
    'claude-2.0',
    'claude-instant-1.2',
  ];

  constructor(apiKey: string, baseUrl?: string) {
    super(apiKey, baseUrl || AnthropicProvider.DEFAULT_BASE_URL, 'Anthropic');
  }

  /**
   * Generate a completion from Anthropic Claude
   */
  async complete(messages: ChatMessage[], config: CompletionConfig): Promise<CompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic provider not configured: missing API key');
    }

    const startTime = Date.now();

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': AnthropicProvider.API_VERSION,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens ?? 1024,
          ...(systemMessage && { system: systemMessage.content }),
          messages: conversationMessages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          temperature: config.temperature ?? 0.7,
          top_p: config.topP ?? 1,
          ...(config.stopSequences && { stop_sequences: config.stopSequences }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Anthropic API error: ${response.status} - ${errorText}`);
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = (await response.json()) as AnthropicResponse;

      // Update health status
      this.health = {
        isHealthy: true,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
      };

      // Extract text content from response
      const textContent = data.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');

      return {
        content: textContent,
        finishReason: this.mapStopReason(data.stop_reason),
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        model: data.model,
        provider: this.name,
      };
    } catch (error) {
      this.health = {
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    }
  }

  /**
   * Generate a streaming completion from Anthropic Claude
   */
  async completeStream(
    messages: ChatMessage[],
    config: CompletionConfig,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<CompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic provider not configured: missing API key');
    }

    const startTime = Date.now();
    let fullContent = '';
    let finishReason: CompletionResponse['finishReason'] = 'stop';
    let inputTokens = 0;
    let outputTokens = 0;

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': AnthropicProvider.API_VERSION,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens ?? 1024,
          ...(systemMessage && { system: systemMessage.content }),
          messages: conversationMessages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          temperature: config.temperature ?? 0.7,
          top_p: config.topP ?? 1,
          ...(config.stopSequences && { stop_sequences: config.stopSequences }),
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Anthropic API error: ${response.status} - ${errorText}`);
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onChunk({ content: '', isComplete: true, finishReason });
              continue;
            }

            try {
              const event: AnthropicStreamEvent = JSON.parse(data);

              switch (event.type) {
                case 'message_start':
                  if (event.message?.usage) {
                    inputTokens = event.message.usage.input_tokens;
                  }
                  break;

                case 'content_block_delta':
                  if (event.delta?.text) {
                    fullContent += event.delta.text;
                    onChunk({ content: event.delta.text, isComplete: false });
                  }
                  break;

                case 'message_delta':
                  if (event.delta?.stop_reason) {
                    finishReason = this.mapStopReason(event.delta.stop_reason);
                  }
                  if (event.usage?.output_tokens) {
                    outputTokens = event.usage.output_tokens;
                  }
                  break;

                case 'message_stop':
                  onChunk({ content: '', isComplete: true, finishReason });
                  break;
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

      return {
        content: fullContent,
        finishReason,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        model: config.model,
        provider: this.name,
      };
    } catch (error) {
      this.health = {
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastCheck: Date.now(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    }
  }

  /**
   * Check Anthropic API health
   */
  async checkHealth(): Promise<ProviderHealth> {
    if (!this.isConfigured()) {
      return {
        isHealthy: false,
        latencyMs: 0,
        lastCheck: Date.now(),
        errorMessage: 'API key not configured',
      };
    }

    const startTime = Date.now();

    try {
      // Anthropic doesn't have a dedicated health endpoint, so we make a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': AnthropicProvider.API_VERSION,
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
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
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return this.health;
  }

  /**
   * Get available Anthropic models
   */
  async getAvailableModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return AnthropicProvider.DEFAULT_MODELS;
  }

  /**
   * Map Anthropic stop reason to standard format
   */
  private mapStopReason(reason: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }
}

// Register the provider
registerProvider('anthropic', (apiKey, baseUrl) => new AnthropicProvider(apiKey, baseUrl));
registerProvider('claude', (apiKey, baseUrl) => new AnthropicProvider(apiKey, baseUrl));

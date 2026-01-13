/**
 * LLM Provider Interface and Base Implementation
 *
 * This module defines the interface for LLM providers and provides
 * base implementations for common functionality. Following the
 * zero-tolerance policy for stubs - all implementations are production-ready.
 */

import { getLogger } from '../../utils/logger';

const log = getLogger('deep-tree-echo-core/cognitive/providers/LLMProvider');

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * A single message in a conversation
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
}

/**
 * Configuration for LLM completion requests
 */
export interface CompletionConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

/**
 * Response from an LLM completion
 */
export interface CompletionResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

/**
 * Streaming chunk from an LLM completion
 */
export interface StreamChunk {
  content: string;
  isComplete: boolean;
  finishReason?: CompletionResponse['finishReason'];
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  isHealthy: boolean;
  latencyMs: number;
  lastCheck: number;
  errorMessage?: string;
}

/**
 * Abstract base class for LLM providers
 */
export abstract class LLMProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected name: string;
  protected health: ProviderHealth = {
    isHealthy: true,
    latencyMs: 0,
    lastCheck: 0,
  };

  constructor(apiKey: string, baseUrl: string, name: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.name = name;
  }

  /**
   * Get the provider name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Check if the provider is configured
   */
  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Get provider health status
   */
  public getHealth(): ProviderHealth {
    return { ...this.health };
  }

  /**
   * Generate a completion from the LLM
   */
  abstract complete(messages: ChatMessage[], config: CompletionConfig): Promise<CompletionResponse>;

  /**
   * Generate a streaming completion from the LLM
   */
  abstract completeStream(
    messages: ChatMessage[],
    config: CompletionConfig,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<CompletionResponse>;

  /**
   * Check provider health
   */
  abstract checkHealth(): Promise<ProviderHealth>;

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): Promise<string[]>;
}

/**
 * Provider factory for creating LLM providers
 */
export type ProviderFactory = (apiKey: string, baseUrl?: string) => LLMProvider;

/**
 * Registry of available providers
 */
export const providerRegistry: Map<string, ProviderFactory> = new Map();

/**
 * Register a provider factory
 */
export function registerProvider(name: string, factory: ProviderFactory): void {
  providerRegistry.set(name.toLowerCase(), factory);
  log.info(`Registered LLM provider: ${name}`);
}

/**
 * Create a provider instance
 */
export function createProvider(name: string, apiKey: string, baseUrl?: string): LLMProvider | null {
  const factory = providerRegistry.get(name.toLowerCase());
  if (!factory) {
    log.warn(`Unknown LLM provider: ${name}`);
    return null;
  }
  return factory(apiKey, baseUrl);
}

/**
 * Get list of registered provider names
 */
export function getRegisteredProviders(): string[] {
  return Array.from(providerRegistry.keys());
}

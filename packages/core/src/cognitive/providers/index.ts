/**
 * LLM Providers Index
 *
 * Central export for all LLM provider implementations.
 * Import this module to register all available providers.
 */

// Export base types and utilities
export {
  LLMProvider,
  ChatMessage,
  MessageRole,
  CompletionConfig,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
  registerProvider,
  createProvider,
  getRegisteredProviders,
  providerRegistry,
} from "./LLMProvider";

// Import providers to register them
import "./OpenAIProvider";
import "./AnthropicProvider";

// Export provider classes for direct use
export { OpenAIProvider } from "./OpenAIProvider";
export { AnthropicProvider } from "./AnthropicProvider";

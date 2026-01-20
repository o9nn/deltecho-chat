/**
 * @deltecho/cognitive
 *
 * Unified cognitive interface for Deep Tree Echo
 * Orchestrates message processing, state management, and LLM integration.
 */

// Main orchestrator
export {
  CognitiveOrchestrator,
  createCognitiveOrchestrator,
} from "./cognitive-orchestrator";

// State management
export { CognitiveStateManager, createCognitiveState } from "./cognitive-state";
export type { CognitiveStateConfig } from "./cognitive-state";

// Message handling
export {
  UnifiedMessageHandler,
  createMessageHandler,
  formatMessagesForLLM,
  extractTopics,
} from "./unified-message";
export type { CreateMessageOptions, MessageHistory } from "./unified-message";

// Sentiment analysis
export {
  SentimentAnalyzer,
  createSentimentAnalyzer,
} from "./sentiment-analyzer";
export type { SentimentConfig } from "./sentiment-analyzer";

// Integration adapters
export {
  PersonaAdapter,
  createPersonaAdapter,
  MemoryAdapter,
  createMemoryAdapter,
  LLMAdapter,
  createLLMAdapter,
} from "./integrations";
export type {
  IPersonaCore,
  PersonaAdapterConfig,
  IMemory,
  IRAGMemoryStore,
  MemoryAdapterConfig,
  ILLMService,
  LLMAdapterConfig,
  LLMResponse,
  PromptContext,
} from "./integrations";

// Types
export type {
  // Core types
  TriadicStream,
  HyperDimensionalVector,
  Atom,
  Link,
  AtomSpaceSnapshot,
  EmotionalVector,
  UnifiedCognitiveState,
  SentimentScore,
  MessageMetadata,
  UnifiedMessage,
  // Config types
  CognitiveOrchestratorConfig,
  // Result types
  CognitiveResult,
  ProcessingMetrics,
  // Event types
  CognitiveEventType,
  CognitiveEvent,
  CognitiveEventListener,
  LLMProcessorFn,
} from "./types";

// Default values
export { DEFAULT_EMOTIONAL_VECTOR, DEFAULT_ORCHESTRATOR_CONFIG } from "./types";

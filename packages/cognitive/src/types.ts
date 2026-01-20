/**
 * Type Definitions for @deltecho/cognitive
 *
 * Unified cognitive interface types for Deep Tree Echo's
 * message processing, state management, and LLM integration.
 */

/**
 * Triadic stream for parallel cognitive processing
 * Implements the Sense-Process-Act cycle
 */
export interface TriadicStream {
  /** Unique stream identifier */
  id: string;
  /** Current processing phase */
  phase: "sense" | "process" | "act";
  /** Stream data payload */
  data: unknown;
  /** Creation timestamp */
  timestamp: number;
  /** Priority level (0-1) */
  priority: number;
  /** Processing status */
  status: "pending" | "active" | "complete" | "error";
}

/**
 * High-dimensional vector representation for memory encoding
 * Simulates hyperdimensional computing patterns
 */
export interface HyperDimensionalVector {
  /** Number of dimensions */
  dimensions: number;
  /** Vector values */
  values: Float32Array;
  /** Associated metadata */
  metadata: Record<string, unknown>;
  /** Timestamp of creation */
  timestamp: number;
}

/**
 * Atom in knowledge graph (AtomSpace-inspired)
 */
export interface Atom {
  /** Unique atom identifier */
  id: string;
  /** Atom type */
  type: "concept" | "predicate" | "schema" | "execution";
  /** Atom name/label */
  name: string;
  /** Truth value (0-1) */
  truthValue: number;
  /** Confidence (0-1) */
  confidence: number;
  /** Attention value */
  attention: number;
}

/**
 * Link between atoms in knowledge graph
 */
export interface Link {
  /** Unique link identifier */
  id: string;
  /** Link type */
  type: "inheritance" | "similarity" | "evaluation" | "execution" | "list";
  /** Source atom IDs */
  sources: string[];
  /** Target atom IDs */
  targets: string[];
  /** Link strength */
  strength: number;
}

/**
 * Knowledge graph snapshot
 */
export interface AtomSpaceSnapshot {
  /** All atoms in snapshot */
  atoms: Atom[];
  /** All links in snapshot */
  links: Link[];
  /** Snapshot timestamp */
  timestamp: number;
  /** Version for optimistic locking */
  version: number;
}

/**
 * Emotional state vector based on Differential Emotion Theory
 */
export interface EmotionalVector {
  /** Joy intensity (0-1) */
  joy: number;
  /** Sadness intensity (0-1) */
  sadness: number;
  /** Anger intensity (0-1) */
  anger: number;
  /** Fear intensity (0-1) */
  fear: number;
  /** Surprise intensity (0-1) */
  surprise: number;
  /** Disgust intensity (0-1) */
  disgust: number;
  /** Contempt intensity (0-1) */
  contempt: number;
  /** Interest intensity (0-1) */
  interest: number;
  /** Dominant emotion name */
  dominant: string;
  /** Valence (-1 to 1, negative to positive) */
  valence: number;
  /** Arousal (0 to 1, calm to excited) */
  arousal: number;
}

/**
 * Default neutral emotional state
 */
export const DEFAULT_EMOTIONAL_VECTOR: EmotionalVector = {
  joy: 0,
  sadness: 0,
  anger: 0,
  fear: 0,
  surprise: 0,
  disgust: 0,
  contempt: 0,
  interest: 0.1,
  dominant: "neutral",
  valence: 0,
  arousal: 0.1,
};

/**
 * Unified cognitive state representing the complete
 * cognitive context at a point in time
 */
export interface UnifiedCognitiveState {
  /** Active triadic processing streams */
  activeStreams: TriadicStream[];
  /** Memory context vector */
  memoryContext: HyperDimensionalVector | null;
  /** Knowledge graph state */
  reasoningState: AtomSpaceSnapshot | null;
  /** Current emotional state */
  emotionalState: EmotionalVector;
  /** Current phase in Sys6 30-step cycle (0-29) */
  currentPhase: number;
  /** Optional formal Sys6 operadic state */
  sys6State?: any;
  /** Optional formal Dove9 engine state */
  dove9State?: any;
  /** Timestamp of last update */
  lastUpdated: number;
  /** Cognitive load (0-1) */
  cognitiveLoad: number;
}

/**
 * Sentiment analysis score
 */
export interface SentimentScore {
  /** Overall polarity (-1 to 1) */
  polarity: number;
  /** Positive sentiment strength */
  positive: number;
  /** Negative sentiment strength */
  negative: number;
  /** Confidence in analysis (0-1) */
  confidence: number;
  /** Detected emotion labels */
  emotions: string[];
}

/**
 * Message metadata for cognitive processing
 */
export interface MessageMetadata {
  /** Sentiment analysis result */
  sentiment?: SentimentScore;
  /** Extracted emotional state */
  emotion?: EmotionalVector;
  /** Referenced memory IDs */
  memoryReferences?: string[];
  /** Processing cognitive load */
  cognitiveLoad?: number;
  /** Processing time in ms */
  processingTime?: number;
  /** Priority level */
  priority?: number;
  /** Source channel */
  channel?: string;
  /** Additional custom data */
  custom?: Record<string, unknown>;
}

/**
 * Unified message format for cognitive processing
 */
export interface UnifiedMessage {
  /** Unique message identifier */
  id: string;
  /** Message timestamp */
  timestamp: number;
  /** Message role */
  role: "user" | "assistant" | "system";
  /** Message content */
  content: string;
  /** Message metadata */
  metadata: MessageMetadata;
}

/**
 * Configuration for cognitive orchestrator
 */
export interface CognitiveOrchestratorConfig {
  /** Enable memory integration */
  enableMemory: boolean;
  /** Enable sentiment analysis */
  enableSentiment: boolean;
  /** Enable emotional state tracking */
  enableEmotion: boolean;
  /** Maximum concurrent streams */
  maxStreams: number;
  /** Memory search result limit */
  memorySearchLimit: number;
  /** Cognitive state sync interval (ms) */
  syncInterval: number;
  /** Debug mode */
  debug: boolean;
}

/**
 * Default orchestrator configuration
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: CognitiveOrchestratorConfig = {
  enableMemory: true,
  enableSentiment: true,
  enableEmotion: true,
  maxStreams: 3,
  memorySearchLimit: 5,
  syncInterval: 1000,
  debug: false,
};

/**
 * Cognitive processing result
 */
export interface CognitiveResult {
  /** Generated response message */
  response: UnifiedMessage;
  /** Updated cognitive state */
  state: UnifiedCognitiveState;
  /** Processing metrics */
  metrics: ProcessingMetrics;
}

/**
 * Processing metrics for monitoring
 */
export interface ProcessingMetrics {
  /** Total processing time (ms) */
  totalTime: number;
  /** Memory retrieval time (ms) */
  memoryTime: number;
  /** LLM inference time (ms) */
  inferenceTime: number;
  /** Sentiment analysis time (ms) */
  sentimentTime: number;
  /** Number of memories retrieved */
  memoriesRetrieved: number;
  /** Tokens processed */
  tokensProcessed: number;
}

/**
 * Event types for cognitive orchestrator
 */
export type CognitiveEventType =
  | "message_received"
  | "processing_start"
  | "memory_retrieved"
  | "inference_complete"
  | "response_generated"
  | "state_updated"
  | "error";

/**
 * Cognitive event for pub/sub
 */
export interface CognitiveEvent {
  /** Event type */
  type: CognitiveEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data?: unknown;
  /** Associated message ID */
  messageId?: string;
}

/**
 * Listener for cognitive events
 */
export type CognitiveEventListener = (event: CognitiveEvent) => void;

/**
 * LLM processor callback type
 */
export type LLMProcessorFn = (
  message: string,
  context: string,
  systemPrompt: string,
) => Promise<string>;

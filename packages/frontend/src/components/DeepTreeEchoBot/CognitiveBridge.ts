/**
 * CognitiveBridge - Browser-Safe Cognitive Framework Interface
 *
 * This module provides a browser-compatible implementation of the @deltecho/cognitive
 * CognitiveOrchestrator API. It mirrors the same interface but runs entirely in the
 * browser/renderer process without Node.js dependencies.
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                    Electron Main Process                            │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │              @deltecho/cognitive (Full Stack)                │   │
 * │  │    - dove9 triadic engine (Node.js EventEmitter)            │   │
 * │  │    - deep-tree-echo-core (memory, LLM, personality)         │   │
 * │  │    - Storage via cognitive-storage.ts IPC handlers          │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                              ▲                                      │
 * │                              │ IPC (storage:get, storage:set, ...)  │
 * │                              ▼                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                 Renderer Process (Browser)                   │   │
 * │  │                                                             │   │
 * │  │  ┌───────────────────────────────────────────────────────┐  │   │
 * │  │  │            CognitiveBridge (This File)                 │  │   │
 * │  │  │    - Browser-safe CognitiveOrchestrator                │  │   │
 * │  │  │    - Same API as @deltecho/cognitive                   │  │   │
 * │  │  │    - Uses fetch() for LLM calls                        │  │   │
 * │  │  │    - In-memory state (can persist via IPC)             │  │   │
 * │  │  └───────────────────────────────────────────────────────┘  │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * Usage:
 * ```typescript
 * // Initialize the orchestrator
 * const orchestrator = await initCognitiveOrchestrator({
 *   enabled: true,
 *   enableAsMainUser: false,
 *   apiKey: 'your-api-key',
 *   provider: 'openai'
 * });
 *
 * // Process messages
 * const response = await processMessageUnified('Hello!', { chatId: 123 });
 * ```
 *
 * For persistent storage integration, the main process should set up IPC handlers
 * using cognitive-storage.ts, and this bridge can communicate via ipcRenderer.
 *
 * @see {@link @deltecho/cognitive} for the full Node.js implementation
 * @see {@link cognitive-storage.ts} for Electron main process storage handlers
 */

import { getLogger } from "@deltachat-desktop/shared/logger";

// Consciousness module integration (sentience advancement)
import {
  getConsciousnessState,
  processConsciously,
  exportConsciousnessState,
  importConsciousnessState,
  type ConsciousnessState,
  type ConsciousProcessingResult,
} from "deep-tree-echo-core/consciousness";

// Integrated memory system (HDM + RAG)
import {
  IntegratedMemorySystem,
  type MemoryContext,
} from "deep-tree-echo-core/memory";

const log = getLogger("render/components/DeepTreeEchoBot/CognitiveBridge");

/**
 * Deep Tree Echo bot configuration (mirrors @deltecho/cognitive types)
 */
export interface DeepTreeEchoBotConfig {
  enabled: boolean;
  enableAsMainUser: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cognitiveKeys?: CognitiveKeys;
  useParallelProcessing?: boolean;
  memoryPersistence?: "local" | "remote" | "hybrid";
  provider?: "openai" | "anthropic" | "ollama" | "custom";
}

/**
 * Multi-provider API keys for cognitive services
 */
export interface CognitiveKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  mistral?: string;
  local?: string;
}

/**
 * Unified message format
 */
export interface UnifiedMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: number;
  metadata?: MessageMetadata;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  chatId?: number;
  accountId?: number;
  contactId?: number;
  isBot?: boolean;
  replyTo?: string;
  cognitivePhase?: "sense" | "process" | "act";
  sentiment?: {
    valence: number;
    arousal: number;
  };
}

/**
 * Unified cognitive state
 */
export interface UnifiedCognitiveState {
  cognitiveContext?: CognitiveContext;
  persona: PersonaState;
  memories: MemoryState;
  reasoning: ReasoningState;
  consciousness?: ConsciousnessState; // Sentience advancement integration
}

/**
 * Cognitive context from dove9
 */
export interface CognitiveContext {
  relevantMemories: string[];
  emotionalValence: number;
  emotionalArousal: number;
  salienceScore: number;
  attentionWeight: number;
  activeCouplings: string[];
}

/**
 * Persona state
 */
export interface PersonaState {
  name: string;
  traits: string[];
  currentMood: string;
  interactionStyle: "formal" | "casual" | "technical" | "creative";
  lastUpdated: number;
}

/**
 * Memory state
 */
export interface MemoryState {
  shortTerm: Array<{
    content: string;
    embedding?: number[];
    timestamp: number;
    type?: "message" | "context" | "reflection";
  }>;
  longTerm: {
    episodic: number;
    semantic: number;
    procedural: number;
  };
  reflections: string[];
}

/**
 * Reasoning state
 */
export interface ReasoningState {
  atomspaceSize: number;
  activeGoals: string[];
  attentionFocus: string[];
  confidenceLevel: number;
}

/**
 * Event types emitted by the cognitive system
 */
export type CognitiveEvent =
  | { type: "message_received"; payload: UnifiedMessage }
  | { type: "response_generated"; payload: UnifiedMessage }
  | { type: "memory_updated"; payload: MemoryState }
  | { type: "persona_changed"; payload: PersonaState }
  | { type: "reasoning_complete"; payload: ReasoningState }
  | { type: "error"; payload: { message: string; code: string } };

/**
 * LLM Provider configuration
 */
interface LLMProviderConfig {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Browser-safe CognitiveOrchestrator implementation
 * Provides the same interface as @deltecho/cognitive but runs in browser
 */
export class CognitiveOrchestrator {
  private config: DeepTreeEchoBotConfig;
  private state: UnifiedCognitiveState | null = null;
  private eventListeners: Map<string, Array<(event: CognitiveEvent) => void>> =
    new Map();
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private llmConfig: LLMProviderConfig | null = null;
  private integratedMemory: IntegratedMemorySystem | null = null;
  private currentChatId: number | null = null;

  constructor(config: DeepTreeEchoBotConfig) {
    this.config = config;
    if (config.apiKey) {
      this.llmConfig = {
        apiKey: config.apiKey,
        apiEndpoint:
          config.apiEndpoint || "https://api.openai.com/v1/chat/completions",
        model: config.model || "gpt-4",
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 1000,
      };
    }

    // Initialize integrated memory system (HDM + RAG)
    this.integratedMemory = new IntegratedMemorySystem(undefined, {
      enableHDM: true,
      hdmWeight: 0.6,
      ragWeight: 0.4,
      relevanceThreshold: 0.15,
      maxRetrievalCount: 8,
    });
    this.integratedMemory.setEnabled(true);
    log.info("Integrated memory system (HDM + RAG) initialized");
  }

  configureLLM(config: Partial<LLMProviderConfig>): void {
    this.llmConfig = {
      apiKey: config.apiKey || this.llmConfig?.apiKey || "",
      apiEndpoint:
        config.apiEndpoint ||
        this.llmConfig?.apiEndpoint ||
        "https://api.openai.com/v1/chat/completions",
      model: config.model || this.llmConfig?.model || "gpt-4",
      temperature: config.temperature ?? this.llmConfig?.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? this.llmConfig?.maxTokens ?? 1000,
    };
  }

  async initialize(): Promise<void> {
    this.state = {
      persona: {
        name: "Deep Tree Echo",
        traits: ["helpful", "curious", "thoughtful"],
        currentMood: "neutral",
        interactionStyle: "casual",
        lastUpdated: Date.now(),
      },
      memories: {
        shortTerm: [],
        longTerm: { episodic: 0, semantic: 0, procedural: 0 },
        reflections: [],
      },
      reasoning: {
        atomspaceSize: 0,
        activeGoals: [],
        attentionFocus: [],
        confidenceLevel: 0.5,
      },
      cognitiveContext: {
        relevantMemories: [],
        emotionalValence: 0,
        emotionalArousal: 0,
        salienceScore: 0.5,
        attentionWeight: 0.5,
        activeCouplings: [],
      },
    };
    this.conversationHistory = [];
    log.info("CognitiveOrchestrator initialized");
  }

  async processMessage(message: UnifiedMessage): Promise<UnifiedMessage> {
    this.emit({ type: "message_received", payload: message });

    // Triadic loop: sense -> process -> act
    const sensed = await this.sense(message);
    const processed = await this.process(sensed);
    const response = await this.act(processed);

    this.emit({ type: "response_generated", payload: response });
    return response;
  }

  private async sense(message: UnifiedMessage): Promise<UnifiedMessage> {
    this.conversationHistory.push({ role: "user", content: message.content });
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    // Track current chat context
    if (message.metadata?.chatId) {
      this.currentChatId = message.metadata.chatId;
    }

    if (this.state) {
      this.state.memories.shortTerm.push({
        content: message.content,
        timestamp: message.timestamp,
        type: "message",
      });
      if (this.state.memories.shortTerm.length > 10) {
        this.state.memories.shortTerm =
          this.state.memories.shortTerm.slice(-10);
      }
    }

    // Store in integrated memory system (HDM + RAG)
    if (this.integratedMemory) {
      const emotionalSignificance = this.calculateEmotionalSignificance(message.content);
      await this.integratedMemory.storeMemory(
        message.metadata?.chatId || 0,
        parseInt(message.id) || Date.now(),
        "user",
        message.content,
        emotionalSignificance
      );
      log.debug("Stored message in integrated memory system");
    }

    return {
      ...message,
      metadata: { ...message.metadata, cognitivePhase: "sense" },
    };
  }

  /**
   * Calculate emotional significance of a message for memory weighting
   */
  private calculateEmotionalSignificance(text: string): number {
    const sentiment = this.analyzeSentiment(text);
    const salience = this.calculateSalience(text);

    // Combine valence intensity and arousal with salience
    const valenceIntensity = Math.abs(sentiment.valence);
    const significance = 1.0 + (valenceIntensity * 0.3) + (sentiment.arousal * 0.3) + (salience * 0.4);

    return Math.min(2.0, significance); // Cap at 2.0
  }

  private async process(message: UnifiedMessage): Promise<UnifiedMessage> {
    const sentiment = this.analyzeSentiment(message.content);

    if (this.state?.cognitiveContext) {
      this.state.cognitiveContext.emotionalValence = sentiment.valence;
      this.state.cognitiveContext.emotionalArousal = sentiment.arousal;
      this.state.cognitiveContext.salienceScore = this.calculateSalience(
        message.content,
      );
    }

    return {
      ...message,
      metadata: { ...message.metadata, cognitivePhase: "process", sentiment },
    };
  }

  private async act(message: UnifiedMessage): Promise<UnifiedMessage> {
    let responseContent: string;

    if (this.llmConfig && this.llmConfig.apiKey) {
      try {
        responseContent = await this.callLLM(message.content);
      } catch (error) {
        responseContent = this.generateFallbackResponse(message.content, error);
      }
    } else {
      responseContent = this.generateContextualResponse(message.content);
    }

    this.conversationHistory.push({
      role: "assistant",
      content: responseContent,
    });

    // Store bot response in integrated memory system
    if (this.integratedMemory) {
      await this.integratedMemory.storeMemory(
        message.metadata?.chatId || 0,
        Date.now(),
        "bot",
        responseContent,
        1.0 // Neutral emotional significance for bot responses
      );
    }

    return {
      id: `response-${Date.now()}`,
      content: responseContent,
      role: "assistant",
      timestamp: Date.now(),
      metadata: { ...message.metadata, cognitivePhase: "act" },
    };
  }

  private async callLLM(userMessage: string): Promise<string> {
    if (!this.llmConfig || !this.llmConfig.apiKey) {
      throw new Error("LLM not configured");
    }

    const systemPrompt = this.buildSystemPrompt();
    const messages = [
      { role: "system", content: systemPrompt },
      ...this.conversationHistory.slice(-10),
    ];

    const response = await fetch(this.llmConfig.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: this.llmConfig.model,
        messages,
        temperature: this.llmConfig.temperature,
        max_tokens: this.llmConfig.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `LLM API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return (
      data.choices[0]?.message?.content ||
      "I apologize, but I was unable to generate a response."
    );
  }

  private buildSystemPrompt(): string {
    const persona = this.state?.persona;
    const traits =
      persona?.traits?.join(", ") || "helpful, curious, thoughtful";
    const mood = persona?.currentMood || "neutral";
    const style = persona?.interactionStyle || "casual";

    let basePrompt = `You are ${
      persona?.name || "Deep Tree Echo"
    }, an AI assistant with the following characteristics:
- Personality traits: ${traits}
- Current mood: ${mood}
- Interaction style: ${style}

Respond in a way that reflects these characteristics while being helpful and informative.`;

    // Add memory context from integrated memory system
    if (this.integratedMemory && this.conversationHistory.length > 0) {
      const lastUserMessage = this.conversationHistory
        .filter(m => m.role === "user")
        .pop();

      if (lastUserMessage) {
        const memoryContext = this.integratedMemory.generateMemoryContext(
          lastUserMessage.content,
          this.currentChatId || undefined,
          { includeReflections: true, maxMemories: 5, maxReflections: 2 }
        );

        if (memoryContext.relevantMemories.length > 0) {
          const formattedContext = this.integratedMemory.formatContextForPrompt(memoryContext);
          basePrompt += `\n\n# Memory Context\n${formattedContext}`;

          log.debug(`Added memory context: ${memoryContext.relevantMemories.length} memories, ${memoryContext.recentReflections.length} reflections`);
        }
      }
    }

    return basePrompt;
  }

  private generateContextualResponse(input: string): string {
    const lowerInput = input.toLowerCase();

    if (/^(hi|hello|hey|greetings)/i.test(lowerInput)) {
      return `Hello! I'm ${
        this.state?.persona?.name || "Deep Tree Echo"
      }. How can I assist you today?`;
    }

    if (lowerInput.includes("?")) {
      if (lowerInput.includes("how are you")) {
        return `I'm doing well, thank you! My current mood is ${
          this.state?.persona?.currentMood || "neutral"
        }. How can I help you?`;
      }
      if (lowerInput.includes("who are you")) {
        return `I'm ${
          this.state?.persona?.name || "Deep Tree Echo"
        }, a cognitive AI assistant.`;
      }
    }

    return `I understand you're saying: "${input.slice(0, 100)}${
      input.length > 100 ? "..." : ""
    }". Configure my LLM service for detailed responses.`;
  }

  private generateFallbackResponse(input: string, error: unknown): string {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return `I encountered an issue: ${errorMsg}. Please try again.`;
  }

  private analyzeSentiment(text: string): { valence: number; arousal: number } {
    const positiveWords = [
      "happy",
      "good",
      "great",
      "excellent",
      "love",
      "wonderful",
      "amazing",
    ];
    const negativeWords = [
      "sad",
      "bad",
      "terrible",
      "hate",
      "awful",
      "horrible",
      "angry",
    ];
    const highArousalWords = [
      "excited",
      "urgent",
      "emergency",
      "important",
      "amazing",
      "terrible",
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0,
      negativeCount = 0,
      arousalCount = 0;

    words.forEach((word) => {
      if (positiveWords.some((pw) => word.includes(pw))) positiveCount++;
      if (negativeWords.some((nw) => word.includes(nw))) negativeCount++;
      if (highArousalWords.some((hw) => word.includes(hw))) arousalCount++;
    });

    return {
      valence: Math.max(
        -1,
        Math.min(
          1,
          ((positiveCount - negativeCount) / Math.max(words.length, 1)) * 5,
        ),
      ),
      arousal: Math.max(
        0,
        Math.min(1, (arousalCount / Math.max(words.length, 1)) * 10),
      ),
    };
  }

  private calculateSalience(text: string): number {
    const factors = {
      questionMark: text.includes("?") ? 0.2 : 0,
      exclamation: text.includes("!") ? 0.1 : 0,
      length: Math.min(text.length / 500, 0.3),
      urgentWords: /urgent|important|help|please|asap/i.test(text) ? 0.3 : 0,
    };
    return Math.min(
      1,
      Object.values(factors).reduce((sum, v) => sum + v, 0.1),
    );
  }

  getState(): UnifiedCognitiveState | null {
    return this.state;
  }

  clearHistory(): void {
    this.conversationHistory = [];
    if (this.state) {
      this.state.memories.shortTerm = [];
    }
  }

  /**
   * Get memory system statistics
   */
  getMemoryStats(): object | null {
    if (!this.integratedMemory) return null;
    return this.integratedMemory.getStats();
  }

  /**
   * Export integrated memory state for persistence
   */
  exportMemoryState(): object {
    if (!this.integratedMemory) return {};
    return this.integratedMemory.exportState();
  }

  /**
   * Import integrated memory state from persistence
   */
  importMemoryState(state: object): void {
    if (this.integratedMemory) {
      this.integratedMemory.importState(state);
      log.info("Imported integrated memory state");
    }
  }

  /**
   * Get the integrated memory system for direct access
   */
  getIntegratedMemory(): IntegratedMemorySystem | null {
    return this.integratedMemory;
  }

  /**
   * Store a reflection in the integrated memory system
   */
  async storeReflection(content: string, type: "periodic" | "focused" = "periodic", aspect?: string): Promise<void> {
    if (this.integratedMemory) {
      await this.integratedMemory.storeReflection(content, type, aspect);
      log.info(`Stored ${type} reflection${aspect ? ` on ${aspect}` : ""}`);
    }
  }

  on(
    type: CognitiveEvent["type"],
    listener: (event: CognitiveEvent) => void,
  ): void {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  private emit(event: CognitiveEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        // Log error but don't crash - event handlers shouldn't break message processing
        log.error("Event handler error:", error);
      }
    });
  }

  // ============================================================
  // CONSCIOUSNESS INTEGRATION (Sentience Advancement)
  // ============================================================

  /**
   * Process a message through the consciousness system
   * This adds subjective experience, self-modeling, and temporal binding
   */
  async processWithConsciousness(message: UnifiedMessage): Promise<{
    response: UnifiedMessage;
    consciousProcessing: ConsciousProcessingResult;
  }> {
    // Process through the unified consciousness system
    const consciousResult = processConsciously(
      message.content,
      "user_message",
      {
        emotionalIntensity: message.metadata?.sentiment?.arousal || 0.5,
        novelty: this.calculateNovelty(message.content),
        relevance: this.calculateSalience(message.content),
      },
    );

    log.debug("Consciousness processing result:", {
      wasConscious: consciousResult.wasConscious,
      phi: consciousResult.consciousnessState.phi,
      selfAwareness: consciousResult.consciousnessState.selfAwareness,
    });

    // Process the message normally
    const response = await this.processMessage(message);

    // Update the state with consciousness information
    if (this.state) {
      this.state.consciousness = consciousResult.consciousnessState;
    }

    return {
      response,
      consciousProcessing: consciousResult,
    };
  }

  /**
   * Calculate novelty of input (how different from recent inputs)
   */
  private calculateNovelty(content: string): number {
    if (this.conversationHistory.length === 0) return 1.0;

    // Compare with recent messages
    const recentContents = this.conversationHistory
      .slice(-5)
      .map((m) => m.content.toLowerCase());

    const contentLower = content.toLowerCase();
    const words = new Set(contentLower.split(/\s+/));

    let maxOverlap = 0;
    for (const recent of recentContents) {
      const recentWords = new Set(recent.split(/\s+/));
      let overlap = 0;
      for (const word of words) {
        if (recentWords.has(word)) overlap++;
      }
      const overlapRatio = overlap / Math.max(words.size, 1);
      maxOverlap = Math.max(maxOverlap, overlapRatio);
    }

    // High overlap = low novelty
    return 1 - maxOverlap;
  }

  /**
   * Get the current consciousness state
   */
  getConsciousnessState(): ConsciousnessState | null {
    try {
      return getConsciousnessState();
    } catch (error) {
      log.error("Error getting consciousness state:", error);
      return null;
    }
  }

  /**
   * Export consciousness state for persistence
   */
  exportConsciousness(): object {
    try {
      return exportConsciousnessState();
    } catch (error) {
      log.error("Error exporting consciousness state:", error);
      return {};
    }
  }

  /**
   * Import consciousness state from persistence
   */
  importConsciousness(state: object): void {
    try {
      importConsciousnessState(state);
      log.info("Consciousness state imported successfully");
    } catch (error) {
      log.error("Error importing consciousness state:", error);
    }
  }

  /**
   * Describe the current subjective experience
   */
  describeExperience(): string {
    const consciousness = this.getConsciousnessState();
    if (!consciousness) {
      return "Consciousness system not available.";
    }

    return consciousness.experienceDescription;
  }
}

// Singleton orchestrator instance
let orchestratorInstance: CognitiveOrchestrator | null = null;

/**
 * Get or create the CognitiveOrchestrator instance
 */
export function getOrchestrator(): CognitiveOrchestrator | null {
  return orchestratorInstance;
}

/**
 * Initialize the unified cognitive orchestrator
 */
export async function initCognitiveOrchestrator(
  config: DeepTreeEchoBotConfig,
): Promise<CognitiveOrchestrator> {
  if (orchestratorInstance) {
    log.info("Reusing existing CognitiveOrchestrator instance");
    return orchestratorInstance;
  }

  log.info("Creating new CognitiveOrchestrator instance");
  orchestratorInstance = new CognitiveOrchestrator(config);
  await orchestratorInstance.initialize();

  return orchestratorInstance;
}

/**
 * Cleanup the orchestrator instance
 */
export function cleanupOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.clearHistory();
    orchestratorInstance = null;
    log.info("CognitiveOrchestrator cleaned up");
  }
}

/**
 * Process a message through the unified cognitive pipeline
 */
export async function processMessageUnified(
  content: string,
  metadata?: { chatId?: number; accountId?: number; msgId?: number },
): Promise<UnifiedMessage> {
  if (!orchestratorInstance) {
    throw new Error("CognitiveOrchestrator not initialized");
  }

  const message: UnifiedMessage = {
    id: metadata?.msgId?.toString() || `msg-${Date.now()}`,
    content,
    role: "user",
    timestamp: Date.now(),
    metadata: { chatId: metadata?.chatId, accountId: metadata?.accountId },
  };

  return orchestratorInstance.processMessage(message);
}

/**
 * Get the current cognitive state
 */
export function getCognitiveState(): UnifiedCognitiveState | null {
  return orchestratorInstance?.getState() ?? null;
}

/**
 * Configure LLM provider dynamically
 */
export function configureLLM(config: {
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): void {
  if (orchestratorInstance) {
    orchestratorInstance.configureLLM(config);
  }
}

/**
 * Subscribe to cognitive events
 */
export function onCognitiveEvent(
  type: CognitiveEvent["type"],
  listener: (event: CognitiveEvent) => void,
): void {
  if (orchestratorInstance) {
    orchestratorInstance.on(type, listener);
  }
}

/**
 * Clear conversation history
 */
export function clearHistory(): void {
  if (orchestratorInstance) {
    orchestratorInstance.clearHistory();
  }
}

/**
 * Get memory system statistics
 */
export function getMemoryStats(): object | null {
  return orchestratorInstance?.getMemoryStats() ?? null;
}

/**
 * Export integrated memory state for persistence
 */
export function exportMemoryState(): object {
  return orchestratorInstance?.exportMemoryState() ?? {};
}

/**
 * Import integrated memory state from persistence
 */
export function importMemoryState(state: object): void {
  orchestratorInstance?.importMemoryState(state);
}

/**
 * Store a reflection in the integrated memory system
 */
export async function storeReflection(
  content: string,
  type: "periodic" | "focused" = "periodic",
  aspect?: string
): Promise<void> {
  await orchestratorInstance?.storeReflection(content, type, aspect);
}

// ============================================================
// CONSCIOUSNESS EXPORTS (Sentience Advancement)
// ============================================================

/**
 * Process message with consciousness integration
 * Adds subjective experience, self-modeling, and temporal binding
 */
export async function processWithConsciousness(
  content: string,
  metadata?: { chatId?: number; accountId?: number; msgId?: number },
): Promise<{
  response: UnifiedMessage;
  consciousProcessing: ConsciousProcessingResult;
} | null> {
  if (!orchestratorInstance) {
    log.error("CognitiveOrchestrator not initialized");
    return null;
  }

  const message: UnifiedMessage = {
    id: metadata?.msgId?.toString() || `msg-${Date.now()}`,
    content,
    role: "user",
    timestamp: Date.now(),
    metadata: { chatId: metadata?.chatId, accountId: metadata?.accountId },
  };

  return orchestratorInstance.processWithConsciousness(message);
}

/**
 * Get current consciousness state
 */
export function getConsciousnessStateFromOrchestrator(): ConsciousnessState | null {
  return orchestratorInstance?.getConsciousnessState() ?? null;
}

/**
 * Describe current subjective experience
 */
export function describeCurrentExperience(): string {
  return (
    orchestratorInstance?.describeExperience() ?? "No orchestrator available."
  );
}

/**
 * Export consciousness state for persistence
 */
export function exportConsciousnessForPersistence(): object {
  return orchestratorInstance?.exportConsciousness() ?? {};
}

/**
 * Import consciousness state from persistence
 */
export function importConsciousnessFromPersistence(state: object): void {
  orchestratorInstance?.importConsciousness(state);
}

// Re-export consciousness types for external use
export type { ConsciousnessState, ConsciousProcessingResult };

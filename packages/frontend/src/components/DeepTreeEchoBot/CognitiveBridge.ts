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
import { getDefaultLLMEndpoint } from "./llmEndpoint";

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
  type MemoryContext as _MemoryContext,
} from "deep-tree-echo-core/memory";

// Relevance Realization Workspace
import {
  relevanceWorkspace,
  RelevanceType,
  CognitiveDomain,
  type RelevanceSignal,
} from "deep-tree-echo-core/consciousness";

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
  relevanceInsights?: {
    overallSalience: number;
    urgency: number;
    dominantRelevanceType: string | null;
    relevantDomains: string[];
    shouldPrioritize: boolean;
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
  /**
   * Runtime scientific-genius / entelechy visual signal consumed by the DTEcho
   * Live2D projection layer. This mirrors the Node-side
   * EntelechyIntegration.getScientificGeniusVisualState() contract while staying
   * browser-safe for renderer-only sessions.
   */
  scientificGeniusVisualState?: ScientificGeniusVisualState;
}

export interface MetabolicVisualState {
  metabolicPhase: "active" | "integrating" | "consolidating" | "resting";
  energyLevel: number;
  anabolicBalance: number;
  isEnergyCrisis: boolean;
  myelinationProgress: number;
  knowledgeDensity: number;
}

export interface ScientificGeniusVisualState {
  mode:
    | "Scientific Genius"
    | "Synthesis Phase"
    | "Knowledge Integration"
    | "Recursive Expansion"
    | "Idle";
  scientificGenius: number;
  insightPotential: number;
  entelechyScore: number;
  freeEnergy: number;
  salience: number;
  phi?: number;
  selfAwareness?: number;
  sentience?: number;
  flow?: number;
  temporalCoherence?: number;
  valence?: number;
  arousal?: number;
  daoConsensus?: number;
  esnCoherence?: number;
  autognosisResonance?: number;
  /** ConceptualMetabolism state, authoritative when supplied by the backend. */
  metabolic?: MetabolicVisualState;
  causalRigor?: number;
  falsificationPressure?: number;
  epistemicSurprise?: number;
  daoEvidenceConsensus?: number;
  activeExperimentation?: number;
  isProcessing?: boolean;
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
        apiEndpoint: config.apiEndpoint || getDefaultLLMEndpoint(),
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
        getDefaultLLMEndpoint(),
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
      scientificGeniusVisualState: this.deriveScientificGeniusVisualState(
        { valence: 0, arousal: 0.25 },
        {
          overallSalience: 0.5,
          urgency: 0.3,
          dominantRelevanceType: null,
          relevantDomains: [],
          shouldPrioritize: false,
        },
      ),
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
      const emotionalSignificance = this.calculateEmotionalSignificance(
        message.content,
      );
      await this.integratedMemory.storeMemory(
        message.metadata?.chatId || 0,
        parseInt(message.id) || Date.now(),
        "user",
        message.content,
        emotionalSignificance,
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
    const significance =
      1.0 + valenceIntensity * 0.3 + sentiment.arousal * 0.3 + salience * 0.4;

    return Math.min(2.0, significance); // Cap at 2.0
  }

  private async process(message: UnifiedMessage): Promise<UnifiedMessage> {
    const sentiment = this.analyzeSentiment(message.content);

    // Process through Relevance Realization Workspace
    let relevanceSignals: RelevanceSignal[] = [];
    try {
      relevanceSignals = await relevanceWorkspace.processInput({
        type: "message",
        content: message.content,
        chatId: message.metadata?.chatId,
        sentiment,
        timestamp: message.timestamp,
      });

      log.debug(
        `Relevance processing returned ${relevanceSignals.length} signals`,
      );
    } catch (error) {
      log.warn("Relevance processing failed, using fallback:", error);
    }

    // Extract relevance insights
    const relevanceInsights = this.extractRelevanceInsights(relevanceSignals);

    if (this.state?.cognitiveContext) {
      this.state.cognitiveContext.emotionalValence = sentiment.valence;
      this.state.cognitiveContext.emotionalArousal = sentiment.arousal;
      this.state.cognitiveContext.salienceScore =
        relevanceInsights.overallSalience;
      this.state.cognitiveContext.relevantMemories =
        relevanceInsights.relevantDomains;
      this.state.cognitiveContext.attentionWeight = relevanceInsights.urgency;
      this.state.scientificGeniusVisualState =
        this.deriveScientificGeniusVisualState(sentiment, relevanceInsights);
    }

    return {
      ...message,
      metadata: {
        ...message.metadata,
        cognitivePhase: "process",
        sentiment,
        relevanceInsights,
      },
    };
  }

  /**
   * Extract actionable insights from relevance signals
   */
  private extractRelevanceInsights(signals: RelevanceSignal[]): {
    overallSalience: number;
    urgency: number;
    dominantRelevanceType: string | null;
    relevantDomains: string[];
    shouldPrioritize: boolean;
  } {
    if (signals.length === 0) {
      return {
        overallSalience: 0.5,
        urgency: 0.3,
        dominantRelevanceType: null,
        relevantDomains: [],
        shouldPrioritize: false,
      };
    }

    // Calculate aggregate metrics
    const totalSalience = signals.reduce((sum, s) => sum + s.salience, 0);
    const totalUrgency = signals.reduce((sum, s) => sum + s.urgency, 0);
    const overallSalience = totalSalience / signals.length;
    const urgency = totalUrgency / signals.length;

    // Find dominant relevance type
    const typeCounts = new Map<RelevanceType, number>();
    for (const signal of signals) {
      typeCounts.set(
        signal.relevanceType,
        (typeCounts.get(signal.relevanceType) || 0) + 1,
      );
    }
    let dominantRelevanceType: RelevanceType | null = null;
    let maxCount = 0;
    for (const [type, count] of typeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantRelevanceType = type;
      }
    }

    // Get relevant domains
    const domains = new Set<string>();
    for (const signal of signals) {
      if (signal.salience > 0.4) {
        domains.add(signal.source);
      }
    }

    // Determine if this should be prioritized
    const shouldPrioritize = overallSalience > 0.7 || urgency > 0.6;

    return {
      overallSalience,
      urgency,
      dominantRelevanceType,
      relevantDomains: Array.from(domains),
      shouldPrioritize,
    };
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  }

  private deriveScientificGeniusVisualState(
    sentiment: { valence: number; arousal: number },
    relevanceInsights: {
      overallSalience: number;
      urgency: number;
      dominantRelevanceType: string | null;
      relevantDomains: string[];
      shouldPrioritize: boolean;
    },
  ): ScientificGeniusVisualState {
    const salience = this.clamp01(relevanceInsights.overallSalience);
    const urgency = this.clamp01(relevanceInsights.urgency);
    const arousal = this.clamp01(sentiment.arousal);
    const positiveValence = this.clamp01(Math.max(0, sentiment.valence));
    const semanticBreadth = this.clamp01(
      relevanceInsights.relevantDomains.length / 4,
    );
    const noveltyBias = relevanceInsights.shouldPrioritize ? 0.16 : 0;

    const scientificGenius = this.clamp01(
      salience * 0.42 +
        urgency * 0.18 +
        arousal * 0.14 +
        semanticBreadth * 0.16 +
        positiveValence * 0.1 +
        noveltyBias,
    );
    const insightPotential = this.clamp01(
      salience * 0.46 + semanticBreadth * 0.24 + urgency * 0.2 + arousal * 0.1,
    );
    const entelechyScore = this.clamp01(
      scientificGenius * 0.45 + insightPotential * 0.35 + positiveValence * 0.2,
    );
    const freeEnergy = this.clamp01(
      urgency * 0.5 + arousal * 0.35 + (1 - salience) * 0.15,
    );
    const daoConsensus = this.clamp01(
      entelechyScore * 0.38 +
        salience * 0.24 +
        semanticBreadth * 0.2 +
        positiveValence * 0.18,
    );
    const esnCoherence = this.clamp01(
      salience * 0.32 +
        insightPotential * 0.28 +
        semanticBreadth * 0.22 +
        (1 - freeEnergy) * 0.18,
    );
    const autognosisResonance = this.clamp01(
      scientificGenius * 0.34 +
        daoConsensus * 0.26 +
        esnCoherence * 0.24 +
        arousal * 0.16,
    );
    const energyLevel = this.clamp01(
      1 - freeEnergy * 0.65 + entelechyScore * 0.25,
    );
    const metabolicPhase: MetabolicVisualState["metabolicPhase"] =
      scientificGenius >= 0.65
        ? "active"
        : insightPotential >= 0.5
          ? "integrating"
          : salience <= 0.25
            ? "resting"
            : "consolidating";
    const metabolic: MetabolicVisualState = {
      metabolicPhase,
      energyLevel,
      anabolicBalance: Math.max(
        -1,
        Math.min(1, insightPotential + positiveValence * 0.4 - freeEnergy),
      ),
      isEnergyCrisis: energyLevel < 0.2 || freeEnergy > 0.85,
      myelinationProgress: esnCoherence,
      knowledgeDensity: Math.min(
        5,
        semanticBreadth * 3 + (this.state?.reasoning.atomspaceSize ?? 0) / 1000,
      ),
    };

    const causalRigor = this.clamp01(
      esnCoherence * 0.35 + daoConsensus * 0.3 + semanticBreadth * 0.35,
    );
    const falsificationPressure = freeEnergy;
    const epistemicSurprise = this.clamp01(
      urgency * (1 - salience) * 0.7 + noveltyBias * 1.5,
    );
    const daoEvidenceConsensus = daoConsensus;
    const activeExperimentation = relevanceInsights.shouldPrioritize
      ? this.clamp01(urgency * 0.7 + salience * 0.3)
      : 0;

    const mode: ScientificGeniusVisualState["mode"] =
      scientificGenius >= 0.72
        ? "Scientific Genius"
        : insightPotential >= 0.58
          ? "Knowledge Integration"
          : salience >= 0.48
            ? "Recursive Expansion"
            : "Idle";

    return {
      mode,
      scientificGenius,
      insightPotential,
      entelechyScore,
      freeEnergy,
      salience,
      daoConsensus,
      esnCoherence,
      autognosisResonance,
      metabolic,
      causalRigor,
      falsificationPressure,
      epistemicSurprise,
      daoEvidenceConsensus,
      activeExperimentation,
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
        1.0, // Neutral emotional significance for bot responses
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

  private async callLLM(_userMessage: string): Promise<string> {
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
        .filter((m) => m.role === "user")
        .pop();

      if (lastUserMessage) {
        const memoryContext = this.integratedMemory.generateMemoryContext(
          lastUserMessage.content,
          this.currentChatId || undefined,
          { includeReflections: true, maxMemories: 5, maxReflections: 2 },
        );

        if (memoryContext.relevantMemories.length > 0) {
          const formattedContext =
            this.integratedMemory.formatContextForPrompt(memoryContext);
          basePrompt += `\n\n# Memory Context\n${formattedContext}`;

          log.debug(
            `Added memory context: ${memoryContext.relevantMemories.length} memories, ${memoryContext.recentReflections.length} reflections`,
          );
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

  private generateFallbackResponse(_input: string, error: unknown): string {
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

  getScientificGeniusVisualState(): ScientificGeniusVisualState | null {
    return this.state?.scientificGeniusVisualState ?? null;
  }

  /**
   * Merge an authoritative backend ESN/Autognosis visual signal into the
   * renderer-local bridge. This preserves the browser-safe fallback model while
   * letting the desktop orchestrator drive the Live2D avatar when its autonomy
   * pipeline is running.
   */
  applyScientificGeniusVisualState(
    signal: ScientificGeniusVisualState | null | undefined,
  ): void {
    if (!signal || !this.state) return;

    this.state.scientificGeniusVisualState = signal;

    if (this.state.cognitiveContext) {
      this.state.cognitiveContext.salienceScore = this.clamp01(signal.salience);
      this.state.cognitiveContext.attentionWeight = this.clamp01(
        Math.max(signal.insightPotential, signal.entelechyScore),
      );
      if (typeof signal.valence === "number") {
        this.state.cognitiveContext.emotionalValence = Math.max(
          -1,
          Math.min(1, signal.valence),
        );
      }
      if (typeof signal.arousal === "number") {
        this.state.cognitiveContext.emotionalArousal = this.clamp01(
          signal.arousal,
        );
      }
    }

    if (signal.mode === "Scientific Genius") {
      this.state.persona.currentMood = "scientific-genius";
      this.state.reasoning.confidenceLevel = this.clamp01(
        Math.max(
          this.state.reasoning.confidenceLevel,
          signal.entelechyScore,
          signal.daoConsensus ?? 0,
          signal.esnCoherence ?? 0,
        ),
      );
      this.state.reasoning.attentionFocus = Array.from(
        new Set([
          ...this.state.reasoning.attentionFocus,
          "ESN Autognosis",
          "luminous inference",
          "scientific synthesis",
        ]),
      ).slice(-6);
    }
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
  async storeReflection(
    content: string,
    type: "periodic" | "focused" = "periodic",
    aspect?: string,
  ): Promise<void> {
    if (this.integratedMemory) {
      await this.integratedMemory.storeReflection(content, type, aspect);
      log.info(`Stored ${type} reflection${aspect ? ` on ${aspect}` : ""}`);
    }
  }

  /**
   * Get the current relevance workspace state
   */
  getRelevanceState(): object | null {
    try {
      return relevanceWorkspace.getState();
    } catch (error) {
      log.error("Error getting relevance state:", error);
      return null;
    }
  }

  /**
   * Add a goal to the relevance workspace
   */
  addGoal(
    description: string,
    priority: number = 0.5,
    relevanceType: RelevanceType = RelevanceType.Teleological,
  ): string {
    try {
      return relevanceWorkspace.addGoal({
        description,
        priority,
        relevanceType,
        progress: 0,
        subgoals: [],
      });
    } catch (error) {
      log.error("Error adding goal:", error);
      return "";
    }
  }

  /**
   * Update the arena (environment/situation) in relevance workspace
   */
  updateArena(situation: string, uncertainty: number = 0.5): void {
    try {
      relevanceWorkspace.updateArena({
        situation,
        uncertainty,
      });
    } catch (error) {
      log.error("Error updating arena:", error);
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

export function getScientificGeniusVisualState(): ScientificGeniusVisualState | null {
  return orchestratorInstance?.getScientificGeniusVisualState() ?? null;
}

export function applyScientificGeniusVisualState(
  signal: ScientificGeniusVisualState | null | undefined,
): void {
  orchestratorInstance?.applyScientificGeniusVisualState(signal);
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
  aspect?: string,
): Promise<void> {
  await orchestratorInstance?.storeReflection(content, type, aspect);
}

/**
 * Get the current relevance workspace state
 */
export function getRelevanceState(): object | null {
  return orchestratorInstance?.getRelevanceState() ?? null;
}

/**
 * Add a goal to the relevance workspace
 */
export function addGoal(
  description: string,
  priority: number = 0.5,
  relevanceType: RelevanceType = RelevanceType.Teleological,
): string {
  return (
    orchestratorInstance?.addGoal(description, priority, relevanceType) ?? ""
  );
}

/**
 * Update the arena (environment/situation) in the relevance workspace
 */
export function updateArena(
  situation: string,
  uncertainty: number = 0.5,
): void {
  orchestratorInstance?.updateArena(situation, uncertainty);
}

// Re-export relevance types for external use
export { RelevanceType, CognitiveDomain };

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

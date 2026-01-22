/**
 * Cognitive Orchestrator for Deep Tree Echo
 *
 * Main orchestration class that coordinates cognitive processing,
 * integrating PersonaCore, RAGMemoryStore, and LLMService with
 * sentiment analysis and state management.
 */

import { EventEmitter } from "events";
import {
  UnifiedMessage,
  UnifiedCognitiveState,
  CognitiveOrchestratorConfig,
  DEFAULT_ORCHESTRATOR_CONFIG,
  CognitiveResult,
  ProcessingMetrics,
  CognitiveEvent,
  CognitiveEventListener,
  EmotionalVector,
} from "./types";
import {
  SentimentAnalyzer,
  createSentimentAnalyzer,
} from "./sentiment-analyzer";
import { CognitiveStateManager, createCognitiveState } from "./cognitive-state";
import {
  UnifiedMessageHandler,
  createMessageHandler,
} from "./unified-message";
import {
  PersonaAdapter,
  createPersonaAdapter,
  IPersonaCore,
} from "./integrations/persona-adapter";
import {
  MemoryAdapter,
  createMemoryAdapter,
  IRAGMemoryStore,
} from "./integrations/memory-adapter";
import {
  LLMAdapter,
  createLLMAdapter,
  ILLMService,
  PromptContext,
} from "./integrations/llm-adapter";

/**
 * CognitiveOrchestrator manages the complete cognitive processing pipeline
 */
export class CognitiveOrchestrator extends EventEmitter {
  private config: CognitiveOrchestratorConfig;
  private stateManager: CognitiveStateManager;
  private messageHandler: UnifiedMessageHandler;
  private sentimentAnalyzer: SentimentAnalyzer;
  private personaAdapter: PersonaAdapter;
  private memoryAdapter: MemoryAdapter;
  private llmAdapter: LLMAdapter;
  private isInitialized = false;
  private currentChatId = 0;
  private messageCounter = 0;

  constructor(config: Partial<CognitiveOrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };

    // Initialize components
    this.stateManager = createCognitiveState({
      maxStreams: this.config.maxStreams,
    });
    this.messageHandler = createMessageHandler(100);
    this.sentimentAnalyzer = createSentimentAnalyzer({
      detectEmotions: this.config.enableSentiment,
    });
    this.personaAdapter = createPersonaAdapter();
    this.memoryAdapter = createMemoryAdapter({
      defaultSearchLimit: this.config.memorySearchLimit,
    });
    this.llmAdapter = createLLMAdapter({
      includeEmotionalContext: this.config.enableEmotion,
      includeMemoryContext: this.config.enableMemory,
    });

    // Set up internal event forwarding
    this.setupEventForwarding();
  }

  /**
   * Set up event forwarding from components
   */
  private setupEventForwarding(): void {
    this.stateManager.onStateEvent((event) => {
      this.emit("cognitive_event", event);
    });
  }

  /**
   * Initialize the orchestrator with required services
   */
  async initialize(
    options: {
      persona?: IPersonaCore;
      memory?: IRAGMemoryStore;
      llm?: ILLMService;
      chatId?: number;
    } = {},
  ): Promise<void> {
    if (options.persona) {
      this.personaAdapter.connect(options.persona);
    }
    if (options.memory) {
      this.memoryAdapter.connect(options.memory);
    }
    if (options.llm) {
      this.llmAdapter.connect(options.llm);
    }
    if (options.chatId !== undefined) {
      this.currentChatId = options.chatId;
    }

    this.stateManager.start();
    this.isInitialized = true;

    this.emitEvent("state_updated", { initialized: true });
  }

  /**
   * Shutdown the orchestrator
   */
  shutdown(): void {
    this.stateManager.stop();
    this.personaAdapter.disconnect();
    this.memoryAdapter.disconnect();
    this.llmAdapter.disconnect();
    this.isInitialized = false;
  }

  /**
   * Process a user message through the cognitive pipeline
   */
  async processMessage(
    content: string,
    options: {
      chatId?: number;
      messageId?: number;
      skipMemory?: boolean;
      skipSentiment?: boolean;
    } = {},
  ): Promise<CognitiveResult> {
    const startTime = Date.now();
    const metrics: ProcessingMetrics = {
      totalTime: 0,
      memoryTime: 0,
      inferenceTime: 0,
      sentimentTime: 0,
      memoriesRetrieved: 0,
      tokensProcessed: 0,
    };

    const chatId = options.chatId ?? this.currentChatId;
    const messageId = options.messageId ?? ++this.messageCounter;

    // Create stream for this processing
    const stream = this.stateManager.createStream("sense", { content });
    this.stateManager.updateStream(stream.id, { status: "active" });

    this.emitEvent("message_received", { content, chatId, messageId });
    this.emitEvent("processing_start", { messageId: stream.id });

    // Create user message
    let userMessage = this.messageHandler.createUserMessage(content);

    // Step 1: Sentiment analysis
    if (this.config.enableSentiment && !options.skipSentiment) {
      const sentimentStart = Date.now();
      const sentiment = this.sentimentAnalyzer.analyze(content);
      const emotion = this.sentimentAnalyzer.extractEmotion(content);

      userMessage = this.messageHandler.enrichWithSentiment(
        userMessage,
        sentiment,
      );
      userMessage = this.messageHandler.enrichWithEmotion(userMessage, emotion);

      // Update cognitive state with detected emotion
      if (this.config.enableEmotion) {
        this.stateManager.updateEmotionalState(emotion);
        await this.personaAdapter.updateEmotionalState(emotion);
      }

      metrics.sentimentTime = Date.now() - sentimentStart;
    }

    // Step 2: Memory retrieval
    let memoryContext = "";
    if (
      this.config.enableMemory &&
      !options.skipMemory &&
      this.memoryAdapter.isEnabled()
    ) {
      const memoryStart = Date.now();
      const memories = this.memoryAdapter.searchRelevant(
        content,
        this.config.memorySearchLimit,
      );

      if (memories.length > 0) {
        memoryContext = this.memoryAdapter.formatMemoriesAsContext(memories);
        const memoryIds = this.memoryAdapter.getMemoryIds(memories);
        userMessage = this.messageHandler.enrichWithMemories(
          userMessage,
          memoryIds,
        );

        // Update memory context in state
        const memoryVector = this.memoryAdapter.createMemoryVector(memories);
        this.stateManager.setMemoryContext(memoryVector);

        metrics.memoriesRetrieved = memories.length;
      }

      metrics.memoryTime = Date.now() - memoryStart;
      this.emitEvent("memory_retrieved", { count: memories.length });
    }

    // Add user message to history
    this.messageHandler.addToHistory(userMessage);

    // Step 3: Transition to process phase
    this.stateManager.updateStream(stream.id, { phase: "process" });

    // Step 4: LLM inference
    const inferenceStart = Date.now();

    const promptContext: PromptContext = {
      message: content,
      systemPrompt: this.personaAdapter.getSystemPrompt(),
      history: this.messageHandler.getRecentMessages(10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      memoryContext: memoryContext || undefined,
      emotionalState: this.stateManager.getState().emotionalState,
      cognitiveParams: this.personaAdapter.getCognitiveParams(),
    };

    const llmResponse = await this.llmAdapter.generate(promptContext);
    metrics.inferenceTime = Date.now() - inferenceStart;
    metrics.tokensProcessed =
      llmResponse.tokens ?? Math.ceil(llmResponse.content.length / 4);

    this.emitEvent("inference_complete", {
      processingTime: llmResponse.processingTime,
    });

    // Step 5: Transition to act phase
    this.stateManager.updateStream(stream.id, { phase: "act" });

    // Step 6: Create response message
    let responseMessage = this.messageHandler.createAssistantMessage(
      llmResponse.content,
    );

    // Analyze response sentiment
    if (this.config.enableSentiment) {
      const responseSentiment = this.sentimentAnalyzer.analyze(
        llmResponse.content,
      );
      const responseEmotion = this.sentimentAnalyzer.extractEmotion(
        llmResponse.content,
      );
      responseMessage = this.messageHandler.enrichWithSentiment(
        responseMessage,
        responseSentiment,
      );
      responseMessage = this.messageHandler.enrichWithEmotion(
        responseMessage,
        responseEmotion,
      );
    }

    // Add processing metrics
    metrics.totalTime = Date.now() - startTime;
    responseMessage = this.messageHandler.enrichWithMetrics(responseMessage, {
      cognitiveLoad: this.stateManager.getState().cognitiveLoad,
      processingTime: metrics.totalTime,
    });

    // Add response to history
    this.messageHandler.addToHistory(responseMessage);

    // Step 7: Store in memory
    if (this.config.enableMemory && this.memoryAdapter.isConnected()) {
      await this.memoryAdapter.storeMessage(userMessage, chatId, messageId);
      await this.memoryAdapter.storeMessage(
        responseMessage,
        chatId,
        messageId + 1,
      );
    }

    // Complete stream
    this.stateManager.completeStream(stream.id);

    this.emitEvent("response_generated", {
      messageId: responseMessage.id,
      processingTime: metrics.totalTime,
    });

    return {
      response: responseMessage,
      state: this.stateManager.getState(),
      metrics,
    };
  }

  /**
   * Process a simple message without full pipeline
   */
  async quickProcess(content: string): Promise<string> {
    const result = await this.processMessage(content, {
      skipMemory: true,
      skipSentiment: true,
    });
    return result.response.content;
  }

  /**
   * Get current cognitive state
   */
  getState(): UnifiedCognitiveState {
    return this.stateManager.getState();
  }

  /**
   * Get emotional state
   */
  getEmotionalState(): EmotionalVector {
    return this.stateManager.getState().emotionalState;
  }

  /**
   * Update emotional state manually
   */
  updateEmotionalState(updates: Partial<EmotionalVector>): void {
    this.stateManager.updateEmotionalState(updates);
  }

  /**
   * Get message history
   */
  getMessageHistory(count?: number): UnifiedMessage[] {
    return this.messageHandler.getRecentMessages(count);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHandler.clearHistory();
  }

  /**
   * Get sentiment trend
   */
  getSentimentTrend(): {
    direction: "positive" | "negative" | "stable";
    strength: number;
  } {
    return this.sentimentAnalyzer.getTrend();
  }

  /**
   * Get average sentiment
   */
  getAverageSentiment(): { polarity: number; emotions: string[] } {
    const avg = this.sentimentAnalyzer.getAverage();
    return {
      polarity: avg.polarity,
      emotions: avg.emotions,
    };
  }

  /**
   * Set current chat ID
   */
  setChatId(chatId: number): void {
    this.currentChatId = chatId;
  }

  /**
   * Get current chat ID
   */
  getChatId(): number {
    return this.currentChatId;
  }

  /**
   * Reset cognitive state
   */
  reset(): void {
    this.stateManager.reset();
    this.messageHandler.clearHistory();
    this.sentimentAnalyzer.clearHistory();
    this.memoryAdapter.clearCache();
    this.emitEvent("state_updated", { reset: true });
  }

  /**
   * Check initialization status
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get configuration
   */
  getConfig(): CognitiveOrchestratorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CognitiveOrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add event listener
   */
  onCognitiveEvent(listener: CognitiveEventListener): void {
    this.on("cognitive_event", listener);
  }

  /**
   * Remove event listener
   */
  offCognitiveEvent(listener: CognitiveEventListener): void {
    this.off("cognitive_event", listener);
  }

  /**
   * Emit cognitive event
   */
  private emitEvent(
    type: CognitiveEvent["type"],
    data?: unknown,
    messageId?: string,
  ): void {
    const event: CognitiveEvent = {
      type,
      timestamp: Date.now(),
      data,
      messageId,
    };
    this.emit("cognitive_event", event);
  }

  /**
   * Get conversation context as formatted string
   */
  getContextString(messageCount?: number): string {
    return this.messageHandler.getContextString(messageCount);
  }

  /**
   * Export conversation for persistence
   */
  exportConversation(): {
    messages: UnifiedMessage[];
    state: UnifiedCognitiveState;
    chatId: number;
  } {
    return {
      messages: this.messageHandler.exportHistory(),
      state: this.stateManager.getState(),
      chatId: this.currentChatId,
    };
  }

  /**
   * Import conversation from persistence
   */
  importConversation(data: {
    messages: UnifiedMessage[];
    chatId?: number;
  }): void {
    this.messageHandler.importHistory(data.messages);
    if (data.chatId !== undefined) {
      this.currentChatId = data.chatId;
    }
  }

  /**
   * Get processing statistics
   */
  getStatistics(): {
    messagesProcessed: number;
    averageProcessingTime: number;
    currentCognitiveLoad: number;
    activeStreams: number;
  } {
    const stats = this.messageHandler.getStatistics();
    const state = this.stateManager.getState();

    return {
      messagesProcessed: stats.totalMessages,
      averageProcessingTime:
        stats.timeSpan > 0
          ? stats.timeSpan / Math.max(1, stats.totalMessages)
          : 0,
      currentCognitiveLoad: state.cognitiveLoad,
      activeStreams: state.activeStreams.filter((s) => s.status === "active")
        .length,
    };
  }
}

/**
 * Create a cognitive orchestrator
 */
export function createCognitiveOrchestrator(
  config?: Partial<CognitiveOrchestratorConfig>,
): CognitiveOrchestrator {
  return new CognitiveOrchestrator(config);
}

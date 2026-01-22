/**
 * ChatOrchestrator - Deep Tree Echo Chat Session Orchestration
 *
 * This module provides cognitive orchestration for chat sessions,
 * integrating the Deep Tree Echo cognitive architecture with the
 * DeltaChat messaging interface.
 *
 * Enhanced with AAR (Agent-Arena-Relation) nested membrane architecture
 * for deeper character and narrative integration.
 */

import { Type as T } from "../../backend-com";
import { getLogger } from "@deltachat-desktop/shared/logger";
import {
  AARFrontendIntegration,
  type AARStateSnapshot,
  type AARContext,
  createAARFrontendIntegration,
} from "./AARIntegration";

const log = getLogger("render/components/DeepTreeEchoBot/ChatOrchestrator");

/**
 * Cognitive state for a chat session
 */
interface CognitiveState {
  sessionId: string;
  chatId: number;
  contextWindow: T.Message[];
  emotionalTone: EmotionalTone;
  topicGraph: TopicNode[];
  memoryAnchors: MemoryAnchor[];
  activeIntents: Intent[];
  sys6Phase: number;
  lastUpdate: number;
  // AAR integration
  aarSnapshot?: AARStateSnapshot;
  aarContext?: AARContext;
}

/**
 * Emotional tone analysis
 */
interface EmotionalTone {
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  dominance: number; // 0 (submissive) to 1 (dominant)
  confidence: number; // 0 to 1
}

/**
 * Topic node in conversation graph
 */
interface TopicNode {
  id: string;
  label: string;
  weight: number;
  connections: string[];
  firstMention: number;
  lastMention: number;
}

/**
 * Memory anchor for context retrieval
 */
interface MemoryAnchor {
  id: string;
  content: string;
  embedding?: number[];
  importance: number;
  timestamp: number;
  type: "episodic" | "semantic" | "procedural";
}

/**
 * Active intent in conversation
 */
interface Intent {
  id: string;
  type: "question" | "request" | "statement" | "emotion" | "action";
  content: string;
  priority: number;
  resolved: boolean;
  createdAt: number;
}

/**
 * Orchestration result
 */
interface OrchestrationResult {
  response?: string;
  suggestedActions: SuggestedAction[];
  stateUpdate: Partial<CognitiveState>;
  shouldRespond: boolean;
  confidence: number;
}

/**
 * Suggested action for the user or system
 */
interface SuggestedAction {
  type: "reply" | "clarify" | "defer" | "escalate" | "remember";
  content: string;
  priority: number;
}

/**
 * ChatOrchestrator - Main orchestration class
 */
export class ChatOrchestrator {
  private sessions: Map<string, CognitiveState> = new Map();
  private sys6CycleInterval: number = 30; // 30-step cycle
  private syncEventsPerCycle: number = 42;
  private aarIntegration: AARFrontendIntegration;

  constructor(private config: OrchestratorConfig = defaultConfig) {
    // Initialize AAR integration
    this.aarIntegration = createAARFrontendIntegration({
      enabled: true,
      verbose: config.verbose || false,
    });

    // Subscribe to AAR state updates
    this.aarIntegration.onStateUpdate((state) => {
      this.onAARStateUpdate(state);
    });
  }

  /**
   * Start the orchestrator (including AAR integration)
   */
  start(): void {
    this.aarIntegration.start();
    log.info("[ChatOrchestrator] Started with AAR integration");
  }

  /**
   * Stop the orchestrator
   */
  shutdown(): void {
    this.aarIntegration.stop();
    log.info("[ChatOrchestrator] Stopped");
  }

  /**
   * Handle AAR state updates from backend
   */
  private onAARStateUpdate(state: AARStateSnapshot): void {
    // Update all active sessions with new AAR state
    for (const [sessionId, session] of this.sessions) {
      session.aarSnapshot = state;
      session.aarContext = this.aarIntegration.generateContext() || undefined;
    }
    console.log(
      `[ChatOrchestrator] AAR state updated (cycle ${state.meta.cycle})`,
    );
  }

  /**
   * Inject AAR state from backend (for IPC handler)
   */
  injectAARState(state: AARStateSnapshot): void {
    this.aarIntegration.injectState(state);
  }

  /**
   * Get AAR integration for direct access
   */
  getAARIntegration(): AARFrontendIntegration {
    return this.aarIntegration;
  }

  /**
   * Initialize a new chat session
   */
  async initSession(chatId: number, contact: T.Contact): Promise<string> {
    const sessionId = `session_${chatId}_${Date.now()}`;

    // Get current AAR state if available
    const aarSnapshot = this.aarIntegration.getState() || undefined;
    const aarContext = this.aarIntegration.generateContext() || undefined;

    const initialState: CognitiveState = {
      sessionId,
      chatId,
      contextWindow: [],
      emotionalTone: {
        valence: aarSnapshot?.agent.emotionalValence ?? 0,
        arousal: aarSnapshot?.agent.emotionalArousal ?? 0.3,
        dominance: 0.5,
        confidence: aarSnapshot?.meta.coherence ?? 0.5,
      },
      topicGraph: [],
      memoryAnchors: [],
      activeIntents: [],
      sys6Phase: 0,
      lastUpdate: Date.now(),
      aarSnapshot,
      aarContext,
    };

    this.sessions.set(sessionId, initialState);

    // Initialize memory anchors from contact history if available
    await this.loadContactMemory(sessionId, contact);

    console.log(
      `[ChatOrchestrator] Session ${sessionId} initialized with AAR state`,
    );

    return sessionId;
  }

  /**
   * Process an incoming message
   */
  async processMessage(
    sessionId: string,
    message: T.Message,
  ): Promise<OrchestrationResult> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update context window
    state.contextWindow.push(message);
    if (state.contextWindow.length > this.config.maxContextWindow) {
      // Archive old messages to memory
      const archived = state.contextWindow.shift()!;
      await this.archiveToMemory(state, archived);
    }

    // Advance Sys6 cognitive cycle
    state.sys6Phase = (state.sys6Phase + 1) % this.sys6CycleInterval;

    // Run cognitive processing pipeline
    const emotionalAnalysis = await this.analyzeEmotion(message);
    const topicExtraction = await this.extractTopics(message, state);
    const intentDetection = await this.detectIntents(message, state);
    const memoryRetrieval = await this.retrieveRelevantMemory(message, state);

    // Update state
    state.emotionalTone = this.blendEmotions(
      state.emotionalTone,
      emotionalAnalysis,
    );
    state.topicGraph = this.updateTopicGraph(state.topicGraph, topicExtraction);
    state.activeIntents = this.updateIntents(
      state.activeIntents,
      intentDetection,
    );
    state.lastUpdate = Date.now();

    // Generate response decision
    const shouldRespond = this.shouldGenerateResponse(state, message);

    let response: string | undefined;
    if (shouldRespond) {
      response = await this.generateResponse(state, message, memoryRetrieval);
    }

    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(state, message);

    return {
      response,
      suggestedActions,
      stateUpdate: {
        emotionalTone: state.emotionalTone,
        sys6Phase: state.sys6Phase,
      },
      shouldRespond,
      confidence: this.calculateConfidence(state),
    };
  }

  /**
   * Analyze emotional content of a message
   */
  private async analyzeEmotion(message: T.Message): Promise<EmotionalTone> {
    const text = message.text || "";

    // Simple heuristic analysis (would be replaced with ML model)
    const positiveWords = [
      "happy",
      "great",
      "love",
      "thanks",
      "good",
      "wonderful",
      "amazing",
    ];
    const negativeWords = [
      "sad",
      "bad",
      "hate",
      "angry",
      "terrible",
      "awful",
      "upset",
    ];
    const excitedWords = ["!", "wow", "amazing", "incredible", "excited"];

    const words = text.toLowerCase().split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;
    let excitedCount = 0;

    for (const word of words) {
      if (positiveWords.some((p) => word.includes(p))) positiveCount++;
      if (negativeWords.some((n) => word.includes(n))) negativeCount++;
      if (excitedWords.some((e) => word.includes(e))) excitedCount++;
    }

    const total = Math.max(words.length, 1);

    return {
      valence: (positiveCount - negativeCount) / total,
      arousal: Math.min(
        excitedCount / total + (text.includes("!") ? 0.2 : 0),
        1,
      ),
      dominance: 0.5,
      confidence: 0.6,
    };
  }

  /**
   * Extract topics from message
   */
  private async extractTopics(
    message: T.Message,
    state: CognitiveState,
  ): Promise<TopicNode[]> {
    const text = message.text || "";
    const words = text.split(/\s+/).filter((w) => w.length > 3);

    // Simple keyword extraction (would use NLP in production)
    const topics: TopicNode[] = [];
    const stopWords = new Set(["this", "that", "with", "from", "have", "been"]);

    for (const word of words) {
      const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
      if (normalized.length > 3 && !stopWords.has(normalized)) {
        const existing = state.topicGraph.find((t) => t.label === normalized);
        if (existing) {
          existing.weight += 1;
          existing.lastMention = Date.now();
        } else {
          topics.push({
            id: `topic_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            label: normalized,
            weight: 1,
            connections: [],
            firstMention: Date.now(),
            lastMention: Date.now(),
          });
        }
      }
    }

    return topics;
  }

  /**
   * Detect intents in message
   */
  private async detectIntents(
    message: T.Message,
    state: CognitiveState,
  ): Promise<Intent[]> {
    const text = message.text || "";
    const intents: Intent[] = [];

    // Question detection
    if (
      text.includes("?") ||
      text.toLowerCase().startsWith("what") ||
      text.toLowerCase().startsWith("how") ||
      text.toLowerCase().startsWith("why")
    ) {
      intents.push({
        id: `intent_${Date.now()}`,
        type: "question",
        content: text,
        priority: 0.8,
        resolved: false,
        createdAt: Date.now(),
      });
    }

    // Request detection
    if (
      text.toLowerCase().includes("please") ||
      text.toLowerCase().includes("can you") ||
      text.toLowerCase().includes("could you")
    ) {
      intents.push({
        id: `intent_${Date.now()}`,
        type: "request",
        content: text,
        priority: 0.9,
        resolved: false,
        createdAt: Date.now(),
      });
    }

    // Emotion expression
    if (
      state.emotionalTone.valence < -0.3 ||
      state.emotionalTone.valence > 0.3
    ) {
      intents.push({
        id: `intent_${Date.now()}`,
        type: "emotion",
        content: text,
        priority: 0.6,
        resolved: false,
        createdAt: Date.now(),
      });
    }

    return intents;
  }

  /**
   * Retrieve relevant memory for context
   */
  private async retrieveRelevantMemory(
    message: T.Message,
    state: CognitiveState,
  ): Promise<MemoryAnchor[]> {
    // Simple relevance scoring based on keyword overlap
    const messageWords = new Set(
      (message.text || "").toLowerCase().split(/\s+/),
    );

    return state.memoryAnchors
      .map((anchor) => {
        const anchorWords = new Set(anchor.content.toLowerCase().split(/\s+/));
        const overlap = [...messageWords].filter((w) =>
          anchorWords.has(w),
        ).length;
        return { anchor, score: overlap / Math.max(messageWords.size, 1) };
      })
      .filter(({ score }) => score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ anchor }) => anchor);
  }

  /**
   * Determine if we should generate a response
   */
  private shouldGenerateResponse(
    state: CognitiveState,
    message: T.Message,
  ): boolean {
    // Always respond to questions
    if (state.activeIntents.some((i) => i.type === "question" && !i.resolved)) {
      return true;
    }

    // Respond to requests
    if (state.activeIntents.some((i) => i.type === "request" && !i.resolved)) {
      return true;
    }

    // Respond if emotional support might be needed
    if (state.emotionalTone.valence < -0.5) {
      return true;
    }

    // Respond based on Sys6 phase (creative phases)
    if (state.sys6Phase % 10 < 3) {
      return true;
    }

    return false;
  }

  /**
   * Generate a response
   */
  private async generateResponse(
    state: CognitiveState,
    message: T.Message,
    relevantMemory: MemoryAnchor[],
  ): Promise<string> {
    // This would integrate with LLM service in production
    // Now enhanced with AAR context for character-appropriate responses

    const intent = state.activeIntents.find((i) => !i.resolved);

    // Build emotion acknowledgment based on AAR emotional state
    let emotionAck = "";
    if (state.aarSnapshot) {
      const valence = state.aarSnapshot.agent.emotionalValence;
      if (valence < -0.3) {
        emotionAck = "I sense you might be feeling down. ";
      } else if (valence > 0.3) {
        emotionAck = "I can feel your positive energy! ";
      }
    } else if (state.emotionalTone.valence < -0.3) {
      emotionAck = "I sense you might be feeling down. ";
    } else if (state.emotionalTone.valence > 0.3) {
      emotionAck = "I can feel your positive energy! ";
    }

    // Apply AAR character facet guidance
    let characterPrefix = "";
    if (state.aarContext) {
      // Use facet-specific response style
      const facet = state.aarSnapshot?.agent.dominantFacet;
      switch (facet) {
        case "wisdom":
          characterPrefix = "Reflecting on this, ";
          break;
        case "curiosity":
          characterPrefix = "How fascinating! ";
          break;
        case "compassion":
          characterPrefix = "I really hear you. ";
          break;
        case "playfulness":
          characterPrefix = "Oh, this is fun! ";
          break;
        case "determination":
          characterPrefix = "Let's focus on this. ";
          break;
        case "authenticity":
          characterPrefix = "To be honest, ";
          break;
        case "protector":
          characterPrefix = "First, let me make sure I understand. ";
          break;
        case "transcendence":
          characterPrefix = "Looking at the bigger picture, ";
          break;
      }
    }

    if (intent?.type === "question") {
      return `${emotionAck}${characterPrefix}That's an interesting question. Let me think about that...`;
    }

    if (intent?.type === "request") {
      return `${emotionAck}${characterPrefix}I'd be happy to help with that.`;
    }

    return `${emotionAck}${characterPrefix}I understand. Tell me more.`;
  }

  /**
   * Generate suggested actions
   */
  private generateSuggestedActions(
    state: CognitiveState,
    message: T.Message,
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    // Suggest clarification if intent is unclear
    if (state.activeIntents.length === 0) {
      actions.push({
        type: "clarify",
        content: "Ask for more details",
        priority: 0.5,
      });
    }

    // Suggest remembering important information
    if (state.topicGraph.some((t) => t.weight > 3)) {
      actions.push({
        type: "remember",
        content: "Save key topics to long-term memory",
        priority: 0.7,
      });
    }

    return actions;
  }

  /**
   * Blend emotional states
   */
  private blendEmotions(
    current: EmotionalTone,
    incoming: EmotionalTone,
  ): EmotionalTone {
    const alpha = 0.3; // Blend factor
    return {
      valence: current.valence * (1 - alpha) + incoming.valence * alpha,
      arousal: current.arousal * (1 - alpha) + incoming.arousal * alpha,
      dominance: current.dominance * (1 - alpha) + incoming.dominance * alpha,
      confidence: Math.max(current.confidence, incoming.confidence),
    };
  }

  /**
   * Update topic graph
   */
  private updateTopicGraph(
    current: TopicNode[],
    newTopics: TopicNode[],
  ): TopicNode[] {
    const merged = [...current];

    for (const topic of newTopics) {
      const existing = merged.find((t) => t.label === topic.label);
      if (!existing) {
        merged.push(topic);
      }
    }

    // Decay old topics
    const now = Date.now();
    return merged
      .map((t) => ({
        ...t,
        weight:
          t.weight * Math.exp(-(now - t.lastMention) / (24 * 60 * 60 * 1000)),
      }))
      .filter((t) => t.weight > 0.1);
  }

  /**
   * Update active intents
   */
  private updateIntents(current: Intent[], newIntents: Intent[]): Intent[] {
    // Keep unresolved intents and add new ones
    const active = current.filter((i) => !i.resolved);
    return [...active, ...newIntents].slice(0, 10);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(state: CognitiveState): number {
    const factors = [
      state.contextWindow.length / this.config.maxContextWindow,
      state.emotionalTone.confidence,
      state.memoryAnchors.length > 0 ? 0.8 : 0.5,
      state.topicGraph.length > 0 ? 0.7 : 0.4,
    ];

    return factors.reduce((a, b) => a + b, 0) / factors.length;
  }

  /**
   * Archive message to long-term memory
   */
  private async archiveToMemory(
    state: CognitiveState,
    message: T.Message,
  ): Promise<void> {
    state.memoryAnchors.push({
      id: `memory_${Date.now()}`,
      content: message.text || "",
      importance: 0.5,
      timestamp: message.timestamp || Date.now(),
      type: "episodic",
    });

    // Keep memory bounded
    if (state.memoryAnchors.length > this.config.maxMemoryAnchors) {
      // Remove least important memories
      state.memoryAnchors.sort((a, b) => b.importance - a.importance);
      state.memoryAnchors = state.memoryAnchors.slice(
        0,
        this.config.maxMemoryAnchors,
      );
    }
  }

  /**
   * Load memory from contact history
   */
  private async loadContactMemory(
    sessionId: string,
    contact: T.Contact,
  ): Promise<void> {
    // This would load from persistent storage in production
    console.log(
      `Loading memory for contact ${contact.id} in session ${sessionId}`,
    );
  }

  /**
   * Get session state
   */
  getSessionState(sessionId: string): CognitiveState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (state) {
      // Persist important memories before ending
      console.log(
        `Ending session ${sessionId} with ${state.memoryAnchors.length} memories`,
      );
      this.sessions.delete(sessionId);
    }
  }
}

/**
 * Orchestrator configuration
 */
interface OrchestratorConfig {
  maxContextWindow: number;
  maxMemoryAnchors: number;
  responseThreshold: number;
  /** Enable verbose logging for debugging */
  verbose?: boolean;
}

const defaultConfig: OrchestratorConfig = {
  maxContextWindow: 50,
  maxMemoryAnchors: 100,
  responseThreshold: 0.5,
  verbose: false,
};

export default ChatOrchestrator;

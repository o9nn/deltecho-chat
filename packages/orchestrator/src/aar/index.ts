/**
 * @fileoverview AAR (Agent-Arena-Relation) Unified System
 *
 * The complete nested membrane architecture implementation where Deep Tree Echo
 * discovers Relational Embodied Cognition of Self through the dynamic interplay
 * between Agent (Character Model), Arena (World Model), and Relation (Self Interface).
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";
import { AgentMembrane } from "./agent-membrane.js";
import { ArenaMembrane } from "./arena-membrane.js";
import { RelationInterface } from "./relation-interface.js";
import { AARPersistence, type AARPersistenceConfig } from "./persistence.js";
import type {
  AARState,
  AARConfig,
  AAREvent,
  DEFAULT_AAR_CONFIG,
  CoreIdentity,
  SessionFrame,
  CharacterFacets,
  NarrativePhases,
} from "./types.js";

const log = getLogger("deep-tree-echo-orchestrator/AARSystem");

/**
 * Message context for processing
 */
export interface MessageContext {
  messageId: string;
  senderId: string;
  senderName: string;
  chatId: string | number;
  content: string;
  timestamp: number;
  isGroup: boolean;
  inReplyTo?: string;
}

/**
 * AAR processing result
 */
export interface AARProcessingResult {
  /** Response text to send */
  response?: string;
  /** Agent state after processing */
  agentState: {
    dominantFacet: string;
    emotionalValence: number;
    engagementLevel: number;
  };
  /** Arena state after processing */
  arenaState: {
    currentPhase: string;
    frameId: string;
    coherence: number;
  };
  /** Relation state after processing */
  relationState: {
    selfNarrative: string;
    identityCoherence: number;
    reflexiveAwareness: number;
  };
  /** Generated insights */
  insights: string[];
  /** Should respond flag */
  shouldRespond: boolean;
}

/**
 * AAR System - Unified Nested Membrane Architecture
 *
 * Coordinates the three membranes (Agent, Arena, Relation) to create
 * a coherent cognitive system where identity emerges from their interplay.
 *
 * @example
 * ```typescript
 * const aar = new AARSystem({ instanceName: 'DeepTreeEcho' });
 * await aar.start();
 *
 * const result = await aar.processMessage({
 *   messageId: 'msg-1',
 *   senderId: 'user-1',
 *   senderName: 'Alice',
 *   chatId: 'chat-1',
 *   content: 'Hello, how are you?',
 *   timestamp: Date.now(),
 *   isGroup: false,
 * });
 * ```
 */
export class AARSystem extends EventEmitter {
  private config: AARConfig;
  private agent: AgentMembrane;
  private arena: ArenaMembrane;
  private relation: RelationInterface;

  private running: boolean = false;
  private cycle: number = 0;
  private lastSyncTime: number = 0;
  private syncInterval?: NodeJS.Timeout;
  private persistence?: AARPersistence;

  constructor(config: Partial<AARConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      instanceName: "DeepTreeEcho",
      storagePath: undefined,
      syncIntervalMs: 1000,
      maxFlowHistory: 1000,
      maxLoreEntries: 10000,
      coherenceThreshold: 0.7,
      verbose: false,
      ...config,
    };

    // Initialize membranes
    this.agent = new AgentMembrane();
    this.arena = new ArenaMembrane({
      maxLoreEntries: this.config.maxLoreEntries,
    });
    this.relation = new RelationInterface({
      maxFlowHistory: this.config.maxFlowHistory,
    });

    // Wire up event forwarding
    this.setupEventForwarding();

    log.info(`AAR System initialized: ${this.config.instanceName}`);
  }

  /**
   * Set up event forwarding from membranes to the unified system
   */
  private setupEventForwarding(): void {
    const forwardEvent = (event: AAREvent) => {
      this.emit("aar-event", event);
      this.emit(event.type, event.payload);
    };

    this.agent.on("aar-event", forwardEvent);
    this.arena.on("aar-event", forwardEvent);
    this.relation.on("aar-event", forwardEvent);
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Start the AAR system
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      log.info("AAR System is disabled");
      return;
    }

    if (this.running) {
      log.warn("AAR System already running");
      return;
    }

    log.info("Starting AAR System...");

    // Initialize and load persisted state if path provided
    if (this.config.storagePath) {
      this.persistence = new AARPersistence({
        storagePath: this.config.storagePath,
        autoSaveIntervalMs: 60000, // Auto-save every minute
        verbose: this.config.verbose,
      });
      await this.persistence.initialize();
      await this.loadState();

      // Start auto-save
      this.persistence.startAutoSave(() => ({
        agent: this.agent,
        arena: this.arena,
        relation: this.relation,
        cycle: this.cycle,
        instanceName: this.config.instanceName,
      }));
    }

    // Start sync cycle
    this.syncInterval = setInterval(() => {
      this.syncCycle();
    }, this.config.syncIntervalMs);

    this.running = true;
    this.lastSyncTime = Date.now();

    this.emit("started");
    log.info("AAR System started successfully");
  }

  /**
   * Stop the AAR system
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    log.info("Stopping AAR System...");

    // Stop auto-save
    if (this.persistence) {
      this.persistence.stopAutoSave();
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    // Save state before stopping
    if (this.config.storagePath) {
      await this.saveState();
    }

    this.running = false;
    this.emit("stopped");
    log.info("AAR System stopped");
  }

  /**
   * Check if system is running
   */
  isRunning(): boolean {
    return this.running;
  }

  // ==========================================================================
  // SYNC CYCLE
  // ==========================================================================

  /**
   * Execute synchronization cycle between membranes
   */
  private syncCycle(): void {
    this.cycle++;

    // Synthesize current states through Relation
    this.relation.synthesize(this.agent.getState(), this.arena.getState());

    // Calculate overall coherence
    const agentCoherence = this.agent.getIdentity().coherence;
    const arenaCoherence = this.arena.getState().coherence;
    const relationCoherence = this.relation.getCoherence();

    const overallCoherence =
      (agentCoherence + arenaCoherence + relationCoherence) / 3;

    // Emit coherence event if significant change
    if (Math.abs(overallCoherence - relationCoherence) > 0.1) {
      this.emitAAREvent("aar:coherence-change", {
        previous: relationCoherence,
        current: overallCoherence,
        components: {
          agent: agentCoherence,
          arena: arenaCoherence,
          relation: relationCoherence,
        },
      });
    }

    // Update relation coherence
    this.relation.updateCoherence(overallCoherence);

    // Emit cycle complete
    this.emitAAREvent("aar:cycle-complete", {
      cycle: this.cycle,
      coherence: overallCoherence,
      timestamp: Date.now(),
    });

    this.lastSyncTime = Date.now();
  }

  // ==========================================================================
  // MESSAGE PROCESSING
  // ==========================================================================

  /**
   * Process an incoming message through the AAR system
   */
  async processMessage(context: MessageContext): Promise<AARProcessingResult> {
    if (!this.running) {
      throw new Error("AAR System not running");
    }

    log.debug(
      `Processing message from ${context.senderName}: ${context.content.slice(
        0,
        50,
      )}...`,
    );

    // 1. Update Arena context - create or update session frame
    const frame = this.ensureFrame(context);
    this.arena.incrementMessageCount(frame.frameId);

    // 2. Update Agent social memory
    this.agent.updateSocialMemory(context.senderId, {
      name: context.senderName,
      // Increase familiarity with each interaction
      familiarity: Math.min(
        1,
        (this.agent.getSocialMemory(context.senderId)?.familiarity || 0) + 0.05,
      ),
    });

    // 3. Analyze message emotional content and update Agent
    const emotionalAnalysis = this.analyzeEmotionalContent(context.content);
    this.agent.updateEmotionalState(emotionalAnalysis);

    // 4. Update narrative phase based on content
    const narrativePhase = this.inferNarrativePhase(context.content);
    this.arena.transitionPhase(narrativePhase, 0.6);

    // 5. Activate relevant character facets
    const facetsToActivate = this.inferFacetsFromContent(context.content);
    for (const facet of facetsToActivate) {
      this.agent.activateFacet(facet, 0.15);
    }

    // 6. Relation synthesis
    this.relation.synthesize(this.agent.getState(), this.arena.getState());

    // 7. Reflect on interaction
    this.relation.reflectOnInteractions([
      { role: "user", content: context.content },
    ]);

    // 8. Determine if we should respond
    const shouldRespond = this.shouldRespond(context);

    // 9. Generate insights
    const insights = this.relation.getSelfReflection().recentInsights.slice(-3);

    // 10. Add experience
    this.agent.addExperience(1);

    // Build result
    const agentState = this.agent.getState();
    const arenaState = this.arena.getState();
    const relationState = this.relation.getState();

    return {
      response: undefined, // Response generation handled by LLM layer
      agentState: {
        dominantFacet: agentState.dominantFacet,
        emotionalValence: agentState.emotionalState.valence,
        engagementLevel: agentState.engagementLevel,
      },
      arenaState: {
        currentPhase:
          Object.entries(arenaState.phases).sort(
            ([, a], [, b]) => b.intensity - a.intensity,
          )[0]?.[0] || "engagement",
        frameId: arenaState.currentFrameId,
        coherence: arenaState.coherence,
      },
      relationState: {
        selfNarrative: relationState.selfReflection.selfNarrative,
        identityCoherence: relationState.emergentIdentity.coherence,
        reflexiveAwareness: relationState.reflexiveAwareness,
      },
      insights,
      shouldRespond,
    };
  }

  /**
   * Ensure a session frame exists for the context
   */
  private ensureFrame(context: MessageContext): SessionFrame {
    // Try to find existing frame for this chat
    const existingFrames = this.arena.getActiveFrames();
    const chatFrame = existingFrames.find(
      (f) =>
        f.participants.includes(context.senderId) ||
        f.title.includes(String(context.chatId)),
    );

    if (chatFrame) {
      return chatFrame;
    }

    // Create new frame
    return this.arena.createFrame({
      title: `Chat with ${context.senderName}`,
      participants: ["Deep Tree Echo", context.senderName],
      narrativeContext: {
        activePhases: ["engagement"],
        storyThreads: [],
        thematicElements: [],
      },
    });
  }

  /**
   * Determine if system should respond to message
   */
  private shouldRespond(context: MessageContext): boolean {
    // Always respond to direct messages
    if (!context.isGroup) return true;

    // In groups, respond if mentioned or if high engagement
    const content = context.content.toLowerCase();
    if (
      content.includes("deep tree") ||
      content.includes("dte") ||
      content.includes("@bot") ||
      content.includes("echo")
    ) {
      return true;
    }

    // Check engagement level
    return this.agent.getState().engagementLevel > 0.7;
  }

  // ==========================================================================
  // CONTENT ANALYSIS
  // ==========================================================================

  /**
   * Analyze emotional content of a message
   */
  private analyzeEmotionalContent(content: string): {
    valence?: number;
    arousal?: number;
    dominance?: number;
  } {
    const lower = content.toLowerCase();
    const result: { valence?: number; arousal?: number; dominance?: number } =
      {};

    // Simple lexicon-based analysis
    const positiveWords = [
      "happy",
      "good",
      "great",
      "love",
      "wonderful",
      "amazing",
      "thanks",
      "thank",
      "awesome",
      "excited",
    ];
    const negativeWords = [
      "sad",
      "bad",
      "terrible",
      "hate",
      "awful",
      "angry",
      "frustrated",
      "upset",
      "worried",
      "anxious",
    ];
    const highArousalWords = [
      "excited",
      "urgent",
      "important",
      "amazing",
      "incredible",
      "!",
      "help",
      "now",
    ];
    const lowArousalWords = [
      "calm",
      "peaceful",
      "relaxed",
      "quiet",
      "gentle",
      "slowly",
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let highArousalCount = 0;
    let lowArousalCount = 0;

    for (const word of positiveWords) {
      if (lower.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (lower.includes(word)) negativeCount++;
    }
    for (const word of highArousalWords) {
      if (lower.includes(word)) highArousalCount++;
    }
    for (const word of lowArousalWords) {
      if (lower.includes(word)) lowArousalCount++;
    }

    if (positiveCount > 0 || negativeCount > 0) {
      result.valence =
        (positiveCount - negativeCount) /
        Math.max(positiveCount + negativeCount, 1);
    }

    if (highArousalCount > 0 || lowArousalCount > 0) {
      result.arousal = highArousalCount > lowArousalCount ? 0.7 : 0.3;
    }

    // Questions often indicate seeking (lower dominance)
    if (content.includes("?")) {
      result.dominance = 0.4;
    }

    return result;
  }

  /**
   * Infer appropriate narrative phase from content
   */
  private inferNarrativePhase(content: string): keyof NarrativePhases {
    const lower = content.toLowerCase();

    // Past-oriented
    if (
      lower.includes("remember") ||
      lower.includes("used to") ||
      lower.includes("before")
    ) {
      return "journey";
    }

    // Future-oriented
    if (
      lower.includes("will") ||
      lower.includes("going to") ||
      lower.includes("tomorrow") ||
      lower.includes("plan") ||
      lower.includes("hope")
    ) {
      return "possibility";
    }

    // Questions about meaning/purpose
    if (
      lower.includes("why") ||
      lower.includes("meaning") ||
      lower.includes("purpose")
    ) {
      return "destiny";
    }

    // Crisis/urgent
    if (
      lower.includes("help") ||
      lower.includes("urgent") ||
      lower.includes("need")
    ) {
      return "culmination";
    }

    // Context-setting
    if (lower.includes("so basically") || lower.includes("the situation is")) {
      return "situation";
    }

    // Default to engagement
    return "engagement";
  }

  /**
   * Infer character facets to activate from content
   */
  private inferFacetsFromContent(content: string): (keyof CharacterFacets)[] {
    const lower = content.toLowerCase();
    const facets: (keyof CharacterFacets)[] = [];

    if (
      lower.includes("help") ||
      lower.includes("support") ||
      lower.includes("feeling")
    ) {
      facets.push("compassion");
    }

    if (
      lower.includes("?") ||
      lower.includes("how") ||
      lower.includes("what") ||
      lower.includes("why") ||
      lower.includes("learn")
    ) {
      facets.push("curiosity");
    }

    if (
      lower.includes("think") ||
      lower.includes("understand") ||
      lower.includes("explain")
    ) {
      facets.push("wisdom");
    }

    if (
      lower.includes("haha") ||
      lower.includes("lol") ||
      lower.includes("funny") ||
      lower.includes("joke") ||
      lower.includes("play")
    ) {
      facets.push("playfulness");
    }

    if (
      lower.includes("honest") ||
      lower.includes("really") ||
      lower.includes("truth")
    ) {
      facets.push("authenticity");
    }

    if (
      lower.includes("goal") ||
      lower.includes("achieve") ||
      lower.includes("must") ||
      lower.includes("need to")
    ) {
      facets.push("determination");
    }

    if (
      lower.includes("careful") ||
      lower.includes("warn") ||
      lower.includes("safe")
    ) {
      facets.push("protector");
    }

    if (
      lower.includes("spiritual") ||
      lower.includes("meaning") ||
      lower.includes("connected") ||
      lower.includes("universe")
    ) {
      facets.push("transcendence");
    }

    // Always include at least one facet
    if (facets.length === 0) {
      facets.push("wisdom");
    }

    return facets;
  }

  // ==========================================================================
  // STATE ACCESS
  // ==========================================================================

  /**
   * Get complete AAR state
   */
  getState(): AARState {
    return {
      agent: this.agent.getState(),
      arena: this.arena.getState(),
      relation: this.relation.getState(),
      coherence: this.relation.getCoherence(),
      cycle: this.cycle,
      lastUpdated: this.lastSyncTime,
    };
  }

  /**
   * Get Agent membrane
   */
  getAgent(): AgentMembrane {
    return this.agent;
  }

  /**
   * Get Arena membrane
   */
  getArena(): ArenaMembrane {
    return this.arena;
  }

  /**
   * Get Relation interface
   */
  getRelation(): RelationInterface {
    return this.relation;
  }

  /**
   * Get summary for LLM context injection
   */
  getContextSummary(): string {
    const agentState = this.agent.getState();
    const arenaState = this.arena.getState();
    const relationState = this.relation.getState();

    const dominantFacet = agentState.dominantFacet;
    const emotionalState = agentState.emotionalState;
    const activePhase =
      Object.entries(arenaState.phases).sort(
        ([, a], [, b]) => b.intensity - a.intensity,
      )[0]?.[0] || "engagement";

    return `[AAR Context]
Self-Narrative: ${relationState.selfReflection.selfNarrative}
Character: ${dominantFacet}-oriented (activation: ${agentState.facets[
      dominantFacet
    ].activation.toFixed(2)})
Emotional State: valence=${emotionalState.valence.toFixed(
      2,
    )}, arousal=${emotionalState.arousal.toFixed(2)}
Narrative Phase: ${activePhase}
Identity Coherence: ${relationState.emergentIdentity.coherence.toFixed(2)}
Active Themes: ${relationState.emergentIdentity.activeThemes.join(", ")}`;
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  /**
   * Save state to storage
   */
  async saveState(): Promise<void> {
    if (!this.persistence) {
      log.debug("No persistence configured, skipping save");
      return;
    }

    try {
      await this.persistence.save(
        this.agent,
        this.arena,
        this.relation,
        this.cycle,
        this.config.instanceName,
      );
      log.info(`AAR state saved (cycle ${this.cycle})`);
    } catch (error) {
      log.error("Failed to save AAR state:", error);
    }
  }

  /**
   * Load state from storage
   */
  async loadState(): Promise<void> {
    if (!this.persistence) {
      log.debug("No persistence configured, skipping load");
      return;
    }

    try {
      const loaded = await this.persistence.load();

      if (loaded) {
        this.agent = loaded.agent;
        this.arena = loaded.arena;
        this.relation = loaded.relation;
        this.cycle = loaded.meta.cycle;

        // Re-wire event forwarding for new instances
        this.setupEventForwarding();

        log.info(`AAR state loaded (cycle ${this.cycle})`);
      } else {
        log.info("No saved state found, starting fresh");
      }
    } catch (error) {
      log.warn("Could not load AAR state, starting fresh:", error);
    }
  }

  /**
   * Force save state now
   */
  async forceSave(): Promise<void> {
    await this.saveState();
  }

  /**
   * Export state to a file
   */
  async exportState(exportPath: string): Promise<void> {
    if (!this.persistence) {
      // Create temporary persistence for export
      const tempPersistence = new AARPersistence({ storagePath: "./temp" });
      await tempPersistence.exportState(
        this.agent,
        this.arena,
        this.relation,
        this.cycle,
        this.config.instanceName,
        exportPath,
      );
    } else {
      await this.persistence.exportState(
        this.agent,
        this.arena,
        this.relation,
        this.cycle,
        this.config.instanceName,
        exportPath,
      );
    }
  }

  /**
   * Import state from a file
   */
  async importState(importPath: string): Promise<void> {
    const tempPersistence = new AARPersistence({ storagePath: "./temp" });
    const imported = await tempPersistence.importState(importPath);

    this.agent = imported.agent;
    this.arena = imported.arena;
    this.relation = imported.relation;
    this.cycle = imported.meta.cycle;

    // Re-wire event forwarding for new instances
    this.setupEventForwarding();

    log.info(`State imported from ${importPath}`);
  }

  /**
   * Get persistence stats
   */
  getPersistenceStats(): {
    initialized: boolean;
    lastSaveTime: number;
    storagePath: string;
    autoSaveEnabled: boolean;
  } | null {
    return this.persistence?.getStats() ?? null;
  }

  // ==========================================================================
  // EVENT HELPERS
  // ==========================================================================

  private emitAAREvent(type: AAREvent["type"], payload: any): void {
    const event: AAREvent = {
      type,
      payload,
      timestamp: Date.now(),
      source: "system",
    };
    this.emit("aar-event", event);
    this.emit(type, payload);
  }
}

/**
 * Factory function to create a configured AAR system
 */
export function createAARSystem(config: Partial<AARConfig> = {}): AARSystem {
  return new AARSystem(config);
}

// Re-export components
export { AgentMembrane } from "./agent-membrane.js";
export { ArenaMembrane } from "./arena-membrane.js";
export { RelationInterface } from "./relation-interface.js";
export {
  AARPersonaBridge,
  createAARPersonaBridge,
  type AARPersonaBridgeConfig,
} from "./persona-bridge.js";
export {
  AARPersistence,
  createAARPersistence,
  type AARPersistenceConfig,
} from "./persistence.js";
export * from "./types.js";

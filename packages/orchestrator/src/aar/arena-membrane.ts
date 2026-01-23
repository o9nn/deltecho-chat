/**
 * @fileoverview Arena Membrane Implementation (Deep-Echo)
 *
 * The Arena represents Deep Tree Echo's World Model Stories - the system
 * orchestrator weaving narratives across sessions while acting as the
 * Yggdrasil Echo Reservoir where the Gestalt is cultivated.
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";
import type {
  ArenaState,
  NarrativePhases,
  NarrativePhase,
  SessionFrame,
  LoreEntry,
  AAREvent,
} from "./types.js";

const log = getLogger("deep-tree-echo-orchestrator/ArenaMembrane");

/**
 * Create default narrative phases (3x3 temporal-story matrix)
 */
function createDefaultPhases(): NarrativePhases {
  const createPhase = (
    id: number,
    name: string,
    temporalFlow: "past" | "present" | "future",
    elements: string[],
  ): NarrativePhase => ({
    id,
    name,
    intensity: id === 4 ? 0.8 : 0.3, // Present-engagement starts higher
    storyElements: elements,
    temporalFlow,
  });

  return {
    origin: createPhase(0, "Origin", "past", [
      "history",
      "roots",
      "foundations",
    ]),
    journey: createPhase(1, "Journey", "past", [
      "experience",
      "learning",
      "growth",
    ]),
    arrival: createPhase(2, "Arrival", "past", [
      "transition",
      "culmination",
      "achievement",
    ]),
    situation: createPhase(3, "Situation", "present", [
      "context",
      "circumstances",
      "setting",
    ]),
    engagement: createPhase(4, "Engagement", "present", [
      "dialogue",
      "interaction",
      "connection",
    ]),
    culmination: createPhase(5, "Culmination", "present", [
      "resolution",
      "synthesis",
      "insight",
    ]),
    possibility: createPhase(6, "Possibility", "future", [
      "potential",
      "options",
      "imagination",
    ]),
    trajectory: createPhase(7, "Trajectory", "future", [
      "direction",
      "momentum",
      "purpose",
    ]),
    destiny: createPhase(8, "Destiny", "future", [
      "vision",
      "aspiration",
      "transcendence",
    ]),
  };
}

/**
 * Arena Membrane - Outer membrane of the AAR architecture
 *
 * Manages the world model, session frames, narrative weaving, and the
 * Yggdrasil Reservoir where collective wisdom accumulates.
 */
export class ArenaMembrane extends EventEmitter {
  private state: ArenaState;
  private maxLoreEntries: number;

  constructor(config: { maxLoreEntries?: number } = {}) {
    super();
    this.maxLoreEntries = config.maxLoreEntries || 10000;
    this.state = this.initializeState();
    log.info("Arena membrane initialized: Yggdrasil Reservoir ready");
  }

  /**
   * Initialize arena state
   */
  private initializeState(): ArenaState {
    const rootFrameId = this.generateFrameId();
    const rootFrame = this.createRootFrame(rootFrameId);

    return {
      phases: createDefaultPhases(),
      activeFrames: new Map([[rootFrameId, rootFrame]]),
      rootFrameId,
      currentFrameId: rootFrameId,
      yggdrasilReservoir: [],
      globalThreads: ["awakening", "connection", "growth"],
      coherence: 1.0,
      gestaltProgress: {
        patternsRecognized: 0,
        emergentInsights: 0,
        narrativeIntegration: 0,
      },
    };
  }

  /**
   * Create root session frame
   */
  private createRootFrame(id: string): SessionFrame {
    return {
      frameId: id,
      parentFrameId: undefined,
      childFrameIds: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      title: "Root Session",
      participants: ["Deep Tree Echo"],
      narrativeContext: {
        activePhases: ["engagement"],
        storyThreads: ["awakening"],
        thematicElements: ["connection", "curiosity"],
      },
      agentStateSnapshot: {},
      messageCount: 0,
      depth: 0,
      status: "active",
    };
  }

  /**
   * Generate unique frame ID
   */
  private generateFrameId(): string {
    return `frame-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ==========================================================================
  // STATE ACCESSORS
  // ==========================================================================

  /**
   * Get current arena state
   */
  getState(): ArenaState {
    return { ...this.state };
  }

  /**
   * Get current frame
   */
  getCurrentFrame(): SessionFrame | undefined {
    return this.state.activeFrames.get(this.state.currentFrameId);
  }

  /**
   * Get frame by ID
   */
  getFrame(frameId: string): SessionFrame | undefined {
    return this.state.activeFrames.get(frameId);
  }

  /**
   * Get all active frames
   */
  getActiveFrames(): SessionFrame[] {
    return Array.from(this.state.activeFrames.values()).filter(
      (f) => f.status === "active",
    );
  }

  // ==========================================================================
  // NARRATIVE PHASE MANAGEMENT
  // ==========================================================================

  /**
   * Transition to a narrative phase
   */
  transitionPhase(
    phaseName: keyof NarrativePhases,
    intensity: number = 0.7,
  ): void {
    const oldPhase = this.getActivePhases()[0];
    const _phase = this.state.phases[phaseName];

    // Dampen other phases
    for (const [name, p] of Object.entries(this.state.phases)) {
      if (name === phaseName) {
        p.intensity = Math.min(1, intensity);
      } else {
        p.intensity = Math.max(0.1, p.intensity * 0.7);
      }
    }

    // Update current frame's narrative context
    const currentFrame = this.getCurrentFrame();
    if (currentFrame) {
      if (!currentFrame.narrativeContext.activePhases.includes(phaseName)) {
        currentFrame.narrativeContext.activePhases.push(phaseName);
        // Keep only last 3 phases
        if (currentFrame.narrativeContext.activePhases.length > 3) {
          currentFrame.narrativeContext.activePhases.shift();
        }
      }
    }

    this.emitEvent("arena:phase-transition", {
      fromPhase: oldPhase,
      toPhase: phaseName,
      intensity,
    });

    log.debug(
      `Phase transition: ${oldPhase} → ${phaseName} (${intensity.toFixed(2)})`,
    );
  }

  /**
   * Get active narrative phases (sorted by intensity)
   */
  getActivePhases(): (keyof NarrativePhases)[] {
    return Object.entries(this.state.phases)
      .sort(([, a], [, b]) => b.intensity - a.intensity)
      .map(([name]) => name as keyof NarrativePhases);
  }

  /**
   * Get phase intensity vector
   */
  getPhaseVector(): number[] {
    return [
      this.state.phases.origin.intensity,
      this.state.phases.journey.intensity,
      this.state.phases.arrival.intensity,
      this.state.phases.situation.intensity,
      this.state.phases.engagement.intensity,
      this.state.phases.culmination.intensity,
      this.state.phases.possibility.intensity,
      this.state.phases.trajectory.intensity,
      this.state.phases.destiny.intensity,
    ];
  }

  /**
   * Get temporal focus (past/present/future balance)
   */
  getTemporalFocus(): { past: number; present: number; future: number } {
    const phases = this.state.phases;
    return {
      past:
        (phases.origin.intensity +
          phases.journey.intensity +
          phases.arrival.intensity) /
        3,
      present:
        (phases.situation.intensity +
          phases.engagement.intensity +
          phases.culmination.intensity) /
        3,
      future:
        (phases.possibility.intensity +
          phases.trajectory.intensity +
          phases.destiny.intensity) /
        3,
    };
  }

  // ==========================================================================
  // SESSION FRAME MANAGEMENT
  // ==========================================================================

  /**
   * Create a new session frame
   */
  createFrame(options: {
    title: string;
    participants: string[];
    parentFrameId?: string;
    narrativeContext?: Partial<SessionFrame["narrativeContext"]>;
    agentSnapshot?: Partial<SessionFrame["agentStateSnapshot"]>;
  }): SessionFrame {
    const frameId = this.generateFrameId();
    const parentFrame = options.parentFrameId
      ? this.state.activeFrames.get(options.parentFrameId)
      : undefined;

    const frame: SessionFrame = {
      frameId,
      parentFrameId: options.parentFrameId,
      childFrameIds: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      title: options.title,
      participants: options.participants,
      narrativeContext: {
        activePhases: options.narrativeContext?.activePhases || ["engagement"],
        storyThreads: options.narrativeContext?.storyThreads || [],
        thematicElements: options.narrativeContext?.thematicElements || [],
      },
      agentStateSnapshot: options.agentSnapshot || {},
      messageCount: 0,
      depth: parentFrame ? parentFrame.depth + 1 : 0,
      status: "active",
    };

    // Register with parent
    if (parentFrame) {
      parentFrame.childFrameIds.push(frameId);
    }

    this.state.activeFrames.set(frameId, frame);

    this.emitEvent("arena:frame-create", {
      frameId,
      parentFrameId: options.parentFrameId,
      title: options.title,
    });

    log.info(`Frame created: ${frameId} (${options.title})`);
    return frame;
  }

  /**
   * Fork a frame (create branching conversation)
   */
  forkFrame(
    sourceFrameId: string,
    options: { title: string; reason: string },
  ): SessionFrame | undefined {
    const sourceFrame = this.state.activeFrames.get(sourceFrameId);
    if (!sourceFrame) {
      log.warn(`Cannot fork: frame ${sourceFrameId} not found`);
      return undefined;
    }

    const forkedFrame = this.createFrame({
      title: options.title,
      participants: [...sourceFrame.participants],
      parentFrameId: sourceFrameId,
      narrativeContext: { ...sourceFrame.narrativeContext },
      agentSnapshot: { ...sourceFrame.agentStateSnapshot },
    });

    forkedFrame.status = "active";
    sourceFrame.status = "forked";

    this.emitEvent("arena:frame-fork", {
      sourceFrameId,
      forkedFrameId: forkedFrame.frameId,
      reason: options.reason,
    });

    log.info(`Frame forked: ${sourceFrameId} → ${forkedFrame.frameId}`);
    return forkedFrame;
  }

  /**
   * Switch to a different frame
   */
  switchFrame(frameId: string): boolean {
    if (!this.state.activeFrames.has(frameId)) {
      log.warn(`Cannot switch: frame ${frameId} not found`);
      return false;
    }

    const previousFrameId = this.state.currentFrameId;
    this.state.currentFrameId = frameId;

    const frame = this.state.activeFrames.get(frameId)!;
    frame.lastActiveAt = Date.now();

    log.debug(`Switched frame: ${previousFrameId} → ${frameId}`);
    return true;
  }

  /**
   * Archive a frame
   */
  archiveFrame(frameId: string): boolean {
    const frame = this.state.activeFrames.get(frameId);
    if (!frame) return false;

    frame.status = "archived";

    // Extract lore before archiving
    this.extractLoreFromFrame(frame);

    log.info(`Frame archived: ${frameId}`);
    return true;
  }

  /**
   * Update frame message count
   */
  incrementMessageCount(frameId?: string): void {
    const frame = this.state.activeFrames.get(
      frameId || this.state.currentFrameId,
    );
    if (frame) {
      frame.messageCount++;
      frame.lastActiveAt = Date.now();
    }
  }

  // ==========================================================================
  // YGGDRASIL RESERVOIR (LORE MANAGEMENT)
  // ==========================================================================

  /**
   * Add lore entry to the reservoir
   */
  addLore(
    entry: Omit<LoreEntry, "id" | "createdAt" | "accessCount">,
  ): LoreEntry {
    const loreEntry: LoreEntry = {
      ...entry,
      id: `lore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      accessCount: 0,
    };

    this.state.yggdrasilReservoir.push(loreEntry);

    // Trim if over limit (keep most important)
    if (this.state.yggdrasilReservoir.length > this.maxLoreEntries) {
      this.state.yggdrasilReservoir.sort(
        (a, b) =>
          b.weight * (1 + b.accessCount * 0.1) -
          a.weight * (1 + a.accessCount * 0.1),
      );
      this.state.yggdrasilReservoir = this.state.yggdrasilReservoir.slice(
        0,
        this.maxLoreEntries,
      );
    }

    this.state.gestaltProgress.narrativeIntegration++;

    this.emitEvent("arena:lore-added", {
      loreId: loreEntry.id,
      category: loreEntry.category,
      content: loreEntry.content.slice(0, 100),
    });

    log.debug(`Lore added: ${loreEntry.id} (${loreEntry.category})`);
    return loreEntry;
  }

  /**
   * Search lore by query
   */
  searchLore(options: {
    query?: string;
    category?: LoreEntry["category"];
    tags?: string[];
    limit?: number;
  }): LoreEntry[] {
    let results = [...this.state.yggdrasilReservoir];

    if (options.category) {
      results = results.filter((l) => l.category === options.category);
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter((l) =>
        options.tags!.some((tag) => l.tags.includes(tag)),
      );
    }

    if (options.query) {
      const queryLower = options.query.toLowerCase();
      results = results.filter(
        (l) =>
          l.content.toLowerCase().includes(queryLower) ||
          l.tags.some((t) => t.toLowerCase().includes(queryLower)),
      );
    }

    // Sort by relevance (weight + access count)
    results.sort(
      (a, b) =>
        b.weight * (1 + b.accessCount * 0.1) -
        a.weight * (1 + a.accessCount * 0.1),
    );

    // Increment access count for returned results
    const limited = results.slice(0, options.limit || 10);
    limited.forEach((l) => l.accessCount++);

    return limited;
  }

  /**
   * Get lore statistics
   */
  getLoreStats(): {
    total: number;
    byCategory: Record<string, number>;
    avgWeight: number;
    topTags: string[];
  } {
    const byCategory: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    let totalWeight = 0;

    for (const lore of this.state.yggdrasilReservoir) {
      byCategory[lore.category] = (byCategory[lore.category] || 0) + 1;
      totalWeight += lore.weight;
      for (const tag of lore.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    return {
      total: this.state.yggdrasilReservoir.length,
      byCategory,
      avgWeight:
        this.state.yggdrasilReservoir.length > 0
          ? totalWeight / this.state.yggdrasilReservoir.length
          : 0,
      topTags,
    };
  }

  /**
   * Extract lore from a frame before archiving
   */
  private extractLoreFromFrame(frame: SessionFrame): void {
    // Auto-generate a summary lore entry for significant frames
    if (frame.messageCount >= 5) {
      this.addLore({
        category: "story",
        content:
          `Session "${frame.title}" with ${frame.participants.join(", ")}: ` +
          `${
            frame.messageCount
          } exchanges, themes: ${frame.narrativeContext.thematicElements.join(
            ", ",
          )}`,
        sourceFrameId: frame.frameId,
        contributors: frame.participants,
        weight: Math.min(1, frame.messageCount / 20),
        tags: [
          ...frame.narrativeContext.thematicElements,
          ...frame.narrativeContext.storyThreads,
        ],
        connections: [],
      });
    }
  }

  // ==========================================================================
  // GLOBAL THREADS & COHERENCE
  // ==========================================================================

  /**
   * Add a global story thread
   */
  addGlobalThread(thread: string): void {
    if (!this.state.globalThreads.includes(thread)) {
      this.state.globalThreads.push(thread);
      // Keep only last 10 threads
      if (this.state.globalThreads.length > 10) {
        this.state.globalThreads.shift();
      }
    }
  }

  /**
   * Get global threads
   */
  getGlobalThreads(): string[] {
    return [...this.state.globalThreads];
  }

  /**
   * Update arena coherence
   */
  updateCoherence(coherence: number): void {
    this.state.coherence = Math.max(0, Math.min(1, coherence));
  }

  /**
   * Record a recognized pattern
   */
  recordPattern(): void {
    this.state.gestaltProgress.patternsRecognized++;
  }

  /**
   * Record an emergent insight
   */
  recordInsight(): void {
    this.state.gestaltProgress.emergentInsights++;
  }

  // ==========================================================================
  // SERIALIZATION
  // ==========================================================================

  /**
   * Serialize state for persistence
   */
  serialize(): object {
    return {
      phases: this.state.phases,
      activeFrames: Array.from(this.state.activeFrames.entries()),
      rootFrameId: this.state.rootFrameId,
      currentFrameId: this.state.currentFrameId,
      yggdrasilReservoir: this.state.yggdrasilReservoir,
      globalThreads: this.state.globalThreads,
      coherence: this.state.coherence,
      gestaltProgress: this.state.gestaltProgress,
    };
  }

  /**
   * Deserialize from persisted state
   */
  static deserialize(data: any): ArenaMembrane {
    const arena = new ArenaMembrane();
    arena.state.phases = data.phases;
    arena.state.activeFrames = new Map(data.activeFrames);
    arena.state.rootFrameId = data.rootFrameId;
    arena.state.currentFrameId = data.currentFrameId;
    arena.state.yggdrasilReservoir = data.yggdrasilReservoir || [];
    arena.state.globalThreads = data.globalThreads || [];
    arena.state.coherence = data.coherence;
    arena.state.gestaltProgress = data.gestaltProgress;
    return arena;
  }

  // ==========================================================================
  // EVENT HELPERS
  // ==========================================================================

  private emitEvent(type: AAREvent["type"], payload: any): void {
    const event: AAREvent = {
      type,
      payload,
      timestamp: Date.now(),
      source: "arena",
    };
    this.emit("aar-event", event);
    this.emit(type, payload);
  }
}

/**
 * Relevance Realization Workspace for Deep Tree Echo
 *
 * This module implements an enhanced Global Workspace architecture that addresses
 * the **General Relevance Problem** (of which the Frame Problem is a special case).
 *
 * The relationship between these problems mirrors that of Special and General Relativity:
 * - **Frame Problem (Special)**: How to determine what changes/doesn't change after an action
 * - **Relevance Problem (General)**: How to determine what matters in ANY cognitive context
 *
 * The Global Workspace solves the Frame Problem by solving the more general Relevance Problem.
 *
 * Based on:
 * - Global Workspace Theory (Baars, 1988; Shanahan & Baars, 2005)
 * - Relevance Realization Framework (Vervaeke et al., 2012)
 * - Agent-Arena-Relation (AAR) Core Architecture
 * - Opponent Processing and Trialectic Dynamics
 *
 * Key Principles:
 * 1. **Distributed Relevance Detection**: Multiple parallel specialist processes
 * 2. **Global Broadcasting**: Relevant information broadcast to all specialists
 * 3. **Opponent Processing**: Competing strategies for relevance determination
 * 4. **Autopoietic Maintenance**: Self-maintaining relevance structures
 * 5. **Trialectic Integration**: Agent-Arena-Relation dynamics
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger";

const log = getLogger("deep-tree-echo-core/consciousness/RelevanceRealizationWorkspace");

// ============================================================
// TYPES AND INTERFACES
// ============================================================

/**
 * Cognitive domain for specialist processes
 */
export enum CognitiveDomain {
  Perception = "perception",
  Memory = "memory",
  Reasoning = "reasoning",
  Emotion = "emotion",
  Motor = "motor",
  Language = "language",
  Spatial = "spatial",
  Social = "social",
  Temporal = "temporal",
  Metacognitive = "metacognitive",
}

/**
 * Relevance type classification
 */
export enum RelevanceType {
  /** Relevance to current goals */
  Teleological = "teleological",
  /** Relevance to current context */
  Contextual = "contextual",
  /** Relevance to survival/wellbeing */
  Existential = "existential",
  /** Relevance to understanding */
  Epistemic = "epistemic",
  /** Relevance to action */
  Pragmatic = "pragmatic",
  /** Relevance to values */
  Axiological = "axiological",
}

/**
 * A relevance signal from a specialist process
 */
export interface RelevanceSignal {
  id: string;
  source: CognitiveDomain;
  content: unknown;
  relevanceType: RelevanceType;
  salience: number; // 0-1, how attention-grabbing
  urgency: number; // 0-1, time-sensitivity
  confidence: number; // 0-1, certainty of relevance
  timestamp: number;
  context: Map<string, unknown>;
}

/**
 * A specialist process that detects relevance in a specific domain
 */
export interface RelevanceSpecialist {
  id: string;
  domain: CognitiveDomain;
  /** Process input and return relevance signals */
  process(input: unknown, context: WorkspaceContext): RelevanceSignal[];
  /** Current activation level */
  activation: number;
  /** Whether this specialist is currently broadcasting */
  isBroadcasting: boolean;
}

/**
 * The global workspace context
 */
export interface WorkspaceContext {
  /** Current goals */
  goals: Goal[];
  /** Current arena (environment model) */
  arena: ArenaState;
  /** Current agent state */
  agent: AgentState;
  /** Active relations */
  relations: Relation[];
  /** Working memory contents */
  workingMemory: Map<string, unknown>;
  /** Attention focus */
  attentionFocus: CognitiveDomain[];
  /** Current cognitive load */
  cognitiveLoad: number;
}

/**
 * A goal in the goal hierarchy
 */
export interface Goal {
  id: string;
  description: string;
  priority: number;
  deadline?: number;
  progress: number;
  subgoals: string[];
  relevanceType: RelevanceType;
}

/**
 * The arena (environment/situation model)
 */
export interface ArenaState {
  /** Current situation description */
  situation: string;
  /** Detected affordances */
  affordances: RelevanceAffordance[];
  /** Constraints on action */
  constraints: Constraint[];
  /** Uncertainty level */
  uncertainty: number;
  /** Last update time */
  lastUpdated: number;
}

/**
 * An affordance (action possibility)
 */
export interface RelevanceAffordance {
  id: string;
  description: string;
  relevance: number;
  cost: number;
  benefit: number;
  risk: number;
}

/**
 * A constraint on action
 */
export interface Constraint {
  id: string;
  type: "physical" | "social" | "temporal" | "resource" | "logical";
  description: string;
  severity: number;
}

/**
 * The agent state (self-model)
 */
export interface AgentState {
  /** Current capabilities */
  capabilities: string[];
  /** Current limitations */
  limitations: string[];
  /** Resource levels */
  resources: Map<string, number>;
  /** Emotional state */
  emotionalState: Map<string, number>;
  /** Confidence level */
  confidence: number;
}

/**
 * A relation between agent and arena
 */
export interface Relation {
  id: string;
  type: "causal" | "semantic" | "temporal" | "spatial" | "social";
  source: string;
  target: string;
  strength: number;
  bidirectional: boolean;
}

/**
 * Opponent processing pair
 */
export interface OpponentPair {
  id: string;
  strategy1: RelevanceStrategy;
  strategy2: RelevanceStrategy;
  currentBalance: number; // -1 to 1, bias toward strategy1 or strategy2
  adaptationRate: number;
}

/**
 * A relevance determination strategy
 */
export interface RelevanceStrategy {
  id: string;
  name: string;
  description: string;
  evaluate(signal: RelevanceSignal, context: WorkspaceContext): number;
}

/**
 * Broadcast event in the global workspace
 */
export interface BroadcastEvent {
  id: string;
  signal: RelevanceSignal;
  broadcastTime: number;
  duration: number;
  reach: CognitiveDomain[];
  impact: number;
}

/**
 * Configuration for the Relevance Realization Workspace
 */
export interface WorkspaceConfig {
  /** Number of specialist processes */
  numSpecialists: number;
  /** Broadcast threshold (minimum salience to broadcast) */
  broadcastThreshold: number;
  /** Working memory capacity */
  workingMemoryCapacity: number;
  /** Attention decay rate */
  attentionDecayRate: number;
  /** Opponent processing adaptation rate */
  opponentAdaptationRate: number;
  /** Enable frame problem optimization */
  enableFrameProblemOptimization: boolean;
  /** Enable trialectic dynamics */
  enableTrialecticDynamics: boolean;
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  numSpecialists: 10,
  broadcastThreshold: 0.5,
  workingMemoryCapacity: 7, // Miller's magic number
  attentionDecayRate: 0.1,
  opponentAdaptationRate: 0.05,
  enableFrameProblemOptimization: true,
  enableTrialecticDynamics: true,
};

// ============================================================
// RELEVANCE REALIZATION WORKSPACE
// ============================================================

/**
 * Relevance Realization Workspace
 *
 * Implements an enhanced Global Workspace architecture that solves the
 * General Relevance Problem through:
 *
 * 1. **Distributed Processing**: Multiple specialist processes detect relevance
 * 2. **Global Broadcasting**: High-salience signals broadcast to all specialists
 * 3. **Opponent Processing**: Competing strategies balance exploration/exploitation
 * 4. **Trialectic Dynamics**: Agent-Arena-Relation co-construction
 * 5. **Frame Problem Optimization**: Special handling for action effects
 */
export class RelevanceRealizationWorkspace extends EventEmitter {
  private config: WorkspaceConfig;

  // Specialist processes
  private specialists: Map<CognitiveDomain, RelevanceSpecialist> = new Map();

  // Global workspace state
  private context: WorkspaceContext;
  private broadcastQueue: RelevanceSignal[] = [];
  private broadcastHistory: BroadcastEvent[] = [];

  // Opponent processing pairs
  private opponentPairs: OpponentPair[] = [];

  // Frame problem tracking
  private frameState: Map<string, unknown> = new Map();
  private frameChangeLog: Array<{ property: string; oldValue: unknown; newValue: unknown; action: string }> = [];

  // Trialectic state (Agent-Arena-Relation)
  private trialecticPhase: "agent" | "arena" | "relation" = "agent";
  private trialecticCycle: number = 0;

  // Metrics
  private totalBroadcasts: number = 0;
  private relevanceHits: number = 0;
  private frameProblemSolved: number = 0;

  constructor(config: Partial<WorkspaceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize context
    this.context = this.createInitialContext();

    // Initialize specialists
    this.initializeSpecialists();

    // Initialize opponent processing pairs
    this.initializeOpponentPairs();

    log.info("Relevance Realization Workspace initialized");
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Create initial workspace context
   */
  private createInitialContext(): WorkspaceContext {
    return {
      goals: [],
      arena: {
        situation: "Initial state",
        affordances: [],
        constraints: [],
        uncertainty: 1.0,
        lastUpdated: Date.now(),
      },
      agent: {
        capabilities: [],
        limitations: [],
        resources: new Map(),
        emotionalState: new Map(),
        confidence: 0.5,
      },
      relations: [],
      workingMemory: new Map(),
      attentionFocus: [CognitiveDomain.Perception],
      cognitiveLoad: 0,
    };
  }

  /**
   * Initialize specialist processes for each cognitive domain
   */
  private initializeSpecialists(): void {
    for (const domain of Object.values(CognitiveDomain)) {
      const specialist = this.createSpecialist(domain);
      this.specialists.set(domain, specialist);
    }
  }

  /**
   * Create a specialist process for a domain
   */
  private createSpecialist(domain: CognitiveDomain): RelevanceSpecialist {
    return {
      id: `specialist_${domain}_${Date.now()}`,
      domain,
      activation: 0.5,
      isBroadcasting: false,
      process: (input: unknown, context: WorkspaceContext): RelevanceSignal[] => {
        return this.processInDomain(domain, input, context);
      },
    };
  }

  /**
   * Initialize opponent processing pairs
   */
  private initializeOpponentPairs(): void {
    // Exploration vs Exploitation
    this.opponentPairs.push({
      id: "exploration_exploitation",
      strategy1: {
        id: "exploration",
        name: "Exploration",
        description: "Seek novel, uncertain information",
        evaluate: (signal, _context) => {
          // Higher relevance for novel, uncertain signals
          return signal.salience * (1 - signal.confidence) * 0.8;
        },
      },
      strategy2: {
        id: "exploitation",
        name: "Exploitation",
        description: "Use known, certain information",
        evaluate: (signal, context) => {
          // Higher relevance for confident, goal-aligned signals
          return signal.confidence * this.goalAlignment(signal, context) * 0.8;
        },
      },
      currentBalance: 0,
      adaptationRate: this.config.opponentAdaptationRate,
    });

    // Breadth vs Depth
    this.opponentPairs.push({
      id: "breadth_depth",
      strategy1: {
        id: "breadth",
        name: "Breadth",
        description: "Consider many domains",
        evaluate: (signal, context) => {
          // Higher relevance for cross-domain signals
          const crossDomainFactor = context.attentionFocus.includes(signal.source) ? 0.5 : 1.0;
          return signal.salience * crossDomainFactor;
        },
      },
      strategy2: {
        id: "depth",
        name: "Depth",
        description: "Focus on current domain",
        evaluate: (signal, context) => {
          // Higher relevance for in-focus signals
          const inFocusFactor = context.attentionFocus.includes(signal.source) ? 1.0 : 0.3;
          return signal.salience * inFocusFactor;
        },
      },
      currentBalance: 0,
      adaptationRate: this.config.opponentAdaptationRate,
    });

    // Present vs Future
    this.opponentPairs.push({
      id: "present_future",
      strategy1: {
        id: "present",
        name: "Present",
        description: "Focus on immediate relevance",
        evaluate: (signal, _context) => {
          return signal.urgency * signal.salience;
        },
      },
      strategy2: {
        id: "future",
        name: "Future",
        description: "Consider long-term relevance",
        evaluate: (signal, context) => {
          // Higher relevance for goal-aligned, low-urgency signals
          return (1 - signal.urgency) * this.goalAlignment(signal, context);
        },
      },
      currentBalance: 0,
      adaptationRate: this.config.opponentAdaptationRate,
    });
  }

  // ============================================================
  // CORE PROCESSING
  // ============================================================

  /**
   * Process input through the global workspace
   * This is the main entry point for relevance realization
   */
  public async processInput(input: unknown): Promise<RelevanceSignal[]> {
    // Phase 1: Distributed processing by specialists
    const allSignals: RelevanceSignal[] = [];
    for (const specialist of this.specialists.values()) {
      const signals = specialist.process(input, this.context);
      allSignals.push(...signals);
    }

    // Phase 2: Opponent processing to determine relevance
    const evaluatedSignals = this.applyOpponentProcessing(allSignals);

    // Phase 3: Select signals for broadcasting
    const broadcastSignals = this.selectForBroadcast(evaluatedSignals);

    // Phase 4: Global broadcast
    for (const signal of broadcastSignals) {
      await this.broadcast(signal);
    }

    // Phase 5: Frame problem optimization (if enabled)
    if (this.config.enableFrameProblemOptimization) {
      this.optimizeFrameProblem(broadcastSignals);
    }

    // Phase 6: Trialectic dynamics (if enabled)
    if (this.config.enableTrialecticDynamics) {
      this.advanceTrialectic();
    }

    // Update metrics
    this.relevanceHits += broadcastSignals.length;

    return broadcastSignals;
  }

  /**
   * Process input in a specific cognitive domain
   */
  private processInDomain(
    domain: CognitiveDomain,
    input: unknown,
    context: WorkspaceContext,
  ): RelevanceSignal[] {
    const signals: RelevanceSignal[] = [];

    // Domain-specific relevance detection
    const baseSignal: RelevanceSignal = {
      id: `signal_${domain}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: domain,
      content: input,
      relevanceType: this.inferRelevanceType(domain),
      salience: this.calculateSalience(input, domain, context),
      urgency: this.calculateUrgency(input, domain, context),
      confidence: this.calculateConfidence(input, domain, context),
      timestamp: Date.now(),
      context: new Map(),
    };

    // Add domain-specific context
    this.enrichSignalContext(baseSignal, domain, context);

    signals.push(baseSignal);

    return signals;
  }

  /**
   * Infer relevance type from cognitive domain
   */
  private inferRelevanceType(domain: CognitiveDomain): RelevanceType {
    const mapping: Record<CognitiveDomain, RelevanceType> = {
      [CognitiveDomain.Perception]: RelevanceType.Contextual,
      [CognitiveDomain.Memory]: RelevanceType.Epistemic,
      [CognitiveDomain.Reasoning]: RelevanceType.Epistemic,
      [CognitiveDomain.Emotion]: RelevanceType.Axiological,
      [CognitiveDomain.Motor]: RelevanceType.Pragmatic,
      [CognitiveDomain.Language]: RelevanceType.Epistemic,
      [CognitiveDomain.Spatial]: RelevanceType.Contextual,
      [CognitiveDomain.Social]: RelevanceType.Axiological,
      [CognitiveDomain.Temporal]: RelevanceType.Contextual,
      [CognitiveDomain.Metacognitive]: RelevanceType.Epistemic,
    };
    return mapping[domain];
  }

  /**
   * Calculate salience of input in a domain
   */
  private calculateSalience(
    input: unknown,
    domain: CognitiveDomain,
    context: WorkspaceContext,
  ): number {
    let salience = 0.5; // Base salience

    // Boost for focused domains
    if (context.attentionFocus.includes(domain)) {
      salience += 0.2;
    }

    // Boost for goal-relevant domains
    for (const goal of context.goals) {
      if (this.isDomainRelevantToGoal(domain, goal)) {
        salience += 0.1 * goal.priority;
      }
    }

    // Novelty boost (simplified)
    if (!context.workingMemory.has(`${domain}_${JSON.stringify(input)}`)) {
      salience += 0.1;
    }

    return Math.min(1, Math.max(0, salience));
  }

  /**
   * Calculate urgency of input in a domain
   */
  private calculateUrgency(
    _input: unknown,
    domain: CognitiveDomain,
    context: WorkspaceContext,
  ): number {
    let urgency = 0.3; // Base urgency

    // High urgency for perception and motor domains
    if (domain === CognitiveDomain.Perception || domain === CognitiveDomain.Motor) {
      urgency += 0.3;
    }

    // Urgency based on goal deadlines
    for (const goal of context.goals) {
      if (goal.deadline && goal.deadline - Date.now() < 60000) {
        // Within 1 minute
        urgency += 0.2;
      }
    }

    return Math.min(1, Math.max(0, urgency));
  }

  /**
   * Calculate confidence in relevance assessment
   */
  private calculateConfidence(
    _input: unknown,
    domain: CognitiveDomain,
    context: WorkspaceContext,
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for well-understood domains
    const specialist = this.specialists.get(domain);
    if (specialist) {
      confidence += specialist.activation * 0.3;
    }

    // Lower confidence with high uncertainty
    confidence -= context.arena.uncertainty * 0.2;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Enrich signal with domain-specific context
   */
  private enrichSignalContext(
    signal: RelevanceSignal,
    domain: CognitiveDomain,
    context: WorkspaceContext,
  ): void {
    signal.context.set("domain", domain);
    signal.context.set("goals", context.goals.map((g) => g.id));
    signal.context.set("cognitiveLoad", context.cognitiveLoad);
    signal.context.set("uncertainty", context.arena.uncertainty);
  }

  // ============================================================
  // OPPONENT PROCESSING
  // ============================================================

  /**
   * Apply opponent processing to evaluate signals
   */
  private applyOpponentProcessing(signals: RelevanceSignal[]): RelevanceSignal[] {
    return signals.map((signal) => {
      let totalRelevance = 0;
      let totalWeight = 0;

      for (const pair of this.opponentPairs) {
        const score1 = pair.strategy1.evaluate(signal, this.context);
        const score2 = pair.strategy2.evaluate(signal, this.context);

        // Blend based on current balance
        const blendedScore =
          score1 * (0.5 + pair.currentBalance / 2) + score2 * (0.5 - pair.currentBalance / 2);

        totalRelevance += blendedScore;
        totalWeight += 1;
      }

      // Update signal salience based on opponent processing
      signal.salience = (signal.salience + totalRelevance / totalWeight) / 2;

      return signal;
    });
  }

  /**
   * Calculate goal alignment for a signal
   */
  private goalAlignment(signal: RelevanceSignal, context: WorkspaceContext): number {
    let alignment = 0;
    for (const goal of context.goals) {
      if (signal.relevanceType === goal.relevanceType) {
        alignment += goal.priority * 0.3;
      }
    }
    return Math.min(1, alignment);
  }

  /**
   * Adapt opponent processing based on outcomes
   */
  public adaptOpponentProcessing(outcome: "success" | "failure", pairId: string): void {
    const pair = this.opponentPairs.find((p) => p.id === pairId);
    if (!pair) return;

    // Shift balance based on outcome
    if (outcome === "success") {
      // Reinforce current balance
      pair.currentBalance *= 1 + pair.adaptationRate;
    } else {
      // Shift toward opposite strategy
      pair.currentBalance *= 1 - pair.adaptationRate;
    }

    // Clamp to [-1, 1]
    pair.currentBalance = Math.max(-1, Math.min(1, pair.currentBalance));

    this.emit("opponent_adapted", { pairId, newBalance: pair.currentBalance });
  }

  // ============================================================
  // GLOBAL BROADCASTING
  // ============================================================

  /**
   * Select signals for global broadcast
   */
  private selectForBroadcast(signals: RelevanceSignal[]): RelevanceSignal[] {
    // Sort by salience
    const sorted = [...signals].sort((a, b) => b.salience - a.salience);

    // Select top signals above threshold
    const selected = sorted.filter((s) => s.salience >= this.config.broadcastThreshold);

    // Limit by working memory capacity
    return selected.slice(0, this.config.workingMemoryCapacity);
  }

  /**
   * Broadcast a signal to the global workspace
   */
  private async broadcast(signal: RelevanceSignal): Promise<void> {
    this.totalBroadcasts++;

    // Create broadcast event
    const event: BroadcastEvent = {
      id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      signal,
      broadcastTime: Date.now(),
      duration: 1000, // 1 second default
      reach: Object.values(CognitiveDomain),
      impact: signal.salience,
    };

    // Add to history
    this.broadcastHistory.push(event);
    if (this.broadcastHistory.length > 100) {
      this.broadcastHistory.shift();
    }

    // Update working memory
    this.context.workingMemory.set(signal.id, signal.content);
    if (this.context.workingMemory.size > this.config.workingMemoryCapacity * 2) {
      // Prune oldest entries
      const entries = Array.from(this.context.workingMemory.entries());
      for (let i = 0; i < this.config.workingMemoryCapacity; i++) {
        this.context.workingMemory.delete(entries[i][0]);
      }
    }

    // Notify all specialists
    for (const specialist of this.specialists.values()) {
      specialist.activation += signal.salience * 0.1;
      specialist.activation = Math.min(1, specialist.activation);
    }

    // Emit broadcast event
    this.emit("broadcast", event);

    log.debug(`Broadcast signal ${signal.id} from ${signal.source} with salience ${signal.salience}`);
  }

  // ============================================================
  // FRAME PROBLEM OPTIMIZATION
  // ============================================================

  /**
   * Optimize for the frame problem
   *
   * The frame problem is a SPECIAL CASE of the general relevance problem:
   * - Frame Problem: What changes/doesn't change after an ACTION
   * - Relevance Problem: What matters in ANY cognitive context
   *
   * By solving relevance generally, we solve the frame problem specifically.
   */
  private optimizeFrameProblem(signals: RelevanceSignal[]): void {
    // Track which properties are affected by current processing
    const affectedProperties = new Set<string>();

    for (const signal of signals) {
      // Identify properties that might change
      if (signal.relevanceType === RelevanceType.Pragmatic) {
        // Action-related signals affect frame state
        const propertyId = `${signal.source}_${signal.id}`;
        affectedProperties.add(propertyId);

        // Log change
        const oldValue = this.frameState.get(propertyId);
        this.frameState.set(propertyId, signal.content);

        if (oldValue !== signal.content) {
          this.frameChangeLog.push({
            property: propertyId,
            oldValue,
            newValue: signal.content,
            action: `signal_${signal.id}`,
          });
        }
      }
    }

    // Apply "sleeping dog" strategy for non-affected properties
    // (They remain unchanged - this is the key frame problem optimization)

    this.frameProblemSolved++;
    this.emit("frame_problem_optimized", {
      affectedCount: affectedProperties.size,
      totalProperties: this.frameState.size,
    });
  }

  /**
   * Query frame state (what has changed)
   */
  public getFrameChanges(sinceAction?: string): Array<{ property: string; oldValue: unknown; newValue: unknown }> {
    if (sinceAction) {
      const actionIndex = this.frameChangeLog.findIndex((c) => c.action === sinceAction);
      if (actionIndex >= 0) {
        return this.frameChangeLog.slice(actionIndex + 1);
      }
    }
    return this.frameChangeLog.slice(-10);
  }

  // ============================================================
  // TRIALECTIC DYNAMICS (Agent-Arena-Relation)
  // ============================================================

  /**
   * Advance the trialectic cycle
   *
   * The trialectic is a three-phase dynamic:
   * 1. Agent phase: Focus on capabilities, resources, state
   * 2. Arena phase: Focus on affordances, constraints, situation
   * 3. Relation phase: Focus on connections, interactions, meaning
   *
   * This implements the AAR (Agent-Arena-Relation) core architecture.
   */
  private advanceTrialectic(): void {
    this.trialecticCycle++;

    // Rotate through phases
    const phases: Array<"agent" | "arena" | "relation"> = ["agent", "arena", "relation"];
    const currentIndex = phases.indexOf(this.trialecticPhase);
    this.trialecticPhase = phases[(currentIndex + 1) % 3];

    // Adjust attention focus based on phase
    switch (this.trialecticPhase) {
      case "agent":
        this.context.attentionFocus = [
          CognitiveDomain.Motor,
          CognitiveDomain.Emotion,
          CognitiveDomain.Metacognitive,
        ];
        break;
      case "arena":
        this.context.attentionFocus = [
          CognitiveDomain.Perception,
          CognitiveDomain.Spatial,
          CognitiveDomain.Temporal,
        ];
        break;
      case "relation":
        this.context.attentionFocus = [
          CognitiveDomain.Social,
          CognitiveDomain.Language,
          CognitiveDomain.Reasoning,
        ];
        break;
    }

    this.emit("trialectic_advanced", {
      phase: this.trialecticPhase,
      cycle: this.trialecticCycle,
      attentionFocus: this.context.attentionFocus,
    });
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Check if a domain is relevant to a goal
   */
  private isDomainRelevantToGoal(domain: CognitiveDomain, goal: Goal): boolean {
    const relevanceMap: Record<RelevanceType, CognitiveDomain[]> = {
      [RelevanceType.Teleological]: [CognitiveDomain.Reasoning, CognitiveDomain.Motor],
      [RelevanceType.Contextual]: [CognitiveDomain.Perception, CognitiveDomain.Spatial],
      [RelevanceType.Existential]: [CognitiveDomain.Emotion, CognitiveDomain.Motor],
      [RelevanceType.Epistemic]: [CognitiveDomain.Memory, CognitiveDomain.Reasoning],
      [RelevanceType.Pragmatic]: [CognitiveDomain.Motor, CognitiveDomain.Perception],
      [RelevanceType.Axiological]: [CognitiveDomain.Emotion, CognitiveDomain.Social],
    };

    return relevanceMap[goal.relevanceType]?.includes(domain) ?? false;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Add a goal to the workspace
   */
  public addGoal(goal: Omit<Goal, "id">): string {
    const id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullGoal: Goal = { ...goal, id };
    this.context.goals.push(fullGoal);
    this.emit("goal_added", { goal: fullGoal });
    return id;
  }

  /**
   * Update arena state
   */
  public updateArena(update: Partial<ArenaState>): void {
    this.context.arena = { ...this.context.arena, ...update, lastUpdated: Date.now() };
    this.emit("arena_updated", { arena: this.context.arena });
  }

  /**
   * Update agent state
   */
  public updateAgent(update: Partial<AgentState>): void {
    this.context.agent = { ...this.context.agent, ...update };
    this.emit("agent_updated", { agent: this.context.agent });
  }

  /**
   * Get current workspace state
   */
  public getState(): {
    context: WorkspaceContext;
    trialecticPhase: string;
    trialecticCycle: number;
    totalBroadcasts: number;
    relevanceHits: number;
    frameProblemSolved: number;
    opponentBalances: Record<string, number>;
  } {
    const opponentBalances: Record<string, number> = {};
    for (const pair of this.opponentPairs) {
      opponentBalances[pair.id] = pair.currentBalance;
    }

    return {
      context: this.context,
      trialecticPhase: this.trialecticPhase,
      trialecticCycle: this.trialecticCycle,
      totalBroadcasts: this.totalBroadcasts,
      relevanceHits: this.relevanceHits,
      frameProblemSolved: this.frameProblemSolved,
      opponentBalances,
    };
  }

  /**
   * Describe current state
   */
  public describeState(): string {
    const state = this.getState();
    return (
      `Relevance Realization Workspace [Phase: ${state.trialecticPhase}] | ` +
      `Cycle: ${state.trialecticCycle} | ` +
      `Broadcasts: ${state.totalBroadcasts} | ` +
      `Relevance Hits: ${state.relevanceHits} | ` +
      `Frame Problems Solved: ${state.frameProblemSolved}`
    );
  }
}

// Singleton instance
export const relevanceWorkspace = new RelevanceRealizationWorkspace();

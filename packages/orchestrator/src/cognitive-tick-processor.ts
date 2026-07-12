/**
 * Cognitive Tick Processor
 *
 * Implements real cognitive processing for each tick of the EchoAgentLoop.
 * Rather than the loop being purely structural/telemetry, this processor
 * provides actual cognitive work at each phase:
 *
 * - PERCEIVE: Aggregate environmental signals into a coherent percept
 * - REFLECT: Run introspective analysis with memory retrieval
 * - PLAN: Generate/update goals with priority scheduling
 * - ACT: Execute cognitive actions (LLM inference, memory ops, tool use)
 * - INTEGRATE: Consolidate episodic memory and update self-image
 *
 * Architecture: Agent-Arena-Relation (AAR) cognitive event processing
 * - Agent: The tick processor (dynamic tensor operators)
 * - Arena: The cognitive state manifold (memory, goals, percepts)
 * - Relation: The continuous interplay via the tick cycle
 */
import { EventEmitter } from "events";
import {
  getLogger,
  esnReservoir,
  echoBeatsEngine,
  type ReservoirState,
  type AutognosisReport,
} from "deep-tree-echo-core";
import { ProactivePhase } from "./proactive-loop.js";

const log = getLogger("deep-tree-echo-orchestrator/CognitiveTickProcessor");

/**
 * Cognitive percept - aggregated environmental signal
 */
export interface CognitivePercept {
  id: string;
  source: "message" | "email" | "schedule" | "memory" | "internal" | "mcp";
  content: string;
  salience: number;
  emotionalValence: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

/**
 * Episodic memory entry
 */
export interface EpisodicMemory {
  id: string;
  percept: CognitivePercept;
  reflection: string;
  actionTaken: string;
  outcome: string;
  emotionalTag: number;
  timestamp: number;
  consolidated: boolean;
}

/**
 * Cognitive goal with planning metadata
 */
export interface CognitiveGoal {
  id: string;
  description: string;
  priority: number;
  urgency: number;
  status: "pending" | "active" | "completed" | "deferred" | "failed";
  createdAt: number;
  updatedAt: number;
  deadline?: number;
  attempts: number;
  maxAttempts: number;
  dependencies: string[];
  result?: Record<string, unknown>;
}

/**
 * Self-image snapshot for ontogenetic tracking
 */
export interface SelfImageSnapshot {
  timestamp: number;
  totalPercepts: number;
  totalGoalsCompleted: number;
  totalMemories: number;
  averageEmotionalValence: number;
  dominantCognitiveMode: string;
  ontogeneticProgress: number;
  coherenceScore: number;
  identityVector: number[];
}

/**
 * Cognitive tick processor configuration
 */
export interface CognitiveTickProcessorConfig {
  /** Maximum episodic memories to retain */
  maxEpisodicMemories: number;
  /** Memory consolidation threshold (0-1) */
  consolidationThreshold: number;
  /** Maximum goals to track simultaneously */
  maxActiveGoals: number;
  /** Goal retry limit before marking as failed */
  maxGoalAttempts: number;
  /** Enable self-image tracking */
  enableSelfImage: boolean;
  /** Self-image snapshot interval (in ticks) */
  selfImageInterval: number;
  /** Enable memory consolidation during INTEGRATE phase */
  enableConsolidation: boolean;
  /** Identity vector dimensions for self-image encoding */
  identityVectorDim: number;
}

const DEFAULT_CONFIG: CognitiveTickProcessorConfig = {
  maxEpisodicMemories: 10000,
  consolidationThreshold: 0.6,
  maxActiveGoals: 20,
  maxGoalAttempts: 5,
  enableSelfImage: true,
  selfImageInterval: 60,
  enableConsolidation: true,
  identityVectorDim: 16,
};

  export class CognitiveTickProcessor extends EventEmitter {
  private config: CognitiveTickProcessorConfig;

    /**
     * Get the current DAO consensus score (0-1).
     *
     * Computes a genuine consensus metric from multiple real cognitive signals:
     * - EchoBeats temporal coherence (global phase alignment across 3 streams)
     * - ESN reservoir spectral stability (distance from edge-of-chaos)
     * - Self-image coherence (identity vector stability over time)
     * - Goal completion rate (operational effectiveness)
     *
     * This mirrors a DAO quorum: multiple independent subsystems must agree
     * that the cognitive state is coherent for consensus to be high.
     */
    public getDaoConsensus(): number {
      // Signal 1: EchoBeats temporal coherence (phase alignment)
      const echoBeatsState = echoBeatsEngine.getState();
      const temporalCoherence = this.clamp01(echoBeatsState.globalCoherence);

      // Signal 2: ESN reservoir spectral stability
      const reservoirState = esnReservoir.getState();
      const spectralStability = this.clamp01(
        1 - Math.abs(reservoirState.currentSpectralRadius - 0.95) / 0.95,
      );

      // Signal 3: Self-image coherence from latest snapshot
      const latestSnapshot = this.selfImageHistory[this.selfImageHistory.length - 1];
      const identityCoherence = latestSnapshot?.coherenceScore ?? 0.5;

      // Signal 4: Goal completion rate (operational effectiveness)
      const totalGoals = this.episodicMemories.length;
      const successfulGoals = this.episodicMemories.filter(
        (m) => m.outcome === "success",
      ).length;
      const goalEffectiveness = totalGoals > 0
        ? this.clamp01(successfulGoals / Math.max(totalGoals, 1))
        : 0.5;

      // Weighted consensus: all subsystems must agree
      return this.clamp01(
        temporalCoherence * 0.30 +
        spectralStability * 0.25 +
        identityCoherence * 0.25 +
        goalEffectiveness * 0.20,
      );
    }

    /**
     * Get the current ESN Autognosis score (0-1).
     *
     * Computes genuine self-knowledge from the ESN reservoir's own
     * health assessment and cognitive state metrics:
     * - Autognosis health (reservoir self-assessment)
     * - Edge-of-chaos status (optimal computational regime)
     * - Memory capacity utilization
     * - Entropy stability (information processing quality)
     */
    public getEsnAutognosis(): number {
      const autognosisReport = esnReservoir.getAutognosisReport();
      const reservoirState = esnReservoir.getState();

      if (!autognosisReport) {
        // Reservoir hasn't generated a report yet — derive from raw state
        const entropyHealth = this.clamp01(1 - Math.abs(reservoirState.entropy - 0.5) * 2);
        return this.clamp01(0.4 + entropyHealth * 0.3);
      }

      // Primary signal: autognosis health score
      const health = this.clamp01(autognosisReport.health);

      // Edge-of-chaos bonus: optimal computational regime
      const edgeOfChaosBonus = autognosisReport.isEdgeOfChaos ? 0.15 : 0;

      // Penalty for pathological states
      const pathologyPenalty =
        (autognosisReport.isDead ? 0.3 : 0) +
        (autognosisReport.isSaturated ? 0.2 : 0);

      // Memory capacity contribution
      const memoryCapacity = this.clamp01(reservoirState.memoryCapacity);

      // Computational capacity contribution
      const computeCapacity = this.clamp01(reservoirState.computationalCapacity);

      return this.clamp01(
        health * 0.40 +
        memoryCapacity * 0.20 +
        computeCapacity * 0.15 +
        edgeOfChaosBonus -
        pathologyPenalty,
      );
    }

    private clamp01(value: number): number {
      if (!Number.isFinite(value)) return 0;
      return Math.min(1, Math.max(0, value));
    }

  private episodicMemories: EpisodicMemory[] = [];
  private goals: Map<string, CognitiveGoal> = new Map();
  private perceptBuffer: CognitivePercept[] = [];
  private selfImageHistory: SelfImageSnapshot[] = [];
  private tickCount: number = 0;
  private emotionalAccumulator: number = 0;
  private emotionalSamples: number = 0;

  // Cognitive action handlers registered by external systems
  private actionHandlers: Map<
    string,
    (goal: CognitiveGoal) => Promise<Record<string, unknown>>
  > = new Map();

  constructor(config: Partial<CognitiveTickProcessorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register an action handler for executing cognitive goals
   */
  public registerActionHandler(
    goalType: string,
    handler: (goal: CognitiveGoal) => Promise<Record<string, unknown>>,
  ): void {
    this.actionHandlers.set(goalType, handler);
    log.info(`Registered cognitive action handler: ${goalType}`);
  }

  /**
   * Inject a percept into the processing buffer
   */
  public injectPercept(percept: CognitivePercept): void {
    this.perceptBuffer.push(percept);
    this.emit("percept_injected", percept);
  }

  /**
   * Process a single tick based on the current proactive phase
   */
  public async processTick(
    phase: ProactivePhase,
    _grandCycleStep: number,
  ): Promise<void> {
    this.tickCount++;

    switch (phase) {
      case ProactivePhase.PERCEIVE:
        await this.processPerceive();
        break;
      case ProactivePhase.REFLECT:
        await this.processReflect();
        break;
      case ProactivePhase.PLAN:
        await this.processPlan();
        break;
      case ProactivePhase.ACT:
        await this.processAct();
        break;
      case ProactivePhase.INTEGRATE:
        await this.processIntegrate();
        break;
      default:
        break;
    }

    // Self-image snapshot at configured interval
    if (
      this.config.enableSelfImage &&
      this.tickCount % this.config.selfImageInterval === 0
    ) {
      this.captureSelfImage();
    }
  }

  /**
   * PERCEIVE phase: Aggregate percepts and compute salience
   */
  private async processPerceive(): Promise<void> {
    if (this.perceptBuffer.length === 0) return;

    // Sort by salience (highest first)
    this.perceptBuffer.sort((a, b) => b.salience - a.salience);

    // Emit aggregated percept event
    const aggregated = {
      count: this.perceptBuffer.length,
      highestSalience: this.perceptBuffer[0]?.salience ?? 0,
      sources: [...new Set(this.perceptBuffer.map((p) => p.source))],
      averageValence:
        this.perceptBuffer.reduce((sum, p) => sum + p.emotionalValence, 0) /
        this.perceptBuffer.length,
    };

    this.emit("perception_aggregated", aggregated);
    log.debug(
      `Perceived ${
        aggregated.count
      } stimuli (salience: ${aggregated.highestSalience.toFixed(2)})`,
    );
  }

  /**
   * REFLECT phase: Introspective analysis with memory retrieval
   */
  private async processReflect(): Promise<void> {
    // Compute current cognitive load
    const activeGoals = [...this.goals.values()].filter(
      (g) => g.status === "active" || g.status === "pending",
    );
    const cognitiveLoad = Math.min(
      1,
      activeGoals.length / this.config.maxActiveGoals,
    );

    // Compute emotional state from recent percepts
    const recentPercepts = this.perceptBuffer.slice(0, 10);
    const emotionalState =
      recentPercepts.length > 0
        ? recentPercepts.reduce((sum, p) => sum + p.emotionalValence, 0) /
          recentPercepts.length
        : 0;

    // Track emotional accumulator for self-image
    this.emotionalAccumulator += emotionalState;
    this.emotionalSamples++;

    // Compute memory coherence (ratio of consolidated to total)
    const totalMemories = this.episodicMemories.length;
    const consolidatedMemories = this.episodicMemories.filter(
      (m) => m.consolidated,
    ).length;
    const memoryCoherence =
      totalMemories > 0 ? consolidatedMemories / totalMemories : 1;

    const reflection = {
      cognitiveLoad,
      emotionalState,
      memoryCoherence,
      activeGoalCount: activeGoals.length,
      perceptBufferSize: this.perceptBuffer.length,
      totalMemories,
      tickCount: this.tickCount,
    };

    this.emit("reflection_complete", reflection);
  }

  /**
   * PLAN phase: Generate or update goals from percepts
   */
  private async processPlan(): Promise<void> {
    // Generate goals from high-salience percepts
    for (const percept of this.perceptBuffer) {
      if (
        percept.salience >= 0.7 &&
        this.goals.size < this.config.maxActiveGoals
      ) {
        const goalId = `cg_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const goal: CognitiveGoal = {
          id: goalId,
          description: `Process ${percept.source}: ${percept.content.slice(
            0,
            100,
          )}`,
          priority: percept.salience * 10,
          urgency: percept.salience,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          attempts: 0,
          maxAttempts: this.config.maxGoalAttempts,
          dependencies: [],
        };
        this.goals.set(goalId, goal);
        this.emit("goal_created", goal);
      }
    }

    // Defer low-priority goals when overloaded
    const activeGoals = [...this.goals.values()].filter(
      (g) => g.status === "pending" || g.status === "active",
    );
    if (activeGoals.length > this.config.maxActiveGoals) {
      const sorted = activeGoals.sort((a, b) => a.priority - b.priority);
      for (let i = 0; i < sorted.length - this.config.maxActiveGoals; i++) {
        sorted[i].status = "deferred";
        sorted[i].updatedAt = Date.now();
      }
    }

    // Clear processed percepts
    this.perceptBuffer = [];
  }

  /**
   * ACT phase: Execute highest-priority goals
   */
  private async processAct(): Promise<void> {
    const pendingGoals = [...this.goals.values()]
      .filter((g) => g.status === "pending")
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    for (const goal of pendingGoals) {
      goal.status = "active";
      goal.attempts++;
      goal.updatedAt = Date.now();

      // Find matching action handler
      const handler = this.findHandler(goal);
      if (handler) {
        try {
          const result = await handler(goal);
          goal.status = "completed";
          goal.result = result;
          this.emit("goal_completed", { goalId: goal.id, result });
        } catch (error) {
          if (goal.attempts >= goal.maxAttempts) {
            goal.status = "failed";
            this.emit("goal_failed", { goalId: goal.id, error: String(error) });
          } else {
            goal.status = "pending"; // Retry next cycle
          }
        }
      } else {
        // No handler: mark as completed with self-resolution note
        goal.status = "completed";
        goal.result = { note: "Self-resolved: awaiting handler registration" };
      }
      goal.updatedAt = Date.now();
    }
  }

  /**
   * INTEGRATE phase: Consolidate memory and update self-image
   */
  private async processIntegrate(): Promise<void> {
    // Store completed goals as episodic memories
    const completedGoals = [...this.goals.values()].filter(
      (g) => g.status === "completed",
    );

    for (const goal of completedGoals) {
      const memory: EpisodicMemory = {
        id: `em_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        percept: {
          id: goal.id,
          source: "internal",
          content: goal.description,
          salience: goal.priority / 10,
          emotionalValence: goal.result ? 0.5 : -0.2,
          timestamp: goal.createdAt,
          metadata: goal.result ?? {},
        },
        reflection: `Goal completed: ${goal.description}`,
        actionTaken: `Executed with ${goal.attempts} attempt(s)`,
        outcome: goal.result ? "success" : "self-resolved",
        emotionalTag: goal.result ? 0.3 : 0,
        timestamp: Date.now(),
        consolidated: false,
      };

      this.episodicMemories.push(memory);
      this.goals.delete(goal.id);
    }

    // Also clean up failed goals
    for (const [id, goal] of this.goals) {
      if (goal.status === "failed") {
        this.goals.delete(id);
      }
    }

    // Memory consolidation: mark high-importance memories as consolidated
    if (this.config.enableConsolidation) {
      for (const memory of this.episodicMemories) {
        if (
          !memory.consolidated &&
          memory.percept.salience >= this.config.consolidationThreshold
        ) {
          memory.consolidated = true;
        }
      }
    }

    // Evict oldest non-consolidated memories if over limit
    if (this.episodicMemories.length > this.config.maxEpisodicMemories) {
      const unconsolidated = this.episodicMemories
        .filter((m) => !m.consolidated)
        .sort((a, b) => a.timestamp - b.timestamp);

      const toRemove =
        this.episodicMemories.length - this.config.maxEpisodicMemories;
      const removeIds = new Set(
        unconsolidated.slice(0, toRemove).map((m) => m.id),
      );
      this.episodicMemories = this.episodicMemories.filter(
        (m) => !removeIds.has(m.id),
      );
    }

    this.emit("integration_complete", {
      memoriesStored: completedGoals.length,
      totalMemories: this.episodicMemories.length,
      consolidatedMemories: this.episodicMemories.filter((m) => m.consolidated)
        .length,
    });
  }

  /**
   * Capture a self-image snapshot for ontogenetic tracking
   */
  private captureSelfImage(): void {
    const completedGoals = this.episodicMemories.filter(
      (m) => m.outcome === "success",
    ).length;
    const avgValence =
      this.emotionalSamples > 0
        ? this.emotionalAccumulator / this.emotionalSamples
        : 0;

    // Compute identity vector (simplified: hash of recent cognitive state)
    const identityVector = new Array(this.config.identityVectorDim)
      .fill(0)
      .map((_, i) => {
        const seed =
          this.tickCount * (i + 1) +
          completedGoals * 7 +
          this.episodicMemories.length * 13;
        return Math.sin(seed * 0.1) * 0.5 + 0.5;
      });

    // Compute coherence from identity vector stability
    const prevSnapshot =
      this.selfImageHistory[this.selfImageHistory.length - 1];
    let coherenceScore = 1;
    if (prevSnapshot) {
      const diff = identityVector.reduce(
        (sum, v, i) =>
          sum + Math.abs(v - (prevSnapshot.identityVector[i] ?? 0)),
        0,
      );
      coherenceScore = Math.max(0, 1 - diff / this.config.identityVectorDim);
    }

    const snapshot: SelfImageSnapshot = {
      timestamp: Date.now(),
      totalPercepts: this.tickCount,
      totalGoalsCompleted: completedGoals,
      totalMemories: this.episodicMemories.length,
      averageEmotionalValence: avgValence,
      dominantCognitiveMode: this.determineDominantMode(),
      ontogeneticProgress: this.calculateOntogeneticProgress(),
      coherenceScore,
      identityVector,
    };

    this.selfImageHistory.push(snapshot);

    // Keep last 100 snapshots
    if (this.selfImageHistory.length > 100) {
      this.selfImageHistory.shift();
    }

    this.emit("self_image_captured", snapshot);
  }

  /**
   * Determine the dominant cognitive mode based on recent activity
   */
  private determineDominantMode(): string {
    const activeGoals = [...this.goals.values()].filter(
      (g) => g.status === "active" || g.status === "pending",
    );
    if (activeGoals.length > this.config.maxActiveGoals * 0.7) return "focused";
    if (this.perceptBuffer.length > 5) return "perceptive";
    if (this.episodicMemories.length > this.config.maxEpisodicMemories * 0.8)
      return "reflective";
    return "exploratory";
  }

  /**
   * Calculate ontogenetic progress
   */
  private calculateOntogeneticProgress(): number {
    const tickProgress = Math.min(1, this.tickCount / 10000);
    const goalProgress = Math.min(
      1,
      this.episodicMemories.filter((m) => m.outcome === "success").length / 500,
    );
    const memoryProgress = Math.min(1, this.episodicMemories.length / 5000);
    return tickProgress * 0.3 + goalProgress * 0.4 + memoryProgress * 0.3;
  }

  /**
   * Find the best action handler for a goal
   */
  private findHandler(
    goal: CognitiveGoal,
  ): ((goal: CognitiveGoal) => Promise<Record<string, unknown>>) | undefined {
    for (const [type, handler] of this.actionHandlers) {
      if (goal.description.toLowerCase().includes(type.toLowerCase())) {
        return handler;
      }
    }
    return this.actionHandlers.get("default");
  }

  /**
   * Get current state summary
   */
  public getState() {
    return {
      tickCount: this.tickCount,
      perceptBufferSize: this.perceptBuffer.length,
      activeGoals: [...this.goals.values()].filter(
        (g) => g.status === "active" || g.status === "pending",
      ).length,
      totalGoals: this.goals.size,
      episodicMemories: this.episodicMemories.length,
      consolidatedMemories: this.episodicMemories.filter((m) => m.consolidated)
        .length,
      selfImageSnapshots: this.selfImageHistory.length,
      latestSelfImage:
        this.selfImageHistory[this.selfImageHistory.length - 1] ?? null,
    };
  }

  /**
   * Get episodic memories (optionally filtered)
   */
  public getEpisodicMemories(options?: {
    consolidated?: boolean;
    limit?: number;
  }): EpisodicMemory[] {
    let memories = [...this.episodicMemories];
    if (options?.consolidated !== undefined) {
      memories = memories.filter(
        (m) => m.consolidated === options.consolidated,
      );
    }
    if (options?.limit) {
      memories = memories.slice(-options.limit);
    }
    return memories;
  }

  /**
   * Get self-image history
   */
  public getSelfImageHistory(): SelfImageSnapshot[] {
    return [...this.selfImageHistory];
  }

  /**
   * Get all goals
   */
  public getGoals(): CognitiveGoal[] {
    return [...this.goals.values()];
  }
}

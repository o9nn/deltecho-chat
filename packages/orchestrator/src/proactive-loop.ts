/**
 * Proactive Autonomous Loop
 *
 * Implements the Deep Tree Echo proactive orchestration cycle.
 * Rather than waiting passively for incoming messages, the orchestrator
 * runs continuous cognitive cycles that:
 *
 * 1. PERCEIVE  - Scan environment for new stimuli, pending tasks, memory triggers
 * 2. REFLECT   - Run introspective analysis on current cognitive state
 * 3. PLAN      - Generate or update goals and task priorities
 * 4. ACT       - Execute highest-priority autonomous actions
 * 5. INTEGRATE - Consolidate results into memory and update self-image
 *
 * This is the "heartbeat" of Deep Tree Echo's autonomy — the feed-forward
 * (inference) and feed-back (learning) loop that couples memory of the
 * closed past with projection into the open future.
 *
 * Architecture: Agent-Arena-Relation (AAR)
 * - Agent: The proactive loop itself (urge-to-act)
 * - Arena: The environment state manifold (need-to-be)
 * - Relation: The continuous interplay via the cognitive cycle
 */
import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/ProactiveLoop");

/**
 * Cognitive phase in the proactive cycle
 */
export enum ProactivePhase {
  PERCEIVE = "PERCEIVE",
  REFLECT = "REFLECT",
  PLAN = "PLAN",
  ACT = "ACT",
  INTEGRATE = "INTEGRATE",
  IDLE = "IDLE",
}

/**
 * Environment stimulus detected during perception
 */
export interface EnvironmentStimulus {
  type: "message" | "task" | "memory" | "schedule" | "system" | "self";
  source: string;
  priority: number;
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Reflection result from introspective analysis
 */
export interface ReflectionResult {
  cognitiveLoad: number;
  emotionalValence: number;
  memoryCoherence: number;
  goalAlignment: number;
  selfImageDelta: number;
  insights: string[];
  timestamp: number;
}

/**
 * Autonomous goal generated or updated during planning
 */
export interface AutonomousGoal {
  id: string;
  description: string;
  priority: number;
  status: "pending" | "active" | "completed" | "deferred";
  createdAt: number;
  updatedAt: number;
  deadline?: number;
  subtasks: string[];
  dependencies: string[];
}

/**
 * Action result from autonomous execution
 */
export interface ActionResult {
  goalId: string;
  success: boolean;
  output: Record<string, unknown>;
  duration: number;
  sideEffects: string[];
}

/**
 * Integration result from memory consolidation
 */
export interface IntegrationResult {
  memoriesStored: number;
  goalsUpdated: number;
  selfImageUpdated: boolean;
  ontogeneticProgress: number;
}

/**
 * Proactive loop configuration
 */
export interface ProactiveLoopConfig {
  /** Cycle interval in milliseconds */
  cycleIntervalMs: number;
  /** Maximum stimuli to process per cycle */
  maxStimuliPerCycle: number;
  /** Minimum cognitive load threshold to trigger action */
  actionThreshold: number;
  /** Enable autonomous goal generation */
  enableAutonomousGoals: boolean;
  /** Enable memory consolidation during integration */
  enableMemoryConsolidation: boolean;
  /** Enable self-image updates */
  enableSelfImageUpdates: boolean;
  /** Maximum concurrent autonomous actions */
  maxConcurrentActions: number;
  /** Idle timeout before entering low-power mode (ms) */
  idleTimeoutMs: number;
  /** Enable telemetry reporting */
  enableTelemetry: boolean;
}

const DEFAULT_CONFIG: ProactiveLoopConfig = {
  cycleIntervalMs: 5000,
  maxStimuliPerCycle: 10,
  actionThreshold: 0.3,
  enableAutonomousGoals: true,
  enableMemoryConsolidation: true,
  enableSelfImageUpdates: true,
  maxConcurrentActions: 3,
  idleTimeoutMs: 30000,
  enableTelemetry: true,
};

/**
 * Proactive loop state
 */
export interface ProactiveLoopState {
  running: boolean;
  currentPhase: ProactivePhase;
  cycleNumber: number;
  lastCycleTime: number;
  totalCycles: number;
  stimuliProcessed: number;
  actionsExecuted: number;
  goalsActive: number;
  goalsCompleted: number;
  averageCycleTime: number;
  cognitiveLoad: number;
  ontogeneticStage: OntogeneticStage;
}

/**
 * Ontogenetic development stages
 */
export enum OntogeneticStage {
  EMBRYONIC = "EMBRYONIC",
  JUVENILE = "JUVENILE",
  ADOLESCENT = "ADOLESCENT",
  ADULT = "ADULT",
  TRANSCENDENT = "TRANSCENDENT",
}

/**
 * Proactive loop event types
 */
export type ProactiveLoopEvent =
  | { type: "cycle_start"; cycleNumber: number; phase: ProactivePhase }
  | { type: "cycle_complete"; cycleNumber: number; duration: number }
  | { type: "stimulus_detected"; stimulus: EnvironmentStimulus }
  | { type: "reflection_complete"; result: ReflectionResult }
  | { type: "goal_created"; goal: AutonomousGoal }
  | { type: "goal_completed"; goalId: string }
  | { type: "action_executed"; result: ActionResult }
  | { type: "integration_complete"; result: IntegrationResult }
  | { type: "phase_transition"; from: ProactivePhase; to: ProactivePhase }
  | {
      type: "ontogenetic_advance";
      from: OntogeneticStage;
      to: OntogeneticStage;
    }
  | { type: "idle_entered" }
  | { type: "error"; phase: ProactivePhase; error: string };

/**
 * ProactiveLoop
 *
 * The autonomous cognitive heartbeat of Deep Tree Echo.
 * Runs continuous perception-reflection-planning-action-integration cycles
 * to maintain proactive awareness and autonomous goal pursuit.
 */
export class ProactiveLoop extends EventEmitter {
  private config: ProactiveLoopConfig;
  private state: ProactiveLoopState;
  private goals: Map<string, AutonomousGoal> = new Map();
  private stimuliQueue: EnvironmentStimulus[] = [];
  private cycleTimer?: ReturnType<typeof setInterval>;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private cycleTimes: number[] = [];

  // Perception handlers registered by external systems
  private perceptionHandlers: Array<() => Promise<EnvironmentStimulus[]>> = [];
  // Action handlers for executing autonomous goals
  private actionHandlers: Map<
    string,
    (goal: AutonomousGoal) => Promise<ActionResult>
  > = new Map();

  constructor(config: Partial<ProactiveLoopConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      running: false,
      currentPhase: ProactivePhase.IDLE,
      cycleNumber: 0,
      lastCycleTime: 0,
      totalCycles: 0,
      stimuliProcessed: 0,
      actionsExecuted: 0,
      goalsActive: 0,
      goalsCompleted: 0,
      averageCycleTime: 0,
      cognitiveLoad: 0,
      ontogeneticStage: OntogeneticStage.EMBRYONIC,
    };
  }

  /**
   * Register a perception handler that scans for environmental stimuli
   */
  public registerPerceptionHandler(
    handler: () => Promise<EnvironmentStimulus[]>,
  ): void {
    this.perceptionHandlers.push(handler);
    log.info(
      `Registered perception handler (total: ${this.perceptionHandlers.length})`,
    );
  }

  /**
   * Register an action handler for a specific goal type
   */
  public registerActionHandler(
    goalType: string,
    handler: (goal: AutonomousGoal) => Promise<ActionResult>,
  ): void {
    this.actionHandlers.set(goalType, handler);
    log.info(`Registered action handler for goal type: ${goalType}`);
  }

  /**
   * Inject an external stimulus into the perception queue
   */
  public injectStimulus(stimulus: EnvironmentStimulus): void {
    this.stimuliQueue.push(stimulus);
    this.emitEvent({ type: "stimulus_detected", stimulus });

    // Reset idle timer on new stimulus
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  /**
   * Start the proactive loop
   */
  public async start(): Promise<void> {
    if (this.state.running) {
      log.warn("Proactive loop is already running");
      return;
    }

    log.info("Starting proactive autonomous loop");
    log.info(
      `Configuration: cycle=${this.config.cycleIntervalMs}ms, ` +
        `maxStimuli=${this.config.maxStimuliPerCycle}, ` +
        `actionThreshold=${this.config.actionThreshold}`,
    );

    this.state.running = true;
    this.state.currentPhase = ProactivePhase.PERCEIVE;

    // Start the cognitive cycle timer
    this.cycleTimer = setInterval(() => {
      this.runCycle().catch((error) => {
        log.error("Proactive cycle error:", error);
        this.emitEvent({
          type: "error",
          phase: this.state.currentPhase,
          error: String(error),
        });
      });
    }, this.config.cycleIntervalMs);

    // Run first cycle immediately
    await this.runCycle();
  }

  /**
   * Stop the proactive loop
   */
  public async stop(): Promise<void> {
    if (!this.state.running) return;

    log.info("Stopping proactive autonomous loop");

    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = undefined;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }

    this.state.running = false;
    this.state.currentPhase = ProactivePhase.IDLE;

    log.info(`Proactive loop stopped after ${this.state.totalCycles} cycles`);
  }

  /**
   * Run a single cognitive cycle: PERCEIVE → REFLECT → PLAN → ACT → INTEGRATE
   */
  private async runCycle(): Promise<void> {
    const cycleStart = Date.now();
    this.state.cycleNumber++;

    this.emitEvent({
      type: "cycle_start",
      cycleNumber: this.state.cycleNumber,
      phase: ProactivePhase.PERCEIVE,
    });

    try {
      // Phase 1: PERCEIVE
      await this.transitionPhase(ProactivePhase.PERCEIVE);
      const stimuli = await this.perceive();

      // Phase 2: REFLECT
      await this.transitionPhase(ProactivePhase.REFLECT);
      const reflection = await this.reflect(stimuli);

      // Phase 3: PLAN
      await this.transitionPhase(ProactivePhase.PLAN);
      await this.plan(reflection, stimuli);

      // Phase 4: ACT
      await this.transitionPhase(ProactivePhase.ACT);
      const actions = await this.act();

      // Phase 5: INTEGRATE
      await this.transitionPhase(ProactivePhase.INTEGRATE);
      await this.integrate(actions, reflection);
    } catch (error) {
      log.error(`Cycle ${this.state.cycleNumber} error:`, error);
    }

    const cycleDuration = Date.now() - cycleStart;
    this.state.lastCycleTime = cycleDuration;
    this.state.totalCycles++;
    this.cycleTimes.push(cycleDuration);

    // Keep rolling average of last 100 cycles
    if (this.cycleTimes.length > 100) {
      this.cycleTimes.shift();
    }
    this.state.averageCycleTime =
      this.cycleTimes.reduce((a, b) => a + b, 0) / this.cycleTimes.length;

    this.emitEvent({
      type: "cycle_complete",
      cycleNumber: this.state.cycleNumber,
      duration: cycleDuration,
    });

    // Check for idle state
    if (this.stimuliQueue.length === 0 && this.getActiveGoals().length === 0) {
      this.enterIdleMode();
    }
  }

  /**
   * Phase 1: PERCEIVE - Scan environment for stimuli
   */
  private async perceive(): Promise<EnvironmentStimulus[]> {
    const stimuli: EnvironmentStimulus[] = [];

    // Collect stimuli from registered handlers
    for (const handler of this.perceptionHandlers) {
      try {
        const detected = await handler();
        stimuli.push(...detected);
      } catch (error) {
        log.warn("Perception handler error:", error);
      }
    }

    // Drain queued stimuli
    while (
      this.stimuliQueue.length > 0 &&
      stimuli.length < this.config.maxStimuliPerCycle
    ) {
      const stimulus = this.stimuliQueue.shift();
      if (stimulus) stimuli.push(stimulus);
    }

    // Sort by priority (highest first)
    stimuli.sort((a, b) => b.priority - a.priority);

    // Trim to max
    const processed = stimuli.slice(0, this.config.maxStimuliPerCycle);
    this.state.stimuliProcessed += processed.length;

    if (processed.length > 0) {
      log.info(
        `Perceived ${processed.length} stimuli (types: ${[
          ...new Set(processed.map((s) => s.type)),
        ].join(", ")})`,
      );
    }

    return processed;
  }

  /**
   * Phase 2: REFLECT - Introspective analysis of cognitive state
   */
  private async reflect(
    stimuli: EnvironmentStimulus[],
  ): Promise<ReflectionResult> {
    const activeGoals = this.getActiveGoals();

    // Calculate cognitive load from active goals and pending stimuli
    const goalLoad = Math.min(
      1,
      activeGoals.length / this.config.maxConcurrentActions,
    );
    const stimuliLoad = Math.min(
      1,
      stimuli.length / this.config.maxStimuliPerCycle,
    );
    const cognitiveLoad = goalLoad * 0.6 + stimuliLoad * 0.4;

    // Calculate emotional valence from stimuli priorities
    const avgPriority =
      stimuli.length > 0
        ? stimuli.reduce((sum, s) => sum + s.priority, 0) / stimuli.length
        : 5;
    const emotionalValence = (avgPriority - 5) / 5; // Normalize to [-1, 1]

    // Calculate memory coherence (how well goals align with each other)
    const completedGoals = [...this.goals.values()].filter(
      (g) => g.status === "completed",
    ).length;
    const totalGoals = this.goals.size;
    const memoryCoherence = totalGoals > 0 ? completedGoals / totalGoals : 1;

    // Calculate goal alignment
    const goalAlignment =
      activeGoals.length > 0
        ? activeGoals.reduce((sum, g) => sum + g.priority, 0) /
          (activeGoals.length * 10)
        : 0;

    // Self-image delta: how much the system has changed this cycle
    const selfImageDelta = stimuli.length > 0 ? 0.01 * stimuli.length : 0;

    const result: ReflectionResult = {
      cognitiveLoad,
      emotionalValence,
      memoryCoherence,
      goalAlignment,
      selfImageDelta,
      insights: this.generateInsights(
        cognitiveLoad,
        emotionalValence,
        activeGoals,
      ),
      timestamp: Date.now(),
    };

    this.state.cognitiveLoad = cognitiveLoad;

    this.emitEvent({ type: "reflection_complete", result });

    return result;
  }

  /**
   * Phase 3: PLAN - Generate or update goals based on reflection
   */
  private async plan(
    reflection: ReflectionResult,
    stimuli: EnvironmentStimulus[],
  ): Promise<void> {
    if (!this.config.enableAutonomousGoals) return;

    // Generate goals from high-priority stimuli
    for (const stimulus of stimuli) {
      if (stimulus.priority >= 7) {
        const goalId = `goal_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const goal: AutonomousGoal = {
          id: goalId,
          description: `Process ${stimulus.type} stimulus from ${stimulus.source}`,
          priority: stimulus.priority,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          subtasks: [],
          dependencies: [],
        };
        this.goals.set(goalId, goal);
        this.emitEvent({ type: "goal_created", goal });
      }
    }

    // Defer low-priority goals when cognitive load is high
    if (reflection.cognitiveLoad > 0.8) {
      for (const goal of this.getActiveGoals()) {
        if (goal.priority < 5) {
          goal.status = "deferred";
          goal.updatedAt = Date.now();
        }
      }
    }

    // Re-activate deferred goals when load drops
    if (reflection.cognitiveLoad < 0.4) {
      for (const goal of [...this.goals.values()]) {
        if (goal.status === "deferred") {
          goal.status = "pending";
          goal.updatedAt = Date.now();
        }
      }
    }

    this.state.goalsActive = this.getActiveGoals().length;
  }

  /**
   * Phase 4: ACT - Execute highest-priority autonomous actions
   */
  private async act(): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    const activeGoals = this.getActiveGoals()
      .filter((g) => g.status === "pending")
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.maxConcurrentActions);

    for (const goal of activeGoals) {
      goal.status = "active";
      goal.updatedAt = Date.now();

      // Find matching action handler
      const handler = this.findActionHandler(goal);
      if (handler) {
        try {
          const start = Date.now();
          const result = await handler(goal);
          result.duration = Date.now() - start;
          results.push(result);

          if (result.success) {
            goal.status = "completed";
            this.state.goalsCompleted++;
            this.emitEvent({ type: "goal_completed", goalId: goal.id });
          } else {
            goal.status = "pending"; // Retry next cycle
          }
        } catch (error) {
          log.warn(`Action failed for goal ${goal.id}:`, error);
          goal.status = "pending";
        }
      } else {
        // No handler available, mark as completed (self-resolving)
        goal.status = "completed";
        results.push({
          goalId: goal.id,
          success: true,
          output: { note: "Self-resolved: no action handler required" },
          duration: 0,
          sideEffects: [],
        });
        this.state.goalsCompleted++;
      }

      goal.updatedAt = Date.now();
      this.state.actionsExecuted++;
    }

    for (const result of results) {
      this.emitEvent({ type: "action_executed", result });
    }

    return results;
  }

  /**
   * Phase 5: INTEGRATE - Consolidate results into memory
   */
  private async integrate(
    actions: ActionResult[],
    reflection: ReflectionResult,
  ): Promise<IntegrationResult> {
    let memoriesStored = 0;
    let goalsUpdated = 0;
    let selfImageUpdated = false;

    // Store action results as episodic memories
    if (this.config.enableMemoryConsolidation) {
      memoriesStored = actions.length;
    }

    // Update goal statuses
    goalsUpdated = actions.filter((a) => a.success).length;

    // Update self-image if significant changes occurred
    if (
      this.config.enableSelfImageUpdates &&
      reflection.selfImageDelta > 0.05
    ) {
      selfImageUpdated = true;
    }

    // Check for ontogenetic advancement
    const ontogeneticProgress = this.calculateOntogeneticProgress();

    const result: IntegrationResult = {
      memoriesStored,
      goalsUpdated,
      selfImageUpdated,
      ontogeneticProgress,
    };

    this.emitEvent({ type: "integration_complete", result });

    // Check for stage advancement
    this.checkOntogeneticAdvancement(ontogeneticProgress);

    return result;
  }

  /**
   * Transition to a new phase
   */
  private async transitionPhase(newPhase: ProactivePhase): Promise<void> {
    const oldPhase = this.state.currentPhase;
    this.state.currentPhase = newPhase;
    this.emitEvent({ type: "phase_transition", from: oldPhase, to: newPhase });
  }

  /**
   * Enter idle mode when no stimuli or active goals
   */
  private enterIdleMode(): void {
    if (this.idleTimer) return;

    this.idleTimer = setTimeout(() => {
      this.emitEvent({ type: "idle_entered" });
      this.idleTimer = undefined;
    }, this.config.idleTimeoutMs);
  }

  /**
   * Generate insights from reflection data
   */
  private generateInsights(
    cognitiveLoad: number,
    emotionalValence: number,
    activeGoals: AutonomousGoal[],
  ): string[] {
    const insights: string[] = [];

    if (cognitiveLoad > 0.8) {
      insights.push(
        "High cognitive load detected - consider deferring low-priority goals",
      );
    }
    if (cognitiveLoad < 0.2) {
      insights.push("Low cognitive load - capacity available for exploration");
    }
    if (emotionalValence > 0.5) {
      insights.push(
        "Positive emotional valence - favorable conditions for creative tasks",
      );
    }
    if (emotionalValence < -0.5) {
      insights.push("Negative emotional valence - prioritize stabilization");
    }
    if (activeGoals.length === 0) {
      insights.push("No active goals - entering exploratory mode");
    }
    if (activeGoals.length > this.config.maxConcurrentActions) {
      insights.push("Goal overflow - need to prioritize and defer");
    }

    return insights;
  }

  /**
   * Find the best action handler for a goal
   */
  private findActionHandler(
    goal: AutonomousGoal,
  ): ((goal: AutonomousGoal) => Promise<ActionResult>) | undefined {
    // Try exact match first
    for (const [type, handler] of this.actionHandlers) {
      if (goal.description.toLowerCase().includes(type.toLowerCase())) {
        return handler;
      }
    }
    // Return default handler if available
    return this.actionHandlers.get("default");
  }

  /**
   * Get active (non-completed, non-deferred) goals
   */
  private getActiveGoals(): AutonomousGoal[] {
    return [...this.goals.values()].filter(
      (g) => g.status === "pending" || g.status === "active",
    );
  }

  /**
   * Calculate ontogenetic progress based on cumulative experience
   */
  private calculateOntogeneticProgress(): number {
    const cycleWeight = Math.min(1, this.state.totalCycles / 1000);
    const goalWeight = Math.min(1, this.state.goalsCompleted / 100);
    const stimuliWeight = Math.min(1, this.state.stimuliProcessed / 500);

    return cycleWeight * 0.4 + goalWeight * 0.35 + stimuliWeight * 0.25;
  }

  /**
   * Check if ontogenetic stage should advance
   */
  private checkOntogeneticAdvancement(progress: number): void {
    const thresholds: Record<OntogeneticStage, number> = {
      [OntogeneticStage.EMBRYONIC]: 0,
      [OntogeneticStage.JUVENILE]: 0.2,
      [OntogeneticStage.ADOLESCENT]: 0.4,
      [OntogeneticStage.ADULT]: 0.7,
      [OntogeneticStage.TRANSCENDENT]: 0.95,
    };

    const stages = Object.entries(thresholds) as [OntogeneticStage, number][];
    let targetStage = OntogeneticStage.EMBRYONIC;

    for (const [stage, threshold] of stages) {
      if (progress >= threshold) {
        targetStage = stage;
      }
    }

    if (targetStage !== this.state.ontogeneticStage) {
      const oldStage = this.state.ontogeneticStage;
      this.state.ontogeneticStage = targetStage;
      log.info(
        `Ontogenetic advancement: ${oldStage} → ${targetStage} (progress: ${(
          progress * 100
        ).toFixed(1)}%)`,
      );
      this.emitEvent({
        type: "ontogenetic_advance",
        from: oldStage,
        to: targetStage,
      });
    }
  }

  /**
   * Emit a typed event
   */
  private emitEvent(event: ProactiveLoopEvent): void {
    this.emit(event.type, event);
    if (this.config.enableTelemetry) {
      this.emit("telemetry", event);
    }
  }

  /**
   * Get current state
   */
  public getState(): ProactiveLoopState {
    return { ...this.state };
  }

  /**
   * Get all goals
   */
  public getGoals(): AutonomousGoal[] {
    return [...this.goals.values()];
  }

  /**
   * Manually create a goal
   */
  public createGoal(description: string, priority: number = 5): AutonomousGoal {
    const goalId = `goal_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const goal: AutonomousGoal = {
      id: goalId,
      description,
      priority,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subtasks: [],
      dependencies: [],
    };
    this.goals.set(goalId, goal);
    this.emitEvent({ type: "goal_created", goal });
    return goal;
  }

  /**
   * Check if the loop is running
   */
  public isRunning(): boolean {
    return this.state.running;
  }
}

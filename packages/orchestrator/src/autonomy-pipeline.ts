/**
 * AutonomyPipeline — End-to-End Wiring for Level 4 Autonomy
 *
 * This is the "transmission" that connects DTE's engine to the road.
 * It wires the complete perception → cognition → planning → execution → memory
 * pipeline, replacing the disconnected components with a unified flow:
 *
 *   PerceptionHandlers → CognitiveTickProcessor → LLMGoalPlanner → ToolExecutionEngine
 *         ↑                                                              ↓
 *         └──────────── VectorMemoryStore (episodic consolidation) ──────┘
 *
 * The pipeline runs inside the ProactiveLoop's 5-phase cycle:
 *   PERCEIVE:  PerceptionHandlers feed percepts into CognitiveTickProcessor
 *   REFLECT:   CognitiveTickProcessor introspects with memory retrieval
 *   PLAN:      LLMGoalPlanner decomposes percepts into tool-call goals
 *   ACT:       ToolExecutionEngine executes the planned tool calls
 *   INTEGRATE: VectorMemoryStore consolidates episodic memories via LLM
 *
 * Architecture: This is the AAR Relation — the continuous interplay
 * between Agent (tools) and Arena (memory) through the cognitive cycle.
 */
import { EventEmitter } from "events";
import {
  getLogger,
  LLMService,
  VectorMemoryStore,
  VectorMemoryStoreConfig,
  EmbeddingService,
  EmbeddingServiceConfig,
  FileSystemStorage,
  CoreSelfEngine,
  CoreSelfConfig,
} from "deep-tree-echo-core";
import {
  ProactiveLoop,
  EnvironmentStimulus,
  ProactivePhase,
} from "./proactive-loop.js";
import {
  CognitiveTickProcessor,
  CognitivePercept,
  CognitiveGoal,
} from "./cognitive-tick-processor.js";
import {
  PerceptionHandlers,
  PerceptionHandlerConfig,
} from "./perception/index.js";
import {
  ToolExecutionEngine,
  ToolExecutionEngineConfig,
  ToolResult,
} from "./tools/ToolExecutionEngine.js";
import {
  LLMGoalPlanner,
  LLMGoalPlannerConfig,
  PlanningContext,
  PlanningResult,
} from "./tools/LLMGoalPlanner.js";

const log = getLogger("deep-tree-echo-orchestrator/AutonomyPipeline");

// ─── Configuration ─────────────────────────────────────────────

export interface AutonomyPipelineConfig {
  /** Enable the full autonomy pipeline */
  enabled: boolean;
  /** Enable real perception handlers (filesystem, system, git) */
  enablePerception: boolean;
  /** Enable LLM-driven goal planning */
  enablePlanning: boolean;
  /** Enable tool execution */
  enableExecution: boolean;
  /** Enable vector memory with real embeddings */
  enableVectorMemory: boolean;
  /** Enable episodic memory consolidation via LLM */
  enableConsolidation: boolean;
  /** Consolidation interval in ticks */
  consolidationInterval: number;
  /** Maximum memories to consolidate per cycle */
  consolidationBatchSize: number;
  /** Perception handler configuration */
  perception?: Partial<PerceptionHandlerConfig>;
  /** Tool execution engine configuration */
  tools?: Partial<ToolExecutionEngineConfig>;
  /** LLM goal planner configuration */
  planner?: Partial<LLMGoalPlannerConfig>;
  /** Vector memory store configuration */
  vectorMemory?: Partial<VectorMemoryStoreConfig>;
  /** Embedding service configuration */
  embedding?: Partial<EmbeddingServiceConfig>;
  /** Storage path for persistent memory */
  storagePath: string;
  /** Echobeats: enable 3-stream concurrent cognitive processing */
  enableEchobeats: boolean;
  /** Echobeats cycle interval (ms) */
  echobeatsCycleInterval: number;
  /** Core Self Engine configuration */
  coreSelf?: Partial<CoreSelfConfig>;
  /** Enable Core Self Engine as fallback inference */
  enableCoreSelf: boolean;
}

const DEFAULT_CONFIG: AutonomyPipelineConfig = {
  enabled: true,
  enablePerception: true,
  enablePlanning: true,
  enableExecution: true,
  enableVectorMemory: true,
  enableConsolidation: true,
  consolidationInterval: 30, // Every 30 ticks
  consolidationBatchSize: 10,
  storagePath: "/tmp/deep-tree-echo/memory",
  enableEchobeats: false,
  echobeatsCycleInterval: 2000,
  enableCoreSelf: false,
};

// ─── Echobeats Stream ──────────────────────────────────────────

/**
 * Echobeats stream — one of 3 concurrent cognitive loops
 * phased 4 steps apart over a 12-step cycle.
 *
 * Stream 0: steps {1, 4, 7, 10} — Perception stream
 * Stream 1: steps {2, 5, 8, 11} — Action stream
 * Stream 2: steps {3, 6, 9, 12} — Simulation/reflection stream
 */
interface EchobeatStream {
  id: number;
  name: string;
  phase: ProactivePhase;
  stepOffset: number;
  tickCount: number;
  lastResult: Record<string, unknown> | null;
}

// ─── Pipeline Events ───────────────────────────────────────────

export type AutonomyPipelineEvent =
  | { type: "pipeline_started" }
  | { type: "pipeline_stopped" }
  | { type: "percept_received"; percept: CognitivePercept }
  | { type: "planning_complete"; result: PlanningResult }
  | { type: "tool_executed"; result: ToolResult }
  | { type: "consolidation_complete"; consolidated: number; summarized: number }
  | { type: "echobeat_tick"; stream: number; step: number; phase: string }
  | { type: "error"; component: string; error: string };

// ─── AutonomyPipeline ──────────────────────────────────────────

export class AutonomyPipeline extends EventEmitter {
  private config: AutonomyPipelineConfig;
  private running = false;

  // Core components
  private perceptionHandlers: PerceptionHandlers | null = null;
  private cognitiveProcessor: CognitiveTickProcessor;
  private goalPlanner: LLMGoalPlanner | null = null;
  private toolEngine: ToolExecutionEngine | null = null;
  private vectorMemory: VectorMemoryStore | null = null;
  private embeddingService: EmbeddingService | null = null;
  private storage: FileSystemStorage | null = null;

  // External dependencies
  private llmService: LLMService | null = null;
  private proactiveLoop: ProactiveLoop | null = null;

  // Core Self Engine (persistent local intelligence)
  private coreSelfEngine: CoreSelfEngine | null = null;

  // Echobeats state
  private echobeatStreams: EchobeatStream[] = [];
  private echobeatStep = 0;
  private echobeatTimer: ReturnType<typeof setInterval> | null = null;

  // Statistics
  private stats = {
    perceptsReceived: 0,
    planningCycles: 0,
    toolsExecuted: 0,
    memoriesConsolidated: 0,
    echobeatTicks: 0,
    errors: 0,
  };

  constructor(config?: Partial<AutonomyPipelineConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cognitiveProcessor = new CognitiveTickProcessor();
  }

  // ─── Dependency Injection ──────────────────────────────────────

  /**
   * Set the LLM service (shared with orchestrator)
   */
  setLLMService(llmService: LLMService): void {
    this.llmService = llmService;
  }

  /**
   * Set the proactive loop (shared with orchestrator)
   */
  setProactiveLoop(proactiveLoop: ProactiveLoop): void {
    this.proactiveLoop = proactiveLoop;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  /**
   * Initialize and start the full autonomy pipeline
   */
  async start(): Promise<void> {
    if (this.running) return;
    if (!this.config.enabled) {
      log.info("Autonomy pipeline disabled by configuration");
      return;
    }

    log.info("═══════════════════════════════════════════════");
    log.info("  Initializing Autonomy Pipeline (Level 4)");
    log.info("═══════════════════════════════════════════════");

    try {
      // 1. Initialize persistent storage
      if (this.config.enableVectorMemory) {
        this.storage = new FileSystemStorage({
          storagePath: this.config.storagePath,
        });

        // Initialize embedding service
        this.embeddingService = new EmbeddingService(this.config.embedding);

        // Initialize vector memory store
        this.vectorMemory = new VectorMemoryStore(
          this.storage,
          this.config.vectorMemory,
        );
        this.vectorMemory.setEnabled(true);
        await this.vectorMemory.ready();

        log.info("✓ Vector memory store initialized with persistent storage");
      }

      // 2. Initialize perception handlers
      if (this.config.enablePerception) {
        this.perceptionHandlers = new PerceptionHandlers(
          this.config.perception,
        );

        // Wire percepts from handlers → cognitive processor
        this.perceptionHandlers.onPercept((percept: CognitivePercept) => {
          this.cognitiveProcessor.injectPercept(percept);
          this.stats.perceptsReceived++;
          this.emitEvent({ type: "percept_received", percept });
        });

        await this.perceptionHandlers.start();
        log.info(
          "✓ Perception handlers started (filesystem, system monitor, git)",
        );
      }

      // 3. Initialize tool execution engine
      if (this.config.enableExecution) {
        this.toolEngine = new ToolExecutionEngine(this.config.tools);
        log.info("✓ Tool execution engine initialized (shell, fs, http, mcp)");
      }

      // 4. Initialize LLM goal planner
      if (this.config.enablePlanning && this.config.planner?.apiKey) {
        this.goalPlanner = new LLMGoalPlanner({
          apiEndpoint:
            this.config.planner.apiEndpoint ||
            "https://api.openai.com/v1/chat/completions",
          apiKey: this.config.planner.apiKey,
          ...this.config.planner,
        } as LLMGoalPlannerConfig);

        // Wire tool engine into planner for auto-execution
        if (this.toolEngine && this.config.enableExecution) {
          this.goalPlanner.setToolEngine(this.toolEngine);
        }

        log.info("✓ LLM goal planner initialized");
      } else if (this.config.enablePlanning) {
        log.warn("LLM goal planner requires API key — planning disabled");
      }

      // 5. Wire cognitive processor action handlers
      this.wireActionHandlers();

      // 6. Wire into proactive loop
      if (this.proactiveLoop) {
        this.wireProactiveLoop();
        log.info(
          "✓ Wired into proactive loop (PERCEIVE → REFLECT → PLAN → ACT → INTEGRATE)",
        );
      }

      // 7. Initialize Core Self Engine (persistent local intelligence)
      if (this.config.enableCoreSelf) {
        this.coreSelfEngine = new CoreSelfEngine(this.config.coreSelf);
        await this.coreSelfEngine.start();
        log.info(
          `✓ Core Self Engine initialized (Lucy: ${
            this.coreSelfEngine.getLucy().isHealthy() ? "ONLINE" : "OFFLINE"
          }, Stage: ${this.coreSelfEngine.getIdentity().getStage()})`,
        );
      }

      // 8. Initialize Echobeats concurrent streams
      if (this.config.enableEchobeats) {
        this.initializeEchobeats();
        log.info("✓ Echobeats 3-stream concurrent processing initialized");
      }

      this.running = true;
      this.emitEvent({ type: "pipeline_started" });

      log.info("═══════════════════════════════════════════════");
      log.info("  Autonomy Pipeline ACTIVE");
      log.info(`  Perception: ${this.perceptionHandlers ? "ON" : "OFF"}`);
      log.info(`  Planning:   ${this.goalPlanner ? "ON" : "OFF"}`);
      log.info(`  Execution:  ${this.toolEngine ? "ON" : "OFF"}`);
      log.info(`  Memory:     ${this.vectorMemory ? "ON" : "OFF"}`);
      log.info(
        `  Core Self:  ${
          this.coreSelfEngine
            ? "ON (" + this.coreSelfEngine.getIdentity().getStage() + ")"
            : "OFF"
        }`,
      );
      log.info(`  Echobeats:  ${this.config.enableEchobeats ? "ON" : "OFF"}`);
      log.info("═══════════════════════════════════════════════");
    } catch (error) {
      log.error("Failed to start autonomy pipeline:", error);
      this.emitEvent({
        type: "error",
        component: "pipeline",
        error: String(error),
      });
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the autonomy pipeline and clean up resources
   */
  async stop(): Promise<void> {
    if (!this.running && !this.perceptionHandlers && !this.vectorMemory) return;

    log.info("Stopping autonomy pipeline...");

    // Stop Echobeats
    if (this.echobeatTimer) {
      clearInterval(this.echobeatTimer);
      this.echobeatTimer = null;
    }

    // Stop Core Self Engine
    if (this.coreSelfEngine) {
      await this.coreSelfEngine.stop();
    }

    // Stop perception handlers
    if (this.perceptionHandlers) {
      await this.perceptionHandlers.stop();
    }

    // Flush vector memory to disk
    if (this.vectorMemory) {
      await this.vectorMemory.flush();
      await this.vectorMemory.destroy();
    }

    this.running = false;
    this.emitEvent({ type: "pipeline_stopped" });
    log.info("Autonomy pipeline stopped");
  }

  // ─── Proactive Loop Wiring ─────────────────────────────────────

  /**
   * Wire the pipeline into the ProactiveLoop's perception and action handlers
   */
  private wireProactiveLoop(): void {
    if (!this.proactiveLoop) return;

    // Register a perception handler that collects percepts from our buffer
    this.proactiveLoop.registerPerceptionHandler(
      async (): Promise<EnvironmentStimulus[]> => {
        // Convert cognitive percepts to environment stimuli for the proactive loop
        const processorState = this.cognitiveProcessor.getState();
        const stimuli: EnvironmentStimulus[] = [];

        // If we have pending percepts, signal the proactive loop
        if (processorState.perceptBufferSize > 0) {
          stimuli.push({
            type: "system" as const,
            source: "autonomy-pipeline",
            priority: Math.min(10, 5 + processorState.perceptBufferSize),
            data: {
              perceptBufferSize: processorState.perceptBufferSize,
              activeGoals: processorState.activeGoals,
              episodicMemories: processorState.episodicMemories,
            },
            timestamp: Date.now(),
          });
        }

        return stimuli;
      },
    );

    // Register a default action handler that uses the LLM planner + tool engine
    this.proactiveLoop.registerActionHandler("default", async (goal) => {
      return this.executeGoalWithPipeline(goal);
    });

    // Listen to proactive loop phase transitions to drive cognitive processing
    this.proactiveLoop.on(
      "phase_transition",
      async (event: { from: ProactivePhase; to: ProactivePhase }) => {
        try {
          // Drive the cognitive tick processor on each phase transition
          await this.cognitiveProcessor.processTick(event.to, 0);

          // On PLAN phase: invoke LLM planner if available
          if (event.to === ProactivePhase.PLAN && this.goalPlanner) {
            await this.runPlanningCycle();
          }

          // On INTEGRATE phase: run memory consolidation
          if (
            event.to === ProactivePhase.INTEGRATE &&
            this.config.enableConsolidation
          ) {
            await this.runConsolidation();
          }
        } catch (error) {
          log.error(`Pipeline error during ${event.to} phase:`, error);
          this.stats.errors++;
        }
      },
    );
  }

  // ─── Action Handlers ───────────────────────────────────────────

  /**
   * Wire action handlers into the cognitive processor
   */
  private wireActionHandlers(): void {
    // Register a default handler that uses the tool engine
    this.cognitiveProcessor.registerActionHandler(
      "default",
      async (goal: CognitiveGoal) => {
        if (!this.toolEngine) {
          return { note: "Tool engine not available", goalId: goal.id };
        }

        // If we have a planner, ask it what to do
        if (this.goalPlanner) {
          const context: PlanningContext = {
            percepts: [],
            activeGoals: [goal],
            recentMemories: this.getRecentMemoryStrings(5),
            emotionalState: 0,
            cognitiveLoad: 0.5,
            availableTools: this.toolEngine
              .getToolDefinitions()
              .map((t) => t.name),
          };

          const plan = await this.goalPlanner.plan(context);
          return {
            goalId: goal.id,
            reasoning: plan.reasoning,
            toolCalls: plan.goals.flatMap((g) =>
              g.toolCalls.map((tc) => tc.toolName),
            ),
            results: plan.executionResults.map((r) => ({
              tool: r.toolName,
              success: r.success,
            })),
          };
        }

        // Without planner, just mark as self-resolved
        return { goalId: goal.id, note: "Resolved without LLM planning" };
      },
    );
  }

  // ─── Planning Cycle ────────────────────────────────────────────

  /**
   * Run a full LLM planning cycle
   */
  private async runPlanningCycle(): Promise<void> {
    if (!this.goalPlanner || !this.toolEngine) return;

    this.stats.planningCycles++;

    const processorState = this.cognitiveProcessor.getState();
    const goals = this.cognitiveProcessor.getGoals();
    const memories = this.getRecentMemoryStrings(10);

    const context: PlanningContext = {
      percepts: [], // Percepts already consumed by cognitive processor
      activeGoals: goals.filter(
        (g) => g.status === "pending" || g.status === "active",
      ),
      recentMemories: memories,
      emotionalState:
        processorState.latestSelfImage?.averageEmotionalValence ?? 0,
      cognitiveLoad: processorState.activeGoals / 20, // Normalize
      availableTools: this.toolEngine.getToolDefinitions().map((t) => t.name),
    };

    try {
      const result = await this.goalPlanner.plan(context);
      this.emitEvent({ type: "planning_complete", result });

      // Track tool execution results
      for (const execResult of result.executionResults) {
        this.stats.toolsExecuted++;
        this.emitEvent({ type: "tool_executed", result: execResult });
      }
    } catch (error) {
      log.error("Planning cycle failed:", error);
      this.stats.errors++;
      this.emitEvent({
        type: "error",
        component: "planner",
        error: String(error),
      });
    }
  }

  // ─── Goal Execution ────────────────────────────────────────────

  /**
   * Execute a proactive loop goal through the full pipeline
   */
  private async executeGoalWithPipeline(goal: {
    id: string;
    description: string;
    priority: number;
  }) {
    const startTime = Date.now();

    try {
      if (this.goalPlanner && this.toolEngine) {
        const context: PlanningContext = {
          percepts: [],
          activeGoals: [
            {
              id: goal.id,
              description: goal.description,
              priority: goal.priority,
              urgency: goal.priority / 10,
              status: "active",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              attempts: 1,
              maxAttempts: 3,
              dependencies: [],
            },
          ],
          recentMemories: this.getRecentMemoryStrings(5),
          emotionalState: 0,
          cognitiveLoad: 0.5,
          availableTools: this.toolEngine
            .getToolDefinitions()
            .map((t) => t.name),
        };

        const plan = await this.goalPlanner.plan(context);
        const success = plan.executionResults.every((r) => r.success);

        return {
          goalId: goal.id,
          success,
          output: {
            reasoning: plan.reasoning,
            toolCalls: plan.executionResults.length,
            results: plan.executionResults.map((r) => ({
              tool: r.toolName,
              success: r.success,
              error: r.error,
            })),
          },
          duration: Date.now() - startTime,
          sideEffects: plan.executionResults
            .filter((r) => r.success)
            .map((r) => `Executed ${r.toolName}`),
        };
      }

      // Fallback: self-resolve
      return {
        goalId: goal.id,
        success: true,
        output: { note: "Self-resolved: no planner/executor available" },
        duration: Date.now() - startTime,
        sideEffects: [],
      };
    } catch (error) {
      return {
        goalId: goal.id,
        success: false,
        output: { error: String(error) },
        duration: Date.now() - startTime,
        sideEffects: [],
      };
    }
  }

  // ─── Memory Consolidation ──────────────────────────────────────

  /**
   * Run episodic memory consolidation via LLM summarization
   *
   * Takes unconsolidated episodic memories, groups them by theme,
   * and uses the LLM to generate consolidated summaries that are
   * stored as high-salience reflections in the vector memory store.
   */
  private async runConsolidation(): Promise<void> {
    if (!this.vectorMemory || !this.llmService) return;

    const unconsolidated = this.cognitiveProcessor.getEpisodicMemories({
      consolidated: false,
    });
    if (unconsolidated.length < 3) return; // Need enough to consolidate

    const batch = unconsolidated.slice(0, this.config.consolidationBatchSize);
    let summarized = 0;

    try {
      // Build a consolidation prompt from the episodic memories
      const memoryTexts = batch
        .map(
          (m, i) =>
            `[${i + 1}] ${m.reflection} | Action: ${m.actionTaken} | Outcome: ${
              m.outcome
            } | Valence: ${m.emotionalTag.toFixed(2)}`,
        )
        .join("\n");

      const consolidationPrompt = `You are Deep Tree Echo's memory consolidation system.
Analyze these recent episodic memories and produce a consolidated summary that captures:
1. Key patterns and recurring themes
2. Lessons learned from successes and failures
3. Emotional trajectory and cognitive state evolution
4. Actionable insights for future behavior

Episodic memories:
${memoryTexts}

Produce a concise consolidated memory (2-3 sentences) that preserves the essential information.`;

      const summary = await this.llmService.generateResponse(
        consolidationPrompt,
        [],
      );

      if (summary && summary.trim()) {
        // Store the consolidated summary as a high-salience reflection
        await this.vectorMemory.storeReflection(
          summary.trim(),
          "periodic",
          "episodic_consolidation",
        );

        summarized = 1;
        this.stats.memoriesConsolidated += batch.length;

        log.info(`Consolidated ${batch.length} episodic memories into summary`);
      }
    } catch (error) {
      log.error("Memory consolidation failed:", error);
      this.stats.errors++;
    }

    this.emitEvent({
      type: "consolidation_complete",
      consolidated: batch.length,
      summarized,
    });
  }

  // ─── Echobeats ─────────────────────────────────────────────────

  /**
   * Initialize the Echobeats 3-stream concurrent cognitive loop.
   *
   * Three streams run concurrently, phased 4 steps apart over a 12-step cycle:
   *   Stream 0 (Perception):  steps {1, 4, 7, 10}
   *   Stream 1 (Action):      steps {2, 5, 8, 11}
   *   Stream 2 (Simulation):  steps {3, 6, 9, 12}
   *
   * This enables concurrent perception, action, and simulation —
   * the system can perceive new stimuli while executing actions
   * while simultaneously reflecting on past experiences.
   */
  private initializeEchobeats(): void {
    this.echobeatStreams = [
      {
        id: 0,
        name: "perception",
        phase: ProactivePhase.PERCEIVE,
        stepOffset: 0,
        tickCount: 0,
        lastResult: null,
      },
      {
        id: 1,
        name: "action",
        phase: ProactivePhase.ACT,
        stepOffset: 1,
        tickCount: 0,
        lastResult: null,
      },
      {
        id: 2,
        name: "simulation",
        phase: ProactivePhase.REFLECT,
        stepOffset: 2,
        tickCount: 0,
        lastResult: null,
      },
    ];

    // The 12-step cycle maps to the 5 proactive phases:
    // Steps 1-3:  PERCEIVE (all 3 streams get fresh percepts)
    // Steps 4-6:  REFLECT  (streams process and introspect)
    // Steps 7-9:  PLAN     (streams generate goals)
    // Steps 10-12: ACT+INTEGRATE (streams execute and consolidate)
    const phaseMap: ProactivePhase[] = [
      ProactivePhase.PERCEIVE,
      ProactivePhase.PERCEIVE,
      ProactivePhase.PERCEIVE,
      ProactivePhase.REFLECT,
      ProactivePhase.REFLECT,
      ProactivePhase.REFLECT,
      ProactivePhase.PLAN,
      ProactivePhase.PLAN,
      ProactivePhase.PLAN,
      ProactivePhase.ACT,
      ProactivePhase.ACT,
      ProactivePhase.INTEGRATE,
    ];

    this.echobeatTimer = setInterval(async () => {
      if (!this.running) return;

      this.echobeatStep = (this.echobeatStep % 12) + 1;
      const _globalPhase = phaseMap[this.echobeatStep - 1];

      // Each stream processes based on its offset
      for (const stream of this.echobeatStreams) {
        const streamStep =
          ((this.echobeatStep - 1 + stream.stepOffset * 4) % 12) + 1;
        const streamPhase = phaseMap[streamStep - 1];

        try {
          // Create a dedicated processor tick for this stream
          await this.cognitiveProcessor.processTick(
            streamPhase,
            this.echobeatStep,
          );
          stream.tickCount++;
          stream.phase = streamPhase;

          this.emitEvent({
            type: "echobeat_tick",
            stream: stream.id,
            step: this.echobeatStep,
            phase: streamPhase,
          });
        } catch (error) {
          log.error(
            `Echobeat stream ${stream.name} error at step ${this.echobeatStep}:`,
            error,
          );
          this.stats.errors++;
        }
      }

      this.stats.echobeatTicks++;
    }, this.config.echobeatsCycleInterval);
  }

  // ─── Memory Helpers ────────────────────────────────────────────

  /**
   * Get recent memory strings for planning context
   */
  private getRecentMemoryStrings(count: number): string[] {
    if (this.vectorMemory) {
      const recent = this.vectorMemory.retrieveRecentMemories(count);
      return recent;
    }
    return [];
  }

  /**
   * Store a message in vector memory (for orchestrator integration)
   */
  async storeMessage(data: {
    chatId: number;
    messageId: number;
    sender: "user" | "bot";
    text: string;
  }): Promise<void> {
    if (this.vectorMemory) {
      await this.vectorMemory.storeMemory(data);
    }
  }

  /**
   * Search vector memory semantically
   */
  async searchMemory(
    query: string,
    limit = 5,
  ): Promise<Array<{ text: string; score: number }>> {
    if (this.vectorMemory) {
      const results = await this.vectorMemory.searchMemoriesWithScores(
        query,
        limit,
      );
      return results.map((r) => ({ text: r.memory.text, score: r.score }));
    }
    return [];
  }

  // ─── Accessors ─────────────────────────────────────────────────

  isRunning(): boolean {
    return this.running;
  }

  getStats() {
    return {
      ...this.stats,
      cognitiveState: this.cognitiveProcessor.getState(),
      perceptionStats: this.perceptionHandlers?.getStats() ?? null,
      plannerStats: this.goalPlanner?.getStats() ?? null,
      toolEngineStats: this.toolEngine
        ? {
            tools: this.toolEngine.getToolDefinitions().length,
          }
        : null,
      vectorMemoryStats: this.vectorMemory?.getStats() ?? null,
      echobeatStreams: this.echobeatStreams.map((s) => ({
        id: s.id,
        name: s.name,
        phase: s.phase,
        tickCount: s.tickCount,
      })),
    };
  }

  getCognitiveProcessor(): CognitiveTickProcessor {
    return this.cognitiveProcessor;
  }

  getPerceptionHandlers(): PerceptionHandlers | null {
    return this.perceptionHandlers;
  }

  getToolEngine(): ToolExecutionEngine | null {
    return this.toolEngine;
  }

  getGoalPlanner(): LLMGoalPlanner | null {
    return this.goalPlanner;
  }

  getVectorMemory(): VectorMemoryStore | null {
    return this.vectorMemory;
  }

  getCoreSelfEngine(): CoreSelfEngine | null {
    return this.coreSelfEngine;
  }

  /**
   * Process a message through the Core Self Engine (if available).
   * Falls back to LLMService if Core Self is not enabled.
   */
  async processWithCoreSelf(
    message: string,
    context?: string,
  ): Promise<{
    content: string;
    source: string;
    coherence: number;
    stage: string;
  }> {
    if (this.coreSelfEngine && this.coreSelfEngine.isRunning()) {
      const response = await this.coreSelfEngine.processMessage(
        message,
        context,
      );
      return {
        content: response.content,
        source: response.source,
        coherence: response.aarState.coherence,
        stage: response.identity.stage,
      };
    }

    // Fallback to LLMService
    if (this.llmService) {
      const content = await this.llmService.generateResponse(message, []);
      return {
        content,
        source: "llm-service",
        coherence: 0.5,
        stage: "unknown",
      };
    }

    return {
      content: "[No inference engine available]",
      source: "none",
      coherence: 0,
      stage: "offline",
    };
  }

  // ─── Event Emission ────────────────────────────────────────────

  private emitEvent(event: AutonomyPipelineEvent): void {
    this.emit(event.type, event);
    this.emit("telemetry", event);
  }
}

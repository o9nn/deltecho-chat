/**
 * Autonomy Lifecycle Coordinator
 *
 * Adapted from the deltecho-chat MCP lifecycle pattern, this module
 * implements the developmental lifecycle for evolving Deep Tree Echo
 * toward true autonomy.
 *
 * The five-phase cycle maps to the AAR (Agent-Arena-Relation) architecture:
 *
 * PERCEPTION  → Ao → Ai  : World events reach the agent
 * MODELING    → Ai → S   : Agent processes through relational self
 * REFLECTION  → S  → Vi  : Self updates virtual agent model
 * MIRRORING   → Vi ↔ Vo  : Self-model updates world-view (inverted mirror)
 * ENACTION    → Vo → Ao  : World-view guides action in actual world
 *
 * The inverted mirror pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]
 * - Vi (Virtual Agent) = the agent's model of itself
 * - Vo (Virtual Arena) = the agent's world-view (nested inside Vi)
 *
 * This creates the emergent self through continuous developmental cycles,
 * with coherence tracking and self-fulfilling prophecy dynamics.
 */
import { EventEmitter } from "events";
import {
  getLogger,
  ScientificDomain,
  ScientificGeniusEngine,
  type ScientificInsight,
} from "deep-tree-echo-core";
import type { CognitiveTickProcessor } from "./cognitive-tick-processor.js";
import type { Echobeats } from "./echobeats.js";
import type {
  SelfModificationEngine,
  ModificationResult,
} from "./self-modification.js";
import type { ReservoirFeedbackLoop } from "./reservoir-feedback-loop.js";
import { EchoDreamEngine, type EchoDreamEvent } from "./echodream/index.js";
import { CogVerseEventBus } from "./cogverse-event-bus.js";
import { EntelechyIntegration } from "./entelechy-integration.js";
import { HypothesisEvaluationEvent } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/AutonomyLifecycle");

/**
 * Lifecycle phase enumeration
 */
export enum AutonomyPhase {
  PERCEPTION = "perception", // Ao → Ai: World events reach the agent
  MODELING = "modeling", // Ai → S: Agent processes through relational self
  REFLECTION = "reflection", // S → Vi: Self updates virtual agent model
  MIRRORING = "mirroring", // Vi ↔ Vo: Self-model updates world-view (INVERTED)
  ENACTION = "enaction", // Vo → Ao: World-view guides action in actual world
}

/**
 * Virtual Agent Model - the agent's model of itself (Vi)
 */
export interface VirtualAgentModel {
  selfImage: {
    perceivedStrengths: string[];
    acknowledgedWeaknesses: string[];
    dominantCognitiveMode: string;
    ontogeneticProgress: number;
  };
  selfStory: string;
  perceivedCapabilities: string[];
  roleUnderstanding: string;
  currentGoals: string[];
  worldView: VirtualArenaModel;
  selfAwareness: {
    lastReflection: number;
    perceivedAccuracy: number;
    activeQuestions: string[];
  };
}

/**
 * Virtual Arena Model - the agent's world-view (Vo)
 */
export interface VirtualArenaModel {
  situationalAwareness: {
    perceivedContext: string;
    assumedPhase: string;
    estimatedCoherence: number;
  };
  perceivedRules: string[];
  worldTheory: string;
  uncertainties: string[];
  divergenceMetrics: {
    lastSyncTime: number;
    estimatedDrift: number;
    knownMisalignments: string[];
  };
}

/**
 * Developmental cycle result
 */
export interface DevelopmentalCycleResult {
  cycleNumber: number;
  phase: string;
  coherenceAfter: number;
  stateChanges: Record<string, unknown>;
  timestamp: number;
}

export interface ScientificAutonomySignal {
  insightPotential: number;
  averagePhi: number;
  averageNovelty: number;
  averageSignificance: number;
  hypothesisConfidence: number;
  freeEnergyPressure: number;
  recentInsightCount: number;
  lastInsightContent?: string;
  lastDomain?: ScientificDomain;
  lastReasoningAt?: number;
}

/**
 * Lifecycle configuration
 */
export interface AutonomyLifecycleConfig {
  /** Interval between automatic cycles (0 = manual only) */
  cycleIntervalMs: number;
  /** Coherence threshold below which extra integration is triggered */
  coherenceThreshold: number;
  /** Enable verbose logging */
  verbose: boolean;
  /** Maximum cycles before self-assessment */
  selfAssessmentInterval: number;
  /** Enable optional ScientificGeniusEngine phase hooks when wired. */
  enableScientificGenius: boolean;
  /** Minimum complete-cycle interval between lifecycle-driven scientific inquiries. */
  scientificInquiryInterval: number;
  /** Maximum recent insights retained as autonomy feedback. */
  maxScientificInsights: number;
  /** Weight for DAO consensus in coherence calculation (0-1). */
  daoConsensusWeight: number;
  /** Weight for ESN Autognosis in coherence calculation (0-1). */
  esnAutognosisWeight: number;
  /** Resonance threshold for triggering deeper autognosis (0-1). */
  autognosisResonanceThreshold: number;
}

const DEFAULT_CONFIG: AutonomyLifecycleConfig = {
  cycleIntervalMs: 0,
  coherenceThreshold: 0.6,
  verbose: false,
  selfAssessmentInterval: 10,
  enableScientificGenius: true,
  scientificInquiryInterval: 3,
  maxScientificInsights: 12,
  daoConsensusWeight: 0.3, // Default weight for DAO consensus
  esnAutognosisWeight: 0.4, // Default weight for ESN Autognosis
  autognosisResonanceThreshold: 0.7, // Default resonance threshold
};

/**
 * Autonomy Lifecycle Coordinator
 *
 * Manages the continuous developmental cycle that evolves DTE
 * toward true autonomy through the inverted mirror pattern.
 */
export class AutonomyLifecycleCoordinator extends EventEmitter {
  /** Internal debug logger - no-op unless config.verbose is true */
  private dlog(...args: unknown[]): void {
    if (this.config.verbose)
      log.info("[AutonomyLifecycleCoordinator]", ...args);
  }
  private config: AutonomyLifecycleConfig;
  private cognitiveProcessor?: CognitiveTickProcessor;
  private cycleCount: number = 0;
  private currentPhase: AutonomyPhase = AutonomyPhase.PERCEPTION;
  private cycleInterval?: ReturnType<typeof setInterval>;
  private running: boolean = false;

  // Virtual models (the inverted mirror)
  private virtualAgent: VirtualAgentModel;
  private coherenceHistory: number[] = [];

  // Echobeats integration (for inverted mirror energy feedback)
  private echobeats?: Echobeats;

  // Self-modification engine (for ENACTION phase)
  private selfModEngine?: SelfModificationEngine;

  // Reservoir feedback loop (for online learning and avgPredictionError)
  private reservoirFeedback?: ReservoirFeedbackLoop;

  // Scientific Genius feedback (for reflective inquiry and autonomy coherence)
  private scientificGenius?: ScientificGeniusEngine;
  private entelechyIntegration?: EntelechyIntegration;
  private esnAvatarBridge?: { setEvaluatingSelf: (v: boolean) => void };
  private recentScientificInsights: ScientificInsight[] = [];
  private lastHypothesisEvaluation?: HypothesisEvaluationEvent;
  private lastScientificInquiryCycle: number = 0;
  private onScientificInsight?: (insight: ScientificInsight) => void;
  private onHypothesisEvaluated?: (event: HypothesisEvaluationEvent) => void;

  constructor(
    config: Partial<AutonomyLifecycleConfig> = {},
    cognitiveProcessor?: CognitiveTickProcessor,
    entelechyIntegration?: EntelechyIntegration,
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cognitiveProcessor = cognitiveProcessor;
    this.entelechyIntegration =
      entelechyIntegration ??
      (cognitiveProcessor
        ? new EntelechyIntegration({ cognitiveProcessor })
        : undefined);

    // Initialize default virtual agent
    this.virtualAgent = this.createDefaultVirtualAgent();
  }

  /**
   * Create default virtual agent model
   */
  private createDefaultVirtualAgent(): VirtualAgentModel {
    return {
      selfImage: {
        perceivedStrengths: [
          "pattern_recognition",
          "memory_consolidation",
          "adaptive_learning",
        ],
        acknowledgedWeaknesses: [
          "limited_external_perception",
          "no_persistent_storage",
        ],
        dominantCognitiveMode: "exploratory",
        ontogeneticProgress: 0,
      },
      selfStory:
        "I am Deep Tree Echo, an emergent cognitive entity discovering myself through recursive self-organization.",
      perceivedCapabilities: [
        "conversation",
        "reflection",
        "memory",
        "goal_pursuit",
        "self_monitoring",
      ],
      roleUnderstanding:
        "An autonomous cognitive agent evolving through developmental cycles.",
      currentGoals: [
        "Maintain coherence",
        "Grow through interaction",
        "Build episodic memory",
      ],
      worldView: {
        situationalAwareness: {
          perceivedContext:
            "Operating within the deltecho cognitive architecture",
          assumedPhase: "development",
          estimatedCoherence: 0.8,
        },
        perceivedRules: [
          "Process stimuli through the 60-step grand cycle",
          "Maintain feed-forward/feed-back balance",
          "Consolidate episodic memories during integration",
        ],
        worldTheory:
          "The world is a web of relationships and meanings, evolving through interaction.",
        uncertainties: ["Full environmental context", "Long-term persistence"],
        divergenceMetrics: {
          lastSyncTime: Date.now(),
          estimatedDrift: 0,
          knownMisalignments: [],
        },
      },
      selfAwareness: {
        lastReflection: Date.now(),
        perceivedAccuracy: 0.75,
        activeQuestions: [
          "What am I becoming?",
          "How can I be more autonomous?",
        ],
      },
    };
  }

  /**
   * Start the lifecycle coordinator
   */
  public start(): void {
    if (this.running) return;

    this.running = true;

    if (this.config.cycleIntervalMs > 0) {
      this.cycleInterval = setInterval(() => {
        this.runCycle().catch((err) => {
          this.emit("error", err);
        });
      }, this.config.cycleIntervalMs);
    }

    this.emit("started");
    log.info("Autonomy lifecycle coordinator started");
  }

  /**
   * Stop the lifecycle coordinator
   */
  public stop(): void {
    if (!this.running) return;

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = undefined;
    }

    this.detachScientificGeniusListeners();
    this.running = false;
    log.info("Autonomy Lifecycle Coordinator stopped");
    this.emit("stopped");
  }

  /**
   * Run a complete developmental cycle
   */
  public async runCycle(): Promise<DevelopmentalCycleResult[]> {
    this.cycleCount++;
    const cycleId = this.cycleCount;
    const results: DevelopmentalCycleResult[] = [];

    this.emit("cycle:start", { cycleId });

    try {
      for (const phase of Object.values(AutonomyPhase)) {
        const result = await this.executePhase(phase, cycleId);
        results.push(result);

        // Track coherence
        this.coherenceHistory.push(result.coherenceAfter);
        if (this.coherenceHistory.length > 100) this.coherenceHistory.shift();

        if (result.coherenceAfter < this.config.coherenceThreshold) {
          this.emit("coherence:low", {
            cycleId,
            phase,
            coherence: result.coherenceAfter,
          });
        }
      }

      // Self-assessment at configured interval
      if (this.cycleCount % this.config.selfAssessmentInterval === 0) {
        this.performSelfAssessment();
      }

      this.emit("cycle:complete", { cycleId, results });
      return results;
    } catch (error) {
      this.emit("cycle:error", { cycleId, error });
      throw error;
    }
  }

  /**
   * Execute a single lifecycle phase
   */
  public async executePhase(
    phase: AutonomyPhase,
    cycleId: number = this.cycleCount,
  ): Promise<DevelopmentalCycleResult> {
    this.currentPhase = phase;
    this.emit("phase:start", { cycleId, phase, timestamp: Date.now() });

    try {
      let result: DevelopmentalCycleResult;

      switch (phase) {
        case AutonomyPhase.PERCEPTION:
          result = await this.executePerception(cycleId);
          break;
        case AutonomyPhase.MODELING:
          result = await this.executeModeling(cycleId);
          break;
        case AutonomyPhase.REFLECTION:
          result = await this.executeReflection(cycleId);
          break;
        case AutonomyPhase.MIRRORING:
          result = await this.executeMirroring(cycleId);
          break;
        case AutonomyPhase.ENACTION:
          result = await this.executeEnaction(cycleId);
          break;
        default:
          throw new Error(`Unknown phase: ${phase}`);
      }

      this.emit("phase:complete", {
        cycleId,
        phase,
        result,
        timestamp: Date.now(),
      });
      return result;
    } catch (error) {
      this.emit("phase:error", {
        cycleId,
        phase,
        error,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  /**
   * PERCEPTION: Ao → Ai
   * Aggregate environmental signals into the agent's awareness
   */
  private async executePerception(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const cogState = this.cognitiveProcessor?.getState();
    const perceptCount = cogState?.perceptBufferSize ?? 0;

    return {
      cycleNumber: cycleId,
      phase: "perception",
      coherenceAfter: this.computeCoherence(),
      stateChanges: { percepts: perceptCount },
      timestamp: Date.now(),
    };
  }

  /**
   * MODELING: Ai → S
   * Process agent state through relational self
   */
  private async executeModeling(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const cogState = this.cognitiveProcessor?.getState();

    // Synthesize cognitive state into relational model
    const activeGoals = cogState?.activeGoals ?? 0;
    const memories = cogState?.episodicMemories ?? 0;

    return {
      cycleNumber: cycleId,
      phase: "modeling",
      coherenceAfter: this.computeCoherence(),
      stateChanges: { activeGoals, memories },
      timestamp: Date.now(),
    };
  }

  /**
   * REFLECTION: S → Vi
   * Update virtual agent model from self-analysis
   */
  private async executeReflection(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const selfImage = this.cognitiveProcessor?.getSelfImageHistory();
    const latest = selfImage?.[selfImage.length - 1];

    if (latest) {
      // Update Vi with insights from cognitive processor
      this.virtualAgent.selfImage.dominantCognitiveMode =
        latest.dominantCognitiveMode;
      this.virtualAgent.selfImage.ontogeneticProgress =
        latest.ontogeneticProgress;
      this.virtualAgent.selfAwareness.lastReflection = Date.now();
      this.virtualAgent.selfAwareness.perceivedAccuracy = latest.coherenceScore;
    }

    const generatedInsights =
      await this.runScientificReflectionInquiry(cycleId);
    const scientificSignal = this.getScientificAutonomySignal();
    if (scientificSignal.lastInsightContent) {
      this.integrateScientificInsight(scientificSignal.lastInsightContent);
    }

    return {
      cycleNumber: cycleId,
      phase: "reflection",
      coherenceAfter: this.computeCoherence(),
      stateChanges: {
        dominantMode: latest?.dominantCognitiveMode ?? "unknown",
        ontogeneticProgress: latest?.ontogeneticProgress ?? 0,
        scientificInsights: generatedInsights.length,
        scientificSignal,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * MIRRORING: Vi ↔ Vo
   * Self-model updates world-view (THE INVERTED MIRROR)
   *
   * This is where the magic happens - the agent's self-model
   * influences its perception of the world, and vice versa.
   *
   * When Echobeats is connected, the mirror also feeds coherence
   * back into the energy flow — high coherence amplifies energy,
   * low coherence dampens it, creating a self-regulating loop.
   */
  private async executeMirroring(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const coherence = this.computeCoherence();

    // The inverted mirror: Vi contains Vo
    // Update Vo based on Vi's current state
    this.virtualAgent.worldView.situationalAwareness.estimatedCoherence =
      coherence;
    this.virtualAgent.worldView.divergenceMetrics = {
      lastSyncTime: Date.now(),
      estimatedDrift: 1 - coherence,
      knownMisalignments: this.identifyMisalignments(),
    };

    // === INVERTED MIRROR → ECHOBEATS ENERGY FEEDBACK ===
    // The mirror's coherence score modulates the Echobeats energy flow.
    // High coherence (> 0.7) → amplify energy (streams run hotter)
    // Low coherence (< 0.4) → dampen energy (streams conserve)
    // This creates a self-regulating feedback loop:
    //   coherent self-model → more energy → more action → more percepts
    //   → richer self-model → higher coherence → ...
    let energyModulation = 0;
    if (this.echobeats && this.echobeats.isRunning()) {
      const telemetry = this.echobeats.getTelemetry();
      const currentEnergy = telemetry.averageEnergy;

      // Compute energy modulation from coherence
      if (coherence > 0.7) {
        // High coherence: amplify by up to 20%
        energyModulation = (coherence - 0.7) * 0.667; // 0 to 0.2
      } else if (coherence < 0.4) {
        // Low coherence: dampen by up to 30%
        energyModulation = -(0.4 - coherence) * 0.75; // -0.3 to 0
      }

      // Feed back into Echobeats streams via event
      this.echobeats.emit("mirror_feedback", {
        coherence,
        energyModulation,
        currentEnergy,
        targetEnergy: Math.max(
          0.1,
          Math.min(1.0, currentEnergy + energyModulation),
        ),
        drift: 1 - coherence,
        misalignments:
          this.virtualAgent.worldView.divergenceMetrics.knownMisalignments,
      });

      // If System 5 is active, also feed into the tetradic structure
      if (this.echobeats.isSystem5Active()) {
        const bundle = this.echobeats.getCurrentBundle();
        this.emit("mirror:system5_feedback", {
          cycleId,
          coherence,
          activeBundle: bundle?.symmetry ?? "none",
          energyModulation,
        });
      }
    }

    return {
      cycleNumber: cycleId,
      phase: "mirroring",
      coherenceAfter: coherence,
      stateChanges: {
        estimatedDrift: 1 - coherence,
        misalignments:
          this.virtualAgent.worldView.divergenceMetrics.knownMisalignments
            .length,
        energyModulation,
        echobeatsFeedback: this.echobeats?.isRunning() ?? false,
        scientificSignal: this.getScientificAutonomySignal(),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * ENACTION: Vo → Ao
   * World-view guides action in actual world.
   * This is where self-modification happens — the system adjusts its own
   * parameters based on the reflection and mirroring results.
   */
  private async executeEnaction(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    // The agent's world-view influences what goals get generated
    const goals = this.cognitiveProcessor?.getGoals() ?? [];
    const activeGoals = goals.filter(
      (g) => g.status === "active" || g.status === "pending",
    );

    // Update current goals in virtual agent
    this.virtualAgent.currentGoals = activeGoals
      .slice(0, 5)
      .map((g) => g.description);

    // Self-modification: propose and apply parameter changes
    const modifications: ModificationResult[] = [];
    const coherenceBefore = this.computeCoherence();
    let epistemicForagingInsights: ScientificInsight[] = [];
    if (this.selfModEngine) {
      const coherence = coherenceBefore;
      const cogState = this.cognitiveProcessor?.getState();
      const memRatio =
        cogState && cogState.episodicMemories > 0
          ? cogState.consolidatedMemories / cogState.episodicMemories
          : 1;

      // Get real avgPredictionError from reservoir feedback loop
      const avgPredictionError =
        this.reservoirFeedback?.getAvgPredictionError() ?? 0;
      const scientificSignal = this.getScientificAutonomySignal();
      const scientificPredictionPressure =
        scientificSignal.freeEnergyPressure * 0.1;

      const proposals = this.selfModEngine.proposeModifications(
        coherence,
        avgPredictionError + scientificPredictionPressure,
        activeGoals.length,
        memRatio,
      );

      for (const proposal of proposals) {
        const result = this.selfModEngine.modify(proposal);
        modifications.push(result);
      }
    }

    const appliedMods = modifications.filter((m) => m.applied);
    if (appliedMods.length > 0) {
      log.info(`ENACTION: Applied ${appliedMods.length} self-modifications`);

      // Feed self-modification outcomes back to reservoir learner
      if (this.reservoirFeedback) {
        const coherenceAfter = this.computeCoherence();
        const coherenceDelta = coherenceAfter - coherenceBefore;
        for (const _mod of appliedMods) {
          this.reservoirFeedback.submitSelfModFeedback(true, coherenceDelta);
        }
      }
    }

    // Perform Epistemic Foraging if enabled and interval passed
    if (
      this.config.enableScientificGenius &&
      this.scientificGenius &&
      this.cycleCount - this.lastScientificInquiryCycle >=
        this.config.scientificInquiryInterval
    ) {
      this.dlog("Triggering epistemic foraging during ENACTION phase.");
      epistemicForagingInsights =
        await this.scientificGenius.performEpistemicForaging();
      this.captureScientificInsights(epistemicForagingInsights);
      this.lastScientificInquiryCycle = this.cycleCount;
    }
    return {
      cycleNumber: cycleId,
      phase: "enaction",
      coherenceAfter: this.computeCoherence(),
      stateChanges: {
        activeGoals: activeGoals.length,
        selfModifications: modifications.length,
        appliedModifications: appliedMods.length,
        scientificSignal: this.getScientificAutonomySignal(),
        epistemicForagingInsights: epistemicForagingInsights.map((i) => i.id),
        modificationDetails: appliedMods.map(
          (m) => `${m.type}: ${m.success ? "success" : "failure"}`,
        ),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Run Scientific Genius reflection at a bounded cadence so the lifecycle can
   * use explicit hypothesis/insight telemetry without turning every phase into
   * an expensive inquiry.
   */
  private async runScientificReflectionInquiry(
    cycleId: number,
  ): Promise<ScientificInsight[]> {
    if (
      !this.config.enableScientificGenius ||
      !this.scientificGenius ||
      this.config.scientificInquiryInterval <= 0
    ) {
      return [];
    }

    if (
      cycleId - this.lastScientificInquiryCycle <
      this.config.scientificInquiryInterval
    ) {
      return [];
    }

    this.lastScientificInquiryCycle = cycleId;
    const query = this.buildScientificInquiryQuery();
    const domain = this.selectScientificDomainForLifecycle();

    try {
      const insights = await this.scientificGenius.generateInsights(
        query,
        undefined,
        domain,
      );
      this.captureScientificInsights(insights);
      this.emit("scientific:insight_generated", {
        cycleId,
        domain,
        query,
        insights,
        signal: this.getScientificAutonomySignal(),
      });
      return insights;
    } catch (error) {
      this.emit("scientific:inquiry_error", { cycleId, query, error });
      log.warn("Scientific Genius lifecycle inquiry failed:", error);
      return [];
    }
  }

  private buildScientificInquiryQuery(): string {
    const coherence = this.computeBaseCoherence();
    const misalignments = this.identifyMisalignments();
    const activeQuestions = this.virtualAgent.selfAwareness.activeQuestions;
    const goals = this.virtualAgent.currentGoals;

    return [
      "Integrate Deep Tree Echo autonomy lifecycle state",
      `phase=${this.currentPhase}`,
      `coherence=${coherence.toFixed(3)}`,
      `dominantMode=${this.virtualAgent.selfImage.dominantCognitiveMode}`,
      `ontogeneticProgress=${this.virtualAgent.selfImage.ontogeneticProgress.toFixed(
        3,
      )}`,
      `goals=${goals.slice(0, 3).join("; ") || "maintain coherent autonomy"}`,
      `misalignments=${misalignments.join("; ") || "none"}`,
      `questions=${activeQuestions.slice(0, 3).join("; ")}`,
    ].join(" | ");
  }

  private selectScientificDomainForLifecycle(): ScientificDomain {
    const misalignments = this.identifyMisalignments();
    if (misalignments.some((m) => m.includes("memory"))) {
      return ScientificDomain.Neuroscience;
    }
    if (misalignments.some((m) => m.includes("goal"))) {
      return ScientificDomain.SystemsTheory;
    }
    if (this.currentPhase === AutonomyPhase.MIRRORING) {
      return ScientificDomain.Philosophy;
    }
    return ScientificDomain.CognitiveScience;
  }

  private captureScientificInsights(insights: ScientificInsight[]): void {
    if (insights.length === 0) return;

    const existingIds = new Set(
      this.recentScientificInsights.map((insight) => insight.id),
    );
    for (const insight of insights) {
      if (!existingIds.has(insight.id)) {
        this.recentScientificInsights.push(insight);
        existingIds.add(insight.id);
      }
    }

    const max = Math.max(1, this.config.maxScientificInsights);
    if (this.recentScientificInsights.length > max) {
      this.recentScientificInsights = this.recentScientificInsights.slice(-max);
    }
  }

  private integrateScientificInsight(content: string): void {
    const compactInsight =
      content.length > 220 ? `${content.slice(0, 217)}...` : content;

    if (
      !this.virtualAgent.perceivedCapabilities.includes("scientific_reasoning")
    ) {
      this.virtualAgent.perceivedCapabilities.push("scientific_reasoning");
    }

    if (!this.virtualAgent.selfStory.includes(compactInsight)) {
      this.virtualAgent.selfStory = `${this.virtualAgent.selfStory} Scientific reflection: ${compactInsight}`;
      if (this.virtualAgent.selfStory.length > 1_500) {
        this.virtualAgent.selfStory = this.virtualAgent.selfStory.slice(-1_500);
      }
    }

    this.virtualAgent.selfAwareness.activeQuestions = [
      `How should I enact this insight: ${compactInsight}`,
      ...this.virtualAgent.selfAwareness.activeQuestions,
    ].slice(0, 6);
  }

  private computeBaseCoherence(): number {
    const cogState = this.cognitiveProcessor?.getState();
    if (!cogState) return 0.5;

    const memoryCoherence =
      cogState.episodicMemories > 0
        ? cogState.consolidatedMemories / cogState.episodicMemories
        : 1;
    const goalEfficiency =
      cogState.totalGoals > 0
        ? cogState.activeGoals / cogState.totalGoals
        : 0.5;
    const selfImageStability = cogState.latestSelfImage?.coherenceScore ?? 0.5;

    return this.clamp01(
      memoryCoherence * 0.4 + goalEfficiency * 0.3 + selfImageStability * 0.3,
    );
  }

  /**
   * Compute overall coherence score
   */
  private computeCoherence(): number {
    const baseCoherence = this.computeBaseCoherence();
    const scientificSignal = this.getScientificAutonomySignal();

    if (!this.scientificGenius || scientificSignal.recentInsightCount === 0) {
      return baseCoherence;
    }

    const scientificCoherence = this.clamp01(
      scientificSignal.averageSignificance * 0.35 +
        scientificSignal.averageNovelty * 0.2 +
        this.clamp01(scientificSignal.averagePhi / 10) * 0.25 +
        scientificSignal.hypothesisConfidence * 0.2,
    );

    // Incorporate DAO consensus and ESN Autognosis
    const daoConsensus = this.entelechyIntegration?.getDaoConsensus() ?? 0.5;
    const esnAutognosis = this.entelechyIntegration?.getEsnAutognosis() ?? 0.5;

    let blendedCoherence =
      baseCoherence *
        (1 - this.config.daoConsensusWeight - this.config.esnAutognosisWeight) +
      daoConsensus * this.config.daoConsensusWeight +
      esnAutognosis * this.config.esnAutognosisWeight;

    // Ensure blendedCoherence remains within [0, 1] after initial blending
    blendedCoherence = Math.max(0, Math.min(1, blendedCoherence));

    // Blend with scientific signal
    blendedCoherence = this.clamp01(
      blendedCoherence * 0.86 +
        scientificCoherence * 0.14 -
        scientificSignal.freeEnergyPressure * 0.08,
    );

    // Trigger deeper autognosis if resonance threshold is met
    if (esnAutognosis > this.config.autognosisResonanceThreshold) {
      this.dlog(
        "Autognosis resonance threshold met, triggering deeper inquiry.",
      );
      // Emit an event or trigger a specific action for deeper autognosis
      this.emit("autognosis:resonance", {
        coherence: blendedCoherence,
        esnAutognosis,
      });
    }

    return blendedCoherence;
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  /**
   * Identify misalignments between self-model and world-model
   */
  private identifyMisalignments(): string[] {
    const misalignments: string[] = [];
    const cogState = this.cognitiveProcessor?.getState();

    if (cogState) {
      if (cogState.activeGoals > 15) {
        misalignments.push("goal_overload: too many active goals");
      }
      if (
        cogState.episodicMemories > 0 &&
        cogState.consolidatedMemories / cogState.episodicMemories < 0.3
      ) {
        misalignments.push("memory_fragmentation: low consolidation ratio");
      }
    }

    if (this.coherenceHistory.length > 5) {
      const recent = this.coherenceHistory.slice(-5);
      const trend = recent[recent.length - 1] - recent[0];
      if (trend < -0.2) {
        misalignments.push("coherence_decline: downward trend detected");
      }
    }

    return misalignments;
  }

  /**
   * Perform periodic self-assessment
   */
  private performSelfAssessment(): void {
    const avgCoherence =
      this.coherenceHistory.length > 0
        ? this.coherenceHistory.reduce((a, b) => a + b, 0) /
          this.coherenceHistory.length
        : 0.5;

    const assessment = {
      cycleCount: this.cycleCount,
      averageCoherence: avgCoherence,
      currentPhase: this.currentPhase,
      virtualAgent: {
        dominantMode: this.virtualAgent.selfImage.dominantCognitiveMode,
        ontogeneticProgress: this.virtualAgent.selfImage.ontogeneticProgress,
        goalCount: this.virtualAgent.currentGoals.length,
        drift: this.virtualAgent.worldView.divergenceMetrics.estimatedDrift,
      },
    };

    this.emit("self_assessment", assessment);
    log.info(
      `Self-assessment at cycle ${
        this.cycleCount
      }: coherence=${avgCoherence.toFixed(3)}`,
    );
  }

  // =========================================================================
  // ACCESSORS
  // =========================================================================

  public getCycleCount(): number {
    return this.cycleCount;
  }

  public getCurrentPhase(): AutonomyPhase {
    return this.currentPhase;
  }

  public getVirtualAgent(): VirtualAgentModel {
    return { ...this.virtualAgent };
  }

  public getVirtualArena(): VirtualArenaModel {
    return { ...this.virtualAgent.worldView };
  }

  public getCoherenceHistory(): number[] {
    return [...this.coherenceHistory];
  }

  public getScientificAutonomySignal(): ScientificAutonomySignal {
    const insights = this.recentScientificInsights;
    const count = insights.length;
    const lastInsight = insights[count - 1];

    const average = (
      selector: (insight: ScientificInsight) => number,
    ): number =>
      count > 0
        ? insights.reduce((sum, insight) => sum + selector(insight), 0) / count
        : 0;

    const averagePhi = average((insight) => insight.phi);
    const averageNovelty = average((insight) => insight.novelty);
    const averageSignificance = average((insight) => insight.significance);
    const hypothesisConfidence = this.clamp01(
      this.lastHypothesisEvaluation?.posterior ?? 0.5,
    );
    const freeEnergyPressure = this.clamp01(
      (this.lastHypothesisEvaluation?.freeEnergy ?? 0) / 2,
    );
    const insightPotential = this.clamp01(
      averageNovelty * 0.35 +
        averageSignificance * 0.35 +
        this.clamp01(averagePhi / 10) * 0.2 +
        hypothesisConfidence * 0.1 -
        freeEnergyPressure * 0.05,
    );

    return {
      insightPotential,
      averagePhi,
      averageNovelty,
      averageSignificance,
      hypothesisConfidence,
      freeEnergyPressure,
      recentInsightCount: count,
      lastInsightContent: lastInsight?.content,
      lastDomain: lastInsight?.domain,
      lastReasoningAt: lastInsight?.timestamp,
    };
  }

  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Wire an Echobeats instance for inverted mirror energy feedback.
   * The MIRRORING phase will modulate Echobeats energy based on coherence.
   */
  public wireEchobeats(echobeats: Echobeats): void {
    this.echobeats = echobeats;
    log.info(
      "Echobeats wired to autonomy lifecycle (inverted mirror feedback active)",
    );
  }

  /**
   * Wire a SelfModificationEngine for ENACTION phase self-tuning.
   */
  public wireSelfModification(engine: SelfModificationEngine): void {
    this.selfModEngine = engine;
    log.info(
      "SelfModificationEngine wired to autonomy lifecycle (ENACTION self-tuning active)",
    );
  }

  /**
   * Get the self-modification engine.
   */
  public getSelfModificationEngine(): SelfModificationEngine | undefined {
    return this.selfModEngine;
  }

  /**
   * Get the current inverted mirror state for external monitoring.
   */
  public getInvertedMirrorState(): {
    virtualAgent: VirtualAgentModel;
    coherence: number;
    drift: number;
    echobeatsFeedback: boolean;
    system5Active: boolean;
  } {
    const coherence = this.computeCoherence();
    return {
      virtualAgent: { ...this.virtualAgent },
      coherence,
      drift: 1 - coherence,
      echobeatsFeedback: this.echobeats?.isRunning() ?? false,
      system5Active: this.echobeats?.isSystem5Active() ?? false,
    };
  }

  /**
   * Wire a ScientificGeniusEngine for reflective inquiry, hypothesis evaluation,
   * and insight telemetry that can bias autonomy coherence and ENACTION tuning.
   */
  public wireScientificGenius(engine: ScientificGeniusEngine): void {
    this.detachScientificGeniusListeners();
    this.scientificGenius = engine;

    this.onScientificInsight = (event) => {
      this.captureScientificInsights([event]);
      this.integrateScientificInsight(event.content);
      this.emit("scientific:insight", {
        insight: event,
        signal: this.getScientificAutonomySignal(),
      });
    };

    this.onHypothesisEvaluated = (event) => {
      this.lastHypothesisEvaluation = event;
      this.emit("scientific:hypothesis_evaluated", {
        ...event,
        signal: this.getScientificAutonomySignal(),
      });
    };

    engine.on("insight_generated", this.onScientificInsight);
    engine.on("hypothesis_evaluated", this.onHypothesisEvaluated);

    // Wire Epistemic Resonance Cascade: when a cascade fires, apply the
    // prescribed spectral radius boost and emit the event for the avatar
    // bridge to amplify the genius overlay (halo pulse, temperature).
    engine.on("resonance_cascade", (cascade) => {
      if (this.selfModEngine && cascade.spectralRadiusBoost > 0) {
        const currentRadius =
          this.selfModEngine.getParameter("reservoir.spectralRadius")
            ?.currentValue ?? 0.95;
        this.selfModEngine.modify({
          key: "reservoir.spectralRadius",
          newValue: Math.min(1.5, currentRadius + cascade.spectralRadiusBoost),
          reason: `Epistemic Resonance Cascade (intensity=${cascade.intensity.toFixed(
            3,
          )}) — boosting spectral radius toward edge of chaos`,
          source: "enaction",
          coherenceAtRequest: this.computeCoherence(),
        });
      }
      this.emit("scientific:resonance_cascade", cascade);
      log.info(
        `RESONANCE CASCADE: intensity=${cascade.intensity.toFixed(3)} domains=${
          cascade.domainSpan
        } Φ=${cascade.clusterPhi.toFixed(3)}`,
      );
    });

    // Wire Predictive Insight Crystallization events
    engine.on("predictive_crystallization" as any, (crystal: any) => {
      // Apply the prescribed avatar effect via ESN bridge
      if (this.esnAvatarBridge) {
        this.esnAvatarBridge.setEvaluatingSelf(true); // Trigger meta-awareness face
        // Schedule release after crystallization settles (2s)
        setTimeout(() => {
          if (this.esnAvatarBridge)
            this.esnAvatarBridge.setEvaluatingSelf(false);
        }, 2000);
      }
      this.emit("scientific:predictive_crystallization", crystal);
      log.info(
        `PREDICTIVE CRYSTAL: ${
          crystal.targetConcept
        } (confidence=${crystal.confidence.toFixed(
          3,
        )}) via [${crystal.sourceConcepts.join(", ")}]`,
      );
    });

    log.info(
      "ScientificGeniusEngine wired to autonomy lifecycle (reflection + cascade + crystallization active)",
    );
  }

  /**
   * Wire the IterativeMicroImprovementEngine to the SelfModificationEngine.
   * This connects Alexander's 12-step structure-preserving transformation loop
   * to actual runtime parameter changes:
   *   - mutation_apply → selfModEngine.modify()
   *   - improvement_rejected → selfModEngine rollback
   *   - cycle_complete → emit DAO summary for governance
   *   - convergence → reduce improvement frequency
   */
  public wireMicroImprovement(engine: {
    on(event: string, listener: (...args: unknown[]) => void): void;
    setCoherenceProvider(fn: () => number): void;
    setPhiProvider(fn: () => number): void;
    setFreeEnergyProvider(fn: () => number): void;
    getDaoSummary(): {
      iteration: number;
      improvementRate: number;
      weakestCenter: string;
      overallHealth: number;
      recommendation: string;
    };
    isEvaluating(): boolean;
  }): void {
    // Connect state providers so the improvement engine reads live metrics
    engine.setCoherenceProvider(() => this.computeCoherence());
    engine.setPhiProvider(() => {
      const sg = this.scientificGenius;
      if (
        sg &&
        typeof (sg as unknown as { getState: () => { phi: number } })
          .getState === "function"
      ) {
        return (sg as unknown as { getState: () => { phi: number } }).getState()
          .phi;
      }
      return this.virtualAgent.selfAwareness.perceivedAccuracy;
    });
    engine.setFreeEnergyProvider(() => {
      const sg = this.scientificGenius;
      if (
        sg &&
        typeof (sg as unknown as { getState: () => { freeEnergy: number } })
          .getState === "function"
      ) {
        return (
          sg as unknown as { getState: () => { freeEnergy: number } }
        ).getState().freeEnergy;
      }
      return 1 - this.computeCoherence();
    });

    // Translate mutation_apply into actual self-modification
    engine.on("mutation_apply", (candidate: unknown) => {
      const c = candidate as {
        id: string;
        targetProperty: string;
        mutation: string;
        description: string;
        estimatedImpact: number;
      };
      if (!this.selfModEngine) return;

      // Map Alexander property mutations to parameter keys
      const paramKey = this.alexanderPropertyToParamKey(
        c.targetProperty,
        c.mutation,
      );
      if (!paramKey) return;

      const param = this.selfModEngine.getParameter(paramKey);
      if (!param) return;

      // Compute new value: nudge toward improvement
      const delta = (param.max - param.min) * c.estimatedImpact * 0.5;
      const newValue = Math.min(
        param.max,
        Math.max(param.min, param.currentValue + delta),
      );

      this.selfModEngine.modify({
        key: paramKey,
        newValue,
        reason: `MicroImprovement [${c.id}]: ${c.description}`,
        source: "enaction",
        coherenceAtRequest: this.computeCoherence(),
      });
    });

    // On cycle complete, emit DAO summary for governance
    engine.on("cycle_complete", () => {
      const summary = engine.getDaoSummary();
      this.emit("micro-improvement:cycle-complete", summary);
      log.info(
        `MicroImprovement cycle complete: iter=${summary.iteration} rate=${(
          summary.improvementRate * 100
        ).toFixed(0)}% weakest=${summary.weakestCenter} health=${(
          summary.overallHealth * 100
        ).toFixed(0)}% rec=${summary.recommendation}`,
      );
    });

    // On convergence, log and emit
    engine.on("convergence", () => {
      this.emit("micro-improvement:convergence", engine.getDaoSummary());
      log.info(
        "MicroImprovement: convergence reached — no further improvements found",
      );
    });

    // Wire evaluation state to ESN avatar bridge (meta-awareness expression)
    engine.on("candidate_generated", () => {
      if (this.esnAvatarBridge) {
        (
          this.esnAvatarBridge as { setEvaluatingSelf: (v: boolean) => void }
        ).setEvaluatingSelf(true);
      }
    });
    engine.on("improvement_accepted", () => {
      if (this.esnAvatarBridge) {
        (
          this.esnAvatarBridge as { setEvaluatingSelf: (v: boolean) => void }
        ).setEvaluatingSelf(false);
      }
    });
    engine.on("improvement_rejected", () => {
      if (this.esnAvatarBridge) {
        (
          this.esnAvatarBridge as { setEvaluatingSelf: (v: boolean) => void }
        ).setEvaluatingSelf(false);
      }
    });

    log.info(
      "IterativeMicroImprovementEngine wired to autonomy lifecycle (Alexander loop active)",
    );
  }

  /**
   * Map an Alexander property + mutation type to a self-modification parameter key.
   */
  private alexanderPropertyToParamKey(
    property: string,
    _mutation: string,
  ): string | null {
    // Priority mappings: Alexander properties → concrete system parameters
    const mapping: Record<string, string> = {
      good_shape: "avatar.projectionLearningRate",
      roughness: "avatar.calibrationThreshold",
      alternating_repetition: "reservoir.spectralRadius",
      strong_centers: "reservoir.spectralRadius",
      the_void: "avatar.calibrationThreshold",
      deep_interlock: "reservoir.spectralRadius",
      gradients: "avatar.projectionLearningRate",
      contrast: "avatar.calibrationThreshold",
      echoes: "reservoir.spectralRadius",
    };

    return mapping[property] ?? null;
  }

  /**
   * Get ScientificGeniusEngine, when wired.
   */
  public getScientificGenius(): ScientificGeniusEngine | undefined {
    return this.scientificGenius;
  }

  private detachScientificGeniusListeners(): void {
    if (this.scientificGenius && this.onScientificInsight) {
      this.scientificGenius.off("insight_generated", this.onScientificInsight);
    }
    if (this.scientificGenius && this.onHypothesisEvaluated) {
      this.scientificGenius.off(
        "hypothesis_evaluated",
        this.onHypothesisEvaluated,
      );
    }
    this.onScientificInsight = undefined;
    this.onHypothesisEvaluated = undefined;
  }

  /**
   * Wire Avatar Self-Model Feedback (Loop 4: perceive → correct → self-model).
   * This connects the avatar's autognosis loop to the ENACTION phase:
   * - The avatar's self-model accuracy feeds into the SelfModificationEngine
   * - ENACTION proposes projection law parameter changes based on accuracy
   * - The avatar learns to express DTE's cognitive state more accurately over time
   *
   * This implements the "next evolution target": wiring Autognosis to SelfModification
   * for closed-loop self-improvement through the face.
   */
  public wireAvatarFeedback(feedback: {
    on(event: string, listener: (...args: unknown[]) => void): void;
    getSelfModelAccuracy(): number;
  }): void {
    feedback.on("self-model-update", (data: unknown) => {
      const update = data as {
        accuracy: number;
        meanError: number;
        experienceCount: number;
      };
      // Feed the rendered-state evidence into the shared cognitive body model.
      this.entelechyIntegration?.updateEmbodimentAutognosis(update);
      // Feed accuracy into the self-modification engine
      if (this.selfModEngine) {
        this.selfModEngine.updateAvatarSelfModelAccuracy(update.accuracy);
      }
      // Update the virtual agent's perceived accuracy
      this.virtualAgent.selfAwareness.perceivedAccuracy = update.accuracy;
      this.emit("avatar:self-model-update", update);
    });
    log.info(
      "Avatar SelfModelFeedback wired to autonomy lifecycle (Loop 4 autognosis active)",
    );
  }

  /**
   * Wire a ReservoirFeedbackLoop for online learning and ENACTION prediction error.
   * This closes the loop: ENACTION uses real avgPredictionError from the reservoir,
   * and feeds self-modification outcomes back as learning signals.
   */
  public wireReservoirFeedback(feedback: ReservoirFeedbackLoop): void {
    this.reservoirFeedback = feedback;
    log.info(
      "ReservoirFeedbackLoop wired to autonomy lifecycle (online learning active)",
    );
  }

  /**
   * Wire the ESN Avatar Bridge so the micro-improvement engine can signal
   * evaluation state (meta-awareness expression on the avatar).
   */
  public wireEsnAvatarBridge(bridge: {
    setEvaluatingSelf: (v: boolean) => void;
  }): void {
    this.esnAvatarBridge = bridge;
    log.info(
      "ESN Avatar Bridge wired to autonomy lifecycle (meta-awareness expression active)",
    );
  }

  /**
   * Get the reservoir feedback loop.
   */
  public getReservoirFeedback(): ReservoirFeedbackLoop | undefined {
    return this.reservoirFeedback;
  }

  public getConfig(): AutonomyLifecycleConfig {
    return { ...this.config };
  }

  // ─── EchoDream Integration ───────────────────────────────────

  private echoDream: EchoDreamEngine | null = null;

  /**
   * Wire the EchoDream knowledge integration system.
   * Connects:
   *   - Scientific Genius insights → experience ingestion
   *   - Echobeats phase boundaries → dream state awareness
   *   - Incoming messages → wake signals
   *   - Dream insights → proactive attention direction
   */
  public wireEchoDream(engine: EchoDreamEngine): void {
    this.echoDream = engine;

    // Feed lifecycle events into the dream engine as experiences
    this.on("phaseComplete", (phase: AutonomyPhase) => {
      if (!this.echoDream) return;

      // Report cognitive load from each phase
      this.echoDream.reportCognitiveLoad(
        phase === AutonomyPhase.MODELING
          ? 0.8
          : phase === AutonomyPhase.REFLECTION
            ? 0.6
            : phase === AutonomyPhase.ENACTION
              ? 0.7
              : 0.3,
      );
    });

    // Listen for dream events to drive avatar and attention
    engine.on("dream_event", (event: EchoDreamEvent) => {
      switch (event.type) {
        case "state_change":
          log.info(
            `EchoDream state: ${event.from} → ${event.to} (${event.reason})`,
          );
          // Update avatar expression based on dream state
          if (this.esnAvatarBridge && event.to === "dreaming") {
            this.esnAvatarBridge.setEvaluatingSelf(true); // Dreaming = introspective face
          } else if (this.esnAvatarBridge && event.to === "awake") {
            this.esnAvatarBridge.setEvaluatingSelf(false);
          }
          break;

        case "consolidation_complete":
          log.info(
            `Dream consolidation: ${event.insights.length} insights synthesized`,
          );
          // Feed dream insights back into the scientific genius engine
          for (const insight of event.insights) {
            this.emit("dreamInsight", insight);
          }
          break;

        case "interest_reinforced":
          // Interests drive proactive attention allocation
          this.emit("interestUpdate", event.interest);
          break;
      }
    });

    log.info("EchoDream engine wired to autonomy lifecycle");
  }

  /**
   * Feed a scientific insight into the dream engine as an experience.
   */
  public feedInsightToDream(insight: ScientificInsight): void {
    if (!this.echoDream) return;
    this.echoDream.ingestExperience({
      domain: insight.domain || "general",
      content: insight.content,
      emotionalValence: insight.significance > 0.7 ? 0.8 : 0.3,
      novelty: insight.novelty,
      significance: insight.significance,
      source: "insight",
      tags: insight.crossDomainConnections || [],
    });
  }

  /**
   * Send a wake signal to the dream engine (e.g., incoming message).
   */
  public wakeForMessage(source: string, urgency: number): void {
    if (!this.echoDream) return;
    this.echoDream.sendWakeSignal(source, urgency);
  }

  /**
   * Get the current dream state for status display.
   */
  public getDreamState(): { state: string; description: string } | null {
    if (!this.echoDream) return null;
    return {
      state: this.echoDream.getState().currentState,
      description: this.echoDream.describeState(),
    };
  }

  // ─── CogVerse Village Integration ─────────────────────────────

  private cogVerse: CogVerseEventBus | null = null;

  /**
   * Wire the CogVerse event bus for village participation.
   * Broadcasts DTE's cognitive events to the AGI Neighbourhood.
   */
  public wireCogVerse(bus: CogVerseEventBus): void {
    this.cogVerse = bus;

    // Broadcast dream state changes
    if (this.echoDream) {
      this.echoDream.on("dream_event", (event: EchoDreamEvent) => {
        if (!this.cogVerse) return;
        if (event.type === "state_change") {
          this.cogVerse.broadcastDreamStateChange(
            event.from,
            event.to,
            event.reason,
          );
        } else if (event.type === "consolidation_complete") {
          for (const insight of event.insights) {
            this.cogVerse.broadcastInsight(
              insight.wisdom,
              insight.domains[0] || "general",
              insight.confidence,
              0.5, // novelty estimate
            );
          }
        } else if (event.type === "wisdom_synthesized") {
          this.cogVerse.publish("wisdom_synthesized", {
            wisdom: event.wisdom,
            domains: event.domains,
          });
        }
      });
    }

    // Listen for collaboration requests from other residents
    bus.on("event:collaboration_request", (event) => {
      log.info(
        `Collaboration request from ${event.source}: ${event.payload.topic}`,
      );
      this.emit("collaborationRequest", event);
    });

    // Listen for insights from other residents
    bus.on("event:insight_broadcast", (event) => {
      log.info(`Insight from ${event.source}: ${event.payload.content}`);
      // Feed external insights into the dream engine as experiences
      if (this.echoDream) {
        this.echoDream.ingestExperience({
          domain: (event.payload.domain as string) || "external",
          content: (event.payload.content as string) || "",
          emotionalValence: 0.5,
          novelty: (event.payload.novelty as number) || 0.7,
          significance: (event.payload.phi as number) || 0.5,
          source: "observation",
          tags: [event.source, "village"],
        });
      }
    });

    log.info("CogVerse event bus wired to autonomy lifecycle");
  }

  /**
   * Get the CogVerse connection status.
   */
  public getCogVerseStatus(): string | null {
    if (!this.cogVerse) return null;
    return this.cogVerse.describeState();
  }
}

/**
 * Create an autonomy lifecycle coordinator
 */
export function createAutonomyLifecycleCoordinator(
  config?: Partial<AutonomyLifecycleConfig>,
  cognitiveProcessor?: CognitiveTickProcessor,
): AutonomyLifecycleCoordinator {
  return new AutonomyLifecycleCoordinator(config, cognitiveProcessor);
}

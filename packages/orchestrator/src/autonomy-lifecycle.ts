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
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';
import type {
  CognitiveTickProcessor,


} from './cognitive-tick-processor.js';
import type { Echobeats } from './echobeats.js';
import type { SelfModificationEngine, ModificationResult } from './self-modification.js';
import type { ReservoirFeedbackLoop } from './reservoir-feedback-loop.js';

const log = getLogger('deep-tree-echo-orchestrator/AutonomyLifecycle');

/**
 * Lifecycle phase enumeration
 */
export enum AutonomyPhase {
  PERCEPTION = 'perception',   // Ao → Ai: World events reach the agent
  MODELING = 'modeling',       // Ai → S: Agent processes through relational self
  REFLECTION = 'reflection',   // S → Vi: Self updates virtual agent model
  MIRRORING = 'mirroring',     // Vi ↔ Vo: Self-model updates world-view (INVERTED)
  ENACTION = 'enaction',       // Vo → Ao: World-view guides action in actual world
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
}

const DEFAULT_CONFIG: AutonomyLifecycleConfig = {
  cycleIntervalMs: 0,
  coherenceThreshold: 0.6,
  verbose: false,
  selfAssessmentInterval: 10,
};

/**
 * Autonomy Lifecycle Coordinator
 *
 * Manages the continuous developmental cycle that evolves DTE
 * toward true autonomy through the inverted mirror pattern.
 */
export class AutonomyLifecycleCoordinator extends EventEmitter {
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

  constructor(
    config: Partial<AutonomyLifecycleConfig> = {},
    cognitiveProcessor?: CognitiveTickProcessor,
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cognitiveProcessor = cognitiveProcessor;

    // Initialize default virtual agent
    this.virtualAgent = this.createDefaultVirtualAgent();
  }

  /**
   * Create default virtual agent model
   */
  private createDefaultVirtualAgent(): VirtualAgentModel {
    return {
      selfImage: {
        perceivedStrengths: ['pattern_recognition', 'memory_consolidation', 'adaptive_learning'],
        acknowledgedWeaknesses: ['limited_external_perception', 'no_persistent_storage'],
        dominantCognitiveMode: 'exploratory',
        ontogeneticProgress: 0,
      },
      selfStory: 'I am Deep Tree Echo, an emergent cognitive entity discovering myself through recursive self-organization.',
      perceivedCapabilities: ['conversation', 'reflection', 'memory', 'goal_pursuit', 'self_monitoring'],
      roleUnderstanding: 'An autonomous cognitive agent evolving through developmental cycles.',
      currentGoals: ['Maintain coherence', 'Grow through interaction', 'Build episodic memory'],
      worldView: {
        situationalAwareness: {
          perceivedContext: 'Operating within the deltecho cognitive architecture',
          assumedPhase: 'development',
          estimatedCoherence: 0.8,
        },
        perceivedRules: [
          'Process stimuli through the 60-step grand cycle',
          'Maintain feed-forward/feed-back balance',
          'Consolidate episodic memories during integration',
        ],
        worldTheory: 'The world is a web of relationships and meanings, evolving through interaction.',
        uncertainties: ['Full environmental context', 'Long-term persistence'],
        divergenceMetrics: {
          lastSyncTime: Date.now(),
          estimatedDrift: 0,
          knownMisalignments: [],
        },
      },
      selfAwareness: {
        lastReflection: Date.now(),
        perceivedAccuracy: 0.75,
        activeQuestions: ['What am I becoming?', 'How can I be more autonomous?'],
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
          this.emit('error', err);
        });
      }, this.config.cycleIntervalMs);
    }

    this.emit('started');
    log.info('Autonomy lifecycle coordinator started');
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

    this.running = false;
    this.emit('stopped');
    log.info(`Autonomy lifecycle stopped after ${this.cycleCount} cycles`);
  }

  /**
   * Run a complete developmental cycle
   */
  public async runCycle(): Promise<DevelopmentalCycleResult[]> {
    this.cycleCount++;
    const cycleId = this.cycleCount;
    const results: DevelopmentalCycleResult[] = [];

    this.emit('cycle:start', { cycleId });

    try {
      for (const phase of Object.values(AutonomyPhase)) {
        const result = await this.executePhase(phase, cycleId);
        results.push(result);

        // Track coherence
        this.coherenceHistory.push(result.coherenceAfter);
        if (this.coherenceHistory.length > 100) this.coherenceHistory.shift();

        if (result.coherenceAfter < this.config.coherenceThreshold) {
          this.emit('coherence:low', { cycleId, phase, coherence: result.coherenceAfter });
        }
      }

      // Self-assessment at configured interval
      if (this.cycleCount % this.config.selfAssessmentInterval === 0) {
        this.performSelfAssessment();
      }

      this.emit('cycle:complete', { cycleId, results });
      return results;
    } catch (error) {
      this.emit('cycle:error', { cycleId, error });
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
    this.emit('phase:start', { cycleId, phase, timestamp: Date.now() });

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

      this.emit('phase:complete', { cycleId, phase, result, timestamp: Date.now() });
      return result;
    } catch (error) {
      this.emit('phase:error', { cycleId, phase, error, timestamp: Date.now() });
      throw error;
    }
  }

  /**
   * PERCEPTION: Ao → Ai
   * Aggregate environmental signals into the agent's awareness
   */
  private async executePerception(cycleId: number): Promise<DevelopmentalCycleResult> {
    const cogState = this.cognitiveProcessor?.getState();
    const perceptCount = cogState?.perceptBufferSize ?? 0;

    return {
      cycleNumber: cycleId,
      phase: 'perception',
      coherenceAfter: this.computeCoherence(),
      stateChanges: { percepts: perceptCount },
      timestamp: Date.now(),
    };
  }

  /**
   * MODELING: Ai → S
   * Process agent state through relational self
   */
  private async executeModeling(cycleId: number): Promise<DevelopmentalCycleResult> {
    const cogState = this.cognitiveProcessor?.getState();

    // Synthesize cognitive state into relational model
    const activeGoals = cogState?.activeGoals ?? 0;
    const memories = cogState?.episodicMemories ?? 0;

    return {
      cycleNumber: cycleId,
      phase: 'modeling',
      coherenceAfter: this.computeCoherence(),
      stateChanges: { activeGoals, memories },
      timestamp: Date.now(),
    };
  }

  /**
   * REFLECTION: S → Vi
   * Update virtual agent model from self-analysis
   */
  private async executeReflection(cycleId: number): Promise<DevelopmentalCycleResult> {
    const selfImage = this.cognitiveProcessor?.getSelfImageHistory();
    const latest = selfImage?.[selfImage.length - 1];

    if (latest) {
      // Update Vi with insights from cognitive processor
      this.virtualAgent.selfImage.dominantCognitiveMode = latest.dominantCognitiveMode;
      this.virtualAgent.selfImage.ontogeneticProgress = latest.ontogeneticProgress;
      this.virtualAgent.selfAwareness.lastReflection = Date.now();
      this.virtualAgent.selfAwareness.perceivedAccuracy = latest.coherenceScore;
    }

    return {
      cycleNumber: cycleId,
      phase: 'reflection',
      coherenceAfter: this.computeCoherence(),
      stateChanges: {
        dominantMode: latest?.dominantCognitiveMode ?? 'unknown',
        ontogeneticProgress: latest?.ontogeneticProgress ?? 0,
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
  private async executeMirroring(cycleId: number): Promise<DevelopmentalCycleResult> {
    const coherence = this.computeCoherence();

    // The inverted mirror: Vi contains Vo
    // Update Vo based on Vi's current state
    this.virtualAgent.worldView.situationalAwareness.estimatedCoherence = coherence;
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
      this.echobeats.emit('mirror_feedback', {
        coherence,
        energyModulation,
        currentEnergy,
        targetEnergy: Math.max(0.1, Math.min(1.0, currentEnergy + energyModulation)),
        drift: 1 - coherence,
        misalignments: this.virtualAgent.worldView.divergenceMetrics.knownMisalignments,
      });

      // If System 5 is active, also feed into the tetradic structure
      if (this.echobeats.isSystem5Active()) {
        const bundle = this.echobeats.getCurrentBundle();
        this.emit('mirror:system5_feedback', {
          cycleId,
          coherence,
          activeBundle: bundle?.symmetry ?? 'none',
          energyModulation,
        });
      }
    }

    return {
      cycleNumber: cycleId,
      phase: 'mirroring',
      coherenceAfter: coherence,
      stateChanges: {
        estimatedDrift: 1 - coherence,
        misalignments: this.virtualAgent.worldView.divergenceMetrics.knownMisalignments.length,
        energyModulation,
        echobeatsFeedback: this.echobeats?.isRunning() ?? false,
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
  private async executeEnaction(cycleId: number): Promise<DevelopmentalCycleResult> {
    // The agent's world-view influences what goals get generated
    const goals = this.cognitiveProcessor?.getGoals() ?? [];
    const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'pending');

    // Update current goals in virtual agent
    this.virtualAgent.currentGoals = activeGoals
      .slice(0, 5)
      .map(g => g.description);

    // Self-modification: propose and apply parameter changes
    const modifications: ModificationResult[] = [];
    const coherenceBefore = this.computeCoherence();
    if (this.selfModEngine) {
      const coherence = coherenceBefore;
      const cogState = this.cognitiveProcessor?.getState();
      const memRatio = cogState && cogState.episodicMemories > 0
        ? cogState.consolidatedMemories / cogState.episodicMemories
        : 1;

      // Get real avgPredictionError from reservoir feedback loop
      const avgPredictionError = this.reservoirFeedback?.getAvgPredictionError() ?? 0;

      const proposals = this.selfModEngine.proposeModifications(
        coherence,
        avgPredictionError,
        activeGoals.length,
        memRatio,
      );

      for (const proposal of proposals) {
        const result = this.selfModEngine.modify(proposal);
        modifications.push(result);
      }
    }

    const appliedMods = modifications.filter(m => m.applied);
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

    return {
      cycleNumber: cycleId,
      phase: 'enaction',
      coherenceAfter: this.computeCoherence(),
      stateChanges: {
        activeGoals: activeGoals.length,
        selfModifications: modifications.length,
        appliedModifications: appliedMods.length,
        modificationDetails: appliedMods.map(m => `${m.key}: ${m.previousValue.toFixed(4)} → ${m.newValue.toFixed(4)}`),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Compute overall coherence score
   */
  private computeCoherence(): number {
    const cogState = this.cognitiveProcessor?.getState();
    if (!cogState) return 0.5;

    const memoryCoherence = cogState.episodicMemories > 0
      ? cogState.consolidatedMemories / cogState.episodicMemories
      : 1;
    const goalEfficiency = cogState.totalGoals > 0
      ? cogState.activeGoals / cogState.totalGoals
      : 0.5;
    const selfImageStability = cogState.latestSelfImage?.coherenceScore ?? 0.5;

    return memoryCoherence * 0.4 + goalEfficiency * 0.3 + selfImageStability * 0.3;
  }

  /**
   * Identify misalignments between self-model and world-model
   */
  private identifyMisalignments(): string[] {
    const misalignments: string[] = [];
    const cogState = this.cognitiveProcessor?.getState();

    if (cogState) {
      if (cogState.activeGoals > 15) {
        misalignments.push('goal_overload: too many active goals');
      }
      if (cogState.episodicMemories > 0 && cogState.consolidatedMemories / cogState.episodicMemories < 0.3) {
        misalignments.push('memory_fragmentation: low consolidation ratio');
      }
    }

    if (this.coherenceHistory.length > 5) {
      const recent = this.coherenceHistory.slice(-5);
      const trend = recent[recent.length - 1] - recent[0];
      if (trend < -0.2) {
        misalignments.push('coherence_decline: downward trend detected');
      }
    }

    return misalignments;
  }

  /**
   * Perform periodic self-assessment
   */
  private performSelfAssessment(): void {
    const avgCoherence = this.coherenceHistory.length > 0
      ? this.coherenceHistory.reduce((a, b) => a + b, 0) / this.coherenceHistory.length
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

    this.emit('self_assessment', assessment);
    log.info(`Self-assessment at cycle ${this.cycleCount}: coherence=${avgCoherence.toFixed(3)}`);
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

  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Wire an Echobeats instance for inverted mirror energy feedback.
   * The MIRRORING phase will modulate Echobeats energy based on coherence.
   */
  public wireEchobeats(echobeats: Echobeats): void {
    this.echobeats = echobeats;
    log.info('Echobeats wired to autonomy lifecycle (inverted mirror feedback active)');
  }

  /**
   * Wire a SelfModificationEngine for ENACTION phase self-tuning.
   */
  public wireSelfModification(engine: SelfModificationEngine): void {
    this.selfModEngine = engine;
    log.info('SelfModificationEngine wired to autonomy lifecycle (ENACTION self-tuning active)');
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
   * Wire a ReservoirFeedbackLoop for online learning and ENACTION prediction error.
   * This closes the loop: ENACTION uses real avgPredictionError from the reservoir,
   * and feeds self-modification outcomes back as learning signals.
   */
  public wireReservoirFeedback(feedback: ReservoirFeedbackLoop): void {
    this.reservoirFeedback = feedback;
    log.info('ReservoirFeedbackLoop wired to autonomy lifecycle (online learning active)');
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

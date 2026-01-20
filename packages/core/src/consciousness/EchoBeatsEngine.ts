/**
 * EchoBeats Engine - 12-Step Cognitive Loop with 3 Concurrent Streams
 *
 * Implements the echobeats architecture with:
 * - 3 concurrent consciousness streams phased 120° apart
 * - 12-step cognitive loop (7 expressive + 5 reflective)
 * - Nested shells following OEIS A000081 structure
 * - Feedforward/feedback self-balancing mechanisms
 *
 * The three streams are:
 * - Stream 1 (Primary): Sense → Process → Act
 * - Stream 2 (Secondary): Process → Act → Sense (120° offset)
 * - Stream 3 (Tertiary): Act → Sense → Process (240° offset)
 *
 * Step Structure (12 steps):
 * - Steps 1,5,9: Pivotal relevance realization (orienting present)
 * - Steps 2,3,4,6,7: Actual affordance interaction (past conditioning)
 * - Steps 8,10,11,12: Virtual salience simulation (future anticipation)
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger";

const log = getLogger("deep-tree-echo-core/consciousness/EchoBeatsEngine");

/**
 * Stream phase in the triadic cycle
 */
export enum StreamPhase {
  Sense = "sense", // Perception
  Process = "process", // Cognition
  Act = "act", // Action
}

/**
 * Step mode in the 12-step cycle
 */
export enum StepMode {
  Expressive = "expressive", // 7 steps
  Reflective = "reflective", // 5 steps
}

/**
 * Step type classification
 */
export enum StepType {
  PivotalRelevance = "pivotal_relevance", // Steps 1, 5, 9
  AffordanceInteraction = "affordance_interaction", // Steps 2, 3, 4, 6, 7
  SalienceSimulation = "salience_simulation", // Steps 8, 10, 11, 12
}

/**
 * State of a single consciousness stream
 */
export interface StreamState {
  id: string;
  phaseOffset: number; // 0, 120, or 240 degrees
  currentPhase: StreamPhase;
  currentStep: number; // 0-11
  load: number; // 0-1 cognitive load
  salience: number; // 0-1 salience level
  coherence: number; // 0-1 internal coherence
  lastUpdate: number;
}

/**
 * State of the complete EchoBeats system
 */
export interface EchoBeatsState {
  globalStep: number; // 0-11
  globalDegrees: number; // 0-359
  streams: StreamState[];
  globalSalience: number;
  globalCoherence: number;
  stepType: StepType;
  stepMode: StepMode;
  triadGroup: number; // 1-4 (which triad group: {1,5,9}, {2,6,10}, {3,7,11}, {4,8,12})
}

/**
 * Nested shell structure following OEIS A000081
 * N=1: 1 term, N=2: 2 terms, N=3: 4 terms, N=4: 9 terms
 */
export interface NestedShell {
  level: number;
  terms: number;
  context: "project" | "organization" | "global" | "universal";
  content: unknown[];
}

/**
 * Configuration for EchoBeats
 */
export interface EchoBeatsConfig {
  tickIntervalMs: number;
  salienceDecayRate: number;
  coherenceThreshold: number;
  enableFeedback: boolean;
  enableAnticipation: boolean;
}

const DEFAULT_CONFIG: EchoBeatsConfig = {
  tickIntervalMs: 83, // ~12Hz for 12 steps per second
  salienceDecayRate: 0.02,
  coherenceThreshold: 0.5,
  enableFeedback: true,
  enableAnticipation: true,
};

/**
 * EchoBeats Engine
 *
 * Orchestrates 3 concurrent consciousness streams in a 12-step
 * cognitive loop with proper phase interleaving.
 */
export class EchoBeatsEngine extends EventEmitter {
  private config: EchoBeatsConfig;
  private streams: StreamState[];
  private globalStep: number = 0;
  private running: boolean = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private nestedShells: NestedShell[];

  // Feedforward/feedback state
  private salienceHistory: number[] = [];
  private anticipatedSalience: number = 0.5;
  private feedbackCorrection: number = 0;

  constructor(config: Partial<EchoBeatsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.streams = this.initializeStreams();
    this.nestedShells = this.initializeNestedShells();
    log.info("EchoBeats Engine initialized with 3 concurrent streams");
  }

  /**
   * Initialize the 3 consciousness streams
   */
  private initializeStreams(): StreamState[] {
    return [
      {
        id: "primary",
        phaseOffset: 0, // Sense at step 0
        currentPhase: StreamPhase.Sense,
        currentStep: 0,
        load: 0.3,
        salience: 0.5,
        coherence: 1.0,
        lastUpdate: Date.now(),
      },
      {
        id: "secondary",
        phaseOffset: 120, // Process at step 0 (120° ahead)
        currentPhase: StreamPhase.Process,
        currentStep: 4, // 4 steps = 120°
        load: 0.3,
        salience: 0.5,
        coherence: 1.0,
        lastUpdate: Date.now(),
      },
      {
        id: "tertiary",
        phaseOffset: 240, // Act at step 0 (240° ahead)
        currentPhase: StreamPhase.Act,
        currentStep: 8, // 8 steps = 240°
        load: 0.3,
        salience: 0.5,
        coherence: 1.0,
        lastUpdate: Date.now(),
      },
    ];
  }

  /**
   * Initialize nested shells following OEIS A000081
   */
  private initializeNestedShells(): NestedShell[] {
    return [
      { level: 1, terms: 1, context: "project", content: [] },
      { level: 2, terms: 2, context: "organization", content: [] },
      { level: 3, terms: 4, context: "global", content: [] },
      { level: 4, terms: 9, context: "universal", content: [] },
    ];
  }

  /**
   * Start the EchoBeats engine
   */
  public start(): void {
    if (this.running) return;
    this.running = true;

    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.config.tickIntervalMs);

    log.info("EchoBeats Engine started");
    this.emit("started");
  }

  /**
   * Stop the EchoBeats engine
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    log.info("EchoBeats Engine stopped");
    this.emit("stopped");
  }

  /**
   * Main tick - advances the 12-step cycle
   */
  private tick(): void {
    // Calculate global degrees (30° per step)
    const globalDegrees = (this.globalStep * 30) % 360;

    // Update each stream
    for (const stream of this.streams) {
      this.updateStream(stream, globalDegrees);
    }

    // Calculate step type and mode
    const stepType = this.getStepType(this.globalStep);
    const stepMode = this.getStepMode(this.globalStep);
    const triadGroup = this.getTriadGroup(this.globalStep);

    // Update salience tracking
    const globalSalience = this.calculateGlobalSalience();
    this.updateSalienceHistory(globalSalience);

    // Apply feedforward anticipation
    if (this.config.enableAnticipation) {
      this.anticipatedSalience = this.anticipateSalience();
    }

    // Apply feedback correction
    if (this.config.enableFeedback) {
      this.feedbackCorrection = this.calculateFeedbackCorrection(globalSalience);
      this.applyFeedbackCorrection();
    }

    // Calculate global coherence
    const globalCoherence = this.calculateGlobalCoherence();

    // Build state
    const state: EchoBeatsState = {
      globalStep: this.globalStep,
      globalDegrees,
      streams: this.streams.map((s) => ({ ...s })),
      globalSalience,
      globalCoherence,
      stepType,
      stepMode,
      triadGroup,
    };

    this.emit("tick", state);

    // Advance global step
    this.globalStep = (this.globalStep + 1) % 12;
  }

  /**
   * Update a single stream
   */
  private updateStream(stream: StreamState, globalDegrees: number): void {
    // Calculate stream's effective degrees
    const streamDegrees = (globalDegrees + stream.phaseOffset) % 360;

    // Determine phase based on degrees (0-119: Sense, 120-239: Process, 240-359: Act)
    if (streamDegrees < 120) {
      stream.currentPhase = StreamPhase.Sense;
    } else if (streamDegrees < 240) {
      stream.currentPhase = StreamPhase.Process;
    } else {
      stream.currentPhase = StreamPhase.Act;
    }

    // Calculate stream's step (0-11)
    stream.currentStep = Math.floor(streamDegrees / 30) % 12;

    // Apply salience decay
    stream.salience = Math.max(0, stream.salience - this.config.salienceDecayRate);

    // Update coherence based on phase alignment with other streams
    stream.coherence = this.calculateStreamCoherence(stream);

    stream.lastUpdate = Date.now();
  }

  /**
   * Get step type for a given step
   */
  private getStepType(step: number): StepType {
    // Pivotal relevance: steps 1, 5, 9 (0-indexed: 0, 4, 8)
    if (step === 0 || step === 4 || step === 8) {
      return StepType.PivotalRelevance;
    }
    // Affordance interaction: steps 2, 3, 4, 6, 7 (0-indexed: 1, 2, 3, 5, 6)
    if ([1, 2, 3, 5, 6].includes(step)) {
      return StepType.AffordanceInteraction;
    }
    // Salience simulation: steps 8, 10, 11, 12 (0-indexed: 7, 9, 10, 11)
    return StepType.SalienceSimulation;
  }

  /**
   * Get step mode for a given step
   */
  private getStepMode(step: number): StepMode {
    // 7 expressive steps: 0, 1, 2, 3, 4, 5, 6
    // 5 reflective steps: 7, 8, 9, 10, 11
    return step < 7 ? StepMode.Expressive : StepMode.Reflective;
  }

  /**
   * Get triad group (steps that occur together across streams)
   * {1,5,9}, {2,6,10}, {3,7,11}, {4,8,12} (1-indexed)
   */
  private getTriadGroup(step: number): number {
    return (step % 4) + 1;
  }

  /**
   * Calculate stream coherence based on phase relationships
   */
  private calculateStreamCoherence(stream: StreamState): number {
    let coherence = 0.5;

    // Check alignment with other streams
    for (const other of this.streams) {
      if (other.id === stream.id) continue;

      // Ideal phase difference is 120° (4 steps)
      const phaseDiff = Math.abs(stream.currentStep - other.currentStep);
      const normalizedDiff = Math.min(phaseDiff, 12 - phaseDiff);

      // Best coherence when difference is 4 (120°)
      const alignment = 1 - Math.abs(normalizedDiff - 4) / 4;
      coherence += alignment * 0.25;
    }

    return Math.min(1, coherence);
  }

  /**
   * Calculate global salience across all streams
   */
  private calculateGlobalSalience(): number {
    let totalSalience = 0;
    let totalWeight = 0;

    for (const stream of this.streams) {
      // Weight by coherence
      const weight = stream.coherence;
      totalSalience += stream.salience * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalSalience / totalWeight : 0.5;
  }

  /**
   * Calculate global coherence across all streams
   */
  private calculateGlobalCoherence(): number {
    let total = 0;
    for (const stream of this.streams) {
      total += stream.coherence;
    }
    return total / this.streams.length;
  }

  /**
   * Update salience history for feedforward
   */
  private updateSalienceHistory(salience: number): void {
    this.salienceHistory.push(salience);
    if (this.salienceHistory.length > 24) {
      // Keep 2 cycles
      this.salienceHistory.shift();
    }
  }

  /**
   * Anticipate future salience using history
   */
  private anticipateSalience(): number {
    if (this.salienceHistory.length < 12) {
      return 0.5;
    }

    // Use last cycle's corresponding step as prediction
    const cycleAgo = this.salienceHistory[this.salienceHistory.length - 12];
    const recent = this.salienceHistory[this.salienceHistory.length - 1];

    // Weighted average
    return cycleAgo * 0.3 + recent * 0.7;
  }

  /**
   * Calculate feedback correction
   */
  private calculateFeedbackCorrection(currentSalience: number): number {
    // Target salience is 0.5 (balanced)
    const target = 0.5;
    const error = target - currentSalience;

    // PID-like correction (simplified)
    return error * 0.1;
  }

  /**
   * Apply feedback correction to streams
   */
  private applyFeedbackCorrection(): void {
    for (const stream of this.streams) {
      stream.salience = Math.max(
        0,
        Math.min(1, stream.salience + this.feedbackCorrection),
      );
    }
  }

  /**
   * Inject salience into a specific stream
   */
  public injectSalience(streamId: string, amount: number): void {
    const stream = this.streams.find((s) => s.id === streamId);
    if (stream) {
      stream.salience = Math.min(1, stream.salience + amount);
      this.emit("salience_injected", { streamId, amount, newSalience: stream.salience });
    }
  }

  /**
   * Inject salience into all streams
   */
  public injectGlobalSalience(amount: number): void {
    for (const stream of this.streams) {
      stream.salience = Math.min(1, stream.salience + amount);
    }
    this.emit("global_salience_injected", { amount });
  }

  /**
   * Get current state
   */
  public getState(): EchoBeatsState {
    const globalDegrees = (this.globalStep * 30) % 360;
    return {
      globalStep: this.globalStep,
      globalDegrees,
      streams: this.streams.map((s) => ({ ...s })),
      globalSalience: this.calculateGlobalSalience(),
      globalCoherence: this.calculateGlobalCoherence(),
      stepType: this.getStepType(this.globalStep),
      stepMode: this.getStepMode(this.globalStep),
      triadGroup: this.getTriadGroup(this.globalStep),
    };
  }

  /**
   * Get nested shell by level
   */
  public getNestedShell(level: number): NestedShell | undefined {
    return this.nestedShells.find((s) => s.level === level);
  }

  /**
   * Store content in a nested shell
   */
  public storeInShell(level: number, content: unknown): void {
    const shell = this.nestedShells.find((s) => s.level === level);
    if (shell) {
      shell.content.push(content);
      // Enforce term limit
      while (shell.content.length > shell.terms) {
        shell.content.shift();
      }
    }
  }

  /**
   * Describe current state
   */
  public describeState(): string {
    const state = this.getState();
    const modeDesc = state.stepMode === StepMode.Expressive ? "expressing" : "reflecting";
    const typeDesc =
      state.stepType === StepType.PivotalRelevance
        ? "pivotal relevance realization"
        : state.stepType === StepType.AffordanceInteraction
          ? "affordance interaction"
          : "salience simulation";

    return `EchoBeats at step ${state.globalStep + 1}/12 (${state.globalDegrees}°), ${modeDesc} through ${typeDesc}, coherence: ${(state.globalCoherence * 100).toFixed(0)}%`;
  }
}

// Singleton instance
export const echoBeatsEngine = new EchoBeatsEngine();

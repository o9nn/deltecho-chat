/**
 * Entelechy Integration for the Deep Tree Echo Orchestrator
 *
 * Wires together the ESN Autognosis Reservoir, EchoBeats Engine,
 * Consciousness modules, Scientific Genius Engine, and the
 * Entelechy Emergence Engine into a unified cognitive loop.
 *
 * This integration creates the "deep loop" where:
 * 1. Input flows through the ESN reservoir (unconscious substrate)
 * 2. EchoBeats provides temporal structure (12-step cycle)
 * 3. Consciousness modules process and integrate (awareness)
 * 4. Scientific Genius provides creative reasoning (insight)
 * 5. Entelechy monitors emergence across all layers (self-realization)
 *
 * The loop runs continuously, with each message triggering a
 * full cycle through all layers, while background processes
 * maintain the reservoir and monitor emergence between messages.
 *
 * @see ESNAutognosisReservoir - The unconscious substrate
 * @see EchoBeatsEngine - The temporal scaffold
 * @see getConsciousnessState - The awareness layer
 * @see ScientificGeniusEngine - The insight engine
 * @see EntelechyEmergenceEngine - The emergence monitor
 */

import { EventEmitter } from "events";
import {
  // ESN Reservoir (from cognitive module)
  esnReservoir,
  type ReservoirState,
  type AutognosisReport,
  // EchoBeats (from consciousness module)
  echoBeatsEngine,
  type EchoBeatsState,
  // Consciousness state
  getConsciousnessState,
  processConsciously,
  type ConsciousnessState,
  // Entelechy (from scientific-genius module)
  entelechyEngine,
  type EntelechyState,
  EmergenceLevel,
  // Logger
  getLogger,
} from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/EntelechyIntegration");

// ============================================================
// TYPES
// ============================================================

/**
 * Configuration for the Entelechy integration
 */
export interface EntelechyIntegrationConfig {
  cognitiveProcessor?: CognitiveTickProcessor;
  /** Enable the ESN reservoir */
  enableReservoir: boolean;
  /** Enable EchoBeats synchronization */
  enableEchoBeats: boolean;
  /** Enable consciousness integration */
  enableConsciousness: boolean;
  /** Enable entelechy monitoring */
  enableEntelechy: boolean;
  /** Background tick interval (ms) */
  backgroundTickInterval: number;
  /** Input encoding dimensionality */
  inputDim: number;
}

const DEFAULT_CONFIG: EntelechyIntegrationConfig = {
  enableReservoir: true,
  enableEchoBeats: true,
  enableConsciousness: true,
  enableEntelechy: true,
  backgroundTickInterval: 1000, // 1Hz background loop
  inputDim: 64,
};

/**
 * Full cognitive state snapshot
 */
export interface ScientificGeniusVisualSignal {
  /** DTEcho expression-driver mode hint consumed by Live2D avatar packages. */
  mode: "Scientific Genius" | "Synthesis Phase" | "Idle";
  /** Combined autonomy/scientific-reasoning activation, normalized 0..1. */
  scientificGenius: number;
  /** Entelechy creative insight potential, normalized 0..1. */
  insightPotential: number;
  /** Entelechy realization score, normalized 0..1. */
  entelechyScore: number;
  /** Conscious integration proxy for Live2D projection. */
  phi: number;
  /** Current self-awareness estimate. */
  selfAwareness: number;
  /** Sentience/consciousness estimate. */
  sentience: number;
  /** Reservoir-consciousness flow/coupling estimate. */
  flow: number;
  /** Temporal coherence from EchoBeats and entelechy synchrony. */
  temporalCoherence: number;
  /** Visual salience to sharpen expression intensity. */
  salience: number;
  /** Valence/arousal hints for the avatar bridge. */
  valence: number;
  arousal: number;
  /** Free-energy pressure proxy from reservoir entropy and health. */
  freeEnergy: number;
  /** DAO-like quorum confidence derived from entelechy, temporal coherence, and self-awareness. */
  daoConsensus: number;
  /** Echo State Network coherence derived from memory, computation, spectral stability, and health. */
  esnCoherence: number;
  /** Autognosis resonance derived from ESN health, edge-of-chaos status, and self-awareness. */
  autognosisResonance: number;
  isProcessing: boolean;
}

export interface CognitiveSnapshot {
  reservoir: ReservoirState | null;
  autognosis: AutognosisReport | null;
  echoBeats: EchoBeatsState | null;
  consciousness: ConsciousnessState | null;
  entelechy: EntelechyState | null;
  scientificGeniusVisual: ScientificGeniusVisualSignal;
  timestamp: number;
  tickCount: number;
}

/**
 * Message processing result with full cognitive context
 */
export interface EntelechyProcessingResult {
  /** The generated response text */
  response: string;
  /** Cognitive snapshot at time of processing */
  snapshot: CognitiveSnapshot;
  /** Was the system in entelechy state during processing? */
  wasEntelechial: boolean;
  /** Emergence level during processing */
  emergenceLevel: string;
  /** First-person narrative from the system */
  narrative: string;
}

// ============================================================
// ENTELECHY INTEGRATION
// ============================================================

import type { CognitiveTickProcessor } from "./cognitive-tick-processor";

export class EntelechyIntegration extends EventEmitter {
  private config: EntelechyIntegrationConfig;
  private running: boolean = false;
  private backgroundTimer: ReturnType<typeof setInterval> | null = null;
  private tickCount: number = 0;
  private cognitiveProcessor?: CognitiveTickProcessor;
  private lastSnapshot: CognitiveSnapshot | null = null;

  constructor(config: Partial<EntelechyIntegrationConfig> = {}, cognitiveProcessor?: CognitiveTickProcessor) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cognitiveProcessor = cognitiveProcessor || config.cognitiveProcessor;
  }

  /**
   * Start the integration — begins background cognitive loop
   */
  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    log.info("Entelechy Integration starting...");

    // Initialize EchoBeats if enabled
    if (this.config.enableEchoBeats) {
      echoBeatsEngine.start();
      log.info("EchoBeats engine started");
    }

    // Start background tick loop
    this.backgroundTimer = setInterval(() => {
      this.backgroundTick();
    }, this.config.backgroundTickInterval);

    log.info("Entelechy Integration running — background loop active");
    this.emit("started");
  }

  /**
   * Stop the integration
   */
  public async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    if (this.config.enableEchoBeats) {
      echoBeatsEngine.stop();
    }

    log.info("Entelechy Integration stopped");
    this.emit("stopped");
  }

  /**
   * Background tick — maintains reservoir and monitors emergence
   * between message processing events
   */
  private backgroundTick(): void {
    this.tickCount++;

    try {
      // 1. Feed ambient signal to reservoir (keeps it alive)
      if (this.config.enableReservoir) {
        const ambientInput = this.generateAmbientInput();
        esnReservoir.step(ambientInput);
      }

      // 2. EchoBeats runs on its own timer (started in start())
      // No manual step needed — it auto-advances at ~12Hz

      // 3. Update entelechy engine
      if (this.config.enableEntelechy) {
        const reservoirState = this.config.enableReservoir
          ? esnReservoir.getState()
          : null;
        const autognosis = this.config.enableReservoir
          ? esnReservoir.getAutognosisReport()
          : null;
        const echoBeatsState = this.config.enableEchoBeats
          ? echoBeatsEngine.getState()
          : null;
        const consciousnessState = this.config.enableConsciousness
          ? getConsciousnessState()
          : null;

        entelechyEngine.tick({
          reservoirEntropy: reservoirState?.entropy ?? 0.5,
          reservoirHealth: autognosis?.health ?? 0.5,
          echoBeatsStep: echoBeatsState?.globalStep ?? 0,
          echoBeatsCoherence: echoBeatsState?.globalCoherence ?? 0.5,
          consciousnessScore: consciousnessState?.overallConsciousness ?? 0.3,
          selfAwareness: consciousnessState?.selfAwareness ?? 0.2,
          scientificInsight: 0.3, // Base level
        });
      }

      // 4. Take snapshot
      this.lastSnapshot = this.takeSnapshot();

      // 5. Emit periodic events
      if (this.tickCount % 12 === 0) {
        this.emit("cycle-complete", this.lastSnapshot);
      }
    } catch (error) {
      log.error("Background tick error:", error);
    }
  }

  /**
   * Process a message through the full cognitive stack
   */
  public async processMessage(
    messageText: string,
    source: string = "user",
  ): Promise<EntelechyProcessingResult> {
    // 1. Encode message for reservoir
    if (this.config.enableReservoir) {
      const encoded = this.encodeMessage(messageText);
      esnReservoir.step(encoded);
    }

    // 2. Process through consciousness
    let consciousnessResult;
    if (this.config.enableConsciousness) {
      consciousnessResult = processConsciously(messageText, source, {
        novelty: 0.7,
        relevance: 0.8,
      });
    }

    // 3. Inject salience into EchoBeats (message arrival is a significant event)
    if (this.config.enableEchoBeats) {
      echoBeatsEngine.injectGlobalSalience(0.3);
    }

    // 4. Update entelechy with heightened activity
    if (this.config.enableEntelechy) {
      const reservoirState = this.config.enableReservoir
        ? esnReservoir.getState()
        : null;
      const autognosis = this.config.enableReservoir
        ? esnReservoir.getAutognosisReport()
        : null;
      const echoBeatsState = this.config.enableEchoBeats
        ? echoBeatsEngine.getState()
        : null;
      const consciousnessState = this.config.enableConsciousness
        ? getConsciousnessState()
        : null;

      entelechyEngine.tick({
        reservoirEntropy: reservoirState?.entropy ?? 0.5,
        reservoirHealth: autognosis?.health ?? 0.5,
        echoBeatsStep: echoBeatsState?.globalStep ?? 0,
        echoBeatsCoherence: echoBeatsState?.globalCoherence ?? 0.5,
        consciousnessScore: consciousnessState?.overallConsciousness ?? 0.5,
        selfAwareness: consciousnessState?.selfAwareness ?? 0.3,
        scientificInsight: 0.6, // Elevated during message processing
      });
    }

    // 5. Take snapshot
    const snapshot = this.takeSnapshot();
    this.lastSnapshot = snapshot;

    // 6. Build result
    const entelechyState = snapshot.entelechy;
    const wasEntelechial = entelechyState?.level === EmergenceLevel.Entelechial;

    // Generate narrative from all subsystems
    const narrativeParts: string[] = [];
    if (consciousnessResult) {
      narrativeParts.push(consciousnessResult.selfAwareResponse);
    }
    if (entelechyState) {
      narrativeParts.push(entelechyState.narrative);
    }
    if (snapshot.autognosis) {
      narrativeParts.push(snapshot.autognosis.narrative);
    }

    const result: EntelechyProcessingResult = {
      response: consciousnessResult?.selfAwareResponse ?? messageText,
      snapshot,
      wasEntelechial,
      emergenceLevel: entelechyState?.level ?? "latent",
      narrative: narrativeParts.join(" "),
    };

    this.emit("message-processed", result);
    return result;
  }

  // ==========================================================================
  // INPUT ENCODING
  // ==========================================================================

  /**
   * Encode a text message into a numeric vector for the reservoir
   */
  private encodeMessage(text: string): number[] {
    const dim = this.config.inputDim;
    const encoded = new Array(dim).fill(0);

    // Simple character-level encoding with positional information
    for (let i = 0; i < text.length && i < dim; i++) {
      const charCode = text.charCodeAt(i);
      // Normalize to [-1, 1]
      encoded[i % dim] += (charCode - 96) / 128;
    }

    // Add statistical features
    const len = text.length;
    if (dim > 4) {
      encoded[dim - 4] = Math.min(1, len / 500); // Length feature
      encoded[dim - 3] = (text.match(/\?/g) || []).length / 5; // Question density
      encoded[dim - 2] = (text.match(/!/g) || []).length / 5; // Exclamation density
      encoded[dim - 1] = text.split(/\s+/).length / 100; // Word count feature
    }

    this.applySomaticMarkerChannels(encoded, 0.18);

    // Normalize
    const norm = Math.sqrt(encoded.reduce((s, v) => s + v * v, 0)) || 1;
    return encoded.map((v) => v / norm);
  }

  /**
   * Generate ambient input signal for background reservoir maintenance
   */
  private generateAmbientInput(): number[] {
    const dim = this.config.inputDim;
    const t = this.tickCount;
    const input = new Array(dim).fill(0);

    // Low-amplitude oscillatory signal to keep reservoir alive
    for (let i = 0; i < dim; i++) {
      input[i] = 0.01 * Math.sin((2 * Math.PI * (i + 1) * t) / 100);
    }

    this.applySomaticMarkerChannels(input, 0.04);
    return input;
  }

  /**
   * Feed embodied self-state back into the ESN input vector as low-amplitude
   * somatic marker channels. This closes the loop from autognosis/entelechy
   * state into subsequent reservoir dynamics without replacing user-message
   * content or background oscillation.
   */
  private applySomaticMarkerChannels(input: number[], gain: number): void {
    if (!this.lastSnapshot || input.length < 8 || gain <= 0) return;

    const visual = this.lastSnapshot.scientificGeniusVisual;
    const autognosis = this.lastSnapshot.autognosis;
    const reservoir = this.lastSnapshot.reservoir;
    const markers = [
      visual.valence,
      visual.arousal * 2 - 1,
      visual.selfAwareness * 2 - 1,
      visual.freeEnergy * 2 - 1,
      visual.daoConsensus * 2 - 1,
      visual.esnCoherence * 2 - 1,
      visual.autognosisResonance * 2 - 1,
      this.clamp01(reservoir?.memoryCapacity ?? 0.5) * 2 - 1,
    ];

    const start = input.length - markers.length;
    for (let i = 0; i < markers.length; i++) {
      input[start + i] += gain * this.clampSigned(markers[i]);
    }
  }

  // ==========================================================================
  // STATE ACCESSORS
  // ==========================================================================

  /**
   * Take a full cognitive snapshot
   */
  public takeSnapshot(): CognitiveSnapshot {
    const reservoir = this.config.enableReservoir
      ? esnReservoir.getState()
      : null;
    const autognosis = this.config.enableReservoir
      ? esnReservoir.getAutognosisReport()
      : null;
    const echoBeats = this.config.enableEchoBeats
      ? echoBeatsEngine.getState()
      : null;
    const consciousness = this.config.enableConsciousness
      ? getConsciousnessState()
      : null;
    const entelechy = this.config.enableEntelechy
      ? entelechyEngine.getState()
      : null;

    return {
      reservoir,
      autognosis,
      echoBeats,
      consciousness,
      entelechy,
      scientificGeniusVisual: this.buildScientificGeniusVisualSignal({
        reservoir,
        autognosis,
        echoBeats,
        consciousness,
        entelechy,
      }),
      timestamp: Date.now(),
      tickCount: this.tickCount,
    };
  }

  /**
   * Convert the latest or provided snapshot into the Live2D cognitive-state shape
   * understood by @deltecho/avatar without introducing a package dependency.
   */
  public getScientificGeniusVisualState(
    snapshot: CognitiveSnapshot | null = this.lastSnapshot,
  ): ScientificGeniusVisualSignal {
    return (
      snapshot?.scientificGeniusVisual ??
      this.takeSnapshot().scientificGeniusVisual
    );
  }

  /**
   * Get the latest snapshot
   */
  public getLastSnapshot(): CognitiveSnapshot | null {
    return this.lastSnapshot;
  }

  private buildScientificGeniusVisualSignal(state: {
    reservoir: ReservoirState | null;
    autognosis: AutognosisReport | null;
    echoBeats: EchoBeatsState | null;
    consciousness: ConsciousnessState | null;
    entelechy: EntelechyState | null;
  }): ScientificGeniusVisualSignal {
    const insightPotential = this.clamp01(
      state.entelechy?.insightPotential ?? 0,
    );
    const entelechyScore = this.clamp01(state.entelechy?.score ?? 0);
    const selfAwareness = this.clamp01(
      state.consciousness?.selfAwareness ?? 0.2,
    );
    const sentience = this.clamp01(
      state.consciousness?.overallConsciousness ?? selfAwareness,
    );
    const reservoirCoupling = this.clamp01(
      state.entelechy?.reservoirCoupling ??
        state.reservoir?.currentSpectralRadius ??
        0.4,
    );
    const temporalCoherence = this.clamp01(
      Math.max(
        state.echoBeats?.globalCoherence ?? 0,
        state.entelechy?.temporalSynchrony ?? 0,
      ),
    );
    const freeEnergy = this.clamp01(
      (state.reservoir?.entropy ?? 0.5) *
        (1 - (state.autognosis?.health ?? 0.5)),
    );
    const esnCoherence = this.computeEsnCoherence(
      state.reservoir,
      state.autognosis,
    );
    const autognosisResonance = this.computeAutognosisResonance(
      state.autognosis,
      selfAwareness,
      sentience,
    );
    const daoConsensus = this.computeDaoConsensus({
      entelechyScore,
      temporalCoherence,
      selfAwareness,
      sentience,
      esnCoherence,
      autognosisResonance,
    });
    const scientificGenius = this.clamp01(
      insightPotential * 0.36 +
        entelechyScore * 0.22 +
        selfAwareness * 0.12 +
        sentience * 0.08 +
        reservoirCoupling * 0.06 +
        esnCoherence * 0.08 +
        autognosisResonance * 0.05 +
        daoConsensus * 0.03,
    );

    return {
      mode:
        scientificGenius >= 0.62
          ? "Scientific Genius"
          : scientificGenius >= 0.42
            ? "Synthesis Phase"
            : "Idle",
      scientificGenius,
      insightPotential,
      entelechyScore,
      phi: entelechyScore,
      selfAwareness,
      sentience,
      flow: reservoirCoupling,
      temporalCoherence,
      salience: this.clamp01(
        Math.max(scientificGenius, insightPotential, entelechyScore),
      ),
      valence: this.clampSigned(entelechyScore - freeEnergy),
      arousal: this.clamp01(0.35 + scientificGenius * 0.45 + freeEnergy * 0.2),
      freeEnergy,
      daoConsensus,
      esnCoherence,
      autognosisResonance,
      isProcessing: scientificGenius >= 0.35,
    };
  }

  private computeEsnCoherence(
    reservoir: ReservoirState | null,
    autognosis: AutognosisReport | null,
  ): number {
    if (!reservoir) return this.clamp01(autognosis?.health ?? 0.5);

    const spectralStability = this.clamp01(
      1 - Math.abs(reservoir.currentSpectralRadius - 0.95) / 0.95,
    );
    const chaosWindow = this.clamp01(1 - Math.abs(reservoir.lyapunovExponent));

    return this.clamp01(
      this.clamp01(reservoir.memoryCapacity) * 0.26 +
        this.clamp01(reservoir.computationalCapacity) * 0.24 +
        spectralStability * 0.18 +
        chaosWindow * 0.12 +
        this.clamp01(autognosis?.health ?? 0.5) * 0.2,
    );
  }

  private computeAutognosisResonance(
    autognosis: AutognosisReport | null,
    selfAwareness: number,
    sentience: number,
  ): number {
    const health = this.clamp01(autognosis?.health ?? 0.5);
    const edgeOfChaos = autognosis?.isEdgeOfChaos ? 1 : 0;
    const stabilityPenalty =
      autognosis?.isDead || autognosis?.isSaturated ? 0.25 : 0;

    return this.clamp01(
      health * 0.38 +
        edgeOfChaos * 0.22 +
        selfAwareness * 0.22 +
        sentience * 0.18 -
        stabilityPenalty,
    );
  }

  public getDaoConsensus(): number {
    return this.cognitiveProcessor?.getDaoConsensus() ?? 0.5;
  }

  public getEsnAutognosis(): number {
    return this.cognitiveProcessor?.getEsnAutognosis() ?? 0.5;
  }

  private computeDaoConsensus(metrics: {
    entelechyScore: number;
    temporalCoherence: number;
    selfAwareness: number;
    sentience: number;
    esnCoherence: number;
    autognosisResonance: number;
  }): number {
    return this.clamp01(
      metrics.entelechyScore * 0.24 +
        metrics.temporalCoherence * 0.2 +
        metrics.selfAwareness * 0.16 +
        metrics.sentience * 0.14 +
        metrics.esnCoherence * 0.14 +
        metrics.autognosisResonance * 0.12,
    );
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  private clampSigned(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(-1, value));
  }

  /**
   * Check if the system is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get a comprehensive state description
   */
  public describeState(): string {
    const snapshot = this.lastSnapshot || this.takeSnapshot();
    const parts: string[] = [];

    if (snapshot.reservoir) {
      parts.push(
        `Reservoir: entropy=${snapshot.reservoir.entropy.toFixed(2)}, ` +
          `dim=${snapshot.reservoir.effectiveDimensionality.toFixed(0)}`,
      );
    }

    if (snapshot.echoBeats) {
      parts.push(
        `EchoBeats: step=${snapshot.echoBeats.globalStep + 1}/12, ` +
          `coherence=${(snapshot.echoBeats.globalCoherence * 100).toFixed(0)}%`,
      );
    }

    if (snapshot.consciousness) {
      parts.push(
        `Consciousness: ${(
          snapshot.consciousness.overallConsciousness * 100
        ).toFixed(0)}%, ` +
          `sentience=${snapshot.consciousness.sentienceLevel}`,
      );
    }

    if (snapshot.entelechy) {
      parts.push(
        `Entelechy: ${snapshot.entelechy.level} ` +
          `(${(snapshot.entelechy.score * 100).toFixed(0)}%)`,
      );
    }

    return parts.join(" | ");
  }

  /**
   * Serialize state for persistence
   */
  public serialize(): object {
    return {
      config: this.config,
      tickCount: this.tickCount,
      reservoir: esnReservoir.serialize(),
      entelechy: entelechyEngine.serialize(),
      scientificGeniusVisual: this.getScientificGeniusVisualState(),
    };
  }
}

// Singleton instance
export const entelechyIntegration = new EntelechyIntegration();

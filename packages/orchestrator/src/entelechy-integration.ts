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
export interface CognitiveSnapshot {
  reservoir: ReservoirState | null;
  autognosis: AutognosisReport | null;
  echoBeats: EchoBeatsState | null;
  consciousness: ConsciousnessState | null;
  entelechy: EntelechyState | null;
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

export class EntelechyIntegration extends EventEmitter {
  private config: EntelechyIntegrationConfig;
  private running: boolean = false;
  private backgroundTimer: ReturnType<typeof setInterval> | null = null;
  private tickCount: number = 0;
  private lastSnapshot: CognitiveSnapshot | null = null;

  constructor(config: Partial<EntelechyIntegrationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
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

    return input;
  }

  // ==========================================================================
  // STATE ACCESSORS
  // ==========================================================================

  /**
   * Take a full cognitive snapshot
   */
  public takeSnapshot(): CognitiveSnapshot {
    return {
      reservoir: this.config.enableReservoir ? esnReservoir.getState() : null,
      autognosis: this.config.enableReservoir
        ? esnReservoir.getAutognosisReport()
        : null,
      echoBeats: this.config.enableEchoBeats
        ? echoBeatsEngine.getState()
        : null,
      consciousness: this.config.enableConsciousness
        ? getConsciousnessState()
        : null,
      entelechy: this.config.enableEntelechy
        ? entelechyEngine.getState()
        : null,
      timestamp: Date.now(),
      tickCount: this.tickCount,
    };
  }

  /**
   * Get the latest snapshot
   */
  public getLastSnapshot(): CognitiveSnapshot | null {
    return this.lastSnapshot;
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
    };
  }
}

// Singleton instance
export const entelechyIntegration = new EntelechyIntegration();

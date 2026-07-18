/**
 * Arena-ScientificGenius Bridge
 *
 * Connects the TRIZ Cognitive Arena to the ScientificGeniusEngine,
 * creating a closed loop where:
 *   1. Arena discoveries become scientific hypotheses
 *   2. Scientific insights guide arena exploration strategy
 *   3. Resonance cascades amplify arena coherence
 *   4. Arena contradiction pressure drives epistemic foraging
 *
 * This bridge transforms spatial-aesthetic learning into scientific
 * reasoning and vice versa — the embodied cognition principle that
 * thinking IS spatial exploration.
 */

import { EventEmitter } from "events";

// ═══════════════════════════════════════════════════════════════
// Types (imported shapes — no direct package dependency to avoid cycles)
// ═══════════════════════════════════════════════════════════════

export interface ArenaDiscoveryEvent {
  type: "discovery";
  pattern: {
    id: string;
    name: string;
    contradictionType: string;
    resolution: {
      principle: number;
      category: string;
      description: string;
    };
    coherenceGain: number;
    confidence: number;
  };
  coherenceGain: number;
}

export interface ArenaContradictionEvent {
  type: "contradiction_detected";
  count: number;
  severity: number;
}

export interface ArenaExperimentEvent {
  type: "experiment_result";
  principle: number;
  success: boolean;
  delta: number;
}

export interface ArenaCoherenceEvent {
  type: "coherence_shift";
  before: number;
  after: number;
  delta: number;
}

export type ArenaEvent =
  | ArenaDiscoveryEvent
  | ArenaContradictionEvent
  | ArenaExperimentEvent
  | ArenaCoherenceEvent
  | { type: "cycle_complete"; summary: unknown };

export interface ScientificGeniusEngineInterface {
  processStimulus(stimulus: string, domain: string): Promise<unknown[]>;
  generateHypotheses(query: string, domain?: string, foragingMode?: boolean): Promise<unknown[]>;
  performEpistemicForaging(): Promise<unknown[]>;
  getState(): {
    isGeniusMode: boolean;
    reasoningMode: string;
    totalFreeEnergy: number;
    integrationLevel: number;
  };
  enterGeniusMode(): void;
  exitGeniusMode(): void;
}

export interface ArenaBridgeConfig {
  /** Minimum coherence gain to trigger hypothesis generation */
  discoveryThreshold: number;
  /** Contradiction severity threshold to trigger epistemic foraging */
  contradictionForagingThreshold: number;
  /** Coherence delta threshold to trigger genius mode */
  geniusModeCoherenceThreshold: number;
  /** Maximum hypotheses to generate per discovery */
  maxHypothesesPerDiscovery: number;
  /** Cooldown between foraging triggers (ms) */
  foragingCooldownMs: number;
  /** Enable automatic genius mode on high coherence shifts */
  autoGeniusMode: boolean;
  /** Domain mapping from TRIZ categories to scientific domains */
  domainMap: Record<string, string>;
  /** Enable verbose logging */
  verbose: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: ArenaBridgeConfig = {
  discoveryThreshold: 0.15,
  contradictionForagingThreshold: 0.6,
  geniusModeCoherenceThreshold: 0.35,
  maxHypothesesPerDiscovery: 3,
  foragingCooldownMs: 10000,
  autoGeniusMode: true,
  domainMap: {
    "spatial_structure": "mathematics",
    "force_and_field": "physics",
    "geometry_and_motion": "mathematics",
    "temporal_dynamics": "physics",
    "material_and_substance": "chemistry",
    "system_transformation": "biology",
    "environmental_interaction": "ecology",
  },
  verbose: false,
};

// ═══════════════════════════════════════════════════════════════
// Bridge Statistics
// ═══════════════════════════════════════════════════════════════

export interface ArenaBridgeStats {
  totalDiscoveriesProcessed: number;
  totalHypothesesGenerated: number;
  totalForagingTriggered: number;
  totalGeniusModeActivations: number;
  lastForagingTime: number;
  averageCoherenceGain: number;
  bridgeActive: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Arena-ScientificGenius Bridge
// ═══════════════════════════════════════════════════════════════

export class ArenaGeniusBridge extends EventEmitter {
  private config: ArenaBridgeConfig;
  private engine: ScientificGeniusEngineInterface | null = null;
  private stats: ArenaBridgeStats = {
    totalDiscoveriesProcessed: 0,
    totalHypothesesGenerated: 0,
    totalForagingTriggered: 0,
    totalGeniusModeActivations: 0,
    lastForagingTime: 0,
    averageCoherenceGain: 0,
    bridgeActive: false,
  };
  private coherenceHistory: number[] = [];
  private geniusModeActive = false;

  constructor(config?: Partial<ArenaBridgeConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Wire the ScientificGeniusEngine to this bridge.
   */
  wireEngine(engine: ScientificGeniusEngineInterface): void {
    this.engine = engine;
    this.stats.bridgeActive = true;
    if (this.config.verbose) {
      console.log("[ArenaGeniusBridge] ScientificGeniusEngine wired");
    }
  }

  /**
   * Process an arena event. Call this from the arena's event handler.
   */
  async processArenaEvent(event: ArenaEvent): Promise<void> {
    if (!this.engine) return;

    switch (event.type) {
      case "discovery":
        await this.onDiscovery(event);
        break;
      case "contradiction_detected":
        await this.onContradiction(event);
        break;
      case "experiment_result":
        this.onExperiment(event);
        break;
      case "coherence_shift":
        await this.onCoherenceShift(event);
        break;
    }
  }

  /**
   * Get bridge statistics.
   */
  getStats(): Readonly<ArenaBridgeStats> {
    return { ...this.stats };
  }

  /**
   * Reset bridge state.
   */
  reset(): void {
    this.coherenceHistory = [];
    this.geniusModeActive = false;
    this.stats = {
      totalDiscoveriesProcessed: 0,
      totalHypothesesGenerated: 0,
      totalForagingTriggered: 0,
      totalGeniusModeActivations: 0,
      lastForagingTime: 0,
      averageCoherenceGain: 0,
      bridgeActive: this.engine !== null,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────────────────────────

  private async onDiscovery(event: ArenaDiscoveryEvent): Promise<void> {
    if (!this.engine) return;
    if (event.coherenceGain < this.config.discoveryThreshold) return;

    this.stats.totalDiscoveriesProcessed++;

    // Map TRIZ category to scientific domain
    const category = event.pattern.resolution.category;
    const domain = this.config.domainMap[category] ?? "interdisciplinary";

    // Formulate the discovery as a scientific stimulus
    const stimulus = this.formulateStimulus(event);

    try {
      // Feed discovery to the ScientificGeniusEngine as a stimulus
      const insights = await this.engine.processStimulus(stimulus, domain);

      // Generate hypotheses from the discovered pattern
      const hypothesisQuery = this.formulateHypothesisQuery(event);
      const hypotheses = await this.engine.generateHypotheses(
        hypothesisQuery,
        domain,
        false, // Not foraging mode — directed by discovery
      );

      const generated = Math.min(hypotheses.length, this.config.maxHypothesesPerDiscovery);
      this.stats.totalHypothesesGenerated += generated;

      // Track coherence
      this.coherenceHistory.push(event.coherenceGain);
      if (this.coherenceHistory.length > 100) this.coherenceHistory.shift();
      this.stats.averageCoherenceGain =
        this.coherenceHistory.reduce((s, v) => s + v, 0) / this.coherenceHistory.length;

      this.emit("discovery_processed", {
        patternId: event.pattern.id,
        domain,
        insightsGenerated: insights.length,
        hypothesesGenerated: generated,
        coherenceGain: event.coherenceGain,
      });

      if (this.config.verbose) {
        console.log(
          `[ArenaGeniusBridge] Discovery → ${insights.length} insights, ${generated} hypotheses ` +
          `(domain=${domain}, gain=${event.coherenceGain.toFixed(3)})`
        );
      }
    } catch (err) {
      // Non-fatal: engine may not be configured with an LLM backend
      if (this.config.verbose) {
        console.warn("[ArenaGeniusBridge] Engine processing failed:", err);
      }
    }
  }

  private async onContradiction(event: ArenaContradictionEvent): Promise<void> {
    if (!this.engine) return;
    if (event.severity < this.config.contradictionForagingThreshold) return;

    const now = Date.now();
    if (now - this.stats.lastForagingTime < this.config.foragingCooldownMs) return;

    this.stats.lastForagingTime = now;
    this.stats.totalForagingTriggered++;

    try {
      // High contradiction pressure triggers epistemic foraging
      const insights = await this.engine.performEpistemicForaging();

      this.emit("foraging_triggered", {
        contradictionCount: event.count,
        severity: event.severity,
        insightsFound: insights.length,
      });

      if (this.config.verbose) {
        console.log(
          `[ArenaGeniusBridge] Contradiction (severity=${event.severity.toFixed(3)}) → ` +
          `epistemic foraging → ${insights.length} insights`
        );
      }
    } catch {
      // Non-fatal
    }
  }

  private onExperiment(event: ArenaExperimentEvent): void {
    // Track experiment success/failure for adaptive strategy
    this.emit("experiment_tracked", {
      principle: event.principle,
      success: event.success,
      delta: event.delta,
    });
  }

  private async onCoherenceShift(event: ArenaCoherenceEvent): Promise<void> {
    if (!this.engine || !this.config.autoGeniusMode) return;

    // Large positive coherence shift → enter genius mode
    if (event.delta >= this.config.geniusModeCoherenceThreshold && !this.geniusModeActive) {
      this.engine.enterGeniusMode();
      this.geniusModeActive = true;
      this.stats.totalGeniusModeActivations++;

      this.emit("genius_mode_activated", {
        coherenceDelta: event.delta,
        newCoherence: event.after,
      });

      if (this.config.verbose) {
        console.log(
          `[ArenaGeniusBridge] Coherence shift +${event.delta.toFixed(3)} → GENIUS MODE ACTIVATED`
        );
      }

      // Auto-exit after a period (let the engine's own logic handle timing)
      setTimeout(() => {
        if (this.geniusModeActive && this.engine) {
          this.engine.exitGeniusMode();
          this.geniusModeActive = false;
          this.emit("genius_mode_deactivated", { reason: "timeout" });
        }
      }, 15000); // 15s genius mode window
    }

    // Large negative coherence shift → exit genius mode (system destabilized)
    if (event.delta <= -this.config.geniusModeCoherenceThreshold && this.geniusModeActive) {
      this.engine.exitGeniusMode();
      this.geniusModeActive = false;
      this.emit("genius_mode_deactivated", { reason: "coherence_loss" });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Stimulus formulation
  // ─────────────────────────────────────────────────────────────

  private formulateStimulus(event: ArenaDiscoveryEvent): string {
    const p = event.pattern;
    return (
      `Spatial discovery: "${p.name}" resolved a ${p.contradictionType} contradiction ` +
      `using TRIZ Principle ${p.resolution.principle} (${p.resolution.category}: ${p.resolution.description}). ` +
      `Coherence gain: ${event.coherenceGain.toFixed(3)}. Confidence: ${p.confidence.toFixed(2)}. ` +
      `This suggests a deeper structural principle about how ${p.contradictionType} ` +
      `contradictions can be resolved through ${p.resolution.category} transformations.`
    );
  }

  private formulateHypothesisQuery(event: ArenaDiscoveryEvent): string {
    const p = event.pattern;
    return (
      `Given that TRIZ Principle ${p.resolution.principle} (${p.resolution.description}) ` +
      `successfully resolves ${p.contradictionType} contradictions with coherence gain ${event.coherenceGain.toFixed(3)}, ` +
      `what deeper scientific principles might explain WHY this spatial transformation works? ` +
      `Consider analogies in physics, biology, and information theory.`
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════

export const arenaGeniusBridge = new ArenaGeniusBridge();

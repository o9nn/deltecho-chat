/**
 * Metabolic Avatar Bridge
 *
 * Projects the ConceptualMetabolism system's state into Live2D avatar
 * visual parameters, making DTE's knowledge-processing energy economy
 * visible through the avatar's appearance.
 *
 * Visual mappings:
 * - **Energy level** → overall brightness/saturation of the avatar
 *   (low energy = dimmer, more muted; full energy = vibrant)
 * - **Metabolic phase** → characteristic animation patterns:
 *   - ACTIVE: alert posture, wide eyes, quick micro-movements
 *   - INTEGRATING: thoughtful gaze, slight head tilt, slower movements
 *   - CONSOLIDATING: relaxed, gentle breathing emphasis, soft expression
 *   - RESTING: minimal movement, lowered eyelids, deep slow breathing
 * - **Anabolic balance** → expression warmth:
 *   - Positive (building): slight smile, engaged expression
 *   - Negative (pruning): contemplative, slightly furrowed brow
 * - **Energy crisis** → visible stress indicators:
 *   - Rapid shallow breathing, tense expression, pupil constriction
 * - **Myelination progress** → confidence/fluidity of movement
 *   (more myelinated = smoother, more assured gestures)
 * - **Knowledge density** → depth of gaze
 *   (denser knowledge graph = more focused, penetrating gaze)
 *
 * @see ConceptualMetabolism in @deltecho/core for the source system
 * @see CognitiveAvatarBridge for the primary avatar bridge
 * @see ESNAvatarBridge for reservoir-driven animation
 */
import { EventEmitter } from "events";

// ============================================================
// TYPES
// ============================================================

/**
 * Metabolic visual state input (from ConceptualMetabolism.getVisualState())
 */
export interface MetabolicVisualInput {
  metabolicPhase: "active" | "integrating" | "consolidating" | "resting";
  energyLevel: number; // 0-1
  anabolicBalance: number; // -1 to 1
  isEnergyCrisis: boolean;
  myelinationProgress: number; // 0-1
  knowledgeDensity: number; // 0+
}

/**
 * Avatar parameter deltas produced by the metabolic bridge
 */
export interface MetabolicAvatarDeltas {
  /** Brightness/saturation multiplier (0.5-1.2) */
  vitalityMult: number;
  /** Eye openness modifier (-0.3 to 0.2) */
  eyeOpenDelta: number;
  /** Breathing rate multiplier (0.5-2.0) */
  breathRateMult: number;
  /** Breathing depth multiplier (0.5-1.5) */
  breathDepthMult: number;
  /** Head angle Y (nod) delta in degrees */
  headNodDelta: number;
  /** Head angle Z (tilt) delta in degrees */
  headTiltDelta: number;
  /** Mouth form delta (-0.3 to 0.3; positive = smile) */
  mouthFormDelta: number;
  /** Brow position delta (-0.3 to 0.3; negative = furrow) */
  browDelta: number;
  /** Pupil scale delta (-0.2 to 0.2) */
  pupilDelta: number;
  /** Movement fluidity (0-1; higher = smoother transitions) */
  movementFluidity: number;
  /** Gaze focus intensity (0-1) */
  gazeFocus: number;
  /** Overall animation speed multiplier from metabolic state */
  animSpeedMult: number;
  /** Whether crisis indicators should be active */
  crisisActive: boolean;
}

/**
 * Configuration for the metabolic avatar bridge
 */
export interface MetabolicAvatarBridgeConfig {
  /** How strongly metabolic state affects the avatar (0-1) */
  influence: number;
  /** Smoothing factor for metabolic transitions (0-1; higher = smoother) */
  smoothing: number;
  /** Whether to show energy crisis indicators */
  showCrisis: boolean;
  /** Minimum energy level before dimming starts */
  dimThreshold: number;
  /** Tick rate in Hz */
  tickRateHz: number;
}

export const DEFAULT_METABOLIC_AVATAR_CONFIG: MetabolicAvatarBridgeConfig = {
  influence: 0.6,
  smoothing: 0.85,
  showCrisis: true,
  dimThreshold: 0.3,
  tickRateHz: 30,
};

// ============================================================
// PHASE PROFILES
// ============================================================

interface PhaseProfile {
  eyeOpenDelta: number;
  breathRateMult: number;
  breathDepthMult: number;
  headNodDelta: number;
  headTiltDelta: number;
  animSpeedMult: number;
  gazeFocus: number;
}

const PHASE_PROFILES: Record<string, PhaseProfile> = {
  active: {
    eyeOpenDelta: 0.15,
    breathRateMult: 1.2,
    breathDepthMult: 0.8,
    headNodDelta: 0,
    headTiltDelta: 0,
    animSpeedMult: 1.15,
    gazeFocus: 0.8,
  },
  integrating: {
    eyeOpenDelta: 0.05,
    breathRateMult: 0.9,
    breathDepthMult: 1.0,
    headNodDelta: -2,
    headTiltDelta: 3,
    animSpeedMult: 0.85,
    gazeFocus: 0.6,
  },
  consolidating: {
    eyeOpenDelta: -0.1,
    breathRateMult: 0.7,
    breathDepthMult: 1.3,
    headNodDelta: -3,
    headTiltDelta: 0,
    animSpeedMult: 0.6,
    gazeFocus: 0.3,
  },
  resting: {
    eyeOpenDelta: -0.25,
    breathRateMult: 0.5,
    breathDepthMult: 1.5,
    headNodDelta: -5,
    headTiltDelta: 2,
    animSpeedMult: 0.4,
    gazeFocus: 0.1,
  },
};

// ============================================================
// METABOLIC AVATAR BRIDGE
// ============================================================

export class MetabolicAvatarBridge extends EventEmitter {
  private config: MetabolicAvatarBridgeConfig;
  private currentInput: MetabolicVisualInput = {
    metabolicPhase: "active",
    energyLevel: 1.0,
    anabolicBalance: 0,
    isEnergyCrisis: false,
    myelinationProgress: 0,
    knowledgeDensity: 0,
  };
  private smoothedDeltas: MetabolicAvatarDeltas;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private crisisFlicker: number = 0;

  constructor(config?: Partial<MetabolicAvatarBridgeConfig>) {
    super();
    this.config = { ...DEFAULT_METABOLIC_AVATAR_CONFIG, ...config };
    this.smoothedDeltas = this.neutralDeltas();
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  start(): void {
    if (this.tickInterval) return;
    const intervalMs = Math.round(1000 / this.config.tickRateHz);
    this.tickInterval = setInterval(() => this.tick(), intervalMs);
    this.emit("started");
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.emit("stopped");
  }

  isRunning(): boolean {
    return this.tickInterval !== null;
  }

  /**
   * Advance one metabolic projection frame. Renderer integrations should prefer
   * this method from their native animation ticker so hidden tabs pause cleanly.
   */
  step(): void {
    this.tick();
  }

  // ============================================================
  // INPUT
  // ============================================================

  /**
   * Feed metabolic visual state from ConceptualMetabolism.getVisualState()
   */
  feedMetabolicState(input: MetabolicVisualInput): void {
    this.currentInput = { ...input };
  }

  // ============================================================
  // OUTPUT
  // ============================================================

  /**
   * Get the current smoothed avatar parameter deltas
   */
  getDeltas(): MetabolicAvatarDeltas {
    return { ...this.smoothedDeltas };
  }

  /**
   * Get raw (unsmoothed) target deltas for the current metabolic state
   */
  getTargetDeltas(): MetabolicAvatarDeltas {
    return this.computeTargetDeltas();
  }

  // ============================================================
  // INTERNAL TICK
  // ============================================================

  private tick(): void {
    const target = this.computeTargetDeltas();
    this.smoothToward(target);

    // Crisis flicker effect
    if (this.currentInput.isEnergyCrisis && this.config.showCrisis) {
      this.crisisFlicker += 0.3;
      const flicker = Math.sin(this.crisisFlicker * 5) * 0.05;
      this.smoothedDeltas.eyeOpenDelta += flicker;
      this.smoothedDeltas.browDelta += flicker * 0.5;
    }

    this.emit("deltas_updated", this.smoothedDeltas);
  }

  private computeTargetDeltas(): MetabolicAvatarDeltas {
    const input = this.currentInput;
    const influence = this.config.influence;
    const phase = PHASE_PROFILES[input.metabolicPhase] ?? PHASE_PROFILES.active;

    // Energy → vitality
    const vitalityMult = this.mapRange(input.energyLevel, 0, 1, 0.5, 1.2);

    // Anabolic balance → expression warmth
    const mouthFormDelta = input.anabolicBalance * 0.2 * influence;
    const browDelta =
      input.anabolicBalance < 0
        ? input.anabolicBalance * 0.15 * influence // Furrow when catabolic
        : input.anabolicBalance * 0.05 * influence; // Slight raise when anabolic

    // Myelination → movement fluidity
    const movementFluidity = 0.3 + input.myelinationProgress * 0.7;

    // Knowledge density → gaze focus (capped at density=5)
    const densityNorm = Math.min(1, input.knowledgeDensity / 5);
    const gazeFocus = phase.gazeFocus * (0.5 + densityNorm * 0.5);

    // Energy crisis → stress indicators
    const crisisActive = input.isEnergyCrisis && this.config.showCrisis;
    const crisisPupilDelta = crisisActive ? -0.15 : 0;
    const crisisBreathMult = crisisActive ? 1.8 : 1.0;

    // Dimming when energy is low
    const dimFactor =
      input.energyLevel < this.config.dimThreshold
        ? input.energyLevel / this.config.dimThreshold
        : 1.0;

    return {
      vitalityMult: vitalityMult * dimFactor,
      eyeOpenDelta: phase.eyeOpenDelta * influence,
      breathRateMult: phase.breathRateMult * crisisBreathMult,
      breathDepthMult: phase.breathDepthMult,
      headNodDelta: phase.headNodDelta * influence,
      headTiltDelta: phase.headTiltDelta * influence,
      mouthFormDelta,
      browDelta,
      pupilDelta: crisisPupilDelta,
      movementFluidity,
      gazeFocus,
      animSpeedMult: phase.animSpeedMult,
      crisisActive,
    };
  }

  private smoothToward(target: MetabolicAvatarDeltas): void {
    const s = this.config.smoothing;
    const inv = 1 - s;

    this.smoothedDeltas.vitalityMult =
      this.smoothedDeltas.vitalityMult * s + target.vitalityMult * inv;
    this.smoothedDeltas.eyeOpenDelta =
      this.smoothedDeltas.eyeOpenDelta * s + target.eyeOpenDelta * inv;
    this.smoothedDeltas.breathRateMult =
      this.smoothedDeltas.breathRateMult * s + target.breathRateMult * inv;
    this.smoothedDeltas.breathDepthMult =
      this.smoothedDeltas.breathDepthMult * s + target.breathDepthMult * inv;
    this.smoothedDeltas.headNodDelta =
      this.smoothedDeltas.headNodDelta * s + target.headNodDelta * inv;
    this.smoothedDeltas.headTiltDelta =
      this.smoothedDeltas.headTiltDelta * s + target.headTiltDelta * inv;
    this.smoothedDeltas.mouthFormDelta =
      this.smoothedDeltas.mouthFormDelta * s + target.mouthFormDelta * inv;
    this.smoothedDeltas.browDelta =
      this.smoothedDeltas.browDelta * s + target.browDelta * inv;
    this.smoothedDeltas.pupilDelta =
      this.smoothedDeltas.pupilDelta * s + target.pupilDelta * inv;
    this.smoothedDeltas.movementFluidity =
      this.smoothedDeltas.movementFluidity * s + target.movementFluidity * inv;
    this.smoothedDeltas.gazeFocus =
      this.smoothedDeltas.gazeFocus * s + target.gazeFocus * inv;
    this.smoothedDeltas.animSpeedMult =
      this.smoothedDeltas.animSpeedMult * s + target.animSpeedMult * inv;
    this.smoothedDeltas.crisisActive = target.crisisActive;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private neutralDeltas(): MetabolicAvatarDeltas {
    return {
      vitalityMult: 1.0,
      eyeOpenDelta: 0,
      breathRateMult: 1.0,
      breathDepthMult: 1.0,
      headNodDelta: 0,
      headTiltDelta: 0,
      mouthFormDelta: 0,
      browDelta: 0,
      pupilDelta: 0,
      movementFluidity: 0.5,
      gazeFocus: 0.5,
      animSpeedMult: 1.0,
      crisisActive: false,
    };
  }

  private mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
  ): number {
    const clamped = Math.max(inMin, Math.min(inMax, value));
    return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
  }

  reset(): void {
    this.currentInput = {
      metabolicPhase: "active",
      energyLevel: 1.0,
      anabolicBalance: 0,
      isEnergyCrisis: false,
      myelinationProgress: 0,
      knowledgeDensity: 0,
    };
    this.smoothedDeltas = this.neutralDeltas();
    this.crisisFlicker = 0;
  }

  getConfig(): MetabolicAvatarBridgeConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<MetabolicAvatarBridgeConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}

// Singleton
export const metabolicAvatarBridge = new MetabolicAvatarBridge();

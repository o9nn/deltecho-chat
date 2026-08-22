/**
 * Self-Model Avatar Feedback — Loop 4 (perceive → correct → self-model)
 *
 * This module closes the autognosis loop through the face. It:
 * 1. Records the INTENDED expression projection (from projectDTEchoCognitiveState)
 * 2. Samples the ACTUAL rendered Cubism parameter state after the frame
 * 3. Computes the correction delta (predicted vs. actual)
 * 4. Feeds (predicted, actual) pairs into the self-model training pipeline
 * 5. Calibrates the projection law so the next cycle is more accurate
 *
 * The avatar is therefore not decoration: it is one of DTE's sensoria —
 * it perceives its own expression and refines its self-image accordingly.
 *
 * AAR Mapping:
 *   Arena  = ESN reservoir state + endocrine vector
 *   Agent  = projectDTEchoCognitiveState readout → param deltas
 *   Relation = this perceive→correct→self-model loop (Loop 4)
 *
 * @see cognitive-wiring.md Loop 4 specification
 * @see SelfModelTrainingGenerator in @deltecho/core
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core/logger";

const log = getLogger("@deltecho/avatar/SelfModelAvatarFeedback");

// ============================================================
// TYPES
// ============================================================

/** A snapshot of the avatar's Cubism parameter state at a given moment. */
export interface CubismParamSnapshot {
  /** Timestamp of the snapshot */
  timestamp: number;
  /** Map of Cubism parameter IDs to their values */
  params: Record<string, number>;
}

/** A (predicted, actual) pair for self-model training. */
export interface ExpressionExperience {
  /** The cognitive mode that generated the prediction */
  cognitiveMode: string;
  /** The intended param state from the projection law */
  predicted: CubismParamSnapshot;
  /** The actual rendered param state sampled from the model */
  actual: CubismParamSnapshot;
  /** Per-parameter correction deltas (actual - predicted) */
  delta: Record<string, number>;
  /** L2 norm of the delta vector — overall expression error */
  errorMagnitude: number;
  /** Whether this experience triggered a calibration update */
  triggeredCalibration: boolean;
}

/** Calibration state for the projection law. */
export interface ProjectionCalibration {
  /** Per-parameter bias corrections learned from experience */
  biasCorrections: Record<string, number>;
  /** Exponential moving average of error magnitude */
  meanError: number;
  /** Number of experiences processed */
  experienceCount: number;
  /** Self-model accuracy estimate (0..1, higher = more accurate) */
  selfModelAccuracy: number;
  /** Last calibration timestamp */
  lastCalibrationTime: number;
}

/** Configuration for the feedback loop. */
export interface SelfModelFeedbackConfig {
  /** Minimum error magnitude to trigger a calibration update */
  calibrationThreshold: number;
  /** Learning rate for bias correction updates */
  learningRate: number;
  /** EMA decay factor for mean error tracking */
  errorDecay: number;
  /** Maximum number of experiences to retain in the ring buffer */
  maxExperienceBuffer: number;
  /** Whether to emit training events for external consumers */
  emitTrainingEvents: boolean;
  /** Enable verbose debug logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: SelfModelFeedbackConfig = {
  calibrationThreshold: 0.05,
  learningRate: 0.08,
  errorDecay: 0.92,
  maxExperienceBuffer: 128,
  emitTrainingEvents: true,
  verbose: false,
};

// ============================================================
// SELF-MODEL AVATAR FEEDBACK
// ============================================================

/**
 * Implements the perceive→correct→self-model loop (Loop 4) for the
 * Live2D Cubism avatar. This makes the avatar autognostic: it learns
 * to express DTE's cognitive state more accurately over time by
 * comparing intended projections against actual rendered parameters.
 */
export class SelfModelAvatarFeedback extends EventEmitter {
  private config: SelfModelFeedbackConfig;
  private calibration: ProjectionCalibration;
  private experienceBuffer: ExpressionExperience[] = [];
  private pendingPrediction: CubismParamSnapshot | null = null;
  private pendingMode: string = "Idle";

  constructor(config: Partial<SelfModelFeedbackConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.calibration = {
      biasCorrections: {},
      meanError: 0,
      experienceCount: 0,
      selfModelAccuracy: 0.5, // Start at 50% — no prior knowledge
      lastCalibrationTime: Date.now(),
    };
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  /**
   * Phase 1: Record the INTENDED expression projection.
   * Call this immediately after projectDTEchoCognitiveState produces
   * the target param deltas, before they are applied to the model.
   */
  public recordIntendedProjection(
    params: Record<string, number>,
    cognitiveMode: string,
  ): void {
    this.pendingPrediction = {
      timestamp: Date.now(),
      params: { ...params },
    };
    this.pendingMode = cognitiveMode;
    this.dlog(
      `Recorded intended projection (${
        Object.keys(params).length
      } params, mode=${cognitiveMode})`,
    );
  }

  /**
   * Phase 2: Sample the ACTUAL rendered Cubism parameter state.
   * Call this after the frame has been rendered and the model's
   * parameters have settled (typically on the next tick).
   *
   * This triggers the full perceive→correct→self-model pipeline.
   */
  public sampleActualState(
    actualParams: Record<string, number>,
  ): ExpressionExperience | null {
    if (!this.pendingPrediction) {
      this.dlog("No pending prediction to compare against — skipping.");
      return null;
    }

    const actual: CubismParamSnapshot = {
      timestamp: Date.now(),
      params: { ...actualParams },
    };

    // Phase 3: Compute correction delta
    const experience = this.computeExperience(
      this.pendingPrediction,
      actual,
      this.pendingMode,
    );

    // Phase 4: Feed into self-model training
    this.recordExperience(experience);

    // Phase 5: Calibrate if error exceeds threshold
    if (experience.errorMagnitude >= this.config.calibrationThreshold) {
      this.calibrateProjectionLaw(experience);
      experience.triggeredCalibration = true;
    }

    // Clear the pending prediction
    this.pendingPrediction = null;

    return experience;
  }

  /**
   * Apply learned bias corrections to a set of target params.
   * Call this before writing params to the renderer to benefit from
   * the calibrated projection law.
   */
  public applyCalibration(
    params: Record<string, number>,
  ): Record<string, number> {
    const corrected: Record<string, number> = {};
    for (const [key, value] of Object.entries(params)) {
      const bias = this.calibration.biasCorrections[key] || 0;
      corrected[key] = value + bias;
    }
    return corrected;
  }

  /**
   * Get the current calibration state (for telemetry / self-model).
   */
  public getCalibration(): Readonly<ProjectionCalibration> {
    return { ...this.calibration };
  }

  /**
   * Get the self-model accuracy estimate (0..1).
   * This is the avatar's confidence in its own expression fidelity.
   */
  public getSelfModelAccuracy(): number {
    return this.calibration.selfModelAccuracy;
  }

  /**
   * Get recent experiences for inspection or external training.
   */
  public getRecentExperiences(count: number = 10): ExpressionExperience[] {
    return this.experienceBuffer.slice(-count);
  }

  /**
   * Describe the feedback loop's current state.
   */
  public describeState(): string {
    const c = this.calibration;
    return (
      `SelfModel: accuracy=${(c.selfModelAccuracy * 100).toFixed(1)}%, ` +
      `meanError=${c.meanError.toFixed(4)}, ` +
      `experiences=${c.experienceCount}, ` +
      `biasParams=${Object.keys(c.biasCorrections).length}`
    );
  }

  // ----------------------------------------------------------
  // INTERNAL
  // ----------------------------------------------------------

  /** Compute the (predicted, actual) experience with delta and error. */
  private computeExperience(
    predicted: CubismParamSnapshot,
    actual: CubismParamSnapshot,
    mode: string,
  ): ExpressionExperience {
    const delta: Record<string, number> = {};
    let sumSquared = 0;
    let paramCount = 0;

    // Compute delta for all params present in the prediction
    for (const [key, predictedValue] of Object.entries(predicted.params)) {
      const actualValue = actual.params[key];
      if (actualValue !== undefined) {
        const d = actualValue - predictedValue;
        delta[key] = d;
        sumSquared += d * d;
        paramCount++;
      }
    }

    const errorMagnitude =
      paramCount > 0
        ? Math.sqrt(sumSquared / paramCount) // RMS error
        : 0;

    return {
      cognitiveMode: mode,
      predicted,
      actual,
      delta,
      errorMagnitude,
      triggeredCalibration: false,
    };
  }

  /** Record the experience and update running statistics. */
  private recordExperience(experience: ExpressionExperience): void {
    this.experienceBuffer.push(experience);
    if (this.experienceBuffer.length > this.config.maxExperienceBuffer) {
      this.experienceBuffer.shift();
    }

    this.calibration.experienceCount++;

    // Update EMA of error magnitude
    this.calibration.meanError =
      this.calibration.meanError * this.config.errorDecay +
      experience.errorMagnitude * (1 - this.config.errorDecay);

    // Self-model accuracy is the complement of normalized mean error
    // (clamped so it asymptotes toward 1 as error → 0)
    this.calibration.selfModelAccuracy = Math.max(
      0,
      Math.min(1, 1 - this.calibration.meanError * 2),
    );

    // Emit for external consumers (e.g., SelfModelTrainingGenerator)
    if (this.config.emitTrainingEvents) {
      this.emit("experience", experience);
      this.emit("self-model-update", {
        accuracy: this.calibration.selfModelAccuracy,
        meanError: this.calibration.meanError,
        experienceCount: this.calibration.experienceCount,
      });
    }
  }

  /**
   * Calibrate the projection law by adjusting per-parameter bias corrections.
   * Uses a simple gradient step: bias += learningRate * delta.
   * This is the "backward pass" of the mesh-painter in Loop 4.
   */
  private calibrateProjectionLaw(experience: ExpressionExperience): void {
    const lr = this.config.learningRate;

    for (const [key, deltaValue] of Object.entries(experience.delta)) {
      const currentBias = this.calibration.biasCorrections[key] || 0;
      // Gradient step toward the actual value (reduce prediction error)
      this.calibration.biasCorrections[key] = currentBias + lr * deltaValue;
    }

    this.calibration.lastCalibrationTime = Date.now();

    this.dlog(
      `Calibrated projection law: error=${experience.errorMagnitude.toFixed(
        4,
      )}, ` +
        `accuracy=${(this.calibration.selfModelAccuracy * 100).toFixed(1)}%`,
    );

    this.emit("calibration", {
      biasCorrections: { ...this.calibration.biasCorrections },
      selfModelAccuracy: this.calibration.selfModelAccuracy,
      triggeringError: experience.errorMagnitude,
    });
  }

  /** Debug log gated behind verbose flag. */
  private dlog(message: string, ...context: unknown[]): void {
    if (this.config.verbose) {
      log.debug(message, { context });
    }
  }
}

// Singleton instance
export const selfModelAvatarFeedback = new SelfModelAvatarFeedback();

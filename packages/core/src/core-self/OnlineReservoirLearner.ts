/**
 * OnlineReservoirLearner
 *
 * Implements online (incremental) learning for the CognitiveReadout layer
 * of the Echo State Network. Instead of batch ridge regression, this uses
 * Recursive Least Squares (RLS) to update readout weights from real-time
 * interaction feedback.
 *
 * Architecture (maps to AAR):
 *   Arena (Reservoir) → produces state vectors from input
 *   Agent (Readout)   → maps state to output (this is what we train)
 *   Relation (Self)   → the RLS covariance matrix P tracks the self-model
 *
 * The RLS update rule:
 *   K_n = P_{n-1} x_n / (λ + x_n^T P_{n-1} x_n)
 *   W_n = W_{n-1} + K_n (y_n - W_{n-1}^T x_n)^T
 *   P_n = (P_{n-1} - K_n x_n^T P_{n-1}) / λ
 *
 * Where:
 *   W = readout weights (Agent)
 *   P = inverse correlation matrix (Relation/Self)
 *   x = reservoir state (Arena)
 *   y = target output
 *   λ = forgetting factor (0.99 = slow forget, 0.9 = fast adapt)
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger.js";

const log = getLogger("deep-tree-echo-core/OnlineReservoirLearner");

// ─── Types ─────────────────────────────────────────────────────

export interface OnlineLearnerConfig {
  /** Reservoir state dimension (input to readout) */
  reservoirDim: number;
  /** Output dimension */
  outputDim: number;
  /** RLS forgetting factor (0.9-1.0, lower = faster adaptation) */
  forgettingFactor: number;
  /** Initial P matrix diagonal value (regularization) */
  initialPDiag: number;
  /** Minimum update magnitude to apply (noise gate) */
  minUpdateMagnitude: number;
  /** Maximum weight magnitude (stability clamp) */
  maxWeightMagnitude: number;
  /** Enable momentum (exponential moving average of gradients) */
  enableMomentum: boolean;
  /** Momentum coefficient (0-1) */
  momentumCoeff: number;
  /** Learning rate scale factor */
  learningRateScale: number;
  /** Maximum number of updates to store in history */
  maxHistorySize: number;
}

const DEFAULT_CONFIG: OnlineLearnerConfig = {
  reservoirDim: 256,
  outputDim: 64,
  forgettingFactor: 0.995,
  initialPDiag: 100.0,
  minUpdateMagnitude: 1e-8,
  maxWeightMagnitude: 10.0,
  enableMomentum: true,
  momentumCoeff: 0.9,
  learningRateScale: 1.0,
  maxHistorySize: 1000,
};

export interface FeedbackSignal {
  /** The reservoir state at the time of the interaction */
  reservoirState: Float64Array;
  /** The target output (what the response should have been) */
  targetOutput: Float64Array;
  /** Reward signal (-1 to 1, from user feedback or self-evaluation) */
  reward: number;
  /** Emotional valence at the time */
  valence: number;
  /** Timestamp */
  timestamp: number;
  /** Source of feedback */
  source: "user" | "self-evaluation" | "coherence" | "reservoir";
}

export interface LearningUpdate {
  /** Update index */
  index: number;
  /** Weight change magnitude (Frobenius norm) */
  weightChangeMagnitude: number;
  /** Prediction error magnitude */
  predictionError: number;
  /** Effective learning rate */
  effectiveLearningRate: number;
  /** Reward signal */
  reward: number;
  /** Timestamp */
  timestamp: number;
}

export interface LearnerState {
  /** Current readout weights (flattened row-major) */
  weights: Float64Array;
  /** Inverse correlation matrix P (flattened row-major) */
  pMatrix: Float64Array;
  /** Momentum buffer (flattened row-major) */
  momentum: Float64Array;
  /** Total number of updates applied */
  totalUpdates: number;
  /** Cumulative reward */
  cumulativeReward: number;
  /** Average prediction error */
  avgPredictionError: number;
}

// ─── Learner ───────────────────────────────────────────────────

export class OnlineReservoirLearner extends EventEmitter {
  private config: OnlineLearnerConfig;

  // Core RLS state
  private weights: Float64Array; // W: [outputDim x reservoirDim]
  private pMatrix: Float64Array; // P: [reservoirDim x reservoirDim]
  private momentum: Float64Array; // M: [outputDim x reservoirDim]

  // Statistics
  private totalUpdates = 0;
  private cumulativeReward = 0;
  private predictionErrors: number[] = [];
  private updateHistory: LearningUpdate[] = [];

  constructor(config: Partial<OnlineLearnerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    OnlineReservoirLearner.validateConfig(this.config);

    const { reservoirDim, outputDim, initialPDiag } = this.config;

    // Initialize weights to small random values
    this.weights = new Float64Array(outputDim * reservoirDim);
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.01;
    }

    // Initialize P as scaled identity matrix
    this.pMatrix = new Float64Array(reservoirDim * reservoirDim);
    for (let i = 0; i < reservoirDim; i++) {
      this.pMatrix[i * reservoirDim + i] = initialPDiag;
    }

    // Initialize momentum buffer
    this.momentum = new Float64Array(outputDim * reservoirDim);
  }

  private static validateConfig(config: OnlineLearnerConfig): void {
    const positiveInteger = (value: number) =>
      Number.isSafeInteger(value) && value > 0;
    if (
      !positiveInteger(config.reservoirDim) ||
      !positiveInteger(config.outputDim) ||
      !positiveInteger(config.reservoirDim * config.outputDim) ||
      !positiveInteger(config.reservoirDim * config.reservoirDim) ||
      !Number.isFinite(config.forgettingFactor) ||
      config.forgettingFactor < 0.9 ||
      config.forgettingFactor > 1 ||
      !Number.isFinite(config.initialPDiag) ||
      config.initialPDiag <= 0 ||
      !Number.isFinite(config.minUpdateMagnitude) ||
      config.minUpdateMagnitude < 0 ||
      !Number.isFinite(config.maxWeightMagnitude) ||
      config.maxWeightMagnitude <= 0 ||
      typeof config.enableMomentum !== "boolean" ||
      !Number.isFinite(config.momentumCoeff) ||
      config.momentumCoeff < 0 ||
      config.momentumCoeff > 1 ||
      !Number.isFinite(config.learningRateScale) ||
      config.learningRateScale < 0 ||
      !Number.isSafeInteger(config.maxHistorySize) ||
      config.maxHistorySize < 0
    ) {
      throw new Error("Invalid online learner configuration");
    }
  }

  /** Validate raw JSON numbers before coercion, then copy a complete candidate. */
  static parseState(
    state: unknown,
    dimensions: { reservoirDim: number; outputDim: number },
  ): LearnerState {
    const { reservoirDim, outputDim } = dimensions;
    if (
      !Number.isSafeInteger(reservoirDim) ||
      reservoirDim <= 0 ||
      !Number.isSafeInteger(outputDim) ||
      outputDim <= 0 ||
      !Number.isSafeInteger(reservoirDim * outputDim) ||
      !Number.isSafeInteger(reservoirDim * reservoirDim) ||
      !state ||
      typeof state !== "object"
    ) {
      throw new Error("Invalid online learner state dimensions");
    }
    const candidate = state as Record<string, unknown>;
    const copyVector = (name: string, length: number): Float64Array => {
      const values = candidate[name];
      if (
        !(values instanceof Float64Array || Array.isArray(values)) ||
        values.length !== length
      ) {
        throw new Error(`Invalid online learner ${name} shape`);
      }
      // Indexed validation also rejects sparse arrays and JSON null entries.
      for (let i = 0; i < length; i++) {
        if (typeof values[i] !== "number" || !Number.isFinite(values[i])) {
          throw new Error(`Online learner ${name} must contain finite numbers`);
        }
      }
      return new Float64Array(values);
    };
    const weights = copyVector("weights", outputDim * reservoirDim);
    const pMatrix = copyVector("pMatrix", reservoirDim * reservoirDim);
    const momentum = copyVector("momentum", outputDim * reservoirDim);
    if (
      !Number.isFinite(weights.reduce((sum, value) => sum + value * value, 0))
    ) {
      throw new Error("Online learner weight norm must remain finite");
    }
    const { totalUpdates, cumulativeReward, avgPredictionError } = candidate;
    if (
      typeof totalUpdates !== "number" ||
      !Number.isSafeInteger(totalUpdates) ||
      totalUpdates < 0 ||
      typeof cumulativeReward !== "number" ||
      !Number.isFinite(cumulativeReward) ||
      typeof avgPredictionError !== "number" ||
      !Number.isFinite(avgPredictionError) ||
      avgPredictionError < 0
    ) {
      throw new Error("Invalid online learner state statistics");
    }
    return {
      weights,
      pMatrix,
      momentum,
      totalUpdates,
      cumulativeReward,
      avgPredictionError,
    };
  }

  /**
   * Apply a single RLS update from a feedback signal.
   * This is the core online learning step.
   */
  update(feedback: FeedbackSignal): LearningUpdate {
    const { reservoirDim, outputDim, forgettingFactor, learningRateScale } =
      this.config;
    const x = feedback.reservoirState;
    const y = feedback.targetOutput;

    // Validate dimensions
    if (x.length !== reservoirDim) {
      throw new Error(
        `Reservoir state dim ${x.length} != expected ${reservoirDim}`,
      );
    }
    if (y.length !== outputDim) {
      throw new Error(`Target output dim ${y.length} != expected ${outputDim}`);
    }
    if (
      !x.every(Number.isFinite) ||
      !y.every(Number.isFinite) ||
      !Number.isFinite(feedback.reward) ||
      !Number.isFinite(feedback.valence) ||
      !Number.isFinite(feedback.timestamp) ||
      feedback.timestamp < 0
    ) {
      throw new Error("Online feedback must contain finite numeric evidence");
    }

    // Step 1: Compute P * x
    const Px = new Float64Array(reservoirDim);
    for (let i = 0; i < reservoirDim; i++) {
      let sum = 0;
      for (let j = 0; j < reservoirDim; j++) {
        sum += this.pMatrix[i * reservoirDim + j] * x[j];
      }
      Px[i] = sum;
    }

    // Step 2: Compute denominator: λ + x^T P x
    let xPx = 0;
    for (let i = 0; i < reservoirDim; i++) {
      xPx += x[i] * Px[i];
    }
    const denom = forgettingFactor + xPx;
    if (!Number.isFinite(denom) || denom <= 0) {
      throw new Error("RLS denominator must be finite and positive");
    }

    // Step 3: Compute Kalman gain: K = Px / denom
    const K = new Float64Array(reservoirDim);
    for (let i = 0; i < reservoirDim; i++) {
      K[i] = Px[i] / denom;
    }

    // Step 4: Compute prediction error: e = y - W^T x
    const prediction = new Float64Array(outputDim);
    for (let i = 0; i < outputDim; i++) {
      let sum = 0;
      for (let j = 0; j < reservoirDim; j++) {
        sum += this.weights[i * reservoirDim + j] * x[j];
      }
      prediction[i] = sum;
    }

    const error = new Float64Array(outputDim);
    let errorMag = 0;
    for (let i = 0; i < outputDim; i++) {
      error[i] = y[i] - prediction[i];
      errorMag += error[i] * error[i];
    }
    errorMag = Math.sqrt(errorMag);

    // Step 5: Scale by reward and learning rate
    const rewardScale = 0.5 + 0.5 * Math.max(-1, Math.min(1, feedback.reward));
    const effectiveLR = learningRateScale * rewardScale;

    // Step 6: Update weights: W += lr * K * e^T
    // Stage all learned state: overflow must not partially commit an update.
    const weights = new Float64Array(this.weights);
    const momentum = new Float64Array(this.momentum);
    const pMatrix = new Float64Array(this.pMatrix.length);
    let weightChangeMag = 0;
    for (let i = 0; i < outputDim; i++) {
      for (let j = 0; j < reservoirDim; j++) {
        const delta = effectiveLR * K[j] * error[i];

        if (this.config.enableMomentum) {
          const idx = i * reservoirDim + j;
          momentum[idx] = this.config.momentumCoeff * momentum[idx] + delta;
          weights[idx] += momentum[idx];
        } else {
          weights[i * reservoirDim + j] += delta;
        }

        weightChangeMag += delta * delta;
      }
    }
    weightChangeMag = Math.sqrt(weightChangeMag);

    // Step 7: Clamp weights for stability
    // Check before clamping: Infinity is not valid evidence at the clamp bound.
    if (
      !weights.every(Number.isFinite) ||
      !momentum.every(Number.isFinite) ||
      !Number.isFinite(errorMag) ||
      !Number.isFinite(weightChangeMag) ||
      !Number.isFinite(effectiveLR)
    ) {
      throw new Error("RLS update must remain finite");
    }
    this.clampWeights(weights);
    if (
      !Number.isFinite(weights.reduce((sum, value) => sum + value * value, 0))
    ) {
      throw new Error("RLS weight norm must remain finite");
    }

    // Step 8: Update P matrix: P = (P - K x^T P) / λ
    // This is the most expensive step: O(reservoirDim^2)
    for (let i = 0; i < reservoirDim; i++) {
      for (let j = 0; j < reservoirDim; j++) {
        pMatrix[i * reservoirDim + j] =
          (this.pMatrix[i * reservoirDim + j] - K[i] * Px[j]) /
          forgettingFactor;
      }
    }

    // Update statistics
    const totalUpdates = this.totalUpdates + 1;
    const cumulativeReward = this.cumulativeReward + feedback.reward;
    const predictionErrors = [...this.predictionErrors, errorMag].slice(-100);
    if (
      !pMatrix.every(Number.isFinite) ||
      !Number.isSafeInteger(totalUpdates) ||
      !Number.isFinite(cumulativeReward) ||
      !Number.isFinite(predictionErrors.reduce((a, b) => a + b, 0))
    ) {
      throw new Error("RLS state and statistics must remain finite");
    }

    const update: LearningUpdate = {
      index: totalUpdates,
      weightChangeMagnitude: weightChangeMag,
      predictionError: errorMag,
      effectiveLearningRate: effectiveLR,
      reward: feedback.reward,
      timestamp: feedback.timestamp,
    };

    // Store in history
    const updateHistory = [...this.updateHistory, update];
    if (updateHistory.length > this.config.maxHistorySize) {
      updateHistory.shift();
    }

    // Commit only after every candidate array and statistic is validated.
    this.weights = weights;
    this.pMatrix = pMatrix;
    this.momentum = momentum;
    this.totalUpdates = totalUpdates;
    this.cumulativeReward = cumulativeReward;
    this.predictionErrors = predictionErrors;
    this.updateHistory = updateHistory;
    this.emit("update", update);

    if (this.totalUpdates % 100 === 0) {
      log.info(
        `RLS update #${this.totalUpdates}: err=${errorMag.toFixed(
          4,
        )}, ΔW=${weightChangeMag.toFixed(6)}, reward=${feedback.reward.toFixed(
          2,
        )}`,
      );
    }

    return update;
  }

  /**
   * Compute the readout (forward pass) without learning.
   */
  predict(reservoirState: Float64Array): Float64Array {
    const { reservoirDim, outputDim } = this.config;
    const output = new Float64Array(outputDim);

    for (let i = 0; i < outputDim; i++) {
      let sum = 0;
      for (let j = 0; j < reservoirDim; j++) {
        sum += this.weights[i * reservoirDim + j] * reservoirState[j];
      }
      output[i] = sum;
    }

    return output;
  }

  /**
   * Clamp weights to prevent instability.
   */
  private clampWeights(weights: Float64Array): void {
    const max = this.config.maxWeightMagnitude;
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] > max) weights[i] = max;
      if (weights[i] < -max) weights[i] = -max;
    }
  }

  /**
   * Get the current average prediction error.
   */
  getAvgPredictionError(): number {
    if (this.predictionErrors.length === 0) return 0;
    return (
      this.predictionErrors.reduce((a, b) => a + b, 0) /
      this.predictionErrors.length
    );
  }

  /**
   * Get the weight matrix norm (Frobenius).
   */
  getWeightNorm(): number {
    let sum = 0;
    for (let i = 0; i < this.weights.length; i++) {
      sum += this.weights[i] * this.weights[i];
    }
    return Math.sqrt(sum);
  }

  /**
   * Serialize the learner state for persistence.
   */
  serialize(): LearnerState {
    return OnlineReservoirLearner.parseState(
      {
        weights: this.weights,
        pMatrix: this.pMatrix,
        momentum: this.momentum,
        totalUpdates: this.totalUpdates,
        cumulativeReward: this.cumulativeReward,
        avgPredictionError: this.getAvgPredictionError(),
      },
      this.config,
    );
  }

  /**
   * Restore from serialized state.
   */
  deserialize(state: LearnerState): void {
    OnlineReservoirLearner.validateConfig(this.config);
    const candidate = OnlineReservoirLearner.parseState(state, this.config);
    // The legacy checkpoint stores an average, not its original error history.
    const predictionErrors =
      candidate.totalUpdates > 0 ? [candidate.avgPredictionError] : [];
    this.weights = candidate.weights;
    this.pMatrix = candidate.pMatrix;
    this.momentum = candidate.momentum;
    this.totalUpdates = candidate.totalUpdates;
    this.cumulativeReward = candidate.cumulativeReward;
    this.predictionErrors = predictionErrors;
    this.updateHistory = [];
  }

  /**
   * Get output-major readout weights [outputDim x reservoirDim].
   */
  getWeights(): Float64Array {
    return new Float64Array(this.weights);
  }

  /** Get the configured weight dimensions without exposing mutable config. */
  getDimensions(): { reservoirDim: number; outputDim: number } {
    return {
      reservoirDim: this.config.reservoirDim,
      outputDim: this.config.outputDim,
    };
  }

  /**
   * Get the update history.
   */
  getUpdateHistory(): LearningUpdate[] {
    return [...this.updateHistory];
  }

  /**
   * Get summary statistics.
   */
  getStats(): {
    totalUpdates: number;
    cumulativeReward: number;
    avgPredictionError: number;
    weightNorm: number;
    avgReward: number;
  } {
    return {
      totalUpdates: this.totalUpdates,
      cumulativeReward: this.cumulativeReward,
      avgPredictionError: this.getAvgPredictionError(),
      weightNorm: this.getWeightNorm(),
      avgReward:
        this.totalUpdates > 0 ? this.cumulativeReward / this.totalUpdates : 0,
    };
  }

  /**
   * Runtime mutator: update forgetting factor for adaptation speed.
   * Used by SelfModificationEngine ENACTION phase.
   */
  setForgettingFactor(factor: number): void {
    if (!Number.isFinite(factor)) {
      throw new Error("Forgetting factor must be finite");
    }
    this.config.forgettingFactor = Math.max(0.9, Math.min(0.9999, factor));
  }

  /**
   * Reset the learner to initial state.
   */
  reset(): void {
    const { reservoirDim, outputDim: _outputDim, initialPDiag } = this.config;

    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.01;
    }

    this.pMatrix.fill(0);
    for (let i = 0; i < reservoirDim; i++) {
      this.pMatrix[i * reservoirDim + i] = initialPDiag;
    }

    this.momentum.fill(0);
    this.totalUpdates = 0;
    this.cumulativeReward = 0;
    this.predictionErrors = [];
    this.updateHistory = [];
  }
}

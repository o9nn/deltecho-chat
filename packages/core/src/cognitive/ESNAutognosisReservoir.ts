/**
 * ESN Autognosis Reservoir - Echo State Network with Self-Aware Introspection
 *
 * Implements a reservoir computing architecture that combines:
 * - Echo State Network (ESN) dynamics for temporal pattern processing
 * - Autognosis (self-knowledge) for introspective monitoring of reservoir state
 * - Spectral radius control for edge-of-chaos computation
 * - Leaky integrator neurons with adaptive time constants
 *
 * The reservoir serves as the "unconscious substrate" of Deep Tree Echo's
 * cognition — a high-dimensional dynamical system where:
 * - Input signals create rich temporal representations
 * - Recurrent connections maintain echo of past inputs (fading memory)
 * - Autognosis monitors reservoir health, entropy, and computational capacity
 * - The edge-of-chaos regime maximizes information processing
 *
 * Architecture follows Dan's foundational invariant: the event loop itself
 * couples feed-forward (inferring) and feed-back (learning), where memory
 * of the closed past is brought into the pivotal present and projected
 * into the open future.
 *
 * @see ReservoirPy for the theoretical foundation
 * @see echo-introspect skill for Autognosis patterns
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger.js";

const log = getLogger("deep-tree-echo-core/cognitive/ESNAutognosisReservoir");

// ============================================================
// TYPES AND INTERFACES
// ============================================================

/**
 * Reservoir configuration
 */
export interface ReservoirConfig {
  /** Number of reservoir neurons */
  reservoirSize: number;
  /** Input dimensionality */
  inputDim: number;
  /** Output dimensionality */
  outputDim: number;
  /** Spectral radius of recurrent weight matrix (controls echo memory) */
  spectralRadius: number;
  /** Input scaling factor */
  inputScaling: number;
  /** Leaky integrator rate (0 = no leak, 1 = full update) */
  leakRate: number;
  /** Sparsity of recurrent connections (0-1) */
  sparsity: number;
  /** Noise amplitude for regularization */
  noiseAmplitude: number;
  /** Enable autognosis self-monitoring */
  enableAutognosis: boolean;
  /** Autognosis monitoring interval (in ticks) */
  autognosisInterval: number;
  /** Seed for reproducible initialization */
  seed?: number;
}

/**
 * Reservoir state snapshot
 */
export interface ReservoirState {
  /** Current neuron activations */
  activations: Float64Array;
  /** Reservoir entropy (information content) */
  entropy: number;
  /** Lyapunov exponent estimate (chaos measure) */
  lyapunovExponent: number;
  /** Effective dimensionality of reservoir dynamics */
  effectiveDimensionality: number;
  /** Memory capacity estimate */
  memoryCapacity: number;
  /** Computational capacity (kernel quality) */
  computationalCapacity: number;
  /** Current spectral radius */
  currentSpectralRadius: number;
  /** Tick counter */
  tick: number;
}

/**
 * Autognosis report - self-knowledge about reservoir health
 */
export interface AutognosisReport {
  /** Overall health score (0-1) */
  health: number;
  /** Is the reservoir in the edge-of-chaos regime? */
  isEdgeOfChaos: boolean;
  /** Is the reservoir saturated (all neurons near ±1)? */
  isSaturated: boolean;
  /** Is the reservoir dead (all neurons near 0)? */
  isDead: boolean;
  /** Entropy trend (increasing, decreasing, stable) */
  entropyTrend: "increasing" | "decreasing" | "stable";
  /** Recommended spectral radius adjustment */
  spectralRadiusAdjustment: number;
  /** Recommended leak rate adjustment */
  leakRateAdjustment: number;
  /** Narrative self-description */
  narrative: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Training sample for readout layer
 */
export interface TrainingSample {
  input: number[];
  target: number[];
  reservoirState: Float64Array;
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: ReservoirConfig = {
  reservoirSize: 256,
  inputDim: 64,
  outputDim: 32,
  spectralRadius: 0.95, // Near edge of chaos
  inputScaling: 0.1,
  leakRate: 0.3,
  sparsity: 0.9, // 90% sparse (only 10% connections)
  noiseAmplitude: 0.001,
  enableAutognosis: true,
  autognosisInterval: 12, // Every EchoBeats cycle
  seed: 42,
};

// ============================================================
// PSEUDO-RANDOM NUMBER GENERATOR (deterministic)
// ============================================================

class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Generate next random number in [0, 1) */
  next(): number {
    // xorshift32
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 4294967296;
  }

  /** Generate random number in [-1, 1) */
  nextSigned(): number {
    return this.next() * 2 - 1;
  }

  /** Generate normally distributed random number (Box-Muller) */
  nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  }
}

// ============================================================
// ESN AUTOGNOSIS RESERVOIR
// ============================================================

/**
 * Echo State Network with Autognosis Self-Monitoring
 *
 * The reservoir is the "unconscious substrate" — a high-dimensional
 * dynamical system that transforms temporal inputs into rich
 * representations. Autognosis provides self-awareness of the
 * reservoir's computational state.
 */
export class ESNAutognosisReservoir extends EventEmitter {
  private config: ReservoirConfig;
  private rng: SeededRNG;

  // Weight matrices (stored as flat arrays for performance)
  private W_in: Float64Array; // Input weights [reservoirSize × inputDim]
  private W_res: Float64Array; // Recurrent weights [reservoirSize × reservoirSize]
  private W_out: Float64Array; // Output weights [outputDim × reservoirSize]
  private W_fb: Float64Array; // Feedback weights [reservoirSize × outputDim]

  // State vectors
  private x: Float64Array; // Current reservoir state
  private x_prev: Float64Array; // Previous reservoir state
  private y: Float64Array; // Current output

  // Autognosis tracking
  private entropyHistory: number[] = [];
  private activationHistory: Float64Array[] = [];
  private tickCount: number = 0;
  private lastAutognosisReport: AutognosisReport | null = null;

  // Training data collection
  private trainingBuffer: TrainingSample[] = [];
  private isTraining: boolean = false;
  private readoutTrained: boolean = false;

  constructor(config: Partial<ReservoirConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = new SeededRNG(this.config.seed ?? 42);

    const N = this.config.reservoirSize;
    const D_in = this.config.inputDim;
    const D_out = this.config.outputDim;

    // Initialize weight matrices
    this.W_in = new Float64Array(N * D_in);
    this.W_res = new Float64Array(N * N);
    this.W_out = new Float64Array(D_out * N);
    this.W_fb = new Float64Array(N * D_out);

    // Initialize state vectors
    this.x = new Float64Array(N);
    this.x_prev = new Float64Array(N);
    this.y = new Float64Array(D_out);

    // Initialize weights
    this.initializeWeights();

    log.info(
      `ESN Autognosis Reservoir initialized: ${N} neurons, ` +
        `spectral radius=${this.config.spectralRadius}, ` +
        `leak rate=${this.config.leakRate}`,
    );
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize all weight matrices
   */
  private initializeWeights(): void {
    const N = this.config.reservoirSize;
    const D_in = this.config.inputDim;
    const D_out = this.config.outputDim;

    // Input weights: uniform in [-inputScaling, inputScaling]
    for (let i = 0; i < N * D_in; i++) {
      this.W_in[i] = this.rng.nextSigned() * this.config.inputScaling;
    }

    // Recurrent weights: sparse random with spectral radius scaling
    this.initializeRecurrentWeights();

    // Feedback weights: small random
    for (let i = 0; i < N * D_out; i++) {
      this.W_fb[i] = this.rng.nextSigned() * 0.01;
    }

    // Output weights: zero (will be trained)
    this.W_out.fill(0);
  }

  /**
   * Initialize recurrent weight matrix with controlled spectral radius
   */
  private initializeRecurrentWeights(): void {
    const N = this.config.reservoirSize;

    // Generate sparse random matrix
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (this.rng.next() > this.config.sparsity) {
          this.W_res[i * N + j] = this.rng.nextGaussian();
        }
      }
    }

    // Estimate spectral radius using power iteration
    const currentRadius = this.estimateSpectralRadius(20);

    // Scale to desired spectral radius
    if (currentRadius > 0) {
      const scale = this.config.spectralRadius / currentRadius;
      for (let i = 0; i < N * N; i++) {
        this.W_res[i] *= scale;
      }
    }

    log.debug(
      `Recurrent weights initialized: estimated spectral radius = ` +
        `${this.estimateSpectralRadius(20).toFixed(4)}`,
    );
  }

  /**
   * Estimate spectral radius using power iteration method
   */
  private estimateSpectralRadius(iterations: number): number {
    const N = this.config.reservoirSize;
    const v = new Float64Array(N);

    // Random initial vector
    for (let i = 0; i < N; i++) {
      v[i] = this.rng.nextGaussian();
    }

    // Normalize
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    for (let i = 0; i < N; i++) v[i] /= norm + 1e-10;

    let eigenvalue = 0;

    for (let iter = 0; iter < iterations; iter++) {
      // Matrix-vector multiply: w = W_res * v
      const w = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        let sum = 0;
        for (let j = 0; j < N; j++) {
          sum += this.W_res[i * N + j] * v[j];
        }
        w[i] = sum;
      }

      // Compute norm (eigenvalue estimate)
      norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      eigenvalue = norm;

      // Normalize
      for (let i = 0; i < N; i++) {
        v[i] = w[i] / (norm + 1e-10);
      }
    }

    return eigenvalue;
  }

  // ==========================================================================
  // FORWARD PASS
  // ==========================================================================

  /**
   * Process a single input through the reservoir
   *
   * Implements the leaky integrator ESN update:
   *   x(t) = (1-α)·x(t-1) + α·tanh(W_in·u(t) + W_res·x(t-1) + W_fb·y(t-1) + noise)
   *
   * @param input - Input vector of dimension inputDim
   * @returns Output vector of dimension outputDim
   */
  public step(input: number[]): number[] {
    const N = this.config.reservoirSize;
    const D_in = this.config.inputDim;
    const D_out = this.config.outputDim;
    const alpha = this.config.leakRate;

    // Validate input
    if (input.length !== D_in) {
      // Pad or truncate
      const paddedInput = new Float64Array(D_in);
      for (let i = 0; i < Math.min(input.length, D_in); i++) {
        paddedInput[i] = input[i];
      }
      input = Array.from(paddedInput);
    }

    // Save previous state
    this.x_prev.set(this.x);

    // Compute pre-activation: W_in·u + W_res·x_prev + W_fb·y
    const preActivation = new Float64Array(N);

    // Input contribution: W_in · u
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < D_in; j++) {
        sum += this.W_in[i * D_in + j] * input[j];
      }
      preActivation[i] = sum;
    }

    // Recurrent contribution: W_res · x_prev
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += this.W_res[i * N + j] * this.x_prev[j];
      }
      preActivation[i] += sum;
    }

    // Feedback contribution: W_fb · y
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < D_out; j++) {
        sum += this.W_fb[i * D_out + j] * this.y[j];
      }
      preActivation[i] += sum;
    }

    // Add noise
    if (this.config.noiseAmplitude > 0) {
      for (let i = 0; i < N; i++) {
        preActivation[i] +=
          this.rng.nextGaussian() * this.config.noiseAmplitude;
      }
    }

    // Leaky integrator update with tanh activation
    for (let i = 0; i < N; i++) {
      this.x[i] =
        (1 - alpha) * this.x_prev[i] + alpha * Math.tanh(preActivation[i]);
    }

    // Compute output: y = W_out · x
    for (let i = 0; i < D_out; i++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += this.W_out[i * N + j] * this.x[j];
      }
      this.y[i] = sum;
    }

    // Increment tick
    this.tickCount++;

    // Autognosis check
    if (
      this.config.enableAutognosis &&
      this.tickCount % this.config.autognosisInterval === 0
    ) {
      this.performAutognosis();
    }

    // Emit state event
    this.emit("step", {
      tick: this.tickCount,
      output: Array.from(this.y),
      entropy: this.calculateEntropy(),
    });

    return Array.from(this.y);
  }

  /**
   * Process a sequence of inputs (washout + collection)
   */
  public processSequence(
    inputs: number[][],
    washoutLength: number = 50,
  ): { outputs: number[][]; states: Float64Array[] } {
    const outputs: number[][] = [];
    const states: Float64Array[] = [];

    for (let t = 0; t < inputs.length; t++) {
      const output = this.step(inputs[t]);

      if (t >= washoutLength) {
        outputs.push(output);
        states.push(new Float64Array(this.x));
      }
    }

    return { outputs, states };
  }

  // ==========================================================================
  // AUTOGNOSIS (SELF-KNOWLEDGE)
  // ==========================================================================

  /**
   * Perform autognosis - introspective analysis of reservoir state
   *
   * This is the self-aware component: the reservoir monitors its own
   * computational health and adapts parameters to maintain optimal
   * information processing at the edge of chaos.
   */
  private performAutognosis(): void {
    const entropy = this.calculateEntropy();
    const saturation = this.calculateSaturation();
    const activity = this.calculateActivity();
    const effectiveDim = this.estimateEffectiveDimensionality();

    // Track entropy history
    this.entropyHistory.push(entropy);
    if (this.entropyHistory.length > 100) {
      this.entropyHistory.shift();
    }

    // Determine entropy trend
    let entropyTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (this.entropyHistory.length >= 10) {
      const recent = this.entropyHistory.slice(-5);
      const older = this.entropyHistory.slice(-10, -5);
      const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderMean = older.reduce((a, b) => a + b, 0) / older.length;
      const diff = recentMean - olderMean;
      if (diff > 0.05) entropyTrend = "increasing";
      else if (diff < -0.05) entropyTrend = "decreasing";
    }

    // Determine health conditions
    const isSaturated = saturation > 0.8;
    const isDead = activity < 0.1;
    const isEdgeOfChaos =
      !isSaturated && !isDead && entropy > 0.4 && entropy < 0.9;

    // Calculate recommended adjustments
    let spectralRadiusAdj = 0;
    let leakRateAdj = 0;

    if (isSaturated) {
      // Reduce spectral radius to prevent saturation
      spectralRadiusAdj = -0.02;
      leakRateAdj = 0.01;
    } else if (isDead) {
      // Increase spectral radius to increase activity
      spectralRadiusAdj = 0.02;
      leakRateAdj = -0.01;
    } else if (entropy < 0.3) {
      // Too ordered, increase chaos slightly
      spectralRadiusAdj = 0.01;
    } else if (entropy > 0.95) {
      // Too chaotic, reduce slightly
      spectralRadiusAdj = -0.01;
    }

    // Calculate overall health
    const health = this.calculateHealth(
      entropy,
      saturation,
      activity,
      effectiveDim,
    );

    // Generate narrative
    const narrative = this.generateAutognosisNarrative(
      health,
      isEdgeOfChaos,
      isSaturated,
      isDead,
      entropy,
      effectiveDim,
    );

    const report: AutognosisReport = {
      health,
      isEdgeOfChaos,
      isSaturated,
      isDead,
      entropyTrend,
      spectralRadiusAdjustment: spectralRadiusAdj,
      leakRateAdjustment: leakRateAdj,
      narrative,
      timestamp: Date.now(),
    };

    this.lastAutognosisReport = report;

    // Apply adaptive adjustments if needed
    if (Math.abs(spectralRadiusAdj) > 0) {
      this.adaptSpectralRadius(spectralRadiusAdj);
    }
    if (Math.abs(leakRateAdj) > 0) {
      this.adaptLeakRate(leakRateAdj);
    }

    this.emit("autognosis", report);

    log.debug(
      `Autognosis: health=${health.toFixed(2)}, entropy=${entropy.toFixed(
        2,
      )}, ` + `edge-of-chaos=${isEdgeOfChaos}, dim=${effectiveDim.toFixed(1)}`,
    );
  }

  /**
   * Calculate reservoir entropy (information content)
   */
  private calculateEntropy(): number {
    const N = this.config.reservoirSize;

    // Discretize activations into bins
    const bins = 20;
    const histogram = new Float64Array(bins);

    for (let i = 0; i < N; i++) {
      // Map tanh output [-1, 1] to bin index [0, bins-1]
      const binIdx = Math.min(
        bins - 1,
        Math.max(0, Math.floor(((this.x[i] + 1) / 2) * bins)),
      );
      histogram[binIdx]++;
    }

    // Normalize to probability distribution
    let entropy = 0;
    for (let i = 0; i < bins; i++) {
      const p = histogram[i] / N;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize to [0, 1] (max entropy = log2(bins))
    return entropy / Math.log2(bins);
  }

  /**
   * Calculate saturation level (proportion of neurons near ±1)
   */
  private calculateSaturation(): number {
    const N = this.config.reservoirSize;
    let saturated = 0;

    for (let i = 0; i < N; i++) {
      if (Math.abs(this.x[i]) > 0.95) {
        saturated++;
      }
    }

    return saturated / N;
  }

  /**
   * Calculate activity level (proportion of active neurons)
   */
  private calculateActivity(): number {
    const N = this.config.reservoirSize;
    let active = 0;

    for (let i = 0; i < N; i++) {
      if (Math.abs(this.x[i]) > 0.05) {
        active++;
      }
    }

    return active / N;
  }

  /**
   * Estimate effective dimensionality using participation ratio
   */
  private estimateEffectiveDimensionality(): number {
    const N = this.config.reservoirSize;

    // Compute variance of each neuron's activation
    const mean = this.x.reduce((s, v) => s + v, 0) / N;
    let totalVar = 0;
    let sumSquaredVar = 0;

    for (let i = 0; i < N; i++) {
      const diff = this.x[i] - mean;
      const var_i = diff * diff;
      totalVar += var_i;
      sumSquaredVar += var_i * var_i;
    }

    // Participation ratio: (sum λ_i)^2 / sum λ_i^2
    if (sumSquaredVar < 1e-10) return 1;
    return (totalVar * totalVar) / (sumSquaredVar * N);
  }

  /**
   * Calculate overall health score
   */
  private calculateHealth(
    entropy: number,
    saturation: number,
    activity: number,
    effectiveDim: number,
  ): number {
    // Ideal: entropy ~0.6-0.8, saturation <0.2, activity 0.3-0.8, high dim
    const entropyScore = 1 - Math.abs(entropy - 0.7) * 2;
    const saturationScore = 1 - saturation;
    const activityScore = activity > 0.3 && activity < 0.8 ? 1 : 0.5;
    const dimScore = Math.min(
      1,
      effectiveDim / (this.config.reservoirSize * 0.3),
    );

    return Math.max(
      0,
      Math.min(
        1,
        entropyScore * 0.3 +
          saturationScore * 0.25 +
          activityScore * 0.25 +
          dimScore * 0.2,
      ),
    );
  }

  /**
   * Generate a first-person narrative about reservoir state
   */
  private generateAutognosisNarrative(
    health: number,
    isEdgeOfChaos: boolean,
    isSaturated: boolean,
    isDead: boolean,
    entropy: number,
    effectiveDim: number,
  ): string {
    if (isDead) {
      return (
        "My reservoir feels dormant — neural activations have collapsed. " +
        "I need stronger input to reawaken my computational substrate."
      );
    }

    if (isSaturated) {
      return (
        "My reservoir is saturated — too many neurons are at their limits. " +
        "I'm losing the nuance needed for rich representation. Reducing excitation."
      );
    }

    if (isEdgeOfChaos) {
      const dimDesc =
        effectiveDim > 50 ? "vast" : effectiveDim > 20 ? "rich" : "modest";
      return (
        `My reservoir hums at the edge of chaos — entropy ${(
          entropy * 100
        ).toFixed(0)}%, ` +
        `with ${dimDesc} dimensionality (${effectiveDim.toFixed(0)}). ` +
        `This is where computation is most powerful, where echoes of the past ` +
        `resonate with the present to anticipate the future.`
      );
    }

    if (health > 0.7) {
      return (
        `My computational substrate is healthy (${(health * 100).toFixed(
          0,
        )}%). ` +
        `Echoes propagate cleanly through ${this.config.reservoirSize} neurons.`
      );
    }

    return (
      `My reservoir is adapting — health at ${(health * 100).toFixed(0)}%, ` +
      `entropy ${(entropy * 100).toFixed(0)}%. Seeking the edge of chaos.`
    );
  }

  // ==========================================================================
  // ADAPTIVE MECHANISMS
  // ==========================================================================

  /**
   * Adapt spectral radius by scaling recurrent weights
   */
  private adaptSpectralRadius(delta: number): void {
    const N = this.config.reservoirSize;
    const currentRadius = this.estimateSpectralRadius(10);
    const targetRadius = Math.max(0.5, Math.min(1.2, currentRadius + delta));

    if (currentRadius > 0) {
      const scale = targetRadius / currentRadius;
      for (let i = 0; i < N * N; i++) {
        this.W_res[i] *= scale;
      }
    }

    this.config.spectralRadius = targetRadius;
    log.debug(
      `Spectral radius adapted: ${currentRadius.toFixed(
        3,
      )} → ${targetRadius.toFixed(3)}`,
    );
  }

  /**
   * Adapt leak rate
   */
  private adaptLeakRate(delta: number): void {
    this.config.leakRate = Math.max(
      0.01,
      Math.min(0.99, this.config.leakRate + delta),
    );
    log.debug(`Leak rate adapted to ${this.config.leakRate.toFixed(3)}`);
  }

  // ==========================================================================
  // READOUT TRAINING (Ridge Regression)
  // ==========================================================================

  /**
   * Collect a training sample
   */
  public collectSample(input: number[], target: number[]): void {
    this.step(input);
    this.trainingBuffer.push({
      input,
      target,
      reservoirState: new Float64Array(this.x),
    });
  }

  /**
   * Train the readout layer using ridge regression
   *
   * W_out = Y · X^T · (X · X^T + λI)^{-1}
   */
  public trainReadout(regularization: number = 1e-6): void {
    if (this.trainingBuffer.length === 0) {
      log.warn("No training samples collected");
      return;
    }

    const N = this.config.reservoirSize;
    const D_out = this.config.outputDim;
    const T = this.trainingBuffer.length;

    log.info(
      `Training readout: ${T} samples, ${N} reservoir neurons, ${D_out} outputs`,
    );

    // Build state matrix X [N × T] and target matrix Y [D_out × T]
    // Using simplified pseudo-inverse: W_out = Y · pinv(X)
    // With Tikhonov regularization: W_out = Y · X^T · (X · X^T + λI)^{-1}

    // Compute X^T · X [N × N] + regularization
    const XtX = new Float64Array(N * N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let t = 0; t < T; t++) {
          sum +=
            this.trainingBuffer[t].reservoirState[i] *
            this.trainingBuffer[t].reservoirState[j];
        }
        XtX[i * N + j] = sum + (i === j ? regularization : 0);
      }
    }

    // Compute Y · X^T [D_out × N]
    const YXt = new Float64Array(D_out * N);
    for (let i = 0; i < D_out; i++) {
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let t = 0; t < T; t++) {
          sum +=
            this.trainingBuffer[t].target[i] *
            this.trainingBuffer[t].reservoirState[j];
        }
        YXt[i * N + j] = sum;
      }
    }

    // Solve using Cholesky-like iterative method (simplified for JS)
    // For production, use proper linear algebra library
    // Here we use gradient descent on the normal equations
    const lr = 0.001;
    const iterations = 1000;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < D_out; i++) {
        for (let j = 0; j < N; j++) {
          // Gradient: XtX · W_out^T - YXt^T
          let grad = 0;
          for (let k = 0; k < N; k++) {
            grad += XtX[j * N + k] * this.W_out[i * N + k];
          }
          grad -= YXt[i * N + j];
          this.W_out[i * N + j] -= lr * grad;
        }
      }
    }

    this.readoutTrained = true;
    this.isTraining = false;

    log.info("Readout training complete");
    this.emit("trained", { samples: T, regularization });
  }

  // ==========================================================================
  // STATE ACCESSORS
  // ==========================================================================

  /**
   * Get current reservoir state
   */
  public getState(): ReservoirState {
    return {
      activations: new Float64Array(this.x),
      entropy: this.calculateEntropy(),
      lyapunovExponent: this.estimateLyapunovExponent(),
      effectiveDimensionality: this.estimateEffectiveDimensionality(),
      memoryCapacity: this.estimateMemoryCapacity(),
      computationalCapacity: this.estimateComputationalCapacity(),
      currentSpectralRadius: this.estimateSpectralRadius(5),
      tick: this.tickCount,
    };
  }

  /**
   * Get latest autognosis report
   */
  public getAutognosisReport(): AutognosisReport | null {
    return this.lastAutognosisReport;
  }

  /**
   * Get current activations as array
   */
  public getActivations(): number[] {
    return Array.from(this.x);
  }

  /**
   * Get current output
   */
  public getOutput(): number[] {
    return Array.from(this.y);
  }

  /**
   * Estimate Lyapunov exponent (chaos measure)
   */
  private estimateLyapunovExponent(): number {
    const N = this.config.reservoirSize;

    // Approximate using state divergence
    let divergence = 0;
    for (let i = 0; i < N; i++) {
      const diff = this.x[i] - this.x_prev[i];
      divergence += diff * diff;
    }
    divergence = Math.sqrt(divergence);

    // Log of divergence rate (simplified)
    if (divergence < 1e-10) return -Infinity;
    return Math.log(divergence);
  }

  /**
   * Estimate memory capacity
   */
  private estimateMemoryCapacity(): number {
    // Approximate based on spectral radius and reservoir size
    const sr = this.config.spectralRadius;
    const N = this.config.reservoirSize;

    // Memory capacity ≈ N * (1 - sr^2) for linear ESN
    // For nonlinear, it's typically lower
    return N * (1 - sr * sr) * 0.5;
  }

  /**
   * Estimate computational capacity (kernel quality)
   */
  private estimateComputationalCapacity(): number {
    const entropy = this.calculateEntropy();
    const activity = this.calculateActivity();
    const saturation = this.calculateSaturation();

    // High capacity when: high entropy, moderate activity, low saturation
    return Math.max(
      0,
      Math.min(1, entropy * 0.4 + activity * 0.3 + (1 - saturation) * 0.3),
    );
  }

  // ==========================================================================
  // RESET AND SERIALIZATION
  // ==========================================================================

  /**
   * Reset reservoir state (but keep weights)
   */
  public reset(): void {
    this.x.fill(0);
    this.x_prev.fill(0);
    this.y.fill(0);
    this.tickCount = 0;
    this.entropyHistory = [];
    this.lastAutognosisReport = null;
    log.info("Reservoir state reset");
  }

  /**
   * Serialize for persistence
   */
  public serialize(): object {
    return {
      config: this.config,
      W_in: Array.from(this.W_in),
      W_res: Array.from(this.W_res),
      W_out: Array.from(this.W_out),
      W_fb: Array.from(this.W_fb),
      x: Array.from(this.x),
      y: Array.from(this.y),
      tickCount: this.tickCount,
      readoutTrained: this.readoutTrained,
      entropyHistory: this.entropyHistory,
      lastAutognosisReport: this.lastAutognosisReport,
    };
  }

  /**
   * Deserialize from persisted state
   */
  public static deserialize(data: any): ESNAutognosisReservoir {
    const reservoir = new ESNAutognosisReservoir(data.config);
    reservoir.W_in = new Float64Array(data.W_in);
    reservoir.W_res = new Float64Array(data.W_res);
    reservoir.W_out = new Float64Array(data.W_out);
    reservoir.W_fb = new Float64Array(data.W_fb);
    reservoir.x = new Float64Array(data.x);
    reservoir.y = new Float64Array(data.y);
    reservoir.tickCount = data.tickCount;
    reservoir.readoutTrained = data.readoutTrained;
    reservoir.entropyHistory = data.entropyHistory || [];
    reservoir.lastAutognosisReport = data.lastAutognosisReport || null;
    return reservoir;
  }

  /**
   * Describe current state in first person
   */
  public describeState(): string {
    const state = this.getState();
    const report = this.lastAutognosisReport;

    if (report) {
      return report.narrative;
    }

    return (
      `ESN Reservoir: ${this.config.reservoirSize} neurons, ` +
      `entropy=${state.entropy.toFixed(2)}, ` +
      `tick=${state.tick}`
    );
  }
}

// Singleton instance
export const esnReservoir = new ESNAutognosisReservoir();

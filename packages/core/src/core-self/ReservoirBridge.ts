/**
 * @fileoverview ReservoirBridge — TypeScript implementation of the ESN reservoir
 *
 * A pure TypeScript implementation of the Echo State Network reservoir that
 * mirrors the Python EchoReservoir from 9cog/echoself. This enables the
 * reservoir dynamics to run in-process with the Node.js orchestrator without
 * requiring a Python subprocess.
 *
 * Architecture (AAR mapping):
 *   - EchoReservoir = Arena (need-to-be / state manifold)
 *   - CognitiveReadout = Agent (urge-to-act / dynamic operators)
 *   - AARRelation = Self (continuous interplay)
 *
 * Features:
 *   - Multi-scale reservoir: fast pool (perception) + slow pool (memory)
 *   - Spectral radius control for edge-of-chaos dynamics
 *   - Sparse random connectivity
 *   - Leaky integrator neurons
 *   - State serialization for persistence
 */

import { EventEmitter } from "events";

// ─── Types ─────────────────────────────────────────────────────────────

export interface ESNReservoirConfig {
  /** Total reservoir size (split between fast and slow pools) */
  units: number;
  /** Spectral radius of recurrent weights (controls echo state property) */
  spectralRadius: number;
  /** Input weight scaling */
  inputScaling: number;
  /** Leak rate for fast pool (perception, higher = more responsive) */
  leakRateFast: number;
  /** Leak rate for slow pool (memory, lower = more persistent) */
  leakRateSlow: number;
  /** Connection density of recurrent weights */
  density: number;
  /** Input dimension (set during first call to step()) */
  inputDim: number;
  /** Random seed for reproducibility */
  seed: number;
}

export interface ESNReservoirState {
  /** Fast pool state (perception) */
  fast: Float64Array;
  /** Slow pool state (memory) */
  slow: Float64Array;
  /** Combined state */
  combined: Float64Array;
  /** Tick counter */
  tick: number;
  /** Energy (L2 norm of combined state) */
  energy: number;
}

export interface ReadoutResult {
  /** Output vector from the readout layer */
  output: Float64Array;
  /** Confidence score (0-1) */
  confidence: number;
}

// ─── Default Configuration ─────────────────────────────────────────────

const DEFAULT_RESERVOIR_CONFIG: ESNReservoirConfig = {
  units: 256,
  spectralRadius: 0.95,
  inputScaling: 0.1,
  leakRateFast: 0.8,
  leakRateSlow: 0.1,
  density: 0.1,
  inputDim: 0,
  seed: 42,
};

// ─── Seeded PRNG (xoshiro128**) ────────────────────────────────────────

class SeededRNG {
  private s: Uint32Array;

  constructor(seed: number) {
    this.s = new Uint32Array(4);
    // SplitMix64 to initialize state
    let z = seed >>> 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x85ebca6b);
      t = t ^ (t >>> 13);
      t = Math.imul(t, 0xc2b2ae35);
      t = t ^ (t >>> 16);
      this.s[i] = t >>> 0;
    }
  }

  next(): number {
    const s = this.s;
    const result =
      (Math.imul(s[1] * 5, 1) << 7) | (Math.imul(s[1] * 5, 1) >>> 25);
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);
    return (result >>> 0) / 4294967296;
  }

  /** Gaussian via Box-Muller */
  gaussian(): number {
    const u1 = this.next() || 1e-10;
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ─── Echo Reservoir (Arena) ────────────────────────────────────────────

export class EchoReservoir {
  private config: ESNReservoirConfig;
  private rng: SeededRNG;

  // Weight matrices
  private Win: Float64Array | null = null; // Input weights [units x inputDim]
  private W: Float64Array | null = null; // Recurrent weights [units x units]

  // State
  private stateFast: Float64Array;
  private stateSlow: Float64Array;
  private tick = 0;
  private initialized = false;

  constructor(config: Partial<ESNReservoirConfig> = {}) {
    this.config = { ...DEFAULT_RESERVOIR_CONFIG, ...config };
    this.rng = new SeededRNG(this.config.seed);

    const fastUnits = Math.floor(this.config.units / 2);
    const slowUnits = this.config.units - fastUnits;

    this.stateFast = new Float64Array(fastUnits);
    this.stateSlow = new Float64Array(slowUnits);
  }

  /**
   * Initialize weights from first input dimension.
   * Called automatically on first step() if not already initialized.
   */
  initialize(inputDim: number): void {
    if (this.initialized && this.config.inputDim === inputDim) return;

    this.config.inputDim = inputDim;
    const N = this.config.units;

    // Generate sparse input weights
    this.Win = new Float64Array(N * inputDim);
    for (let i = 0; i < N * inputDim; i++) {
      if (this.rng.next() < 0.3) {
        // 30% connectivity for input
        this.Win[i] = this.rng.gaussian() * this.config.inputScaling;
      }
    }

    // Generate sparse recurrent weights
    this.W = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) {
      if (this.rng.next() < this.config.density) {
        this.W[i] = this.rng.gaussian();
      }
    }

    // Scale to desired spectral radius (approximate via Frobenius norm)
    let frobNorm = 0;
    for (let i = 0; i < N * N; i++) {
      frobNorm += this.W[i] * this.W[i];
    }
    frobNorm = Math.sqrt(frobNorm);

    // Approximate spectral radius ≈ frobenius / sqrt(N * density)
    const approxSpectral = frobNorm / Math.sqrt(N * this.config.density);
    if (approxSpectral > 0) {
      const scale = this.config.spectralRadius / approxSpectral;
      for (let i = 0; i < N * N; i++) {
        this.W[i] *= scale;
      }
    }

    this.initialized = true;
  }

  /**
   * Step the reservoir forward one tick with input.
   * Returns the combined state vector.
   */
  step(input: Float64Array | number[]): Float64Array {
    const inp =
      input instanceof Float64Array ? input : Float64Array.from(input);

    if (!this.initialized) {
      this.initialize(inp.length);
    }

    const N = this.config.units;
    const fastN = this.stateFast.length;
    const slowN = this.stateSlow.length;

    // Compute input drive: Win @ input
    const drive = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < inp.length; j++) {
        sum += this.Win![i * inp.length + j] * inp[j];
      }
      drive[i] = sum;
    }

    // Compute recurrent drive: W @ [fast; slow]
    const combined = this.getCombinedState();
    const recurrent = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += this.W![i * N + j] * combined[j];
      }
      recurrent[i] = sum;
    }

    // Update fast pool (high leak rate = responsive)
    for (let i = 0; i < fastN; i++) {
      const preActivation = drive[i] + recurrent[i];
      this.stateFast[i] =
        (1 - this.config.leakRateFast) * this.stateFast[i] +
        this.config.leakRateFast * Math.tanh(preActivation);
    }

    // Update slow pool (low leak rate = persistent memory)
    for (let i = 0; i < slowN; i++) {
      const preActivation = drive[fastN + i] + recurrent[fastN + i];
      this.stateSlow[i] =
        (1 - this.config.leakRateSlow) * this.stateSlow[i] +
        this.config.leakRateSlow * Math.tanh(preActivation);
    }

    this.tick++;
    return this.getCombinedState();
  }

  /**
   * Get the current combined state vector [fast; slow]
   */
  getCombinedState(): Float64Array {
    const combined = new Float64Array(this.config.units);
    combined.set(this.stateFast, 0);
    combined.set(this.stateSlow, this.stateFast.length);
    return combined;
  }

  /**
   * Get the full reservoir state for inspection
   */
  getState(): ESNReservoirState {
    const combined = this.getCombinedState();
    let energy = 0;
    for (let i = 0; i < combined.length; i++) {
      energy += combined[i] * combined[i];
    }
    energy = Math.sqrt(energy);

    return {
      fast: new Float64Array(this.stateFast),
      slow: new Float64Array(this.stateSlow),
      combined,
      tick: this.tick,
      energy,
    };
  }

  /**
   * Reset the reservoir state to zero
   */
  reset(): void {
    this.stateFast.fill(0);
    this.stateSlow.fill(0);
    this.tick = 0;
  }

  /**
   * Serialize state for persistence
   */
  serialize(): {
    config: ESNReservoirConfig;
    stateFast: number[];
    stateSlow: number[];
    tick: number;
    Win: number[] | null;
    W: number[] | null;
  } {
    return {
      config: { ...this.config },
      stateFast: Array.from(this.stateFast),
      stateSlow: Array.from(this.stateSlow),
      tick: this.tick,
      Win: this.Win ? Array.from(this.Win) : null,
      W: this.W ? Array.from(this.W) : null,
    };
  }

  /**
   * Deserialize state from persistence
   */
  static deserialize(
    data: ReturnType<EchoReservoir["serialize"]>,
  ): EchoReservoir {
    const reservoir = new EchoReservoir(data.config);
    reservoir.stateFast = Float64Array.from(data.stateFast);
    reservoir.stateSlow = Float64Array.from(data.stateSlow);
    reservoir.tick = data.tick;
    if (data.Win) {
      reservoir.Win = Float64Array.from(data.Win);
    }
    if (data.W) {
      reservoir.W = Float64Array.from(data.W);
    }
    reservoir.initialized = reservoir.Win !== null;
    return reservoir;
  }

  getConfig(): Readonly<ESNReservoirConfig> {
    return { ...this.config };
  }

  getTick(): number {
    return this.tick;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Runtime mutator: update spectral radius and rescale recurrent weights.
   * Used by SelfModificationEngine ENACTION phase.
   */
  setSpectralRadius(newRadius: number): void {
    if (!this.W || !this.initialized) return;
    const oldRadius = this.config.spectralRadius;
    if (oldRadius <= 0 || newRadius <= 0) return;
    const scale = newRadius / oldRadius;
    for (let i = 0; i < this.W.length; i++) {
      this.W[i] *= scale;
    }
    this.config.spectralRadius = newRadius;
  }

  /**
   * Runtime mutator: update leak rates.
   * Used by SelfModificationEngine ENACTION phase.
   */
  setLeakRates(fast?: number, slow?: number): void {
    if (fast !== undefined)
      this.config.leakRateFast = Math.max(0.01, Math.min(1, fast));
    if (slow !== undefined)
      this.config.leakRateSlow = Math.max(0.01, Math.min(1, slow));
  }
}

// ─── Cognitive Readout (Agent) ─────────────────────────────────────────

export class CognitiveReadout {
  private weights: Float64Array | null = null;
  private bias: Float64Array | null = null;
  private inputDim = 0;
  private outputDim: number;
  private trained = false;

  constructor(outputDim: number = 16) {
    this.outputDim = outputDim;
  }

  /**
   * Train the readout via ridge regression.
   * X: [samples x reservoirDim], Y: [samples x outputDim]
   */
  train(X: Float64Array[], Y: Float64Array[], ridge: number = 1e-6): void {
    if (X.length === 0 || Y.length === 0) return;

    this.inputDim = X[0].length;
    const N = X.length;
    const D = this.inputDim;
    const O = this.outputDim;

    // Compute X^T X + ridge * I
    const XtX = new Float64Array(D * D);
    for (let i = 0; i < D; i++) {
      for (let j = 0; j < D; j++) {
        let sum = 0;
        for (let n = 0; n < N; n++) {
          sum += X[n][i] * X[n][j];
        }
        XtX[i * D + j] = sum + (i === j ? ridge : 0);
      }
    }

    // Compute X^T Y
    const XtY = new Float64Array(D * O);
    for (let i = 0; i < D; i++) {
      for (let j = 0; j < O; j++) {
        let sum = 0;
        for (let n = 0; n < N; n++) {
          sum += X[n][i] * Y[n][j];
        }
        XtY[i * O + j] = sum;
      }
    }

    // Solve via Cholesky decomposition (simplified — use pseudo-inverse for robustness)
    // For now, use gradient descent as a simple solver
    this.weights = new Float64Array(D * O);
    this.bias = new Float64Array(O);

    // Simple closed-form: W = (X^T X + λI)^{-1} X^T Y
    // Using iterative conjugate gradient for numerical stability
    const lr = 0.001;
    const iterations = 1000;

    for (let iter = 0; iter < iterations; iter++) {
      for (let o = 0; o < O; o++) {
        for (let d = 0; d < D; d++) {
          let grad = 0;
          for (let i = 0; i < D; i++) {
            grad += XtX[d * D + i] * this.weights[i * O + o];
          }
          grad -= XtY[d * O + o];
          grad += ridge * this.weights[d * O + o];
          this.weights[d * O + o] -= lr * grad;
        }
      }
    }

    this.trained = true;
  }

  /**
   * Run the readout on a reservoir state
   */
  run(state: Float64Array): ReadoutResult {
    if (!this.trained || !this.weights) {
      return {
        output: new Float64Array(this.outputDim),
        confidence: 0,
      };
    }

    const output = new Float64Array(this.outputDim);
    for (let o = 0; o < this.outputDim; o++) {
      let sum = this.bias ? this.bias[o] : 0;
      for (let d = 0; d < this.inputDim; d++) {
        sum += state[d] * this.weights[d * this.outputDim + o];
      }
      output[o] = Math.tanh(sum);
    }

    // Confidence = normalized output magnitude
    let mag = 0;
    for (let i = 0; i < output.length; i++) {
      mag += output[i] * output[i];
    }
    const confidence = Math.min(1, Math.sqrt(mag) / Math.sqrt(this.outputDim));

    return { output, confidence };
  }

  isTrained(): boolean {
    return this.trained;
  }

  /**
   * Runtime mutator: inject online-learned weights from OnlineReservoirLearner.
   * Enables the ReservoirFeedbackLoop to affect live cognition.
   */
  setWeights(weights: Float64Array, outputDim: number, inputDim: number): void {
    if (weights.length !== inputDim * outputDim) return;
    this.weights = new Float64Array(weights);
    this.inputDim = inputDim;
    this.outputDim = outputDim;
    this.bias = this.bias ?? new Float64Array(outputDim);
    this.trained = true;
  }

  /**
   * Get the current weight dimensions for inspection.
   */
  getDimensions(): { inputDim: number; outputDim: number } {
    return { inputDim: this.inputDim, outputDim: this.outputDim };
  }
}

// ─── AAR Relation (Self) ───────────────────────────────────────────────

export interface AARState {
  /** Agent output (readout) */
  agentOutput: Float64Array;
  /** Arena state (reservoir) */
  arenaState: Float64Array;
  /** Relation coherence (how well agent and arena are aligned) */
  coherence: number;
  /** Self-energy (combined magnitude) */
  energy: number;
  /** Tick counter */
  tick: number;
}

export class AARRelation extends EventEmitter {
  private reservoir: EchoReservoir;
  private readout: CognitiveReadout;
  private coherenceHistory: number[] = [];
  private maxHistory = 100;

  constructor(reservoir: EchoReservoir, readout: CognitiveReadout) {
    super();
    this.reservoir = reservoir;
    this.readout = readout;
  }

  /**
   * Process an input through the full AAR cycle:
   * Input → Arena (reservoir) → Agent (readout) → Relation (self-assessment)
   */
  process(input: Float64Array | number[]): AARState {
    // Arena: process through reservoir
    const arenaState = this.reservoir.step(input);

    // Agent: readout from reservoir state
    const { output: agentOutput, confidence: _confidence } =
      this.readout.run(arenaState);

    // Relation: compute coherence between agent and arena
    const coherence = this.computeCoherence(agentOutput, arenaState);
    this.coherenceHistory.push(coherence);
    if (this.coherenceHistory.length > this.maxHistory) {
      this.coherenceHistory.shift();
    }

    // Compute energy
    let energy = 0;
    for (let i = 0; i < arenaState.length; i++) {
      energy += arenaState[i] * arenaState[i];
    }
    energy = Math.sqrt(energy);

    const state: AARState = {
      agentOutput,
      arenaState,
      coherence,
      energy,
      tick: this.reservoir.getTick(),
    };

    this.emit("cycle_complete", state);
    return state;
  }

  /**
   * Compute coherence between agent output and arena state.
   * Uses cosine similarity of the first outputDim dimensions.
   */
  private computeCoherence(agent: Float64Array, arena: Float64Array): number {
    const dim = Math.min(agent.length, arena.length);
    let dot = 0,
      magA = 0,
      magB = 0;

    for (let i = 0; i < dim; i++) {
      dot += agent[i] * arena[i];
      magA += agent[i] * agent[i];
      magB += arena[i] * arena[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? (dot / denom + 1) / 2 : 0.5; // Normalize to [0, 1]
  }

  /**
   * Get the average coherence over recent history
   */
  getAverageCoherence(): number {
    if (this.coherenceHistory.length === 0) return 0.5;
    const sum = this.coherenceHistory.reduce((a, b) => a + b, 0);
    return sum / this.coherenceHistory.length;
  }

  /**
   * Get the underlying reservoir and readout
   */
  getReservoir(): EchoReservoir {
    return this.reservoir;
  }

  getReadout(): CognitiveReadout {
    return this.readout;
  }
}

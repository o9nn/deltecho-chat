import { getLogger } from "@deltachat-desktop/shared/logger";
import {
  MetabolicResonance,
  TemporalRhythm,
} from "@deltachat-desktop/shared/shared-types";

const log = getLogger("DeepTreeEcho/EcologicalResonance");

/**
 * EcologicalResonance - Echo State Network (ESN) Reservoir Computing
 *
 * Implements organic self-rate-limiting based on interaction density.
 * Uses a recurrent reservoir to learn 'resonance' and adjust internal
 * timing to match circadian-like patterns.
 */
export class EcologicalResonance {
  private static instance: EcologicalResonance;

  // ESN Reservoir Parameters
  private readonly RESERVOIR_SIZE = 32;
  private reservoir: number[] = new Array(32).fill(0);
  private weights: number[][] = []; // Recurrent weights (fixed)
  private inputWeights: number[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  private rhythm: TemporalRhythm = {
    periodicity: 24 * 60 * 60 * 1000, // 24h base periodicity
    interactionDensity: 0,
    phaseOffset: 0,
    nextPeakInteraction: Date.now() + 12 * 60 * 60 * 1000,
  };

  private resonanceState: MetabolicResonance = {
    reservoirState: this.reservoir,
    rateLimitFactor: 1.0,
    spectralRadius: 0.95,
    entropy: 0,
  };

  private constructor() {
    this.initializeReservoir();
    // Run the 'metabolism' loop every second
    this.tickInterval = setInterval(() => this.tick(), 1000);
  }

  public static getInstance(): EcologicalResonance {
    if (!this.instance) {
      this.instance = new EcologicalResonance();
    }
    return this.instance;
  }

  private initializeReservoir(): void {
    // Standard Echo-State Network initialization
    for (let i = 0; i < this.RESERVOIR_SIZE; i++) {
      this.weights[i] = [];
      for (let j = 0; j < this.RESERVOIR_SIZE; j++) {
        // Sparse, random weights with spectral radius scaling
        this.weights[i][j] = (Math.random() * 2 - 1) * 0.5;
      }
      this.inputWeights[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Absorb an interaction event into the reservoir
   */
  public absorbInteraction(): void {
    this.rhythm.interactionDensity += 0.1;
    this.updateReservoir(1.0); // Pulse the reservoir
  }

  /**
   * Internal 'tick' that evolves the reservoir state
   */
  private tick(): void {
    // 1. Natural decay of interaction density (exponential back-off)
    this.rhythm.interactionDensity *= 0.99;

    // 2. Evolve the reservoir state (Active Inference of temporal patterns)
    this.updateReservoir(this.rhythm.interactionDensity);

    // 3. Compute Circadian Modulation
    const time = Date.now();
    const circadianSine = Math.sin(
      (2 * Math.PI * time) / this.rhythm.periodicity,
    );
    this.rhythm.phaseOffset = circadianSine;

    // 4. Update Rate Limit Factor (Surprise-driven back-off)
    // If interaction density is higher than the "circadian expectation", increase back-off
    const expectedDensity = (circadianSine + 1) / 2; // 0 to 1
    const surprise = Math.max(
      0,
      this.rhythm.interactionDensity - expectedDensity,
    );

    // Exponential back-off shaped by surprise
    this.resonanceState.rateLimitFactor = 1.0 + Math.pow(surprise, 2) * 10;

    // Store entropy of the reservoir
    this.resonanceState.entropy = this.calculateEntropy();
  }

  private updateReservoir(input: number): void {
    const nextState = new Array(this.RESERVOIR_SIZE).fill(0);

    for (let i = 0; i < this.RESERVOIR_SIZE; i++) {
      let sum = this.inputWeights[i] * input;
      for (let j = 0; j < this.RESERVOIR_SIZE; j++) {
        sum += this.weights[i][j] * this.reservoir[j];
      }
      // Hyperbolic tangent activation (NL dynamics)
      nextState[i] = Math.tanh(sum);
    }

    this.reservoir = nextState;
    this.resonanceState.reservoirState = this.reservoir;
  }

  private calculateEntropy(): number {
    // Simplified spectral entropy of the reservoir state
    return (
      this.reservoir.reduce((acc, val) => acc + Math.abs(val), 0) /
      this.RESERVOIR_SIZE
    );
  }

  public getMetabolicState(): {
    resonance: MetabolicResonance;
    rhythm: TemporalRhythm;
  } {
    return { resonance: this.resonanceState, rhythm: this.rhythm };
  }

  /**
   * Returns a pacing delay in ms based on current resonance
   */
  public getPacingDelay(): number {
    return Math.floor(1000 * this.resonanceState.rateLimitFactor);
  }

  /**
   * Cleanup resources - call when shutting down
   */
  public cleanup(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    log.info("EcologicalResonance cleaned up");
  }
}

export const ecologicalResonance = EcologicalResonance.getInstance();

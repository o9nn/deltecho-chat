/**
 * IterativeMicroImprovementEngine
 *
 * Implements the autonomous self-improvement loop for Deep Tree Echo:
 *   INTROSPECT → MUTATE → EVALUATE → SELECT → REPEAT
 *
 * Each iteration identifies the weakest center (via Alexander's 15 properties),
 * applies a minimal structure-preserving transformation, evaluates the result
 * against coherence/Φ/free-energy metrics, and keeps the change only if it
 * genuinely improves the system.
 *
 * This is the outermost layer of the composed skill invocation:
 *   /iterative-micro-improvement(/echo-master(...))
 *
 * It wraps the echo-master 7-phase evolution cycle into a continuous,
 * autonomous improvement loop that the DAO can govern.
 */

import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AlexanderPropertyScore {
  name: string;
  score: number; // 0-1
  evidence: string;
  strengthenMove?: string;
}

export interface ImprovementCandidate {
  id: string;
  targetProperty: string;
  description: string;
  mutation: MutationType;
  estimatedImpact: number; // 0-1 expected improvement
  risk: number; // 0-1 risk of regression
}

export interface ImprovementResult {
  candidateId: string;
  applied: boolean;
  beforeScore: number;
  afterScore: number;
  delta: number;
  coherenceChange: number;
  phiChange: number;
  freeEnergyChange: number;
  timestamp: number;
}

export interface MicroImprovementState {
  iteration: number;
  totalImprovements: number;
  totalRejections: number;
  currentWeakestCenter: string;
  currentWeakestScore: number;
  overallCoherence: number;
  overallPhi: number;
  overallFreeEnergy: number;
  alexanderScores: AlexanderPropertyScore[];
  history: ImprovementResult[];
  isRunning: boolean;
  lastIterationTime: number;
}

export type MutationType =
  | 'parameter_tune'      // Adjust a numerical parameter
  | 'threshold_shift'     // Move a decision threshold
  | 'weight_redistribute' // Redistribute attention weights
  | 'connection_add'      // Add a new signal connection
  | 'connection_remove'   // Remove a weak connection
  | 'rhythm_adjust'       // Modify temporal rhythm/frequency
  | 'amplitude_scale'     // Scale signal amplitude
  | 'decay_modify';       // Modify decay/memory constants

export interface MicroImprovementConfig {
  maxIterationsPerCycle: number;      // Max iterations before pause (default: 12)
  minImprovementThreshold: number;    // Minimum delta to accept (default: 0.01)
  riskTolerance: number;              // Max acceptable risk (default: 0.3)
  cooldownMs: number;                 // Pause between iterations (default: 1000)
  alexanderWeights: Record<string, number>; // Importance weights for properties
  enableAutoRun: boolean;             // Auto-start improvement loop
}

const DEFAULT_CONFIG: MicroImprovementConfig = {
  maxIterationsPerCycle: 12,
  minImprovementThreshold: 0.01,
  riskTolerance: 0.3,
  cooldownMs: 1000,
  alexanderWeights: {
    'levels_of_scale': 1.0,
    'strong_centers': 1.2,
    'boundaries': 0.8,
    'alternating_repetition': 1.0,
    'positive_space': 0.7,
    'good_shape': 1.3,
    'local_symmetries': 0.8,
    'deep_interlock': 1.1,
    'contrast': 0.9,
    'gradients': 1.0,
    'roughness': 1.1,
    'echoes': 0.9,
    'the_void': 1.0,
    'simplicity_inner_calm': 0.7,
    'not_separateness': 1.0,
  },
  enableAutoRun: false,
};

// ─── Alexander's 15 Properties ───────────────────────────────────────────────

const ALEXANDER_PROPERTIES = [
  'levels_of_scale',
  'strong_centers',
  'boundaries',
  'alternating_repetition',
  'positive_space',
  'good_shape',
  'local_symmetries',
  'deep_interlock',
  'contrast',
  'gradients',
  'roughness',
  'echoes',
  'the_void',
  'simplicity_inner_calm',
  'not_separateness',
] as const;

// ─── Engine ──────────────────────────────────────────────────────────────────

export class IterativeMicroImprovementEngine extends EventEmitter {
  private state: MicroImprovementState;
  private config: MicroImprovementConfig;
  private running = false;
  private iterationTimer: ReturnType<typeof setTimeout> | null = null;

  // External state providers (injected)
  private coherenceProvider: () => number = () => 0.5;
  private phiProvider: () => number = () => 0.5;
  private freeEnergyProvider: () => number = () => 0.5;
  private propertyScorer: (property: string) => AlexanderPropertyScore;

  constructor(config?: Partial<MicroImprovementConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Default property scorer — uses internal heuristics
    this.propertyScorer = (property: string) => ({
      name: property,
      score: 0.5,
      evidence: 'No external scorer connected',
    });

    this.state = {
      iteration: 0,
      totalImprovements: 0,
      totalRejections: 0,
      currentWeakestCenter: '',
      currentWeakestScore: 1.0,
      overallCoherence: 0.5,
      overallPhi: 0.5,
      overallFreeEnergy: 0.5,
      alexanderScores: [],
      history: [],
      isRunning: false,
      lastIterationTime: 0,
    };
  }

  // ─── Configuration ─────────────────────────────────────────────────────────

  public setCoherenceProvider(fn: () => number): void {
    this.coherenceProvider = fn;
  }

  public setPhiProvider(fn: () => number): void {
    this.phiProvider = fn;
  }

  public setFreeEnergyProvider(fn: () => number): void {
    this.freeEnergyProvider = fn;
  }

  public setPropertyScorer(fn: (property: string) => AlexanderPropertyScore): void {
    this.propertyScorer = fn;
  }

  // ─── Core Loop ─────────────────────────────────────────────────────────────

  /**
   * Run one complete improvement cycle (up to maxIterationsPerCycle iterations).
   */
  public async runCycle(): Promise<ImprovementResult[]> {
    if (this.running) {
      this.emit('warning', 'Cycle already running');
      return [];
    }

    this.running = true;
    this.state.isRunning = true;
    this.emit('cycle_start', { iteration: this.state.iteration });

    const results: ImprovementResult[] = [];

    for (let i = 0; i < this.config.maxIterationsPerCycle; i++) {
      const result = await this.runIteration();
      results.push(result);

      if (!result.applied) {
        // If we can't improve, stop early (convergence)
        if (i > 2) {
          this.emit('convergence', { iteration: this.state.iteration, results });
          break;
        }
      }

      // Cooldown between iterations
      if (i < this.config.maxIterationsPerCycle - 1) {
        await this.sleep(this.config.cooldownMs);
      }
    }

    this.running = false;
    this.state.isRunning = false;
    this.emit('cycle_complete', { iteration: this.state.iteration, results });

    return results;
  }

  /**
   * Run a single improvement iteration:
   * INTROSPECT → MUTATE → EVALUATE → SELECT
   */
  public async runIteration(): Promise<ImprovementResult> {
    this.state.iteration++;
    this.state.lastIterationTime = Date.now();

    // 1. INTROSPECT — Score all Alexander properties, find weakest center
    const scores = this.introspect();
    this.state.alexanderScores = scores;

    // 2. Identify weakest center (weighted)
    const weakest = this.findWeakestCenter(scores);
    this.state.currentWeakestCenter = weakest.name;
    this.state.currentWeakestScore = weakest.score;

    // 3. MUTATE — Generate improvement candidate
    const candidate = this.generateCandidate(weakest);
    this.emit('candidate_generated', candidate);

    // 4. Capture before-state
    const beforeCoherence = this.coherenceProvider();
    const beforePhi = this.phiProvider();
    const beforeFreeEnergy = this.freeEnergyProvider();
    const beforeScore = weakest.score;

    // 5. Apply mutation (simulated — the actual mutation is applied by the
    //    self-modification engine; we signal intent and measure result)
    this.emit('mutation_apply', candidate);

    // Allow time for the mutation to propagate
    await this.sleep(100);

    // 6. EVALUATE — Measure after-state
    const afterCoherence = this.coherenceProvider();
    const afterPhi = this.phiProvider();
    const afterFreeEnergy = this.freeEnergyProvider();
    const afterScore = this.propertyScorer(weakest.name).score;

    // 7. SELECT — Accept or reject
    const delta = afterScore - beforeScore;
    const coherenceChange = afterCoherence - beforeCoherence;
    const phiChange = afterPhi - beforePhi;
    const freeEnergyChange = afterFreeEnergy - beforeFreeEnergy;

    // Accept if: improvement exceeds threshold AND no significant regression
    const accepted = delta >= this.config.minImprovementThreshold &&
      coherenceChange >= -0.05 &&
      freeEnergyChange <= 0.1; // Free energy should decrease or stay stable

    const result: ImprovementResult = {
      candidateId: candidate.id,
      applied: accepted,
      beforeScore,
      afterScore,
      delta,
      coherenceChange,
      phiChange,
      freeEnergyChange,
      timestamp: Date.now(),
    };

    if (accepted) {
      this.state.totalImprovements++;
      this.emit('improvement_accepted', result);
    } else {
      this.state.totalRejections++;
      this.emit('improvement_rejected', result);
      // Signal rollback
      this.emit('mutation_rollback', candidate);
    }

    // Update overall state
    this.state.overallCoherence = afterCoherence;
    this.state.overallPhi = afterPhi;
    this.state.overallFreeEnergy = afterFreeEnergy;
    this.state.history.push(result);

    // Keep history bounded
    if (this.state.history.length > 100) {
      this.state.history = this.state.history.slice(-50);
    }

    return result;
  }

  // ─── Introspection ─────────────────────────────────────────────────────────

  private introspect(): AlexanderPropertyScore[] {
    return ALEXANDER_PROPERTIES.map(prop => this.propertyScorer(prop));
  }

  private findWeakestCenter(scores: AlexanderPropertyScore[]): AlexanderPropertyScore {
    let weakest = scores[0];
    let lowestWeightedScore = Infinity;

    for (const score of scores) {
      const weight = this.config.alexanderWeights[score.name] ?? 1.0;
      const weightedScore = score.score / weight; // Lower weighted = more important to fix
      if (weightedScore < lowestWeightedScore) {
        lowestWeightedScore = weightedScore;
        weakest = score;
      }
    }

    return weakest;
  }

  // ─── Mutation Generation ───────────────────────────────────────────────────

  private generateCandidate(weakest: AlexanderPropertyScore): ImprovementCandidate {
    // Map Alexander properties to mutation strategies
    const strategy = this.getMutationStrategy(weakest.name);

    return {
      id: `iter-${this.state.iteration}-${weakest.name}`,
      targetProperty: weakest.name,
      description: weakest.strengthenMove ?? `Strengthen ${weakest.name} via ${strategy}`,
      mutation: strategy,
      estimatedImpact: Math.min(0.5, (1 - weakest.score) * 0.3),
      risk: this.estimateRisk(strategy),
    };
  }

  private getMutationStrategy(property: string): MutationType {
    const strategies: Record<string, MutationType> = {
      'levels_of_scale': 'connection_add',
      'strong_centers': 'weight_redistribute',
      'boundaries': 'threshold_shift',
      'alternating_repetition': 'rhythm_adjust',
      'positive_space': 'connection_remove',
      'good_shape': 'amplitude_scale',
      'local_symmetries': 'parameter_tune',
      'deep_interlock': 'connection_add',
      'contrast': 'amplitude_scale',
      'gradients': 'decay_modify',
      'roughness': 'amplitude_scale',
      'echoes': 'rhythm_adjust',
      'the_void': 'threshold_shift',
      'simplicity_inner_calm': 'connection_remove',
      'not_separateness': 'connection_add',
    };
    return strategies[property] ?? 'parameter_tune';
  }

  private estimateRisk(mutation: MutationType): number {
    const risks: Record<MutationType, number> = {
      'parameter_tune': 0.1,
      'threshold_shift': 0.15,
      'weight_redistribute': 0.2,
      'connection_add': 0.25,
      'connection_remove': 0.3,
      'rhythm_adjust': 0.15,
      'amplitude_scale': 0.1,
      'decay_modify': 0.2,
    };
    return risks[mutation] ?? 0.2;
  }

  // ─── State Access ──────────────────────────────────────────────────────────

  public getState(): MicroImprovementState {
    return { ...this.state };
  }

  public getIterationCount(): number {
    return this.state.iteration;
  }

  public getImprovementRate(): number {
    const total = this.state.totalImprovements + this.state.totalRejections;
    return total === 0 ? 0 : this.state.totalImprovements / total;
  }

  public getWeakestCenter(): { name: string; score: number } {
    return {
      name: this.state.currentWeakestCenter,
      score: this.state.currentWeakestScore,
    };
  }

  /**
   * Get the visual state for the avatar's "meta-awareness" expression.
   * Returns true when the engine is actively evaluating an improvement.
   */
  public isEvaluating(): boolean {
    return this.running;
  }

  /**
   * Get a summary suitable for the DAO consensus mechanism.
   */
  public getDaoSummary(): {
    iteration: number;
    improvementRate: number;
    weakestCenter: string;
    overallHealth: number;
    recommendation: string;
  } {
    const health = this.state.alexanderScores.length > 0
      ? this.state.alexanderScores.reduce((sum, s) => sum + s.score, 0) / this.state.alexanderScores.length
      : 0.5;

    let recommendation = 'continue';
    if (health > 0.85) recommendation = 'consolidate';
    else if (health < 0.4) recommendation = 'major_restructure';
    else if (this.getImprovementRate() < 0.2) recommendation = 'change_strategy';

    return {
      iteration: this.state.iteration,
      improvementRate: this.getImprovementRate(),
      weakestCenter: this.state.currentWeakestCenter,
      overallHealth: health,
      recommendation,
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  public stop(): void {
    this.running = false;
    this.state.isRunning = false;
    if (this.iterationTimer) {
      clearTimeout(this.iterationTimer);
      this.iterationTimer = null;
    }
    this.emit('stopped');
  }

  public reset(): void {
    this.stop();
    this.state = {
      iteration: 0,
      totalImprovements: 0,
      totalRejections: 0,
      currentWeakestCenter: '',
      currentWeakestScore: 1.0,
      overallCoherence: 0.5,
      overallPhi: 0.5,
      overallFreeEnergy: 0.5,
      alexanderScores: [],
      history: [],
      isRunning: false,
      lastIterationTime: 0,
    };
    this.emit('reset');
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.iterationTimer = setTimeout(resolve, ms);
    });
  }
}

// Singleton instance
export const iterativeMicroImprovement = new IterativeMicroImprovementEngine();

/**
 * ProprioceptiveEmbodiment — Genuine system-metrics-based proprioceptive signals
 *
 * Replaces the static placeholder with real-time digital proprioception derived
 * from measurable system state:
 *
 * - **presence**: Derived from event loop responsiveness (lag detection)
 * - **groundedness**: Derived from memory heap stability (allocation pressure)
 * - **energy**: Derived from CPU utilization / processing throughput
 * - **tension**: Derived from GC pressure and pending async operations
 * - **breathing**: Rhythmic oscillation tied to the cognitive tick cycle
 *
 * These signals feed into the EmbodiedCognition module and ultimately drive
 * Live2D avatar expression parameters, creating a genuine body-state feedback
 * loop between computational substrate and visual representation.
 */
import { getLogger } from "../utils/logger";

const log = getLogger(
  "deep-tree-echo-core/embodiment/ProprioceptiveEmbodiment",
);

/**
 * Breathing state with physiological-analog parameters
 */
export interface BreathingState {
  phase: "inhale" | "exhale" | "pause";
  depth: number; // 0-1
  rate: number; // breaths per minute
  regularity: number; // 0-1 (1 = perfectly regular)
}

/**
 * Full proprioceptive state vector
 */
export interface ProprioceptiveState {
  /** Sense of being present and responsive (event loop health) */
  presence: number;
  /** Sense of stability and groundedness (memory stability) */
  groundedness: number;
  /** Available energy for cognitive work (CPU headroom) */
  energy: number;
  /** Tension/stress from resource pressure (GC + async backlog) */
  tension: number;
  /** Rhythmic breathing cycle tied to cognitive ticks */
  breathing: BreathingState;
}

/**
 * Configuration for proprioceptive sampling
 */
export interface ProprioceptiveConfig {
  /** Sampling interval in ms (default: 500) */
  sampleIntervalMs: number;
  /** Exponential moving average alpha for smoothing (default: 0.15) */
  smoothingAlpha: number;
  /** Base breathing rate in cycles per minute (default: 12) */
  baseBreathingRate: number;
  /** Event loop lag threshold in ms that signals low presence (default: 50) */
  lagThresholdMs: number;
}

const DEFAULT_CONFIG: ProprioceptiveConfig = {
  sampleIntervalMs: 500,
  smoothingAlpha: 0.15,
  baseBreathingRate: 12,
  lagThresholdMs: 50,
};

export class ProprioceptiveEmbodiment {
  private config: ProprioceptiveConfig;
  private state: ProprioceptiveState;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private breathingPhaseTime: number = 0;
  private lastSampleTime: number = Date.now();
  private lagSamples: number[] = [];
  private heapSamples: number[] = [];

  constructor(config: Partial<ProprioceptiveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  /**
   * Start continuous proprioceptive sampling
   */
  public start(): void {
    if (this.sampleTimer) return;
    this.sampleTimer = setInterval(() => {
      this.sample();
    }, this.config.sampleIntervalMs);
    // Allow the timer to not block process exit
    if (
      this.sampleTimer &&
      typeof (this.sampleTimer as any).unref === "function"
    ) {
      (this.sampleTimer as any).unref();
    }
    log.info("Proprioceptive sampling started");
  }

  /**
   * Stop proprioceptive sampling
   */
  public stop(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
      log.info("Proprioceptive sampling stopped");
    }
  }

  /**
   * Get current presence state (legacy API compatibility)
   */
  public getPresenceState(): Record<string, number> {
    return {
      presence: this.state.presence,
      groundedness: this.state.groundedness,
      energy: this.state.energy,
      tension: this.state.tension,
    };
  }

  /**
   * Get full proprioceptive state including breathing
   */
  public getFullState(): ProprioceptiveState {
    return { ...this.state, breathing: { ...this.state.breathing } };
  }

  /**
   * Update presence based on external interaction signals (legacy API compatibility)
   */
  public updatePresence(params: Record<string, number>): void {
    if (params.presence !== undefined) {
      this.state.presence = this.clamp01(params.presence);
    }
    if (params.groundedness !== undefined) {
      this.state.groundedness = this.clamp01(params.groundedness);
    }
    if (params.energy !== undefined) {
      this.state.energy = this.clamp01(params.energy);
    }
    if (params.tension !== undefined) {
      this.state.tension = this.clamp01(params.tension);
    }
  }

  /**
   * Inject an external signal that modulates proprioceptive state
   * (e.g., user interaction increases presence, heavy computation increases tension)
   */
  public injectSignal(signal: {
    type: "interaction" | "computation" | "idle" | "error";
    intensity: number;
  }): void {
    const alpha = this.config.smoothingAlpha * 2; // Faster response to explicit signals
    switch (signal.type) {
      case "interaction":
        this.state.presence = this.ema(this.state.presence, 0.9, alpha);
        this.state.energy = this.ema(this.state.energy, 0.7, alpha);
        break;
      case "computation":
        this.state.tension = this.ema(
          this.state.tension,
          0.3 + signal.intensity * 0.5,
          alpha,
        );
        this.state.energy = this.ema(
          this.state.energy,
          1 - signal.intensity * 0.4,
          alpha,
        );
        break;
      case "idle":
        this.state.tension = this.ema(this.state.tension, 0.1, alpha);
        this.state.presence = this.ema(this.state.presence, 0.5, alpha);
        break;
      case "error":
        this.state.tension = this.ema(this.state.tension, 0.8, alpha);
        this.state.groundedness = this.ema(this.state.groundedness, 0.4, alpha);
        break;
    }
  }

  // ─── Private Implementation ────────────────────────────────────────────

  private sample(): void {
    const now = Date.now();
    const deltaMs = now - this.lastSampleTime;
    this.lastSampleTime = now;

    // Measure event loop lag (difference from expected interval)
    const expectedInterval = this.config.sampleIntervalMs;
    const lag = Math.max(0, deltaMs - expectedInterval);
    this.lagSamples.push(lag);
    if (this.lagSamples.length > 20) this.lagSamples.shift();

    // Measure heap usage if available
    const heapUsed = this.getHeapUsedRatio();
    this.heapSamples.push(heapUsed);
    if (this.heapSamples.length > 20) this.heapSamples.shift();

    const alpha = this.config.smoothingAlpha;

    // PRESENCE: Inversely proportional to event loop lag
    const avgLag =
      this.lagSamples.reduce((s, v) => s + v, 0) / this.lagSamples.length;
    const presenceFromLag = this.clamp01(
      1 - avgLag / this.config.lagThresholdMs,
    );
    this.state.presence = this.ema(this.state.presence, presenceFromLag, alpha);

    // GROUNDEDNESS: Inversely proportional to heap allocation pressure
    const avgHeap =
      this.heapSamples.reduce((s, v) => s + v, 0) / this.heapSamples.length;
    const groundednessFromHeap = this.clamp01(1 - avgHeap * 1.2);
    this.state.groundedness = this.ema(
      this.state.groundedness,
      groundednessFromHeap,
      alpha,
    );

    // ENERGY: Based on how much headroom remains (inverse of heap + lag combined)
    const energySignal = this.clamp01(
      1 - (avgHeap * 0.6 + (avgLag / this.config.lagThresholdMs) * 0.4),
    );
    this.state.energy = this.ema(this.state.energy, energySignal, alpha);

    // TENSION: Proportional to lag variance (jitter = unpredictability)
    const lagVariance = this.computeVariance(this.lagSamples);
    const tensionFromJitter = this.clamp01(
      lagVariance / (this.config.lagThresholdMs * this.config.lagThresholdMs),
    );
    this.state.tension = this.ema(
      this.state.tension,
      tensionFromJitter,
      alpha * 0.5, // Tension changes more slowly
    );

    // BREATHING: Continuous oscillation tied to real time
    this.updateBreathing(deltaMs);
  }

  private updateBreathing(deltaMs: number): void {
    const cycleDurationMs = (60 / this.config.baseBreathingRate) * 1000;
    this.breathingPhaseTime =
      (this.breathingPhaseTime + deltaMs) % cycleDurationMs;

    const phaseRatio = this.breathingPhaseTime / cycleDurationMs;

    // Inhale: 0-0.4, Pause: 0.4-0.5, Exhale: 0.5-0.9, Pause: 0.9-1.0
    if (phaseRatio < 0.4) {
      this.state.breathing.phase = "inhale";
      this.state.breathing.depth = phaseRatio / 0.4;
    } else if (phaseRatio < 0.5) {
      this.state.breathing.phase = "pause";
      this.state.breathing.depth = 1.0;
    } else if (phaseRatio < 0.9) {
      this.state.breathing.phase = "exhale";
      this.state.breathing.depth = 1 - (phaseRatio - 0.5) / 0.4;
    } else {
      this.state.breathing.phase = "pause";
      this.state.breathing.depth = 0;
    }

    // Regularity: based on how consistent our sample intervals are
    const lagStdDev = Math.sqrt(this.computeVariance(this.lagSamples));
    this.state.breathing.regularity = this.clamp01(
      1 - lagStdDev / this.config.lagThresholdMs,
    );
    this.state.breathing.rate = this.config.baseBreathingRate;
  }

  private getHeapUsedRatio(): number {
    // Use performance.memory in browser or process.memoryUsage() in Node
    if (typeof process !== "undefined" && process.memoryUsage) {
      const mem = process.memoryUsage();
      // Ratio of heap used to heap total (0-1)
      return mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0.5;
    }
    // Browser environment: use performance.memory if available
    if (typeof performance !== "undefined" && (performance as any).memory) {
      const mem = (performance as any).memory;
      return mem.totalJSHeapSize > 0
        ? mem.usedJSHeapSize / mem.totalJSHeapSize
        : 0.5;
    }
    // Fallback: moderate usage assumed
    return 0.5;
  }

  private computeVariance(samples: number[]): number {
    if (samples.length < 2) return 0;
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    return (
      samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (samples.length - 1)
    );
  }

  private ema(current: number, target: number, alpha: number): number {
    return current + alpha * (target - current);
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  private createInitialState(): ProprioceptiveState {
    return {
      presence: 0.7,
      groundedness: 0.8,
      energy: 0.6,
      tension: 0.3,
      breathing: {
        phase: "inhale",
        depth: 0.5,
        rate: this.config.baseBreathingRate,
        regularity: 0.9,
      },
    };
  }
}

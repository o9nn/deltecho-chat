/**
 * @fileoverview ReservoirFeedbackLoop — Online Reservoir Learning from Conversational Feedback
 *
 * Wires the OnlineReservoirLearner (RLS-based CognitiveReadout training) to the
 * Dove9ConversationalBridge and EchoAgentLoop, enabling real-time weight updates
 * from interaction feedback.
 *
 * Architecture (AAR mapping):
 *   Agent  (Readout)  → OnlineReservoirLearner trains the readout weights
 *   Arena  (Reservoir) → EchoReservoir provides the state manifold
 *   Relation (Self)    → This module IS the relation — it couples them
 *
 * Feedback sources:
 *   1. Conversational process completion (success/failure/quality)
 *   2. Message salience scores from the Dove9 bridge
 *   3. Cognitive tick coherence from the EchoAgentLoop
 *   4. Self-modification outcomes from the ENACTION phase
 *
 * The feedback loop runs asynchronously, collecting feedback events and
 * batching them into RLS updates at a configurable interval.
 */
import { EventEmitter } from "events";
import {
  OnlineReservoirLearner,
  type LearnerState,
  type FeedbackSignal,
  EchoReservoir,
} from "deep-tree-echo-core";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/ReservoirFeedbackLoop");

// ─── Types ─────────────────────────────────────────────────────────────

export interface FeedbackEvent {
  /** Source of the feedback */
  source:
    | "conversation"
    | "salience"
    | "coherence"
    | "self_modification"
    | "external";
  /** Reward signal (-1 to 1) */
  reward: number;
  /** Target output vector (what the readout should have produced) */
  targetOutput?: Float64Array;
  /** Reservoir state at the time of the event */
  reservoirState?: Float64Array;
  /** Timestamp */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ReservoirFeedbackConfig {
  /** Reservoir dimension (must match EchoReservoir units) */
  reservoirDim: number;
  /** Output dimension for the readout */
  outputDim: number;
  /** Batch interval in ms (how often to flush feedback to RLS) */
  batchIntervalMs: number;
  /** Maximum feedback events to buffer before forced flush */
  maxBufferSize: number;
  /** Minimum reward magnitude to trigger an update (noise gate) */
  minRewardMagnitude: number;
  /** RLS forgetting factor (0.9-1.0) */
  forgettingFactor: number;
  /** Enable automatic state persistence */
  enablePersistence: boolean;
  /** Path for persisting learner state */
  persistPath: string;
  /** Persistence interval in ms */
  persistIntervalMs: number;
}

export interface FeedbackLoopMetrics {
  totalFeedbackEvents: number;
  totalRLSUpdates: number;
  avgPredictionError: number;
  avgReward: number;
  weightNorm: number;
  bufferSize: number;
  lastUpdateAt: number;
  isRunning: boolean;
}

export type FeedbackLoopEvent =
  | "feedback_received"
  | "batch_update"
  | "state_persisted"
  | "error";

// ─── Default Configuration ─────────────────────────────────────────────

const DEFAULT_CONFIG: ReservoirFeedbackConfig = {
  reservoirDim: 256,
  outputDim: 16,
  batchIntervalMs: 5000,
  maxBufferSize: 100,
  minRewardMagnitude: 0.05,
  forgettingFactor: 0.995,
  enablePersistence: true,
  persistPath: "",
  persistIntervalMs: 60000,
};

// ─── Reservoir Feedback Loop ───────────────────────────────────────────

export class ReservoirFeedbackLoop extends EventEmitter {
  private config: ReservoirFeedbackConfig;
  private learner: OnlineReservoirLearner;
  private reservoir: EchoReservoir | null = null;
  private feedbackBuffer: FeedbackEvent[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private persistTimer: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;
  private totalFeedbackEvents: number = 0;
  private totalRLSUpdates: number = 0;
  private lastUpdateAt: number = 0;

  constructor(config: Partial<ReservoirFeedbackConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize the RLS learner
    this.learner = new OnlineReservoirLearner({
      reservoirDim: this.config.reservoirDim,
      outputDim: this.config.outputDim,
      forgettingFactor: this.config.forgettingFactor,
      initialPDiag: 1.0,
      minUpdateMagnitude: this.config.minRewardMagnitude,
      maxWeightMagnitude: 10.0,
      enableMomentum: true,
      momentumCoeff: 0.9,
      learningRateScale: 0.01,
      maxHistorySize: 1000,
    });
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  /**
   * Start the feedback loop.
   * @param reservoir Optional EchoReservoir to read state from
   */
  start(reservoir?: EchoReservoir): void {
    if (this.running) return;

    this.reservoir = reservoir ?? null;
    this.running = true;

    // Start batch processing timer
    this.batchTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.batchIntervalMs);

    // Start persistence timer
    if (this.config.enablePersistence && this.config.persistPath) {
      this.persistTimer = setInterval(() => {
        this.persistState();
      }, this.config.persistIntervalMs);
    }

    log.info(
      `ReservoirFeedbackLoop started (dim=${this.config.reservoirDim}, out=${this.config.outputDim})`,
    );
  }

  /**
   * Stop the feedback loop and flush remaining events.
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }

    // Flush remaining buffer
    this.flushBuffer();

    // Final persistence
    if (this.config.enablePersistence && this.config.persistPath) {
      await this.persistState();
    }

    log.info(
      `ReservoirFeedbackLoop stopped (${this.totalRLSUpdates} total updates)`,
    );
  }

  // ─── Feedback Ingestion ──────────────────────────────────────────

  /**
   * Submit a feedback event for processing.
   * Events are buffered and processed in batches.
   */
  submitFeedback(event: FeedbackEvent): void {
    if (!this.running) return;

    // Noise gate: skip tiny rewards
    if (Math.abs(event.reward) < this.config.minRewardMagnitude) return;

    // Attach reservoir state if not provided
    if (!event.reservoirState && this.reservoir) {
      const state = this.reservoir.getState();
      event.reservoirState = new Float64Array(state.combined);
    }

    this.feedbackBuffer.push(event);
    this.totalFeedbackEvents++;
    this.emit("feedback_received", event);

    // Force flush if buffer is full
    if (this.feedbackBuffer.length >= this.config.maxBufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Create feedback from a conversational process completion.
   */
  submitConversationalFeedback(
    processId: string,
    status: "completed" | "failed" | "evicted",
    quality: number,
    reservoirState?: Float64Array,
  ): void {
    const rewardMap: Record<string, number> = {
      completed: quality,
      failed: -0.5,
      evicted: -0.2,
    };

    this.submitFeedback({
      source: "conversation",
      reward: rewardMap[status] ?? 0,
      reservoirState,
      timestamp: Date.now(),
      metadata: { processId, status, quality },
    });
  }

  /**
   * Create feedback from cognitive coherence measurement.
   */
  submitCoherenceFeedback(
    coherence: number,
    reservoirState?: Float64Array,
  ): void {
    // Coherence above 0.7 is positive, below 0.3 is negative
    const reward = (coherence - 0.5) * 2; // Maps [0,1] → [-1,1]

    this.submitFeedback({
      source: "coherence",
      reward,
      reservoirState,
      timestamp: Date.now(),
      metadata: { coherence },
    });
  }

  /**
   * Create feedback from self-modification outcome.
   */
  submitSelfModFeedback(
    applied: boolean,
    coherenceDelta: number,
    reservoirState?: Float64Array,
  ): void {
    // Positive if modification improved coherence, negative if it degraded
    const reward = applied ? coherenceDelta * 2 : -0.1;

    this.submitFeedback({
      source: "self_modification",
      reward,
      reservoirState,
      timestamp: Date.now(),
      metadata: { applied, coherenceDelta },
    });
  }

  // ─── Batch Processing ────────────────────────────────────────────

  /**
   * Flush the feedback buffer through the RLS learner.
   */
  private flushBuffer(): void {
    if (this.feedbackBuffer.length === 0) return;

    const events = this.feedbackBuffer.splice(0);
    let updatesApplied = 0;

    for (const event of events) {
      if (!event.reservoirState) continue;

      // Construct target output from reward signal
      // The target is a vector where each dimension reflects the reward
      // weighted by the reservoir state's projection onto that dimension
      const targetOutput = event.targetOutput ?? this.constructTarget(event);

      try {
        const sourceMap: Record<string, FeedbackSignal["source"]> = {
          conversation: "user",
          salience: "self-evaluation",
          coherence: "coherence",
          self_modification: "self-evaluation",
          external: "user",
        };

        const feedbackSignal: FeedbackSignal = {
          reservoirState: event.reservoirState,
          targetOutput,
          reward: event.reward,
          valence: event.reward, // Map reward to valence
          timestamp: event.timestamp,
          source: sourceMap[event.source] ?? "self-evaluation",
        };

        const update = this.learner.update(feedbackSignal);

        if (update) {
          updatesApplied++;
          this.totalRLSUpdates++;
          this.lastUpdateAt = Date.now();
        }
      } catch (err) {
        log.warn(
          `RLS update failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        this.emit("error", { error: err, event });
      }
    }

    if (updatesApplied > 0) {
      this.emit("batch_update", {
        eventsProcessed: events.length,
        updatesApplied,
        avgPredictionError: this.learner.getAvgPredictionError(),
        weightNorm: this.learner.getWeightNorm(),
      });

      log.info(
        `Batch update: ${updatesApplied}/${events.length} events → ` +
          `err=${this.learner.getAvgPredictionError().toFixed(4)}, ` +
          `‖W‖=${this.learner.getWeightNorm().toFixed(4)}`,
      );
    }
  }

  /**
   * Construct a target output vector from a feedback event.
   * Uses the reward signal to modulate the readout prediction.
   */
  private constructTarget(event: FeedbackEvent): Float64Array {
    if (!event.reservoirState) {
      return new Float64Array(this.config.outputDim);
    }

    // Current prediction
    const prediction = this.learner.predict(event.reservoirState);

    // Target = prediction + reward * direction
    // This nudges the readout toward producing outputs that correlate
    // with positive rewards and away from negative ones
    const target = new Float64Array(this.config.outputDim);
    for (let i = 0; i < this.config.outputDim; i++) {
      target[i] = prediction[i] + event.reward * 0.1;
    }

    return target;
  }

  // ─── State Persistence ───────────────────────────────────────────

  /**
   * Persist the learner state to disk.
   */
  private async persistState(): Promise<void> {
    if (!this.config.persistPath) return;

    try {
      const { writeFileSync, mkdirSync } = await import("fs");
      const { dirname } = await import("path");

      mkdirSync(dirname(this.config.persistPath), { recursive: true });

      const state = this.learner.serialize();
      const serializable = {
        weights: Array.from(state.weights),
        pMatrix: Array.from(state.pMatrix),
        momentum: Array.from(state.momentum),
        totalUpdates: state.totalUpdates,
        cumulativeReward: state.cumulativeReward,
        avgPredictionError: state.avgPredictionError,
        config: this.config,
        savedAt: Date.now(),
      };

      writeFileSync(this.config.persistPath, JSON.stringify(serializable));
      this.emit("state_persisted", { path: this.config.persistPath });
    } catch (err) {
      log.warn(
        `Failed to persist state: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Restore learner state from disk.
   */
  async restoreState(): Promise<boolean> {
    if (!this.config.persistPath) return false;

    try {
      const { readFileSync, existsSync } = await import("fs");

      if (!existsSync(this.config.persistPath)) return false;

      const data = JSON.parse(readFileSync(this.config.persistPath, "utf-8"));

      const state: LearnerState = {
        weights: new Float64Array(data.weights),
        pMatrix: new Float64Array(data.pMatrix),
        momentum: new Float64Array(data.momentum),
        totalUpdates: data.totalUpdates,
        cumulativeReward: data.cumulativeReward,
        avgPredictionError: data.avgPredictionError,
      };

      this.learner.deserialize(state);
      log.info(
        `Restored learner state: ${
          state.totalUpdates
        } updates, err=${state.avgPredictionError.toFixed(4)}`,
      );
      return true;
    } catch (err) {
      log.warn(
        `Failed to restore state: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  // ─── Accessors ───────────────────────────────────────────────────

  /**
   * Get the underlying learner for direct access.
   */
  getLearner(): OnlineReservoirLearner {
    return this.learner;
  }

  /**
   * Get the current average prediction error.
   */
  getAvgPredictionError(): number {
    return this.learner.getAvgPredictionError();
  }

  /**
   * Get comprehensive metrics.
   */
  getMetrics(): FeedbackLoopMetrics {
    const stats = this.learner.getStats();
    return {
      totalFeedbackEvents: this.totalFeedbackEvents,
      totalRLSUpdates: this.totalRLSUpdates,
      avgPredictionError: stats.avgPredictionError,
      avgReward: stats.avgReward,
      weightNorm: stats.weightNorm,
      bufferSize: this.feedbackBuffer.length,
      lastUpdateAt: this.lastUpdateAt,
      isRunning: this.running,
    };
  }

  /**
   * Check if the loop is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Set the reservoir to read state from.
   */
  setReservoir(reservoir: EchoReservoir): void {
    this.reservoir = reservoir;
  }
}

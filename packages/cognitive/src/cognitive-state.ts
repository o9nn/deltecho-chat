/**
 * Cognitive State Manager for Deep Tree Echo
 *
 * Manages the unified cognitive state including triadic streams,
 * memory context, reasoning state, and emotional dynamics.
 */

import { EventEmitter } from "events";
import {
  UnifiedCognitiveState,
  TriadicStream,
  HyperDimensionalVector,
  AtomSpaceSnapshot,
  EmotionalVector,
  DEFAULT_EMOTIONAL_VECTOR,
  CognitiveEvent,
  CognitiveEventListener,
} from "./types";
import { LCMSynchronizer, _OperadicState } from "@deltecho/sys6-triality";
import { Dove9Engine, _Dove9State } from "@deltecho/dove9";

/**
 * Configuration for cognitive state manager
 */
export interface CognitiveStateConfig {
  /** Maximum number of active streams */
  maxStreams: number;
  /** Stream timeout (ms) */
  streamTimeout: number;
  /** Enable automatic phase cycling */
  enablePhaseCycle: boolean;
  /** Phase cycle interval (ms) */
  phaseCycleInterval: number;
  /** Emotional decay rate per second */
  emotionalDecayRate: number;
}

/**
 * Default state configuration
 */
export const DEFAULT_STATE_CONFIG: CognitiveStateConfig = {
  maxStreams: 3,
  streamTimeout: 30000,
  enablePhaseCycle: true,
  phaseCycleInterval: 1000, // 30 phases over 30 seconds
  emotionalDecayRate: 0.05,
};

/**
 * CognitiveStateManager handles all cognitive state operations
 */
export class CognitiveStateManager extends EventEmitter {
  private config: CognitiveStateConfig;
  private state: UnifiedCognitiveState;
  private phaseIntervalId: ReturnType<typeof setInterval> | null = null;
  private streamCleanupId: ReturnType<typeof setInterval> | null = null;

  // Formal engines
  private sys6Synchronizer: LCMSynchronizer;
  private dove9Engine: Dove9Engine;

  constructor(config: Partial<CognitiveStateConfig> = {}) {
    super();
    this.config = { ...DEFAULT_STATE_CONFIG, ...config };

    this.sys6Synchronizer = new LCMSynchronizer();
    this.dove9Engine = new Dove9Engine();

    const initialSys6 = this.sys6Synchronizer.tick();
    const initialDove9 = this.dove9Engine.tick();

    this.state = {
      activeStreams: [],
      memoryContext: null,
      reasoningState: null,
      emotionalState: { ...DEFAULT_EMOTIONAL_VECTOR },
      currentPhase: initialSys6.cycleStep,
      sys6State: initialSys6,
      dove9State: initialDove9,
      lastUpdated: Date.now(),
      cognitiveLoad: 0,
    };
  }

  /**
   * Create initial cognitive state
   */
  private createInitialState(): UnifiedCognitiveState {
    return {
      activeStreams: [],
      memoryContext: null,
      reasoningState: null,
      emotionalState: { ...DEFAULT_EMOTIONAL_VECTOR },
      currentPhase: 0,
      lastUpdated: Date.now(),
      cognitiveLoad: 0,
    };
  }

  /**
   * Start automatic state management
   */
  start(): void {
    if (this.config.enablePhaseCycle) {
      this.phaseIntervalId = setInterval(() => {
        this.advancePhase();
      }, this.config.phaseCycleInterval);
    }

    // Stream cleanup
    this.streamCleanupId = setInterval(() => {
      this.cleanupStreams();
    }, 5000);
  }

  /**
   * Stop automatic state management
   */
  stop(): void {
    if (this.phaseIntervalId) {
      clearInterval(this.phaseIntervalId);
      this.phaseIntervalId = null;
    }
    if (this.streamCleanupId) {
      clearInterval(this.streamCleanupId);
      this.streamCleanupId = null;
    }
  }

  /**
   * Get current cognitive state
   */
  getState(): UnifiedCognitiveState {
    return { ...this.state };
  }

  /**
   * Get current phase (0-29)
   */
  getCurrentPhase(): number {
    return this.state.currentPhase;
  }

  /**
   * Advance to next phase in Sys6 cycle
   */
  advancePhase(): void {
    const sys6State = this.sys6Synchronizer.tick();
    const dove9State = this.dove9Engine.tick();

    this.state.currentPhase = sys6State.cycleStep;
    this.state.sys6State = sys6State;
    this.state.dove9State = dove9State;
    this.state.lastUpdated = Date.now();

    // Sync state with formal engines
    // In a more complex implementation, we'd store the whole sys6State and dove9State

    // Apply emotional decay
    this.applyEmotionalDecay();

    this.emitEvent("state_updated", {
      phase: this.state.currentPhase,
      sys6State,
      dove9State,
    });
  }

  /**
   * Apply emotional decay over time
   */
  private applyEmotionalDecay(): void {
    const decay = this.config.emotionalDecayRate;
    const emotions = this.state.emotionalState;

    // Decay all emotions toward baseline
    emotions.joy = Math.max(0, emotions.joy - decay);
    emotions.sadness = Math.max(0, emotions.sadness - decay);
    emotions.anger = Math.max(0, emotions.anger - decay);
    emotions.fear = Math.max(0, emotions.fear - decay);
    emotions.surprise = Math.max(0, emotions.surprise - decay);
    emotions.disgust = Math.max(0, emotions.disgust - decay);
    emotions.contempt = Math.max(0, emotions.contempt - decay);

    // Interest has a baseline
    emotions.interest = Math.max(0.1, emotions.interest - decay * 0.5);

    // Recalculate dominant emotion
    this.updateDominantEmotion();
  }

  /**
   * Update dominant emotion based on current intensities
   */
  private updateDominantEmotion(): void {
    const emotions = this.state.emotionalState;
    let dominant = "neutral";
    let maxValue = 0.2; // Threshold for non-neutral

    const emotionKeys: (keyof EmotionalVector)[] = [
      "joy",
      "sadness",
      "anger",
      "fear",
      "surprise",
      "disgust",
      "contempt",
      "interest",
    ];

    for (const key of emotionKeys) {
      const value = emotions[key];
      if (typeof value === "number" && value > maxValue) {
        maxValue = value;
        dominant = key;
      }
    }

    emotions.dominant = dominant;
  }

  /**
   * Update emotional state
   */
  updateEmotionalState(updates: Partial<EmotionalVector>): void {
    Object.assign(this.state.emotionalState, updates);
    this.updateDominantEmotion();
    this.recalculateValenceArousal();
    this.state.lastUpdated = Date.now();
    this.emitEvent("state_updated", {
      emotionalState: this.state.emotionalState,
    });
  }

  /**
   * Recalculate valence and arousal
   */
  private recalculateValenceArousal(): void {
    const e = this.state.emotionalState;

    // Valence: positive emotions vs negative emotions
    const positive = e.joy + e.surprise * 0.3 + e.interest * 0.2;
    const negative = e.sadness + e.anger + e.fear + e.disgust + e.contempt;
    const total = positive + negative;

    e.valence =
      total > 0 ? Math.max(-1, Math.min(1, (positive - negative) / total)) : 0;

    // Arousal: high activation emotions
    const high = e.anger + e.fear + e.joy * 0.7 + e.surprise + e.interest * 0.3;
    const low = e.sadness + e.contempt;
    const arousalTotal = high + low;

    e.arousal =
      arousalTotal > 0
        ? Math.max(0, Math.min(1, high / (arousalTotal + 1)))
        : 0.1;
  }

  /**
   * Create a new triadic stream
   */
  createStream(
    phase: "sense" | "process" | "act",
    data: unknown,
  ): TriadicStream {
    const stream: TriadicStream = {
      id: `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      phase,
      data,
      timestamp: Date.now(),
      priority: 0.5,
      status: "pending",
    };

    // Enforce max streams
    if (this.state.activeStreams.length >= this.config.maxStreams) {
      // Remove oldest completed or lowest priority
      this.pruneStreams();
    }

    this.state.activeStreams.push(stream);
    this.updateCognitiveLoad();
    this.emitEvent("state_updated", { stream });

    return stream;
  }

  /**
   * Update stream status
   */
  updateStream(
    streamId: string,
    updates: Partial<
      Pick<TriadicStream, "phase" | "status" | "data" | "priority">
    >,
  ): boolean {
    const stream = this.state.activeStreams.find((s) => s.id === streamId);
    if (!stream) return false;

    Object.assign(stream, updates);
    this.updateCognitiveLoad();
    this.state.lastUpdated = Date.now();

    return true;
  }

  /**
   * Complete a stream
   */
  completeStream(streamId: string): boolean {
    return this.updateStream(streamId, { status: "complete" });
  }

  /**
   * Get active streams
   */
  getActiveStreams(): TriadicStream[] {
    return this.state.activeStreams.filter(
      (s) => s.status === "active" || s.status === "pending",
    );
  }

  /**
   * Prune streams to make room for new ones
   */
  private pruneStreams(): void {
    // First remove completed streams
    this.state.activeStreams = this.state.activeStreams.filter(
      (s) => s.status !== "complete",
    );

    // If still over limit, remove oldest pending
    while (this.state.activeStreams.length >= this.config.maxStreams) {
      const pending = this.state.activeStreams.filter(
        (s) => s.status === "pending",
      );
      if (pending.length > 0) {
        pending.sort((a, b) => a.timestamp - b.timestamp);
        const oldestId = pending[0].id;
        this.state.activeStreams = this.state.activeStreams.filter(
          (s) => s.id !== oldestId,
        );
      } else {
        break;
      }
    }
  }

  /**
   * Cleanup timed-out streams
   */
  private cleanupStreams(): void {
    const now = Date.now();
    const timeout = this.config.streamTimeout;

    this.state.activeStreams = this.state.activeStreams.filter((stream) => {
      if (stream.status === "complete") return false;
      if (now - stream.timestamp > timeout) {
        stream.status = "error";
        return false;
      }
      return true;
    });

    this.updateCognitiveLoad();
  }

  /**
   * Update cognitive load based on active streams
   */
  private updateCognitiveLoad(): void {
    const active = this.state.activeStreams.filter(
      (s) => s.status === "active" || s.status === "pending",
    );

    // Load based on number of streams and their priorities
    let load = 0;
    for (const stream of active) {
      load += stream.priority;
    }

    this.state.cognitiveLoad = Math.min(1, load / this.config.maxStreams);
  }

  /**
   * Set memory context
   */
  setMemoryContext(context: HyperDimensionalVector | null): void {
    this.state.memoryContext = context;
    this.state.lastUpdated = Date.now();
    this.emitEvent("state_updated", { memoryContext: context });
  }

  /**
   * Create a simple memory context from text
   */
  createSimpleMemoryContext(texts: string[]): HyperDimensionalVector {
    // Simple bag-of-words based vector
    const dimensions = 256;
    const values = new Float32Array(dimensions);

    for (const text of texts) {
      const tokens = text.toLowerCase().split(/\s+/);
      for (const token of tokens) {
        // Simple hash to dimension
        const hash = this.simpleHash(token);
        const dim = hash % dimensions;
        values[dim] += 1;
      }
    }

    // Normalize
    const mag = Math.sqrt(values.reduce((a, b) => a + b * b, 0));
    if (mag > 0) {
      for (let i = 0; i < dimensions; i++) {
        values[i] /= mag;
      }
    }

    return {
      dimensions,
      values,
      metadata: { sourceCount: texts.length },
      timestamp: Date.now(),
    };
  }

  /**
   * Simple string hash
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Set reasoning state
   */
  setReasoningState(state: AtomSpaceSnapshot | null): void {
    this.state.reasoningState = state;
    this.state.lastUpdated = Date.now();
    this.emitEvent("state_updated", { reasoningState: state });
  }

  /**
   * Create empty AtomSpace snapshot
   */
  createEmptyAtomSpace(): AtomSpaceSnapshot {
    return {
      atoms: [],
      links: [],
      timestamp: Date.now(),
      version: 1,
    };
  }

  /**
   * Reset state to initial
   */
  reset(): void {
    this.state = this.createInitialState();
    this.emitEvent("state_updated", { reset: true });
  }

  /**
   * Add event listener
   */
  onStateEvent(listener: CognitiveEventListener): void {
    this.on("cognitive_event", listener);
  }

  /**
   * Remove event listener
   */
  offStateEvent(listener: CognitiveEventListener): void {
    this.off("cognitive_event", listener);
  }

  /**
   * Emit cognitive event
   */
  private emitEvent(type: CognitiveEvent["type"], data?: unknown): void {
    const event: CognitiveEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    this.emit("cognitive_event", event);
  }
}

/**
 * Create a cognitive state manager
 */
export function createCognitiveState(
  config?: Partial<CognitiveStateConfig>,
): CognitiveStateManager {
  return new CognitiveStateManager(config);
}

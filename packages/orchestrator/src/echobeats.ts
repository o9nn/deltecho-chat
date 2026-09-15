/**
 * Echobeats — 3-Stream Concurrent Cognitive Loop
 *
 * Implements the Echobeats architecture: 3 concurrent cognitive loops
 * phased 4 steps apart over a 12-step cycle, enabling simultaneous
 * perception, action, and simulation.
 *
 * Architecture (System 4 → System 5 evolution):
 *
 *   System 4 (9 terms = OEIS A000081 for N=4):
 *     3 concurrent streams × 4 phases = 12 steps
 *     Stream 0 (Perception):  steps {1, 4, 7, 10}
 *     Stream 1 (Action):      steps {2, 5, 8, 11}
 *     Stream 2 (Simulation):  steps {3, 6, 9, 12}
 *
 *   Thread Multiplexing (6 dyadic permutations of 4 particular sets):
 *     P(1,2) → P(1,3) → P(1,4) → P(2,3) → P(2,4) → P(3,4)
 *
 *   Two complementary triads cycle:
 *     MP1: P[1,2,3] → P[1,2,4] → P[1,3,4] → P[2,3,4]
 *     MP2: P[1,3,4] → P[2,3,4] → P[1,2,3] → P[1,2,4]
 *
 *   Nested Shell Execution Contexts (OEIS A000081):
 *     N=1 → 1 term:  (global)
 *     N=2 → 2 terms: (process) (organization)
 *     N=3 → 4 terms: ((pro) org) glo
 *     N=4 → 9 terms: System 4 full structure
 *
 * The 1/7 = 0.142857... particular sequence governs energy flow:
 *   1 → 4 → 2 → 8 → 5 → 7 → 1 (the enneagram inner flow)
 *
 * This module provides the standalone Echobeats engine that can be
 * used independently or wired into the AutonomyPipeline.
 */
import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/Echobeats");

// ─── Types ─────────────────────────────────────────────────────

export type StreamPhase = "perceive" | "reflect" | "plan" | "act";

export interface EchobeatsConfig {
  /** Cycle interval in ms (one step per interval) */
  cycleInterval: number;
  /** Enable thread multiplexing (System 5 tetradic) */
  enableMultiplexing: boolean;
  /** Enable nested shell execution contexts */
  enableNestedShells: boolean;
  /** Number of concurrent streams (default: 3) */
  streamCount: number;
  /** Steps per cycle (default: 12) */
  stepsPerCycle: number;
}

const DEFAULT_CONFIG: EchobeatsConfig = {
  cycleInterval: 2000,
  enableMultiplexing: true,
  enableNestedShells: true,
  streamCount: 3,
  stepsPerCycle: 12,
};

/**
 * A cognitive stream — one of the concurrent processing loops
 */
export interface CognitiveStream {
  id: number;
  name: string;
  currentPhase: StreamPhase;
  tickCount: number;
  lastTickTime: number;
  /** Current particular set assignment (for multiplexing) */
  particularSet: number[];
  /** Accumulated energy from the 1/7 flow */
  energy: number;
  /** Stream-local state */
  state: Record<string, unknown>;
}

/**
 * A nested shell execution context
 */
export interface NestedShell {
  level: number;
  name: string;
  /** Number of terms at this level (OEIS A000081) */
  termCount: number;
  /** Parent shell (null for global) */
  parent: string | null;
  /** Active streams in this shell */
  activeStreams: number[];
}

/**
 * Thread multiplexing permutation
 */
export interface ThreadPermutation {
  /** Dyadic pair indices */
  pair: [number, number];
  /** Step in the 6-permutation cycle */
  step: number;
  /** Which triad (MP1 or MP2) this belongs to */
  triad: "MP1" | "MP2";
}

/**
 * Echobeats tick event
 */
export interface EchobeatsTick {
  globalStep: number;
  cycleStep: number;
  cycleNumber: number;
  stream: CognitiveStream;
  phase: StreamPhase;
  permutation: ThreadPermutation | null;
  shell: NestedShell;
  energyFlow: number;
}

/**
 * Callback for processing a stream tick
 */
export type StreamTickHandler = (tick: EchobeatsTick) => Promise<void>;

// ─── Echobeats Engine ──────────────────────────────────────────

export class Echobeats extends EventEmitter {
  private config: EchobeatsConfig;
  private streams: CognitiveStream[] = [];
  private shells: NestedShell[] = [];
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Runtime mutator: update cycle interval and restart timer.
   * Used by SelfModificationEngine ENACTION phase.
   */
  setCycleInterval(intervalMs: number): void {
    const clamped = Math.max(500, Math.min(30000, intervalMs));
    this.config.cycleInterval = clamped;
    // Restart timer if running
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), clamped);
    }
  }
  private globalStep = 0;
  private cycleNumber = 0;
  private tickHandler: StreamTickHandler | null = null;

  // System 5 tetradic state
  private system5Active = false;
  private currentTriad: "MP1" | "MP2" = "MP1";
  private triadStep = 0;
  private dyadicEdge = 0;
  private threadBundles: Array<{
    threads: number[];
    edges: Array<[number, number]>;
    symmetry: string;
  }> = [];
  private telemetryBuffer: Array<{
    timestamp: number;
    step: number;
    phase: string;
    energy: number;
    coherence: number;
  }> = [];
  private maxTelemetryBuffer = 1000;

  // The 12-step phase map (3 streams × 4 phases)
  private readonly PHASE_MAP: StreamPhase[] = [
    "perceive",
    "perceive",
    "perceive",
    "reflect",
    "reflect",
    "reflect",
    "plan",
    "plan",
    "plan",
    "act",
    "act",
    "act",
  ];

  // The 6 dyadic permutations of 4 particular sets
  private readonly PERMUTATIONS: Array<[number, number]> = [
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
    [3, 4],
  ];

  // Two complementary triads
  private readonly MP1_TRIADS: number[][] = [
    [1, 2, 3],
    [1, 2, 4],
    [1, 3, 4],
    [2, 3, 4],
  ];
  private readonly MP2_TRIADS: number[][] = [
    [1, 3, 4],
    [2, 3, 4],
    [1, 2, 3],
    [1, 2, 4],
  ];

  // The 1/7 = 0.142857 particular sequence (enneagram inner flow)
  private readonly ENERGY_FLOW = [1, 4, 2, 8, 5, 7];

  constructor(config?: Partial<EchobeatsConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeStreams();
    this.initializeShells();
  }

  // ─── Initialization ────────────────────────────────────────────

  private initializeStreams(): void {
    const streamNames = ["perception", "action", "simulation"];

    for (let i = 0; i < this.config.streamCount; i++) {
      this.streams.push({
        id: i,
        name: streamNames[i] || `stream-${i}`,
        currentPhase: "perceive",
        tickCount: 0,
        lastTickTime: 0,
        particularSet: this.MP1_TRIADS[i] || [1, 2, 3],
        energy: 1.0,
        state: {},
      });
    }
  }

  private initializeShells(): void {
    if (!this.config.enableNestedShells) {
      // Single global shell
      this.shells = [
        {
          level: 0,
          name: "global",
          termCount: 1,
          parent: null,
          activeStreams: this.streams.map((s) => s.id),
        },
      ];
      return;
    }

    // OEIS A000081 nested shells: N=1→1, N=2→2, N=3→4, N=4→9
    this.shells = [
      {
        level: 0,
        name: "global",
        termCount: 1,
        parent: null,
        activeStreams: [0, 1, 2],
      },
      {
        level: 1,
        name: "organization",
        termCount: 2,
        parent: "global",
        activeStreams: [0, 1],
      },
      {
        level: 2,
        name: "process",
        termCount: 4,
        parent: "organization",
        activeStreams: [0],
      },
    ];
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  /**
   * Register the tick handler that processes each stream step
   */
  onTick(handler: StreamTickHandler): void {
    this.tickHandler = handler;
  }

  /**
   * Start the Echobeats concurrent loop
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    log.info("═══════════════════════════════════════════════");
    log.info("  Echobeats 3-Stream Concurrent Loop ACTIVE");
    log.info(`  Streams: ${this.config.streamCount}`);
    log.info(`  Steps/cycle: ${this.config.stepsPerCycle}`);
    log.info(`  Interval: ${this.config.cycleInterval}ms`);
    log.info(
      `  Multiplexing: ${this.config.enableMultiplexing ? "ON" : "OFF"}`,
    );
    log.info(
      `  Nested shells: ${this.config.enableNestedShells ? "ON" : "OFF"}`,
    );
    log.info("═══════════════════════════════════════════════");

    this.timer = setInterval(() => this.tick(), this.config.cycleInterval);
    this.emit("started");
  }

  /**
   * Stop the Echobeats loop
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    log.info(
      `Echobeats stopped after ${this.globalStep} steps (${this.cycleNumber} cycles)`,
    );
    this.emit("stopped");
  }

  // ─── Core Tick ─────────────────────────────────────────────────

  /**
   * Execute one step of the 12-step cycle.
   * Each step activates one stream in its current phase.
   */
  private async tick(): Promise<void> {
    if (!this.running) return;

    this.globalStep++;
    const cycleStep = ((this.globalStep - 1) % this.config.stepsPerCycle) + 1;

    // New cycle detection
    if (cycleStep === 1) {
      this.cycleNumber++;
      this.emit("cycle_start", {
        cycleNumber: this.cycleNumber,
        globalStep: this.globalStep,
      });
    }

    // Determine which stream is active for this step
    const streamIdx = (cycleStep - 1) % this.config.streamCount;
    const stream = this.streams[streamIdx];

    // Determine the phase for this step
    const phase = this.PHASE_MAP[cycleStep - 1];
    stream.currentPhase = phase;
    stream.tickCount++;
    stream.lastTickTime = Date.now();

    // Compute thread multiplexing permutation
    let permutation: ThreadPermutation | null = null;
    if (this.config.enableMultiplexing) {
      const permIdx = (this.globalStep - 1) % 6;
      const triadIdx = Math.floor((this.globalStep - 1) / 6) % 4;
      permutation = {
        pair: this.PERMUTATIONS[permIdx],
        step: permIdx,
        triad: Math.floor((this.globalStep - 1) / 6) % 2 === 0 ? "MP1" : "MP2",
      };

      // Update stream's particular set based on current triad
      const triads =
        permutation.triad === "MP1" ? this.MP1_TRIADS : this.MP2_TRIADS;
      stream.particularSet = triads[triadIdx] || [1, 2, 3];
    }

    // Compute energy flow from 1/7 sequence
    const energyIdx = (this.globalStep - 1) % 6;
    const energyFlow = this.ENERGY_FLOW[energyIdx] / 9; // Normalize to [0, 1]
    stream.energy = 0.5 + energyFlow * 0.5; // Scale to [0.5, 1.0]

    // Determine active shell for this stream
    const shell = this.getActiveShell(streamIdx);

    // Build tick event
    const tickEvent: EchobeatsTick = {
      globalStep: this.globalStep,
      cycleStep,
      cycleNumber: this.cycleNumber,
      stream: { ...stream },
      phase,
      permutation,
      shell,
      energyFlow,
    };

    // Emit events
    this.emit("tick", tickEvent);
    this.emit(`stream_${stream.name}`, tickEvent);
    this.emit(`phase_${phase}`, tickEvent);

    // System 5: advance triad rotation
    if (this.system5Active) {
      // Rotate through 6 dyadic edges
      this.dyadicEdge = (this.globalStep - 1) % 6;

      // Rotate through 4 triadic faces every 3 steps
      if (cycleStep % 3 === 0) {
        this.triadStep = (this.triadStep + 1) % 4;
      }

      // Alternate MP1/MP2 every full cycle
      if (cycleStep === this.config.stepsPerCycle) {
        this.currentTriad = this.currentTriad === "MP1" ? "MP2" : "MP1";
      }
    }

    // Record telemetry
    const coherence = stream.energy * (1 - Math.abs(energyFlow - 0.5));
    this.recordTelemetry(this.globalStep, phase, stream.energy, coherence);

    // Execute tick handler
    if (this.tickHandler) {
      try {
        await this.tickHandler(tickEvent);
      } catch (error) {
        log.error(
          `Echobeats tick handler error at step ${this.globalStep}:`,
          error,
        );
        this.emit("error", {
          step: this.globalStep,
          stream: stream.name,
          error: String(error),
        });
      }
    }

    // End of cycle
    if (cycleStep === this.config.stepsPerCycle) {
      this.emit("cycle_end", {
        cycleNumber: this.cycleNumber,
        globalStep: this.globalStep,
        streamStats: this.streams.map((s) => ({
          name: s.name,
          tickCount: s.tickCount,
          energy: s.energy,
          phase: s.currentPhase,
        })),
      });
    }
  }

  /**
   * Get the active nested shell for a stream
   */
  private getActiveShell(streamIdx: number): NestedShell {
    if (!this.config.enableNestedShells) {
      return this.shells[0];
    }

    // Find the deepest shell that contains this stream
    for (let i = this.shells.length - 1; i >= 0; i--) {
      if (this.shells[i].activeStreams.includes(streamIdx)) {
        return this.shells[i];
      }
    }

    return this.shells[0]; // Fallback to global
  }

  // ─── Accessors ─────────────────────────────────────────────────

  // ─── System 5 Tetradic Extension ──────────────────────────────

  /**
   * Evolve to System 5 tetradic structure.
   * Extends from 3 streams to 4 threads with full complementarity:
   *   - 4 monadic vertices (threads)
   *   - 6 dyadic edges (pairwise connections)
   *   - 4 triadic faces (each containing 3 of 4 threads)
   *   - 1 tetradic cell (the whole)
   *
   * Each tensor bundle contains 3 dyadic edges with mutually orthogonal symmetries.
   */
  evolveToSystem5(): void {
    if (this.system5Active) return;

    log.info("Evolving to System 5 tetradic structure...");

    // Add 4th stream (integration/meta-cognition)
    if (this.streams.length < 4) {
      this.streams.push({
        id: 3,
        name: "integration",
        currentPhase: "act",
        tickCount: 0,
        lastTickTime: 0,
        particularSet: [1, 2, 3, 4],
        energy: 1.0,
        state: {},
      });
    }

    // Build the 4 tensor bundles (triadic faces)
    // Each bundle = 3 threads with 3 dyadic edges
    this.threadBundles = [
      {
        threads: [0, 1, 2], // perception-action-simulation
        edges: [
          [0, 1],
          [0, 2],
          [1, 2],
        ],
        symmetry: "operational",
      },
      {
        threads: [0, 1, 3], // perception-action-integration
        edges: [
          [0, 1],
          [0, 3],
          [1, 3],
        ],
        symmetry: "executive",
      },
      {
        threads: [0, 2, 3], // perception-simulation-integration
        edges: [
          [0, 2],
          [0, 3],
          [2, 3],
        ],
        symmetry: "reflective",
      },
      {
        threads: [1, 2, 3], // action-simulation-integration
        edges: [
          [1, 2],
          [1, 3],
          [2, 3],
        ],
        symmetry: "generative",
      },
    ];

    // Add System 5 shell
    this.shells.push({
      level: 3,
      name: "system5-tetrad",
      termCount: 9, // OEIS A000081 for N=4
      parent: "process",
      activeStreams: [0, 1, 2, 3],
    });

    this.system5Active = true;
    this.config.streamCount = 4;

    log.info("System 5 tetradic structure active:");
    log.info(`  4 threads: perception, action, simulation, integration`);
    log.info(
      `  6 dyadic edges: ${this.PERMUTATIONS.map(
        (p) => `(${p[0]},${p[1]})`,
      ).join(" ")}`,
    );
    log.info(
      `  4 tensor bundles: ${this.threadBundles
        .map((b) => b.symmetry)
        .join(", ")}`,
    );

    this.emit("system5_evolved", {
      threads: this.streams.map((s) => s.name),
      bundles: this.threadBundles.map((b) => b.symmetry),
    });
  }

  /**
   * Get the current active tensor bundle based on the triad rotation.
   * MP1 and MP2 alternate, each cycling through 4 triadic faces.
   */
  getCurrentBundle(): {
    threads: number[];
    edges: Array<[number, number]>;
    symmetry: string;
  } | null {
    if (!this.system5Active || this.threadBundles.length === 0) return null;
    return this.threadBundles[this.triadStep % this.threadBundles.length];
  }

  isSystem5Active(): boolean {
    return this.system5Active;
  }

  getThreadBundles() {
    return this.threadBundles.map((b) => ({ ...b }));
  }

  // ─── Telemetry ─────────────────────────────────────────────────

  /**
   * Record a telemetry point for monitoring.
   * Called automatically on each tick.
   */
  private recordTelemetry(
    step: number,
    phase: string,
    energy: number,
    coherence: number,
  ): void {
    this.telemetryBuffer.push({
      timestamp: Date.now(),
      step,
      phase,
      energy,
      coherence,
    });

    if (this.telemetryBuffer.length > this.maxTelemetryBuffer) {
      this.telemetryBuffer = this.telemetryBuffer.slice(
        -this.maxTelemetryBuffer,
      );
    }
  }

  /**
   * Get telemetry data for the TelemetryMonitor.
   * Returns recent metrics for dashboard display.
   */
  getTelemetry(): {
    recentTicks: Array<{
      timestamp: number;
      step: number;
      phase: string;
      energy: number;
      coherence: number;
    }>;
    averageEnergy: number;
    averageCoherence: number;
    ticksPerSecond: number;
    system5Active: boolean;
    currentTriad: string;
    currentBundle: string | null;
  } {
    const recent = this.telemetryBuffer.slice(-100);
    const avgEnergy =
      recent.length > 0
        ? recent.reduce((sum, t) => sum + t.energy, 0) / recent.length
        : 0;
    const avgCoherence =
      recent.length > 0
        ? recent.reduce((sum, t) => sum + t.coherence, 0) / recent.length
        : 0;

    // Calculate ticks per second
    let ticksPerSecond = 0;
    if (recent.length >= 2) {
      const timeSpan =
        recent[recent.length - 1].timestamp - recent[0].timestamp;
      if (timeSpan > 0) {
        ticksPerSecond = (recent.length / timeSpan) * 1000;
      }
    }

    const bundle = this.getCurrentBundle();

    return {
      recentTicks: recent,
      averageEnergy: avgEnergy,
      averageCoherence: avgCoherence,
      ticksPerSecond,
      system5Active: this.system5Active,
      currentTriad: this.currentTriad,
      currentBundle: bundle?.symmetry ?? null,
    };
  }

  // ─── Accessors ─────────────────────────────────────────────────

  isRunning(): boolean {
    return this.running;
  }

  getStreams(): CognitiveStream[] {
    return this.streams.map((s) => ({ ...s }));
  }

  getShells(): NestedShell[] {
    return this.shells.map((s) => ({ ...s }));
  }

  getStats(): {
    running: boolean;
    globalStep: number;
    cycleNumber: number;
    cycleStep: number;
    streams: Array<{
      name: string;
      phase: StreamPhase;
      tickCount: number;
      energy: number;
      particularSet: number[];
    }>;
    shells: Array<{ name: string; level: number; termCount: number }>;
  } {
    return {
      running: this.running,
      globalStep: this.globalStep,
      cycleNumber: this.cycleNumber,
      cycleStep: ((this.globalStep - 1) % this.config.stepsPerCycle) + 1,
      streams: this.streams.map((s) => ({
        name: s.name,
        phase: s.currentPhase,
        tickCount: s.tickCount,
        energy: s.energy,
        particularSet: s.particularSet,
      })),
      shells: this.shells.map((s) => ({
        name: s.name,
        level: s.level,
        termCount: s.termCount,
      })),
    };
  }
}

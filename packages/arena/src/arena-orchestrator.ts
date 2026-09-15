/**
 * ArenaOrchestrator — Wires the TRIZ Cognitive Arena into the DTE cognitive architecture.
 *
 * Integration points:
 * 1. Echobeats temporal substrate → drives DiscoveryLoop tick timing
 * 2. TemporalCreditAssignment → receives coherence deltas as reward signals
 * 3. SelfModificationEngine → arena patterns feed back into parameter proposals
 * 4. ESN Reservoir → arena state feeds as additional input channel
 * 5. ProprioceptiveEmbodiment → arena energy maps to embodied tension
 */

import { HexGrid, type ArenaObject, type HexCoord } from "./hex-grid.js";
import {
  AestheticField,
  type AestheticFieldConfig,
} from "./aesthetic-field.js";
import { ArenaActions, type ActionResult } from "./arena-actions.js";
import {
  GestaltPerception,
  type PerceptionResult,
} from "./gestalt-perception.js";
import {
  AestheticNavigation,
  type NavigationPath,
} from "./gestalt-perception.js";
import {
  DiscoveryLoop,
  type DiscoveryCycleSummary,
  type DiscoveryState,
  type DiscoveredPattern,
} from "./discovery-loop.js";

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

export interface ArenaOrchestratorConfig {
  /** Hex grid radius (default: 5 = intimate scale) */
  gridRadius: number;
  /** How many discovery ticks per Echobeats cycle (default: 12 = full cycle) */
  ticksPerCycle: number;
  /** Minimum coherence delta to report as reward (default: 0.01) */
  rewardThreshold: number;
  /** Maximum patterns to retain in memory (default: 100) */
  maxPatterns: number;
  /** Enable auto-seeding of initial objects (default: true) */
  autoSeed: boolean;
  /** Aesthetic field config overrides */
  fieldConfig?: Partial<AestheticFieldConfig>;
}

const DEFAULT_CONFIG: ArenaOrchestratorConfig = {
  gridRadius: 5,
  ticksPerCycle: 12,
  rewardThreshold: 0.01,
  maxPatterns: 100,
  autoSeed: true,
};

// ═══════════════════════════════════════════════════════════════
// Events emitted by the arena for external consumption
// ═══════════════════════════════════════════════════════════════

export type ArenaEvent =
  | { type: "discovery"; pattern: DiscoveredPattern; coherenceGain: number }
  | { type: "contradiction_detected"; count: number; severity: number }
  | {
      type: "experiment_result";
      principle: number;
      success: boolean;
      delta: number;
    }
  | { type: "coherence_shift"; before: number; after: number; delta: number }
  | { type: "cycle_complete"; summary: DiscoveryCycleSummary };

export type ArenaEventHandler = (event: ArenaEvent) => void;

// ═══════════════════════════════════════════════════════════════
// Arena Orchestrator
// ═══════════════════════════════════════════════════════════════

export class ArenaOrchestrator {
  private grid: HexGrid;
  private field: AestheticField;
  private actions: ArenaActions;
  private perception: GestaltPerception;
  private navigation: AestheticNavigation;
  private discoveryLoop: DiscoveryLoop;
  private config: ArenaOrchestratorConfig;
  private eventHandlers: ArenaEventHandler[] = [];
  private running = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private cycleCount = 0;
  private totalReward = 0;

  constructor(config?: Partial<ArenaOrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize the arena
    this.grid = new HexGrid(this.config.gridRadius);
    this.field = new AestheticField(this.grid, this.config.fieldConfig);
    this.actions = new ArenaActions(this.grid, this.field);
    this.perception = new GestaltPerception(this.grid, this.field);
    this.navigation = new AestheticNavigation(this.grid, this.field);
    this.discoveryLoop = new DiscoveryLoop(this.grid, this.field);

    if (this.config.autoSeed) {
      this.seedInitialObjects();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════

  /** Start the arena loop (driven by external Echobeats tick or internal timer) */
  start(intervalMs: number = 1000): void {
    if (this.running) return;
    this.running = true;
    this.tickTimer = setInterval(() => this.onEchobeatsTick(), intervalMs);
  }

  /** Stop the arena loop */
  stop(): void {
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /** External tick (called by Echobeats integration) */
  onEchobeatsTick(): void {
    if (!this.running) return;

    const result = this.discoveryLoop.tick();
    const state = this.discoveryLoop.getState();

    // Emit events based on tick result
    if (result.contradictions.length > 0) {
      const maxSeverity = Math.max(
        ...result.contradictions.map((c) => c.severity),
      );
      this.emit({
        type: "contradiction_detected",
        count: result.contradictions.length,
        severity: maxSeverity,
      });
    }

    if (result.experiment) {
      this.emit({
        type: "experiment_result",
        principle: result.experiment.principle,
        success: result.experiment.success,
        delta: result.experiment.coherenceDelta,
      });

      // Report reward to TemporalCreditAssignment
      if (
        Math.abs(result.experiment.coherenceDelta) > this.config.rewardThreshold
      ) {
        this.totalReward += result.experiment.coherenceDelta;
        this.emit({
          type: "coherence_shift",
          before: result.experiment.actions[0]?.coherenceBefore ?? 0,
          after: result.experiment.actions[0]?.coherenceAfter ?? 0,
          delta: result.experiment.coherenceDelta,
        });
      }
    }

    if (result.pattern) {
      this.emit({
        type: "discovery",
        pattern: result.pattern,
        coherenceGain: result.pattern.coherenceGain,
      });
    }

    // Check if a full cycle completed (step wrapped back to 1)
    if (state.echobeatsStep === 1 && this.cycleCount > 0) {
      const summary = this.getLastCycleSummary();
      this.emit({ type: "cycle_complete", summary });
    }

    if (state.echobeatsStep === 1) {
      this.cycleCount++;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API — For orchestrator integration
  // ═══════════════════════════════════════════════════════════════

  /** Subscribe to arena events */
  on(handler: ArenaEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  /** Get current arena state for ESN input */
  getStateForESN(): ArenaESNInput {
    const gestalt = this.perception.perceiveGestalt();
    const state = this.discoveryLoop.getState();

    return {
      coherence: gestalt.coherence,
      energy: gestalt.energyLevel,
      mood: moodToFloat(gestalt.mood),
      contradictionPressure:
        state.activeContradictions.reduce((s, c) => s + c.severity, 0) /
        Math.max(state.activeContradictions.length, 1),
      discoveryRate: state.totalDiscoveries / Math.max(this.cycleCount, 1),
      successRate: state.successRate,
      patternCount: state.discoveredPatterns.length,
      phase: phaseToFloat(state.phase),
    };
  }

  /** Get coherence delta for TemporalCreditAssignment */
  getRewardSignal(): number {
    const reward = this.totalReward;
    this.totalReward = 0; // Reset after read
    return reward;
  }

  /** Get discovered patterns for SelfModificationEngine */
  getDiscoveredPatterns(): ReadonlyArray<DiscoveredPattern> {
    return this.discoveryLoop.getPatterns();
  }

  /** Get arena energy for ProprioceptiveEmbodiment */
  getEnergyForProprioception(): number {
    return this.perception.perceiveGestalt().energyLevel;
  }

  /** Perceive the current arena state */
  perceive(): PerceptionResult {
    return this.perception.perceive();
  }

  /** Navigate through the arena */
  navigate(
    from: HexCoord,
    to: HexCoord,
    style?: "respectful" | "purposeful" | "contemplative" | "urgent",
  ): NavigationPath {
    return this.navigation.pathTo(from, to, style);
  }

  /** Execute a specific TRIZ action */
  act(principle: number, ...args: unknown[]): ActionResult | null {
    // Delegate to the appropriate action method
    const methodMap: Record<number, string> = {
      1: "segment",
      2: "extract",
      3: "differentiate",
      4: "breakSymmetry",
      5: "merge",
      6: "multiPurpose",
      7: "nest",
      8: "counterbalance",
      9: "preStress",
      10: "prePosition",
      11: "addBackup",
      12: "flattenField",
      13: "invert",
      14: "curve",
      15: "makeFlexible",
      16: "overshoot",
      17: "addDimension",
      18: "vibrate",
      19: "pulse",
      20: "sustain",
      21: "skipThrough",
      22: "reframeHarm",
      23: "addFeedback",
      24: "mediate",
      25: "selfServe",
      26: "copy",
      27: "makeDisposable",
      28: "replaceWithField",
      29: "fluidize",
      30: "makeMembrane",
      31: "makePorous",
      32: "changeColor",
      33: "homogenize",
      34: "recycle",
      35: "changeParameter",
      36: "exploitTransition",
      37: "expandDifferentially",
      38: "catalyze",
      39: "protect",
      40: "compose",
    };

    const method = methodMap[principle];
    if (!method || !(method in this.actions)) return null;

    return (
      this.actions as unknown as Record<
        string,
        (...a: unknown[]) => ActionResult
      >
    )[method](...args);
  }

  /** Place an object in the arena */
  placeObject(obj: ArenaObject): void {
    this.grid.placeObject(obj);
    this.field.invalidate();
  }

  /** Remove an object from the arena */
  removeObject(id: string): void {
    this.grid.removeObject(id);
    this.field.invalidate();
  }

  /** Run a full discovery cycle and return summary */
  runDiscoveryCycle(): DiscoveryCycleSummary {
    return this.discoveryLoop.runFullCycle();
  }

  /** Get discovery loop state */
  getDiscoveryState(): Readonly<DiscoveryState> {
    return this.discoveryLoop.getState();
  }

  /** Get the hex grid for direct manipulation */
  getGrid(): HexGrid {
    return this.grid;
  }

  /** Get the aesthetic field for sampling */
  getField(): AestheticField {
    return this.field;
  }

  // ═══════════════════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════════════════

  private emit(event: ArenaEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Don't let handler errors crash the loop
      }
    }
  }

  private getLastCycleSummary(): DiscoveryCycleSummary {
    const state = this.discoveryLoop.getState();
    return {
      contradictionsFound: state.activeContradictions.length,
      experimentsRun: state.totalExperiments,
      discoveriesMade: state.totalDiscoveries,
      patternsLearned: [...state.discoveredPatterns],
      netCoherenceChange: this.totalReward,
      successRate: state.successRate,
    };
  }

  /** Seed the arena with initial objects to bootstrap the discovery loop */
  private seedInitialObjects(): void {
    const seeds: Partial<ArenaObject>[] = [
      {
        name: "origin_stone",
        position: { q: 0, r: 0 },
        simplex: {
          level: 2,
          volume: 0.6,
          surface: 0.4,
          edge: 0.3,
          vertex: 0.1,
        },
        aesthetic: {
          centrality: 0.9,
          radiance: 0.7,
          patina: 0.5,
          scaleRelative: 0.3,
          semanticWeight: "anchor",
        },
        material: {
          cost: 0.8,
          durability: 0.9,
          replaceability: 0.1,
          flexibility: 0.1,
          porosity: 0.1,
          reactivity: 0.1,
          temperature: 0,
          phase: "solid",
        },
        color: [220, 0.3, 0.4], // Deep blue
      },
      {
        name: "growth_seed",
        position: { q: 2, r: -1 },
        simplex: {
          level: 1,
          volume: 0.2,
          surface: 0.3,
          edge: 0.2,
          vertex: 0.3,
        },
        aesthetic: {
          centrality: 0.3,
          radiance: 0.5,
          patina: 0,
          scaleRelative: 0.1,
          semanticWeight: "satellite",
        },
        material: {
          cost: 0.2,
          durability: 0.3,
          replaceability: 0.8,
          flexibility: 0.9,
          porosity: 0.6,
          reactivity: 0.7,
          temperature: 0.3,
          phase: "membrane",
        },
        color: [120, 0.7, 0.5], // Vibrant green
      },
      {
        name: "resonance_crystal",
        position: { q: -1, r: 2 },
        simplex: {
          level: 1,
          volume: 0.3,
          surface: 0.5,
          edge: 0.6,
          vertex: 0.4,
        },
        aesthetic: {
          centrality: 0.5,
          radiance: 0.8,
          patina: 0.2,
          scaleRelative: 0.15,
          semanticWeight: "connector",
        },
        material: {
          cost: 0.6,
          durability: 0.7,
          replaceability: 0.3,
          flexibility: 0.2,
          porosity: 0.0,
          reactivity: 0.3,
          temperature: -0.2,
          phase: "solid",
        },
        color: [280, 0.5, 0.6], // Purple
      },
      {
        name: "flow_stream",
        position: { q: -2, r: 0 },
        simplex: {
          level: 1,
          volume: 0.4,
          surface: 0.2,
          edge: 0.8,
          vertex: 0.0,
        },
        aesthetic: {
          centrality: 0.2,
          radiance: 0.3,
          patina: 0.1,
          scaleRelative: 0.2,
          semanticWeight: "satellite",
        },
        material: {
          cost: 0.1,
          durability: 0.2,
          replaceability: 1.0,
          flexibility: 1.0,
          porosity: 1.0,
          reactivity: 0.1,
          temperature: 0.1,
          phase: "fluid",
        },
        color: [200, 0.6, 0.7], // Light blue
      },
    ];

    let idCounter = 0;
    for (const seed of seeds) {
      const obj: ArenaObject = {
        id: `seed_${++idCounter}`,
        name: seed.name ?? `seed_${idCounter}`,
        position: seed.position ?? { q: 0, r: 0 },
        simplex: seed.simplex ?? {
          level: 0,
          volume: 0.5,
          surface: 0.5,
          edge: 0.5,
          vertex: 0.5,
        },
        aesthetic: seed.aesthetic ?? {
          centrality: 0.5,
          radiance: 0.5,
          patina: 0,
          scaleRelative: 0.1,
          semanticWeight: "satellite",
        },
        material: seed.material ?? {
          cost: 0.5,
          durability: 0.5,
          replaceability: 0.5,
          flexibility: 0.5,
          porosity: 0.5,
          reactivity: 0.5,
          temperature: 0,
          phase: "solid",
        },
        color: seed.color ?? [0, 0, 0.5],
        orientation: Math.random() * 360,
        symmetry: 0.5,
        force_vectors: [],
        metadata: {},
      };
      this.grid.placeObject(obj);
    }

    this.field.invalidate();
  }
}

// ═══════════════════════════════════════════════════════════════
// ESN Input Interface
// ═══════════════════════════════════════════════════════════════

export interface ArenaESNInput {
  coherence: number; // 0-1
  energy: number; // 0-1
  mood: number; // -1 to 1 (cool to warm)
  contradictionPressure: number; // 0-1
  discoveryRate: number; // discoveries per cycle
  successRate: number; // 0-1
  patternCount: number; // absolute count
  phase: number; // 0-1 (which phase of the cycle)
}

// ═══════════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════════

function moodToFloat(mood: string): number {
  const map: Record<string, number> = {
    warm: 0.8,
    cool: -0.5,
    active: 0.6,
    still: -0.2,
    sacred: 0.3,
    mundane: -0.8,
  };
  return map[mood] ?? 0;
}

function phaseToFloat(phase: string): number {
  const map: Record<string, number> = {
    contradiction: 0.125,
    experiment: 0.375,
    crystallize: 0.625,
    teach: 0.875,
  };
  return map[phase] ?? 0.5;
}

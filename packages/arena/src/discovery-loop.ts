/**
 * DiscoveryLoop — The 4-phase creative cycle for cognitive agents in the arena.
 *
 * Phase 1: CONTRADICTION — Detect what doesn't fit, what's broken, what could be better
 * Phase 2: EXPERIMENT — Try TRIZ actions to resolve the contradiction
 * Phase 3: CRYSTALLIZE — If coherence improved, encode the discovery as a pattern
 * Phase 4: TEACH — Share the pattern with other agents / store in episodic memory
 *
 * The loop maps directly onto the Echobeats 12-step cycle:
 *   Steps 1-3: CONTRADICTION (perceive dissonance)
 *   Steps 4-6: EXPERIMENT (act on the world)
 *   Steps 7-9: CRYSTALLIZE (reflect on results)
 *   Steps 10-12: TEACH (propagate knowledge)
 */

import { type HexGrid } from "./hex-grid.js";
import { AestheticField } from "./aesthetic-field.js";
import {
  ArenaActions,
  type ActionResult,
  type ActionCategory,
} from "./arena-actions.js";
import {
  GestaltPerception,
  type PerceptionResult,
  type RelationalMap,
} from "./gestalt-perception.js";

// ═══════════════════════════════════════════════════════════════
// Contradiction — What doesn't fit?
// ═══════════════════════════════════════════════════════════════

export type ContradictionType =
  | "technical" // Two objects want the same property to be different values
  | "physical" // Object needs to be in two places at once
  | "aesthetic" // Space feels wrong but nothing is technically broken
  | "temporal" // Something needs to happen before and after something else
  | "structural"; // Hierarchy is broken or missing

export interface Contradiction {
  id: string;
  type: ContradictionType;
  severity: number; // 0-1 how much it hurts coherence
  description: string;
  involvedObjects: string[];
  suggestedPrinciples: number[]; // TRIZ principles that might resolve it
  detectedAt: number; // timestamp
}

// ═══════════════════════════════════════════════════════════════
// Experiment — What should we try?
// ═══════════════════════════════════════════════════════════════

export interface Experiment {
  id: string;
  contradictionId: string;
  principle: number; // TRIZ principle to try
  hypothesis: string; // What we expect to happen
  actions: ActionResult[]; // Results of applying the principle
  coherenceDelta: number; // Net change in coherence
  success: boolean; // Did it resolve the contradiction?
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
// Pattern — Crystallized discovery
// ═══════════════════════════════════════════════════════════════

export interface DiscoveredPattern {
  id: string;
  name: string;
  contradictionType: ContradictionType;
  resolution: {
    principle: number;
    category: ActionCategory;
    description: string;
  };
  context: {
    objectCount: number;
    density: string;
    mood: string;
  };
  coherenceGain: number;
  confidence: number; // How many times this pattern has worked
  discoveredAt: number;
  usageCount: number;
}

// ═══════════════════════════════════════════════════════════════
// Teaching — Share with others
// ═══════════════════════════════════════════════════════════════

export interface TeachingEvent {
  patternId: string;
  taughtAt: number;
  audience: "self" | "peer" | "broadcast";
  retention: number; // 0-1 how well it was received
}

// ═══════════════════════════════════════════════════════════════
// Discovery Loop State
// ═══════════════════════════════════════════════════════════════

export interface DiscoveryState {
  phase: "contradiction" | "experiment" | "crystallize" | "teach";
  echobeatsStep: number; // 1-12
  activeContradictions: Contradiction[];
  currentExperiment: Experiment | null;
  discoveredPatterns: DiscoveredPattern[];
  teachingHistory: TeachingEvent[];
  totalDiscoveries: number;
  totalExperiments: number;
  successRate: number;
}

// ═══════════════════════════════════════════════════════════════
// The Discovery Loop Engine
// ═══════════════════════════════════════════════════════════════

/** TRIZ contradiction resolution matrix (simplified) */
const CONTRADICTION_PRINCIPLES: Record<ContradictionType, number[]> = {
  technical: [1, 2, 3, 5, 13, 15, 28, 35, 40], // Segment, Extract, Differentiate, Merge, Invert, Flexible, Field, Parameter, Compose
  physical: [7, 10, 17, 21, 24, 26], // Nest, PrePosition, Dimension, Skip, Mediate, Copy
  aesthetic: [4, 14, 30, 32, 33, 37], // Asymmetry, Curve, Membrane, Color, Homogenize, Expand
  temporal: [18, 19, 20, 21, 36], // Vibrate, Pulse, Sustain, Skip, Transition
  structural: [1, 5, 6, 7, 11, 23, 25, 34], // Segment, Merge, MultiPurpose, Nest, Backup, Feedback, SelfServe, Recycle
};

let discoveryIdCounter = 0;

export class DiscoveryLoop {
  private state: DiscoveryState;
  private actions: ArenaActions;
  private perception: GestaltPerception;

  constructor(
    private grid: HexGrid,
    private field: AestheticField,
  ) {
    this.actions = new ArenaActions(grid, field);
    this.perception = new GestaltPerception(grid, field);

    this.state = {
      phase: "contradiction",
      echobeatsStep: 1,
      activeContradictions: [],
      currentExperiment: null,
      discoveredPatterns: [],
      teachingHistory: [],
      totalDiscoveries: 0,
      totalExperiments: 0,
      successRate: 0,
    };
  }

  /** Get current discovery state */
  getState(): Readonly<DiscoveryState> {
    return this.state;
  }

  /** Get all discovered patterns */
  getPatterns(): ReadonlyArray<DiscoveredPattern> {
    return this.state.discoveredPatterns;
  }

  /**
   * Tick the discovery loop forward by one Echobeats step.
   * Returns the result of whatever phase was executed.
   */
  tick(): DiscoveryTickResult {
    const step = this.state.echobeatsStep;

    let result: DiscoveryTickResult;

    if (step >= 1 && step <= 3) {
      // CONTRADICTION phase
      this.state.phase = "contradiction";
      result = this.detectContradictions();
    } else if (step >= 4 && step <= 6) {
      // EXPERIMENT phase
      this.state.phase = "experiment";
      result = this.runExperiment();
    } else if (step >= 7 && step <= 9) {
      // CRYSTALLIZE phase
      this.state.phase = "crystallize";
      result = this.crystallize();
    } else {
      // TEACH phase (steps 10-12)
      this.state.phase = "teach";
      result = this.teach();
    }

    // Advance step (wrap at 12)
    this.state.echobeatsStep = (step % 12) + 1;

    return result;
  }

  /**
   * Run a full discovery cycle (12 ticks = one complete loop).
   * Returns summary of what was discovered.
   */
  runFullCycle(): DiscoveryCycleSummary {
    const results: DiscoveryTickResult[] = [];
    for (let i = 0; i < 12; i++) {
      results.push(this.tick());
    }

    const experiments = results.filter(
      (r) => r.phase === "experiment" && r.experiment,
    );
    const discoveries = results.filter(
      (r) => r.phase === "crystallize" && r.pattern,
    );

    return {
      contradictionsFound: this.state.activeContradictions.length,
      experimentsRun: experiments.length,
      discoveriesMade: discoveries.length,
      patternsLearned: discoveries.map((r) => r.pattern!),
      netCoherenceChange: experiments.reduce(
        (s, r) => s + (r.experiment?.coherenceDelta ?? 0),
        0,
      ),
      successRate: this.state.successRate,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 1: CONTRADICTION — Detect dissonance
  // ═══════════════════════════════════════════════════════════════

  private detectContradictions(): DiscoveryTickResult {
    const perception = this.perception.perceive();
    const contradictions: Contradiction[] = [];

    // Detect aesthetic contradictions from low-coherence zones
    this.detectAestheticContradictions(perception, contradictions);

    // Detect structural contradictions from broken hierarchies
    this.detectStructuralContradictions(perception.relations, contradictions);

    // Detect technical contradictions from competing properties
    this.detectTechnicalContradictions(contradictions);

    // Detect temporal contradictions from conflicting dynamics
    this.detectTemporalContradictions(contradictions);

    // Update state
    this.state.activeContradictions = [
      ...this.state.activeContradictions,
      ...contradictions,
    ].slice(0, 10); // Keep top 10

    // Sort by severity
    this.state.activeContradictions.sort((a, b) => b.severity - a.severity);

    return {
      phase: "contradiction",
      step: this.state.echobeatsStep,
      contradictions,
      experiment: null,
      pattern: null,
      teaching: null,
    };
  }

  private detectAestheticContradictions(
    perception: PerceptionResult,
    out: Contradiction[],
  ): void {
    // Low overall coherence = aesthetic contradiction
    if (perception.gestalt.coherence < 0.4) {
      const objects = this.grid.getAllObjects();
      out.push({
        id: `c_${++discoveryIdCounter}`,
        type: "aesthetic",
        severity: 1 - perception.gestalt.coherence,
        description: `Space coherence is low (${(
          perception.gestalt.coherence * 100
        ).toFixed(0)}%). Objects are not strengthening each other.`,
        involvedObjects: objects.slice(0, 3).map((o) => o.id),
        suggestedPrinciples: CONTRADICTION_PRINCIPLES.aesthetic,
        detectedAt: Date.now(),
      });
    }

    // Tensions without harmonies = aesthetic dissonance
    if (
      perception.relations.tensions.length >
      perception.relations.harmonies.length * 2
    ) {
      const tensionObjects = perception.relations.tensions.flatMap((t) => [
        t.a,
        t.b,
      ]);
      out.push({
        id: `c_${++discoveryIdCounter}`,
        type: "aesthetic",
        severity: 0.6,
        description: `Too many tensions (${perception.relations.tensions.length}) vs harmonies (${perception.relations.harmonies.length}). Space feels conflicted.`,
        involvedObjects: [...new Set(tensionObjects)].slice(0, 4),
        suggestedPrinciples: [5, 13, 24, 33], // Merge, Invert, Mediate, Homogenize
        detectedAt: Date.now(),
      });
    }
  }

  private detectStructuralContradictions(
    relations: RelationalMap,
    out: Contradiction[],
  ): void {
    // Singletons that should be connected
    const singletons = relations.clusters.filter((c) => c.role === "singleton");
    if (singletons.length > 3) {
      out.push({
        id: `c_${++discoveryIdCounter}`,
        type: "structural",
        severity: 0.5,
        description: `${singletons.length} isolated objects. Space lacks structure.`,
        involvedObjects: singletons.map((s) => s.members[0]),
        suggestedPrinciples: CONTRADICTION_PRINCIPLES.structural,
        detectedAt: Date.now(),
      });
    }

    // Multiple competing hierarchies
    if (relations.hierarchies.length > 2) {
      out.push({
        id: `c_${++discoveryIdCounter}`,
        type: "structural",
        severity: 0.4,
        description: `${relations.hierarchies.length} competing hierarchies. Space needs clearer organization.`,
        involvedObjects: relations.hierarchies.map((h) => h.root),
        suggestedPrinciples: [1, 5, 7], // Segment, Merge, Nest
        detectedAt: Date.now(),
      });
    }
  }

  private detectTechnicalContradictions(out: Contradiction[]): void {
    const objects = this.grid.getAllObjects();

    // Objects that need to be both flexible and durable
    for (const obj of objects) {
      if (obj.material.flexibility > 0.7 && obj.material.durability > 0.7) {
        out.push({
          id: `c_${++discoveryIdCounter}`,
          type: "technical",
          severity: 0.3,
          description: `"${obj.name}" needs to be both flexible (${(
            obj.material.flexibility * 100
          ).toFixed(0)}%) and durable (${(
            obj.material.durability * 100
          ).toFixed(0)}%). These properties conflict.`,
          involvedObjects: [obj.id],
          suggestedPrinciples: [1, 3, 15, 28, 40], // Segment, Differentiate, Flexible, Field, Compose
          detectedAt: Date.now(),
        });
      }
    }
  }

  private detectTemporalContradictions(out: Contradiction[]): void {
    const objects = this.grid.getAllObjects();

    // Objects that are both pulsing and sustained (contradictory temporal modes)
    for (const obj of objects) {
      if (obj.metadata.pulsing && obj.metadata.sustained) {
        out.push({
          id: `c_${++discoveryIdCounter}`,
          type: "temporal",
          severity: 0.4,
          description: `"${obj.name}" is both pulsing and sustained. Temporal contradiction.`,
          involvedObjects: [obj.id],
          suggestedPrinciples: CONTRADICTION_PRINCIPLES.temporal,
          detectedAt: Date.now(),
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 2: EXPERIMENT — Try to resolve
  // ═══════════════════════════════════════════════════════════════

  private runExperiment(): DiscoveryTickResult {
    if (this.state.activeContradictions.length === 0) {
      return {
        phase: "experiment",
        step: this.state.echobeatsStep,
        contradictions: [],
        experiment: null,
        pattern: null,
        teaching: null,
      };
    }

    // Pick the most severe contradiction
    const contradiction = this.state.activeContradictions[0];

    // Check if we have a known pattern that might work
    const knownPattern = this.findApplicablePattern(contradiction);
    const principle = knownPattern
      ? knownPattern.resolution.principle
      : contradiction.suggestedPrinciples[
          Math.floor(Math.random() * contradiction.suggestedPrinciples.length)
        ];

    // Execute the principle
    const actionResults = this.executePrinciple(principle, contradiction);

    const experiment: Experiment = {
      id: `e_${++discoveryIdCounter}`,
      contradictionId: contradiction.id,
      principle,
      hypothesis: `Applying P${principle} will resolve ${contradiction.type} contradiction`,
      actions: actionResults,
      coherenceDelta: actionResults.reduce((s, r) => s + r.delta, 0),
      success: actionResults.some((r) => r.delta > 0.05),
      timestamp: Date.now(),
    };

    this.state.currentExperiment = experiment;
    this.state.totalExperiments++;

    // Update success rate
    const totalSuccess =
      this.state.successRate * (this.state.totalExperiments - 1) +
      (experiment.success ? 1 : 0);
    this.state.successRate = totalSuccess / this.state.totalExperiments;

    // If successful, remove the contradiction
    if (experiment.success) {
      this.state.activeContradictions = this.state.activeContradictions.filter(
        (c) => c.id !== contradiction.id,
      );
    }

    return {
      phase: "experiment",
      step: this.state.echobeatsStep,
      contradictions: [],
      experiment,
      pattern: null,
      teaching: null,
    };
  }

  private executePrinciple(
    principle: number,
    contradiction: Contradiction,
  ): ActionResult[] {
    const objects = contradiction.involvedObjects;
    const results: ActionResult[] = [];

    // Map principle number to action
    switch (principle) {
      case 1:
        if (objects[0]) results.push(this.actions.segment(objects[0], 3));
        break;
      case 2:
        if (objects[0])
          results.push(this.actions.extract(objects[0], "reactivity"));
        break;
      case 3:
        if (objects[0]) results.push(this.actions.differentiate(objects[0]));
        break;
      case 4:
        if (objects[0]) results.push(this.actions.breakSymmetry(objects[0]));
        break;
      case 5:
        if (objects[0] && objects[1])
          results.push(this.actions.merge(objects[0], objects[1]));
        break;
      case 6:
        if (objects[0]) results.push(this.actions.multiPurpose(objects[0]));
        break;
      case 7:
        if (objects[0] && objects[1])
          results.push(this.actions.nest(objects[0], objects[1]));
        break;
      case 13:
        if (objects[0]) results.push(this.actions.invert(objects[0]));
        break;
      case 14:
        if (objects[0]) results.push(this.actions.curve(objects[0]));
        break;
      case 15:
        if (objects[0]) results.push(this.actions.makeFlexible(objects[0]));
        break;
      case 17:
        if (objects[0]) results.push(this.actions.addDimension(objects[0]));
        break;
      case 18:
        if (objects[0]) results.push(this.actions.vibrate(objects[0], 0.5));
        break;
      case 19:
        if (objects[0]) results.push(this.actions.pulse(objects[0], 4));
        break;
      case 20:
        if (objects[0]) results.push(this.actions.sustain(objects[0]));
        break;
      case 21:
        if (objects[0])
          results.push(this.actions.skipThrough(objects[0], { q: 0, r: 0 }));
        break;
      case 22:
        if (objects[0]) results.push(this.actions.reframeHarm(objects[0]));
        break;
      case 23:
        if (objects[0] && objects[1])
          results.push(this.actions.addFeedback(objects[0], objects[1]));
        break;
      case 24:
        if (objects[0] && objects[1])
          results.push(this.actions.mediate(objects[0], objects[1]));
        break;
      case 25:
        if (objects[0]) results.push(this.actions.selfServe(objects[0]));
        break;
      case 26:
        if (objects[0]) results.push(this.actions.copy(objects[0]));
        break;
      case 28:
        if (objects[0]) results.push(this.actions.replaceWithField(objects[0]));
        break;
      case 30:
        if (objects[0]) results.push(this.actions.makeMembrane(objects[0]));
        break;
      case 32:
        if (objects[0])
          results.push(
            this.actions.changeColor(objects[0], Math.random() * 360),
          );
        break;
      case 33:
        results.push(this.actions.homogenize({ q: 0, r: 0 }, 3));
        break;
      case 34:
        if (objects[0]) results.push(this.actions.recycle(objects[0]));
        break;
      case 35:
        if (objects[0])
          results.push(
            this.actions.changeParameter(objects[0], "temperature", 0.5),
          );
        break;
      case 36:
        if (objects[0])
          results.push(this.actions.exploitTransition(objects[0]));
        break;
      case 37:
        if (objects[0])
          results.push(this.actions.expandDifferentially(objects[0]));
        break;
      case 40:
        if (objects[0] && objects[1])
          results.push(this.actions.compose(objects[0], objects[1]));
        break;
      default:
        if (objects[0]) results.push(this.actions.differentiate(objects[0]));
        break;
    }

    return results;
  }

  private findApplicablePattern(
    contradiction: Contradiction,
  ): DiscoveredPattern | null {
    return (
      this.state.discoveredPatterns.find(
        (p) => p.contradictionType === contradiction.type && p.confidence > 0.5,
      ) ?? null
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 3: CRYSTALLIZE — Encode discovery as pattern
  // ═══════════════════════════════════════════════════════════════

  private crystallize(): DiscoveryTickResult {
    const experiment = this.state.currentExperiment;
    if (!experiment || !experiment.success) {
      return {
        phase: "crystallize",
        step: this.state.echobeatsStep,
        contradictions: [],
        experiment: null,
        pattern: null,
        teaching: null,
      };
    }

    // Find the contradiction that was resolved
    const contradiction = this.state.activeContradictions.find(
      (c) => c.id === experiment.contradictionId,
    ) ?? { type: "aesthetic" as ContradictionType, severity: 0.5 };

    const gestalt = this.perception.perceiveGestalt();

    // Check if we already have this pattern
    const existing = this.state.discoveredPatterns.find(
      (p) =>
        p.contradictionType === contradiction.type &&
        p.resolution.principle === experiment.principle,
    );

    if (existing) {
      // Reinforce existing pattern
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.usageCount++;
      return {
        phase: "crystallize",
        step: this.state.echobeatsStep,
        contradictions: [],
        experiment: null,
        pattern: existing,
        teaching: null,
      };
    }

    // Create new pattern
    const pattern: DiscoveredPattern = {
      id: `p_${++discoveryIdCounter}`,
      name: `${contradiction.type}_P${
        experiment.principle
      }_${Date.now().toString(36)}`,
      contradictionType: contradiction.type as ContradictionType,
      resolution: {
        principle: experiment.principle,
        category: experiment.actions[0]?.category ?? "spatial_structure",
        description: `Apply P${experiment.principle} to resolve ${contradiction.type} contradiction`,
      },
      context: {
        objectCount: this.grid.getAllObjects().length,
        density: gestalt.density,
        mood: gestalt.mood,
      },
      coherenceGain: experiment.coherenceDelta,
      confidence: 0.3, // Initial confidence
      discoveredAt: Date.now(),
      usageCount: 1,
    };

    this.state.discoveredPatterns.push(pattern);
    this.state.totalDiscoveries++;
    this.state.currentExperiment = null;

    return {
      phase: "crystallize",
      step: this.state.echobeatsStep,
      contradictions: [],
      experiment: null,
      pattern,
      teaching: null,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 4: TEACH — Share the discovery
  // ═══════════════════════════════════════════════════════════════

  private teach(): DiscoveryTickResult {
    // Find the most recent high-confidence pattern to teach
    const teachablePatterns = this.state.discoveredPatterns
      .filter((p) => p.confidence > 0.3)
      .sort((a, b) => b.discoveredAt - a.discoveredAt);

    if (teachablePatterns.length === 0) {
      return {
        phase: "teach",
        step: this.state.echobeatsStep,
        contradictions: [],
        experiment: null,
        pattern: null,
        teaching: null,
      };
    }

    const pattern = teachablePatterns[0];

    const teaching: TeachingEvent = {
      patternId: pattern.id,
      taughtAt: Date.now(),
      audience: "self", // Default to self-teaching (episodic memory)
      retention: pattern.confidence,
    };

    this.state.teachingHistory.push(teaching);

    return {
      phase: "teach",
      step: this.state.echobeatsStep,
      contradictions: [],
      experiment: null,
      pattern,
      teaching,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Result Types
// ═══════════════════════════════════════════════════════════════

export interface DiscoveryTickResult {
  phase: DiscoveryState["phase"];
  step: number;
  contradictions: Contradiction[];
  experiment: Experiment | null;
  pattern: DiscoveredPattern | null;
  teaching: TeachingEvent | null;
}

export interface DiscoveryCycleSummary {
  contradictionsFound: number;
  experimentsRun: number;
  discoveriesMade: number;
  patternsLearned: DiscoveredPattern[];
  netCoherenceChange: number;
  successRate: number;
}

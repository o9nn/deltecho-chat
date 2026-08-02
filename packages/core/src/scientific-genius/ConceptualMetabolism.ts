/**
 * Conceptual Metabolism for Deep Tree Echo
 *
 * An energy-based system that converts raw stimuli into structured knowledge
 * through metabolic cycles analogous to biological metabolism:
 *
 * **Anabolism** (Knowledge Building):
 *   - Concept synthesis: combining simpler ideas into complex structures
 *   - Schema crystallization: repeated patterns solidify into reusable schemas
 *   - Integration: connecting new knowledge to existing knowledge graph
 *   - Myelination: frequently-used pathways become faster (lower energy cost)
 *
 * **Catabolism** (Knowledge Pruning):
 *   - Forgetting: unused concepts decay and release energy
 *   - Simplification: complex structures compress into simpler representations
 *   - Contradiction resolution: conflicting beliefs are metabolized
 *   - Abstraction: concrete instances dissolve into general principles
 *
 * The system tracks "epistemic energy" (ATP analogue) consumed by cognitive
 * operations, implements circadian-like rest/active cycles, and connects to
 * the ScientificGeniusEngine's free energy minimization framework.
 *
 * Key insight: Knowledge has a *maintenance cost*. The more you know, the more
 * energy is required to keep it coherent. This creates natural pressure toward
 * elegant, minimal representations — the hallmark of scientific genius.
 *
 * @see ScientificGeniusEngine for free energy minimization
 * @see EpistemicImmuneSystem for belief protection
 * @see EntelechyEmergenceEngine for emergence detection
 */
import { EventEmitter } from "events";

// ============================================================
// TYPES
// ============================================================

/**
 * A knowledge unit with metabolic properties
 */
export interface KnowledgeUnit {
  /** Unique identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Domain/category */
  domain: string;
  /** Complexity measure (1-10) */
  complexity: number;
  /** Current activation level (0-1) — how "alive" this knowledge is */
  activation: number;
  /** Maintenance cost per tick (energy units) */
  maintenanceCost: number;
  /** Number of connections to other units */
  connectionCount: number;
  /** Last time this unit was accessed/used */
  lastAccessedAt: number;
  /** Creation timestamp */
  createdAt: number;
  /** How many times this unit has been accessed */
  accessCount: number;
  /** Whether this unit is myelinated (fast-access, low-cost) */
  isMyelinated: boolean;
  /** Coherence with neighboring units (0-1) */
  localCoherence: number;
  /** Whether this unit is currently being metabolized (pruning candidate) */
  isDecaying: boolean;
}

/**
 * Metabolic reaction types
 */
export enum MetabolicReaction {
  // Anabolic (building)
  SYNTHESIS = "synthesis",           // Combine units into new compound
  CRYSTALLIZATION = "crystallization", // Pattern solidifies into schema
  INTEGRATION = "integration",       // Connect to existing graph
  MYELINATION = "myelination",       // Pathway optimization

  // Catabolic (breaking down)
  DECAY = "decay",                   // Unused unit fades
  SIMPLIFICATION = "simplification", // Complex → simpler representation
  CONTRADICTION_RESOLVE = "contradiction_resolve", // Conflict resolution
  ABSTRACTION = "abstraction",       // Concrete → general principle

  // Homeostatic (maintenance)
  REPAIR = "repair",                 // Fix damaged connections
  CONSOLIDATION = "consolidation",   // Sleep-like memory consolidation
}

/**
 * A metabolic event record
 */
export interface MetabolicEvent {
  /** Reaction type */
  reaction: MetabolicReaction;
  /** Units involved */
  unitIds: string[];
  /** Energy consumed (positive) or released (negative) */
  energyDelta: number;
  /** Timestamp */
  timestamp: number;
  /** Whether the reaction was successful */
  success: boolean;
  /** Optional result (new unit ID for synthesis, etc.) */
  resultId?: string;
  /** Human-readable description */
  description: string;
}

/**
 * Metabolic cycle phase (circadian analogue)
 */
export enum MetabolicPhase {
  /** Active learning — high anabolism, moderate catabolism */
  ACTIVE = "active",
  /** Integration — moderate anabolism, low catabolism */
  INTEGRATING = "integrating",
  /** Consolidation — low anabolism, moderate catabolism (sleep-like) */
  CONSOLIDATING = "consolidating",
  /** Rest — minimal activity, passive decay */
  RESTING = "resting",
}

/**
 * Overall metabolic state
 */
export interface MetabolicState {
  /** Current epistemic energy (ATP analogue) */
  energy: number;
  /** Maximum energy capacity */
  maxEnergy: number;
  /** Current metabolic phase */
  phase: MetabolicPhase;
  /** Phase progress (0-1) */
  phaseProgress: number;
  /** Total knowledge units */
  totalUnits: number;
  /** Active (non-decaying) units */
  activeUnits: number;
  /** Myelinated (optimized) units */
  myelinatedUnits: number;
  /** Current metabolic rate (reactions per tick) */
  metabolicRate: number;
  /** Anabolic/catabolic balance (-1 to 1; positive = building) */
  anabolicBalance: number;
  /** Total maintenance cost per tick */
  totalMaintenanceCost: number;
  /** Energy efficiency (useful work / total energy spent) */
  efficiency: number;
  /** Knowledge density (connections per unit) */
  knowledgeDensity: number;
  /** Entropy of the knowledge graph */
  entropy: number;
  /** Tick count */
  tickCount: number;
}

/**
 * Configuration for the Conceptual Metabolism system
 */
export interface ConceptualMetabolismConfig {
  /** Starting energy */
  initialEnergy: number;
  /** Maximum energy capacity */
  maxEnergy: number;
  /** Energy regeneration per tick during rest */
  restRegenRate: number;
  /** Base maintenance cost multiplier */
  maintenanceCostMult: number;
  /** Activation decay rate per tick for unused units */
  activationDecayRate: number;
  /** Myelination threshold (access count to become myelinated) */
  myelinationThreshold: number;
  /** Myelination cost reduction factor */
  myelinationCostReduction: number;
  /** Decay threshold — activation below this triggers decay */
  decayThreshold: number;
  /** Phase durations in ticks [active, integrating, consolidating, resting] */
  phaseDurations: [number, number, number, number];
  /** Maximum units before forced catabolism */
  maxUnits: number;
  /** Energy cost for synthesis reaction */
  synthesisCost: number;
  /** Energy cost for integration reaction */
  integrationCost: number;
  /** Energy released by decay */
  decayEnergyRelease: number;
  /** Energy cost for abstraction */
  abstractionCost: number;
  /** Tick rate in Hz */
  tickRateHz: number;
}

export const DEFAULT_METABOLISM_CONFIG: ConceptualMetabolismConfig = {
  initialEnergy: 100,
  maxEnergy: 200,
  restRegenRate: 2.0,
  maintenanceCostMult: 1.0,
  activationDecayRate: 0.005,
  myelinationThreshold: 10,
  myelinationCostReduction: 0.3,
  decayThreshold: 0.1,
  phaseDurations: [120, 60, 40, 30], // ~250 ticks per full cycle
  maxUnits: 500,
  synthesisCost: 5.0,
  integrationCost: 2.0,
  decayEnergyRelease: 1.5,
  abstractionCost: 8.0,
  tickRateHz: 2, // 2 Hz metabolic tick (slow, deliberate)
};

// ============================================================
// CONCEPTUAL METABOLISM ENGINE
// ============================================================

/**
 * Conceptual Metabolism Engine
 *
 * Manages the energy economy of knowledge, implementing natural pressure
 * toward elegant minimal representations through metabolic constraints.
 *
 * The system enforces a fundamental truth: *maintaining knowledge costs energy*.
 * This creates evolutionary pressure toward:
 * - Compression (abstraction reduces maintenance cost)
 * - Pruning (unused knowledge decays, releasing energy)
 * - Myelination (frequently-used paths become cheaper)
 * - Integration (connected knowledge shares maintenance cost)
 *
 * These pressures naturally produce the characteristics of scientific genius:
 * deep understanding from minimal principles.
 */
export class ConceptualMetabolism extends EventEmitter {
  private config: ConceptualMetabolismConfig;
  private units: Map<string, KnowledgeUnit> = new Map();
  private connections: Map<string, Set<string>> = new Map();
  private energy: number;
  private phase: MetabolicPhase = MetabolicPhase.ACTIVE;
  private phaseTicksElapsed: number = 0;
  private tickCount: number = 0;
  private eventLog: MetabolicEvent[] = [];
  private maxEventLog: number = 200;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  // Metrics
  private totalEnergySpent: number = 0;
  private totalUsefulWork: number = 0;
  private recentAnabolicEvents: number = 0;
  private recentCatabolicEvents: number = 0;

  constructor(config?: Partial<ConceptualMetabolismConfig>) {
    super();
    this.config = { ...DEFAULT_METABOLISM_CONFIG, ...config };
    this.energy = this.config.initialEnergy;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  start(): void {
    if (this.tickInterval) return;
    const intervalMs = Math.round(1000 / this.config.tickRateHz);
    this.tickInterval = setInterval(() => this.tick(), intervalMs);
    this.emit("started");
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.emit("stopped");
  }

  isRunning(): boolean {
    return this.tickInterval !== null;
  }

  // ============================================================
  // ANABOLIC REACTIONS (Knowledge Building)
  // ============================================================

  /**
   * Synthesize a new knowledge unit from component units.
   * Consumes energy proportional to complexity.
   */
  synthesize(
    label: string,
    domain: string,
    componentIds: string[],
    complexity?: number,
  ): KnowledgeUnit | null {
    const cost = this.config.synthesisCost * (complexity ?? 3);
    if (this.energy < cost) {
      this.emit("energy_insufficient", { reaction: MetabolicReaction.SYNTHESIS, needed: cost, available: this.energy });
      return null;
    }

    // Verify components exist
    const components = componentIds.filter((id) => this.units.has(id));
    if (components.length < 1) return null;

    // Create new unit
    const unit: KnowledgeUnit = {
      id: `ku_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label,
      domain,
      complexity: complexity ?? Math.min(10, components.length + 1),
      activation: 1.0,
      maintenanceCost: (complexity ?? 3) * 0.1 * this.config.maintenanceCostMult,
      connectionCount: components.length,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      accessCount: 1,
      isMyelinated: false,
      localCoherence: 0.8,
      isDecaying: false,
    };

    // Add unit and connections
    this.units.set(unit.id, unit);
    this.connections.set(unit.id, new Set(components));
    for (const compId of components) {
      const compConns = this.connections.get(compId) ?? new Set();
      compConns.add(unit.id);
      this.connections.set(compId, compConns);
      // Boost component activation (they're being used)
      const comp = this.units.get(compId);
      if (comp) {
        comp.activation = Math.min(1, comp.activation + 0.2);
        comp.accessCount++;
        comp.lastAccessedAt = Date.now();
      }
    }

    // Consume energy
    this.energy -= cost;
    this.totalEnergySpent += cost;
    this.totalUsefulWork += cost * 0.8; // Synthesis is 80% efficient
    this.recentAnabolicEvents++;

    this.logEvent({
      reaction: MetabolicReaction.SYNTHESIS,
      unitIds: [unit.id, ...components],
      energyDelta: -cost,
      timestamp: Date.now(),
      success: true,
      resultId: unit.id,
      description: `Synthesized "${label}" from ${components.length} components (cost: ${cost.toFixed(1)} energy)`,
    });

    this.emit("synthesis", unit);
    return unit;
  }

  /**
   * Integrate a new concept into the existing knowledge graph.
   * Finds related units and creates connections.
   */
  integrate(unitId: string, relatedIds: string[]): boolean {
    const unit = this.units.get(unitId);
    if (!unit) return false;

    const cost = this.config.integrationCost * relatedIds.length;
    if (this.energy < cost) {
      this.emit("energy_insufficient", { reaction: MetabolicReaction.INTEGRATION, needed: cost, available: this.energy });
      return false;
    }

    const unitConns = this.connections.get(unitId) ?? new Set();
    let newConnections = 0;

    for (const relId of relatedIds) {
      if (!this.units.has(relId) || unitConns.has(relId)) continue;
      unitConns.add(relId);
      const relConns = this.connections.get(relId) ?? new Set();
      relConns.add(unitId);
      this.connections.set(relId, relConns);
      newConnections++;
    }

    this.connections.set(unitId, unitConns);
    unit.connectionCount = unitConns.size;
    unit.localCoherence = Math.min(1, unit.localCoherence + newConnections * 0.05);
    unit.activation = Math.min(1, unit.activation + 0.1);

    this.energy -= cost;
    this.totalEnergySpent += cost;
    this.totalUsefulWork += cost * 0.9;
    this.recentAnabolicEvents++;

    this.logEvent({
      reaction: MetabolicReaction.INTEGRATION,
      unitIds: [unitId, ...relatedIds],
      energyDelta: -cost,
      timestamp: Date.now(),
      success: true,
      description: `Integrated "${unit.label}" with ${newConnections} new connections`,
    });

    this.emit("integration", { unitId, newConnections });
    return true;
  }

  /**
   * Myelinate a frequently-used knowledge unit (reduce its maintenance cost).
   */
  myelinate(unitId: string): boolean {
    const unit = this.units.get(unitId);
    if (!unit || unit.isMyelinated) return false;
    if (unit.accessCount < this.config.myelinationThreshold) return false;

    const cost = unit.complexity * 2; // One-time investment
    if (this.energy < cost) return false;

    unit.isMyelinated = true;
    unit.maintenanceCost *= this.config.myelinationCostReduction;

    this.energy -= cost;
    this.totalEnergySpent += cost;
    this.totalUsefulWork += cost;
    this.recentAnabolicEvents++;

    this.logEvent({
      reaction: MetabolicReaction.MYELINATION,
      unitIds: [unitId],
      energyDelta: -cost,
      timestamp: Date.now(),
      success: true,
      description: `Myelinated "${unit.label}" — maintenance cost reduced by ${((1 - this.config.myelinationCostReduction) * 100).toFixed(0)}%`,
    });

    this.emit("myelination", unit);
    return true;
  }

  // ============================================================
  // CATABOLIC REACTIONS (Knowledge Pruning)
  // ============================================================

  /**
   * Decay a knowledge unit — release its energy back to the system.
   */
  decay(unitId: string): boolean {
    const unit = this.units.get(unitId);
    if (!unit) return false;

    const released = this.config.decayEnergyRelease * unit.complexity;

    // Remove connections
    const conns = this.connections.get(unitId) ?? new Set();
    for (const connId of conns) {
      const otherConns = this.connections.get(connId);
      if (otherConns) {
        otherConns.delete(unitId);
        const otherUnit = this.units.get(connId);
        if (otherUnit) otherUnit.connectionCount = otherConns.size;
      }
    }

    // Remove unit
    this.units.delete(unitId);
    this.connections.delete(unitId);

    // Release energy
    this.energy = Math.min(this.config.maxEnergy, this.energy + released);
    this.recentCatabolicEvents++;

    this.logEvent({
      reaction: MetabolicReaction.DECAY,
      unitIds: [unitId],
      energyDelta: released,
      timestamp: Date.now(),
      success: true,
      description: `Decayed "${unit.label}" — released ${released.toFixed(1)} energy`,
    });

    this.emit("decay", { unitId, label: unit.label, released });
    return true;
  }

  /**
   * Abstract multiple concrete units into a single general principle.
   * Replaces N units with 1 higher-level unit at lower total maintenance cost.
   */
  abstract(unitIds: string[], abstractLabel: string): KnowledgeUnit | null {
    if (unitIds.length < 2) return null;

    const units = unitIds.map((id) => this.units.get(id)).filter(Boolean) as KnowledgeUnit[];
    if (units.length < 2) return null;

    const cost = this.config.abstractionCost;
    if (this.energy < cost) {
      this.emit("energy_insufficient", { reaction: MetabolicReaction.ABSTRACTION, needed: cost, available: this.energy });
      return null;
    }

    // Calculate abstraction properties
    const avgComplexity = units.reduce((s, u) => s + u.complexity, 0) / units.length;
    const totalConnections = new Set<string>();
    for (const u of units) {
      const conns = this.connections.get(u.id) ?? new Set();
      for (const c of conns) {
        if (!unitIds.includes(c)) totalConnections.add(c);
      }
    }

    // Create abstract unit
    const abstractUnit: KnowledgeUnit = {
      id: `ku_abs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: abstractLabel,
      domain: units[0].domain,
      complexity: Math.ceil(avgComplexity * 0.7), // Abstraction reduces complexity
      activation: 1.0,
      maintenanceCost: units.reduce((s, u) => s + u.maintenanceCost, 0) * 0.4, // 60% cost reduction
      connectionCount: totalConnections.size,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      accessCount: units.reduce((s, u) => s + u.accessCount, 0),
      isMyelinated: units.some((u) => u.isMyelinated),
      localCoherence: 0.9,
      isDecaying: false,
    };

    // Remove old units
    const releasedEnergy = units.reduce((s, u) => s + u.complexity * 0.5, 0);
    for (const u of units) {
      this.units.delete(u.id);
      this.connections.delete(u.id);
    }

    // Add abstract unit with inherited connections
    this.units.set(abstractUnit.id, abstractUnit);
    this.connections.set(abstractUnit.id, totalConnections);
    for (const connId of totalConnections) {
      const conns = this.connections.get(connId) ?? new Set();
      // Remove old connections, add new
      for (const oldId of unitIds) conns.delete(oldId);
      conns.add(abstractUnit.id);
      this.connections.set(connId, conns);
    }

    // Net energy: cost - released
    const netEnergy = releasedEnergy - cost;
    this.energy = Math.min(this.config.maxEnergy, this.energy + netEnergy);
    this.totalEnergySpent += Math.max(0, -netEnergy);
    this.totalUsefulWork += cost * 0.95; // Abstraction is highly efficient
    this.recentCatabolicEvents++;
    this.recentAnabolicEvents++;

    this.logEvent({
      reaction: MetabolicReaction.ABSTRACTION,
      unitIds: [...unitIds, abstractUnit.id],
      energyDelta: netEnergy,
      timestamp: Date.now(),
      success: true,
      resultId: abstractUnit.id,
      description: `Abstracted ${units.length} units into "${abstractLabel}" (net energy: ${netEnergy.toFixed(1)})`,
    });

    this.emit("abstraction", { abstractUnit, replacedCount: units.length });
    return abstractUnit;
  }

  // ============================================================
  // ACCESS & QUERY
  // ============================================================

  /**
   * Access a knowledge unit (boosts activation, tracks usage).
   */
  access(unitId: string): KnowledgeUnit | null {
    const unit = this.units.get(unitId);
    if (!unit) return null;

    unit.activation = Math.min(1, unit.activation + 0.15);
    unit.lastAccessedAt = Date.now();
    unit.accessCount++;

    // Check myelination eligibility
    if (!unit.isMyelinated && unit.accessCount >= this.config.myelinationThreshold) {
      this.myelinate(unitId);
    }

    return unit;
  }

  /**
   * Ingest raw stimulus — creates a new basic knowledge unit.
   */
  ingest(label: string, domain: string, complexity: number = 2): KnowledgeUnit | null {
    const cost = complexity * 0.5;
    if (this.energy < cost) return null;

    // Check capacity
    if (this.units.size >= this.config.maxUnits) {
      this.emit("capacity_pressure", { current: this.units.size, max: this.config.maxUnits });
      // Force decay of weakest unit
      this.decayWeakest();
    }

    const unit: KnowledgeUnit = {
      id: `ku_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label,
      domain,
      complexity,
      activation: 0.8,
      maintenanceCost: complexity * 0.05 * this.config.maintenanceCostMult,
      connectionCount: 0,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      accessCount: 1,
      isMyelinated: false,
      localCoherence: 0.5,
      isDecaying: false,
    };

    this.units.set(unit.id, unit);
    this.connections.set(unit.id, new Set());
    this.energy -= cost;
    this.totalEnergySpent += cost;
    this.recentAnabolicEvents++;

    this.emit("ingested", unit);
    return unit;
  }

  // ============================================================
  // STATE
  // ============================================================

  getState(): MetabolicState {
    const activeUnits = [...this.units.values()].filter((u) => !u.isDecaying);
    const myelinatedUnits = [...this.units.values()].filter((u) => u.isMyelinated);
    const totalMaintenance = [...this.units.values()].reduce((s, u) => s + u.maintenanceCost, 0);
    const totalConnections = [...this.connections.values()].reduce((s, c) => s + c.size, 0) / 2;
    const density = this.units.size > 0 ? totalConnections / this.units.size : 0;

    // Entropy: distribution of activation levels
    const activations = [...this.units.values()].map((u) => u.activation);
    const entropy = this.computeEntropy(activations);

    // Anabolic balance
    const total = this.recentAnabolicEvents + this.recentCatabolicEvents;
    const balance = total > 0
      ? (this.recentAnabolicEvents - this.recentCatabolicEvents) / total
      : 0;

    // Efficiency
    const efficiency = this.totalEnergySpent > 0
      ? this.totalUsefulWork / this.totalEnergySpent
      : 1.0;

    return {
      energy: this.energy,
      maxEnergy: this.config.maxEnergy,
      phase: this.phase,
      phaseProgress: this.getPhaseProgress(),
      totalUnits: this.units.size,
      activeUnits: activeUnits.length,
      myelinatedUnits: myelinatedUnits.length,
      metabolicRate: total / Math.max(1, this.tickCount),
      anabolicBalance: balance,
      totalMaintenanceCost: totalMaintenance,
      efficiency,
      knowledgeDensity: density,
      entropy,
      tickCount: this.tickCount,
    };
  }

  getEnergy(): number {
    return this.energy;
  }

  getPhase(): MetabolicPhase {
    return this.phase;
  }

  getUnit(id: string): KnowledgeUnit | undefined {
    return this.units.get(id);
  }

  getUnits(): KnowledgeUnit[] {
    return [...this.units.values()];
  }

  getEventLog(): MetabolicEvent[] {
    return [...this.eventLog];
  }

  getConnections(unitId: string): string[] {
    return [...(this.connections.get(unitId) ?? [])];
  }

  // ============================================================
  // INTERNAL TICK
  // ============================================================

  private tick(): void {
    this.tickCount++;

    // 1. Advance phase
    this.advancePhase();

    // 2. Apply maintenance costs
    this.applyMaintenanceCosts();

    // 3. Decay inactive units
    this.applyActivationDecay();

    // 4. Phase-specific behavior
    this.executePhaseLogic();

    // 5. Energy regeneration during rest
    if (this.phase === MetabolicPhase.RESTING || this.phase === MetabolicPhase.CONSOLIDATING) {
      this.energy = Math.min(this.config.maxEnergy, this.energy + this.config.restRegenRate);
    }

    // 6. Reset recent counters periodically
    if (this.tickCount % 50 === 0) {
      this.recentAnabolicEvents = Math.floor(this.recentAnabolicEvents * 0.5);
      this.recentCatabolicEvents = Math.floor(this.recentCatabolicEvents * 0.5);
    }

    // 7. Emit tick
    if (this.tickCount % 5 === 0) {
      this.emit("tick", this.getState());
    }
  }

  private advancePhase(): void {
    this.phaseTicksElapsed++;
    const phaseDuration = this.getCurrentPhaseDuration();

    if (this.phaseTicksElapsed >= phaseDuration) {
      this.phaseTicksElapsed = 0;
      const phases = [MetabolicPhase.ACTIVE, MetabolicPhase.INTEGRATING, MetabolicPhase.CONSOLIDATING, MetabolicPhase.RESTING];
      const currentIdx = phases.indexOf(this.phase);
      const nextIdx = (currentIdx + 1) % phases.length;
      const oldPhase = this.phase;
      this.phase = phases[nextIdx];
      this.emit("phase_changed", { from: oldPhase, to: this.phase });
    }
  }

  private getCurrentPhaseDuration(): number {
    const phases = [MetabolicPhase.ACTIVE, MetabolicPhase.INTEGRATING, MetabolicPhase.CONSOLIDATING, MetabolicPhase.RESTING];
    const idx = phases.indexOf(this.phase);
    return this.config.phaseDurations[idx] ?? 60;
  }

  private getPhaseProgress(): number {
    return this.phaseTicksElapsed / this.getCurrentPhaseDuration();
  }

  private applyMaintenanceCosts(): void {
    let totalCost = 0;
    for (const unit of this.units.values()) {
      if (!unit.isDecaying) {
        totalCost += unit.maintenanceCost;
      }
    }
    this.energy -= totalCost;
    this.totalEnergySpent += totalCost;

    // If energy goes negative, force catabolism
    if (this.energy < 0) {
      this.emit("energy_crisis", { deficit: -this.energy });
      this.forceCatabolism(Math.ceil(-this.energy / this.config.decayEnergyRelease));
      this.energy = Math.max(0, this.energy);
    }
  }

  private applyActivationDecay(): void {
    for (const unit of this.units.values()) {
      if (unit.isMyelinated) {
        // Myelinated units decay much slower
        unit.activation -= this.config.activationDecayRate * 0.2;
      } else {
        unit.activation -= this.config.activationDecayRate;
      }

      // Mark for decay if below threshold
      if (unit.activation <= this.config.decayThreshold && !unit.isDecaying) {
        unit.isDecaying = true;
        this.emit("decay_candidate", unit);
      }
    }
  }

  private executePhaseLogic(): void {
    switch (this.phase) {
      case MetabolicPhase.CONSOLIDATING:
        // During consolidation, auto-myelinate eligible units
        if (this.tickCount % 10 === 0) {
          for (const unit of this.units.values()) {
            if (!unit.isMyelinated && unit.accessCount >= this.config.myelinationThreshold) {
              this.myelinate(unit.id);
              break; // One per cycle
            }
          }
        }
        // Auto-decay units that have been decaying for a while
        if (this.tickCount % 20 === 0) {
          for (const unit of this.units.values()) {
            if (unit.isDecaying && unit.activation <= 0) {
              this.decay(unit.id);
              break;
            }
          }
        }
        break;

      case MetabolicPhase.RESTING:
        // During rest, slowly consolidate (boost coherence of connected units)
        if (this.tickCount % 15 === 0) {
          for (const unit of this.units.values()) {
            if (unit.connectionCount > 2) {
              unit.localCoherence = Math.min(1, unit.localCoherence + 0.01);
            }
          }
        }
        break;

      default:
        break;
    }
  }

  private forceCatabolism(count: number): void {
    // Decay the weakest units to recover energy
    for (let i = 0; i < count; i++) {
      this.decayWeakest();
    }
  }

  private decayWeakest(): void {
    let weakest: KnowledgeUnit | null = null;
    let weakestScore = Infinity;

    for (const unit of this.units.values()) {
      // Score: lower = more expendable
      const score = unit.activation * 2 +
        unit.connectionCount * 0.5 +
        unit.accessCount * 0.1 +
        (unit.isMyelinated ? 5 : 0);
      if (score < weakestScore) {
        weakestScore = score;
        weakest = unit;
      }
    }

    if (weakest) {
      this.decay(weakest.id);
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private computeEntropy(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((s, v) => s + Math.max(0.001, v), 0);
    let entropy = 0;
    for (const v of values) {
      const p = Math.max(0.001, v) / sum;
      entropy -= p * Math.log2(p);
    }
    return entropy / Math.log2(Math.max(2, values.length)); // Normalize to 0-1
  }

  private logEvent(event: MetabolicEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }
  }

  /**
   * Get a free-energy-compatible metric for integration with ScientificGeniusEngine.
   * Lower = more organized knowledge; higher = more disorder/surprise.
   */
  getFreeEnergyContribution(): number {
    const state = this.getState();
    // Free energy increases with:
    // - High entropy (disorganized knowledge)
    // - Low efficiency (wasted energy)
    // - High maintenance cost relative to energy
    const maintenancePressure = state.totalMaintenanceCost / Math.max(1, state.energy);
    return state.entropy * 0.4 + (1 - state.efficiency) * 0.3 + maintenancePressure * 0.3;
  }

  /**
   * Get metabolic visual state for avatar integration.
   */
  getVisualState(): {
    metabolicPhase: MetabolicPhase;
    energyLevel: number;
    anabolicBalance: number;
    isEnergyCrisis: boolean;
    myelinationProgress: number;
    knowledgeDensity: number;
  } {
    const state = this.getState();
    return {
      metabolicPhase: state.phase,
      energyLevel: state.energy / state.maxEnergy,
      anabolicBalance: state.anabolicBalance,
      isEnergyCrisis: state.energy < state.totalMaintenanceCost * 5,
      myelinationProgress: state.totalUnits > 0 ? state.myelinatedUnits / state.totalUnits : 0,
      knowledgeDensity: state.knowledgeDensity,
    };
  }

  reset(): void {
    this.units.clear();
    this.connections.clear();
    this.energy = this.config.initialEnergy;
    this.phase = MetabolicPhase.ACTIVE;
    this.phaseTicksElapsed = 0;
    this.tickCount = 0;
    this.eventLog = [];
    this.totalEnergySpent = 0;
    this.totalUsefulWork = 0;
    this.recentAnabolicEvents = 0;
    this.recentCatabolicEvents = 0;
  }
}

// ============================================================
// SINGLETON
// ============================================================

export const conceptualMetabolism = new ConceptualMetabolism();

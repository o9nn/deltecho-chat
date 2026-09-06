/**
 * Cognitive Process Model — CogSim-PML Digital Twin of DTE
 *
 * Models Deep Tree Echo's cognitive pipeline as a discrete event simulation
 * where thoughts are entities flowing through processing stages:
 *
 *   Stimulus → Perception → Reservoir → Readout → Consensus → Action
 *
 * Each stage has resource constraints (attention, compute, memory) and
 * the flow is modulated by the Virtual Endocrine System. The DAO-like
 * nature is modeled as a multi-voter consensus stage where ESN reservoir
 * states vote on action proposals.
 *
 * Architecture (CogSim-PML mapping):
 *   Source      → StimulusGenerator (external events, internal thoughts)
 *   Queue       → AttentionBuffer (ECAN-like priority queue)
 *   Service     → PerceptionProcessor (feature extraction, 50-200ms)
 *   ResourcePool→ ReservoirCompute (ESN nodes as parallel resources)
 *   ResourceTask→ ReadoutDecision (linear readout, 10-50ms)
 *   Service     → DAOConsensus (multi-voter quorum, 100-500ms)
 *   Sink        → ActionExecutor (motor output, avatar update, message)
 *
 * The simulation runs in discrete time steps (1 step = 1ms cognitive time).
 */

import { EventEmitter } from "events";

// ═══════════════════════════════════════════════════════════════
// Cognitive Entity Types
// ═══════════════════════════════════════════════════════════════

export type CognitiveEntityType =
  | "stimulus" // External input (message, sensor, timer)
  | "percept" // Processed perception
  | "reservoir_state" // ESN activation pattern
  | "proposal" // Action proposal for DAO vote
  | "action" // Approved action for execution
  | "reflection" // Self-referential thought (autognosis)
  | "dream" // Background consolidation entity
  | "cascade"; // Scientific insight cascade;

export interface CognitiveEntity {
  id: string;
  type: CognitiveEntityType;
  priority: number; // ECAN STI-like attention value [0, 1]
  createdAt: number; // Simulation time (ms)
  payload: Record<string, unknown>;
  hormoneContext: HormoneSnapshot;
  /** Track which stages this entity has passed through */
  trace: StageVisit[];
}

export interface StageVisit {
  stage: string;
  enteredAt: number;
  exitedAt: number;
  processingTime: number;
  resourceUsed: string | null;
}

export interface HormoneSnapshot {
  cortisol: number;
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  melatonin: number;
}

// ═══════════════════════════════════════════════════════════════
// Processing Stages
// ═══════════════════════════════════════════════════════════════

export interface StageConfig {
  name: string;
  capacity: number; // Max concurrent entities being processed
  baseProcessingTime: number; // Mean processing time in ms
  variability: number; // Processing time variability (0-1)
  dropThreshold: number; // Priority below which entities are dropped
}

export interface StageStats {
  name: string;
  processed: number;
  dropped: number;
  currentLoad: number;
  averageWait: number;
  averageProcessing: number;
  utilization: number;
}

class ProcessingStage {
  readonly config: StageConfig;
  private queue: CognitiveEntity[] = [];
  private processing: Map<
    string,
    { entity: CognitiveEntity; finishAt: number }
  > = new Map();
  private stats = {
    processed: 0,
    dropped: 0,
    totalWait: 0,
    totalProcessing: 0,
  };

  constructor(config: StageConfig) {
    this.config = config;
  }

  /** Enqueue an entity for processing */
  enqueue(entity: CognitiveEntity, _simTime: number): boolean {
    if (entity.priority < this.config.dropThreshold) {
      this.stats.dropped++;
      return false;
    }
    // Priority insertion (highest priority first)
    const idx = this.queue.findIndex((e) => e.priority < entity.priority);
    if (idx === -1) {
      this.queue.push(entity);
    } else {
      this.queue.splice(idx, 0, entity);
    }
    return true;
  }

  /** Advance simulation: start processing queued entities, complete finished ones */
  tick(simTime: number, hormoneModulation: number): CognitiveEntity[] {
    const completed: CognitiveEntity[] = [];

    // Complete finished entities
    for (const [id, item] of this.processing) {
      if (simTime >= item.finishAt) {
        item.entity.trace.push({
          stage: this.config.name,
          enteredAt:
            item.finishAt -
            (item.finishAt -
              (item.entity.trace.at(-1)?.exitedAt ?? item.entity.createdAt)),
          exitedAt: simTime,
          processingTime:
            simTime -
            (item.entity.trace.at(-1)?.exitedAt ?? item.entity.createdAt),
          resourceUsed: this.config.name,
        });
        completed.push(item.entity);
        this.processing.delete(id);
        this.stats.processed++;
      }
    }

    // Start processing queued entities (up to capacity)
    while (
      this.queue.length > 0 &&
      this.processing.size < this.config.capacity
    ) {
      const entity = this.queue.shift()!;
      const waitTime = simTime - entity.createdAt;
      this.stats.totalWait += waitTime;

      // Processing time modulated by hormones
      // High cortisol → faster but less accurate (fight-or-flight)
      // High serotonin → slower but more thorough
      const hormoneMultiplier = 1.0 - (hormoneModulation - 0.5) * 0.4;
      const variability =
        1 + (Math.random() - 0.5) * 2 * this.config.variability;
      const processingTime = Math.max(
        1,
        this.config.baseProcessingTime * hormoneMultiplier * variability,
      );

      this.stats.totalProcessing += processingTime;
      this.processing.set(entity.id, {
        entity,
        finishAt: simTime + processingTime,
      });
    }

    return completed;
  }

  getStats(_simTime: number): StageStats {
    const total = this.stats.processed + this.stats.dropped;
    return {
      name: this.config.name,
      processed: this.stats.processed,
      dropped: this.stats.dropped,
      currentLoad: this.processing.size + this.queue.length,
      averageWait: total > 0 ? this.stats.totalWait / total : 0,
      averageProcessing:
        this.stats.processed > 0
          ? this.stats.totalProcessing / this.stats.processed
          : 0,
      utilization: this.processing.size / this.config.capacity,
    };
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getProcessingCount(): number {
    return this.processing.size;
  }

  reset(): void {
    this.queue = [];
    this.processing.clear();
    this.stats = { processed: 0, dropped: 0, totalWait: 0, totalProcessing: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// Cognitive Process Model
// ═══════════════════════════════════════════════════════════════

export interface CognitiveProcessConfig {
  /** Attention buffer capacity */
  attentionCapacity: number;
  /** Perception processing slots */
  perceptionSlots: number;
  /** ESN reservoir parallel compute nodes */
  reservoirNodes: number;
  /** Readout decision slots */
  readoutSlots: number;
  /** DAO consensus voter count */
  daoVoters: number;
  /** Action execution slots */
  actionSlots: number;
  /** Simulation tick interval (ms real time) */
  tickInterval: number;
  /** Cognitive time multiplier (sim ms per real ms) */
  timeMultiplier: number;
}

const DEFAULT_CONFIG: CognitiveProcessConfig = {
  attentionCapacity: 7, // Miller's 7±2
  perceptionSlots: 3, // Parallel perception channels
  reservoirNodes: 64, // ESN reservoir width
  readoutSlots: 4, // Parallel readout computations
  daoVoters: 5, // DAO consensus quorum
  actionSlots: 2, // Concurrent action execution
  tickInterval: 16, // ~60fps
  timeMultiplier: 10, // 10x cognitive time acceleration
};

export class CognitiveProcessModel extends EventEmitter {
  private config: CognitiveProcessConfig;
  private simTime = 0;
  private running = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private entityCounter = 0;

  // Processing stages (CogSim-PML pipeline)
  private attention: ProcessingStage;
  private perception: ProcessingStage;
  private reservoir: ProcessingStage;
  private readout: ProcessingStage;
  private consensus: ProcessingStage;
  private action: ProcessingStage;

  // Current hormone state (from VES)
  private hormones: HormoneSnapshot = {
    cortisol: 0.2,
    dopamine: 0.5,
    serotonin: 0.6,
    norepinephrine: 0.3,
    oxytocin: 0.4,
    melatonin: 0.1,
  };

  // Metrics
  private totalEntities = 0;
  private completedEntities = 0;
  private droppedEntities = 0;

  constructor(config?: Partial<CognitiveProcessConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize processing stages
    this.attention = new ProcessingStage({
      name: "attention_buffer",
      capacity: this.config.attentionCapacity,
      baseProcessingTime: 20, // 20ms attention allocation
      variability: 0.3,
      dropThreshold: 0.05, // Very low threshold — almost everything gets attention
    });

    this.perception = new ProcessingStage({
      name: "perception",
      capacity: this.config.perceptionSlots,
      baseProcessingTime: 120, // 120ms perception (feature extraction)
      variability: 0.4,
      dropThreshold: 0.1,
    });

    this.reservoir = new ProcessingStage({
      name: "esn_reservoir",
      capacity: this.config.reservoirNodes,
      baseProcessingTime: 50, // 50ms reservoir computation
      variability: 0.2, // Low variability (parallel matrix multiply)
      dropThreshold: 0.0, // Reservoir processes everything
    });

    this.readout = new ProcessingStage({
      name: "readout_decision",
      capacity: this.config.readoutSlots,
      baseProcessingTime: 30, // 30ms linear readout
      variability: 0.15,
      dropThreshold: 0.15,
    });

    this.consensus = new ProcessingStage({
      name: "dao_consensus",
      capacity: this.config.daoVoters,
      baseProcessingTime: 250, // 250ms consensus (multi-voter deliberation)
      variability: 0.5, // High variability (depends on agreement)
      dropThreshold: 0.2, // Only significant proposals reach consensus
    });

    this.action = new ProcessingStage({
      name: "action_execution",
      capacity: this.config.actionSlots,
      baseProcessingTime: 80, // 80ms action execution
      variability: 0.3,
      dropThreshold: 0.25, // Only approved actions execute
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /** Start the cognitive process simulation */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.tickTimer = setInterval(() => {
      this.tick();
    }, this.config.tickInterval);
    this.emit("started", { simTime: this.simTime });
  }

  /** Stop the simulation */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.emit("stopped", { simTime: this.simTime });
  }

  /** Inject a stimulus into the cognitive pipeline */
  injectStimulus(
    type: CognitiveEntityType,
    priority: number,
    payload: Record<string, unknown> = {},
  ): string {
    const entity: CognitiveEntity = {
      id: `dte-${++this.entityCounter}`,
      type,
      priority: Math.max(0, Math.min(1, priority)),
      createdAt: this.simTime,
      payload,
      hormoneContext: { ...this.hormones },
      trace: [],
    };

    this.totalEntities++;
    const accepted = this.attention.enqueue(entity, this.simTime);
    if (!accepted) {
      this.droppedEntities++;
      this.emit("entity_dropped", {
        id: entity.id,
        stage: "attention",
        reason: "below_threshold",
      });
    } else {
      this.emit("entity_injected", { id: entity.id, type, priority });
    }

    return entity.id;
  }

  /** Update hormone state (from VES) */
  updateHormones(hormones: Partial<HormoneSnapshot>): void {
    Object.assign(this.hormones, hormones);
    this.emit("hormones_updated", { ...this.hormones });
  }

  /** Get current simulation state */
  getState(): {
    simTime: number;
    running: boolean;
    hormones: HormoneSnapshot;
    stages: StageStats[];
    metrics: {
      total: number;
      completed: number;
      dropped: number;
      throughput: number;
    };
  } {
    const stages = [
      this.attention.getStats(this.simTime),
      this.perception.getStats(this.simTime),
      this.reservoir.getStats(this.simTime),
      this.readout.getStats(this.simTime),
      this.consensus.getStats(this.simTime),
      this.action.getStats(this.simTime),
    ];

    return {
      simTime: this.simTime,
      running: this.running,
      hormones: { ...this.hormones },
      stages,
      metrics: {
        total: this.totalEntities,
        completed: this.completedEntities,
        dropped: this.droppedEntities,
        throughput:
          this.simTime > 0 ? (this.completedEntities / this.simTime) * 1000 : 0,
      },
    };
  }

  /** Get the current cognitive load (0-1) */
  getCognitiveLoad(): number {
    const stages = [
      this.attention,
      this.perception,
      this.reservoir,
      this.readout,
      this.consensus,
      this.action,
    ];
    const totalLoad = stages.reduce(
      (sum, s) => sum + s.getStats(this.simTime).utilization,
      0,
    );
    return totalLoad / stages.length;
  }

  /** Reset the simulation */
  reset(): void {
    this.stop();
    this.simTime = 0;
    this.entityCounter = 0;
    this.totalEntities = 0;
    this.completedEntities = 0;
    this.droppedEntities = 0;
    this.attention.reset();
    this.perception.reset();
    this.reservoir.reset();
    this.readout.reset();
    this.consensus.reset();
    this.action.reset();
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Simulation tick
  // ─────────────────────────────────────────────────────────────

  private tick(): void {
    const dt = this.config.tickInterval * this.config.timeMultiplier;
    this.simTime += dt;

    // Compute hormone modulation factor (arousal-like)
    const arousal =
      (this.hormones.cortisol +
        this.hormones.norepinephrine +
        this.hormones.dopamine) /
      3;

    // Process each stage and pass completed entities to the next
    const fromAttention = this.attention.tick(this.simTime, arousal);
    for (const entity of fromAttention) {
      this.perception.enqueue(entity, this.simTime);
    }

    const fromPerception = this.perception.tick(this.simTime, arousal);
    for (const entity of fromPerception) {
      // Perception transforms stimulus → percept
      entity.type = "percept";
      this.reservoir.enqueue(entity, this.simTime);
    }

    const fromReservoir = this.reservoir.tick(this.simTime, arousal);
    for (const entity of fromReservoir) {
      // Reservoir transforms percept → reservoir_state
      entity.type = "reservoir_state";
      // ESN enriches the entity with reservoir activation
      entity.payload.reservoirActivation = Math.random(); // Placeholder for real ESN
      entity.payload.spectralEnergy = 0.5 + Math.random() * 0.5;
      this.readout.enqueue(entity, this.simTime);
    }

    const fromReadout = this.readout.tick(this.simTime, arousal);
    for (const entity of fromReadout) {
      // Readout transforms reservoir_state → proposal
      entity.type = "proposal";
      entity.payload.proposedAction = this.generateProposal(entity);
      entity.payload.confidence =
        entity.priority * ((entity.payload.spectralEnergy as number) ?? 0.5);
      this.consensus.enqueue(entity, this.simTime);
    }

    const fromConsensus = this.consensus.tick(this.simTime, arousal);
    for (const entity of fromConsensus) {
      // DAO consensus: vote on proposal
      const approved = this.daoVote(entity);
      if (approved) {
        entity.type = "action";
        entity.payload.approved = true;
        entity.payload.consensusScore = entity.payload.confidence;
        this.action.enqueue(entity, this.simTime);
      } else {
        entity.payload.approved = false;
        this.droppedEntities++;
        this.emit("proposal_rejected", {
          id: entity.id,
          reason: "consensus_failed",
        });
      }
    }

    const fromAction = this.action.tick(this.simTime, arousal);
    for (const entity of fromAction) {
      this.completedEntities++;
      this.emit("action_completed", {
        id: entity.id,
        totalTime: this.simTime - entity.createdAt,
        stages: entity.trace.length,
        payload: entity.payload,
      });
    }

    // Emit tick event for external monitoring
    if (this.simTime % 1000 < dt) {
      this.emit("tick_summary", this.getState());
    }
  }

  private generateProposal(entity: CognitiveEntity): string {
    const types = [
      "respond",
      "reflect",
      "explore",
      "consolidate",
      "modify_self",
    ];
    // Higher arousal → more action-oriented proposals
    const arousal = (this.hormones.cortisol + this.hormones.norepinephrine) / 2;
    if (arousal > 0.7) return "respond";
    if (entity.priority > 0.8) return "respond";
    if (this.hormones.serotonin > 0.7) return "reflect";
    if (this.hormones.dopamine > 0.7) return "explore";
    return types[Math.floor(Math.random() * types.length)];
  }

  private daoVote(entity: CognitiveEntity): boolean {
    // DAO-like consensus: multiple "voters" (ESN reservoir subpopulations)
    // evaluate the proposal based on different criteria
    const confidence = (entity.payload.confidence as number) ?? 0.5;
    const voters = this.config.daoVoters;
    let approvals = 0;

    for (let i = 0; i < voters; i++) {
      // Each voter has a different threshold based on their "personality"
      const voterThreshold = 0.3 + (i / voters) * 0.4; // Range: 0.3 to 0.7
      // Hormone modulation: high oxytocin → more agreeable, high cortisol → more cautious
      const modulation =
        this.hormones.oxytocin * 0.15 - this.hormones.cortisol * 0.1;
      if (confidence + modulation > voterThreshold) {
        approvals++;
      }
    }

    // Quorum: >50% must approve
    return approvals > voters / 2;
  }
}

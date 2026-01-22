/**
 * @fileoverview Developmental Lifecycle Coordinator
 *
 * Orchestrates the cyclic integration between AAR layers following
 * the developmental lifecycle pattern:
 *
 * PERCEPTION → MODELING → REFLECTION → MIRRORING → ENACTION
 *
 * This creates the emergent self through continuous developmental cycles.
 */

import { EventEmitter } from "events";
import type { ArenaMCPServer } from "../arena-mcp/index.js";
import type { AgentMCPServer } from "../agent-mcp/index.js";
import type { RelationMCPServer } from "../relation-mcp/index.js";
import type { DevelopmentalCycleResult, _VirtualAgentModel } from "../types.js";

/**
 * Lifecycle phase enumeration
 */
export enum LifecyclePhase {
  PERCEPTION = "perception", // Ao → Ai: World events reach the agent
  MODELING = "modeling", // Ai → S: Agent processes through relational self
  REFLECTION = "reflection", // S → Vi: Self updates virtual agent model
  MIRRORING = "mirroring", // Vi ↔ Vo: Self-model updates world-view (INVERTED)
  ENACTION = "enaction", // Vo → Ao: World-view guides action in actual world
}

/**
 * Lifecycle configuration
 */
export interface LifecycleConfig {
  /** Interval between automatic cycles (0 = manual only) */
  cycleIntervalMs: number;
  /** Whether to run phases sequentially or allow overlap */
  sequentialPhases: boolean;
  /** Coherence threshold below which extra integration is triggered */
  coherenceThreshold: number;
  /** Enable verbose logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: LifecycleConfig = {
  cycleIntervalMs: 0, // Manual by default
  sequentialPhases: true,
  coherenceThreshold: 0.6,
  verbose: false,
};

/**
 * Lifecycle event
 */
export interface LifecycleEvent {
  cycleId: number;
  phase: LifecyclePhase;
  timestamp: number;
  result?: DevelopmentalCycleResult;
  error?: Error;
}

/**
 * Developmental Lifecycle Coordinator
 *
 * Manages the continuous cycle of:
 * Perception → Modeling → Reflection → Mirroring → Enaction
 *
 * Each cycle integrates the Actual (Ao, Ai) with the Virtual (Vi, Vo)
 * through the Relation interface (S).
 */
export class LifecycleCoordinator extends EventEmitter {
  private config: LifecycleConfig;
  private arenaMCP: ArenaMCPServer;
  private agentMCP: AgentMCPServer;
  private relationMCP: RelationMCPServer;

  private cycleCount: number = 0;
  private currentPhase: LifecyclePhase = LifecyclePhase.PERCEPTION;
  private cycleInterval?: NodeJS.Timeout;
  private running: boolean = false;

  constructor(
    arenaMCP: ArenaMCPServer,
    agentMCP: AgentMCPServer,
    relationMCP: RelationMCPServer,
    config: Partial<LifecycleConfig> = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.arenaMCP = arenaMCP;
    this.agentMCP = agentMCP;
    this.relationMCP = relationMCP;
  }

  // =========================================================================
  // LIFECYCLE CONTROL
  // =========================================================================

  /**
   * Start the lifecycle coordinator
   */
  start(): void {
    if (this.running) return;

    this.running = true;

    if (this.config.cycleIntervalMs > 0) {
      this.cycleInterval = setInterval(() => {
        this.runCycle().catch((err) => {
          this.emit("error", err);
        });
      }, this.config.cycleIntervalMs);
    }

    this.emit("started");
  }

  /**
   * Stop the lifecycle coordinator
   */
  stop(): void {
    if (!this.running) return;

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = undefined;
    }

    this.running = false;
    this.emit("stopped");
  }

  // =========================================================================
  // CYCLE EXECUTION
  // =========================================================================

  /**
   * Run a complete developmental cycle
   */
  async runCycle(): Promise<DevelopmentalCycleResult[]> {
    this.cycleCount++;
    const cycleId = this.cycleCount;
    const results: DevelopmentalCycleResult[] = [];

    this.emit("cycle:start", { cycleId });

    try {
      // Execute each phase in sequence
      for (const phase of Object.values(LifecyclePhase)) {
        const result = await this.executePhase(phase, cycleId);
        results.push(result);

        // Check coherence after each phase
        const coherence = this.relationMCP.getRelation().getCoherence();
        if (coherence < this.config.coherenceThreshold) {
          // Trigger extra integration if coherence is low
          this.emit("coherence:low", { cycleId, phase, coherence });
        }
      }

      this.emit("cycle:complete", { cycleId, results });
      return results;
    } catch (error) {
      this.emit("cycle:error", { cycleId, error });
      throw error;
    }
  }

  /**
   * Execute a single lifecycle phase
   */
  async executePhase(
    phase: LifecyclePhase,
    cycleId: number = this.cycleCount,
  ): Promise<DevelopmentalCycleResult> {
    this.currentPhase = phase;

    const event: LifecycleEvent = {
      cycleId,
      phase,
      timestamp: Date.now(),
    };

    this.emit("phase:start", event);

    try {
      let result: DevelopmentalCycleResult;

      switch (phase) {
        case LifecyclePhase.PERCEPTION:
          result = await this.executePerception(cycleId);
          break;
        case LifecyclePhase.MODELING:
          result = await this.executeModeling(cycleId);
          break;
        case LifecyclePhase.REFLECTION:
          result = await this.executeReflection(cycleId);
          break;
        case LifecyclePhase.MIRRORING:
          result = await this.executeMirroring(cycleId);
          break;
        case LifecyclePhase.ENACTION:
          result = await this.executeEnaction(cycleId);
          break;
        default:
          throw new Error(`Unknown phase: ${phase}`);
      }

      event.result = result;
      this.emit("phase:complete", event);
      return result;
    } catch (error) {
      event.error = error as Error;
      this.emit("phase:error", event);
      throw error;
    }
  }

  // =========================================================================
  // PHASE IMPLEMENTATIONS
  // =========================================================================

  /**
   * PERCEPTION: Ao → Ai
   * World events reach the agent
   */
  private async executePerception(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const arena = this.arenaMCP.getArena();
    const agent = this.agentMCP.getAgent();

    // Get current arena state
    const arenaState = arena.getState();

    // Update agent's engagement based on narrative intensity
    const dominantPhase = Object.entries(arenaState.phases).sort(
      ([, a], [, b]) => b.intensity - a.intensity,
    )[0];

    if (dominantPhase) {
      // Raise engagement if narrative is active
      const currentEngagement = agent.getState().engagementLevel;
      const _newEngagement = Math.min(
        1,
        currentEngagement + dominantPhase[1].intensity * 0.1,
      );
      // Engagement is updated through participatory actions
    }

    return {
      cycleNumber: cycleId,
      phase: "perception",
      stateChanges: {
        agentDelta: {},
        arenaDelta: {},
        virtualAgentDelta: {},
        virtualArenaDelta: {},
      },
      coherenceAfter: this.relationMCP.getRelation().getCoherence(),
      timestamp: Date.now(),
    };
  }

  /**
   * MODELING: Ai → S
   * Agent processes through relational self
   */
  private async executeModeling(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const relation = this.relationMCP.getRelation();
    const agent = this.agentMCP.getAgent();
    const arena = this.arenaMCP.getArena();

    // Synthesize current states
    relation.synthesize(agent.getState(), arena.getState());

    return {
      cycleNumber: cycleId,
      phase: "modeling",
      stateChanges: {
        agentDelta: {},
        arenaDelta: {},
        virtualAgentDelta: {},
        virtualArenaDelta: {},
      },
      coherenceAfter: relation.getCoherence(),
      timestamp: Date.now(),
    };
  }

  /**
   * REFLECTION: S → Vi
   * Self updates virtual agent model
   */
  private async executeReflection(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const relation = this.relationMCP.getRelation();
    const selfReflection = relation.getSelfReflection();
    const virtualAgent = this.relationMCP.getVirtualAgent();

    // Update Vi with insights from S
    this.relationMCP.updateVirtualAgent({
      selfStory: selfReflection.selfNarrative,
      roleUnderstanding: selfReflection.perceivedRole,
      selfAwareness: {
        ...virtualAgent.selfAwareness,
        lastReflection: Date.now(),
        activeQuestions: selfReflection.activeQuestions,
      },
    });

    return {
      cycleNumber: cycleId,
      phase: "reflection",
      stateChanges: {
        agentDelta: {},
        arenaDelta: {},
        virtualAgentDelta: {},
        virtualArenaDelta: {},
      },
      coherenceAfter: relation.getCoherence(),
      timestamp: Date.now(),
    };
  }

  /**
   * MIRRORING: Vi ↔ Vo
   * Self-model updates world-view (THE INVERTED MIRROR)
   *
   * This is where the magic happens - the agent's self-model
   * influences its perception of the world, and vice versa.
   */
  private async executeMirroring(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const virtualAgent = this.relationMCP.getVirtualAgent();
    const emergent = this.relationMCP.getRelation().getEmergentIdentity();

    // The inverted mirror: Vi contains Vo
    // Update Vo based on Vi's current state
    const updatedVo = {
      ...virtualAgent.worldView,
      situationalAwareness: {
        ...virtualAgent.worldView.situationalAwareness,
        // World-view coherence reflects self-coherence
        estimatedCoherence: emergent.coherence,
      },
      divergenceMetrics: {
        lastSyncTime: Date.now(),
        estimatedDrift: 1 - emergent.coherence,
        knownMisalignments: emergent.tensions.map(
          (t) => `${t.pole1} vs ${t.pole2}`,
        ),
      },
    };

    this.relationMCP.updateVirtualArena(updatedVo);

    return {
      cycleNumber: cycleId,
      phase: "mirroring",
      stateChanges: {
        agentDelta: {},
        arenaDelta: {},
        virtualAgentDelta: {},
        virtualArenaDelta: {},
      },
      coherenceAfter: this.relationMCP.getRelation().getCoherence(),
      timestamp: Date.now(),
    };
  }

  /**
   * ENACTION: Vo → Ao
   * World-view guides action in actual world
   */
  private async executeEnaction(
    cycleId: number,
  ): Promise<DevelopmentalCycleResult> {
    const virtualAgent = this.relationMCP.getVirtualAgent();
    const arena = this.arenaMCP.getArena();

    // The agent's world-view influences what narrative phases get activated
    const assumedPhase =
      virtualAgent.worldView.situationalAwareness.assumedNarrativePhase;

    // Subtly reinforce the assumed phase (self-fulfilling prophecy)
    arena.transitionPhase(assumedPhase as any, 0.05);

    return {
      cycleNumber: cycleId,
      phase: "enaction",
      stateChanges: {
        agentDelta: {},
        arenaDelta: {},
        virtualAgentDelta: {},
        virtualArenaDelta: {},
      },
      coherenceAfter: this.relationMCP.getRelation().getCoherence(),
      timestamp: Date.now(),
    };
  }

  // =========================================================================
  // ACCESSORS
  // =========================================================================

  getCycleCount(): number {
    return this.cycleCount;
  }

  getCurrentPhase(): LifecyclePhase {
    return this.currentPhase;
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): LifecycleConfig {
    return { ...this.config };
  }
}

/**
 * Create a lifecycle coordinator
 */
export function createLifecycleCoordinator(
  arenaMCP: ArenaMCPServer,
  agentMCP: AgentMCPServer,
  relationMCP: RelationMCPServer,
  config?: Partial<LifecycleConfig>,
): LifecycleCoordinator {
  return new LifecycleCoordinator(arenaMCP, agentMCP, relationMCP, config);
}

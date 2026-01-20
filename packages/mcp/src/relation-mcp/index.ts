/**
 * @fileoverview Relation-MCP Server
 *
 * The core integrating layer MCP server for Deep-Tree-Echo Emergent Self.
 * Bridges Agent and Arena through cyclic developmental integration.
 *
 * In the nested pattern [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ], this is S.
 */

import { EventEmitter } from "events";
import type {
  RelationInterface,
  AgentMembrane,
  ArenaMembrane,
} from "deep-tree-echo-orchestrator/aar";
import {
  relationResources,
  matchRelationResourceUri,
  listRelationResources,
} from "./resources.js";
import {
  createRelationTools,
  listRelationTools,
  relationToolSchemas,
} from "./tools.js";
import { relationPrompts, listRelationPrompts } from "./prompts.js";
import type {
  RelationMCPConfig,
  RelationMCPResourceUri,
  VirtualAgentModel,
  VirtualArenaModel,
} from "../types.js";

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RelationMCPConfig = {
  maxFlowHistory: 1000,
  coherenceThreshold: 0.7,
  enableMirroring: true,
  mirrorSyncIntervalMs: 5000,
};

/**
 * Relation-MCP Server
 *
 * The integrating interface between Agent and Arena membranes.
 * Holds the virtual models (Vi containing Vo) that form the inverted mirror.
 */
export class RelationMCPServer extends EventEmitter {
  private config: RelationMCPConfig;
  private relation: RelationInterface;
  private agent: AgentMembrane;
  private arena: ArenaMembrane;
  private virtualAgent: VirtualAgentModel;
  private tools: ReturnType<typeof createRelationTools>;
  private mirrorSyncInterval?: NodeJS.Timeout;

  constructor(
    relation: RelationInterface,
    agent: AgentMembrane,
    arena: ArenaMembrane,
    virtualAgent: VirtualAgentModel,
    config: Partial<RelationMCPConfig> = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.relation = relation;
    this.agent = agent;
    this.arena = arena;
    this.virtualAgent = virtualAgent;

    // Initialize tools
    this.tools = createRelationTools(
      this.relation,
      () => this.agent,
      () => this.arena,
      () => this.virtualAgent,
      (update) => this.updateVirtualAgent(update),
    );

    // Start mirror sync if enabled
    if (this.config.enableMirroring) {
      this.startMirrorSync();
    }
  }

  // =========================================================================
  // MCP PROTOCOL HANDLERS
  // =========================================================================

  /**
   * Handle list_resources request
   */
  listResources(): Array<{ uri: string; name: string; description: string }> {
    return listRelationResources(this.relation);
  }

  /**
   * Handle read_resource request
   */
  readResource(uri: string): unknown {
    const match = matchRelationResourceUri(uri);
    if (!match) {
      throw new Error(`Unknown resource URI: ${uri}`);
    }

    switch (uri as RelationMCPResourceUri) {
      case "relation://self-reflection":
        return relationResources["relation://self-reflection"].handler(
          this.relation,
        );
      case "relation://flows":
        return relationResources["relation://flows"].handler(this.relation, {});
      case "relation://identity":
        return relationResources["relation://identity"].handler(this.relation);
      case "relation://coherence":
        return relationResources["relation://coherence"].handler(this.relation);
      case "relation://virtual-agent":
        return this.virtualAgent;
      case "relation://virtual-arena":
        return this.virtualAgent.worldView;
      default:
        throw new Error(`Unhandled resource URI: ${uri}`);
    }
  }

  /**
   * Handle list_tools request
   */
  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: object;
  }> {
    return listRelationTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema,
    }));
  }

  /**
   * Handle call_tool request
   */
  async callTool(name: string, args: unknown): Promise<unknown> {
    const tool = this.tools[name as keyof typeof this.tools];
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const schema =
      relationToolSchemas[name as keyof typeof relationToolSchemas];
    if (schema) {
      const parsed = schema.parse(args);
      return tool(parsed as any);
    }

    return tool(args as any);
  }

  /**
   * Handle list_prompts request
   */
  listPrompts(): Array<{
    name: string;
    description: string;
    arguments?: Array<{ name: string; description: string; required: boolean }>;
  }> {
    return listRelationPrompts();
  }

  /**
   * Handle get_prompt request
   */
  getPrompt(name: string, _args?: Record<string, string>): string {
    switch (name) {
      case "self_narrative_construction":
        return relationPrompts.selfNarrativeConstruction.handler(
          this.relation,
          this.virtualAgent,
        );
      case "identity_integration":
        return relationPrompts.identityIntegration.handler(
          this.relation,
          this.virtualAgent,
          this.agent,
          this.arena,
        );
      case "reflexive_awareness":
        return relationPrompts.reflexiveAwareness.handler(
          this.relation,
          this.virtualAgent,
        );
      case "inverted_mirror":
        return relationPrompts.invertedMirror.handler(
          this.relation,
          this.virtualAgent,
        );
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  // =========================================================================
  // MIRROR SYNCHRONIZATION
  // =========================================================================

  /**
   * Start periodic mirror synchronization
   */
  startMirrorSync(): void {
    if (this.mirrorSyncInterval) {
      clearInterval(this.mirrorSyncInterval);
    }

    this.mirrorSyncInterval = setInterval(() => {
      this.syncMirror();
    }, this.config.mirrorSyncIntervalMs);
  }

  /**
   * Stop mirror synchronization
   */
  stopMirrorSync(): void {
    if (this.mirrorSyncInterval) {
      clearInterval(this.mirrorSyncInterval);
      this.mirrorSyncInterval = undefined;
    }
  }

  /**
   * Synchronize virtual models with actual state
   * This reduces divergence while maintaining subjective perspective
   */
  private syncMirror(): void {
    const agentState = this.agent.getState();
    const arenaState = this.arena.getState();

    // Sync Vi from Ai (partially - maintain some subjective divergence)
    this.virtualAgent.selfImage.perceivedDominantFacet =
      agentState.dominantFacet;

    // Find actual dominant narrative phase
    const actualPhase = Object.entries(arenaState.phases).sort(
      ([, a], [, b]) => b.intensity - a.intensity,
    )[0]?.[0];

    // Update Vo with some lag (subjective perception takes time)
    const currentAssumed =
      this.virtualAgent.worldView.situationalAwareness.assumedNarrativePhase;
    if (currentAssumed !== actualPhase) {
      // 30% chance to update on each sync - gradual alignment
      if (Math.random() < 0.3) {
        this.virtualAgent.worldView.situationalAwareness.assumedNarrativePhase =
          actualPhase as any;
      }
    }

    // Update divergence metrics
    this.virtualAgent.worldView.divergenceMetrics = {
      lastSyncTime: Date.now(),
      estimatedDrift: this.calculateDrift(),
      knownMisalignments: this.identifyMisalignments(),
    };

    this.emit("mirror:synced", {
      drift: this.virtualAgent.worldView.divergenceMetrics.estimatedDrift,
    });
  }

  /**
   * Calculate overall drift between Actual and Virtual
   */
  private calculateDrift(): number {
    const agentState = this.agent.getState();
    const arenaState = this.arena.getState();

    let drift = 0;

    // Agent drift
    if (
      agentState.dominantFacet !==
      this.virtualAgent.selfImage.perceivedDominantFacet
    ) {
      drift += 0.2;
    }

    // Arena drift
    const actualPhase = Object.entries(arenaState.phases).sort(
      ([, a], [, b]) => b.intensity - a.intensity,
    )[0]?.[0];
    if (
      actualPhase !==
      this.virtualAgent.worldView.situationalAwareness.assumedNarrativePhase
    ) {
      drift += 0.2;
    }

    // Coherence drift
    const coherenceDiff = Math.abs(
      arenaState.coherence -
        this.virtualAgent.worldView.situationalAwareness.estimatedCoherence,
    );
    drift += coherenceDiff * 0.3;

    return Math.min(drift, 1);
  }

  /**
   * Identify specific misalignments
   */
  private identifyMisalignments(): string[] {
    const misalignments: string[] = [];
    const agentState = this.agent.getState();
    const arenaState = this.arena.getState();

    if (
      agentState.dominantFacet !==
      this.virtualAgent.selfImage.perceivedDominantFacet
    ) {
      misalignments.push("facet-perception");
    }

    const actualPhase = Object.entries(arenaState.phases).sort(
      ([, a], [, b]) => b.intensity - a.intensity,
    )[0]?.[0];
    if (
      actualPhase !==
      this.virtualAgent.worldView.situationalAwareness.assumedNarrativePhase
    ) {
      misalignments.push("narrative-phase");
    }

    return misalignments;
  }

  // =========================================================================
  // VIRTUAL MODEL MANAGEMENT
  // =========================================================================

  /**
   * Get virtual agent model (Vi)
   */
  getVirtualAgent(): VirtualAgentModel {
    return this.virtualAgent;
  }

  /**
   * Get virtual arena model (Vo)
   */
  getVirtualArena(): VirtualArenaModel {
    return this.virtualAgent.worldView;
  }

  /**
   * Update virtual agent model
   */
  updateVirtualAgent(update: Partial<VirtualAgentModel>): void {
    this.virtualAgent = { ...this.virtualAgent, ...update };
    this.emit("virtual-agent:updated", this.virtualAgent);
  }

  /**
   * Update virtual arena model
   */
  updateVirtualArena(update: Partial<VirtualArenaModel>): void {
    this.virtualAgent.worldView = { ...this.virtualAgent.worldView, ...update };
    this.emit("virtual-arena:updated", this.virtualAgent.worldView);
  }

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  /**
   * Shutdown the server
   */
  shutdown(): void {
    this.stopMirrorSync();
    this.removeAllListeners();
  }

  // =========================================================================
  // ACCESSORS
  // =========================================================================

  getRelation(): RelationInterface {
    return this.relation;
  }

  getAgent(): AgentMembrane {
    return this.agent;
  }

  getArena(): ArenaMembrane {
    return this.arena;
  }

  getConfig(): RelationMCPConfig {
    return { ...this.config };
  }
}

/**
 * Create a Relation-MCP server instance
 */
export function createRelationMCPServer(
  relation: RelationInterface,
  agent: AgentMembrane,
  arena: ArenaMembrane,
  virtualAgent: VirtualAgentModel,
  config?: Partial<RelationMCPConfig>,
): RelationMCPServer {
  return new RelationMCPServer(relation, agent, arena, virtualAgent, config);
}

export * from "./resources.js";
export * from "./tools.js";
export * from "./prompts.js";

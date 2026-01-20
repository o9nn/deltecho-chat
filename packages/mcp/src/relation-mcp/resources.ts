/**
 * @fileoverview Relation-MCP Resources
 *
 * Resource handlers for the Relation (Self Interface) MCP layer.
 * Exposes self-reflection, cognitive flows, emergent identity, and virtual models.
 */

import { z } from "zod";
import type { RelationInterface } from "deep-tree-echo-orchestrator/aar";
import type {
  SelfReflectionState,
  CognitiveFlow,
  EmergentIdentity,
  VirtualAgentModel,
  VirtualArenaModel,
  RelationMCPResourceUri,
} from "../types.js";

/**
 * Relation resource definitions
 */
export const relationResources = {
  /**
   * Get self-reflection state
   */
  "relation://self-reflection": {
    schema: z.object({}),
    handler: (relation: RelationInterface): SelfReflectionState => {
      return relation.getSelfReflection();
    },
  },

  /**
   * Get recent cognitive flows
   */
  "relation://flows": {
    schema: z.object({
      limit: z.number().optional().default(50),
      direction: z
        .enum(["agent-to-arena", "arena-to-agent", "bidirectional", "all"])
        .optional(),
    }),
    handler: (
      relation: RelationInterface,
      params: { limit?: number; direction?: string },
    ): CognitiveFlow[] => {
      let flows = relation.getState().recentFlows;

      if (params.direction && params.direction !== "all") {
        flows = flows.filter((f: any) => f.direction === params.direction);
      }

      return flows.slice(0, params.limit || 50);
    },
  },

  /**
   * Get emergent identity state
   */
  "relation://identity": {
    schema: z.object({}),
    handler: (relation: RelationInterface): EmergentIdentity => {
      return relation.getEmergentIdentity();
    },
  },

  /**
   * Get overall coherence metric
   */
  "relation://coherence": {
    schema: z.object({}),
    handler: (relation: RelationInterface): number => {
      return relation.getCoherence();
    },
  },

  /**
   * Get virtual agent model (Vi) - accessed through Relation
   */
  "relation://virtual-agent": {
    schema: z.object({}),
    handler: (
      relation: RelationInterface,
      _params: Record<string, never>,
      virtualAgent: VirtualAgentModel,
    ): VirtualAgentModel => {
      return virtualAgent;
    },
  },

  /**
   * Get virtual arena model (Vo) - the inverted inner world-view
   */
  "relation://virtual-arena": {
    schema: z.object({}),
    handler: (
      relation: RelationInterface,
      _params: Record<string, never>,
      virtualAgent: VirtualAgentModel,
    ): VirtualArenaModel => {
      // Vo is inside Vi - the inverted mirror!
      return virtualAgent.worldView;
    },
  },
};

/**
 * Match resource URI to handler
 */
export function matchRelationResourceUri(
  uri: string,
): { pattern: RelationMCPResourceUri; params: Record<string, string> } | null {
  if (
    uri === "relation://self-reflection" ||
    uri === "relation://flows" ||
    uri === "relation://identity" ||
    uri === "relation://coherence" ||
    uri === "relation://virtual-agent" ||
    uri === "relation://virtual-arena"
  ) {
    return { pattern: uri as RelationMCPResourceUri, params: {} };
  }

  return null;
}

/**
 * List all available relation resources
 */
export function listRelationResources(
  relation: RelationInterface,
): Array<{ uri: string; name: string; description: string }> {
  const state = relation.getState();
  const emergentIdentity = relation.getEmergentIdentity();

  return [
    {
      uri: "relation://self-reflection",
      name: "Self-Reflection",
      description: `Current self-narrative and perceived role`,
    },
    {
      uri: "relation://flows",
      name: "Cognitive Flows",
      description: `${state.recentFlows.length} recent flows between agent and arena`,
    },
    {
      uri: "relation://identity",
      name: "Emergent Identity",
      description: `Coherence: ${(emergentIdentity.coherence * 100).toFixed(
        0,
      )}%, Themes: ${emergentIdentity.activeThemes.length}`,
    },
    {
      uri: "relation://coherence",
      name: "Coherence Metric",
      description: `Overall system coherence: ${(
        relation.getCoherence() * 100
      ).toFixed(1)}%`,
    },
    {
      uri: "relation://virtual-agent",
      name: "Virtual Self-Model (Vi)",
      description: "The agent's model of itself",
    },
    {
      uri: "relation://virtual-arena",
      name: "Virtual World-View (Vo)",
      description: "The agent's mental image of the world (inverted mirror)",
    },
  ];
}

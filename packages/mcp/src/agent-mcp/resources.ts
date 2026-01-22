/**
 * @fileoverview Agent-MCP Resources
 *
 * Resource handlers for the Agent (Inner Actual Agent) MCP layer.
 * Exposes identity, character facets, social memory, and virtual self-model.
 */

import { z } from "zod";
import type { AgentMembrane } from "deep-tree-echo-orchestrator/aar";
import type {
  CoreIdentity,
  CharacterFacets,
  SocialMemory,
  TransactionalMemory,
  VirtualAgentModel,
  AgentMCPResourceUri,
} from "../types.js";

/**
 * Agent resource definitions
 */
export const agentResources = {
  /**
   * Get core identity
   */
  "agent://identity": {
    schema: z.object({}),
    handler: (agent: AgentMembrane): CoreIdentity => {
      return agent.getIdentity();
    },
  },

  /**
   * Get character facets with activations
   */
  "agent://facets": {
    schema: z.object({}),
    handler: (agent: AgentMembrane): CharacterFacets => {
      return agent.getState().facets;
    },
  },

  /**
   * Get social memory for a specific contact
   */
  "agent://social/{contactId}": {
    schema: z.object({ contactId: z.string() }),
    handler: (
      agent: AgentMembrane,
      params: { contactId: string },
    ): SocialMemory | null => {
      return agent.getSocialMemory(params.contactId) || null;
    },
  },

  /**
   * Get all transactional memories
   */
  "agent://transactions": {
    schema: z.object({
      status: z
        .enum(["pending", "fulfilled", "deferred", "cancelled", "all"])
        .optional(),
      limit: z.number().optional().default(50),
    }),
    handler: (
      agent: AgentMembrane,
      params: { status?: string; limit?: number },
    ): TransactionalMemory[] => {
      let transactions = agent.getState().transactionalMemory;

      if (params.status && params.status !== "all") {
        transactions = transactions.filter((t) => t.status === params.status);
      }

      return transactions.slice(0, params.limit || 50);
    },
  },

  /**
   * Get virtual self-model (Vi in the inverted mirror)
   */
  "agent://self": {
    schema: z.object({}),
    handler: (
      _agent: AgentMembrane,
      _params: Record<string, never>,
      virtualAgent: VirtualAgentModel,
    ): VirtualAgentModel => {
      return virtualAgent;
    },
  },
};

/**
 * Match resource URI to handler
 */
export function matchAgentResourceUri(
  uri: string,
): { pattern: AgentMCPResourceUri; params: Record<string, string> } | null {
  // Match agent://social/{contactId}
  const socialMatch = uri.match(/^agent:\/\/social\/(.+)$/);
  if (socialMatch) {
    return {
      pattern: `agent://social/${socialMatch[1]}` as AgentMCPResourceUri,
      params: { contactId: socialMatch[1] },
    };
  }

  // Match static resources
  if (
    uri === "agent://identity" ||
    uri === "agent://facets" ||
    uri === "agent://transactions" ||
    uri === "agent://self"
  ) {
    return { pattern: uri as AgentMCPResourceUri, params: {} };
  }

  return null;
}

/**
 * List all available agent resources
 */
export function listAgentResources(
  agent: AgentMembrane,
): Array<{ uri: string; name: string; description: string }> {
  const state = agent.getState();
  const socialContacts = Array.from(state.socialMemory.keys());

  const resources = [
    {
      uri: "agent://identity",
      name: "Core Identity",
      description: "The fundamental identity essence of this agent",
    },
    {
      uri: "agent://facets",
      name: "Character Facets",
      description: `8 character facets, dominant: ${state.dominantFacet}`,
    },
    {
      uri: "agent://transactions",
      name: "Transactional Memory",
      description: `${state.transactionalMemory.length} tracked transactions`,
    },
    {
      uri: "agent://self",
      name: "Virtual Self-Model",
      description: "The agent's model of itself (Vi in inverted mirror)",
    },
  ];

  // Add social memory resources
  for (const contactId of socialContacts) {
    const social = state.socialMemory.get(contactId);
    if (social) {
      resources.push({
        uri: `agent://social/${contactId}`,
        name: `Social: ${social.name}`,
        description: `${social.relationship} (trust: ${(
          social.trustLevel * 100
        ).toFixed(0)}%)`,
      });
    }
  }

  return resources;
}

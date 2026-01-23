/**
 * @fileoverview Arena-MCP Resources
 *
 * Resource handlers for the Arena (Outer Actual World) MCP layer.
 * Exposes session frames, narrative phases, Yggdrasil reservoir, and agent references.
 */

import { z } from "zod";
import type { ArenaMembrane } from "deep-tree-echo-orchestrator/aar";
import type {
  SessionFrame,
  NarrativePhases,
  LoreEntry,
  AgentReference,
  ArenaMCPResourceUri,
} from "../types.js";

/**
 * Arena resource definitions for MCP
 */
export const arenaResources = {
  /**
   * Get a specific session frame by ID
   */
  "arena://frames/{frameId}": {
    schema: z.object({ frameId: z.string() }),
    handler: (
      arena: ArenaMembrane,
      params: { frameId: string },
    ): SessionFrame | null => {
      const frames = arena.getActiveFrames();
      return frames.find((f) => f.frameId === params.frameId) || null;
    },
  },

  /**
   * Get all narrative phases and their current intensities
   */
  "arena://phases": {
    schema: z.object({}),
    handler: (arena: ArenaMembrane): NarrativePhases => {
      return arena.getState().phases;
    },
  },

  /**
   * Get the Yggdrasil reservoir (accumulated lore)
   */
  "arena://reservoir": {
    schema: z.object({
      limit: z.number().optional().default(100),
      category: z.string().optional(),
    }),
    handler: (
      arena: ArenaMembrane,
      params: { limit?: number; category?: string },
    ): LoreEntry[] => {
      let reservoir = arena.getState().yggdrasilReservoir;

      if (params.category) {
        reservoir = reservoir.filter((l) => l.category === params.category);
      }

      return reservoir.slice(0, params.limit || 100);
    },
  },

  /**
   * Get all registered agents in this arena
   */
  "arena://agents": {
    schema: z.object({}),
    handler: (
      _arena: ArenaMembrane,
      _params: Record<string, never>,
      agentRegistry: Map<string, AgentReference>,
    ): AgentReference[] => {
      return Array.from(agentRegistry.values());
    },
  },

  /**
   * Get global story threads
   */
  "arena://threads": {
    schema: z.object({}),
    handler: (arena: ArenaMembrane): string[] => {
      return arena.getState().globalThreads;
    },
  },
};

/**
 * Resource URI template matcher
 */
export function matchResourceUri(
  uri: string,
): { pattern: ArenaMCPResourceUri; params: Record<string, string> } | null {
  // Match arena://frames/{frameId}
  const frameMatch = uri.match(/^arena:\/\/frames\/(.+)$/);
  if (frameMatch) {
    return {
      pattern: `arena://frames/${frameMatch[1]}` as ArenaMCPResourceUri,
      params: { frameId: frameMatch[1] },
    };
  }

  // Match static resources
  if (
    uri === "arena://phases" ||
    uri === "arena://reservoir" ||
    uri === "arena://agents" ||
    uri === "arena://threads"
  ) {
    return { pattern: uri as ArenaMCPResourceUri, params: {} };
  }

  return null;
}

/**
 * List all available arena resources
 */
export function listArenaResources(
  arena: ArenaMembrane,
  agentRegistry: Map<string, AgentReference>,
): Array<{ uri: string; name: string; description: string }> {
  const frames = arena.getActiveFrames();

  const resources = [
    {
      uri: "arena://phases",
      name: "Narrative Phases",
      description: "Current narrative phase intensities (9-phase cycle)",
    },
    {
      uri: "arena://reservoir",
      name: "Yggdrasil Reservoir",
      description: "Accumulated lore and wisdom",
    },
    {
      uri: "arena://agents",
      name: "Registered Agents",
      description: `Active agents in this arena (${agentRegistry.size})`,
    },
    {
      uri: "arena://threads",
      name: "Global Threads",
      description: "Story threads spanning all sessions",
    },
  ];

  // Add frame resources
  for (const frame of frames) {
    resources.push({
      uri: `arena://frames/${frame.frameId}`,
      name: `Frame: ${frame.title}`,
      description: `Session frame (${frame.messageCount} messages, ${frame.status})`,
    });
  }

  return resources;
}

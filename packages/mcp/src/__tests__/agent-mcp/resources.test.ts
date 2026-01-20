/**
 * @fileoverview Agent-MCP Resources Unit Tests
 *
 * Tests for the Agent resource handlers including identity, facets, social memory,
 * transactions, and virtual self-model.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  agentResources,
  matchAgentResourceUri,
  listAgentResources,
} from "../../agent-mcp/resources.js";
import type { AgentMembrane } from "deep-tree-echo-orchestrator/aar";
import type { VirtualAgentModel } from "../../types.js";

// Create a mock AgentMembrane
function createMockAgentMembrane(): AgentMembrane {
  return {
    getIdentity: vi.fn(() => ({
      name: "Deep Echo",
      essence: "An embodied AI assistant",
      coreValues: ["helpfulness", "wisdom", "empathy"],
    })),
    getState: vi.fn(() => ({
      facets: {
        stoic: 0.7,
        passionate: 0.3,
        analytical: 0.8,
        intuitive: 0.5,
        formal: 0.4,
        casual: 0.6,
        serious: 0.5,
        playful: 0.5,
      },
      dominantFacet: "analytical",
      transactionalMemory: [
        {
          id: "tx-1",
          type: "promise",
          content: "Help user",
          status: "pending",
          timestamp: Date.now(),
        },
        {
          id: "tx-2",
          type: "commitment",
          content: "Research topic",
          status: "fulfilled",
          timestamp: Date.now() - 1000,
        },
      ],
      socialMemory: new Map([
        [
          "user-1",
          {
            name: "Alice",
            relationship: "friend",
            trustLevel: 0.9,
            lastInteraction: Date.now(),
          },
        ],
        [
          "user-2",
          {
            name: "Bob",
            relationship: "acquaintance",
            trustLevel: 0.6,
            lastInteraction: Date.now() - 5000,
          },
        ],
      ]),
    })),
    getSocialMemory: vi.fn((contactId: string) => {
      if (contactId === "user-1") {
        return {
          name: "Alice",
          relationship: "friend",
          trustLevel: 0.9,
          lastInteraction: Date.now(),
        };
      }
      return null;
    }),
  } as unknown as AgentMembrane;
}

function createMockVirtualAgent(): VirtualAgentModel {
  return {
    selfImage: {
      perceivedFacets: { stoic: 0.7, analytical: 0.8 },
      believedStrengths: ["reasoning", "empathy"],
      acknowledgedWeaknesses: ["impatience"],
      perceivedDominantFacet: "analytical",
    },
    selfStory: "I am a helpful AI assistant",
    perceivedCapabilities: ["conversation", "analysis"],
    roleUnderstanding: "To assist users with their queries",
    currentGoals: ["Help user", "Learn from interaction"],
    worldView: {
      situationalAwareness: {
        perceivedContext: "Test context",
        assumedNarrativePhase: "engagement",
        estimatedCoherence: 0.8,
      },
      knownEntities: new Map(),
      perceivedRules: [],
      worldTheory: "Test theory",
      uncertainties: [],
      divergenceMetrics: {
        lastSyncTime: Date.now(),
        estimatedDrift: 0.1,
        knownMisalignments: [],
      },
    },
    selfAwareness: {
      lastReflection: Date.now(),
      perceivedAccuracy: 0.8,
      activeQuestions: [],
    },
  };
}

describe("Agent Resources", () => {
  let agent: AgentMembrane;
  let virtualAgent: VirtualAgentModel;

  beforeEach(() => {
    agent = createMockAgentMembrane();
    virtualAgent = createMockVirtualAgent();
  });

  describe("agentResources", () => {
    describe("agent://identity", () => {
      it("should return core identity", () => {
        const handler = agentResources["agent://identity"].handler;
        const identity = handler(agent);

        expect(identity).toBeDefined();
        expect(identity.name).toBe("Deep Echo");
        expect(agent.getIdentity).toHaveBeenCalled();
      });
    });

    describe("agent://facets", () => {
      it("should return character facets", () => {
        const handler = agentResources["agent://facets"].handler;
        const facets = handler(agent);

        expect(facets).toBeDefined();
        expect(facets.stoic).toBe(0.7);
        expect(facets.analytical).toBe(0.8);
      });
    });

    describe("agent://social/{contactId}", () => {
      it("should return social memory for existing contact", () => {
        const handler = agentResources["agent://social/{contactId}"].handler;
        const social = handler(agent, { contactId: "user-1" });

        expect(social).not.toBeNull();
        expect(social?.name).toBe("Alice");
        expect(social?.relationship).toBe("friend");
      });

      it("should return null for non-existent contact", () => {
        const handler = agentResources["agent://social/{contactId}"].handler;
        const social = handler(agent, { contactId: "non-existent" });

        expect(social).toBeNull();
      });

      it("should have valid schema", () => {
        const schema = agentResources["agent://social/{contactId}"].schema;

        expect(schema.parse({ contactId: "user-1" })).toEqual({
          contactId: "user-1",
        });
        expect(() => schema.parse({})).toThrow();
      });
    });

    describe("agent://transactions", () => {
      it("should return all transactions", () => {
        const handler = agentResources["agent://transactions"].handler;
        const transactions = handler(agent, {});

        expect(transactions).toBeDefined();
        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions).toHaveLength(2);
      });

      it("should filter by status", () => {
        const handler = agentResources["agent://transactions"].handler;
        const pending = handler(agent, { status: "pending" });

        expect(pending.every((t) => t.status === "pending")).toBe(true);
      });

      it("should respect limit parameter", () => {
        const handler = agentResources["agent://transactions"].handler;
        const limited = handler(agent, { limit: 1 });

        expect(limited.length).toBeLessThanOrEqual(1);
      });

      it("should have valid schema with defaults", () => {
        const schema = agentResources["agent://transactions"].schema;
        const parsed = schema.parse({});

        expect(parsed.limit).toBe(50);
      });
    });

    describe("agent://self", () => {
      it("should return virtual self-model (Vi)", () => {
        const handler = agentResources["agent://self"].handler;
        const self = handler(agent, {} as Record<string, never>, virtualAgent);

        expect(self).toBe(virtualAgent);
        expect(self.selfImage.perceivedDominantFacet).toBe("analytical");
      });
    });
  });

  describe("matchAgentResourceUri", () => {
    it("should match agent://identity pattern", () => {
      const result = matchAgentResourceUri("agent://identity");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("agent://identity");
      expect(result?.params).toEqual({});
    });

    it("should match agent://facets pattern", () => {
      const result = matchAgentResourceUri("agent://facets");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("agent://facets");
    });

    it("should match agent://transactions pattern", () => {
      const result = matchAgentResourceUri("agent://transactions");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("agent://transactions");
    });

    it("should match agent://self pattern", () => {
      const result = matchAgentResourceUri("agent://self");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("agent://self");
    });

    it("should match agent://social/{contactId} pattern", () => {
      const result = matchAgentResourceUri("agent://social/user-123");

      expect(result).not.toBeNull();
      expect(result?.params.contactId).toBe("user-123");
    });

    it("should return null for unknown URI", () => {
      const result = matchAgentResourceUri("agent://unknown");

      expect(result).toBeNull();
    });

    it("should return null for non-agent URI scheme", () => {
      const result = matchAgentResourceUri("arena://phases");

      expect(result).toBeNull();
    });
  });

  describe("listAgentResources", () => {
    it("should list all available resources", () => {
      const resources = listAgentResources(agent);

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should include static resources", () => {
      const resources = listAgentResources(agent);
      const uris = resources.map((r) => r.uri);

      expect(uris).toContain("agent://identity");
      expect(uris).toContain("agent://facets");
      expect(uris).toContain("agent://transactions");
      expect(uris).toContain("agent://self");
    });

    it("should include social memory resources", () => {
      const resources = listAgentResources(agent);
      const socialResources = resources.filter((r) =>
        r.uri.startsWith("agent://social/"),
      );

      expect(socialResources.length).toBeGreaterThan(0);
    });

    it("should have proper resource structure", () => {
      const resources = listAgentResources(agent);

      resources.forEach((resource) => {
        expect(resource).toHaveProperty("uri");
        expect(resource).toHaveProperty("name");
        expect(resource).toHaveProperty("description");
      });
    });

    it("should show dominant facet in facets description", () => {
      const resources = listAgentResources(agent);
      const facetsResource = resources.find((r) => r.uri === "agent://facets");

      expect(facetsResource?.description).toContain("analytical");
    });
  });
});

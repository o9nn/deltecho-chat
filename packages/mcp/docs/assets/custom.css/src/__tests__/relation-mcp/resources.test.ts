/**
 * @fileoverview Relation-MCP Resources Unit Tests
 *
 * Tests for the Relation resource handlers including self-reflection,
 * cognitive flows, emergent identity, coherence, and virtual models.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  relationResources,
  matchRelationResourceUri,
  listRelationResources,
} from "../../relation-mcp/resources.js";
import type { RelationInterface } from "deep-tree-echo-orchestrator/aar";
import type { VirtualAgentModel } from "../../types.js";

// Create a mock RelationInterface
function createMockRelation(): RelationInterface {
  return {
    getSelfReflection: vi.fn(() => ({
      selfNarrative: "I am a thoughtful AI assistant",
      perceivedRole: "Helper and guide",
      growthDirection: "Towards deeper understanding",
      lastReflection: Date.now(),
    })),
    getRecentFlows: vi.fn(() => [
      {
        direction: "agent-to-arena",
        content: "Response generated",
        timestamp: Date.now(),
      },
      {
        direction: "arena-to-agent",
        content: "Context absorbed",
        timestamp: Date.now() - 100,
      },
      {
        direction: "bidirectional",
        content: "Synthesis complete",
        timestamp: Date.now() - 200,
      },
    ]),
    getEmergentIdentity: vi.fn(() => ({
      synthesisNarrative: "A coherent AI assistant",
      coherence: 0.85,
      dominantFlow: "analytical",
      activeThemes: ["helpfulness", "curiosity"],
    })),
    getCoherence: vi.fn(() => 0.82),
    getState: vi.fn(() => ({
      recentFlows: [
        { direction: "agent-to-arena", content: "Test", timestamp: Date.now() },
      ],
    })),
  } as unknown as RelationInterface;
}

function createMockVirtualAgent(): VirtualAgentModel {
  return {
    selfImage: {
      perceivedFacets: { stoic: 0.7, analytical: 0.8 },
      believedStrengths: ["reasoning", "empathy"],
      acknowledgedWeaknesses: ["occasional uncertainty"],
      perceivedDominantFacet: "analytical",
    },
    selfStory: "I am an AI companion who values genuine connection",
    perceivedCapabilities: ["conversation", "analysis", "guidance"],
    roleUnderstanding: "To assist and enlighten",
    currentGoals: ["Help user", "Grow in wisdom"],
    worldView: {
      situationalAwareness: {
        perceivedContext: "Active conversation",
        assumedNarrativePhase: "engagement",
        estimatedCoherence: 0.8,
      },
      knownEntities: new Map(),
      perceivedRules: ["Be helpful", "Be genuine"],
      worldTheory: "Understanding emerges through dialogue",
      uncertainties: ["What the user truly needs"],
      divergenceMetrics: {
        lastSyncTime: Date.now(),
        estimatedDrift: 0.1,
        knownMisalignments: [],
      },
    },
    selfAwareness: {
      lastReflection: Date.now(),
      perceivedAccuracy: 0.75,
      activeQuestions: ["How can I be more helpful?"],
    },
  };
}

describe("Relation Resources", () => {
  let relation: RelationInterface;
  let virtualAgent: VirtualAgentModel;

  beforeEach(() => {
    relation = createMockRelation();
    virtualAgent = createMockVirtualAgent();
  });

  describe("relationResources", () => {
    describe("relation://self-reflection", () => {
      it("should return self-reflection state", () => {
        const handler = relationResources["relation://self-reflection"].handler;
        const reflection = handler(relation);

        expect(reflection).toBeDefined();
        expect(reflection.selfNarrative).toBe("I am a thoughtful AI assistant");
        expect(relation.getSelfReflection).toHaveBeenCalled();
      });
    });

    describe("relation://flows", () => {
      it("should return cognitive flows", () => {
        const handler = relationResources["relation://flows"].handler;
        const flows = handler(relation, {});

        expect(flows).toBeDefined();
        expect(Array.isArray(flows)).toBe(true);
        expect(flows).toHaveLength(3);
      });

      it("should filter by direction", () => {
        const handler = relationResources["relation://flows"].handler;

        const agentFlows = handler(relation, { direction: "agent-to-arena" });
        expect(agentFlows.every((f) => f.direction === "agent-to-arena")).toBe(
          true,
        );
      });

      it("should respect limit parameter", () => {
        const handler = relationResources["relation://flows"].handler;
        const limited = handler(relation, { limit: 1 });

        expect(limited.length).toBeLessThanOrEqual(1);
      });

      it("should have valid schema with defaults", () => {
        const schema = relationResources["relation://flows"].schema;
        const parsed = schema.parse({});

        expect(parsed.limit).toBe(50);
      });
    });

    describe("relation://identity", () => {
      it("should return emergent identity", () => {
        const handler = relationResources["relation://identity"].handler;
        const identity = handler(relation);

        expect(identity).toBeDefined();
        expect(identity.coherence).toBe(0.85);
        expect(identity.activeThemes).toContain("helpfulness");
      });
    });

    describe("relation://coherence", () => {
      it("should return coherence metric", () => {
        const handler = relationResources["relation://coherence"].handler;
        const coherence = handler(relation);

        expect(coherence).toBe(0.82);
        expect(relation.getCoherence).toHaveBeenCalled();
      });
    });

    describe("relation://virtual-agent", () => {
      it("should return virtual agent model (Vi)", () => {
        const handler = relationResources["relation://virtual-agent"].handler;
        const vi = handler(relation, {} as Record<string, never>, virtualAgent);

        expect(vi).toBe(virtualAgent);
        expect(vi.selfImage.perceivedDominantFacet).toBe("analytical");
      });
    });

    describe("relation://virtual-arena", () => {
      it("should return virtual arena model (Vo) from inside Vi", () => {
        const handler = relationResources["relation://virtual-arena"].handler;
        const vo = handler(relation, {} as Record<string, never>, virtualAgent);

        // Vo is inside Vi - the inverted mirror!
        expect(vo).toBe(virtualAgent.worldView);
        expect(vo.worldTheory).toBe("Understanding emerges through dialogue");
      });

      it("should demonstrate inverted mirror structure", () => {
        const handler = relationResources["relation://virtual-arena"].handler;
        const vo = handler(relation, {} as Record<string, never>, virtualAgent);

        // Verify that we're accessing Vo through Vi (inverted mirror)
        expect(virtualAgent.worldView).toBe(vo);
        expect(vo.situationalAwareness.perceivedContext).toBe(
          "Active conversation",
        );
      });
    });
  });

  describe("matchRelationResourceUri", () => {
    it("should match relation://self-reflection pattern", () => {
      const result = matchRelationResourceUri("relation://self-reflection");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("relation://self-reflection");
      expect(result?.params).toEqual({});
    });

    it("should match relation://flows pattern", () => {
      const result = matchRelationResourceUri("relation://flows");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("relation://flows");
    });

    it("should match relation://identity pattern", () => {
      const result = matchRelationResourceUri("relation://identity");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("relation://identity");
    });

    it("should match relation://coherence pattern", () => {
      const result = matchRelationResourceUri("relation://coherence");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("relation://coherence");
    });

    it("should match relation://virtual-agent pattern", () => {
      const result = matchRelationResourceUri("relation://virtual-agent");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("relation://virtual-agent");
    });

    it("should match relation://virtual-arena pattern", () => {
      const result = matchRelationResourceUri("relation://virtual-arena");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("relation://virtual-arena");
    });

    it("should return null for unknown URI", () => {
      const result = matchRelationResourceUri("relation://unknown");

      expect(result).toBeNull();
    });

    it("should return null for non-relation URI scheme", () => {
      const result = matchRelationResourceUri("agent://identity");

      expect(result).toBeNull();
    });
  });

  describe("listRelationResources", () => {
    it("should list all available resources", () => {
      const resources = listRelationResources(relation);

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBe(6);
    });

    it("should include all relation resources", () => {
      const resources = listRelationResources(relation);
      const uris = resources.map((r) => r.uri);

      expect(uris).toContain("relation://self-reflection");
      expect(uris).toContain("relation://flows");
      expect(uris).toContain("relation://identity");
      expect(uris).toContain("relation://coherence");
      expect(uris).toContain("relation://virtual-agent");
      expect(uris).toContain("relation://virtual-arena");
    });

    it("should have proper resource structure", () => {
      const resources = listRelationResources(relation);

      resources.forEach((resource) => {
        expect(resource).toHaveProperty("uri");
        expect(resource).toHaveProperty("name");
        expect(resource).toHaveProperty("description");
      });
    });

    it("should show coherence percentage in identity description", () => {
      const resources = listRelationResources(relation);
      const identityResource = resources.find(
        (r) => r.uri === "relation://identity",
      );

      expect(identityResource?.description).toContain("85%");
    });

    it("should reference inverted mirror in virtual-arena description", () => {
      const resources = listRelationResources(relation);
      const voResource = resources.find(
        (r) => r.uri === "relation://virtual-arena",
      );

      expect(voResource?.description.toLowerCase()).toMatch(/mirror|inverted/);
    });
  });
});

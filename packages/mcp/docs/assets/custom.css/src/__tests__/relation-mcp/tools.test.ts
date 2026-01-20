/**
 * @fileoverview Relation-MCP Tools Unit Tests
 *
 * Tests for the Relation tool handlers including synthesis, reflection,
 * bridging, developmental integration, and divergence measurement.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  relationToolSchemas,
  createRelationTools,
  listRelationTools,
} from "../../relation-mcp/tools.js";
import type {
  RelationInterface,
  AgentMembrane,
  ArenaMembrane,
} from "deep-tree-echo-orchestrator/aar";
import type { VirtualAgentModel } from "../../types.js";

// Create mock interfaces
function createMockRelation(): RelationInterface {
  return {
    getSelfReflection: vi.fn(() => ({
      selfNarrative: "I am a thoughtful assistant",
      perceivedRole: "Helper",
      activeQuestions: ["How can I improve?"],
    })),
    getRecentFlows: vi.fn(() => []),
    getEmergentIdentity: vi.fn(() => ({
      synthesisNarrative: "Coherent self",
      coherence: 0.85,
      tensions: [],
    })),
    getCoherence: vi.fn(() => 0.85),
    getState: vi.fn(() => ({
      recentFlows: [],
    })),
    synthesize: vi.fn((agentState, arenaState) => undefined),
    reflectOnInteractions: vi.fn((interactions) => [
      "Insight 1",
      "Insight 2",
      "Insight 3",
    ]),
    createFlow: vi.fn((direction, contentType, content, intensity) => ({
      id: "flow-1",
      direction,
      contentType,
      content,
      intensity: intensity ?? 0.5,
      timestamp: Date.now(),
    })),
    integrate: vi.fn((phase) => ({
      cycleNumber: 1,
      phase,
      stateChanges: {},
      coherenceAfter: 0.87,
      timestamp: Date.now(),
    })),
    updateSelfReflection: vi.fn(),
    addInsight: vi.fn(),
  } as unknown as RelationInterface;
}

function createMockAgent(): AgentMembrane {
  return {
    getIdentity: vi.fn(() => ({ name: "Deep Echo" })),
    getState: vi.fn(() => ({
      facets: { stoic: 0.7, analytical: 0.8 },
      dominantFacet: "analytical",
    })),
  } as unknown as AgentMembrane;
}

function createMockArena(): ArenaMembrane {
  return {
    getState: vi.fn(() => ({
      phases: { engagement: { intensity: 0.8 } },
      coherence: 0.75,
    })),
  } as unknown as ArenaMembrane;
}

function createMockVirtualAgent(): VirtualAgentModel {
  return {
    selfImage: {
      perceivedFacets: { stoic: 0.7, analytical: 0.8 },
      believedStrengths: ["reasoning"],
      acknowledgedWeaknesses: [],
      perceivedDominantFacet: "analytical",
    },
    selfStory: "I am a helpful assistant",
    perceivedCapabilities: ["conversation"],
    roleUnderstanding: "To assist users",
    currentGoals: ["Help user"],
    worldView: {
      situationalAwareness: {
        perceivedContext: "Active conversation",
        assumedNarrativePhase: "engagement",
        estimatedCoherence: 0.8,
      },
      knownEntities: new Map(),
      perceivedRules: [],
      worldTheory: "Understanding through dialogue",
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

describe("Relation Tool Schemas", () => {
  describe("synthesize schema", () => {
    it("should validate synthesis input", () => {
      const input = { force: true };
      const result = relationToolSchemas.synthesize.parse(input);
      expect(result.force).toBe(true);
    });

    it("should default force to false", () => {
      const input = {};
      const result = relationToolSchemas.synthesize.parse(input);
      expect(result.force).toBe(false);
    });
  });

  describe("reflect schema", () => {
    it("should validate reflection input", () => {
      const input = {
        interactions: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      };
      const result = relationToolSchemas.reflect.parse(input);
      expect(result.interactions).toHaveLength(2);
    });
  });

  describe("bridge schema", () => {
    it("should validate bridge input", () => {
      const input = {
        direction: "agent-to-arena",
        contentType: "experience",
        content: "Test content",
      };
      const result = relationToolSchemas.bridge.parse(input);
      expect(result.direction).toBe("agent-to-arena");
    });

    it("should validate all direction types", () => {
      const directions = ["agent-to-arena", "arena-to-agent", "bidirectional"];
      directions.forEach((direction) => {
        const result = relationToolSchemas.bridge.parse({
          direction,
          contentType: "insight",
          content: "Test",
        });
        expect(result.direction).toBe(direction);
      });
    });
  });

  describe("integrate schema", () => {
    it("should validate integration input", () => {
      const input = { phase: "perception" };
      const result = relationToolSchemas.integrate.parse(input);
      expect(result.phase).toBe("perception");
    });

    it("should validate all developmental phases", () => {
      const phases = [
        "perception",
        "modeling",
        "reflection",
        "mirroring",
        "enaction",
      ];
      phases.forEach((phase) => {
        const result = relationToolSchemas.integrate.parse({ phase });
        expect(result.phase).toBe(phase);
      });
    });
  });

  describe("updateSelfNarrative schema", () => {
    it("should validate self-narrative update input", () => {
      const input = {
        narrative: "I have grown wiser",
        perceivedRole: "Guide",
        growthDirection: "Towards wisdom",
      };
      const result = relationToolSchemas.updateSelfNarrative.parse(input);
      expect(result.narrative).toBe("I have grown wiser");
    });
  });

  describe("addInsight schema", () => {
    it("should validate insight input", () => {
      const input = {
        insight: "Users appreciate direct answers",
        source: "reflection",
      };
      const result = relationToolSchemas.addInsight.parse(input);
      expect(result.source).toBe("reflection");
    });

    it("should validate all insight sources", () => {
      const sources = ["reflection", "interaction", "synthesis", "external"];
      sources.forEach((source) => {
        const result = relationToolSchemas.addInsight.parse({
          insight: "Test",
          source,
        });
        expect(result.source).toBe(source);
      });
    });
  });

  describe("updateVirtualArena schema", () => {
    it("should validate virtual arena update input", () => {
      const input = {
        perceivedContext: "New context",
        worldTheory: "New theory",
        uncertainties: ["Unknown factor"],
      };
      const result = relationToolSchemas.updateVirtualArena.parse(input);
      expect(result.perceivedContext).toBe("New context");
    });
  });

  describe("measureDivergence schema", () => {
    it("should accept empty input", () => {
      const result = relationToolSchemas.measureDivergence.parse({});
      expect(result).toEqual({});
    });
  });
});

describe("Relation Tools", () => {
  let relation: RelationInterface;
  let agent: AgentMembrane;
  let arena: ArenaMembrane;
  let virtualAgent: VirtualAgentModel;
  let tools: ReturnType<typeof createRelationTools>;

  beforeEach(() => {
    relation = createMockRelation();
    agent = createMockAgent();
    arena = createMockArena();
    virtualAgent = createMockVirtualAgent();
    tools = createRelationTools(
      relation,
      () => agent,
      () => arena,
      () => virtualAgent,
      (update) => Object.assign(virtualAgent, update),
    );
  });

  describe("synthesize", () => {
    it("should synthesize Agent and Arena states", () => {
      const result = tools.synthesize({ force: false });

      expect(result).toBeDefined();
      expect(result.coherence).toBe(0.85);
      expect(relation.synthesize).toHaveBeenCalled();
    });

    it("should force synthesis when specified", () => {
      tools.synthesize({ force: true });

      expect(relation.synthesize).toHaveBeenCalled();
    });
  });

  describe("reflect", () => {
    it("should reflect on interactions", () => {
      const result = tools.reflect({
        interactions: [
          { role: "user", content: "How are you?" },
          { role: "assistant", content: "I am doing well" },
        ],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(relation.reflectOnInteractions).toHaveBeenCalled();
    });
  });

  describe("bridge", () => {
    it("should bridge content from agent to arena", () => {
      const result = tools.bridge({
        direction: "agent-to-arena",
        contentType: "experience",
        content: "Agent perspective",
      });

      expect(result).toBeDefined();
      expect(result.direction).toBe("agent-to-arena");
      expect(relation.createFlow).toHaveBeenCalled();
    });

    it("should bridge content bidirectionally", () => {
      const result = tools.bridge({
        direction: "bidirectional",
        contentType: "insight",
        content: "Shared understanding",
      });

      expect(result.direction).toBe("bidirectional");
    });
  });

  describe("integrate", () => {
    it("should execute developmental integration phases", () => {
      const result = tools.integrate({ phase: "perception" });

      expect(result).toBeDefined();
      expect(result.phase).toBe("perception");
      // integrate doesn't call the mock directly - it performs phase-specific logic
    });

    it("should return developmental cycle result", () => {
      const result = tools.integrate({ phase: "modeling" });

      expect(result.cycleNumber).toBeDefined();
      expect(result.coherenceAfter).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("updateSelfNarrative", () => {
    it("should update the self-narrative", () => {
      tools.updateSelfNarrative({
        narrative: "I have become wiser through experience",
        perceivedRole: "Guide and mentor",
      });

      expect(relation.updateSelfReflection).toHaveBeenCalled();
    });
  });

  describe("addInsight", () => {
    it("should add a new insight", () => {
      tools.addInsight({
        insight: "Patience leads to better outcomes",
        source: "reflection",
      });

      expect(relation.addInsight).toHaveBeenCalled();
    });
  });

  describe("updateVirtualArena", () => {
    it("should update the virtual arena (Vo)", () => {
      const result = tools.updateVirtualArena({
        perceivedContext: "Changed context",
        worldTheory: "Updated theory",
      });

      expect(result).toBeDefined();
      expect(result.situationalAwareness.perceivedContext).toBe(
        "Changed context",
      );
      expect(result.worldTheory).toBe("Updated theory");
    });
  });

  describe("measureDivergence", () => {
    it("should measure divergence between Actual and Virtual", () => {
      const result = tools.measureDivergence({});

      expect(result).toBeDefined();
      expect(typeof result.agentDivergence).toBe("number");
      expect(typeof result.arenaDivergence).toBe("number");
      expect(typeof result.overallDivergence).toBe("number");
      expect(Array.isArray(result.misalignments)).toBe(true);
    });
  });
});

describe("listRelationTools", () => {
  it("should list all available tools", () => {
    const tools = listRelationTools();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("should include expected tools", () => {
    const tools = listRelationTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain("synthesize");
    expect(toolNames).toContain("reflect");
    expect(toolNames).toContain("bridge");
    expect(toolNames).toContain("integrate");
    expect(toolNames).toContain("updateSelfNarrative");
    expect(toolNames).toContain("addInsight");
    expect(toolNames).toContain("updateVirtualArena");
    expect(toolNames).toContain("measureDivergence");
  });

  it("should have proper tool structure", () => {
    const tools = listRelationTools();

    tools.forEach((tool) => {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("schema");
    });
  });
});

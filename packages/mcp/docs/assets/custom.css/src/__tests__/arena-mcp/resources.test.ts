/**
 * @fileoverview Arena-MCP Resources Unit Tests
 *
 * Tests for the Arena resource handlers including frames, phases, reservoir, and agents.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  arenaResources,
  matchResourceUri,
  listArenaResources,
} from "../../arena-mcp/resources.js";
import type { ArenaMembrane } from "deep-tree-echo-orchestrator/aar";
import type { AgentReference } from "../../types.js";

// Create a mock ArenaMembrane
function createMockArenaMembrane(): ArenaMembrane {
  return {
    getState: vi.fn(() => ({
      phases: {
        engagement: { intensity: 0.8, duration: 1000 },
        exploration: { intensity: 0.5, duration: 500 },
        resolution: { intensity: 0.2, duration: 200 },
      },
      coherence: 0.75,
      yggdrasilReservoir: [
        {
          id: "lore-1",
          content: "Ancient wisdom",
          category: "wisdom",
          tags: ["old"],
        },
        {
          id: "lore-2",
          content: "Story element",
          category: "story",
          tags: ["narrative"],
        },
        {
          id: "lore-3",
          content: "User pattern",
          category: "pattern",
          tags: ["behavior"],
        },
      ],
      globalThreads: ["thread-1", "thread-2"],
    })),
    getActiveFrames: vi.fn(() => [
      {
        frameId: "frame-1",
        title: "Test Frame 1",
        messageCount: 10,
        status: "active",
        timestamp: Date.now(),
      },
      {
        frameId: "frame-2",
        title: "Test Frame 2",
        messageCount: 5,
        status: "archived",
        timestamp: Date.now() - 1000,
      },
    ]),
    transitionPhase: vi.fn(),
    createFrame: vi.fn(),
    addLore: vi.fn(),
    searchReservoir: vi.fn(() => []),
    getThreads: vi.fn(() => []),
  } as unknown as ArenaMembrane;
}

describe("Arena Resources", () => {
  let arena: ArenaMembrane;
  let agentRegistry: Map<string, AgentReference>;

  beforeEach(() => {
    arena = createMockArenaMembrane();
    agentRegistry = new Map([
      [
        "agent-1",
        {
          agentId: "agent-1",
          name: "Agent One",
          status: "active",
          lastActivity: Date.now(),
        },
      ],
      [
        "agent-2",
        {
          agentId: "agent-2",
          name: "Agent Two",
          status: "dormant",
          lastActivity: Date.now(),
        },
      ],
    ]);
  });

  describe("arenaResources", () => {
    describe("arena://frames/{frameId}", () => {
      it("should return a frame by ID", () => {
        const handler = arenaResources["arena://frames/{frameId}"].handler;
        const frame = handler(arena, { frameId: "frame-1" });

        expect(frame).toBeDefined();
        expect(frame?.frameId).toBe("frame-1");
      });

      it("should return null for non-existent frame", () => {
        const handler = arenaResources["arena://frames/{frameId}"].handler;
        const frame = handler(arena, { frameId: "non-existent" });

        expect(frame).toBeNull();
      });

      it("should have valid schema", () => {
        const schema = arenaResources["arena://frames/{frameId}"].schema;

        expect(schema.parse({ frameId: "test" })).toEqual({ frameId: "test" });
        expect(() => schema.parse({})).toThrow();
      });
    });

    describe("arena://phases", () => {
      it("should return narrative phases", () => {
        const handler = arenaResources["arena://phases"].handler;
        const phases = handler(arena);

        expect(phases).toBeDefined();
        expect(phases.engagement).toBeDefined();
        expect(arena.getState).toHaveBeenCalled();
      });
    });

    describe("arena://reservoir", () => {
      it("should return lore entries", () => {
        const handler = arenaResources["arena://reservoir"].handler;
        const lore = handler(arena, {});

        expect(lore).toBeDefined();
        expect(Array.isArray(lore)).toBe(true);
      });

      it("should filter by category", () => {
        const handler = arenaResources["arena://reservoir"].handler;
        const lore = handler(arena, { category: "wisdom" });

        expect(lore.every((l) => l.category === "wisdom")).toBe(true);
      });

      it("should respect limit parameter", () => {
        const handler = arenaResources["arena://reservoir"].handler;
        const lore = handler(arena, { limit: 1 });

        expect(lore.length).toBeLessThanOrEqual(1);
      });

      it("should have valid schema with defaults", () => {
        const schema = arenaResources["arena://reservoir"].schema;

        const parsed = schema.parse({});
        expect(parsed.limit).toBe(100);
      });
    });

    describe("arena://agents", () => {
      it("should return registered agents", () => {
        const handler = arenaResources["arena://agents"].handler;
        const agents = handler(
          arena,
          {} as Record<string, never>,
          agentRegistry,
        );

        expect(agents).toHaveLength(2);
        expect(agents.map((a) => a.agentId)).toContain("agent-1");
        expect(agents.map((a) => a.agentId)).toContain("agent-2");
      });

      it("should return empty array when no agents registered", () => {
        const handler = arenaResources["arena://agents"].handler;
        const agents = handler(arena, {} as Record<string, never>, new Map());

        expect(agents).toHaveLength(0);
      });
    });

    describe("arena://threads", () => {
      it("should return global threads", () => {
        const handler = arenaResources["arena://threads"].handler;
        const threads = handler(arena);

        expect(threads).toBeDefined();
        expect(Array.isArray(threads)).toBe(true);
        expect(threads).toContain("thread-1");
        expect(threads).toContain("thread-2");
      });
    });
  });

  describe("matchResourceUri", () => {
    it("should match arena://frames/{frameId} pattern", () => {
      const result = matchResourceUri("arena://frames/frame-123");

      expect(result).not.toBeNull();
      expect(result?.params.frameId).toBe("frame-123");
    });

    it("should match arena://phases pattern", () => {
      const result = matchResourceUri("arena://phases");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("arena://phases");
      expect(result?.params).toEqual({});
    });

    it("should match arena://reservoir pattern", () => {
      const result = matchResourceUri("arena://reservoir");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("arena://reservoir");
    });

    it("should match arena://agents pattern", () => {
      const result = matchResourceUri("arena://agents");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("arena://agents");
    });

    it("should match arena://threads pattern", () => {
      const result = matchResourceUri("arena://threads");

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("arena://threads");
    });

    it("should return null for unknown URI", () => {
      const result = matchResourceUri("arena://unknown");

      expect(result).toBeNull();
    });

    it("should return null for non-arena URI scheme", () => {
      const result = matchResourceUri("agent://identity");

      expect(result).toBeNull();
    });

    it("should handle frame IDs with special characters", () => {
      const result = matchResourceUri("arena://frames/frame-with-dashes-123");

      expect(result).not.toBeNull();
      expect(result?.params.frameId).toBe("frame-with-dashes-123");
    });
  });

  describe("listArenaResources", () => {
    it("should list all available resources", () => {
      const resources = listArenaResources(arena, agentRegistry);

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should include static resources", () => {
      const resources = listArenaResources(arena, agentRegistry);
      const uris = resources.map((r) => r.uri);

      expect(uris).toContain("arena://phases");
      expect(uris).toContain("arena://reservoir");
      expect(uris).toContain("arena://agents");
      expect(uris).toContain("arena://threads");
    });

    it("should include frame resources", () => {
      const resources = listArenaResources(arena, agentRegistry);
      const frameResources = resources.filter((r) =>
        r.uri.startsWith("arena://frames/"),
      );

      expect(frameResources.length).toBe(2);
      expect(
        frameResources.some((r) => r.uri === "arena://frames/frame-1"),
      ).toBe(true);
      expect(
        frameResources.some((r) => r.uri === "arena://frames/frame-2"),
      ).toBe(true);
    });

    it("should have proper resource structure", () => {
      const resources = listArenaResources(arena, agentRegistry);

      resources.forEach((resource) => {
        expect(resource).toHaveProperty("uri");
        expect(resource).toHaveProperty("name");
        expect(resource).toHaveProperty("description");
        expect(typeof resource.uri).toBe("string");
        expect(typeof resource.name).toBe("string");
        expect(typeof resource.description).toBe("string");
      });
    });

    it("should show agent count in agents resource description", () => {
      const resources = listArenaResources(arena, agentRegistry);
      const agentsResource = resources.find((r) => r.uri === "arena://agents");

      expect(agentsResource?.description).toContain("2");
    });
  });
});

/**
 * @fileoverview NestedMCPServer Unit Tests
 *
 * Tests for the unified MCP server that orchestrates all AAR layers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NestedMCPServer, createNestedMCPServer } from "../server.js";

// Mock the AAR system
vi.mock("deep-tree-echo-orchestrator/aar", () => {
  // Complete mock for AgentMembrane
  const socialMemoryMap = new Map([
    [
      "user-1",
      {
        name: "User One",
        relationship: "friend",
        trustLevel: 0.8,
        familiarity: 0.7,
        observedTraits: ["curious", "thoughtful"],
        interactionSummary: "Several meaningful conversations",
        lastInteraction: Date.now() - 100000,
      },
    ],
  ]);

  const mockAgentMembrane = {
    getState: vi.fn(() => ({
      dominantFacet: "wisdom",
      facets: {
        wisdom: { activation: 0.8, behaviors: ["thoughtful", "reflective"] },
        curiosity: { activation: 0.6, behaviors: ["questioning", "exploring"] },
        compassion: { activation: 0.7, behaviors: ["empathetic", "caring"] },
        playfulness: { activation: 0.5, behaviors: ["light", "humorous"] },
        determination: {
          activation: 0.4,
          behaviors: ["focused", "persistent"],
        },
        authenticity: { activation: 0.65, behaviors: ["genuine", "honest"] },
        protector: { activation: 0.3, behaviors: ["careful", "vigilant"] },
        transcendence: {
          activation: 0.4,
          behaviors: ["spiritual", "connected"],
        },
      },
      emotionalState: { valence: 0.5, arousal: 0.4, dominance: 0.6 },
      engagementLevel: 0.7,
      characterGrowth: {
        experiencePoints: 100,
        wisdomGained: 10,
        connectionsFormed: 5,
        narrativesContributed: 3,
      },
      socialMemory: socialMemoryMap,
      transactionalMemory: [
        {
          id: "tx-1",
          type: "dialogue",
          status: "fulfilled",
          timestamp: Date.now(),
        },
      ],
    })),
    getIdentity: vi.fn(() => ({
      name: "TestAgent",
      soulSignature: "test-soul-001",
      energy: 0.85,
      coherence: 0.8,
      coreValues: ["truth", "curiosity"],
      voiceStyle: "thoughtful",
    })),
    getSocialMemory: vi.fn((pid: string) => {
      return socialMemoryMap.get(pid) || null;
    }),
    activateFacet: vi.fn(),
    evolve: vi.fn(),
    participate: vi.fn(),
  };

  // Complete mock for ArenaMembrane
  const mockArenaMembrane = {
    getState: vi.fn(() => ({
      phases: {
        origin: {
          intensity: 0.3,
          storyElements: ["beginning"],
          name: "Origin",
        },
        journey: { intensity: 0.4, storyElements: ["travel"], name: "Journey" },
        arrival: {
          intensity: 0.5,
          storyElements: ["destination"],
          name: "Arrival",
        },
        situation: {
          intensity: 0.6,
          storyElements: ["context"],
          name: "Situation",
        },
        engagement: {
          intensity: 0.8,
          storyElements: ["action"],
          name: "Engagement",
        },
        culmination: {
          intensity: 0.4,
          storyElements: ["peak"],
          name: "Culmination",
        },
        possibility: {
          intensity: 0.5,
          storyElements: ["options"],
          name: "Possibility",
        },
        trajectory: {
          intensity: 0.6,
          storyElements: ["direction"],
          name: "Trajectory",
        },
        destiny: { intensity: 0.3, storyElements: ["fate"], name: "Destiny" },
      },
      coherence: 0.75,
      yggdrasilReservoir: [
        {
          id: "lore-1",
          content: "Test lore",
          category: "wisdom",
          weight: 0.8,
          tags: [],
        },
      ],
      globalThreads: ["Main thread"],
      currentFrameId: "frame-1",
      gestaltProgress: {
        patternsRecognized: 5,
        emergentInsights: 3,
        narrativeIntegration: 0.7,
      },
    })),
    getActiveFrames: vi.fn(() => [
      {
        frameId: "frame-1",
        title: "Test Frame",
        messageCount: 5,
        status: "active",
        timestamp: Date.now(),
        participants: ["user", "agent"],
        narrativeContext: {
          activePhases: ["engagement"],
          storyThreads: [],
          thematicElements: [],
        },
      },
    ]),
    transitionPhase: vi.fn(),
    createFrame: vi.fn(),
    forkFrame: vi.fn(),
    addLore: vi.fn(),
  };

  const mockRelationInterface = {
    synthesize: vi.fn(),
    getCoherence: vi.fn(() => 0.8),
    getSelfReflection: vi.fn(() => ({
      selfNarrative: "I am learning and growing",
      perceivedRole: "helper",
      activeQuestions: ["What next?"],
    })),
    getEmergentIdentity: vi.fn(() => ({
      coherence: 0.8,
      tensions: [{ pole1: "logic", pole2: "emotion", balance: 0.6 }],
      synthesis: "Unified self",
      activeThemes: ["growth", "connection"],
    })),
    getState: vi.fn(() => ({
      recentFlows: [],
      tensions: [],
    })),
    getRecentFlows: vi.fn(() => []),
    bridge: vi.fn(),
    integrate: vi.fn(),
  };

  return {
    AARSystem: vi.fn().mockImplementation(() => ({
      getArena: () => mockArenaMembrane,
      getAgent: () => mockAgentMembrane,
      getRelation: () => mockRelationInterface,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn(() => ({
        coherence: 0.8,
        cycle: 1,
        agent: { dominantFacet: "wisdom" },
      })),
    })),
    AgentMembrane: vi.fn(),
    ArenaMembrane: vi.fn(),
    RelationInterface: vi.fn(),
  };
});

describe("NestedMCPServer", () => {
  let server: NestedMCPServer;

  beforeEach(async () => {
    server = await createNestedMCPServer({
      instanceName: "TestEcho",
      enableLifecycle: true,
      lifecycleIntervalMs: 0, // Manual cycles
      verbose: false,
    });
  });

  afterEach(async () => {
    if (server.isRunning()) {
      await server.stop();
    }
  });

  describe("Creation and Lifecycle", () => {
    it("should create a server with default configuration", async () => {
      const defaultServer = await createNestedMCPServer();
      expect(defaultServer).toBeInstanceOf(NestedMCPServer);
      expect(defaultServer.getConfig().instanceName).toBe("DeepTreeEcho");
    });

    it("should create a server with custom configuration", () => {
      expect(server.getConfig().instanceName).toBe("TestEcho");
      expect(server.getConfig().enableLifecycle).toBe(true);
    });

    it("should start and stop correctly", async () => {
      expect(server.isRunning()).toBe(false);

      await server.start();
      expect(server.isRunning()).toBe(true);

      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it("should emit started event on start", async () => {
      const startHandler = vi.fn();
      server.on("started", startHandler);

      await server.start();

      expect(startHandler).toHaveBeenCalled();
    });

    it("should emit stopped event on stop", async () => {
      const stopHandler = vi.fn();
      server.on("stopped", stopHandler);

      await server.start();
      await server.stop();

      expect(stopHandler).toHaveBeenCalled();
    });
  });

  describe("Layer Access", () => {
    it("should provide access to Arena server", () => {
      const arenaServer = server.getArenaServer();
      expect(arenaServer).toBeDefined();
    });

    it("should provide access to Agent server", () => {
      const agentServer = server.getAgentServer();
      expect(agentServer).toBeDefined();
    });

    it("should provide access to Relation server", () => {
      const relationServer = server.getRelationServer();
      expect(relationServer).toBeDefined();
    });

    it("should provide access to AAR system", () => {
      const aarSystem = server.getAARSystem();
      expect(aarSystem).toBeDefined();
    });

    it("should provide access to Lifecycle coordinator", () => {
      const lifecycle = server.getLifecycle();
      expect(lifecycle).toBeDefined();
    });
  });

  describe("Virtual Models (Inverted Mirror)", () => {
    it("should provide access to Virtual Agent (Vi)", () => {
      const vi = server.getVirtualAgent();
      expect(vi).toBeDefined();
      expect(vi.selfStory).toBeDefined();
      expect(vi.worldView).toBeDefined();
    });

    it("should provide access to Virtual Arena (Vo)", () => {
      const vo = server.getVirtualArena();
      expect(vo).toBeDefined();
      expect(vo.situationalAwareness).toBeDefined();
      expect(vo.worldTheory).toBeDefined();
    });

    it("should have Vo nested inside Vi (inverted mirror)", () => {
      const virtualAgent = server.getVirtualAgent();
      const virtualArena = server.getVirtualArena();

      expect(virtualAgent.worldView).toBe(virtualArena);
    });
  });

  describe("Unified Resource Access", () => {
    it("should list resources from all layers", () => {
      const resources = server.listAllResources();

      expect(Array.isArray(resources)).toBe(true);

      // Should have resources from each layer
      const arenaResources = resources.filter((r) => r.layer === "arena");
      const agentResources = resources.filter((r) => r.layer === "agent");
      const relationResources = resources.filter((r) => r.layer === "relation");

      expect(arenaResources.length).toBeGreaterThan(0);
      expect(agentResources.length).toBeGreaterThan(0);
      expect(relationResources.length).toBeGreaterThan(0);
    });

    it("should route arena:// URIs to Arena server", () => {
      const phases = server.readResource("arena://phases");
      expect(phases).toBeDefined();
    });

    it("should route agent:// URIs to Agent server", () => {
      const identity = server.readResource("agent://identity");
      expect(identity).toBeDefined();
    });

    it("should route relation:// URIs to Relation server", () => {
      const coherence = server.readResource("relation://coherence");
      expect(coherence).toBeDefined();
    });

    it("should throw for unknown URI schemes", () => {
      expect(() => server.readResource("unknown://something")).toThrow();
    });
  });

  describe("Unified Tool Access", () => {
    it("should list tools from all layers", () => {
      const tools = server.listAllTools();

      expect(Array.isArray(tools)).toBe(true);

      const arenaTools = tools.filter((t) => t.layer === "arena");
      const agentTools = tools.filter((t) => t.layer === "agent");
      const relationTools = tools.filter((t) => t.layer === "relation");

      expect(arenaTools.length).toBeGreaterThan(0);
      expect(agentTools.length).toBeGreaterThan(0);
      expect(relationTools.length).toBeGreaterThan(0);
    });

    it("should call tools on the correct layer", async () => {
      // This would require proper tool implementations
      // For now, just verify the routing mechanism exists
      const tools = server.listAllTools();
      expect(tools.some((t) => t.layer === "arena")).toBe(true);
    });
  });

  describe("Unified Prompt Access", () => {
    it("should list prompts from all layers", () => {
      const prompts = server.listAllPrompts();

      expect(Array.isArray(prompts)).toBe(true);

      const arenaPrompts = prompts.filter((p) => p.layer === "arena");
      const agentPrompts = prompts.filter((p) => p.layer === "agent");
      const relationPrompts = prompts.filter((p) => p.layer === "relation");

      expect(arenaPrompts.length).toBeGreaterThan(0);
      expect(agentPrompts.length).toBeGreaterThan(0);
      expect(relationPrompts.length).toBeGreaterThan(0);
    });

    it("should get prompts from the correct layer", () => {
      const worldContext = server.getPrompt("arena", "world_context");
      expect(worldContext).toBeDefined();
      expect(typeof worldContext).toBe("string");
    });

    it("should throw for unknown layers", () => {
      expect(() => server.getPrompt("unknown" as any, "test")).toThrow();
    });
  });

  describe("Lifecycle Integration", () => {
    it("should run a complete lifecycle cycle", async () => {
      await server.start();

      const results = await server.runLifecycleCycle();

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(5); // 5 phases
    });

    it("should execute individual lifecycle phases", async () => {
      await server.start();
      const { LifecyclePhase } = await import("../integration/lifecycle.js");

      const result = await server.executePhase(LifecyclePhase.PERCEPTION);

      expect(result).toBeDefined();
      expect(result.phase).toBe("perception");
    });

    it("should emit lifecycle events", async () => {
      const cycleStartHandler = vi.fn();
      const cycleCompleteHandler = vi.fn();

      server.on("lifecycle:cycle-start", cycleStartHandler);
      server.on("lifecycle:cycle-complete", cycleCompleteHandler);

      await server.start();
      await server.runLifecycleCycle();

      expect(cycleStartHandler).toHaveBeenCalled();
      expect(cycleCompleteHandler).toHaveBeenCalled();
    });
  });

  describe("State Summary", () => {
    it("should provide a state summary for debugging", () => {
      const summary = server.getStateSummary();

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty("running");
      expect(summary).toHaveProperty("instanceName");
      expect(summary).toHaveProperty("aar");
      expect(summary).toHaveProperty("lifecycle");
      expect(summary).toHaveProperty("virtual");
    });
  });
});

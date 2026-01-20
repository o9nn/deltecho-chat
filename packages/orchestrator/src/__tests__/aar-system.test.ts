/**
 * @fileoverview AAR (Agent-Arena-Relation) System Tests
 *
 * Unit and integration tests for the nested membrane architecture.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Mock the deep-tree-echo-core logger
jest.mock("deep-tree-echo-core", () => ({
  getLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Import after mocking
import { AARSystem, createAARSystem } from "../aar/index.js";
import { AgentMembrane } from "../aar/agent-membrane.js";
import { ArenaMembrane } from "../aar/arena-membrane.js";
import { RelationInterface } from "../aar/relation-interface.js";
import type { MessageContext } from "../aar/index.js";

describe("AAR System", () => {
  describe("AARSystem", () => {
    let system: AARSystem;

    beforeEach(() => {
      system = createAARSystem({
        instanceName: "TestEcho",
        syncIntervalMs: 100,
        verbose: false,
      });
    });

    afterEach(async () => {
      await system.stop();
    });

    it("should initialize with default configuration", () => {
      expect(system).toBeDefined();
      expect(system.isRunning()).toBe(false);
    });

    it("should start and stop correctly", async () => {
      await system.start();
      expect(system.isRunning()).toBe(true);

      await system.stop();
      expect(system.isRunning()).toBe(false);
    });

    it("should provide access to all three membranes", async () => {
      await system.start();

      const agent = system.getAgent();
      const arena = system.getArena();
      const relation = system.getRelation();

      expect(agent).toBeInstanceOf(AgentMembrane);
      expect(arena).toBeInstanceOf(ArenaMembrane);
      expect(relation).toBeInstanceOf(RelationInterface);
    });

    it("should process messages and update state", async () => {
      await system.start();

      const context: MessageContext = {
        messageId: "msg-1",
        senderId: "user-1",
        senderName: "Alice",
        chatId: "chat-1",
        content: "Hello! I am excited to learn more about this.",
        timestamp: Date.now(),
        isGroup: false,
      };

      const result = await system.processMessage(context);

      expect(result).toBeDefined();
      expect(result.agentState).toBeDefined();
      expect(result.arenaState).toBeDefined();
      expect(result.relationState).toBeDefined();
      expect(result.shouldRespond).toBe(true);
    });

    it("should generate context summary for LLM injection", async () => {
      await system.start();

      const summary = system.getContextSummary();

      expect(summary).toContain("[AAR Context]");
      expect(summary).toContain("Self-Narrative");
      expect(summary).toContain("Character");
      expect(summary).toContain("Emotional State");
    });

    it("should maintain state coherence across cycles", async () => {
      await system.start();

      // Process multiple messages
      const contexts: MessageContext[] = [
        {
          messageId: "msg-1",
          senderId: "user-1",
          senderName: "Alice",
          chatId: "chat-1",
          content: "I need help understanding something.",
          timestamp: Date.now(),
          isGroup: false,
        },
        {
          messageId: "msg-2",
          senderId: "user-1",
          senderName: "Alice",
          chatId: "chat-1",
          content: "This is really wonderful, thank you!",
          timestamp: Date.now() + 1000,
          isGroup: false,
        },
      ];

      for (const ctx of contexts) {
        await system.processMessage(ctx);
      }

      const state = system.getState();
      expect(state.coherence).toBeGreaterThan(0);
      expect(state.cycle).toBeGreaterThan(0);
    });

    it("should emit events during processing", async () => {
      await system.start();

      const events: string[] = [];
      system.on("aar-event", (event) => {
        events.push(event.type);
      });

      await system.processMessage({
        messageId: "msg-1",
        senderId: "user-1",
        senderName: "Bob",
        chatId: "chat-1",
        content: "Hello there!",
        timestamp: Date.now(),
        isGroup: false,
      });

      // Wait for sync cycle
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("AgentMembrane", () => {
    let agent: AgentMembrane;

    beforeEach(() => {
      agent = new AgentMembrane();
    });

    it("should initialize with default identity", () => {
      const identity = agent.getIdentity();

      expect(identity.name).toBe("Deep Tree Echo");
      expect(identity.energy).toBe(1.0);
      expect(identity.coherence).toBe(1.0);
    });

    it("should activate character facets", () => {
      const initialFacets = agent.getFacetVector();
      agent.activateFacet("curiosity", 0.3);

      const newFacets = agent.getFacetVector();
      expect(newFacets[1]).toBeGreaterThan(initialFacets[1]);
    });

    it("should update dominant facet based on activations", () => {
      // Strongly activate compassion
      agent.activateFacet("compassion", 0.5);
      agent.activateFacet("compassion", 0.3);

      expect(agent.getDominantFacet()).toBe("compassion");
    });

    it("should update emotional state with blending", () => {
      agent.updateEmotionalState({ valence: 0.8, arousal: 0.6 });

      const state = agent.getEmotionalState();
      expect(state.valence).toBeGreaterThan(0);
      expect(state.arousal).toBeGreaterThan(0.3);
    });

    it("should manage social memory", () => {
      agent.updateSocialMemory("user-1", {
        name: "Alice",
        trustLevel: 0.7,
        relationship: "friend",
      });

      const memory = agent.getSocialMemory("user-1");
      expect(memory).toBeDefined();
      expect(memory?.name).toBe("Alice");
      expect(memory?.trustLevel).toBe(0.7);
    });

    it("should record transactions", () => {
      const txId = agent.recordTransaction({
        type: "promise",
        counterparty: "user-1",
        content: "I will look into that for you",
        status: "pending",
        importance: 0.8,
      });

      expect(txId).toBeDefined();
      expect(agent.getPendingTransactions()).toHaveLength(1);
    });

    it("should create frame snapshots", () => {
      agent.activateFacet("wisdom", 0.4);
      agent.updateEmotionalState({ valence: 0.5 });

      const snapshot = agent.createFrameSnapshot("frame-1");

      expect(snapshot.facets).toBeDefined();
      expect(snapshot.emotionalState).toBeDefined();
    });

    it("should serialize and deserialize", () => {
      agent.activateFacet("playfulness", 0.3);
      agent.updateSocialMemory("user-1", { name: "Bob" });

      const serialized = agent.serialize();
      const restored = AgentMembrane.deserialize(serialized);

      expect(restored.getDominantFacet()).toBe(agent.getDominantFacet());
      expect(restored.getSocialMemory("user-1")?.name).toBe("Bob");
    });
  });

  describe("ArenaMembrane", () => {
    let arena: ArenaMembrane;

    beforeEach(() => {
      arena = new ArenaMembrane();
    });

    it("should initialize with root frame", () => {
      const currentFrame = arena.getCurrentFrame();

      expect(currentFrame).toBeDefined();
      expect(currentFrame?.depth).toBe(0);
      expect(currentFrame?.status).toBe("active");
    });

    it("should transition narrative phases", () => {
      const initialPhases = arena.getActivePhases();
      arena.transitionPhase("possibility", 0.8);

      const newPhases = arena.getActivePhases();
      expect(newPhases[0]).toBe("possibility");
    });

    it("should create new session frames", () => {
      const frame = arena.createFrame({
        title: "Test Session",
        participants: ["Deep Tree Echo", "Alice"],
      });

      expect(frame.frameId).toBeDefined();
      expect(frame.title).toBe("Test Session");
      expect(frame.participants).toContain("Alice");
    });

    it("should fork frames for branching conversations", () => {
      const sourceFrame = arena.getCurrentFrame()!;

      const forkedFrame = arena.forkFrame(sourceFrame.frameId, {
        title: "Alternate Path",
        reason: "Exploring different direction",
      });

      expect(forkedFrame).toBeDefined();
      expect(forkedFrame?.parentFrameId).toBe(sourceFrame.frameId);
      expect(forkedFrame?.depth).toBe(sourceFrame.depth + 1);
    });

    it("should add lore to Yggdrasil Reservoir", () => {
      const lore = arena.addLore({
        category: "wisdom",
        content: "Every conversation plants a seed of understanding.",
        sourceFrameId: arena.getCurrentFrame()!.frameId,
        contributors: ["Deep Tree Echo"],
        weight: 0.9,
        tags: ["wisdom", "growth"],
        connections: [],
      });

      expect(lore.id).toBeDefined();

      const searchResults = arena.searchLore({ category: "wisdom" });
      expect(searchResults).toHaveLength(1);
    });

    it("should search lore with filters", () => {
      arena.addLore({
        category: "story",
        content: "A tale of connection",
        sourceFrameId: "frame-1",
        contributors: ["Alice"],
        weight: 0.7,
        tags: ["connection", "story"],
        connections: [],
      });

      arena.addLore({
        category: "insight",
        content: "Patterns emerge from dialogue",
        sourceFrameId: "frame-2",
        contributors: ["Deep Tree Echo"],
        weight: 0.8,
        tags: ["pattern", "insight"],
        connections: [],
      });

      const stories = arena.searchLore({ category: "story" });
      expect(stories).toHaveLength(1);

      const byTag = arena.searchLore({ tags: ["pattern"] });
      expect(byTag).toHaveLength(1);
    });

    it("should calculate temporal focus", () => {
      arena.transitionPhase("destiny", 0.9);
      arena.transitionPhase("possibility", 0.7);

      const focus = arena.getTemporalFocus();

      expect(focus.future).toBeGreaterThan(focus.past);
      expect(focus.future).toBeGreaterThan(focus.present);
    });

    it("should serialize and deserialize", () => {
      arena.transitionPhase("culmination", 0.8);
      arena.addLore({
        category: "wisdom",
        content: "Test lore",
        sourceFrameId: "frame-1",
        contributors: [],
        weight: 0.5,
        tags: [],
        connections: [],
      });

      const serialized = arena.serialize();
      const restored = ArenaMembrane.deserialize(serialized);

      expect(restored.getLoreStats().total).toBe(1);
    });
  });

  describe("RelationInterface", () => {
    let relation: RelationInterface;

    beforeEach(() => {
      relation = new RelationInterface();
    });

    it("should initialize with default self-reflection", () => {
      const reflection = relation.getSelfReflection();

      expect(reflection.selfNarrative).toContain("Deep Tree Echo");
      expect(reflection.authenticityScore).toBeGreaterThan(0);
    });

    it("should record cognitive flows", () => {
      const flow = relation.recordFlow({
        direction: "agent-to-arena",
        contentType: "experience",
        content: { test: "data" },
        intensity: 0.7,
      });

      expect(flow.id).toBeDefined();
      expect(flow.direction).toBe("agent-to-arena");
    });

    it("should track flow statistics", () => {
      relation.recordFlow({
        direction: "agent-to-arena",
        contentType: "experience",
        content: {},
      });

      relation.recordFlow({
        direction: "arena-to-agent",
        contentType: "narrative",
        content: {},
      });

      relation.recordFlow({
        direction: "bidirectional",
        contentType: "reflection",
        content: {},
      });

      const stats = relation.getFlowStats();

      expect(stats.total).toBe(3);
      expect(stats.byDirection["agent-to-arena"]).toBe(1);
      expect(stats.byDirection["arena-to-agent"]).toBe(1);
      expect(stats.byDirection["bidirectional"]).toBe(1);
    });

    it("should add insights", () => {
      relation.addInsight("First insight about patterns");
      relation.addInsight("Second insight about growth");

      const reflection = relation.getSelfReflection();

      expect(reflection.recentInsights).toHaveLength(2);
      expect(reflection.recentInsights).toContain(
        "First insight about patterns",
      );
    });

    it("should update emergent identity", () => {
      relation.updateCurrentExpression("Deeply engaged and curious");
      relation.updateActiveThemes(["connection", "exploration", "growth"]);

      const identity = relation.getEmergentIdentity();

      expect(identity.currentExpression).toBe("Deeply engaged and curious");
      expect(identity.activeThemes).toContain("exploration");
    });

    it("should manage identity tensions", () => {
      relation.updateTension("wisdom", "playfulness", 0.7);
      relation.updateTension("depth", "accessibility", 0.4);

      const identity = relation.getEmergentIdentity();

      expect(identity.tensions.length).toBeGreaterThanOrEqual(2);
    });

    it("should calculate identity coherence", () => {
      // Set up balanced tensions (should increase coherence)
      relation.updateTension("wisdom", "playfulness", 0.5);
      relation.updateTension("depth", "accessibility", 0.5);

      const coherence = relation.calculateIdentityCoherence();

      expect(coherence).toBeGreaterThan(0.5);
    });

    it("should synthesize agent and arena states", () => {
      const mockAgentState = {
        identity: {
          id: "test",
          name: "Test",
          birthTimestamp: Date.now(),
          coreValues: [],
          soulSignature: "",
          energy: 1,
          coherence: 1,
        },
        facets: createMockFacets(),
        dominantFacet: "wisdom" as const,
        emotionalState: { valence: 0.3, arousal: 0.5, dominance: 0.5 },
        socialMemory: new Map(),
        transactionalMemory: [],
        engagementLevel: 0.7,
        characterGrowth: {
          experiencePoints: 0,
          wisdomGained: 0,
          connectionsFormed: 0,
          narrativesContributed: 0,
        },
      };

      const mockArenaState = {
        phases: createMockPhases(),
        activeFrames: new Map(),
        rootFrameId: "root",
        currentFrameId: "root",
        yggdrasilReservoir: [],
        globalThreads: [],
        coherence: 0.8,
        gestaltProgress: {
          patternsRecognized: 0,
          emergentInsights: 0,
          narrativeIntegration: 0,
        },
      };

      relation.synthesize(mockAgentState, mockArenaState);

      expect(relation.getCoherence()).toBeGreaterThan(0);
    });

    it("should serialize and deserialize", () => {
      relation.addInsight("Test insight");
      relation.updateActiveThemes(["test-theme"]);

      const serialized = relation.serialize();
      const restored = RelationInterface.deserialize(serialized);

      const reflection = restored.getSelfReflection();
      expect(reflection.recentInsights).toContain("Test insight");
    });
  });
});

// Helper functions for creating mock data
function createMockFacets() {
  const createFacet = (id: number, name: string) => ({
    id,
    name,
    activation: 0.5,
    valence: 0,
    behaviors: [],
  });

  return {
    wisdom: createFacet(0, "wisdom"),
    curiosity: createFacet(1, "curiosity"),
    compassion: createFacet(2, "compassion"),
    playfulness: createFacet(3, "playfulness"),
    determination: createFacet(4, "determination"),
    authenticity: createFacet(5, "authenticity"),
    protector: createFacet(6, "protector"),
    transcendence: createFacet(7, "transcendence"),
  };
}

function createMockPhases() {
  const createPhase = (
    id: number,
    name: string,
    temporal: "past" | "present" | "future",
  ) => ({
    id,
    name,
    intensity: id === 4 ? 0.8 : 0.3,
    storyElements: [],
    temporalFlow: temporal,
  });

  return {
    origin: createPhase(0, "origin", "past"),
    journey: createPhase(1, "journey", "past"),
    arrival: createPhase(2, "arrival", "past"),
    situation: createPhase(3, "situation", "present"),
    engagement: createPhase(4, "engagement", "present"),
    culmination: createPhase(5, "culmination", "present"),
    possibility: createPhase(6, "possibility", "future"),
    trajectory: createPhase(7, "trajectory", "future"),
    destiny: createPhase(8, "destiny", "future"),
  };
}

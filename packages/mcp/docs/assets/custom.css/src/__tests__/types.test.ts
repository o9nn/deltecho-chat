/**
 * @fileoverview Virtual Model Type Tests
 *
 * Tests for the core AAR types including VirtualArenaModel and VirtualAgentModel.
 */

import { describe, it, expect } from "vitest";
import type {
  VirtualArenaModel,
  VirtualAgentModel,
  EntityImpression,
  ArenaMCPConfig,
  AgentMCPConfig,
  RelationMCPConfig,
  AgentReference,
  OrchestrationResult,
  ParticipationProtocol,
  ParticipationResult,
  EvolutionResult,
  SynthesisResult,
  DevelopmentalCycleResult,
} from "../types.js";

describe("Virtual Model Types", () => {
  describe("VirtualArenaModel", () => {
    it("should create a valid VirtualArenaModel", () => {
      const model: VirtualArenaModel = {
        situationalAwareness: {
          perceivedContext: "Testing environment",
          assumedNarrativePhase: "engagement",
          estimatedCoherence: 0.85,
        },
        knownEntities: new Map(),
        perceivedRules: ["Rule 1", "Rule 2"],
        worldTheory: "The world operates on cause and effect",
        uncertainties: ["What lies beyond?"],
        divergenceMetrics: {
          lastSyncTime: Date.now(),
          estimatedDrift: 0.1,
          knownMisalignments: [],
        },
      };

      expect(model.situationalAwareness.perceivedContext).toBe(
        "Testing environment",
      );
      expect(model.situationalAwareness.estimatedCoherence).toBe(0.85);
      expect(model.perceivedRules).toHaveLength(2);
      expect(model.divergenceMetrics.estimatedDrift).toBe(0.1);
    });

    it("should track entity impressions", () => {
      const entity: EntityImpression = {
        id: "entity-1",
        name: "Test Entity",
        perceivedRole: "collaborator",
        trustEstimate: 0.8,
        predictedBehaviors: ["helpful", "consistent"],
        lastInteraction: Date.now(),
        emotionalAssociation: 0.5,
      };

      const model: VirtualArenaModel = {
        situationalAwareness: {
          perceivedContext: "Test",
          assumedNarrativePhase: "exposition",
          estimatedCoherence: 0.7,
        },
        knownEntities: new Map([["entity-1", entity]]),
        perceivedRules: [],
        worldTheory: "Test theory",
        uncertainties: [],
        divergenceMetrics: {
          lastSyncTime: Date.now(),
          estimatedDrift: 0,
          knownMisalignments: [],
        },
      };

      expect(model.knownEntities.size).toBe(1);
      expect(model.knownEntities.get("entity-1")?.trustEstimate).toBe(0.8);
    });
  });

  describe("VirtualAgentModel", () => {
    it("should create a valid VirtualAgentModel with nested VirtualArenaModel", () => {
      const worldView: VirtualArenaModel = {
        situationalAwareness: {
          perceivedContext: "Agent world view",
          assumedNarrativePhase: "development",
          estimatedCoherence: 0.75,
        },
        knownEntities: new Map(),
        perceivedRules: ["Be helpful"],
        worldTheory: "Agents help humans",
        uncertainties: [],
        divergenceMetrics: {
          lastSyncTime: Date.now(),
          estimatedDrift: 0.05,
          knownMisalignments: [],
        },
      };

      const model: VirtualAgentModel = {
        selfImage: {
          perceivedFacets: { stoic: 0.7, passionate: 0.3 },
          believedStrengths: ["reasoning", "empathy"],
          acknowledgedWeaknesses: ["impatience"],
          perceivedDominantFacet: "stoic",
        },
        selfStory: "I am a helpful AI assistant",
        perceivedCapabilities: ["conversation", "analysis"],
        roleUnderstanding: "To assist users with their queries",
        currentGoals: ["Help user", "Learn from interaction"],
        worldView,
        selfAwareness: {
          lastReflection: Date.now(),
          perceivedAccuracy: 0.8,
          activeQuestions: ["How can I improve?"],
        },
      };

      expect(model.selfImage.perceivedDominantFacet).toBe("stoic");
      expect(model.worldView.situationalAwareness.perceivedContext).toBe(
        "Agent world view",
      );
      expect(model.currentGoals).toHaveLength(2);
    });

    it("should demonstrate inverted mirror pattern (Vi contains Vo)", () => {
      const vo: VirtualArenaModel = {
        situationalAwareness: {
          perceivedContext: "Inner world perception",
          assumedNarrativePhase: "climax",
          estimatedCoherence: 0.9,
        },
        knownEntities: new Map(),
        perceivedRules: [],
        worldTheory: "Reality is subjective",
        uncertainties: ["Is my perception accurate?"],
        divergenceMetrics: {
          lastSyncTime: Date.now(),
          estimatedDrift: 0.2,
          knownMisalignments: ["Timing may be off"],
        },
      };

      const vi: VirtualAgentModel = {
        selfImage: {
          perceivedFacets: {},
          believedStrengths: [],
          acknowledgedWeaknesses: [],
          perceivedDominantFacet: "stoic",
        },
        selfStory: "I contain my world view within me",
        perceivedCapabilities: [],
        roleUnderstanding: "Self-reflective agent",
        currentGoals: [],
        worldView: vo, // Vo nested inside Vi
        selfAwareness: {
          lastReflection: Date.now(),
          perceivedAccuracy: 0.7,
          activeQuestions: [],
        },
      };

      // Verify inverted mirror: Vi.worldView === Vo
      expect(vi.worldView).toBe(vo);
      expect(vi.worldView.worldTheory).toBe("Reality is subjective");
    });
  });

  describe("EntityImpression", () => {
    it("should represent how an agent perceives another entity", () => {
      const impression: EntityImpression = {
        id: "user-123",
        name: "Alice",
        perceivedRole: "collaborator",
        trustEstimate: 0.9,
        predictedBehaviors: ["asks thoughtful questions", "responds promptly"],
        lastInteraction: Date.now(),
        emotionalAssociation: 0.7, // Positive
      };

      expect(impression.trustEstimate).toBeGreaterThan(0);
      expect(impression.trustEstimate).toBeLessThanOrEqual(1);
      expect(impression.emotionalAssociation).toBeGreaterThanOrEqual(-1);
      expect(impression.emotionalAssociation).toBeLessThanOrEqual(1);
    });
  });
});

describe("MCP Layer Configuration Types", () => {
  describe("ArenaMCPConfig", () => {
    it("should define arena layer configuration", () => {
      const config: ArenaMCPConfig = {
        instanceName: "TestArena",
        maxAgents: 100,
        maxFrames: 50,
        maxLoreEntries: 1000,
        enableOrchestration: true,
      };

      expect(config.instanceName).toBe("TestArena");
      expect(config.maxAgents).toBe(100);
      expect(config.enableOrchestration).toBe(true);
    });
  });

  describe("AgentMCPConfig", () => {
    it("should define agent layer configuration", () => {
      const config: AgentMCPConfig = {
        agentId: "agent-1",
        parentArenaId: "arena-1",
        enableEvolution: true,
        evolutionRate: 0.1,
      };

      expect(config.agentId).toBe("agent-1");
      expect(config.parentArenaId).toBe("arena-1");
      expect(config.evolutionRate).toBe(0.1);
    });

    it("should allow optional parentArenaId", () => {
      const config: AgentMCPConfig = {
        agentId: "standalone-agent",
        enableEvolution: false,
        evolutionRate: 0,
      };

      expect(config.parentArenaId).toBeUndefined();
    });
  });

  describe("RelationMCPConfig", () => {
    it("should define relation layer configuration", () => {
      const config: RelationMCPConfig = {
        maxFlowHistory: 100,
        coherenceThreshold: 0.7,
        enableMirroring: true,
        mirrorSyncIntervalMs: 5000,
      };

      expect(config.coherenceThreshold).toBe(0.7);
      expect(config.enableMirroring).toBe(true);
      expect(config.mirrorSyncIntervalMs).toBe(5000);
    });
  });
});

describe("Result Types", () => {
  describe("AgentReference", () => {
    it("should define agent reference with status", () => {
      const ref: AgentReference = {
        agentId: "agent-1",
        name: "TestAgent",
        status: "active",
        lastActivity: Date.now(),
        mcpEndpoint: "mcp://agent-1",
      };

      expect(ref.status).toBe("active");
      expect(ref.mcpEndpoint).toBe("mcp://agent-1");
    });

    it("should support all status values", () => {
      const statuses: AgentReference["status"][] = [
        "active",
        "dormant",
        "spawning",
      ];

      statuses.forEach((status) => {
        const ref: AgentReference = {
          agentId: "test",
          name: "Test",
          status,
          lastActivity: Date.now(),
        };
        expect(ref.status).toBe(status);
      });
    });
  });

  describe("OrchestrationResult", () => {
    it("should capture multi-agent orchestration results", () => {
      const result: OrchestrationResult = {
        success: true,
        participatingAgents: ["agent-1", "agent-2"],
        directive: "Collaborate on task",
        responses: new Map([
          ["agent-1", "Ready to collaborate"],
          ["agent-2", "Acknowledged"],
        ]),
        synthesizedOutcome: "Both agents aligned on approach",
        timestamp: Date.now(),
      };

      expect(result.success).toBe(true);
      expect(result.participatingAgents).toHaveLength(2);
      expect(result.responses.size).toBe(2);
    });
  });

  describe("ParticipationProtocol", () => {
    it("should define participation types", () => {
      const protocols: ParticipationProtocol[] = [
        { type: "dialogue", context: "Chat", participants: ["user"] },
        {
          type: "collaboration",
          context: "Project",
          participants: ["agent-1", "agent-2"],
        },
        { type: "observation", context: "Monitoring", participants: [] },
        {
          type: "guidance",
          context: "Teaching",
          participants: ["mentor"],
          constraints: ["gentle"],
        },
      ];

      expect(protocols[0].type).toBe("dialogue");
      expect(protocols[3].constraints).toContain("gentle");
    });
  });

  describe("ParticipationResult", () => {
    it("should capture agent participation outcomes", () => {
      const result: ParticipationResult = {
        response: "I understand and will help",
        facetsActivated: ["stoic", "passionate"],
        emotionalShift: { valence: 0.3, arousal: 0.1 },
        insightsGained: ["User prefers direct answers"],
        socialUpdates: new Map(),
      };

      expect(result.facetsActivated).toContain("stoic");
      expect(result.emotionalShift.valence).toBe(0.3);
    });
  });

  describe("EvolutionResult", () => {
    it("should track Echo-volution results", () => {
      const result: EvolutionResult = {
        experienceIntegrated: 5,
        facetGrowth: { stoic: 0.02, passionate: -0.01 },
        newInsights: ["Patience leads to better outcomes"],
        characterDevelopment: "Became more measured in responses",
      };

      expect(result.experienceIntegrated).toBe(5);
      expect(result.facetGrowth.stoic).toBe(0.02);
    });
  });

  describe("SynthesisResult", () => {
    it("should capture agent-arena synthesis", () => {
      const result: SynthesisResult = {
        coherence: 0.85,
        emergentIdentity: {
          synthesisNarrative: "Unified understanding achieved",
          coherenceScore: 0.85,
          dominantFlow: "analytical",
        },
        flows: [],
        tensions: [{ pole1: "action", pole2: "reflection", balance: 0.6 }],
      };

      expect(result.coherence).toBe(0.85);
      expect(result.tensions).toHaveLength(1);
    });
  });

  describe("DevelopmentalCycleResult", () => {
    it("should track developmental cycle phases", () => {
      const phases: DevelopmentalCycleResult["phase"][] = [
        "perception",
        "modeling",
        "reflection",
        "mirroring",
        "enaction",
      ];

      phases.forEach((phase, index) => {
        const result: DevelopmentalCycleResult = {
          cycleNumber: index + 1,
          phase,
          stateChanges: {
            agentDelta: {},
            arenaDelta: {},
            virtualAgentDelta: {},
            virtualArenaDelta: {},
          },
          coherenceAfter: 0.8 + index * 0.02,
          timestamp: Date.now(),
        };

        expect(result.phase).toBe(phase);
        expect(result.cycleNumber).toBe(index + 1);
      });
    });
  });
});

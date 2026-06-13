import { EventEmitter } from "events";
import { describe, expect, it, jest } from "@jest/globals";
import {
  AutonomyLifecycleCoordinator,
  AutonomyPhase,
} from "../autonomy-lifecycle";
import { ScientificDomain, ReasoningMode } from "deep-tree-echo-core";

class MockScientificGeniusEngine extends EventEmitter {
  public queries: Array<{ query: string; domain?: ScientificDomain }> = [];

  public async processScientificQuery(
    query: string,
    domain?: ScientificDomain,
  ) {
    this.queries.push({ query, domain });

    const hypothesis = {
      id: "hypothesis_autonomy_1",
      statement: "Scientific feedback can improve autonomy coherence.",
      domain: domain ?? ScientificDomain.CognitiveScience,
      supportingEvidence: [],
      contradictingEvidence: [],
      predictions: [],
      priorProbability: 0.5,
      posteriorProbability: 0.84,
      freeEnergy: 0.32,
      status: "supported" as const,
    };

    this.emit("hypothesis_evaluated", {
      hypothesis,
      freeEnergy: hypothesis.freeEnergy,
      posterior: hypothesis.posteriorProbability,
    });

    const insight = {
      id: "insight_autonomy_1",
      content:
        "Autonomy should convert scientific reflection into bounded self-model updates.",
      domain: domain ?? ScientificDomain.CognitiveScience,
      crossDomainConnections: [ScientificDomain.SystemsTheory],
      novelty: 0.9,
      significance: 0.82,
      phi: 2.4,
      generatedBy: ReasoningMode.Synthetic,
      timestamp: Date.now(),
    };

    this.emit("insight_broadcast", { insight });
    return [insight];
  }
}

describe("AutonomyLifecycleCoordinator scientific-genius wiring", () => {
  const latestSelfImage = {
    timestamp: Date.now(),
    totalPercepts: 8,
    totalGoalsCompleted: 2,
    totalMemories: 12,
    averageEmotionalValence: 0.1,
    dominantCognitiveMode: "reflective_synthesis",
    ontogeneticProgress: 0.64,
    coherenceScore: 0.78,
    identityVector: [0.1, 0.2],
  };

  const cognitiveProcessor = {
    getSelfImageHistory: jest.fn(() => [latestSelfImage]),
    getState: jest.fn(() => ({
      tickCount: 42,
      perceptBufferSize: 0,
      activeGoals: 3,
      totalGoals: 5,
      episodicMemories: 10,
      consolidatedMemories: 7,
      selfImageSnapshots: 1,
      latestSelfImage,
    })),
    getGoals: jest.fn(() => [
      {
        id: "goal_1",
        description: "Maintain coherent scientific autonomy",
        priority: 0.8,
        urgency: 0.5,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attempts: 0,
        maxAttempts: 3,
        dependencies: [],
      },
    ]),
  } as any;

  it("feeds scientific insights into reflection state, coherence telemetry, and the virtual agent self-model", async () => {
    const lifecycle = new AutonomyLifecycleCoordinator(
      {
        cycleIntervalMs: 0,
        scientificInquiryInterval: 1,
        maxScientificInsights: 4,
      },
      cognitiveProcessor,
    );
    const scientificGenius = new MockScientificGeniusEngine();
    lifecycle.wireScientificGenius(scientificGenius as any);

    const result = await lifecycle.executePhase(AutonomyPhase.REFLECTION, 1);
    const signal = lifecycle.getScientificAutonomySignal();
    const agent = lifecycle.getVirtualAgent();

    expect(scientificGenius.queries).toHaveLength(1);
    expect(scientificGenius.queries[0].query).toContain(
      "Integrate Deep Tree Echo autonomy lifecycle state",
    );
    expect(result.stateChanges.scientificInsights).toBe(1);
    expect(signal.recentInsightCount).toBe(1);
    expect(signal.insightPotential).toBeGreaterThan(0.5);
    expect(signal.hypothesisConfidence).toBeCloseTo(0.84);
    expect(agent.perceivedCapabilities).toContain("scientific_reasoning");
    expect(agent.selfStory).toContain("Scientific reflection");
    expect(agent.selfAwareness.activeQuestions[0]).toContain(
      "How should I enact this insight",
    );
    expect(result.coherenceAfter).toBeGreaterThan(0);
    expect(result.coherenceAfter).toBeLessThanOrEqual(1);
  });
});

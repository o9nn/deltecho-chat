import { EventEmitter } from "events";
import { describe, expect, it, jest } from "@jest/globals";
import {
  AutonomyLifecycleCoordinator,
  AutonomyPhase,
} from "../autonomy-lifecycle";
import {
  ReasoningMode,
  ScientificDomain,
  type GlobalWorkspaceState,
  type Hypothesis,
  type PredictiveInsightCrystal,
  type ScientificGeniusEngine,
  type ScientificInsight,
  type StrangeLoopState,
} from "deep-tree-echo-core";
import {
  CognitiveTickProcessor,
  type CognitiveGoal,
  type SelfImageSnapshot,
} from "../cognitive-tick-processor";

class MockScientificGeniusEngine
  extends EventEmitter
  implements ScientificGeniusEngine
{
  public queries: Array<{ query: string; domain?: ScientificDomain }> = [];
  public insights: ScientificInsight[] = [];
  public crystalScans = 0;
  public enableFreeEnergyMinimization = true;
  public enableIntegratedInformation = true;
  public enableAutopoiesis = true;
  public enableStrangeLoops = true;
  public enableEpistemicForaging = true;
  public creativityTemperature = 0.7;
  public rigorThreshold = 0.6;
  public crossDomainWeight = 0.5;
  public maxHypotheses = 100;
  public maxInsights = 500;
  public verbose = false;

  public async generateInsights(
    query: string,
    _hypotheses?: Hypothesis[],
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]> {
    this.queries.push({ query, domain });

    const hypothesis: Hypothesis = {
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

    const insight: ScientificInsight = {
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

    this.insights.push(insight);
    return [insight];
  }

  public async processScientificQuery(
    query: string,
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]> {
    return this.generateInsights(query, undefined, domain);
  }

  public async processStimulus(
    query: string,
    domain: ScientificDomain,
  ): Promise<ScientificInsight[]> {
    return this.generateInsights(query, undefined, domain);
  }

  public crystallizePredictiveInsights(): PredictiveInsightCrystal[] {
    this.crystalScans++;
    const crystal: PredictiveInsightCrystal = {
      id: "crystal_test_conjecture",
      confidence: 0.58,
      timestamp: Date.now(),
      confirmed: false,
      prediction: "Untested graph relation",
      sourceConcepts: ["concept_a", "concept_c"],
      targetConcept: "concept_b",
      domain: ScientificDomain.CognitiveScience,
      avatarEffect: {
        eyeFocusIntensity: 0.25,
        browRaiseAsymmetry: 0.1,
        microSmileIntensity: 0,
        haloCrystallizationHz: 0.5,
      },
    };
    this.emit("predictive_crystallization", crystal);
    return [crystal];
  }

  public async performEpistemicForaging(): Promise<ScientificInsight[]> {
    return [];
  }

  public enterGeniusMode(): void {}

  public exitGeniusMode(): void {}

  public describeState(): string {
    return "typed test scientific engine";
  }

  public getState(): ReturnType<ScientificGeniusEngine["getState"]> {
    return {
      isGeniusMode: false,
      reasoningMode: ReasoningMode.Synthetic,
      conceptCount: 0,
      hypothesisCount: 1,
      insightCount: this.insights.length,
      totalFreeEnergy: 0.32,
      meanFreeEnergy: 0.32,
      freeEnergyTrend: 0,
      integrationLevel: 0,
      meanPhi: 2.4,
      autopoieticCycles: 0,
      metaCognitiveDepth: 0,
      recursionLevel: 0,
    };
  }

  public getVisualState(): ReturnType<
    ScientificGeniusEngine["getVisualState"]
  > {
    return {
      scientificGenius: 0,
      insightPotential: 0,
      phi: 2.4,
      freeEnergy: 0.32,
      esnCoherence: 0.5,
      autognosisResonance: 0.5,
    };
  }

  public async generateHypotheses(): Promise<Hypothesis[]> {
    return [];
  }

  public async evaluateHypothesis(_hypothesis: Hypothesis): Promise<void> {}

  public getInsights(): ScientificInsight[] {
    return [...this.insights];
  }

  public getHypotheses(): Hypothesis[] {
    return [];
  }

  public getGlobalWorkspaceState(): GlobalWorkspaceState {
    return {
      activeInsights: [],
      broadcastQueue: [],
      attentionalFocus: [],
      workingMemory: new Map(),
      integrationLevel: 0,
    };
  }

  public getStrangeLoopState(): StrangeLoopState {
    return {
      selfModelAccuracy: 0,
      metaCognitiveDepth: 0,
      recursionLevel: 0,
      selfReferentialInsights: [],
      paradoxesDetected: [],
    };
  }

  public getTotalFreeEnergy(): number {
    return 0.32;
  }

  public getAutopoieticCycles(): number {
    return 0;
  }

  public getIsGeniusMode(): boolean {
    return false;
  }

  public getCurrentReasoningMode(): ReasoningMode {
    return ReasoningMode.Synthetic;
  }

  public detectResonanceCascade(): null {
    return null;
  }
}

const latestSelfImage: SelfImageSnapshot = {
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

const activeGoal: CognitiveGoal = {
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
};

function createCognitiveProcessor(daoConsensus = 0.75, esnAutognosis = 0.72) {
  const cognitiveProcessor = new CognitiveTickProcessor();
  const getDaoConsensus = jest
    .spyOn(cognitiveProcessor, "getDaoConsensus")
    .mockReturnValue(daoConsensus);
  const getEsnAutognosis = jest
    .spyOn(cognitiveProcessor, "getEsnAutognosis")
    .mockReturnValue(esnAutognosis);

  jest
    .spyOn(cognitiveProcessor, "getSelfImageHistory")
    .mockReturnValue([latestSelfImage]);
  jest.spyOn(cognitiveProcessor, "getState").mockReturnValue({
    tickCount: 42,
    perceptBufferSize: 0,
    activeGoals: 3,
    totalGoals: 5,
    episodicMemories: 10,
    consolidatedMemories: 7,
    selfImageSnapshots: 1,
    latestSelfImage,
  });
  jest.spyOn(cognitiveProcessor, "getGoals").mockReturnValue([activeGoal]);

  return { cognitiveProcessor, getDaoConsensus, getEsnAutognosis };
}

describe("AutonomyLifecycleCoordinator scientific-genius wiring", () => {
  it("feeds scientific insights into reflection state, coherence telemetry, and the virtual agent self-model", async () => {
    const { cognitiveProcessor } = createCognitiveProcessor();
    const lifecycle = new AutonomyLifecycleCoordinator(
      {
        cycleIntervalMs: 0,
        scientificInquiryInterval: 1,
        maxScientificInsights: 4,
      },
      cognitiveProcessor,
    );
    const scientificGenius = new MockScientificGeniusEngine();
    lifecycle.wireScientificGenius(scientificGenius);

    const result = await lifecycle.executePhase(AutonomyPhase.REFLECTION, 1);
    const signal = lifecycle.getScientificAutonomySignal();
    const agent = lifecycle.getVirtualAgent();

    expect(scientificGenius.queries).toHaveLength(1);
    expect(scientificGenius.crystalScans).toBe(1);
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

  it("routes a tentative graph link once per scheduled reflection without mutating self-modification or leaking old engine listeners", async () => {
    const { cognitiveProcessor } = createCognitiveProcessor();
    const lifecycle = new AutonomyLifecycleCoordinator(
      { cycleIntervalMs: 0, scientificInquiryInterval: 3 },
      cognitiveProcessor,
    );
    const oldEngine = new MockScientificGeniusEngine();
    const engine = new MockScientificGeniusEngine();
    const events: unknown[] = [];
    lifecycle.on("scientific:predictive_crystallization", (event) =>
      events.push(event),
    );
    lifecycle.wireScientificGenius(oldEngine as any);
    lifecycle.wireScientificGenius(engine as any);
    expect(oldEngine.listenerCount("predictive_crystallization")).toBe(0);
    await lifecycle.executePhase(AutonomyPhase.REFLECTION, 1);
    await lifecycle.executePhase(AutonomyPhase.REFLECTION, 2);
    expect(engine.crystalScans).toBe(0);
    await lifecycle.executePhase(AutonomyPhase.REFLECTION, 3);
    expect(engine.crystalScans).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ confirmed: false });
    expect(lifecycle.getSelfModificationEngine()).toBeUndefined();
  });

  it("blends live DAO and ESN telemetry when Scientific Genius is unbound", () => {
    const { cognitiveProcessor, getDaoConsensus, getEsnAutognosis } =
      createCognitiveProcessor(1, 1);
    const lifecycle = new AutonomyLifecycleCoordinator(
      { cycleIntervalMs: 0 },
      cognitiveProcessor,
    );

    expect(lifecycle.getScientificAutonomySignal().recentInsightCount).toBe(0);
    expect(lifecycle.getInvertedMirrorState().coherence).toBeCloseTo(0.9082);
    expect(getDaoConsensus).toHaveBeenCalled();
    expect(getEsnAutognosis).toHaveBeenCalled();
  });

  it("blends live DAO and ESN telemetry with a bound engine and empty insights", () => {
    const { cognitiveProcessor, getDaoConsensus, getEsnAutognosis } =
      createCognitiveProcessor(1, 1);
    const lifecycle = new AutonomyLifecycleCoordinator(
      { cycleIntervalMs: 0 },
      cognitiveProcessor,
    );
    lifecycle.wireScientificGenius(new MockScientificGeniusEngine());

    expect(lifecycle.getScientificAutonomySignal().recentInsightCount).toBe(0);
    expect(lifecycle.getInvertedMirrorState().coherence).toBeCloseTo(0.9082);
    expect(getDaoConsensus).toHaveBeenCalled();
    expect(getEsnAutognosis).toHaveBeenCalled();
  });

  it("preserves scientific adjustment after a typed engine produces insights", async () => {
    const { cognitiveProcessor, getDaoConsensus, getEsnAutognosis } =
      createCognitiveProcessor(1, 1);
    const lifecycle = new AutonomyLifecycleCoordinator(
      { cycleIntervalMs: 0, scientificInquiryInterval: 1 },
      cognitiveProcessor,
    );
    const scientificGenius = new MockScientificGeniusEngine();
    lifecycle.wireScientificGenius(scientificGenius);

    const result = await lifecycle.executePhase(AutonomyPhase.REFLECTION, 1);

    expect(lifecycle.getScientificAutonomySignal().recentInsightCount).toBe(1);
    expect(result.coherenceAfter).toBeCloseTo(0.865552);
    expect(getDaoConsensus).toHaveBeenCalled();
    expect(getEsnAutognosis).toHaveBeenCalled();
  });

  it("retains the neutral baseline when DAO and ESN telemetry are absent", () => {
    const lifecycle = new AutonomyLifecycleCoordinator({ cycleIntervalMs: 0 });

    expect(lifecycle.getScientificAutonomySignal().recentInsightCount).toBe(0);
    expect(lifecycle.getInvertedMirrorState().coherence).toBeCloseTo(0.5);
  });
});

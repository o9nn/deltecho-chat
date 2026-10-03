import {
  CognitiveOrchestrator,
  type ScientificGeniusVisualState,
} from "../CognitiveBridge";

const configuration = { enabled: true, enableAsMainUser: false };

function measuredSignal(): ScientificGeniusVisualState {
  return {
    origin: "entelechy",
    mode: "Scientific Genius",
    scientificGenius: 0.91,
    insightPotential: 0.84,
    entelechyScore: 0.87,
    freeEnergy: 0.12,
    salience: 0.81,
    daoConsensus: 0.8,
    esnCoherence: 0.83,
    autognosisResonance: 0.79,
    coreSelf: {
      initialized: true,
      ledgerHead: "a".repeat(64),
      projectedStateDigest: "b".repeat(64),
      acceptedEventCount: 1,
      pendingProposalCount: 0,
    },
    resonanceCascade: {
      id: "genuine-cascade-1",
      timestamp: 10_000,
      intensity: 0.7,
      clusterPhi: 0.8,
      clusterNovelty: 0.9,
      domainSpan: 3,
      haloPulseHz: 3,
      spectralRadiusBoost: 0.1,
      epistemicTemperatureDelta: -0.2,
    },
  };
}

describe("CognitiveBridge scientific evidence abstention", () => {
  let now: jest.SpyInstance;

  beforeEach(() => {
    now = jest.spyOn(Date, "now").mockReturnValue(10_000);
  });

  afterEach(() => {
    now.mockRestore();
  });

  it("starts neutral and never invents DAO, ESN, or metabolic state from a local message", async () => {
    const orchestrator = new CognitiveOrchestrator(configuration);
    await orchestrator.initialize();
    expect(orchestrator.getScientificGeniusVisualState()).toMatchObject({
      origin: "local-observation",
      mode: "Idle",
      scientificGenius: 0,
      insightPotential: 0,
      entelechyScore: 0,
    });

    await orchestrator.processMessage({
      id: "1",
      content: "Urgent! Please help me think this through?",
      role: "user",
      timestamp: 10_000,
    });

    const signal = orchestrator.getScientificGeniusVisualState();
    expect(signal?.origin).toBe("local-observation");
    expect(signal?.arousal).toBeGreaterThan(0);
    expect(signal?.scientificGenius).toBe(0);
    expect(signal?.daoConsensus).toBeUndefined();
    expect(signal?.esnCoherence).toBeUndefined();
    expect(signal?.autognosisResonance).toBeUndefined();
    expect(signal?.metabolic).toBeUndefined();
    expect(signal?.resonanceCascade).toBeUndefined();
  });

  it("retains real scientific evidence across local messages and expires it after five seconds", async () => {
    const orchestrator = new CognitiveOrchestrator(configuration);
    await orchestrator.initialize();
    orchestrator.applyScientificGeniusVisualState(measuredSignal());
    expect(
      orchestrator.getScientificGeniusVisualState()?.resonanceCascade?.id,
    ).toBe("genuine-cascade-1");
    expect(orchestrator.getState()?.persona.currentMood).toBe("neutral");
    expect(orchestrator.getState()?.reasoning.confidenceLevel).toBe(0.5);

    await orchestrator.processMessage({
      id: "2",
      content: "A new observation",
      role: "user",
      timestamp: 10_001,
    });
    expect(orchestrator.getState()?.scientificGeniusVisualState?.origin).toBe(
      "entelechy",
    );

    now.mockReturnValue(15_001);
    const state = orchestrator.getState();
    expect(state?.scientificGeniusVisualState?.origin).toBe(
      "local-observation",
    );
    expect(
      state?.scientificGeniusVisualState?.resonanceCascade,
    ).toBeUndefined();
    expect(state?.scientificGeniusVisualState?.daoConsensus).toBeUndefined();
    expect(state?.persona.currentMood).toBe("neutral");
    expect(state?.reasoning.confidenceLevel).toBe(0.5);
    expect(state?.cognitiveContext?.salienceScore).toBe(
      state?.scientificGeniusVisualState?.salience,
    );
  });

  it("revokes authority for null, missing provenance, or non-finite evidence", async () => {
    const orchestrator = new CognitiveOrchestrator(configuration);
    await orchestrator.initialize();

    orchestrator.applyScientificGeniusVisualState(measuredSignal());
    orchestrator.applyScientificGeniusVisualState(null);
    expect(orchestrator.getScientificGeniusVisualState()?.origin).toBe(
      "local-observation",
    );

    const { origin: _origin, ...unmarked } = measuredSignal();
    orchestrator.applyScientificGeniusVisualState(
      unmarked as ScientificGeniusVisualState,
    );
    expect(orchestrator.getScientificGeniusVisualState()?.origin).toBe(
      "local-observation",
    );

    orchestrator.applyScientificGeniusVisualState({
      ...measuredSignal(),
      daoConsensus: Number.POSITIVE_INFINITY,
    });
    expect(orchestrator.getScientificGeniusVisualState()?.origin).toBe(
      "local-observation",
    );
  });
});

import { PARAM_IDS } from "../adapters/pixi-live2d-renderer";
import { CognitiveAvatarBridge } from "../cognitive-avatar-bridge";
import { ESNAvatarBridge } from "../esn-avatar-bridge";

describe("scientific-genius avatar bridges", () => {
  it("preserves DAO, ESN, and autognosis telemetry through the cognitive bridge", () => {
    const bridge = new CognitiveAvatarBridge({ smoothingFactor: 0 });

    bridge.updateFromCognitiveState({
      sentienceLevel: 0.82,
      selfAwareness: 0.86,
      phi: 0.8,
      flowState: 0.78,
      emotionalValence: 0.32,
      emotionalArousal: 0.58,
      scientificGenius: 0.88,
      insightPotential: 0.82,
      entelechyScore: 0.84,
      freeEnergy: 0.22,
      daoConsensus: 0.91,
      esnCoherence: 0.89,
      autognosisResonance: 0.87,
      isProcessing: true,
      isSpeaking: false,
    });

    const state = bridge.getState();

    expect(state.dtechoMode).toBe("Scientific Genius");
    expect(state.cognitiveVisualState.daoConsensus).toBeCloseTo(0.91);
    expect(state.cognitiveVisualState.esnCoherence).toBeCloseTo(0.89);
    expect(state.cognitiveVisualState.autognosisResonance).toBeCloseTo(0.87);
    expect(state.cubism[PARAM_IDS.PARAM_ANGLE_X]).toBeGreaterThan(1.5);
    expect(state.cubism[PARAM_IDS.PARAM_BODY_ANGLE_Z]).toBeGreaterThan(1);
    expect(state.consciousnessGlow).toBeGreaterThan(0.72);
  });

  it("projects entelechy telemetry into a bounded scientific-genius overlay", () => {
    const bridge = new ESNAvatarBridge({ enableEntelechyAura: true });

    bridge.updateFromEntelechy({
      level: "emergent",
      score: 0.78,
      patternCount: 4,
      reservoirCoupling: 0.86,
      temporalSynchrony: 0.81,
      insightPotential: 0.9,
      scientificGenius: 0.92,
      daoConsensus: 0.88,
      esnCoherence: 0.91,
      autognosisResonance: 0.89,
      freeEnergy: 0.24,
    });

    const params = bridge.getParams();

    expect(params.scientificGeniusOverlay.activation).toBeGreaterThan(0.88);
    expect(params.scientificGeniusOverlay.daoConsensus).toBeCloseTo(0.88);
    expect(params.scientificGeniusOverlay.esnCoherence).toBeCloseTo(0.91);
    expect(params.scientificGeniusOverlay.autognosisResonance).toBeCloseTo(
      0.89,
    );
    expect(params.scientificGeniusOverlay.haloPulseHz).toBeGreaterThan(3);
    expect(
      params.scientificGeniusOverlay.epistemicTemperature,
    ).toBeGreaterThanOrEqual(0.2);
    expect(
      params.scientificGeniusOverlay.epistemicTemperature,
    ).toBeLessThanOrEqual(1);
    expect(params.scientificGeniusOverlay.hypothesisFlux).toBeGreaterThan(0.8);
    expect(params.entelechyVisualization.auraIntensity).toBeGreaterThanOrEqual(
      0.78,
    );
    expect(params.entelechyVisualization.particleCount).toBeGreaterThan(40);
    expect(bridge.describeState()).toContain("genius=");
  });
});

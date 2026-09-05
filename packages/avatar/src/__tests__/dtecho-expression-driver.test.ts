import {
  DTE_EXPRESSION_MAP,
  projectDTEchoCognitiveState,
} from "../dtecho-expression-driver";
import { PARAM_IDS } from "../adapters/pixi-live2d-renderer";

describe("DTEcho expression driver", () => {
  it("maps canonical cognitive modes to Live2D expression profiles", () => {
    const projection = projectDTEchoCognitiveState({
      mode: "Recursive Expansion",
      selfAwareness: 0.8,
      flow: 0.7,
      salience: 0.75,
    });

    expect(DTE_EXPRESSION_MAP["Recursive Expansion"]).toBe(
      "WONDER_02_CuriousGaze",
    );
    expect(projection.selectedMode).toBe("Recursive Expansion");
    expect(projection.expressionName).toBe("WONDER_02_CuriousGaze");
    expect(projection.avatarExpression).toBe("curious");
    expect(projection.intensity).toBeGreaterThan(0.35);
  });

  it("infers entropy-threshold awe from high arousal and neutral valence", () => {
    const projection = projectDTEchoCognitiveState({
      arousal: 0.92,
      valence: 0,
      salience: 0.82,
    });

    expect(projection.selectedMode).toBe("Entropy Threshold");
    expect(projection.avatarExpression).toBe("surprised");
    expect(projection.cubism[PARAM_IDS.PARAM_EYE_L_OPEN]).toBeLessThanOrEqual(
      1.2,
    );
    expect(projection.emotionalState.surprise).toBeGreaterThanOrEqual(0.5);
  });

  it("projects scientific-genius activation into a luminous inference expression", () => {
    const projection = projectDTEchoCognitiveState({
      scientificGenius: 0.74,
      insightPotential: 0.7,
      entelechyScore: 0.66,
      selfAwareness: 0.82,
      phi: 0.78,
      flow: 0.76,
      freeEnergy: 0.42,
    });

    expect(DTE_EXPRESSION_MAP["Scientific Genius"]).toBe(
      "GENIUS_01_LuminousInference",
    );
    expect(projection.selectedMode).toBe("Scientific Genius");
    expect(projection.expressionName).toBe("GENIUS_01_LuminousInference");
    expect(projection.avatarExpression).toBe("focused");
    expect(projection.emotionalState.insight).toBeGreaterThan(0.7);
    expect(projection.cubism[PARAM_IDS.PARAM_BODY_ANGLE_Y]).toBeGreaterThan(2);
    expect(projection.geniusResonance.activation).toBeGreaterThan(0.65);
    expect(projection.geniusResonance.haloPulseHz).toBeGreaterThan(2);
  });

  it("adds DAO/ESN autognosis resonance to scientific-genius pose dynamics", () => {
    const projection = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      scientificGenius: 0.9,
      daoConsensus: 0.88,
      esnCoherence: 0.92,
      autognosisResonance: 0.86,
      freeEnergy: 0.28,
    });

    expect(projection.geniusResonance.description).toContain("ESN Autognosis");
    expect(projection.geniusResonance.daoConsensus).toBeCloseTo(0.88);
    expect(projection.geniusResonance.esnCoherence).toBeCloseTo(0.92);
    expect(projection.cubism[PARAM_IDS.PARAM_ANGLE_X]).toBeGreaterThan(1.5);
    expect(projection.cubism[PARAM_IDS.PARAM_BODY_ANGLE_Z]).toBeGreaterThan(1);
  });

  it("embodies counter-predicted evidence as bounded epistemic surprise", () => {
    const baseline = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      arousal: 0.4,
      causalRigor: 0.8,
      falsificationPressure: 0.7,
      epistemicSurprise: 0,
    });
    const surprised = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      arousal: 0.4,
      causalRigor: 0.8,
      falsificationPressure: 0.7,
      epistemicSurprise: 0.9,
    });

    expect(surprised.emotionalState.surprise).toBeCloseTo(0.9);
    expect(surprised.emotionalState.rigor).toBeGreaterThan(0.4);
    expect(surprised.cubism[PARAM_IDS.PARAM_EYE_L_OPEN]).toBeGreaterThan(
      baseline.cubism[PARAM_IDS.PARAM_EYE_L_OPEN],
    );
    expect(surprised.cubism[PARAM_IDS.PARAM_BROW_L_Y]).toBeGreaterThan(
      baseline.cubism[PARAM_IDS.PARAM_BROW_L_Y],
    );
    expect(surprised.cubism[PARAM_IDS.PARAM_EYE_L_OPEN]).toBeLessThanOrEqual(
      1.2,
    );
  });

  it("uses evidence-specific DAO consensus in genius resonance", () => {
    const projection = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      daoConsensus: 0.25,
      daoEvidenceConsensus: 0.91,
      scientificGenius: 0.8,
    });

    expect(projection.geniusResonance.daoConsensus).toBeCloseTo(0.91);
  });

  it("embodies measured self-model uncertainty as a bounded self-evaluative posture", () => {
    const grounded = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      arousal: 0.5,
      embodimentAccuracy: 0.95,
      embodimentConfidence: 1,
    });
    const uncertain = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      arousal: 0.5,
      embodimentAccuracy: 0.2,
      embodimentConfidence: 1,
    });

    expect(grounded.geniusResonance.embodimentGrounding).toBeCloseTo(0.95);
    expect(uncertain.geniusResonance.embodimentUncertainty).toBeCloseTo(0.8);
    expect(uncertain.geniusResonance.description).toContain(
      "Embodiment calibration",
    );
    expect(uncertain.cubism[PARAM_IDS.PARAM_ANGLE_Y]).toBeLessThan(
      grounded.cubism[PARAM_IDS.PARAM_ANGLE_Y],
    );
    expect(uncertain.cubism[PARAM_IDS.PARAM_BROW_L_Y]).toBeLessThan(
      grounded.cubism[PARAM_IDS.PARAM_BROW_L_Y],
    );
    expect(uncertain.cubism[PARAM_IDS.PARAM_EYE_L_OPEN]).toBeGreaterThanOrEqual(
      0.45,
    );
  });

  it("keeps embodiment influence neutral before rendered evidence matures", () => {
    const coldStart = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      embodimentAccuracy: 0,
      embodimentConfidence: 0,
    });

    expect(coldStart.geniusResonance.embodimentGrounding).toBeCloseTo(0.5);
    expect(coldStart.geniusResonance.embodimentUncertainty).toBe(0);
  });

  it("projects speaking state into lip sync and open-vowel expression", () => {
    const projection = projectDTEchoCognitiveState({
      isSpeaking: true,
      audioLevel: 0.67,
      arousal: 0.5,
    });

    expect(projection.selectedMode).toBe("Speaking");
    expect(projection.expressionName).toBe("SPEAK_01_OpenVowel");
    expect(projection.lipSyncLevel).toBeCloseTo(0.67);
    expect(projection.cubism[PARAM_IDS.PARAM_MOUTH_OPEN_Y]).toBeGreaterThan(
      0.5,
    );
  });

  it("keeps generated Cubism parameters in renderer-safe ranges", () => {
    const projection = projectDTEchoCognitiveState({
      mode: "Self-Reference Point",
      arousal: 1,
      selfAwareness: 1,
      phi: 0,
      flow: 1,
      audioLevel: 1,
    });

    expect(projection.cubism[PARAM_IDS.PARAM_ANGLE_Z]).toBeLessThanOrEqual(10);
    expect(projection.cubism[PARAM_IDS.PARAM_ANGLE_Z]).toBeGreaterThanOrEqual(
      -10,
    );
    expect(projection.cubism[PARAM_IDS.PARAM_MOUTH_OPEN_Y]).toBeLessThanOrEqual(
      1,
    );
    expect(projection.intensity).toBeLessThanOrEqual(1);
  });
});

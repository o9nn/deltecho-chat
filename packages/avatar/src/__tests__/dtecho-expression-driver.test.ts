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

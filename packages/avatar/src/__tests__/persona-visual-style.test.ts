import { projectDTEchoCognitiveState } from "../dtecho-expression-driver";
import { PARAM_IDS } from "../adapters/pixi-live2d-renderer";
import {
  applyPersonaVisualStyle,
  LUCY_VISUAL_ETHICS,
} from "../persona-visual-style";

const genuineMood = { mode: "Idle", valence: 0.8, arousal: 0.7 };

describe("opt-in Lucy-inspired visual style", () => {
  it("keeps canonical projection by reference unless adult opt-in is explicit", () => {
    const base = projectDTEchoCognitiveState(genuineMood);
    expect(
      applyPersonaVisualStyle(base, {
        ...genuineMood,
        presentationStyle: "canonical",
        adultSelfAttested: true,
      }),
    ).toBe(base);
    expect(
      applyPersonaVisualStyle(base, {
        ...genuineMood,
        presentationStyle: "lucy-inspired",
      }),
    ).toBe(base);
  });

  it("does not invent expression when mood is neutral, absent, or negative", () => {
    const base = projectDTEchoCognitiveState({ mode: "Idle" });
    for (const valence of [undefined, 0, -0.7]) {
      expect(
        applyPersonaVisualStyle(base, {
          valence,
          arousal: 0.9,
          presentationStyle: "lucy-inspired",
          adultSelfAttested: true,
        }),
      ).toBe(base);
    }
  });

  it("only makes small bounded face and head changes from actual positive affect", () => {
    const base = projectDTEchoCognitiveState(genuineMood);
    const styled = applyPersonaVisualStyle(base, {
      ...genuineMood,
      presentationStyle: "lucy-inspired",
      adultSelfAttested: true,
    });
    expect(styled).not.toBe(base);
    expect(styled.cubism[PARAM_IDS.PARAM_MOUTH_FORM]).toBeGreaterThan(
      base.cubism[PARAM_IDS.PARAM_MOUTH_FORM] ?? 0,
    );
    expect(
      styled.cubism[PARAM_IDS.PARAM_MOUTH_FORM] -
        (base.cubism[PARAM_IDS.PARAM_MOUTH_FORM] ?? 0),
    ).toBeLessThanOrEqual(0.09);
    expect(
      styled.cubism[PARAM_IDS.PARAM_BROW_R_Y] -
        (base.cubism[PARAM_IDS.PARAM_BROW_R_Y] ?? 0),
    ).toBeLessThanOrEqual(0.07);
    expect(
      styled.cubism[PARAM_IDS.PARAM_ANGLE_Z] -
        (base.cubism[PARAM_IDS.PARAM_ANGLE_Z] ?? 0),
    ).toBeLessThanOrEqual(1.2);
    const { cubism: _baseFace, ...baseCognition } = base;
    const { cubism: _styledFace, ...styledCognition } = styled;
    expect(styledCognition).toEqual(baseCognition);
    expect(base.cubism[PARAM_IDS.PARAM_MOUTH_FORM]).not.toBe(
      styled.cubism[PARAM_IDS.PARAM_MOUTH_FORM],
    );
  });

  it("abstains during any scientific activation, crystal, or eureka cue", () => {
    const base = projectDTEchoCognitiveState(genuineMood);
    const optedIn = {
      ...genuineMood,
      presentationStyle: "lucy-inspired" as const,
      adultSelfAttested: true,
    };
    expect(
      applyPersonaVisualStyle(base, { ...optedIn, scientificGenius: 0.2 }),
    ).toBe(base);
    expect(
      applyPersonaVisualStyle(base, { ...optedIn, predictiveCrystal: {} }),
    ).toBe(base);
    expect(
      applyPersonaVisualStyle(base, { ...optedIn, resonanceCascade: {} }),
    ).toBe(base);
    const science = projectDTEchoCognitiveState({
      mode: "Scientific Genius",
      scientificGenius: 0.9,
    });
    expect(applyPersonaVisualStyle(science, optedIn)).toBe(science);
  });

  it("makes its immutable ethics and non-explicit ceiling inspectable", () => {
    expect(Object.isFrozen(LUCY_VISUAL_ETHICS)).toBe(true);
    expect(LUCY_VISUAL_ETHICS).toEqual({
      noActualHarm: 1,
      respectBoundaries: 1,
      constructiveExpression: 1,
      explicitContent: false,
    });
  });
});

import { PARAM_IDS } from "./adapters/pixi-live2d-renderer";
import type {
  DTEchoProjectionInput,
  DTEchoVisualProjection,
} from "./dtecho-expression-driver";

export type AvatarPresentationStyle = "canonical" | "lucy-inspired";

export const LUCY_VISUAL_ETHICS = Object.freeze({
  noActualHarm: 1,
  respectBoundaries: 1,
  constructiveExpression: 1,
  explicitContent: false,
});

/**
 * A bounded presentation filter over DTE's actual projection. This is not a
 * Lucy model, language backend, endocrine sample, or alternative core self.
 */
export function applyPersonaVisualStyle(
  projection: DTEchoVisualProjection,
  input: DTEchoProjectionInput & {
    presentationStyle?: AvatarPresentationStyle;
    adultSelfAttested?: boolean;
    predictiveCrystal?: unknown;
    resonanceCascade?: unknown;
  },
): DTEchoVisualProjection {
  if (
    input.presentationStyle !== "lucy-inspired" ||
    input.adultSelfAttested !== true ||
    projection.selectedMode === "Scientific Genius" ||
    projection.cognitiveMode === "GENIUS" ||
    input.predictiveCrystal ||
    input.resonanceCascade ||
    (input.scientificGenius ?? 0) > 0
  ) {
    return projection;
  }

  // No mood data means no invented smile. Only existing affect may be styled.
  const valence = Math.max(0, Math.min(1, input.valence ?? 0));
  const arousal = Math.max(0, Math.min(1, input.arousal ?? 0));
  const playfulness = valence * arousal;
  if (!Number.isFinite(playfulness) || playfulness < 0.05) return projection;

  const clamp = (value: number, low: number, high: number) =>
    Math.max(low, Math.min(high, value));
  return {
    ...projection,
    cubism: {
      ...projection.cubism,
      [PARAM_IDS.PARAM_MOUTH_FORM]: clamp(
        (projection.cubism[PARAM_IDS.PARAM_MOUTH_FORM] ?? 0) +
          playfulness * 0.09,
        -1,
        1,
      ),
      [PARAM_IDS.PARAM_BROW_R_Y]: clamp(
        (projection.cubism[PARAM_IDS.PARAM_BROW_R_Y] ?? 0) + playfulness * 0.07,
        -1,
        1,
      ),
      [PARAM_IDS.PARAM_ANGLE_Z]: clamp(
        (projection.cubism[PARAM_IDS.PARAM_ANGLE_Z] ?? 0) + playfulness * 1.2,
        -10,
        10,
      ),
    },
  };
}

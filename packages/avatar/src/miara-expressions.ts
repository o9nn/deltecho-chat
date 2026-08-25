/**
 * Cubism expression files shipped with the official Miara mesh.
 * Names match FileReferences.Expressions in miara_pro_t03.model3.json.
 */

import type { Expression } from "./types";

export const MIARA_CUBISM_EXPRESSION_NAMES = [
  "JOY_01_BroadSmile",
  "JOY_02_Laughing",
  "JOY_03_GentleSmile",
  "JOY_05_Blissful",
  "NEUTRAL_Reset",
  "PHOTO_Awe",
  "PHOTO_ExuberantLaugh",
  "PHOTO_UpwardGaze",
  "SADNESS_01_Melancholy",
  "SPEAK_01_OpenVowel",
  "SURPRISE_01_Startled",
  "WONDER_02_CuriousGaze",
  "WONDER_03_Contemplative",
] as const;

export type MiaraCubismExpressionName =
  (typeof MIARA_CUBISM_EXPRESSION_NAMES)[number];

export const MIARA_EXPRESSION_MAP: Record<
  Expression,
  MiaraCubismExpressionName
> = {
  neutral: "NEUTRAL_Reset",
  happy: "JOY_01_BroadSmile",
  thinking: "WONDER_03_Contemplative",
  curious: "WONDER_02_CuriousGaze",
  surprised: "SURPRISE_01_Startled",
  concerned: "SADNESS_01_Melancholy",
  focused: "PHOTO_UpwardGaze",
  playful: "JOY_02_Laughing",
  contemplative: "JOY_05_Blissful",
  empathetic: "JOY_03_GentleSmile",
};

export function isMiaraCubismExpressionName(
  value: unknown,
): value is MiaraCubismExpressionName {
  return (
    typeof value === "string" &&
    (MIARA_CUBISM_EXPRESSION_NAMES as readonly string[]).includes(value)
  );
}

export function cubismExpressionFile(name: MiaraCubismExpressionName): string {
  return `expressions/${name}.exp3.json`;
}

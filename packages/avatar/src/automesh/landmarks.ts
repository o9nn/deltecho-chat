import {
  AUTOMESH_LANDMARK_IDS,
  type AutomeshLandmark,
  type AutomeshLandmarkId,
} from "./types";

/**
 * Default Melody / chest-up portrait landmarks.
 * Source points match a typical cyberpunk head-and-shoulders still
 * (face dominant, tech collar, headphone ears). Atlas points start as
 * a neutral face layout and are overwritten by live drawable inspection.
 */
export const MELODY_AUTOMESH_LANDMARKS: readonly AutomeshLandmark[] = [
  {
    id: "eyeL",
    label: "Left eye",
    source: { x: 0.45, y: 0.145 },
    atlas: { x: 0.34, y: 0.3 },
    drawableHints: ["eyel", "eye_l", "parteye"],
  },
  {
    id: "eyeR",
    label: "Right eye",
    source: { x: 0.55, y: 0.145 },
    atlas: { x: 0.46, y: 0.3 },
    drawableHints: ["eyer", "eye_r", "parteye"],
  },
  {
    id: "browL",
    label: "Left brow",
    source: { x: 0.44, y: 0.12 },
    atlas: { x: 0.33, y: 0.24 },
    drawableHints: ["browl", "brow_l", "partbrow"],
  },
  {
    id: "browR",
    label: "Right brow",
    source: { x: 0.56, y: 0.12 },
    atlas: { x: 0.47, y: 0.24 },
    drawableHints: ["browr", "brow_r", "partbrow"],
  },
  {
    id: "nose",
    label: "Nose",
    source: { x: 0.5, y: 0.165 },
    atlas: { x: 0.4, y: 0.36 },
    drawableHints: ["nose", "partface"],
  },
  {
    id: "mouth",
    label: "Mouth",
    source: { x: 0.5, y: 0.185 },
    atlas: { x: 0.4, y: 0.44 },
    drawableHints: ["mouth", "partmouth"],
  },
  {
    id: "chin",
    label: "Chin",
    source: { x: 0.5, y: 0.205 },
    atlas: { x: 0.4, y: 0.52 },
    drawableHints: ["face", "partface"],
  },
  {
    id: "cheekL",
    label: "Left cheek",
    source: { x: 0.43, y: 0.17 },
    atlas: { x: 0.3, y: 0.38 },
    drawableHints: ["face", "partface"],
  },
  {
    id: "cheekR",
    label: "Right cheek",
    source: { x: 0.57, y: 0.17 },
    atlas: { x: 0.5, y: 0.38 },
    drawableHints: ["face", "partface"],
  },
  {
    id: "hairline",
    label: "Hairline",
    source: { x: 0.5, y: 0.08 },
    atlas: { x: 0.4, y: 0.16 },
    drawableHints: ["hairfront", "parthairfront"],
  },
  {
    id: "hairL",
    label: "Hair left",
    source: { x: 0.38, y: 0.16 },
    atlas: { x: 0.22, y: 0.32 },
    drawableHints: ["hairl", "hair_l", "parthairl", "parthairsidel"],
  },
  {
    id: "hairR",
    label: "Hair right",
    source: { x: 0.62, y: 0.16 },
    atlas: { x: 0.58, y: 0.32 },
    drawableHints: ["hairr", "hair_r", "parthairr", "parthairsider"],
  },
  {
    id: "earL",
    label: "Left ear / headset",
    source: { x: 0.4, y: 0.155 },
    atlas: { x: 0.24, y: 0.34 },
    drawableHints: ["ear", "hairacc"],
  },
  {
    id: "earR",
    label: "Right ear / headset",
    source: { x: 0.6, y: 0.155 },
    atlas: { x: 0.56, y: 0.34 },
    drawableHints: ["ear", "hairacc"],
  },
  {
    id: "collar",
    label: "Collar",
    source: { x: 0.5, y: 0.24 },
    atlas: { x: 0.4, y: 0.62 },
    drawableHints: ["body", "upperbody", "partbody"],
  },
  {
    id: "shoulderL",
    label: "Left shoulder",
    source: { x: 0.38, y: 0.28 },
    atlas: { x: 0.32, y: 0.68 },
    drawableHints: ["arml", "partarml"],
  },
  {
    id: "shoulderR",
    label: "Right shoulder",
    source: { x: 0.62, y: 0.28 },
    atlas: { x: 0.48, y: 0.68 },
    drawableHints: ["armr", "partarmr"],
  },
  {
    id: "handL",
    label: "Left hand",
    source: { x: 0.28, y: 0.46 },
    atlas: { x: 0.26, y: 0.78 },
    drawableHints: ["handl", "parthandl"],
  },
  {
    id: "handR",
    label: "Right hand",
    source: { x: 0.72, y: 0.46 },
    atlas: { x: 0.54, y: 0.78 },
    drawableHints: ["handr", "parthandr"],
  },
  {
    id: "hipL",
    label: "Left hip",
    source: { x: 0.44, y: 0.52 },
    atlas: { x: 0.36, y: 0.82 },
    drawableHints: ["legl", "partlegl", "lowerbody"],
  },
  {
    id: "hipR",
    label: "Right hip",
    source: { x: 0.56, y: 0.52 },
    atlas: { x: 0.44, y: 0.82 },
    drawableHints: ["legr", "partlegr", "lowerbody"],
  },
  {
    id: "footL",
    label: "Left foot",
    source: { x: 0.42, y: 0.92 },
    atlas: { x: 0.36, y: 0.94 },
    drawableHints: ["legl", "partlegl"],
  },
  {
    id: "footR",
    label: "Right foot",
    source: { x: 0.58, y: 0.92 },
    atlas: { x: 0.44, y: 0.94 },
    drawableHints: ["legr", "partlegr"],
  },
];

/** Face-first defaults for a chest-up still. Full-body Melody uses the standing set. */
const PORTRAIT_SOURCES: Record<string, { x: number; y: number }> = {
  eyeL: { x: 0.38, y: 0.4 },
  eyeR: { x: 0.62, y: 0.4 },
  browL: { x: 0.36, y: 0.34 },
  browR: { x: 0.64, y: 0.34 },
  nose: { x: 0.5, y: 0.48 },
  mouth: { x: 0.5, y: 0.56 },
  chin: { x: 0.5, y: 0.66 },
  cheekL: { x: 0.32, y: 0.5 },
  cheekR: { x: 0.68, y: 0.5 },
  hairline: { x: 0.5, y: 0.22 },
  hairL: { x: 0.18, y: 0.42 },
  hairR: { x: 0.82, y: 0.42 },
  earL: { x: 0.22, y: 0.44 },
  earR: { x: 0.78, y: 0.44 },
  collar: { x: 0.5, y: 0.74 },
};

export const MELODY_PORTRAIT_LANDMARKS: readonly AutomeshLandmark[] =
  MELODY_AUTOMESH_LANDMARKS.filter((item) => PORTRAIT_SOURCES[item.id]).map(
    (item) => ({
      ...item,
      source: { ...PORTRAIT_SOURCES[item.id]! },
      atlas: { ...item.atlas },
      drawableHints: [...item.drawableHints],
    }),
  );

export function cloneMelodyLandmarks(): AutomeshLandmark[] {
  return MELODY_AUTOMESH_LANDMARKS.map((item) => ({
    ...item,
    source: { ...item.source },
    atlas: { ...item.atlas },
    drawableHints: [...item.drawableHints],
  }));
}

export function isAutomeshLandmarkId(
  value: unknown,
): value is AutomeshLandmarkId {
  return (
    typeof value === "string" &&
    (AUTOMESH_LANDMARK_IDS as readonly string[]).includes(value)
  );
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function sanitizePoint(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const point = value as { x?: unknown; y?: unknown };
  if (typeof point.x !== "number" || typeof point.y !== "number") return null;
  return { x: clamp01(point.x), y: clamp01(point.y) };
}

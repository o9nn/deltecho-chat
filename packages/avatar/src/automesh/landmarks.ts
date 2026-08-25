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
    source: { x: 0.38, y: 0.4 },
    atlas: { x: 0.34, y: 0.3 },
    drawableHints: ["eyel", "eye_l", "parteye"],
  },
  {
    id: "eyeR",
    label: "Right eye",
    source: { x: 0.62, y: 0.4 },
    atlas: { x: 0.46, y: 0.3 },
    drawableHints: ["eyer", "eye_r", "parteye"],
  },
  {
    id: "browL",
    label: "Left brow",
    source: { x: 0.36, y: 0.34 },
    atlas: { x: 0.33, y: 0.24 },
    drawableHints: ["browl", "brow_l", "partbrow"],
  },
  {
    id: "browR",
    label: "Right brow",
    source: { x: 0.64, y: 0.34 },
    atlas: { x: 0.47, y: 0.24 },
    drawableHints: ["browr", "brow_r", "partbrow"],
  },
  {
    id: "nose",
    label: "Nose",
    source: { x: 0.5, y: 0.48 },
    atlas: { x: 0.4, y: 0.36 },
    drawableHints: ["nose", "partface"],
  },
  {
    id: "mouth",
    label: "Mouth",
    source: { x: 0.5, y: 0.56 },
    atlas: { x: 0.4, y: 0.44 },
    drawableHints: ["mouth", "partmouth"],
  },
  {
    id: "chin",
    label: "Chin",
    source: { x: 0.5, y: 0.66 },
    atlas: { x: 0.4, y: 0.52 },
    drawableHints: ["face", "partface"],
  },
  {
    id: "cheekL",
    label: "Left cheek",
    source: { x: 0.32, y: 0.5 },
    atlas: { x: 0.3, y: 0.38 },
    drawableHints: ["face", "partface"],
  },
  {
    id: "cheekR",
    label: "Right cheek",
    source: { x: 0.68, y: 0.5 },
    atlas: { x: 0.5, y: 0.38 },
    drawableHints: ["face", "partface"],
  },
  {
    id: "hairline",
    label: "Hairline",
    source: { x: 0.5, y: 0.22 },
    atlas: { x: 0.4, y: 0.16 },
    drawableHints: ["hairfront", "parthairfront"],
  },
  {
    id: "hairL",
    label: "Hair left",
    source: { x: 0.18, y: 0.42 },
    atlas: { x: 0.22, y: 0.32 },
    drawableHints: ["hairl", "hair_l", "parthairl", "parthairsidel"],
  },
  {
    id: "hairR",
    label: "Hair right",
    source: { x: 0.82, y: 0.42 },
    atlas: { x: 0.58, y: 0.32 },
    drawableHints: ["hairr", "hair_r", "parthairr", "parthairsider"],
  },
  {
    id: "earL",
    label: "Left ear / headset",
    source: { x: 0.22, y: 0.44 },
    atlas: { x: 0.24, y: 0.34 },
    drawableHints: ["ear", "hairacc"],
  },
  {
    id: "earR",
    label: "Right ear / headset",
    source: { x: 0.78, y: 0.44 },
    atlas: { x: 0.56, y: 0.34 },
    drawableHints: ["ear", "hairacc"],
  },
  {
    id: "collar",
    label: "Collar",
    source: { x: 0.5, y: 0.74 },
    atlas: { x: 0.4, y: 0.62 },
    drawableHints: ["body", "upperbody", "partbody"],
  },
];

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

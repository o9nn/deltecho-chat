import { cloneMelodyLandmarks } from "./landmarks";
import { MELODY_PARAMETER_PROFILE } from "./parameters";
import { assignAtlasFromDrawables } from "./inspect";
import { mapPoint } from "./warp";
import {
  AUTOMESH_MAPPING_VERSION,
  type AutomeshDrawable,
  type AutomeshLandmark,
  type AutomeshMapping,
  type Point2,
  type SimilarityTransform,
} from "./types";

/**
 * Least-squares similarity transform that lines a photo up to atlas points.
 */
export function fitSimilarity(
  source: readonly Point2[],
  dest: readonly Point2[],
): SimilarityTransform {
  const count = Math.min(source.length, dest.length);
  if (count === 0) {
    return { scale: 1, rotation: 0, tx: 0, ty: 0 };
  }

  let srcMx = 0;
  let srcMy = 0;
  let dstMx = 0;
  let dstMy = 0;
  for (let index = 0; index < count; index++) {
    srcMx += source[index]?.x ?? 0;
    srcMy += source[index]?.y ?? 0;
    dstMx += dest[index]?.x ?? 0;
    dstMy += dest[index]?.y ?? 0;
  }
  srcMx /= count;
  srcMy /= count;
  dstMx /= count;
  dstMy /= count;

  let norm = 0;
  let real = 0;
  let imag = 0;
  for (let index = 0; index < count; index++) {
    const sx = (source[index]?.x ?? 0) - srcMx;
    const sy = (source[index]?.y ?? 0) - srcMy;
    const dx = (dest[index]?.x ?? 0) - dstMx;
    const dy = (dest[index]?.y ?? 0) - dstMy;
    norm += sx * sx + sy * sy;
    real += sx * dx + sy * dy;
    imag += sx * dy - sy * dx;
  }

  const scale = norm > 0 ? Math.hypot(real, imag) / norm : 1;
  const rotation = Math.atan2(imag, real);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    scale,
    rotation,
    tx: dstMx - scale * (cos * srcMx - sin * srcMy),
    ty: dstMy - scale * (sin * srcMx + cos * srcMy),
  };
}

export function applySimilarity(
  transform: SimilarityTransform,
  point: Point2,
): Point2 {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: transform.scale * (cos * point.x - sin * point.y) + transform.tx,
    y: transform.scale * (sin * point.x + cos * point.y) + transform.ty,
  };
}

export function mappingResidual(
  landmarks: readonly AutomeshLandmark[],
): number {
  if (landmarks.length === 0) return 0;
  let sum = 0;
  for (const landmark of landmarks) {
    const mapped = mapPoint(landmarks, landmark.source, "sourceToAtlas");
    const dx = mapped.x - landmark.atlas.x;
    const dy = mapped.y - landmark.atlas.y;
    sum += dx * dx + dy * dy;
  }
  return Math.sqrt(sum / landmarks.length);
}

export function trainAutomeshMapping(input: {
  identity?: string;
  landmarks?: readonly AutomeshLandmark[];
  drawables?: readonly AutomeshDrawable[];
  figure?: { x: number; y: number; width: number; height: number };
}): AutomeshMapping {
  const base = input.landmarks?.length
    ? input.landmarks.map((item) => ({
        ...item,
        source: { ...item.source },
        atlas: { ...item.atlas },
        drawableHints: [...item.drawableHints],
      }))
    : cloneMelodyLandmarks();

  const landmarks = input.drawables?.length
    ? assignAtlasFromDrawables(base, input.drawables, input.figure)
    : base;

  return {
    version: AUTOMESH_MAPPING_VERSION,
    identity: input.identity ?? "melody",
    landmarks,
    residual: mappingResidual(landmarks),
    trainedAt: Date.now(),
    parameters:
      (input.identity ?? "melody") === "melody"
        ? { ...MELODY_PARAMETER_PROFILE }
        : undefined,
  };
}

export function resolveAutomeshMapping(value: unknown): AutomeshMapping | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<AutomeshMapping>;
  if (raw.version !== AUTOMESH_MAPPING_VERSION) return null;
  if (!Array.isArray(raw.landmarks) || raw.landmarks.length === 0) return null;
  const trained = trainAutomeshMapping({
    identity: typeof raw.identity === "string" ? raw.identity : "melody",
    landmarks: raw.landmarks as AutomeshLandmark[],
  });
  if (typeof raw.residual === "number") trained.residual = raw.residual;
  if (typeof raw.trainedAt === "number") trained.trainedAt = raw.trainedAt;
  return trained;
}

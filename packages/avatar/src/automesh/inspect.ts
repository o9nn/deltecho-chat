import type { AutomeshDrawable, AutomeshLandmark, Point2 } from "./types";

export function normalizeDrawableId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function drawableMatchesHints(
  drawableId: string,
  hints: readonly string[],
): boolean {
  const normalized = normalizeDrawableId(drawableId);
  return hints.some((hint) => normalized.includes(normalizeDrawableId(hint)));
}

export function boundsCentroid(drawable: AutomeshDrawable): Point2 {
  return {
    x: drawable.bounds.x + drawable.bounds.width / 2,
    y: drawable.bounds.y + drawable.bounds.height / 2,
  };
}

/**
 * Pull atlas coordinates from a live Cubism inspect when a drawable
 * matches the landmark's hints. Prefer UV centroids; fall back to
 * normalized figure-space bounds.
 */
export function assignAtlasFromDrawables(
  landmarks: readonly AutomeshLandmark[],
  drawables: readonly AutomeshDrawable[],
  figure?: { x: number; y: number; width: number; height: number },
): AutomeshLandmark[] {
  const figureWidth = figure?.width || 1;
  const figureHeight = figure?.height || 1;
  const figureX = figure?.x ?? 0;
  const figureY = figure?.y ?? 0;

  return landmarks.map((landmark) => {
    const match = drawables.find((drawable) =>
      drawableMatchesHints(drawable.id, landmark.drawableHints),
    );
    if (!match) return { ...landmark, source: { ...landmark.source } };

    const atlas = match.uvCentroid
      ? { ...match.uvCentroid }
      : {
          x: (boundsCentroid(match).x - figureX) / figureWidth,
          y: (boundsCentroid(match).y - figureY) / figureHeight,
        };

    return {
      ...landmark,
      source: { ...landmark.source },
      atlas: {
        x: clampUnit(atlas.x),
        y: clampUnit(atlas.y),
      },
      drawableHints: [...landmark.drawableHints],
    };
  });
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function uvCentroid(uvs: ArrayLike<number>): Point2 | undefined {
  if (uvs.length < 2) return undefined;
  let x = 0;
  let y = 0;
  const count = Math.floor(uvs.length / 2);
  for (let index = 0; index < count; index++) {
    x += uvs[index * 2] ?? 0;
    y += uvs[index * 2 + 1] ?? 0;
  }
  return { x: x / count, y: y / count };
}

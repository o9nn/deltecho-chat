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

export function isGenericArtMeshId(id: string): boolean {
  return /^artmesh\d*$/i.test(normalizeDrawableId(id));
}

export function uvIsland(uvs?: ArrayLike<number>): {
  minU: number;
  minV: number;
  maxU: number;
  maxV: number;
  cx: number;
  cy: number;
  area: number;
} | null {
  if (!uvs || uvs.length < 2) return null;
  let minU = 1;
  let minV = 1;
  let maxU = 0;
  let maxV = 0;
  const count = Math.floor(uvs.length / 2);
  for (let index = 0; index < count; index++) {
    const u = uvs[index * 2] ?? 0;
    const v = uvs[index * 2 + 1] ?? 0;
    minU = Math.min(minU, u);
    minV = Math.min(minV, v);
    maxU = Math.max(maxU, u);
    maxV = Math.max(maxV, v);
  }
  return {
    minU,
    minV,
    maxU,
    maxV,
    cx: (minU + maxU) / 2,
    cy: (minV + maxV) / 2,
    area: Math.max(0, maxU - minU) * Math.max(0, maxV - minV),
  };
}

/**
 * Official Miara atlas packs the body in the upper-left. Water, lagoon
 * background, and large effect sheets live in the right and lower islands.
 * Drawable ids on this model are generic ArtMeshN, so name hints cannot
 * skip those sheets.
 */
export function isEnvironmentDrawable(drawable: AutomeshDrawable): boolean {
  if (/water|background|sparkle|\bbg\b/i.test(drawable.id)) return true;
  const island = uvIsland(drawable.uvs);
  if (!island) return false;
  if (island.cx > 0.5 && island.area > 0.03) return true;
  if (island.cy > 0.58 && island.area > 0.03) return true;
  return false;
}

export function drawableModelBounds(drawable: AutomeshDrawable): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const positions = drawable.positions;
  if (positions && positions.length >= 6) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const count = Math.floor(positions.length / 2);
    for (let index = 0; index < count; index++) {
      const x = positions[index * 2] ?? 0;
      const y = positions[index * 2 + 1] ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (Number.isFinite(minX) && maxX > minX && maxY > minY) {
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }
  const { x, y, width, height } = drawable.bounds;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

export function unionDrawableBounds(
  drawables: readonly AutomeshDrawable[],
): { x: number; y: number; width: number; height: number } | null {
  const boxes = drawables
    .map((item) => drawableModelBounds(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function figureFromDrawables(
  drawables: readonly AutomeshDrawable[],
): { x: number; y: number; width: number; height: number } | null {
  const character = drawables.filter((item) => !isEnvironmentDrawable(item));
  const boxes = (character.length ? character : drawables)
    .map((item) => drawableModelBounds(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (!boxes.length) return null;

  const areas = boxes
    .map((box) => box.width * box.height)
    .sort((left, right) => left - right);
  const medianArea = areas[Math.floor(areas.length / 2)] ?? 0;
  const compact = boxes.filter(
    (box) => box.width * box.height <= Math.max(medianArea * 24, 1),
  );
  const used = compact.length ? compact : boxes;
  const mid = (values: number[]) => {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  const medianX = mid(used.map((box) => box.x + box.width / 2));
  const spanX =
    Math.max(...used.map((box) => box.x + box.width)) -
    Math.min(...used.map((box) => box.x));
  const column = used.filter(
    (box) => Math.abs(box.x + box.width / 2 - medianX) <= Math.max(spanX * 0.42, 0.05),
  );
  const union = unionDrawableBounds(
    (column.length ? column : used).map((box) => ({
      id: "cluster",
      bounds: box,
    })),
  );
  if (!union) return null;
  const padX = union.width * 0.08;
  const padY = union.height * 0.08;
  return {
    x: union.x - padX,
    y: union.y - padY,
    width: union.width + padX * 2,
    height: union.height + padY * 2,
  };
}

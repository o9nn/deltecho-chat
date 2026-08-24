/**
 * Visual figure bounds for Live2D contain-fit.
 *
 * Cubism canvases are larger than the standing character. Water, lights,
 * hit-areas, and other scene planes inflate a naive union of drawables so
 * the figure only fills about half the strip. Measure the character cluster
 * instead, then pad slightly so hair and feet stay on screen.
 */

export const FIGURE_BOUNDS_PAD = 1.06;

const IGNORED_DRAWABLE_ID =
  /hitarea|water|background|\bbg\b|light|sparkle|reflect/i;

export type DrawableBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AxisAlignedBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function isUsableBox(box: DrawableBox): boolean {
  return (
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    box.width > 1 &&
    box.height > 1
  );
}

export function isIgnoredDrawableId(id: string): boolean {
  return IGNORED_DRAWABLE_ID.test(id);
}

export function isScenePlaneDrawable(
  box: DrawableBox,
  canvas: { width: number; height: number },
): boolean {
  const canvasArea = canvas.width * canvas.height;
  if (canvasArea <= 0) return false;
  const area = box.width * box.height;
  if (area >= canvasArea * 0.28) return true;
  return box.width >= canvas.width * 0.62 && box.height >= canvas.height * 0.12;
}

function unionBoxes(boxes: DrawableBox[]): AxisAlignedBounds | null {
  if (!boxes.length) return null;
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

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * AABB of the standing figure, excluding canvas-sized scene decoration.
 */
export function measureFigureBounds(
  drawables: DrawableBox[],
  canvas: { width: number; height: number },
): AxisAlignedBounds | null {
  const usable = drawables.filter(isUsableBox);
  const namedFigure = usable.filter((box) => !isIgnoredDrawableId(box.id));
  const withoutPlanes = (namedFigure.length ? namedFigure : usable).filter(
    (box) => !isScenePlaneDrawable(box, canvas),
  );
  const candidates = withoutPlanes.length
    ? withoutPlanes
    : namedFigure.length
      ? namedFigure
      : usable;
  if (!candidates.length) return null;

  const centers = candidates.map((box) => ({
    box,
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
  }));
  const medianX = median(centers.map((center) => center.cx));
  const medianY = median(centers.map((center) => center.cy));
  const ranked = centers
    .map((center) => ({
      ...center,
      dist: Math.hypot(center.cx - medianX, center.cy - medianY),
    }))
    .sort((a, b) => a.dist - b.dist);
  const keep = Math.max(1, Math.ceil(ranked.length * 0.55));
  const clustered = ranked.slice(0, keep).map((center) => center.box);
  return unionBoxes(clustered.length ? clustered : candidates);
}

/**
 * Visible-pixel AABB from RGBA data. Used to correct Cubism canvas fit
 * after the first real frame, when mesh IDs are unnamed scene planes.
 */
export function measureOpaquePixelBounds(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold = 12,
  step = 2,
): AxisAlignedBounds | null {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) {
    return null;
  }
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const stride = Math.max(1, step);
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha < alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function padFigureBounds(
  bounds: AxisAlignedBounds,
  pad = FIGURE_BOUNDS_PAD,
): AxisAlignedBounds {
  const width = bounds.width * pad;
  const height = bounds.height * pad;
  return {
    x: bounds.x - (width - bounds.width) / 2,
    y: bounds.y - (height - bounds.height) / 2,
    width,
    height,
  };
}

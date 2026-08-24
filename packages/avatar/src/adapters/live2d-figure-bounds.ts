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
  return measureCoreOpaqueBounds(pixels, width, height, alphaThreshold, step);
}

/**
 * AABB of the largest opaque blob. The standing body is that blob;
 * a side fairy / sparkle must not widen the fit and shrink the figure.
 */
export function measureCoreOpaqueBounds(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold = 12,
  step = 2,
): AxisAlignedBounds | null {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) {
    return null;
  }
  const stride = Math.max(1, step);
  const gridWidth = Math.ceil(width / stride);
  const gridHeight = Math.ceil(height / stride);
  const occupied = new Uint8Array(gridWidth * gridHeight);
  for (let y = 0; y < height; y += stride) {
    const gy = Math.floor(y / stride);
    for (let x = 0; x < width; x += stride) {
      if (pixels[(y * width + x) * 4 + 3] < alphaThreshold) continue;
      occupied[gy * gridWidth + Math.floor(x / stride)] = 1;
    }
  }

  const seen = new Uint8Array(occupied.length);
  let bestCount = 0;
  let best: AxisAlignedBounds | null = null;
  const stack: number[] = [];
  for (let start = 0; start < occupied.length; start++) {
    if (!occupied[start] || seen[start]) continue;
    let count = 0;
    let minX = gridWidth;
    let minY = gridHeight;
    let maxX = -1;
    let maxY = -1;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const index = stack.pop() as number;
      count += 1;
      const gx = index % gridWidth;
      const gy = (index - gx) / gridWidth;
      if (gx < minX) minX = gx;
      if (gy < minY) minY = gy;
      if (gx > maxX) maxX = gx;
      if (gy > maxY) maxY = gy;
      const tryPush = (nx: number, ny: number) => {
        if (nx < 0 || ny < 0 || nx >= gridWidth || ny >= gridHeight) return;
        const next = ny * gridWidth + nx;
        if (!occupied[next] || seen[next]) return;
        seen[next] = 1;
        stack.push(next);
      };
      tryPush(gx - 1, gy);
      tryPush(gx + 1, gy);
      tryPush(gx, gy - 1);
      tryPush(gx, gy + 1);
    }
    if (count > bestCount) {
      bestCount = count;
      best = {
        x: minX * stride,
        y: minY * stride,
        width: (maxX - minX + 1) * stride,
        height: (maxY - minY + 1) * stride,
      };
    }
  }
  return best;
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

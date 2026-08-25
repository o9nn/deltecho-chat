import type { AutomeshLandmark, AutomeshRaster, Point2 } from "./types";

const POWER = 2;
const EPSILON = 1e-6;

/**
 * Inverse-distance-weighted map from photo space onto atlas space (or reverse).
 * Editor-style: control points are the mesh-to-art landmarks.
 */
export function mapPoint(
  landmarks: readonly AutomeshLandmark[],
  point: Point2,
  direction: "sourceToAtlas" | "atlasToSource" = "atlasToSource",
): Point2 {
  if (landmarks.length === 0) return { ...point };

  let weightSum = 0;
  let x = 0;
  let y = 0;

  for (const landmark of landmarks) {
    const from =
      direction === "atlasToSource" ? landmark.atlas : landmark.source;
    const to =
      direction === "atlasToSource" ? landmark.source : landmark.atlas;
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < EPSILON) return { ...to };
    const weight = 1 / Math.pow(distanceSq, POWER / 2);
    weightSum += weight;
    x += to.x * weight;
    y += to.y * weight;
  }

  if (weightSum <= 0) return { ...point };
  return { x: x / weightSum, y: y / weightSum };
}

function sampleBilinear(
  raster: AutomeshRaster,
  x: number,
  y: number,
): [number, number, number, number] {
  const maxX = raster.width - 1;
  const maxY = raster.height - 1;
  if (x < 0 || y < 0 || x > maxX || y > maxY) return [0, 0, 0, 0];

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(maxX, x0 + 1);
  const y1 = Math.min(maxY, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;

  const pixel = (px: number, py: number) => {
    const index = (py * raster.width + px) * 4;
    return [
      raster.data[index] ?? 0,
      raster.data[index + 1] ?? 0,
      raster.data[index + 2] ?? 0,
      raster.data[index + 3] ?? 0,
    ] as const;
  };

  const c00 = pixel(x0, y0);
  const c10 = pixel(x1, y0);
  const c01 = pixel(x0, y1);
  const c11 = pixel(x1, y1);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const channels: [number, number, number, number] = [0, 0, 0, 0];
  for (let channel = 0; channel < 4; channel++) {
    const top = mix(c00[channel], c10[channel], tx);
    const bottom = mix(c01[channel], c11[channel], tx);
    channels[channel] = mix(top, bottom, ty);
  }
  return channels;
}

/**
 * Warp a reference portrait onto a Cubism texture atlas using landmark pairs.
 * Atlas pixels that cannot be sampled stay transparent so existing mesh
 * clothing/background can remain from a later composite if desired.
 */
export function warpRasterToAtlas(
  source: AutomeshRaster,
  landmarks: readonly AutomeshLandmark[],
  atlasWidth: number,
  atlasHeight: number,
): AutomeshRaster {
  const width = Math.max(1, Math.floor(atlasWidth));
  const height = Math.max(1, Math.floor(atlasHeight));
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const atlasY = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const atlasX = (x + 0.5) / width;
      const sourcePoint = mapPoint(landmarks, { x: atlasX, y: atlasY });
      const sample = sampleBilinear(
        source,
        sourcePoint.x * (source.width - 1),
        sourcePoint.y * (source.height - 1),
      );
      const index = (y * width + x) * 4;
      data[index] = sample[0];
      data[index + 1] = sample[1];
      data[index + 2] = sample[2];
      data[index + 3] = sample[3];
    }
  }

  return { width, height, data };
}

/**
 * Punch the still's edge-connected backdrop to alpha 0. Interior dark
 * clothing (Melody's skirt) stays opaque so it can paint the atlas.
 */
export function punchOpaqueBackground(
  raster: AutomeshRaster,
  threshold = 18,
): AutomeshRaster {
  const { width, height, data } = raster;
  const next = new Uint8ClampedArray(data);
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const dark = (index: number) =>
    next[index] < threshold &&
    next[index + 1] < threshold &&
    next[index + 2] < threshold;

  const seed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (seen[pixel]) return;
    seen[pixel] = 1;
    if (dark(pixel * 4)) stack.push(pixel);
  };

  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  while (stack.length) {
    const pixel = stack.pop() as number;
    const dest = pixel * 4;
    next[dest] = 0;
    next[dest + 1] = 0;
    next[dest + 2] = 0;
    next[dest + 3] = 0;
    const x = pixel % width;
    const y = (pixel - x) / width;
    seed(x - 1, y);
    seed(x + 1, y);
    seed(x, y - 1);
    seed(x, y + 1);
  }

  return { width, height, data: next };
}

export function rasterToDataUrl(
  raster: AutomeshRaster,
  createCanvas: (width: number, height: number) => {
    getContext: (type: "2d") => CanvasRenderingContext2D | null;
    toDataURL: (type?: string, quality?: number) => string;
  } = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
): string {
  const canvas = createCanvas(raster.width, raster.height);
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(raster.width, raster.height);
  image.data.set(raster.data);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

import { applySimilarity, fitSimilarity } from "./fit";
import { punchOpaqueBackground } from "./warp";
import {
  drawableMatchesHints,
  figureFromDrawables,
  isEnvironmentDrawable,
  isGenericArtMeshId,
} from "./inspect";
import type {
  AutomeshDrawable,
  AutomeshLandmark,
  AutomeshRaster,
  Point2,
  SimilarityTransform,
} from "./types";

function invertSimilarity(transform: SimilarityTransform): SimilarityTransform {
  const scale = transform.scale === 0 ? 1 : 1 / transform.scale;
  const rx = -transform.rotation;
  const icos = Math.cos(rx);
  const isin = Math.sin(rx);
  return {
    scale,
    rotation: rx,
    tx: -scale * (icos * transform.tx - isin * transform.ty),
    ty: -scale * (isin * transform.tx + icos * transform.ty),
  };
}

function barycentric(
  p: Point2,
  a: Point2,
  b: Point2,
  c: Point2,
): [number, number, number] | null {
  const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(det) < 1e-8) return null;
  const u = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / det;
  const v = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / det;
  const w = 1 - u - v;
  if (u < -0.01 || v < -0.01 || w < -0.01) return null;
  return [u, v, w];
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
  const at = (px: number, py: number) => {
    const index = (py * raster.width + px) * 4;
    return [
      raster.data[index] ?? 0,
      raster.data[index + 1] ?? 0,
      raster.data[index + 2] ?? 0,
      raster.data[index + 3] ?? 0,
    ] as const;
  };
  const c00 = at(x0, y0);
  const c10 = at(x1, y0);
  const c01 = at(x0, y1);
  const c11 = at(x1, y1);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return [0, 1, 2, 3].map((channel) => {
    const top = mix(c00[channel], c10[channel], tx);
    const bottom = mix(c01[channel], c11[channel], tx);
    return mix(top, bottom, ty);
  }) as [number, number, number, number];
}

export function modelDestForLandmark(
  landmark: AutomeshLandmark,
  drawables: readonly AutomeshDrawable[],
): Point2 {
  const hit = drawables.find(
    (drawable) =>
      !isGenericArtMeshId(drawable.id) &&
      drawableMatchesHints(drawable.id, landmark.drawableHints),
  );
  if (hit) {
    const box =
      hit.positions && hit.positions.length >= 6
        ? figureFromDrawables([hit])
        : hit.bounds;
    if (box) {
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      };
    }
  }
  const figure = figureFromDrawables(drawables);
  if (!figure) {
    return { x: landmark.atlas.x, y: landmark.atlas.y };
  }
  // Native Cubism vertex Y is up. The still is Y-down, so invert Y.
  const yUp = drawables.some((item) => (item.positions?.length ?? 0) >= 6);
  return {
    x: figure.x + landmark.source.x * figure.width,
    y: yUp
      ? figure.y + (1 - landmark.source.y) * figure.height
      : figure.y + landmark.source.y * figure.height,
  };
}

export function fitPhotoToMesh(
  landmarks: readonly AutomeshLandmark[],
  drawables: readonly AutomeshDrawable[],
): SimilarityTransform {
  const source = landmarks.map((item) => item.source);
  const dest = landmarks.map((item) => modelDestForLandmark(item, drawables));
  return fitSimilarity(source, dest);
}

/**
 * Reproject a reference still through Cubism drawable triangles onto the
 * texture atlas. Pixels outside those islands keep the official atlas.
 */
export function projectPhotoOntoAtlas(input: {
  photo: AutomeshRaster;
  drawables: readonly AutomeshDrawable[];
  landmarks: readonly AutomeshLandmark[];
  base?: AutomeshRaster;
  atlasWidth: number;
  atlasHeight: number;
  stats?: { painted: number; triangles: number; envSkipped: number };
}): AutomeshRaster {
  const width = Math.max(1, Math.floor(input.atlasWidth));
  const height = Math.max(1, Math.floor(input.atlasHeight));
  const data = new Uint8ClampedArray(width * height * 4);
  if (
    input.base &&
    input.base.width === width &&
    input.base.height === height
  ) {
    data.set(input.base.data);
  }

  const photo = punchOpaqueBackground(input.photo);
  const photoToModel = fitPhotoToMesh(input.landmarks, input.drawables);
  const modelToPhoto = invertSimilarity(photoToModel);
  let painted = 0;
  let triangles = 0;
  let envSkipped = 0;

  for (const drawable of input.drawables) {
    if (isEnvironmentDrawable(drawable)) {
      envSkipped += 1;
      continue;
    }
    const positions = drawable.positions;
    const uvs = drawable.uvs;
    const indices = drawable.indices;
    if (!positions || !uvs || !indices || indices.length < 3) continue;

    for (let index = 0; index + 2 < indices.length; index += 3) {
      const i0 = indices[index] ?? 0;
      const i1 = indices[index + 1] ?? 0;
      const i2 = indices[index + 2] ?? 0;
      const a = { x: positions[i0 * 2] ?? 0, y: positions[i0 * 2 + 1] ?? 0 };
      const b = { x: positions[i1 * 2] ?? 0, y: positions[i1 * 2 + 1] ?? 0 };
      const c = { x: positions[i2 * 2] ?? 0, y: positions[i2 * 2 + 1] ?? 0 };
      const uvA = { x: uvs[i0 * 2] ?? 0, y: uvs[i0 * 2 + 1] ?? 0 };
      const uvB = { x: uvs[i1 * 2] ?? 0, y: uvs[i1 * 2 + 1] ?? 0 };
      const uvC = { x: uvs[i2 * 2] ?? 0, y: uvs[i2 * 2 + 1] ?? 0 };

      const minU = Math.max(0, Math.min(uvA.x, uvB.x, uvC.x));
      const maxU = Math.min(1, Math.max(uvA.x, uvB.x, uvC.x));
      const minV = Math.max(0, Math.min(uvA.y, uvB.y, uvC.y));
      const maxV = Math.min(1, Math.max(uvA.y, uvB.y, uvC.y));
      const x0 = Math.floor(minU * width);
      const x1 = Math.ceil(maxU * width);
      const y0 = Math.floor(minV * height);
      const y1 = Math.ceil(maxV * height);
      triangles += 1;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const uv = { x: (x + 0.5) / width, y: (y + 0.5) / height };
          const weights = barycentric(uv, uvA, uvB, uvC);
          if (!weights) continue;
          const model = {
            x: weights[0] * a.x + weights[1] * b.x + weights[2] * c.x,
            y: weights[0] * a.y + weights[1] * b.y + weights[2] * c.y,
          };
          const mapped = applySimilarity(modelToPhoto, model);
          const sample = sampleBilinear(
            photo,
            mapped.x * (photo.width - 1),
            mapped.y * (photo.height - 1),
          );
          if (sample[3] < 8) continue;
          const dest = (y * width + x) * 4;
          data[dest] = sample[0];
          data[dest + 1] = sample[1];
          data[dest + 2] = sample[2];
          data[dest + 3] = 255;
          painted += 1;
        }
      }
    }
  }

  if (input.stats) {
    input.stats.painted = painted;
    input.stats.triangles = triangles;
    input.stats.envSkipped = envSkipped;
  }

  return { width, height, data };
}

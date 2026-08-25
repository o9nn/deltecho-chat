/**
 * After Cubism's deformers and physics run, reshape vertices toward a
 * target character silhouette. Official `.moc3` topology stays; this is a
 * runtime morph on the shared mesh.
 *
 * Native Cubism vertex Y is up. `figure` is the same Y-up box used by
 * `figureFromDrawables`.
 */

export type FigureBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type MeshDeformBand = {
  readonly id: string;
  /** Figure-space Y, 0 = feet, 1 = head. */
  readonly y0: number;
  readonly y1: number;
  readonly x0?: number;
  readonly x1?: number;
  /** Only vertices with `|nx - 0.5| >= outsideX` (wings, side hair). */
  readonly outsideX?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  /** Extra radial bulge from the band center (headset / headphones). */
  readonly bulge?: number;
  /**
   * Pull vertices toward `hemY` (figure 0–1). Shortens a long fairy hem
   * toward a miniskirt without collapsing the legs.
   */
  readonly hemY?: number;
  readonly hemPull?: number;
};

export type MeshDeformProfile = {
  readonly id: string;
  readonly bands: readonly MeshDeformBand[];
};

/** Melody: crop-top + miniskirt + ponytail volume + headset + musical wings. */
export const MELODY_MESH_DEFORM: MeshDeformProfile = {
  id: "melody",
  bands: [
    {
      id: "hair-volume",
      y0: 0.84,
      y1: 1.04,
      scaleX: 1.22,
      scaleY: 1.08,
    },
    {
      id: "hair-sides",
      y0: 0.68,
      y1: 0.92,
      outsideX: 0.16,
      scaleX: 1.16,
    },
    {
      id: "headset",
      y0: 0.76,
      y1: 0.94,
      x0: 0.12,
      x1: 0.88,
      bulge: 0.045,
    },
    {
      id: "waist-crop",
      y0: 0.4,
      y1: 0.58,
      x0: 0.28,
      x1: 0.72,
      scaleX: 0.84,
    },
    {
      id: "skirt-hem",
      y0: 0.16,
      y1: 0.42,
      x0: 0.26,
      x1: 0.74,
      scaleY: 0.86,
      hemY: 0.36,
      hemPull: 0.16,
    },
    {
      id: "wings",
      y0: 0.32,
      y1: 0.78,
      outsideX: 0.22,
      scaleX: 1.16,
      scaleY: 0.94,
    },
    {
      id: "boots",
      y0: 0,
      y1: 0.22,
      x0: 0.3,
      x1: 0.7,
      scaleX: 0.92,
    },
  ],
};

/** Deep Tree Echo: wilder crown, living wings; keep the fairy dress length. */
export const GROVE_MESH_DEFORM: MeshDeformProfile = {
  id: "deep-tree-echo",
  bands: [
    {
      id: "grove-crown",
      y0: 0.8,
      y1: 1.04,
      scaleX: 1.1,
      scaleY: 1.06,
    },
    {
      id: "grove-wings",
      y0: 0.3,
      y1: 0.82,
      outsideX: 0.2,
      scaleX: 1.18,
      scaleY: 1.08,
    },
  ],
};

function bandWeight(nx: number, ny: number, band: MeshDeformBand): number {
  if (ny < band.y0 || ny > band.y1) return 0;
  const x0 = band.x0 ?? 0;
  const x1 = band.x1 ?? 1;
  if (nx < x0 || nx > x1) return 0;
  if (band.outsideX != null && Math.abs(nx - 0.5) < band.outsideX) return 0;
  const ty = (ny - band.y0) / Math.max(1e-6, band.y1 - band.y0);
  const tx = (nx - x0) / Math.max(1e-6, x1 - x0);
  const wy = 1 - Math.abs(ty * 2 - 1);
  const wx = 1 - Math.abs(tx * 2 - 1);
  return Math.max(0, Math.min(1, wy * wx));
}

export type MutablePositions = {
  [index: number]: number;
  readonly length: number;
};

/**
 * Mutate Cubism vertex positions in place toward `profile`.
 * Call after `internalModel.update()` so physics still runs first.
 */
export function applyMeshDeform(
  positions: MutablePositions,
  figure: FigureBounds,
  profile: MeshDeformProfile,
): void {
  if (figure.width <= 0 || figure.height <= 0) return;
  const cx = figure.x + figure.width * 0.5;
  for (let i = 0; i + 1 < positions.length; i += 2) {
    const x = positions[i];
    const y = positions[i + 1];
    const nx = (x - figure.x) / figure.width;
    const ny = (y - figure.y) / figure.height;
    let ox = x;
    let oy = y;
    for (const band of profile.bands) {
      const w = bandWeight(nx, ny, band);
      if (w <= 0) continue;
      if (band.scaleX != null && band.scaleX !== 1) {
        ox = cx + (ox - cx) * (1 + (band.scaleX - 1) * w);
      }
      if (band.scaleY != null && band.scaleY !== 1) {
        const midY = figure.y + figure.height * ((band.y0 + band.y1) / 2);
        oy = midY + (oy - midY) * (1 + (band.scaleY - 1) * w);
      }
      if (band.bulge) {
        const bcx =
          figure.x + figure.width * ((band.x0 ?? 0) + (band.x1 ?? 1)) * 0.5;
        const bcy = figure.y + figure.height * ((band.y0 + band.y1) / 2);
        const dx = ox - bcx;
        const dy = oy - bcy;
        const len = Math.hypot(dx, dy) || 1;
        const push = band.bulge * figure.width * w;
        ox += (dx / len) * push;
        oy += (dy / len) * push;
      }
      if (band.hemY != null && band.hemPull) {
        const hem = figure.y + figure.height * band.hemY;
        if (oy < hem) {
          oy += (hem - oy) * band.hemPull * w;
        }
      }
    }
    positions[i] = ox;
    positions[i + 1] = oy;
  }
}

export function applyMeshDeformToDrawables(
  getDrawableCount: () => number,
  getDrawableVertexPositions: (
    index: number,
  ) => MutablePositions | null | undefined,
  figure: FigureBounds,
  profile: MeshDeformProfile,
  skipIndex?: (index: number) => boolean,
): void {
  const n = getDrawableCount();
  for (let i = 0; i < n; i++) {
    if (skipIndex?.(i)) continue;
    const positions = getDrawableVertexPositions(i);
    if (!positions || positions.length < 2) continue;
    applyMeshDeform(positions, figure, profile);
  }
}

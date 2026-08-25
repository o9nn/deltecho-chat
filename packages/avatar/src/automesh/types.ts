/**
 * Automesh types: map a reference portrait onto the official Miara Cubism mesh.
 *
 * Cubism Editor is not embeddable. These types mirror the Editor's mesh-to-art
 * mapping so a photo can be warped onto the existing texture atlas and bound
 * at runtime. .moc3 topology is still owned by Cubism Editor.
 */

export interface Point2 {
  x: number;
  y: number;
}

export const AUTOMESH_LANDMARK_IDS = [
  "eyeL",
  "eyeR",
  "browL",
  "browR",
  "nose",
  "mouth",
  "chin",
  "cheekL",
  "cheekR",
  "hairline",
  "hairL",
  "hairR",
  "earL",
  "earR",
  "collar",
] as const;

export type AutomeshLandmarkId = (typeof AUTOMESH_LANDMARK_IDS)[number];

export interface AutomeshLandmark {
  id: AutomeshLandmarkId;
  label: string;
  /** Normalized 0-1 coordinates on the reference photo. */
  source: Point2;
  /** Normalized 0-1 coordinates on the Cubism texture atlas. */
  atlas: Point2;
  /** Drawable / part id fragments used when inspecting a live model. */
  drawableHints: string[];
}

export interface AutomeshDrawable {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  uvCentroid?: Point2;
}

export interface AutomeshMapping {
  version: 1;
  identity: string;
  landmarks: AutomeshLandmark[];
  residual: number;
  trainedAt: number;
}

export interface AutomeshRaster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface SimilarityTransform {
  scale: number;
  rotation: number;
  tx: number;
  ty: number;
}

export const AUTOMESH_MAPPING_VERSION = 1 as const;

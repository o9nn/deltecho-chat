/**
 * Indexes official Miara ArtMeshes by UV-island + figure-space region so
 * identity textures (Melody, Deep Tree Echo) paint the same topology the
 * moc3 / physics / motions already drive.
 *
 * Cubism figure space is Y-up. Drawable IDs stay `ArtMeshN`; named Parts in
 * cdi3 do not rename those drawables.
 */

import { uvIsland } from "./inspect";

export const MESH_MAP_VERSION = 1 as const;

export const IDENTITY_MODEL3_PATHS = {
  miara: "models/miara/miara_pro_t03.model3.json",
  melody: "models/melody/melody_t03.model3.json",
  "deep-tree-echo": "models/deep-tree-echo/deep-tree-echo_t03.model3.json",
} as const;

export type IdentityModelId = keyof typeof IDENTITY_MODEL3_PATHS;

export function identityCubismStem(identity: IdentityModelId): string {
  return identity === "miara" ? "miara_pro_t03" : `${identity}_t03`;
}

export function identityModel3Path(identity: string): string {
  if (identity in IDENTITY_MODEL3_PATHS) {
    return IDENTITY_MODEL3_PATHS[identity as IdentityModelId];
  }
  return `models/${identity}/${identity}_t03.model3.json`;
}

export const MESH_REGIONS = [
  "environment",
  "wings",
  "sparkle",
  "hair",
  "headset",
  "face",
  "chestCloth",
  "body",
  "skirt",
  "armL",
  "armR",
  "legL",
  "legR",
  "accessory",
] as const;

export type MeshRegion = (typeof MESH_REGIONS)[number];

export type UvIsland = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FigurePoint = {
  x: number;
  y: number;
};

export type DrawableMeshIndex = {
  id: string;
  index: number;
  region: MeshRegion;
  uv: UvIsland;
  figure: FigurePoint;
  area: number;
  opacity: number;
  renderOrder: number;
};

export type RegionMotionBinding = {
  region: MeshRegion;
  physics: readonly string[];
  parameters: readonly string[];
};

export type IdentityMeshMap = {
  version: typeof MESH_MAP_VERSION;
  sourceModel: string;
  identity: string;
  figure: { x: number; y: number; w: number; h: number };
  regions: Record<MeshRegion, string[]>;
  drawables: DrawableMeshIndex[];
  motions: RegionMotionBinding[];
};

export const KNOWN_CHEST_CLOTH_IDS = ["ArtMesh76", "ArtMesh77"] as const;

export const KNOWN_WING_IDS = [
  "ArtMesh38",
  "ArtMesh39",
  "ArtMesh108",
  "ArtMesh109",
  "ArtMesh179",
  "ArtMesh181",
  "ArtMesh185",
  "ArtMesh186",
  "ArtMesh190",
  "ArtMesh191",
] as const;

/** Cubism PartLegL — character left / viewer right. */
export const KNOWN_LEG_L_IDS = [
  "ArtMesh83",
  "ArtMesh85",
  "ArtMesh86",
  "ArtMesh87",
  "ArtMesh88",
  "ArtMesh89",
  "ArtMesh90",
  "ArtMesh91",
  "ArtMesh92",
  "ArtMesh93",
] as const;

/** Cubism PartLegR — character right / viewer left. */
export const KNOWN_LEG_R_IDS = [
  "ArtMesh94",
  "ArtMesh95",
  "ArtMesh97",
  "ArtMesh98",
  "ArtMesh99",
  "ArtMesh100",
  "ArtMesh101",
  "ArtMesh102",
  "ArtMesh103",
  "ArtMesh104",
  "ArtMesh105",
  "ArtMesh152",
  "ArtMesh153",
  "ArtMesh154",
] as const;

/** Cubism PartArmL + PartHandL. */
export const KNOWN_ARM_L_IDS = [
  "ArtMesh10",
  "ArtMesh16",
  "ArtMesh21",
  "ArtMesh135",
  "ArtMesh158",
  "ArtMesh159",
] as const;

/** Cubism PartArmR. Far-lateral cyan sheets are wings, not this arm. */
export const KNOWN_ARM_R_IDS = [
  "ArtMesh80",
  "ArtMesh117",
  "ArtMesh119",
  "ArtMesh120",
  "ArtMesh173",
  "ArtMesh174",
  "ArtMesh175",
] as const;

export const KNOWN_SKIRT_IDS = [
  "ArtMesh82",
  "ArtMesh84",
  "ArtMesh96",
  "ArtMesh106",
  "ArtMesh107",
  "ArtMesh145",
  "ArtMesh149",
  "ArtMesh150",
  "ArtMesh151",
  "ArtMesh156",
  "ArtMesh157",
  "ArtMesh166",
  "ArtMesh167",
  "ArtMesh168",
] as const;

export const KNOWN_SPARKLE_IDS = [
  "ArtMesh137",
  "ArtMesh138",
  "ArtMesh139",
  "ArtMesh140",
  "ArtMesh147",
  "ArtMesh148",
] as const;

export const REGION_MOTION_BINDINGS: readonly RegionMotionBinding[] = [
  {
    region: "hair",
    physics: ["HairFront", "HairSide", "HairBack"],
    parameters: [
      "ParamHairFront",
      "ParamHairSide",
      "ParamHairBack",
      "HairFrontShake",
      "HairSideShake",
      "HairBackShake",
    ],
  },
  {
    region: "headset",
    physics: [],
    parameters: ["ParamAngleX", "ParamAngleY", "ParamAngleZ"],
  },
  {
    region: "face",
    physics: [],
    parameters: [
      "ParamEyeLOpen",
      "ParamEyeROpen",
      "ParamEyeLSmile",
      "ParamEyeRSmile",
      "ParamBrowLY",
      "ParamBrowRY",
      "ParamMouthOpenY",
      "ParamMouthForm",
    ],
  },
  {
    region: "body",
    physics: ["Body"],
    parameters: [
      "ParamBodyAngleX",
      "ParamBodyAngleY",
      "ParamBodyAngleZ",
      "ParamBreath",
    ],
  },
  {
    region: "chestCloth",
    physics: ["Chest"],
    parameters: ["ParamBreath"],
  },
  {
    region: "skirt",
    physics: ["Skirt"],
    parameters: ["ParamBodyAngleX", "ParamBodyAngleZ"],
  },
  {
    region: "armL",
    physics: ["SleeveL"],
    parameters: ["ParamArmL1", "ParamArmL2", "ParamArmL3", "ParamSleeveL"],
  },
  {
    region: "armR",
    physics: ["SleeveR"],
    parameters: ["ParamArmR1", "ParamArmR2", "ParamArmR3", "ParamSleeve"],
  },
  {
    region: "legL",
    physics: [],
    parameters: ["ParamLegL1X", "ParamLegL2X", "ParamLegL3X"],
  },
  {
    region: "legR",
    physics: [],
    parameters: [
      "ParamLegR1X",
      "ParamLegR2X",
      "ParamLegR3X",
      "ParamLegRibbonR1",
    ],
  },
  {
    region: "wings",
    physics: ["WingL", "WingR"],
    parameters: ["ParamWingL", "ParamWingR"],
  },
  {
    region: "sparkle",
    physics: [],
    parameters: ["ParamBreath"],
  },
  {
    region: "accessory",
    physics: [],
    parameters: ["ParamAngleX", "ParamAngleY"],
  },
  {
    region: "environment",
    physics: [],
    parameters: [],
  },
];

export type ClassifyDrawableInput = {
  id: string;
  uv: UvIsland;
  figure: FigurePoint;
  area: number;
};

export function isEnvironmentUv(uv: UvIsland): boolean {
  if (uv.w <= 0 || uv.h <= 0) {
    return true;
  }
  const cx = uv.x + uv.w / 2;
  const cy = uv.y + uv.h / 2;
  const area = uv.w * uv.h;
  // Official Miara atlas packs the figure in the left/upper islands.
  // Lagoon, water, and large FX sheets live on the right and lower edge.
  if (uv.x > 0.88) {
    return true;
  }
  if (cx > 0.62 && area > 0.025) {
    return true;
  }
  if (cy > 0.72 && area > 0.04) {
    return true;
  }
  return false;
}

function hasKnownId(id: string, known: readonly string[]): boolean {
  return known.includes(id);
}

/** Cubism +X is the character's left (viewer's right). */
export function lateralityFromFigureX(x: number): "L" | "R" {
  return x >= 0 ? "L" : "R";
}

export function isLegRegion(region: MeshRegion): boolean {
  return region === "legL" || region === "legR";
}

export function isArmRegion(region: MeshRegion): boolean {
  return region === "armL" || region === "armR";
}

export function classifyDrawable(input: ClassifyDrawableInput): MeshRegion {
  const { id, uv, figure, area } = input;
  if (hasKnownId(id, KNOWN_CHEST_CLOTH_IDS)) {
    return "chestCloth";
  }
  if (hasKnownId(id, KNOWN_WING_IDS)) {
    return "wings";
  }
  if (hasKnownId(id, KNOWN_SPARKLE_IDS)) {
    return "sparkle";
  }
  if (hasKnownId(id, KNOWN_LEG_L_IDS)) {
    return "legL";
  }
  if (hasKnownId(id, KNOWN_LEG_R_IDS)) {
    return "legR";
  }
  if (hasKnownId(id, KNOWN_ARM_L_IDS)) {
    return "armL";
  }
  if (hasKnownId(id, KNOWN_ARM_R_IDS)) {
    return "armR";
  }
  if (hasKnownId(id, KNOWN_SKIRT_IDS)) {
    return "skirt";
  }
  if (isEnvironmentUv(uv)) {
    return "environment";
  }

  const { x, y } = figure;
  const absX = Math.abs(x);
  const arm = x >= 0 ? "armL" : "armR";
  const leg = x >= 0 ? "legL" : "legR";

  if (y > 0.36) {
    if (absX > 0.08 && absX < 0.18 && y < 0.48 && area < 0.006) {
      return "headset";
    }
    return "hair";
  }
  if (y > 0.24 && y <= 0.36) {
    if (absX <= 0.07) {
      return "face";
    }
    if (absX > 0.08 && absX < 0.2 && area < 0.006) {
      return "headset";
    }
    return "hair";
  }
  if (y > 0.2 && y <= 0.24) {
    if (absX > 0.25) {
      return "wings";
    }
    if (absX > 0.13) {
      return arm;
    }
    return "body";
  }
  if (y > 0.04 && y <= 0.2) {
    if (absX > 0.2) {
      return "wings";
    }
    if (absX > 0.13) {
      return arm;
    }
    return "body";
  }
  if (y > -0.12 && y <= 0.04) {
    if (absX > 0.14) {
      return arm;
    }
    return "skirt";
  }
  if (y > -0.42 && y <= -0.12) {
    if (absX > 0.16 && y > -0.2) {
      return "accessory";
    }
    return leg;
  }
  if (absX > 0.18) {
    return "accessory";
  }
  return leg;
}

export function uvIslandBox(uvs?: ArrayLike<number>): UvIsland | null {
  const island = uvIsland(uvs);
  if (!island) return null;
  return {
    x: island.minU,
    y: island.minV,
    w: Math.max(0, island.maxU - island.minU),
    h: Math.max(0, island.maxV - island.minV),
  };
}

export function figureCentroidFromPositions(
  positions?: ArrayLike<number>,
): FigurePoint | null {
  if (!positions || positions.length < 2) return null;
  let x = 0;
  let y = 0;
  const count = Math.floor(positions.length / 2);
  for (let index = 0; index < count; index++) {
    x += positions[index * 2] ?? 0;
    y += positions[index * 2 + 1] ?? 0;
  }
  return { x: x / count, y: y / count };
}

export type InspectedDrawable = {
  id: string;
  index?: number;
  uvs?: ArrayLike<number>;
  positions?: ArrayLike<number>;
  bounds?: { x: number; y: number; width: number; height: number };
  opacity?: number;
  renderOrder?: number;
};

export function inspectedToDrawableIndex(
  drawable: InspectedDrawable,
  fallbackIndex = 0,
): Omit<DrawableMeshIndex, "region"> {
  const uv =
    uvIslandBox(drawable.uvs) ??
    ({ x: 0, y: 0, w: 0, h: 0 } satisfies UvIsland);
  const fromPositions = figureCentroidFromPositions(drawable.positions);
  const figure = fromPositions ?? {
    x: (drawable.bounds?.x ?? 0) + (drawable.bounds?.width ?? 0) / 2,
    y: (drawable.bounds?.y ?? 0) + (drawable.bounds?.height ?? 0) / 2,
  };
  return {
    id: drawable.id,
    index: drawable.index ?? fallbackIndex,
    uv,
    figure,
    area: uv.w * uv.h,
    opacity: drawable.opacity ?? 1,
    renderOrder: drawable.renderOrder ?? fallbackIndex,
  };
}

export function buildIdentityMeshMap(input: {
  identity: string;
  sourceModel: string;
  figure: { x: number; y: number; w: number; h: number };
  drawables: Array<Omit<DrawableMeshIndex, "region"> | InspectedDrawable>;
}): IdentityMeshMap {
  const drawables = input.drawables.map((drawable, index) => {
    const indexed =
      "uv" in drawable && "figure" in drawable && "area" in drawable
        ? (drawable as Omit<DrawableMeshIndex, "region">)
        : inspectedToDrawableIndex(drawable, index);
    return {
      ...indexed,
      region: classifyDrawable(indexed),
    };
  });
  const regions = Object.fromEntries(
    MESH_REGIONS.map((region) => [region, [] as string[]]),
  ) as Record<MeshRegion, string[]>;
  for (const drawable of drawables) {
    regions[drawable.region].push(drawable.id);
  }
  return {
    version: MESH_MAP_VERSION,
    sourceModel: input.sourceModel,
    identity: input.identity,
    figure: refineFigureFromDrawables(drawables, input.figure),
    regions,
    drawables,
    motions: [...REGION_MOTION_BINDINGS],
  };
}

export function reclassifyIdentityMeshMap(
  meshMap: IdentityMeshMap,
): IdentityMeshMap {
  const drawables = meshMap.drawables.map((drawable) => ({
    ...drawable,
    region: classifyDrawable(drawable),
  }));
  const regions = Object.fromEntries(
    MESH_REGIONS.map((region) => [region, [] as string[]]),
  ) as Record<MeshRegion, string[]>;
  for (const drawable of drawables) {
    regions[drawable.region].push(drawable.id);
  }
  return {
    ...meshMap,
    regions,
    drawables,
    motions: [...REGION_MOTION_BINDINGS],
  };
}

export function refineFigureFromDrawables(
  drawables: readonly Pick<DrawableMeshIndex, "region" | "figure">[],
  fallback: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const character = drawables.filter(
    (drawable) => drawable.region !== "environment",
  );
  if (!character.length) {
    return fallback;
  }
  const xs = character.map((drawable) => drawable.figure.x);
  const ys = character.map((drawable) => drawable.figure.y);
  const sortedX = [...xs].sort((left, right) => left - right);
  const medianX = sortedX[Math.floor(sortedX.length / 2)] ?? 0;
  const spanX = Math.max(...xs) - Math.min(...xs);
  const column = character.filter(
    (drawable) =>
      Math.abs(drawable.figure.x - medianX) <= Math.max(spanX * 0.42, 0.05),
  );
  const used = column.length ? column : character;
  const usedX = used.map((drawable) => drawable.figure.x);
  const usedY = used.map((drawable) => drawable.figure.y);
  const minX = Math.min(...usedX);
  const maxX = Math.max(...usedX);
  const minY = Math.min(...usedY);
  const maxY = Math.max(...usedY);
  const width = Math.max(maxX - minX, 0.05);
  const height = Math.max(maxY - minY, 0.05);
  return {
    x: minX - width * 0.08,
    y: minY - height * 0.08,
    w: width * 1.16,
    h: height * 1.16,
  };
}

export function regionForDrawable(
  meshMap: IdentityMeshMap,
  drawableId: string,
): MeshRegion | null {
  return (
    meshMap.drawables.find((drawable) => drawable.id === drawableId)?.region ??
    null
  );
}

export function regionCounts(
  meshMap: IdentityMeshMap,
): Record<MeshRegion, number> {
  return Object.fromEntries(
    MESH_REGIONS.map((region) => [region, meshMap.regions[region].length]),
  ) as Record<MeshRegion, number>;
}

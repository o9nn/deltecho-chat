/**
 * Per-ArtMesh tile index for Melody.
 *
 * After the region art map (`mesh-map.json`), each Cubism drawable is a
 * tile: a UV island, a still-space box, a limb segment, a kinematic
 * chain/joint, and the Cubism parameters that should drive it. Motion
 * work reads this file instead of re-deriving tiles from Y-bands.
 */

import {
  IDENTITY_MODEL3_PATHS,
  lateralityFromFigureX,
  type DrawableMeshIndex,
  type FigurePoint,
  type IdentityMeshMap,
  type MeshRegion,
  type UvIsland,
} from "./mesh-map"
import {
  mesh3dGroupsForRegion,
  type MelodyMesh3dGroup,
} from "./avatar-mesh-map"

export const MESH_TILE_MAP_VERSION = 1 as const

export const TILE_LATERALITIES = ["L", "R", "C"] as const
export type TileLaterality = (typeof TILE_LATERALITIES)[number]

export const TILE_SEGMENTS = [
  "crown",
  "bang",
  "ponytail",
  "sideHair",
  "headsetBand",
  "headsetCup",
  "face",
  "eye",
  "mouth",
  "crop",
  "midriff",
  "waist",
  "hem",
  "belt",
  "upperArm",
  "forearm",
  "glove",
  "thigh",
  "shin",
  "boot",
  "strap",
  "wingRoot",
  "wingFeather",
  "ribbon",
  "sparkle",
  "accessory",
  "environment",
] as const

export type TileSegment = (typeof TILE_SEGMENTS)[number]

export const TILE_CHAINS = [
  "armL",
  "armR",
  "legL",
  "legR",
  "spine",
  "skirt",
  "head",
  "hair",
  "headset",
  "wingL",
  "wingR",
  "fx",
] as const

export type TileChain = (typeof TILE_CHAINS)[number]

export type StillPoint = {
  u: number
  v: number
}

export type StillBox = {
  x: number
  y: number
  w: number
  h: number
}

export type MeshTile = {
  id: string
  index: number
  region: MeshRegion
  /** Cubism laterality (+X = character left = viewer right). */
  laterality: TileLaterality
  /** Still-image laterality (u left = character right). */
  stillLaterality: TileLaterality
  segment: TileSegment
  chain: TileChain | null
  /** 0 = proximal (shoulder / thigh / crown), higher = distal. */
  joint: number
  /** Cubism Y-up centroid. */
  figure: FigurePoint
  uv: UvIsland
  /** Normalized 0-1 centroid on the Melody A-pose still (Y-down). */
  stillCentroid: StillPoint
  /** Normalized 0-1 box on the Melody A-pose still (Y-down). */
  still: StillBox
  parameters: readonly string[]
  physics: readonly string[]
  mesh3d: readonly MelodyMesh3dGroup[]
}

export type IdentityTileMap = {
  version: typeof MESH_TILE_MAP_VERSION
  identity: "melody"
  sourceModel: string
  still: string
  meshMap: string
  figure: { x: number; y: number; w: number; h: number }
  tiles: MeshTile[]
  byRegion: Record<MeshRegion, string[]>
  bySegment: Partial<Record<TileSegment, string[]>>
  byChain: Partial<Record<TileChain, string[]>>
  byParameter: Record<string, string[]>
}

export const MELODY_STILL_PATH = "./images/avatar/identities/melody.webp"

/** Character midline in still space (figure x=0 → u). */
export const MELODY_STILL_MIDLINE = 0.587

export const KNOWN_STRAP_IDS = ["ArtMesh152", "ArtMesh153"] as const
export const KNOWN_THIGH_L_IDS = ["ArtMesh83"] as const
export const KNOWN_SHIN_L_IDS = ["ArtMesh91"] as const
export const KNOWN_BOOT_L_IDS = [
  "ArtMesh92",
  "ArtMesh93",
  "ArtMesh88",
  "ArtMesh86",
  "ArtMesh85",
  "ArtMesh89",
  "ArtMesh90",
  "ArtMesh87",
] as const
export const KNOWN_THIGH_R_IDS = ["ArtMesh95"] as const
export const KNOWN_SHIN_R_IDS = [
  "ArtMesh94",
  "ArtMesh154",
  "ArtMesh99",
  "ArtMesh100",
] as const
export const KNOWN_BOOT_R_IDS = [
  "ArtMesh101",
  "ArtMesh98",
  "ArtMesh104",
  "ArtMesh105",
  "ArtMesh102",
  "ArtMesh103",
  "ArtMesh97",
] as const
export const KNOWN_UPPER_ARM_L_IDS = ["ArtMesh10"] as const
export const KNOWN_FOREARM_L_IDS = [
  "ArtMesh135",
  "ArtMesh21",
  "ArtMesh16",
] as const
export const KNOWN_GLOVE_L_IDS = ["ArtMesh158", "ArtMesh159"] as const
export const KNOWN_UPPER_ARM_R_IDS = ["ArtMesh117"] as const
export const KNOWN_FOREARM_R_IDS = [
  "ArtMesh80",
  "ArtMesh173",
  "ArtMesh120",
  "ArtMesh119",
] as const
export const KNOWN_GLOVE_R_IDS = ["ArtMesh174", "ArtMesh175"] as const
export const KNOWN_WAIST_IDS = [
  "ArtMesh156",
  "ArtMesh106",
  "ArtMesh82",
  "ArtMesh107",
  "ArtMesh166",
] as const
export const KNOWN_BELT_IDS = ["ArtMesh145", "ArtMesh149", "ArtMesh157"] as const
export const KNOWN_HEM_IDS = [
  "ArtMesh150",
  "ArtMesh84",
  "ArtMesh167",
  "ArtMesh96",
  "ArtMesh168",
  "ArtMesh151",
] as const
export const KNOWN_EYE_L_IDS = ["ArtMesh132"] as const
export const KNOWN_EYE_R_IDS = ["ArtMesh133"] as const
export const KNOWN_EYE_C_IDS = ["ArtMesh71"] as const
export const KNOWN_MOUTH_IDS = ["ArtMesh22", "ArtMesh23"] as const
export const KNOWN_PONYTAIL_IDS = ["ArtMesh134", "ArtMesh136"] as const

const SEGMENT_BY_ID = new Map<string, TileSegment>([
  ...KNOWN_STRAP_IDS.map((id) => [id, "strap"] as const),
  ...KNOWN_THIGH_L_IDS.map((id) => [id, "thigh"] as const),
  ...KNOWN_SHIN_L_IDS.map((id) => [id, "shin"] as const),
  ...KNOWN_BOOT_L_IDS.map((id) => [id, "boot"] as const),
  ...KNOWN_THIGH_R_IDS.map((id) => [id, "thigh"] as const),
  ...KNOWN_SHIN_R_IDS.map((id) => [id, "shin"] as const),
  ...KNOWN_BOOT_R_IDS.map((id) => [id, "boot"] as const),
  ...KNOWN_UPPER_ARM_L_IDS.map((id) => [id, "upperArm"] as const),
  ...KNOWN_FOREARM_L_IDS.map((id) => [id, "forearm"] as const),
  ...KNOWN_GLOVE_L_IDS.map((id) => [id, "glove"] as const),
  ...KNOWN_UPPER_ARM_R_IDS.map((id) => [id, "upperArm"] as const),
  ...KNOWN_FOREARM_R_IDS.map((id) => [id, "forearm"] as const),
  ...KNOWN_GLOVE_R_IDS.map((id) => [id, "glove"] as const),
  ...KNOWN_WAIST_IDS.map((id) => [id, "waist"] as const),
  ...KNOWN_BELT_IDS.map((id) => [id, "belt"] as const),
  ...KNOWN_HEM_IDS.map((id) => [id, "hem"] as const),
  ...KNOWN_EYE_L_IDS.map((id) => [id, "eye"] as const),
  ...KNOWN_EYE_R_IDS.map((id) => [id, "eye"] as const),
  ...KNOWN_EYE_C_IDS.map((id) => [id, "eye"] as const),
  ...KNOWN_MOUTH_IDS.map((id) => [id, "mouth"] as const),
  ...KNOWN_PONYTAIL_IDS.map((id) => [id, "ponytail"] as const),
])

const STILL_BOX_BY_SEGMENT: Record<TileSegment, { w: number; h: number }> = {
  crown: { w: 0.1, h: 0.08 },
  bang: { w: 0.07, h: 0.06 },
  ponytail: { w: 0.14, h: 0.12 },
  sideHair: { w: 0.08, h: 0.08 },
  headsetBand: { w: 0.1, h: 0.05 },
  headsetCup: { w: 0.07, h: 0.07 },
  face: { w: 0.08, h: 0.08 },
  eye: { w: 0.05, h: 0.05 },
  mouth: { w: 0.05, h: 0.05 },
  crop: { w: 0.1, h: 0.08 },
  midriff: { w: 0.1, h: 0.08 },
  waist: { w: 0.1, h: 0.06 },
  hem: { w: 0.1, h: 0.07 },
  belt: { w: 0.08, h: 0.05 },
  upperArm: { w: 0.09, h: 0.08 },
  forearm: { w: 0.09, h: 0.08 },
  glove: { w: 0.07, h: 0.08 },
  thigh: { w: 0.1, h: 0.12 },
  shin: { w: 0.09, h: 0.11 },
  boot: { w: 0.07, h: 0.07 },
  strap: { w: 0.07, h: 0.07 },
  wingRoot: { w: 0.06, h: 0.05 },
  wingFeather: { w: 0.08, h: 0.06 },
  ribbon: { w: 0.07, h: 0.06 },
  sparkle: { w: 0.08, h: 0.08 },
  accessory: { w: 0.06, h: 0.06 },
  environment: { w: 0.08, h: 0.08 },
}

export function lateralityForRegion(
  region: MeshRegion,
  figureX: number,
  id: string,
): TileLaterality {
  if (KNOWN_EYE_L_IDS.includes(id as (typeof KNOWN_EYE_L_IDS)[number])) {
    return "L"
  }
  if (KNOWN_EYE_R_IDS.includes(id as (typeof KNOWN_EYE_R_IDS)[number])) {
    return "R"
  }
  if (KNOWN_EYE_C_IDS.includes(id as (typeof KNOWN_EYE_C_IDS)[number])) {
    return "C"
  }
  if (region === "legL" || region === "armL") return "L"
  if (region === "legR" || region === "armR") return "R"
  if (
    region === "face" ||
    region === "body" ||
    region === "skirt" ||
    region === "sparkle" ||
    region === "environment"
  ) {
    return "C"
  }
  return lateralityFromFigureX(figureX)
}

export function stillLateralityFromU(u: number): TileLaterality {
  if (u < MELODY_STILL_MIDLINE - 0.04) return "R"
  if (u > MELODY_STILL_MIDLINE + 0.04) return "L"
  return "C"
}

export function figurePointToStill(
  figure: { x: number; y: number; w: number; h: number },
  point: FigurePoint,
): StillPoint {
  const width = Math.max(figure.w, 1e-6)
  const height = Math.max(figure.h, 1e-6)
  return {
    u: (point.x - figure.x) / width,
    v: 1 - (point.y - figure.y) / height,
  }
}

export function classifyTileSegment(
  tile: Pick<DrawableMeshIndex, "id" | "region" | "figure" | "area">,
  still: StillPoint,
): TileSegment {
  const known = SEGMENT_BY_ID.get(tile.id)
  if (known) return known

  const { id, region, figure, area } = tile
  const y = figure.y

  if (region === "environment") return "environment"
  if (region === "sparkle") return "sparkle"
  if (region === "accessory") return "accessory"

  if (region === "legL" || region === "legR") {
    if (y > -0.2) return "thigh"
    if (y > -0.365) return "shin"
    return "boot"
  }
  if (region === "armL" || region === "armR") {
    if (y > 0.12) return "upperArm"
    if (y > -0.008) return "forearm"
    return "glove"
  }
  if (region === "skirt") {
    if (y > 0.016) {
      return Math.abs(figure.x) > 0.08 ? "belt" : "waist"
    }
    return "hem"
  }
  if (region === "body") {
    return y > 0.15 ? "crop" : "midriff"
  }
  if (region === "face") {
    return "face"
  }
  if (region === "headset") {
    return y > 0.37 ? "headsetBand" : "headsetCup"
  }
  if (region === "wings") {
    if (y > 0.3) return "wingRoot"
    if (area < 0.0003 || still.u < 0.12 || still.u > 0.95) return "ribbon"
    return "wingFeather"
  }
  if (region === "hair") {
    // Far-lateral islands sit on the musical ribbons, not the scalp.
    if (still.u < 0.16 || still.u > 0.92) return "ribbon"
    if (id === "ArtMesh134" || id === "ArtMesh136" || y < 0.32) {
      return "ponytail"
    }
    if (y > 0.45) return "crown"
    if (y > 0.38 && Math.abs(figure.x) < 0.08) return "bang"
    return "sideHair"
  }
  return "accessory"
}

export function chainForTile(
  region: MeshRegion,
  _laterality: TileLaterality,
  still: StillPoint,
): TileChain | null {
  if (region === "armL") return "armL"
  if (region === "armR") return "armR"
  if (region === "legL") return "legL"
  if (region === "legR") return "legR"
  if (region === "skirt") return "skirt"
  if (region === "body" || region === "chestCloth") return "spine"
  if (region === "face") return "head"
  if (region === "hair") return "hair"
  if (region === "headset") return "headset"
  if (region === "wings") {
    return stillLateralityFromU(still.u) === "L" ? "wingL" : "wingR"
  }
  if (region === "sparkle") return "fx"
  return null
}

export function jointForSegment(segment: TileSegment): number {
  switch (segment) {
    case "upperArm":
    case "thigh":
    case "strap":
    case "crown":
    case "headsetBand":
    case "crop":
    case "waist":
    case "wingRoot":
    case "face":
      return 0
    case "forearm":
    case "shin":
    case "bang":
    case "sideHair":
    case "headsetCup":
    case "midriff":
    case "belt":
    case "eye":
    case "mouth":
    case "wingFeather":
      return 1
    case "glove":
    case "boot":
    case "ponytail":
    case "hem":
    case "ribbon":
      return 2
    default:
      return 0
  }
}

export function parametersForSegment(
  region: MeshRegion,
  segment: TileSegment,
  laterality: TileLaterality,
): readonly string[] {
  const left = laterality === "L" || region === "legL" || region === "armL"
  switch (segment) {
    case "thigh":
      return left
        ? ["ParamLegL1X", "ParamLegL1Z"]
        : ["ParamLegR1X", "ParamLegR1Z"]
    case "shin":
      return left
        ? ["ParamLegL2X", "ParamLegL2Z"]
        : ["ParamLegR2X", "ParamLegR2"]
    case "boot":
      return left
        ? ["ParamLegL3X", "ParamLegL3Z"]
        : ["ParamLegR3X", "ParamLegR3Z"]
    case "strap":
      return left
        ? ["ParamLegRibbonL1", "ParamLegRibbonL2"]
        : ["ParamLegRibbonR1", "ParamLegRibbonR2"]
    case "upperArm":
      return left ? ["ParamArmL1"] : ["ParamArmR1"]
    case "forearm":
      return left
        ? ["ParamArmL2", "ParamSleeveL"]
        : ["ParamArmR2", "ParamSleeve"]
    case "glove":
      return left
        ? ["ParamArmL3", "ParamSleeveL2"]
        : ["ParamArmR3", "ParamSleeve2"]
    case "waist":
    case "hem":
    case "belt":
      return ["ParamBodyAngleX", "ParamBodyAngleZ", "ParamCloth1", "ParamCloth2"]
    case "crop":
    case "midriff":
      return ["ParamBreath", "ParamBodyAngleX", "ParamBodyAngleZ"]
    case "eye":
      if (laterality === "L") {
        return [
          "ParamEyeLOpen",
          "ParamEyeLSmile",
          "ParamEyeBallX",
          "ParamEyeBallY",
        ]
      }
      if (laterality === "R") {
        return [
          "ParamEyeROpen",
          "ParamEyeRSmile",
          "ParamEyeBallX",
          "ParamEyeBallY",
        ]
      }
      return [
        "ParamEyeLOpen",
        "ParamEyeROpen",
        "ParamEyeBallX",
        "ParamEyeBallY",
      ]
    case "mouth":
      return ["ParamMouthForm", "ParamMouthOpenY"]
    case "face":
      return ["ParamAngleX", "ParamAngleY", "ParamAngleZ"]
    case "headsetBand":
    case "headsetCup":
      return ["ParamAngleX", "ParamAngleY", "ParamAngleZ"]
    case "crown":
    case "bang":
      return ["ParamHairFront", "ParamHairSide"]
    case "sideHair":
      return ["ParamHairSide", "HairSideShake"]
    case "ponytail":
      return ["ParamHairBack", "ParamHairTail", "HairBackShake"]
    case "wingRoot":
      return ["ParamFlapping3", "ParamFlapping7"]
    case "wingFeather":
      return ["ParamFlapping4", "ParamFlapping8"]
    case "ribbon":
      return ["ParamFlapping3", "ParamFlapping4"]
    case "sparkle":
      return ["ParamBreath"]
    default:
      return []
  }
}

export function physicsForSegment(segment: TileSegment): readonly string[] {
  switch (segment) {
    case "crown":
    case "bang":
      return ["HairFront", "HairSide"]
    case "sideHair":
      return ["HairSide"]
    case "ponytail":
      return ["HairBack"]
    case "crop":
    case "midriff":
      return ["Body", "Chest"]
    case "waist":
    case "hem":
    case "belt":
      return ["Skirt"]
    case "upperArm":
    case "forearm":
    case "glove":
      return segment === "glove" ? [] : ["SleeveL", "SleeveR"]
    case "wingRoot":
    case "wingFeather":
    case "ribbon":
      return ["WingL", "WingR"]
    default:
      return []
  }
}

export function mesh3dForTile(
  region: MeshRegion,
  segment: TileSegment,
  laterality: TileLaterality,
): readonly MelodyMesh3dGroup[] {
  switch (segment) {
    case "strap":
      return ["thighStrap"]
    case "boot":
      return laterality === "L" ? ["bootL"] : ["bootR"]
    case "thigh":
    case "shin":
      return laterality === "L" ? ["bootL"] : ["bootR"]
    case "glove":
    case "upperArm":
    case "forearm":
      return laterality === "L" ? ["gloveL"] : ["gloveR"]
    case "waist":
    case "hem":
      return ["skirt"]
    case "belt":
      return ["skirtBelts"]
    case "crown":
      return ["hairCrown"]
    case "ponytail":
      return ["hairPonytail"]
    case "bang":
      return ["bangs"]
    case "sideHair":
      return ["hairCrown", "hairPonytail"]
    case "headsetBand":
      return ["headsetBand"]
    case "headsetCup":
      return ["headsetCups"]
    case "eye":
      return ["eyes"]
    case "mouth":
      return ["mouth"]
    case "face":
      return ["face"]
    case "crop":
    case "midriff":
      return ["cropTop"]
    case "wingRoot":
      return ["wingBones"]
    case "wingFeather":
      return ["wingFeathers"]
    case "ribbon":
    case "sparkle":
      return ["energyRibbons"]
    default:
      return mesh3dGroupsForRegion(region)
  }
}

export function stillBoxForTile(
  still: StillPoint,
  segment: TileSegment,
): StillBox {
  const size = STILL_BOX_BY_SEGMENT[segment]
  const w = Math.min(1, Math.max(0.02, size.w))
  const h = Math.min(1, Math.max(0.02, size.h))
  const u = clamp01(still.u)
  const v = clamp01(still.v)
  return {
    x: clamp01(Math.min(u - w / 2, 1 - w)),
    y: clamp01(Math.min(v - h / 2, 1 - h)),
    w,
    h,
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function buildIdentityTileMap(meshMap: IdentityMeshMap): IdentityTileMap {
  const tiles: MeshTile[] = meshMap.drawables.map((drawable) => {
    const stillCentroid = figurePointToStill(meshMap.figure, drawable.figure)
    const laterality = lateralityForRegion(
      drawable.region,
      drawable.figure.x,
      drawable.id,
    )
    const segment = classifyTileSegment(drawable, stillCentroid)
    return {
      id: drawable.id,
      index: drawable.index,
      region: drawable.region,
      laterality,
      stillLaterality: stillLateralityFromU(stillCentroid.u),
      segment,
      chain: chainForTile(drawable.region, laterality, stillCentroid),
      joint: jointForSegment(segment),
      figure: drawable.figure,
      uv: drawable.uv,
      stillCentroid,
      still: stillBoxForTile(stillCentroid, segment),
      parameters: parametersForSegment(drawable.region, segment, laterality),
      physics: physicsForSegment(segment),
      mesh3d: mesh3dForTile(drawable.region, segment, laterality),
    }
  })

  const byRegion = Object.fromEntries(
    Object.keys(meshMap.regions).map((region) => [region, [] as string[]]),
  ) as Record<MeshRegion, string[]>
  const bySegment: Partial<Record<TileSegment, string[]>> = {}
  const byChain: Partial<Record<TileChain, string[]>> = {}
  const byParameter: Record<string, string[]> = {}
  for (const tile of tiles) {
    byRegion[tile.region].push(tile.id)
    const segmentList = bySegment[tile.segment] ?? []
    segmentList.push(tile.id)
    bySegment[tile.segment] = segmentList
    if (tile.chain) {
      const chainList = byChain[tile.chain] ?? []
      chainList.push(tile.id)
      byChain[tile.chain] = chainList
    }
    for (const parameter of tile.parameters) {
      const list = byParameter[parameter] ?? []
      list.push(tile.id)
      byParameter[parameter] = list
    }
  }

  return {
    version: MESH_TILE_MAP_VERSION,
    identity: "melody",
    sourceModel: IDENTITY_MODEL3_PATHS.melody,
    still: MELODY_STILL_PATH,
    meshMap: "models/melody/mesh-map.json",
    figure: meshMap.figure,
    tiles,
    byRegion,
    bySegment,
    byChain,
    byParameter,
  }
}

export function tilesForParameter(
  tileMap: IdentityTileMap,
  parameter: string,
): readonly MeshTile[] {
  const ids = new Set(tileMap.byParameter[parameter] ?? [])
  return tileMap.tiles.filter((tile) => ids.has(tile.id))
}

export function tilesForChain(
  tileMap: IdentityTileMap,
  chain: TileChain,
): readonly MeshTile[] {
  const ids = new Set(tileMap.byChain[chain] ?? [])
  return tileMap.tiles
    .filter((tile) => ids.has(tile.id))
    .slice()
    .sort((a, b) => a.joint - b.joint || b.figure.y - a.figure.y)
}

export function tileForDrawable(
  tileMap: IdentityTileMap,
  drawableId: string,
): MeshTile | null {
  return tileMap.tiles.find((tile) => tile.id === drawableId) ?? null
}

export function serializeMelodyTileMap(
  meshMap: IdentityMeshMap,
): IdentityTileMap {
  return buildIdentityTileMap(meshMap)
}

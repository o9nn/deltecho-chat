/**
 * 2D Live2D ↔ 3D avatar mesh correspondence for Melody.
 *
 * Live2D stays the runtime renderer (`melody_t03.moc3`). The 3D groups
 * name the bind-pose parts on the A-pose still so a later glTF/VRM can
 * use the same region and landmark ids — not a second Live2D mesh.
 */

import type { MeshRegion } from "./mesh-map";
import { IDENTITY_MODEL3_PATHS } from "./mesh-map";
import type { AutomeshLandmark } from "./types";
import { MELODY_AUTOMESH_LANDMARKS } from "./landmarks";

export const AVATAR_MESH_MAP_VERSION = 1 as const;

export const AVATAR_MESH_KINDS = ["live2d", "mesh3d"] as const;
export type AvatarMeshKind = (typeof AVATAR_MESH_KINDS)[number];

/** Bind-pose parts on the Melody A-pose still / a future 3D mesh. */
export const MELODY_MESH3D_GROUPS = [
  "hairCrown",
  "hairPonytail",
  "bangs",
  "headsetBand",
  "headsetCups",
  "face",
  "eyes",
  "mouth",
  "cropTop",
  "gloveL",
  "gloveR",
  "skirt",
  "skirtBelts",
  "thighStrap",
  "bootL",
  "bootR",
  "wingBones",
  "wingFeathers",
  "energyRibbons",
] as const;

export type MelodyMesh3dGroup = (typeof MELODY_MESH3D_GROUPS)[number];

export type Mesh3dGroupSpec = {
  readonly id: MelodyMesh3dGroup;
  readonly label: string;
  readonly live2dRegions: readonly MeshRegion[];
  readonly physics: readonly string[];
  readonly parameters: readonly string[];
  readonly deformBands: readonly string[];
  readonly visibleInAPose: boolean;
};

export type Live2dTo3dBinding = {
  readonly region: MeshRegion;
  readonly mesh3d: readonly MelodyMesh3dGroup[];
};

export type IdentityAvatarMeshMap = {
  readonly version: typeof AVATAR_MESH_MAP_VERSION;
  readonly identity: "melody";
  readonly sourceModel: string;
  readonly still: string;
  readonly live2d: {
    readonly kind: "live2d";
    readonly model3: string;
    readonly moc3: string;
    readonly texture: string;
    readonly meshMap: string;
    readonly poseMap: string;
    readonly tileMap: string;
    readonly physics: string;
  };
  readonly mesh3d: {
    readonly kind: "mesh3d";
    readonly bindPose: "a-pose";
    readonly groups: readonly Mesh3dGroupSpec[];
  };
  readonly live2dTo3d: readonly Live2dTo3dBinding[];
  readonly landmarks: readonly AutomeshLandmark[];
};

export const MELODY_MESH3D_GROUP_SPECS: readonly Mesh3dGroupSpec[] = [
  {
    id: "hairCrown",
    label: "Crown / volume",
    live2dRegions: ["hair"],
    physics: ["HairFront", "HairSide"],
    parameters: ["ParamHairFront", "ParamHairSide"],
    deformBands: ["hair-volume", "hair-sides"],
    visibleInAPose: true,
  },
  {
    id: "hairPonytail",
    label: "High ponytail",
    live2dRegions: ["hair"],
    physics: ["HairBack"],
    parameters: ["ParamHairBack", "ParamHairTail"],
    deformBands: ["hair-volume"],
    visibleInAPose: true,
  },
  {
    id: "bangs",
    label: "Bangs",
    live2dRegions: ["hair"],
    physics: ["HairFront"],
    parameters: ["ParamHairFront"],
    deformBands: ["hair-volume"],
    visibleInAPose: true,
  },
  {
    id: "headsetBand",
    label: "Headset band",
    live2dRegions: ["headset"],
    physics: [],
    parameters: ["ParamAngleX", "ParamAngleY", "ParamAngleZ"],
    deformBands: ["headset"],
    visibleInAPose: true,
  },
  {
    id: "headsetCups",
    label: "Gold ear cups",
    live2dRegions: ["headset"],
    physics: [],
    parameters: ["ParamAngleX", "ParamAngleY"],
    deformBands: ["headset"],
    visibleInAPose: true,
  },
  {
    id: "face",
    label: "Face / skin",
    live2dRegions: ["face"],
    physics: [],
    parameters: ["ParamAngleX", "ParamAngleY", "ParamAngleZ"],
    deformBands: [],
    visibleInAPose: true,
  },
  {
    id: "eyes",
    label: "Eyes",
    live2dRegions: ["face"],
    physics: [],
    parameters: [
      "ParamEyeLOpen",
      "ParamEyeROpen",
      "ParamEyeLSmile",
      "ParamEyeRSmile",
      "ParamEyeBallX",
      "ParamEyeBallY",
    ],
    deformBands: [],
    visibleInAPose: true,
  },
  {
    id: "mouth",
    label: "Mouth",
    live2dRegions: ["face"],
    physics: [],
    parameters: ["ParamMouthForm", "ParamMouthOpenY"],
    deformBands: [],
    visibleInAPose: true,
  },
  {
    id: "cropTop",
    label: "Iridescent silver crop",
    live2dRegions: ["body"],
    physics: ["Body", "Chest"],
    parameters: ["ParamBreath", "ParamBodyAngleX", "ParamBodyAngleZ"],
    deformBands: ["waist-crop"],
    visibleInAPose: true,
  },
  {
    id: "gloveL",
    label: "Left fingerless glove",
    live2dRegions: ["armL"],
    physics: ["SleeveL"],
    parameters: ["ParamArmL1", "ParamArmL2", "ParamSleeveL"],
    deformBands: [],
    visibleInAPose: true,
  },
  {
    id: "gloveR",
    label: "Right fingerless glove",
    live2dRegions: ["armR"],
    physics: ["SleeveR"],
    parameters: ["ParamArmR1", "ParamArmR2", "ParamSleeve"],
    deformBands: [],
    visibleInAPose: true,
  },
  {
    id: "skirt",
    label: "Black pleated miniskirt",
    live2dRegions: ["skirt"],
    physics: ["Skirt"],
    parameters: ["ParamBodyAngleX", "ParamBodyAngleZ", "ParamCloth1"],
    deformBands: ["skirt-hem"],
    visibleInAPose: true,
  },
  {
    id: "skirtBelts",
    label: "Purple cross belts",
    live2dRegions: ["skirt", "accessory"],
    physics: ["Skirt"],
    parameters: ["ParamCloth1", "ParamCloth2"],
    deformBands: ["skirt-hem"],
    visibleInAPose: true,
  },
  {
    id: "thighStrap",
    label: "Right-thigh strap",
    live2dRegions: ["legR", "accessory"],
    physics: [],
    parameters: ["ParamLegRibbonR1", "ParamLegRibbonR2"],
    deformBands: [],
    visibleInAPose: true,
  },
  {
    id: "bootL",
    label: "Left white platform boot",
    live2dRegions: ["legL"],
    physics: [],
    parameters: ["ParamLegL1X", "ParamLegL2X", "ParamLegL3X"],
    deformBands: ["boots"],
    visibleInAPose: true,
  },
  {
    id: "bootR",
    label: "Right white platform boot",
    live2dRegions: ["legR"],
    physics: [],
    parameters: ["ParamLegR1X", "ParamLegR2X", "ParamLegR3X"],
    deformBands: ["boots"],
    visibleInAPose: true,
  },
  {
    id: "wingBones",
    label: "Silver wing frame",
    live2dRegions: ["wings"],
    physics: ["WingL", "WingR"],
    parameters: ["ParamFlapping3", "ParamFlapping4"],
    deformBands: ["wings"],
    visibleInAPose: true,
  },
  {
    id: "wingFeathers",
    label: "Pink / silver feathers",
    live2dRegions: ["wings"],
    physics: ["WingL", "WingR"],
    parameters: ["ParamFlapping7", "ParamFlapping8"],
    deformBands: ["wings"],
    visibleInAPose: true,
  },
  {
    id: "energyRibbons",
    label: "Translucent musical ribbons",
    live2dRegions: ["wings", "sparkle"],
    physics: ["WingL", "WingR"],
    parameters: ["ParamFlapping3", "ParamFlapping7"],
    deformBands: ["wings"],
    visibleInAPose: true,
  },
];

export const MELODY_LIVE2D_TO_3D: readonly Live2dTo3dBinding[] = [
  { region: "hair", mesh3d: ["hairCrown", "hairPonytail", "bangs"] },
  { region: "headset", mesh3d: ["headsetBand", "headsetCups"] },
  { region: "face", mesh3d: ["face", "eyes", "mouth"] },
  { region: "body", mesh3d: ["cropTop"] },
  { region: "armL", mesh3d: ["gloveL"] },
  { region: "armR", mesh3d: ["gloveR"] },
  { region: "skirt", mesh3d: ["skirt", "skirtBelts"] },
  { region: "legL", mesh3d: ["bootL"] },
  { region: "legR", mesh3d: ["bootR", "thighStrap"] },
  { region: "wings", mesh3d: ["wingBones", "wingFeathers", "energyRibbons"] },
  { region: "sparkle", mesh3d: ["energyRibbons"] },
  { region: "accessory", mesh3d: ["thighStrap", "skirtBelts"] },
  { region: "chestCloth", mesh3d: [] },
  { region: "environment", mesh3d: [] },
];

export const MELODY_AVATAR_MESH_MAP: IdentityAvatarMeshMap = {
  version: AVATAR_MESH_MAP_VERSION,
  identity: "melody",
  sourceModel: IDENTITY_MODEL3_PATHS.melody,
  still: "./images/avatar/identities/melody.webp",
  live2d: {
    kind: "live2d",
    model3: IDENTITY_MODEL3_PATHS.melody,
    moc3: "models/melody/melody_t03.moc3",
    texture: "models/melody/textures/texture_00.png",
    meshMap: "models/melody/mesh-map.json",
    poseMap: "models/melody/pose-map.json",
    tileMap: "models/melody/tile-map.json",
    physics: "models/melody/melody_t03.physics3.json",
  },
  mesh3d: {
    kind: "mesh3d",
    bindPose: "a-pose",
    groups: MELODY_MESH3D_GROUP_SPECS,
  },
  live2dTo3d: MELODY_LIVE2D_TO_3D,
  landmarks: MELODY_AUTOMESH_LANDMARKS,
};

export function mesh3dGroupsForRegion(
  region: MeshRegion,
): readonly MelodyMesh3dGroup[] {
  return (
    MELODY_LIVE2D_TO_3D.find((item) => item.region === region)?.mesh3d ?? []
  );
}

export function live2dRegionsForMesh3d(
  group: MelodyMesh3dGroup,
): readonly MeshRegion[] {
  return (
    MELODY_MESH3D_GROUP_SPECS.find((item) => item.id === group)
      ?.live2dRegions ?? []
  );
}

export function resolveAvatarMeshMap(
  identity: unknown,
): IdentityAvatarMeshMap | null {
  return identity === "melody" ? MELODY_AVATAR_MESH_MAP : null;
}

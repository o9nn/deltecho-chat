export {
  AUTOMESH_LANDMARK_IDS,
  AUTOMESH_MAPPING_VERSION,
  type Point2,
  type AutomeshLandmarkId,
  type AutomeshLandmark,
  type AutomeshDrawable,
  type AutomeshMapping,
  type AutomeshRaster,
  type SimilarityTransform,
} from "./types";

export {
  MELODY_AUTOMESH_LANDMARKS,
  MELODY_PORTRAIT_LANDMARKS,
  cloneMelodyLandmarks,
  isAutomeshLandmarkId,
  clamp01,
  sanitizePoint,
} from "./landmarks";

export {
  mapPoint,
  warpRasterToAtlas,
  punchOpaqueBackground,
  rasterToDataUrl,
} from "./warp";

export {
  projectPhotoOntoAtlas,
  fitPhotoToMesh,
  modelDestForLandmark,
} from "./project";

export { MELODY_PARAMETER_PROFILE, mergeParameterProfile } from "./parameters";

export {
  DEFAULT_MELODY_POSE_ID,
  MELODY_POSES,
  MELODY_POSE_IDS,
  MELODY_POSE_MAP_VERSION,
  isMelodyPoseId,
  parametersForMelodyPose,
  poseForExpression,
  poseForMotion,
  resolveMelodyPose,
  serializeMelodyPoseMap,
  type MelodyPose,
  type MelodyPoseId,
  type MelodyPoseMotionGroup,
} from "./pose-map";

export {
  AVATAR_MESH_KINDS,
  AVATAR_MESH_MAP_VERSION,
  MELODY_AVATAR_MESH_MAP,
  MELODY_LIVE2D_TO_3D,
  MELODY_MESH3D_GROUPS,
  MELODY_MESH3D_GROUP_SPECS,
  live2dRegionsForMesh3d,
  mesh3dGroupsForRegion,
  resolveAvatarMeshMap,
  type AvatarMeshKind,
  type IdentityAvatarMeshMap,
  type Live2dTo3dBinding,
  type MelodyMesh3dGroup,
  type Mesh3dGroupSpec,
} from "./avatar-mesh-map";

export {
  normalizeDrawableId,
  drawableMatchesHints,
  boundsCentroid,
  assignAtlasFromDrawables,
  uvCentroid,
  uvIsland,
  isGenericArtMeshId,
  isEnvironmentDrawable,
  unionDrawableBounds,
  figureFromDrawables,
} from "./inspect";

export {
  fitSimilarity,
  applySimilarity,
  mappingResidual,
  trainAutomeshMapping,
  resolveAutomeshMapping,
} from "./fit";

export {
  GROVE_MESH_DEFORM,
  MELODY_MESH_DEFORM,
  applyMeshDeform,
  applyMeshDeformToDrawables,
  type FigureBounds,
  type MeshDeformBand,
  type MeshDeformProfile,
  type MutablePositions,
} from "./deform";

export {
  GROVE_PHYSICS_RETARGET,
  MELODY_PHYSICS_RETARGET,
  MIARA_PHYSICS_SETTING_NAMES,
  applyPhysicsRetarget,
  retargetPhysics3Document,
  classifyPhysicsSettingName,
  namePhysicsSettings,
  readPhysicsDictionaryNames,
  restorePhysicsRig,
  snapshotPhysicsRig,
  type PhysicsGroupKind,
  type PhysicsGroupScale,
  type PhysicsRetargetProfile,
  type PhysicsRigLike,
  type PhysicsRigSnapshot,
} from "./physics";

export {
  GROVE_IDENTITY_RIG,
  MELODY_IDENTITY_RIG,
  resolveIdentityRig,
  type IdentityRig,
  type IdentityRigId,
} from "./identity-rig";

export {
  CUBISM_EDITOR_DEFAULT_PORT,
  CUBISM_EDITOR_API_VERSION,
  cubismEditorUrl,
  cubismEditorRequest,
  parseCubismEditorMessage,
  CubismEditorBridge,
  createBrowserCubismEditorBridge,
  type CubismEditorEnvelope,
  type CubismEditorSocket,
} from "./editor-bridge";

export {
  MESH_MAP_VERSION,
  MESH_REGIONS,
  IDENTITY_MODEL3_PATHS,
  identityCubismStem,
  identityModel3Path,
  KNOWN_CHEST_CLOTH_IDS,
  KNOWN_WING_IDS,
  KNOWN_SPARKLE_IDS,
  REGION_MOTION_BINDINGS,
  buildIdentityMeshMap,
  classifyDrawable,
  figureCentroidFromPositions,
  inspectedToDrawableIndex,
  isEnvironmentUv,
  refineFigureFromDrawables,
  regionCounts,
  regionForDrawable,
  uvIslandBox,
  type ClassifyDrawableInput,
  type DrawableMeshIndex,
  type FigurePoint,
  type IdentityMeshMap,
  type IdentityModelId,
  type InspectedDrawable,
  type MeshRegion,
  type RegionMotionBinding,
  type UvIsland,
} from "./mesh-map";

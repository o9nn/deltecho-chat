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

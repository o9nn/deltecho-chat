/**
 * Avatar Package for Deep Tree Echo
 *
 * Provides visual AI representation with expression mapping
 * from emotional state and Live2D Cubism integration.
 */

// Miara wardrobe
export {
  MIARA_OUTFIT_IDS,
  DEFAULT_MIARA_OUTFIT_ID,
  MIARA_PART_GROUPS,
  MIARA_PART_GROUP_IDS,
  ALL_MIARA_WARDROBE_PART_IDS,
  MIARA_OUTFIT_PRESETS,
  isMiaraOutfitId,
  isMiaraPartGroup,
  getMiaraOutfitPreset,
  collectHiddenPartIds,
  partIdMatchesHiddenGroups,
  MIARA_PART_GROUP_MATCHERS,
  resolveMiaraOutfit,
  finalizeMiaraOutfit,
  outfitFromCustomAdjustments,
  type MiaraOutfitId,
  type MiaraPartGroup,
  type MiaraOutfitSpec,
  type MiaraOutfitState,
} from "./miara-outfits";

export {
  MIARA_CUBISM_EXPRESSION_NAMES,
  MIARA_EXPRESSION_MAP,
  isMiaraCubismExpressionName,
  cubismExpressionFile,
  LIVE_AVATAR_EXPRESSION,
  AVATAR_EXPRESSION_CHOICES,
  resolveAvatarExpression,
  type MiaraCubismExpressionName,
  type AvatarExpressionId,
  type AvatarExpressionChoice,
} from "./miara-expressions";

export {
  AUTOMESH_LANDMARK_IDS,
  AUTOMESH_MAPPING_VERSION,
  MELODY_AUTOMESH_LANDMARKS,
  MELODY_PORTRAIT_LANDMARKS,
  MELODY_PARAMETER_PROFILE,
  cloneMelodyLandmarks,
  projectPhotoOntoAtlas,
  isAutomeshLandmarkId,
  mapPoint,
  warpRasterToAtlas,
  punchOpaqueBackground,
  rasterToDataUrl,
  assignAtlasFromDrawables,
  uvCentroid,
  uvIsland,
  isEnvironmentDrawable,
  figureFromDrawables,
  trainAutomeshMapping,
  resolveAutomeshMapping,
  mappingResidual,
  fitSimilarity,
  applySimilarity,
  cubismEditorRequest,
  parseCubismEditorMessage,
  cubismEditorUrl,
  CubismEditorBridge,
  createBrowserCubismEditorBridge,
  CUBISM_EDITOR_DEFAULT_PORT,
  type Point2,
  type AutomeshLandmarkId,
  type AutomeshLandmark,
  type AutomeshDrawable,
  type AutomeshMapping,
  type AutomeshRaster,
  buildIdentityMeshMap,
  classifyDrawable,
  regionForDrawable,
  type IdentityMeshMap,
  type MeshRegion,
  DEFAULT_MELODY_POSE_ID,
  MELODY_POSES,
  MELODY_POSE_IDS,
  isMelodyPoseId,
  parametersForMelodyPose,
  poseForExpression,
  poseForMotion,
  resolveMelodyPose,
  serializeMelodyPoseMap,
  MELODY_AVATAR_MESH_MAP,
  MESH_TILE_MAP_VERSION,
  TILE_SEGMENTS,
  buildIdentityTileMap,
  tileForDrawable,
  tilesForChain,
  tilesForParameter,
  serializeMelodyTileMap,
  mesh3dGroupsForRegion,
  live2dRegionsForMesh3d,
  resolveAvatarMeshMap,
  type MelodyPose,
  type MelodyPoseId,
  type IdentityAvatarMeshMap,
  type IdentityTileMap,
  type MelodyMesh3dGroup,
  type MeshTile,
  type TileSegment,
} from "./automesh";

export {
  AVATAR_IDENTITY_IDS,
  DEFAULT_AVATAR_IDENTITY_ID,
  IDENTITY_MODEL3_PATHS,
  SHIPPED_MELODY_ATLAS,
  AVATAR_IDENTITIES,
  isAvatarIdentityId,
  getAvatarIdentity,
  resolveAvatarIdentity,
  lookForAvatarIdentity,
  applyAvatarIdentity,
  applyIdentityLook,
  defaultAtlasForIdentity,
  extraHiddenGroupsForIdentity,
  identityHasBakedLook,
  mergeIdentityHiddenGroups,
  modelForAvatarIdentity,
  model3PathForAvatarIdentity,
  identityModel3Path,
  resolveIdentityOverlay,
  resolveIdentityParameters,
  resolveIdentityRig,
  type AvatarIdentityId,
  type AvatarIdentitySpec,
  type IdentityLookController,
  type IdentityRig,
} from "./avatar-identities";

// Types
export {
  Expression,
  EmotionalVector,
  AvatarState,
  AvatarMotion,
  MotionRequest,
  AvatarEvent,
  AvatarEventListener,
  AvatarControllerConfig,
  DEFAULT_AVATAR_CONFIG,
} from "./types";

// Expression Mapping
export {
  mapEmotionToExpression,
  getExpressionIntensity,
  ExpressionMapper,
} from "./expression-mapper";

// Avatar Controller
export { AvatarController } from "./avatar-controller";

// Deep Tree Echo expression projection atlas
export {
  DTE_EXPRESSION_MAP,
  projectDTEchoCognitiveState,
  type DTEchoCognitiveMode,
  type DTEchoExpressionName,
  type DTEchoHormoneVector,
  type DTEchoProjectionInput,
  type DTEchoExpressionProfile,
  type DTEchoVisualProjection,
} from "./dtecho-expression-driver";

// Cubism Adapter
export {
  CubismModelInfo,
  CubismExpressionMap,
  CubismMotionMap,
  CubismAdapterConfig,
  ICubismRenderer,
  StubCubismRenderer,
  CubismAdapter,
} from "./adapters/cubism-adapter";

// Idle Animation System
export {
  IdleAnimationSystem,
  createIdleAnimationSystem,
  IdleAnimationConfig,
  DEFAULT_IDLE_CONFIG,
  IdleAnimationState,
  IdleAnimationEventType,
  IdleAnimationEvent,
  IdleAnimationEventListener,
} from "./idle-animation";

// PixiJS Live2D Renderer
export {
  PixiLive2DRenderer,
  PixiLive2DConfig,
  createPixiLive2DRenderer,
  PARAM_IDS,
} from "./adapters/pixi-live2d-renderer";

// Live2D Avatar Manager
export {
  Live2DAvatarProps,
  Live2DAvatarState,
  Live2DCognitiveVisualState,
  Live2DAvatarController,
  Live2DAvatarManager,
  createLive2DAvatarManager,
  SAMPLE_MODELS,
  DEFAULT_MODEL_CONFIG,
} from "./adapters/live2d-avatar";

// Cognitive-Avatar Bridge
export {
  CognitiveAvatarBridge,
  cognitiveAvatarBridge,
  type CognitiveStateInput,
  type AvatarResponseState,
  type CognitiveAvatarBridgeConfig,
} from "./cognitive-avatar-bridge";

// ESN Reservoir-Avatar Bridge
export {
  ESNAvatarBridge,
  esnAvatarBridge,
  type ReservoirAnimationParams,
  type ReservoirInput,
  type EntelechyInput,
  type ESNAvatarBridgeConfig,
} from "./esn-avatar-bridge";

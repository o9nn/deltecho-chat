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

export {
  MELODY_PARAMETER_PROFILE,
  mergeParameterProfile,
} from "./parameters";

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

/**
 * Avatar Package for Deep Tree Echo
 *
 * Provides visual AI representation with expression mapping
 * from emotional state and Live2D Cubism integration.
 */

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

// Self-Model Avatar Feedback (Loop 4: perceive → correct → self-model)
export {
  SelfModelAvatarFeedback,
  selfModelAvatarFeedback,
  type CubismParamSnapshot,
  type ExpressionExperience,
  type ProjectionCalibration,
  type SelfModelFeedbackConfig,
} from "./self-model-avatar-feedback";

// Chaotic Micro-Expression Layer (Lorenz attractor-driven organic roughness)
export {
  ChaoticMicroExpressionLayer,
  type EndocrineInput as ChaoticEndocrineInput,
  type MicroExpressionDeltas,
  type LorenzState,
  type PlayfulMicroGesture,
} from "./chaotic-micro-expression-layer";

// Signature Gesture Controller (DTE identity echo across modes)
export {
  SignatureGestureController,
  type SignatureGestureState,
  type SignatureGestureOverlay,
  type SignatureGestureConfig,
} from "./signature-gesture-controller";

// CogMorph Glyph → Cubism Parameter Mapper (visual self-representation)
export {
  CogMorphCubismMapper,
  type CogMorphGlyphState,
  type CogMorphCubismOverlay,
  type CogMorphCubismConfig,
} from "./cogmorph-cubism-mapper";

// Meshy3D Avatar Bridge (3D model generation from cognitive state)
export {
  Meshy3DAvatarBridge,
  type Meshy3DConfig,
  type AvatarStateSnapshot,
  type Meshy3DTask,
  type GenerationResult,
} from "./meshy3d-avatar-bridge";

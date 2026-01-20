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

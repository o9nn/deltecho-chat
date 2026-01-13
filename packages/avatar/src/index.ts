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
} from './types';

// Expression Mapping
export {
    mapEmotionToExpression,
    getExpressionIntensity,
    ExpressionMapper,
} from './expression-mapper';

// Avatar Controller
export { AvatarController } from './avatar-controller';

// Cubism Adapter
export {
    CubismModelInfo,
    CubismExpressionMap,
    CubismMotionMap,
    CubismAdapterConfig,
    ICubismRenderer,
    StubCubismRenderer,
    CubismAdapter,
} from './adapters/cubism-adapter';

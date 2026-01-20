/**
 * PixiJS Live2D Renderer
 *
 * Implements the ICubismRenderer interface using pixi-live2d-display.
 * This provides actual Live2D model rendering with full expression,
 * motion, and lip-sync support.
 */

import type { Application, Container } from "pixi.js";
import type { Expression, AvatarMotion } from "../types";
import type {
  ICubismRenderer,
  CubismAdapterConfig,
  CubismModelInfo,
} from "./cubism-adapter";

/**
 * Live2D model reference type (from pixi-live2d-display)
 */
interface Live2DModel {
  x: number;
  y: number;
  scale: { x: number; y: number; set: (x: number, y?: number) => void };
  anchor: { x: number; y: number; set: (x: number, y?: number) => void };
  internalModel: {
    motionManager: {
      startMotion: (
        group: string,
        index: number,
        priority?: number,
      ) => Promise<boolean>;
      stopAllMotions: () => void;
    };
    coreModel: {
      setParameterValueById: (id: string, value: number) => void;
      getParameterValueById: (id: string) => number;
    };
  };
  expression: (name?: string) => void;
  motion: (
    group: string,
    index?: number,
    priority?: number,
  ) => Promise<boolean>;
  speak: (
    audioUrl: string,
    options?: { volume?: number; crossOrigin?: string },
  ) => void;
  stopSpeaking: () => void;
  destroy: () => void;
}

/**
 * Expression to Live2D expression name mapping
 */
const DEFAULT_EXPRESSION_MAP: Record<Expression, string> = {
  neutral: "neutral",
  happy: "happy",
  thinking: "thinking",
  curious: "curious",
  surprised: "surprised",
  concerned: "sad",
  focused: "focused",
  playful: "happy",
  contemplative: "thinking",
  empathetic: "neutral",
};

/**
 * Motion to Live2D motion group mapping
 */
const DEFAULT_MOTION_MAP: Record<
  AvatarMotion,
  { group: string; index: number }
> = {
  idle: { group: "idle", index: 0 },
  talking: { group: "tap_body", index: 0 },
  nodding: { group: "tap_body", index: 1 },
  shaking_head: { group: "shake", index: 0 },
  tilting_head: { group: "flick_head", index: 0 },
  breathing: { group: "idle", index: 0 },
  wave: { group: "tap_body", index: 2 },
  nod: { group: "tap_body", index: 1 },
  shake: { group: "shake", index: 0 },
  thinking: { group: "idle", index: 1 },
};

/**
 * Live2D model parameter IDs for common controls
 */
const PARAM_IDS = {
  // Mouth parameters
  PARAM_MOUTH_OPEN_Y: "ParamMouthOpenY",
  PARAM_MOUTH_FORM: "ParamMouthForm",
  // Eye parameters
  PARAM_EYE_L_OPEN: "ParamEyeLOpen",
  PARAM_EYE_R_OPEN: "ParamEyeROpen",
  // Brow parameters
  PARAM_BROW_L_Y: "ParamBrowLY",
  PARAM_BROW_R_Y: "ParamBrowRY",
  // Body parameters
  PARAM_BODY_ANGLE_X: "ParamBodyAngleX",
  PARAM_BODY_ANGLE_Y: "ParamBodyAngleY",
  PARAM_BODY_ANGLE_Z: "ParamBodyAngleZ",
  // Head parameters
  PARAM_ANGLE_X: "ParamAngleX",
  PARAM_ANGLE_Y: "ParamAngleY",
  PARAM_ANGLE_Z: "ParamAngleZ",
};

/**
 * Configuration for the PixiJS Live2D renderer
 */
export interface PixiLive2DConfig extends Omit<CubismAdapterConfig, "canvas"> {
  /** Canvas element or ID */
  canvas: string | HTMLCanvasElement;
  /** Pixel ratio for high-DPI displays */
  pixelRatio?: number;
  /** Background color (transparent by default) */
  backgroundColor?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * PixiJS-based Live2D model renderer
 *
 * This class provides real Live2D model rendering using the
 * pixi-live2d-display library. It supports:
 * - Expression changes
 * - Motion playback
 * - Real-time lip sync from audio levels
 * - Eye blinking
 */
export class PixiLive2DRenderer implements ICubismRenderer {
  private app: Application | null = null;
  private model: Live2DModel | null = null;
  private config: PixiLive2DConfig | null = null;
  private initialized = false;
  private currentExpression: Expression = "neutral";
  private lipSyncValue = 0;
  private isBlinking = false;
  private blinkTimer: ReturnType<typeof setInterval> | null = null;
  private expressionMap: Record<Expression, string> = DEFAULT_EXPRESSION_MAP;
  private motionMap: Record<AvatarMotion, { group: string; index: number }> =
    DEFAULT_MOTION_MAP;

  /**
   * Initialize the renderer with configuration
   */
  async initialize(config: CubismAdapterConfig): Promise<void> {
    this.config = config as PixiLive2DConfig;

    // Dynamically import PixiJS and pixi-live2d-display-lipsyncpatch
    const [{ Application }, { Live2DModel: Live2DModelClass }] =
      await Promise.all([
        import("pixi.js"),
        import("pixi-live2d-display-lipsyncpatch"),
      ]);

    // Get or create canvas element
    let canvas: HTMLCanvasElement;
    if (typeof config.canvas === "string") {
      const element = document.getElementById(config.canvas);
      if (!element || !(element instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas element not found: ${config.canvas}`);
      }
      canvas = element;
    } else {
      canvas = config.canvas;
    }

    // Create PixiJS application
    this.app = new Application({
      view: canvas,
      backgroundAlpha: 0,
      resolution:
        (config as PixiLive2DConfig).pixelRatio ?? window.devicePixelRatio ?? 1,
      autoDensity: true,
      resizeTo: canvas.parentElement ?? undefined,
    });

    // Register the Live2D ticker for animation updates
    // Note: Type cast needed due to pixi-live2d-display type definitions
    Live2DModelClass.registerTicker(
      this.app.ticker as unknown as typeof import("pixi.js").Ticker,
    );

    // Apply custom expression/motion mappings
    if (config.expressions) {
      this.expressionMap = {
        ...DEFAULT_EXPRESSION_MAP,
        ...(config.expressions as Record<Expression, string>),
      };
    }
    if (config.motions) {
      this.motionMap = {
        ...DEFAULT_MOTION_MAP,
        ...(config.motions as Record<
          AvatarMotion,
          { group: string; index: number }
        >),
      };
    }

    this.initialized = true;
    console.log("[PixiLive2DRenderer] Initialized successfully");
  }

  /**
   * Load and display a Live2D model
   */
  async loadModel(modelInfo: CubismModelInfo): Promise<void> {
    if (!this.app || !this.initialized) {
      throw new Error("Renderer not initialized");
    }

    // Dynamically import Live2DModel
    const { Live2DModel: Live2DModelClass } = await import(
      "pixi-live2d-display-lipsyncpatch"
    );

    // Dispose existing model
    if (this.model) {
      this.model.destroy();
      this.model = null;
    }

    try {
      // Load the model
      const model = (await Live2DModelClass.from(
        modelInfo.modelPath,
      )) as unknown as Live2DModel;
      this.model = model;

      // Position and scale the model
      const scale = modelInfo.scale ?? 0.25;
      model.scale.set(scale, scale);
      model.anchor.set(0.5, 0.5);

      // Center in canvas
      if (this.app.view) {
        const canvas = this.app.view as HTMLCanvasElement;
        model.x = canvas.width / 2 + (modelInfo.offset?.x ?? 0);
        model.y = canvas.height / 2 + (modelInfo.offset?.y ?? 0);
      }

      // Add to stage
      this.app.stage.addChild(model as unknown as Container);

      // Start auto-blink
      this.startAutoBlinkLoop();

      console.log(`[PixiLive2DRenderer] Model loaded: ${modelInfo.name}`);
    } catch (error) {
      console.error("[PixiLive2DRenderer] Failed to load model:", error);
      throw error;
    }
  }

  /**
   * Set expression on the model
   */
  setExpression(expression: Expression, intensity: number): void {
    if (!this.model || !this.initialized) return;

    this.currentExpression = expression;
    const expressionName = this.expressionMap[expression] ?? "neutral";

    try {
      // Try to set expression using the expression() method
      this.model.expression(expressionName);

      // Also adjust facial parameters based on intensity
      this.adjustFacialParameters(expression, intensity);

      console.log(
        `[PixiLive2DRenderer] Expression set: ${expression} (${expressionName}) at ${(
          intensity * 100
        ).toFixed(0)}%`,
      );
    } catch (error) {
      console.warn(
        "[PixiLive2DRenderer] Expression not available:",
        expressionName,
      );
    }
  }

  /**
   * Adjust facial parameters based on expression and intensity
   */
  private adjustFacialParameters(
    expression: Expression,
    intensity: number,
  ): void {
    if (!this.model?.internalModel?.coreModel) return;

    const core = this.model.internalModel.coreModel;

    // Adjust brows based on expression
    switch (expression) {
      case "happy":
      case "playful":
        // Raise brows slightly for happy expressions
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_L_Y, 0.3 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_R_Y, 0.3 * intensity);
        this.setParameterSafe(
          core,
          PARAM_IDS.PARAM_MOUTH_FORM,
          0.5 * intensity,
        ); // Smile
        break;

      case "surprised":
        // Raise brows significantly
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_L_Y, 0.8 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_R_Y, 0.8 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 1.2);
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 1.2);
        break;

      case "concerned":
        // Furrow brows inward
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_L_Y, -0.3 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_R_Y, -0.3 * intensity);
        this.setParameterSafe(
          core,
          PARAM_IDS.PARAM_MOUTH_FORM,
          -0.3 * intensity,
        ); // Slight frown
        break;

      case "thinking":
      case "contemplative":
        // Slight asymmetric brow raise
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_L_Y, 0.2 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_ANGLE_Z, 5 * intensity); // Head tilt
        break;

      case "focused":
        // Neutral brows, slightly narrowed eyes
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 0.8);
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 0.8);
        break;

      default:
        // Reset to neutral
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_L_Y, 0);
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_R_Y, 0);
        this.setParameterSafe(core, PARAM_IDS.PARAM_MOUTH_FORM, 0);
        break;
    }
  }

  /**
   * Safely set a parameter value, catching errors for missing parameters
   */
  private setParameterSafe(
    core: { setParameterValueById: (id: string, value: number) => void },
    paramId: string,
    value: number,
  ): void {
    try {
      core.setParameterValueById(paramId, value);
    } catch {
      // Parameter not available in this model - ignore
    }
  }

  /**
   * Play a motion animation
   */
  playMotion(motion: AvatarMotion, priority = 2): void {
    if (!this.model || !this.initialized) return;

    const motionDef = this.motionMap[motion];
    if (!motionDef) {
      console.warn("[PixiLive2DRenderer] Motion not mapped:", motion);
      return;
    }

    try {
      this.model.motion(motionDef.group, motionDef.index, priority);
      console.log(
        `[PixiLive2DRenderer] Motion played: ${motion} (${motionDef.group}[${motionDef.index}])`,
      );
    } catch (error) {
      console.warn("[PixiLive2DRenderer] Motion playback failed:", error);
    }
  }

  /**
   * Update lip sync based on audio level (0-1)
   */
  updateLipSync(audioLevel: number): void {
    if (!this.model?.internalModel?.coreModel || !this.initialized) return;

    // Clamp and smooth the audio level
    const clampedLevel = Math.max(0, Math.min(1, audioLevel));

    // Apply smoothing to prevent jittery mouth movement
    this.lipSyncValue = this.lipSyncValue * 0.6 + clampedLevel * 0.4;

    // Set the mouth open parameter
    try {
      this.model.internalModel.coreModel.setParameterValueById(
        PARAM_IDS.PARAM_MOUTH_OPEN_Y,
        this.lipSyncValue,
      );
    } catch {
      // Parameter might not be available
    }
  }

  /**
   * Set eye blink state
   */
  setBlinking(isBlinking: boolean): void {
    if (!this.model?.internalModel?.coreModel || !this.initialized) return;

    this.isBlinking = isBlinking;
    const eyeOpenValue = isBlinking ? 0 : 1;

    try {
      this.model.internalModel.coreModel.setParameterValueById(
        PARAM_IDS.PARAM_EYE_L_OPEN,
        eyeOpenValue,
      );
      this.model.internalModel.coreModel.setParameterValueById(
        PARAM_IDS.PARAM_EYE_R_OPEN,
        eyeOpenValue,
      );
    } catch {
      // Parameters might not be available
    }
  }

  /**
   * Start automatic blink loop
   */
  private startAutoBlinkLoop(): void {
    // Stop existing timer
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
    }

    // Random blink every 2-6 seconds
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000;
      this.blinkTimer = setTimeout(() => {
        this.performBlink();
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
  }

  /**
   * Perform a single blink animation
   */
  private performBlink(): void {
    if (!this.model?.internalModel?.coreModel) return;

    const core = this.model.internalModel.coreModel;

    // Close eyes
    this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 0);
    this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 0);

    // Re-open after 100-150ms
    setTimeout(
      () => {
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 1);
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 1);
      },
      100 + Math.random() * 50,
    );
  }

  /**
   * Update model (called in render loop)
   */
  update(_deltaTime: number): void {
    // PixiJS handles updates via the ticker
    // This method is here for interface compatibility
  }

  /**
   * Render the model to canvas
   */
  render(): void {
    // PixiJS handles rendering automatically
    // This method is here for interface compatibility
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }

    if (this.model) {
      this.model.destroy();
      this.model = null;
    }

    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }

    this.initialized = false;
    console.log("[PixiLive2DRenderer] Disposed");
  }

  // === Utility methods ===

  /**
   * Get the current expression
   */
  getExpression(): Expression {
    return this.currentExpression;
  }

  /**
   * Check if renderer is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the loaded model (for advanced usage)
   */
  getModel(): Live2DModel | null {
    return this.model;
  }

  /**
   * Get the PixiJS application (for advanced usage)
   */
  getApplication(): Application | null {
    return this.app;
  }

  /**
   * Set a custom parameter value directly
   */
  setParameter(paramId: string, value: number): void {
    if (!this.model?.internalModel?.coreModel) return;

    try {
      this.model.internalModel.coreModel.setParameterValueById(paramId, value);
    } catch {
      console.warn("[PixiLive2DRenderer] Parameter not found:", paramId);
    }
  }

  /**
   * Get a parameter value
   */
  getParameter(paramId: string): number | undefined {
    if (!this.model?.internalModel?.coreModel) return undefined;

    try {
      return this.model.internalModel.coreModel.getParameterValueById(paramId);
    } catch {
      return undefined;
    }
  }
}

/**
 * Create a PixiJS Live2D renderer instance
 */
export function createPixiLive2DRenderer(): PixiLive2DRenderer {
  return new PixiLive2DRenderer();
}

/**
 * Export parameter IDs for external use
 */
export { PARAM_IDS };

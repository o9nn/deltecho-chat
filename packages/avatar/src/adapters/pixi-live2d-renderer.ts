/* eslint-disable no-console */
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
  focus: (x: number, y: number) => void;
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
 * Note: Motion groups vary between models. Common conventions:
 * - Standard models: "idle", "tap_body", "shake", "flick_head"
 * - Cubism Editor exports: "Idle", "Tap", "Flic" (capitalized, abbreviated)
 * We try multiple group names in order of preference.
 */
const DEFAULT_MOTION_MAP: Record<
  AvatarMotion,
  { groups: string[]; index: number }
> = {
  idle: { groups: ["Idle", "idle"], index: 0 },
  talking: { groups: ["Tap", "tap_body", "tap"], index: 0 },
  nodding: { groups: ["Tap", "tap_body", "tap"], index: 1 },
  shaking_head: { groups: ["Flic", "shake", "flick"], index: 0 },
  tilting_head: { groups: ["Flic", "flick_head", "flick"], index: 0 },
  breathing: { groups: ["Idle", "idle"], index: 0 },
  wave: { groups: ["Tap", "tap_body", "tap"], index: 2 },
  nod: { groups: ["Tap", "tap_body", "tap"], index: 1 },
  shake: { groups: ["Flic", "shake", "flick"], index: 0 },
  thinking: { groups: ["Idle", "idle"], index: 1 },
  tilt_head_left: { groups: ["Flic", "flick_head", "flick"], index: 1 },
  tilt_head_right: { groups: ["Flic", "flick_head", "flick"], index: 0 },
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
  private blinkTimer: ReturnType<typeof setTimeout> | null = null;
  private blinkOpenTimer: ReturnType<typeof setTimeout> | null = null;
  private manualBlinkTimer: ReturnType<typeof setTimeout> | null = null;
  private nextBlinkAt = 0;
  private blinkCloseUntil = 0;
  private expressionMap: Record<Expression, string> = DEFAULT_EXPRESSION_MAP;
  private motionMap: Record<AvatarMotion, { groups: string[]; index: number }> =
    DEFAULT_MOTION_MAP;
  private debug = false;
  private visibilityHandler: (() => void) | null = null;
  private blinkTickerCallback: ((deltaMS: number) => void) | null = null;

  /**
   * Stop automatic blink loop and clear any pending timers.
   */
  private stopAutoBlinkLoop(): void {
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
    if (this.blinkOpenTimer) {
      clearTimeout(this.blinkOpenTimer);
      this.blinkOpenTimer = null;
    }
    if (this.manualBlinkTimer) {
      clearTimeout(this.manualBlinkTimer);
      this.manualBlinkTimer = null;
    }
    this.blinkCloseUntil = 0;

    if (this.app && this.blinkTickerCallback) {
      const ticker = this.app.ticker as
        | { remove?: (cb: (deltaMS: number) => void) => void }
        | undefined;
      if (ticker && typeof ticker.remove === "function") {
        try {
          ticker.remove(this.blinkTickerCallback);
        } catch {
          /* ignore */
        }
      }
      this.blinkTickerCallback = null;
    }
  }

  /** Internal debug logger - no-op unless config.debug is true */
  private dlog(...args: unknown[]): void {
    if (this.debug) console.log("[PixiLive2DRenderer]", ...args);
  }

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

    // Cap pixelRatio at 2 by default to prevent GPU thrashing on 4K/Retina displays.
    // Per user preference (Avatar Resolution Preference), explicit pixelRatio overrides cap.
    const explicitRatio = (config as PixiLive2DConfig).pixelRatio;
    // Cap pixelRatio at 2 by default to prevent GPU thrashing on 4K/Retina displays.
    // This is a performance optimization as per the Live2D performance skill.
    // Per user preference (Avatar Resolution Preference), explicit pixelRatio overrides cap.
    const dpr =
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    const resolution = explicitRatio ?? Math.min(dpr, 2); // Cap at 2 for performance
    this.debug = Boolean((config as PixiLive2DConfig).debug);

    // Create PixiJS application
    this.app = new Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
      resolution,
      autoDensity: true,
      // Hint hybrid GPUs to choose the discrete adapter for smoother animation.
      // This is a performance optimization as per the Live2D performance skill.
      powerPreference: "high-performance",
      resizeTo: canvas.parentElement ?? undefined,
    });

    // Pause the ticker when the tab is hidden to save battery/CPU.
    // This is a performance optimization as per the Live2D performance skill.
    if (typeof document !== "undefined") {
      this.visibilityHandler = () => {
        const ticker = this.app?.ticker as
          | { stop?: () => void; start?: () => void }
          | undefined;
        if (!ticker) return;
        if (
          document.visibilityState === "hidden" &&
          typeof ticker.stop === "function"
        ) {
          this.dlog("Pausing Live2D ticker due to tab hidden");
          ticker.stop();
        } else if (typeof ticker.start === "function") {
          this.dlog("Resuming Live2D ticker due to tab visible");
          ticker.start();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }

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
      // Convert config motion map (single group) to internal format (array of groups)
      const convertedMotions: Partial<
        Record<AvatarMotion, { groups: string[]; index: number }>
      > = {};
      for (const [motion, def] of Object.entries(config.motions)) {
        convertedMotions[motion as AvatarMotion] = {
          groups: [def.group], // Wrap single group in array
          index: def.index,
        };
      }
      this.motionMap = {
        ...DEFAULT_MOTION_MAP,
        ...convertedMotions,
      };
    }

    this.initialized = true;
    this.dlog("Initialized successfully");
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

    // Dispose existing model and any model-bound blink timers.
    // Aggressive cleanup to prevent memory leaks, as per Live2D performance skill.
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
    if (this.blinkOpenTimer) {
      clearTimeout(this.blinkOpenTimer);
      this.blinkOpenTimer = null;
    }
    if (this.model) {
      this.model.destroy();
      this.model = null;
    }
    // Ensure ticker callback is removed if a model was previously loaded
    if (this.app && this.blinkTickerCallback) {
      const ticker = this.app.ticker as
        | { remove?: (cb: (deltaMS: number) => void) => void }
        | undefined;
      if (ticker && typeof ticker.remove === "function") {
        try {
          ticker.remove(this.blinkTickerCallback);
        } catch {
          /* ignore */
        }
      }
      this.blinkTickerCallback = null;
    }

    try {
      // Load the model with autoInteract for cursor eye-tracking
      const model = (await Live2DModelClass.from(modelInfo.modelPath, {
        autoInteract: true,
        autoUpdate: true,
      })) as unknown as Live2DModel;
      this.model = model;

      // Position and scale the model
      const scale = modelInfo.scale ?? 0.25;
      model.scale.set(scale, scale);
      model.anchor.set(0.5, 0.5);

      this.startAutoBlinkLoop(); // Start the blink loop after model is loaded

      // Center in canvas
      if (this.app.view) {
        const canvas = this.app.view as HTMLCanvasElement;
        model.x = canvas.width / 2 + (modelInfo.offset?.x ?? 0);
        model.y = canvas.height / 2 + (modelInfo.offset?.y ?? 0);
      }

      // Defensively clear stage in case a previous model left children behind.
      // Guarded for compatibility with PixiJS test mocks that may not implement
      // removeChildren().
      const stageWithRemove = this.app.stage as Container & {
        removeChildren?: () => void;
      };
      if (typeof stageWithRemove.removeChildren === "function") {
        stageWithRemove.removeChildren();
      }
      // Add to stage
      this.app.stage.addChild(model as unknown as Container);

      // Start auto-blink (ticker-based for proper sync with PixiJS rAF loop)
      this.startAutoBlinkLoop();

      this.dlog(`Model loaded: ${modelInfo.name}`);
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

      this.dlog(
        `Expression set: ${expression} (${expressionName}) at ${(
          intensity * 100
        ).toFixed(0)}%`,
      );
    } catch (_error) {
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
      case "curious":
        // Slight head tilt, one brow raised
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_L_Y, 0.4 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_R_Y, 0.1 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_ANGLE_Z, 3 * intensity); // Slight head tilt
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 1.1);
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 1.1);
        break;
      case "empathetic":
        // Soft brows, gentle smile
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_L_Y, 0.1 * intensity);
        this.setParameterSafe(core, PARAM_IDS.PARAM_BROW_R_Y, 0.1 * intensity);
        this.setParameterSafe(
          core,
          PARAM_IDS.PARAM_MOUTH_FORM,
          0.2 * intensity,
        ); // Gentle smile
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 0.9);
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 0.9);
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
   * Tries multiple motion group names until one succeeds
   */
  playMotion(motion: AvatarMotion, priority = 2): void {
    if (!this.model || !this.initialized) return;

    const motionDef = this.motionMap[motion];
    if (!motionDef) {
      console.warn("[PixiLive2DRenderer] Motion not mapped:", motion);
      return;
    }

    // Try each group name until one works
    for (const group of motionDef.groups) {
      try {
        this.model.motion(group, motionDef.index, priority);
        this.dlog(`Motion played: ${motion} (${group}[${motionDef.index}])`);
        return; // Success - exit loop
      } catch {
        // Group not available, try next
      }
    }

    console.warn(
      `[PixiLive2DRenderer] Motion playback failed: ${motion} (tried groups: ${motionDef.groups.join(
        ", ",
      )})`,
    );
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
   * Trigger a single tracked blink that is cleaned up during disposal.
   * This avoids manager-level timers firing after the Live2D renderer has unmounted.
   */
  triggerBlink(durationMs = 150): void {
    if (this.manualBlinkTimer) {
      clearTimeout(this.manualBlinkTimer);
      this.manualBlinkTimer = null;
    }

    this.setBlinking(true);
    this.manualBlinkTimer = setTimeout(
      () => {
        this.setBlinking(false);
        this.manualBlinkTimer = null;
        this.scheduleNextBlink();
      },
      Math.max(50, durationMs),
    );
  }

  /**
   * Start automatic blink loop. Prefers the PixiJS ticker (synced with the
   * render loop and naturally paused when the tab is hidden). Falls back to a
   * setTimeout-based loop if the ticker is unavailable (e.g. in test mocks).
   */
  private startAutoBlinkLoop(): void {
    const ticker = this.app?.ticker as
      | {
          add?: (cb: (deltaMS: number) => void) => void;
          remove?: (cb: (deltaMS: number) => void) => void;
        }
      | undefined;

    if (this.blinkTickerCallback && ticker?.remove) {
      try {
        ticker.remove(this.blinkTickerCallback);
      } catch {
        /* ignore */
      }
      this.blinkTickerCallback = null;
    }

    // Prioritize ticker-driven blink loop for performance and battery savings.
    // This ensures blink cycles are synchronized with the render loop and paused
    // when the tab is hidden, as per Live2D performance skill.
    if (ticker && typeof ticker.add === "function") {
      this.scheduleNextBlink(); // Schedule initial blink
      this.blinkTickerCallback = (_deltaMS: number) => {
        const now = performance.now();
        if (now >= this.nextBlinkAt && this.blinkCloseUntil === 0) {
          const core = this.model?.internalModel?.coreModel;
          if (!core) return;
          this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 0);
          this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 0);
          this.blinkCloseUntil = now + 100 + Math.random() * 50; // Eyes closed for 100-150ms
        }
        if (this.blinkCloseUntil > 0 && now >= this.blinkCloseUntil) {
          const core = this.model?.internalModel?.coreModel;
          if (core) {
            this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 1);
            this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 1);
          }
          this.blinkCloseUntil = 0;
          this.scheduleNextBlink(); // Schedule next blink after current one completes
        }
      };
      ticker.add(this.blinkTickerCallback);
      return;
    }

    // Fallback: setTimeout-based blink loop.
    // Fallback: setTimeout-based blink loop if ticker is unavailable (e.g., in test mocks).
    // This is less performant but ensures basic functionality in non-optimal environments.
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.blinkOpenTimer) {
      clearTimeout(this.blinkOpenTimer);
      this.blinkOpenTimer = null;
    }
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000; // Blink every 2-6 seconds
      this.blinkTimer = setTimeout(() => {
        this.performBlink();
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
  }

  /** Single blink animation, used by the setTimeout fallback path */
  private performBlink(): void {
    const core = this.model?.internalModel?.coreModel;
    if (!core) return;
    this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 0);
    this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 0);

    if (this.blinkOpenTimer) {
      clearTimeout(this.blinkOpenTimer);
      this.blinkOpenTimer = null;
    }

    this.blinkOpenTimer = setTimeout(
      () => {
        if (
          !this.initialized ||
          this.model?.internalModel?.coreModel !== core
        ) {
          this.blinkOpenTimer = null;
          return;
        }
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 1);
        this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 1);
        this.blinkOpenTimer = null;
      },
      100 + Math.random() * 50,
    );
  }

  /** Schedule the next blink 2-6 seconds from now */
  private scheduleNextBlink(): void {
    this.nextBlinkAt = performance.now() + 2000 + Math.random() * 4000;
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
    this.stopAutoBlinkLoop();

    if (typeof document !== "undefined" && this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
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
    this.dlog("Disposed");
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

  /**
   * Manually focus the model's eyes at screen coordinates.
   * Useful for programmatic gaze direction when autoInteract is off.
   * @param x - Screen X coordinate (pixels)
   * @param y - Screen Y coordinate (pixels)
   */
  focusEyes(x: number, y: number): void {
    if (!this.model || !this.initialized) return;
    try {
      this.model.focus(x, y);
    } catch {
      // focus() may not be available on all model versions
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

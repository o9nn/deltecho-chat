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
  width?: number;
  height?: number;
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
    width?: number;
    height?: number;
    getDrawableIDs?: () => string[];
    getDrawableBounds?: (
      index: number,
      bounds?: { x: number; y: number; width: number; height: number },
    ) => { x: number; y: number; width: number; height: number };
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
/** Serialize Cubism `from()` so two Pixi GL contexts cannot share one runtime. */
let live2dFromLock: Promise<void> = Promise.resolve();

function withLive2DFromLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = live2dFromLock;
  let release: () => void = () => undefined;
  live2dFromLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  return previous.then(fn).finally(() => release());
}

export class PixiLive2DRenderer implements ICubismRenderer {
  private app: Application | null = null;
  private model: Live2DModel | null = null;
  private config: PixiLive2DConfig | null = null;
  private initialized = false;
  private loadGeneration = 0;
  /** How much of the view the full figure should occupy (0-1). */
  private viewFill = 0.9;
  private modelNativeSize: { width: number; height: number } | null = null;
  /** Offset from canvas center to the visual figure center, in native units. */
  private modelVisualCenterOffset = { x: 0, y: 0 };
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

  /** Internal debug logger - no-op unless config.debug is true */
  private dlog(...args: unknown[]): void {
    if (this.debug) console.log("[PixiLive2DRenderer]", ...args);
  }

  /**
   * Initialize the renderer with configuration
   */
  async initialize(config: CubismAdapterConfig): Promise<void> {
    this.config = config as PixiLive2DConfig;

    // Dynamically import PixiJS and the Cubism 4 Live2D factory.
    // The cubism4 entry registers Cubism 3/4 settings; the package root
    // can leave model3.json unrecognized ("Unknown settings format").
    const [pixi, live2d, { install }] = await Promise.all([
      import("pixi.js"),
      import("pixi-live2d-display-lipsyncpatch/cubism4"),
      import("@pixi/unsafe-eval"),
    ]);
    // Desktop CSP forbids eval; patch Pixi shaders before Application exists.
    install(pixi);
    // pixi-live2d-display looks up PIXI.Ticker on the global when no ticker
    // is passed to Live2DModel.from().
    if (typeof window !== "undefined") {
      (window as Window & { PIXI?: typeof pixi }).PIXI = pixi;
    }
    if (typeof live2d.cubism4Ready === "function") {
      await live2d.cubism4Ready();
    }
    const { Live2DModel: Live2DModelClass } = live2d;
    const { Application } = pixi;

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
    const dpr =
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    const resolution = explicitRatio ?? Math.min(dpr, 2);
    this.debug = Boolean((config as PixiLive2DConfig).debug);

    // Create PixiJS application
    this.app = new Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
      resolution,
      autoDensity: true,
      // Hint hybrid GPUs to choose the discrete adapter for smoother animation.
      powerPreference: "high-performance",
      resizeTo: canvas.parentElement ?? undefined,
    });

    // Pause the ticker when the tab is hidden to save battery/CPU.
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
          ticker.stop();
        } else if (typeof ticker.start === "function") {
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

    // Dynamically import the Cubism 4 Live2D factory (registers model3.json).
    const { Live2DModel: Live2DModelClass, cubism4Ready } = await import(
      "pixi-live2d-display-lipsyncpatch/cubism4"
    );
    if (typeof cubism4Ready === "function") {
      await cubism4Ready();
    }

    const source = await loadCubism4Settings(modelInfo.modelPath);
    if (!this.app || !this.initialized) {
      return;
    }

    // Dispose existing model and any model-bound blink timers.
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

    const generation = ++this.loadGeneration;

    try {
      // Pass parsed settings (with url) so file:// XHR JSON MIME issues
      // cannot collapse model3.json into "Unknown settings format".
      const model = (await withLive2DFromLock(() =>
        Live2DModelClass.from(source, {
          ticker: this.app?.ticker,
          autoFocus: true,
          autoHitTest: true,
          autoUpdate: true,
        }),
      )) as unknown as Live2DModel;

      if (
        generation !== this.loadGeneration ||
        !this.app ||
        !this.initialized
      ) {
        model.destroy();
        return;
      }

      this.model = model;

      // Defensively clear stage in case a previous model left children behind.
      // Guarded for compatibility with PixiJS test mocks that may not implement
      // removeChildren().
      const stageWithRemove = this.app.stage as Container & {
        removeChildren?: () => void;
      };
      if (typeof stageWithRemove.removeChildren === "function") {
        stageWithRemove.removeChildren();
      }
      // Add to stage before measuring bounds so width/height are valid.
      this.app.stage.addChild(model as unknown as Container);
      this.model.scale.set(1, 1);
      this.captureModelNativeMetrics();
      this.fitModelToView(modelInfo.scale, modelInfo.offset);

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

    this.scheduleNextBlink();

    if (ticker && typeof ticker.add === "function") {
      // Preferred path: ticker-driven blink.
      this.blinkTickerCallback = (_deltaMS: number) => {
        const now = performance.now();
        if (now >= this.nextBlinkAt && this.blinkCloseUntil === 0) {
          const core = this.model?.internalModel?.coreModel;
          if (!core) return;
          this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 0);
          this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 0);
          this.blinkCloseUntil = now + 100 + Math.random() * 50;
        }
        if (this.blinkCloseUntil > 0 && now >= this.blinkCloseUntil) {
          const core = this.model?.internalModel?.coreModel;
          if (core) {
            this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_L_OPEN, 1);
            this.setParameterSafe(core, PARAM_IDS.PARAM_EYE_R_OPEN, 1);
          }
          this.blinkCloseUntil = 0;
          this.scheduleNextBlink();
        }
      };
      ticker.add(this.blinkTickerCallback);
      return;
    }

    // Fallback: setTimeout-based blink loop.
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.blinkOpenTimer) {
      clearTimeout(this.blinkOpenTimer);
      this.blinkOpenTimer = null;
    }
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000;
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
   * Scale the full figure to fit inside the current Pixi screen (contain),
   * then center it. `scale` is a fill factor (0-1), not a raw Cubism scale.
   */
  fitModelToView(
    scale?: number,
    offset?: { x?: number; y?: number },
  ): void {
    if (!this.model || !this.app) return;
    if (typeof scale === "number" && Number.isFinite(scale) && scale > 0) {
      this.viewFill = Math.min(1, Math.max(0.1, scale));
    }
    const screen = (
      this.app as Application & {
        screen?: { width: number; height: number };
      }
    ).screen;
    const view = this.app.view as HTMLCanvasElement | undefined;
    const width = screen?.width || view?.clientWidth || view?.width || 0;
    const height = screen?.height || view?.clientHeight || view?.height || 0;
    const native = this.modelNativeSize ?? this.measureModelNativeSize();
    if (native.width > 0 && native.height > 0 && width > 0 && height > 0) {
      const nextScale =
        Math.min(width / native.width, height / native.height) * this.viewFill;
      this.model.scale.set(nextScale, nextScale);
      this.model.anchor.set(0.5, 0.5);
      this.model.x =
        width / 2 -
        this.modelVisualCenterOffset.x * nextScale +
        (offset?.x ?? this.config?.model.offset?.x ?? 0);
      this.model.y =
        height / 2 -
        this.modelVisualCenterOffset.y * nextScale +
        (offset?.y ?? this.config?.model.offset?.y ?? 0);
      return;
    }
    this.model.scale.set(this.viewFill, this.viewFill);
    this.model.anchor.set(0.5, 0.5);
    this.model.x = width / 2 + (offset?.x ?? this.config?.model.offset?.x ?? 0);
    this.model.y =
      height / 2 + (offset?.y ?? this.config?.model.offset?.y ?? 0);
  }

  private captureModelNativeMetrics(): void {
    this.modelNativeSize = this.measureModelNativeSize();
  }

  /**
   * Visual figure size in native Cubism units. Prefers the union of drawable
   * meshes so empty canvas padding does not shrink the character in the strip.
   */
  private measureModelNativeSize(): { width: number; height: number } {
    if (!this.model) return { width: 0, height: 0 };
    const scaleX = Math.abs(this.model.scale.x) || 1;
    const scaleY = Math.abs(this.model.scale.y) || 1;
    const canvasWidth =
      (this.model.internalModel?.width || this.model.width || 0) / scaleX;
    const canvasHeight =
      (this.model.internalModel?.height || this.model.height || 0) / scaleY;
    const tight = this.measureDrawableBounds();
    if (tight && tight.width > 0 && tight.height > 0) {
      // Hair, feet, and effects sit outside the dense mesh. Expand so
      // contain-fit still shows the full figure while filling the strip.
      const paddedWidth = tight.width * 1.16;
      const paddedHeight = tight.height * 1.16;
      this.modelVisualCenterOffset = { x: 0, y: 0 };
      return { width: paddedWidth, height: paddedHeight };
    }
    this.modelVisualCenterOffset = { x: 0, y: 0 };
    return { width: canvasWidth, height: canvasHeight };
  }

  private measureDrawableBounds(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    const internal = this.model?.internalModel;
    if (
      !internal ||
      typeof internal.getDrawableIDs !== "function" ||
      typeof internal.getDrawableBounds !== "function"
    ) {
      return null;
    }
    const ids = internal.getDrawableIDs();
    if (!ids.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const box = { x: 0, y: 0, width: 0, height: 0 };
    for (let i = 0; i < ids.length; i++) {
      const bounds = internal.getDrawableBounds(i, box);
      if (!bounds || bounds.width <= 1 || bounds.height <= 1) continue;
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }
    if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Resize the view without tearing down the WebGL context.
   */
  resize(width?: number, height?: number, scale?: number): void {
    if (!this.app || !this.initialized) return;
    const renderer = this.app as Application & {
      renderer?: { resize?: (w: number, h: number) => void };
    };
    if (
      typeof width === "number" &&
      typeof height === "number" &&
      width > 0 &&
      height > 0 &&
      typeof renderer.renderer?.resize === "function"
    ) {
      renderer.renderer.resize(width, height);
    }
    this.fitModelToView(scale);
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
    this.loadGeneration += 1;
    this.modelNativeSize = null;
    this.modelVisualCenterOffset = { x: 0, y: 0 };

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
   * Native visual size used for contain-fit, or null before the model loads.
   */
  getNativeSize(): { width: number; height: number } | null {
    return this.modelNativeSize;
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
 * Fetch Cubism 4 model3.json and attach the source URL so relative moc/texture
 * paths resolve. Falls back to the raw URL if fetch is unavailable (tests).
 */
export async function loadCubism4Settings(
  modelPath: string,
): Promise<string | Record<string, unknown>> {
  if (typeof fetch !== "function") {
    return modelPath;
  }
  try {
    const response = await fetch(modelPath);
    if (!response.ok) {
      return modelPath;
    }
    const json: unknown = await response.json();
    if (
      json &&
      typeof json === "object" &&
      (json as { FileReferences?: { Moc?: unknown } }).FileReferences &&
      typeof (json as { FileReferences: { Moc?: unknown } }).FileReferences
        .Moc === "string"
    ) {
      (json as { url?: string }).url = modelPath;
      return json as Record<string, unknown>;
    }
  } catch {
    // Network / parse / CSP: Live2DModel.from() can still try the URL.
  }
  return modelPath;
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

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
import {
  FIGURE_BOUNDS_PAD,
  measureFigureBounds,
  measureOpaquePixelBounds,
  padFigureBounds,
  type DrawableBox,
} from "./live2d-figure-bounds";
import {
  ALL_MIARA_WARDROBE_PART_IDS,
  collectHiddenPartIds,
  partIdMatchesHiddenGroups,
  resolveMiaraOutfit,
  type MiaraOutfitState,
} from "../miara-outfits";
import { MIARA_EXPRESSION_MAP } from "../miara-expressions";
import {
  applyMeshDeform,
  applyPhysicsRetarget,
  figureFromDrawables,
  isEnvironmentDrawable,
  namePhysicsSettings,
  restorePhysicsRig,
  snapshotPhysicsRig,
  uvCentroid,
  type AutomeshDrawable,
  type FigureBounds,
  type IdentityRig,
  type MutablePositions,
  type PhysicsRigLike,
  type PhysicsRigSnapshot,
} from "../automesh";

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
    on?: (event: string, listener: () => void) => void;
    off?: (event: string, listener: () => void) => void;
    getDrawableIDs?: () => string[];
    getDrawableBounds?: (
      index: number,
      bounds?: { x: number; y: number; width: number; height: number },
    ) => { x: number; y: number; width: number; height: number };
    update?: (dt: number, now: number) => void;
    textures?: unknown[];
    physics?: {
      _physicsRig?: PhysicsRigLike;
      rig?: PhysicsRigLike;
    };
    coreModel: {
      setParameterValueById: (id: string, value: number) => void;
      getParameterValueById: (id: string) => number;
      setPartOpacityById?: (id: string, value: number) => void;
      getPartOpacityById?: (id: string) => number;
      setPartOpacityByIndex?: (index: number, value: number) => void;
      setPartOpacity?: (index: number, value: number) => void;
      getPartIndex?: (id: string) => number;
      getPartCount?: () => number;
      getPartId?: (index: number) => unknown;
      getDrawableVertexUvs?: (index: number) => ArrayLike<number>;
      getDrawableUvs?: (index: number) => ArrayLike<number>;
      getDrawableVertexPositions?: (index: number) => MutablePositions;
      getDrawableVertices?: (index: number) => MutablePositions;
      getDrawableCount?: () => number;
      getDrawableVertexIndices?: (index: number) => ArrayLike<number>;
      getDrawableIndices?: (index: number) => ArrayLike<number>;
      getModel?: () => {
        parts?: {
          count: number;
          ids: ArrayLike<string>;
          opacities: Float32Array | number[];
        };
        drawables?: {
          vertexUvs?: Array<ArrayLike<number>>;
          uvs?: Array<ArrayLike<number>>;
          vertexPositions?: Array<ArrayLike<number>>;
          positions?: Array<ArrayLike<number>>;
          indices?: Array<ArrayLike<number>>;
          vertexIndices?: Array<ArrayLike<number>>;
        };
      };
    };
  };
  textures?: Array<{ destroy?: (destroyBase?: boolean) => void } | unknown>;
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
  ...MIARA_EXPRESSION_MAP,
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

function cubismIdToString(id: unknown): string {
  if (typeof id === "string") return id;
  if (id && typeof id === "object") {
    const handle = id as {
      getString?: () => string;
      s?: string;
      id?: string;
    };
    if (typeof handle.getString === "function") {
      return handle.getString();
    }
    if (typeof handle.s === "string") return handle.s;
    if (typeof handle.id === "string") return handle.id;
  }
  return String(id ?? "");
}

function withLive2DFromLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = live2dFromLock;
  let release: () => void = () => undefined;
  live2dFromLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  return previous.then(fn).finally(() => release());
}

async function loadPixiTexture(source: string): Promise<unknown> {
  const { Texture } = await import("pixi.js");
  const fromUrl = (
    Texture as {
      fromURL?: (url: string) => Promise<unknown>;
    }
  ).fromURL;
  if (typeof fromUrl === "function" && !source.startsWith("data:")) {
    return fromUrl(source);
  }
  const texture = Texture.from(source) as {
    baseTexture?: {
      valid?: boolean;
      once?: (event: string, listener: () => void) => void;
    };
  };
  const base = texture.baseTexture;
  if (base && !base.valid && typeof base.once === "function") {
    await new Promise<void>((resolve, reject) => {
      base.once?.("loaded", () => resolve());
      base.once?.("error", () =>
        reject(new Error(`texture overlay failed: ${source}`)),
      );
    });
  }
  return texture;
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
  private modelCanvasSize: { width: number; height: number } | null = null;
  /** Offset from canvas center to the visual figure center, in native units. */
  private modelVisualCenterOffset = { x: 0, y: 0 };
  private currentExpression: Expression = "neutral";
  private lipSyncValue = 0;
  private isBlinking = false;
  private originalTexture0: unknown = null;
  private overlaySource: string | null = null;
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
  private viewCanvas: HTMLCanvasElement | null = null;
  private appliedOutfit: MiaraOutfitState | null = null;
  private hiddenWardrobePartIds = new Set<string>();
  private wardrobeUpdateHook: (() => void) | null = null;
  private identityRig: IdentityRig | null = null;
  private deformFigure: FigureBounds | null = null;
  private deformSkipIds = new Set<string>();
  private deformFrame = 0;
  private deformHookAttached = false;
  private originalInternalUpdate: ((dt: number, now: number) => void) | null =
    null;
  private physicsSnapshot: PhysicsRigSnapshot | null = null;

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

    this.viewCanvas = canvas;
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

      this.detachWardrobeHook();
      this.detachDeformHook();
      this.physicsSnapshot = null;
      this.deformFigure = null;
      this.model = model;
      this.originalTexture0 = model.textures?.[0] ?? null;
      this.overlaySource = null;
      this.attachWardrobeHook();
      this.attachDeformHook();
      if (this.identityRig) {
        this.applyPhysicsProfile(this.identityRig.physics);
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
      // Add to stage before measuring bounds so width/height are valid.
      this.app.stage.addChild(model as unknown as Container);
      this.model.scale.set(1, 1);
      this.modelCanvasSize = null;
      this.refreshModelLayout(modelInfo.scale, modelInfo.offset);
      this.scheduleNativeMetricsRefresh();
      this.scheduleVisibleFillCorrection();

      // Start auto-blink (ticker-based for proper sync with PixiJS rAF loop)
      this.startAutoBlinkLoop();

      if (this.appliedOutfit) {
        this.applyOutfit(this.appliedOutfit);
      }

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
      this.applyCubismExpression(expressionName);

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
   * Play a named Cubism expression from the model3.json Expressions list.
   * Returns false when the runtime or name is unavailable.
   */
  setNamedExpression(name: string): boolean {
    if (!this.model || !this.initialized) return false;
    return this.applyCubismExpression(name);
  }

  private applyCubismExpression(name: string): boolean {
    if (!this.model) return false;
    try {
      this.model.expression(name);
      this.dlog(`Cubism expression: ${name}`);
      return true;
    } catch (_error) {
      console.warn("[PixiLive2DRenderer] Expression not available:", name);
      return false;
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
        this.enforceHiddenWardrobeParts();
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
  fitModelToView(scale?: number, offset?: { x?: number; y?: number }): void {
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

  private refreshModelLayout(
    scale?: number,
    offset?: { x?: number; y?: number },
  ): void {
    this.syncInternalModel();
    this.captureModelNativeMetrics();
    this.fitModelToView(scale, offset);
  }

  /**
   * Vertices are empty until Cubism runs one update. Push that update now,
   * then again on the next ticker tick once motions have sampled.
   */
  private syncInternalModel(): void {
    const update = this.model?.internalModel?.update;
    if (typeof update !== "function") return;
    try {
      const now =
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      update.call(this.model?.internalModel, 16, now);
    } catch {
      /* model may not be ready for a manual update */
    }
  }

  private scheduleNativeMetricsRefresh(): void {
    const ticker = this.app?.ticker as
      | { addOnce?: (cb: () => void) => void }
      | undefined;
    if (typeof ticker?.addOnce !== "function") return;
    const generation = this.loadGeneration;
    ticker.addOnce(() => {
      if (
        generation !== this.loadGeneration ||
        !this.model ||
        !this.initialized
      ) {
        return;
      }
      this.refreshModelLayout();
    });
  }

  /**
   * Visual figure size in native Cubism units. Prefers the standing-character
   * mesh cluster so water / background planes do not shrink the figure.
   */
  private getModelCanvasSize(): { width: number; height: number } {
    if (this.modelCanvasSize) return this.modelCanvasSize;
    if (!this.model) return { width: 0, height: 0 };
    const internalWidth = this.model.internalModel?.width;
    const internalHeight = this.model.internalModel?.height;
    const scaleX = Math.abs(this.model.scale.x) || 1;
    const scaleY = Math.abs(this.model.scale.y) || 1;
    const size =
      internalWidth && internalHeight
        ? { width: internalWidth, height: internalHeight }
        : {
            width: (this.model.width || 0) / scaleX,
            height: (this.model.height || 0) / scaleY,
          };
    if (size.width > 0 && size.height > 0) {
      this.modelCanvasSize = size;
    }
    return size;
  }

  private measureModelNativeSize(): { width: number; height: number } {
    if (!this.model) return { width: 0, height: 0 };
    const { width: canvasWidth, height: canvasHeight } =
      this.getModelCanvasSize();
    const tight = this.measureDrawableBounds(canvasWidth, canvasHeight);
    if (tight && tight.width > 0 && tight.height > 0) {
      const padded = padFigureBounds(tight, FIGURE_BOUNDS_PAD);
      this.modelVisualCenterOffset = {
        x: padded.x + padded.width / 2 - canvasWidth / 2,
        y: padded.y + padded.height / 2 - canvasHeight / 2,
      };
      return { width: padded.width, height: padded.height };
    }
    this.modelVisualCenterOffset = { x: 0, y: 0 };
    return { width: canvasWidth, height: canvasHeight };
  }

  private measureDrawableBounds(
    canvasWidth: number,
    canvasHeight: number,
  ): {
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
    const drawables: DrawableBox[] = [];
    const box = { x: 0, y: 0, width: 0, height: 0 };
    for (let i = 0; i < ids.length; i++) {
      let bounds: { x: number; y: number; width: number; height: number };
      try {
        bounds = internal.getDrawableBounds(i, box);
      } catch {
        continue;
      }
      if (!bounds || bounds.width <= 1 || bounds.height <= 1) continue;
      drawables.push({
        id: ids[i] ?? `drawable-${i}`,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    }
    return measureFigureBounds(drawables, {
      width: canvasWidth,
      height: canvasHeight,
    });
  }

  /**
   * After the first painted frames, scale from the visible pixels so unnamed
   * water / background meshes cannot keep the standing figure at half size.
   */
  private scheduleVisibleFillCorrection(): void {
    const ticker = this.app?.ticker as
      | { addOnce?: (cb: () => void) => void }
      | undefined;
    if (typeof ticker?.addOnce !== "function") return;
    const generation = this.loadGeneration;
    const run = () => {
      if (
        generation !== this.loadGeneration ||
        !this.model ||
        !this.initialized
      ) {
        return;
      }
      this.correctScaleFromVisiblePixels();
    };
    if (typeof ticker?.addOnce === "function") {
      ticker.addOnce(run);
    }
    if (
      typeof window !== "undefined" &&
      typeof window.setTimeout === "function"
    ) {
      window.setTimeout(run, 300);
    }
  }

  private correctScaleFromVisiblePixels(): void {
    if (!this.model || !this.app) return;
    const renderer = this.app as Application & {
      renderer?: {
        extract?: { pixels?: (target?: unknown) => Uint8Array };
        width?: number;
        height?: number;
        resolution?: number;
      };
      screen?: { width: number; height: number };
    };
    const extract = renderer.renderer?.extract;
    if (typeof extract?.pixels !== "function") return;
    let pixels: ArrayLike<number>;
    try {
      pixels = extract.pixels(this.model) ?? extract.pixels();
    } catch {
      try {
        pixels = extract.pixels();
      } catch {
        return;
      }
    }
    const pixelWidth = renderer.renderer?.width || 0;
    const pixelHeight = renderer.renderer?.height || 0;
    const visible = measureOpaquePixelBounds(pixels, pixelWidth, pixelHeight);
    if (!visible) return;
    const resolution = renderer.renderer?.resolution || 1;
    const view = (
      this.app as Application & {
        screen?: { width: number; height: number };
      }
    ).screen;
    const canvas = this.app.view as HTMLCanvasElement | undefined;
    const viewWidth = view?.width || canvas?.clientWidth || pixelWidth;
    const viewHeight = view?.height || canvas?.clientHeight || pixelHeight;
    if (viewWidth <= 0 || viewHeight <= 0) return;
    const boxWidth = visible.width / resolution;
    const boxHeight = visible.height / resolution;
    if (boxWidth < 8 || boxHeight < 8) return;
    const currentFill = Math.max(boxWidth / viewWidth, boxHeight / viewHeight);
    if (!Number.isFinite(currentFill) || currentFill < 0.08) return;
    if (currentFill >= this.viewFill * 0.92) return;
    const boost = this.viewFill / currentFill;
    if (!Number.isFinite(boost) || boost <= 1.02 || boost > 8) return;
    const nextScaleX = (this.model.scale.x || 1) * boost;
    const nextScaleY = (this.model.scale.y || 1) * boost;
    this.model.scale.set(nextScaleX, nextScaleY);
    this.modelNativeSize = {
      width: boxWidth / Math.abs(this.model.scale.x / boost),
      height: boxHeight / Math.abs(this.model.scale.y / boost),
    };
    const boxCenterX = (visible.x + visible.width / 2) / resolution;
    const boxCenterY = (visible.y + visible.height / 2) / resolution;
    this.model.x += viewWidth / 2 - boxCenterX;
    this.model.y += viewHeight / 2 - boxCenterY;
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
    this.modelCanvasSize = null;
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

    if (this.viewCanvas?.style) {
      this.viewCanvas.style.filter = "";
    }
    this.detachWardrobeHook();
    this.detachDeformHook();
    this.identityRig = null;
    this.deformFigure = null;
    this.deformSkipIds.clear();
    this.physicsSnapshot = null;
    this.viewCanvas = null;
    this.hiddenWardrobePartIds.clear();
    this.appliedOutfit = null;

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
   * Show or hide a Cubism part by id. Used for Miara wardrobe layers.
   * Walks part indices so string IDs match interned CubismIdHandle values.
   */
  setPartOpacity(partId: string, opacity: number): void {
    const core = this.model?.internalModel?.coreModel;
    if (!core) return;
    const clamped = Math.min(1, Math.max(0, opacity));
    try {
      const native = core.getModel?.();
      if (native?.parts?.ids && native.parts.opacities) {
        const count = native.parts.count ?? native.parts.ids.length;
        for (let index = 0; index < count; index++) {
          if (cubismIdToString(native.parts.ids[index]) === partId) {
            native.parts.opacities[index] = clamped;
          }
        }
      }
      if (
        typeof core.getPartCount === "function" &&
        typeof core.getPartId === "function"
      ) {
        const count = core.getPartCount();
        for (let index = 0; index < count; index++) {
          if (cubismIdToString(core.getPartId(index)) !== partId) continue;
          if (typeof core.setPartOpacityByIndex === "function") {
            core.setPartOpacityByIndex(index, clamped);
            return;
          }
          if (typeof core.setPartOpacity === "function") {
            core.setPartOpacity(index, clamped);
            return;
          }
        }
      }
      if (typeof core.setPartOpacityById === "function") {
        core.setPartOpacityById(partId, clamped);
      }
    } catch {
      this.dlog("Part opacity not available:", partId);
    }
  }

  /**
   * Apply a Miara outfit: hide wardrobe parts and hue-shift clothing colorways.
   */
  applyOutfit(state: Partial<MiaraOutfitState> | null | undefined): void {
    const resolved = resolveMiaraOutfit(state);
    this.appliedOutfit = resolved;
    if (!this.model || !this.initialized) return;

    const hidden = new Set([
      ...collectHiddenPartIds(resolved.hiddenGroups),
      ...this.listPartIds().filter((partId) =>
        partIdMatchesHiddenGroups(partId, resolved.hiddenGroups),
      ),
    ]);
    this.hiddenWardrobePartIds = hidden;
    for (const partId of new Set([
      ...ALL_MIARA_WARDROBE_PART_IDS,
      ...this.listPartIds(),
    ])) {
      this.setPartOpacity(partId, hidden.has(partId) ? 0 : 1);
    }
    this.applyOutfitHue(resolved.hueShift);
    this.dlog(
      `Outfit applied: ${resolved.id} hidden=${
        resolved.hiddenGroups.join(",") || "none"
      } hue=${resolved.hueShift}`,
    );
  }

  getAppliedOutfit(): MiaraOutfitState | null {
    return this.appliedOutfit;
  }

  /**
   * Editor-style mesh inspect: drawable ids, bounds, and UV centroids.
   */
  inspectMesh(): AutomeshDrawable[] {
    const internal = this.model?.internalModel;
    if (
      !internal ||
      typeof internal.getDrawableIDs !== "function" ||
      typeof internal.getDrawableBounds !== "function"
    ) {
      return [];
    }
    const ids = internal.getDrawableIDs();
    const core = internal.coreModel;
    const inspected: AutomeshDrawable[] = [];
    const box = { x: 0, y: 0, width: 0, height: 0 };
    for (let index = 0; index < ids.length; index++) {
      let bounds: { x: number; y: number; width: number; height: number };
      try {
        bounds = internal.getDrawableBounds(index, box);
      } catch {
        continue;
      }
      const native = core.getModel?.()?.drawables;
      let uvs: ArrayLike<number> | undefined;
      let positions: ArrayLike<number> | undefined;
      let indices: ArrayLike<number> | undefined;
      try {
        uvs =
          core.getDrawableVertexUvs?.(index) ??
          core.getDrawableUvs?.(index) ??
          native?.vertexUvs?.[index] ??
          native?.uvs?.[index];
        positions =
          core.getDrawableVertexPositions?.(index) ??
          core.getDrawableVertices?.(index) ??
          native?.vertexPositions?.[index] ??
          native?.positions?.[index];
        indices =
          core.getDrawableVertexIndices?.(index) ??
          core.getDrawableIndices?.(index) ??
          native?.indices?.[index] ??
          native?.vertexIndices?.[index];
      } catch {
        uvs = native?.vertexUvs?.[index] ?? native?.uvs?.[index];
        positions =
          native?.vertexPositions?.[index] ?? native?.positions?.[index];
        indices = native?.indices?.[index] ?? native?.vertexIndices?.[index];
      }
      inspected.push({
        id: ids[index] ?? `drawable-${index}`,
        bounds: { ...bounds },
        uvCentroid: uvs ? uvCentroid(uvs) : undefined,
        positions: positions ? Array.from(positions) : undefined,
        uvs: uvs ? Array.from(uvs) : undefined,
        indices: indices ? Array.from(indices) : undefined,
      });
    }
    return inspected;
  }

  /**
   * Bind a remapped atlas onto texture slot 0 — the Cubism SDK BindTexture
   * equivalent for pixi-live2d-display.
   */
  async applyTextureOverlay(source: string): Promise<boolean> {
    if (!this.model || !source) return false;
    try {
      if (!this.originalTexture0 && this.model.textures?.[0]) {
        this.originalTexture0 = this.model.textures[0];
      }
      const texture = await loadPixiTexture(source);
      if (!this.model.textures) {
        return false;
      }
      this.model.textures[0] = texture;
      this.overlaySource = source;
      return true;
    } catch {
      return false;
    }
  }

  async clearTextureOverlay(): Promise<boolean> {
    if (!this.model?.textures || !this.originalTexture0) {
      this.overlaySource = null;
      return false;
    }
    this.model.textures[0] = this
      .originalTexture0 as (typeof this.model.textures)[0];
    this.overlaySource = null;
    return true;
  }

  applyParameterProfile(
    profile: Record<string, number> | null | undefined,
  ): void {
    if (!profile) return;
    for (const [paramId, value] of Object.entries(profile)) {
      if (typeof value === "number") {
        this.setParameter(paramId, value);
      }
    }
  }

  /**
   * After Cubism physics, reshape vertices and retarget the physics rig
   * toward the selected identity. Null restores official Miara motion.
   */
  applyIdentityRig(rig: IdentityRig | null | undefined): void {
    this.identityRig = rig ?? null;
    this.deformFigure = null;
    this.deformSkipIds.clear();
    this.deformFrame = 0;
    this.attachDeformHook();
    if (this.identityRig?.physics) {
      this.applyPhysicsProfile(this.identityRig.physics);
      return;
    }
    this.restorePhysicsSnapshot();
  }

  clearIdentityRig(): void {
    this.applyIdentityRig(null);
  }

  private listPartIds(): string[] {
    const core = this.model?.internalModel?.coreModel;
    if (!core) return [];
    const ids: string[] = [];
    const native = core.getModel?.();
    if (native?.parts?.ids) {
      const count = native.parts.count ?? native.parts.ids.length;
      for (let index = 0; index < count; index++) {
        ids.push(cubismIdToString(native.parts.ids[index]));
      }
      return ids;
    }
    if (typeof core.getPartCount === "function") {
      const count = core.getPartCount();
      for (let index = 0; index < count; index++) {
        ids.push(cubismIdToString(core.getPartId?.(index)));
      }
    }
    return ids;
  }

  private attachWardrobeHook(): void {
    const internal = this.model?.internalModel;
    if (!internal?.on) return;
    this.wardrobeUpdateHook = () => this.enforceHiddenWardrobeParts();
    internal.on("beforeModelUpdate", this.wardrobeUpdateHook);
  }

  private detachWardrobeHook(): void {
    const internal = this.model?.internalModel;
    if (internal?.off && this.wardrobeUpdateHook) {
      try {
        internal.off("beforeModelUpdate", this.wardrobeUpdateHook);
      } catch {
        /* ignore */
      }
    }
    this.wardrobeUpdateHook = null;
  }

  private attachDeformHook(): void {
    const internal = this.model?.internalModel;
    if (!internal || typeof internal.update !== "function") return;
    if (this.deformHookAttached) return;
    this.originalInternalUpdate = internal.update.bind(internal);
    internal.update = (dt: number, now: number) => {
      this.originalInternalUpdate?.(dt, now);
      this.enforceIdentityDeform();
    };
    this.deformHookAttached = true;
  }

  private detachDeformHook(): void {
    const internal = this.model?.internalModel;
    if (internal && this.originalInternalUpdate) {
      internal.update = this.originalInternalUpdate;
    }
    this.originalInternalUpdate = null;
    this.deformHookAttached = false;
  }

  private enforceIdentityDeform(): void {
    const profile = this.identityRig?.deform;
    const core = this.model?.internalModel?.coreModel;
    if (!profile || !core) return;
    this.deformFrame += 1;
    if (!this.deformFigure || this.deformFrame % 48 === 1) {
      const drawables = this.inspectMesh();
      this.deformFigure = figureFromDrawables(drawables);
      this.deformSkipIds = new Set(
        drawables
          .filter((drawable) => isEnvironmentDrawable(drawable))
          .map((drawable) => drawable.id),
      );
    }
    if (!this.deformFigure) return;
    const ids = this.model?.internalModel.getDrawableIDs?.() ?? [];
    const count =
      ids.length ||
      (typeof core.getDrawableCount === "function"
        ? core.getDrawableCount()
        : 0);
    for (let index = 0; index < count; index++) {
      const id = ids[index];
      if (id && this.deformSkipIds.has(id)) continue;
      const positions =
        core.getDrawableVertexPositions?.(index) ??
        core.getDrawableVertices?.(index);
      if (!positions || positions.length < 2) continue;
      applyMeshDeform(positions, this.deformFigure, profile);
    }
  }

  private getPhysicsRig(): PhysicsRigLike | null {
    const physics = this.model?.internalModel?.physics;
    const rig = physics?._physicsRig ?? physics?.rig;
    if (!rig?.settings || !rig.particles || !rig.outputs) return null;
    return rig;
  }

  private applyPhysicsProfile(profile: IdentityRig["physics"]): void {
    const rig = this.getPhysicsRig();
    if (!rig) return;
    if (!this.physicsSnapshot) {
      this.physicsSnapshot = snapshotPhysicsRig(rig);
    }
    applyPhysicsRetarget(
      {
        ...rig,
        settings: namePhysicsSettings(rig.settings),
      },
      this.physicsSnapshot,
      profile,
    );
  }

  private restorePhysicsSnapshot(): void {
    const rig = this.getPhysicsRig();
    if (!rig || !this.physicsSnapshot) return;
    restorePhysicsRig(rig, this.physicsSnapshot);
  }

  private enforceHiddenWardrobeParts(): void {
    if (this.hiddenWardrobePartIds.size === 0) return;
    for (const partId of this.hiddenWardrobePartIds) {
      this.setPartOpacity(partId, 0);
    }
  }

  private applyOutfitHue(hueShift: number): void {
    const hue = ((Math.round(hueShift) % 360) + 360) % 360;
    if (this.viewCanvas?.style) {
      this.viewCanvas.style.filter = hue === 0 ? "" : `hue-rotate(${hue}deg)`;
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

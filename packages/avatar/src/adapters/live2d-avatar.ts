/* eslint-disable no-console */
/**
 * Live2D Model Component for React
 *
 * A React component wrapper for displaying Live2D models
 * using the PixiLive2DRenderer.
 */

import type { Expression, EmotionalVector, AvatarMotion } from "../types";
import {
  getExpressionIntensity,
  mapEmotionToExpression,
} from "../expression-mapper";
import type { CubismModelInfo } from "./cubism-adapter";
import type { PixiLive2DRenderer } from "./pixi-live2d-renderer";
import type { DTEchoCognitiveMode } from "../dtecho-expression-driver";
import { projectDTEchoCognitiveState } from "../dtecho-expression-driver";
import {
  MetabolicAvatarBridge,
  type MetabolicAvatarDeltas,
  type MetabolicVisualInput,
} from "../metabolic-avatar-bridge";
import type { MiaraOutfitState } from "../miara-outfits";
import {
  selfModelAvatarFeedback,
  type ExpressionExperience,
} from "../self-model-avatar-feedback";

/**
 * Props for the Live2DAvatar component
 */
export interface Live2DAvatarProps {
  /** Path to the model3.json file */
  modelPath: string;
  /** Width of the canvas */
  width?: number;
  /** Height of the canvas */
  height?: number;
  /** How much of the view the full figure should occupy (0-1, contain-fit) */
  scale?: number;
  /** Current emotional state to drive expressions */
  emotionalState?: EmotionalVector;
  /** Override expression directly */
  expression?: Expression;
  /** Audio level for lip-sync (0-1) */
  audioLevel?: number;
  /** Whether the avatar is currently speaking */
  isSpeaking?: boolean;
  /** Callback when model is loaded */
  onLoad?: () => void;
  /** Callback when model fails to load */
  onError?: (error: Error) => void;
  /** Additional CSS class name */
  className?: string;
  /** Pixel ratio override for high-resolution or performance-tuned rendering */
  pixelRatio?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Live2D Avatar Component state
 */
export interface Live2DAvatarState {
  isLoaded: boolean;
  error: Error | null;
  currentExpression: Expression;
  isSpeaking: boolean;
}

/**
 * High-level DTE cognitive state that can be projected onto Cubism parameters.
 * Values are normalized unless otherwise noted.
 */
export interface Live2DCognitiveVisualState {
  /** Optional named DTEcho mode; when omitted, the manager infers one from numeric state. */
  mode?: DTEchoCognitiveMode | string;
  /** Alternate state label used by orchestrator/front-end callers. */
  currentState?: DTEchoCognitiveMode | string;
  valence?: number; // -1..1
  arousal?: number; // 0..1
  selfAwareness?: number; // 0..1
  sentience?: number; // 0..1
  phi?: number; // 0..1 consciousness/integration proxy
  flow?: number; // 0..1 focus/processing flow
  temporalCoherence?: number; // 0..1
  salience?: number; // 0..1
  scientificGenius?: number; // 0..1
  insightPotential?: number; // 0..1
  entelechyScore?: number; // 0..1
  freeEnergy?: number; // 0..1
  daoConsensus?: number; // 0..1
  esnCoherence?: number; // 0..1
  autognosisResonance?: number; // 0..1
  causalRigor?: number; // 0..1
  falsificationPressure?: number; // 0..1
  epistemicSurprise?: number; // 0..1
  daoEvidenceConsensus?: number; // 0..1
  activeExperimentation?: number; // 0..1
  /** Authoritative conceptual-metabolism state for embodied energy/phase rendering. */
  metabolic?: MetabolicVisualInput;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
}

/**
 * Controller interface for external control of the avatar
 */
export interface Live2DAvatarController {
  /** Set expression with intensity */
  setExpression: (expression: Expression, intensity?: number) => void;
  setNamedExpression?: (name: string) => boolean;
  /** Play a motion animation */
  playMotion: (motion: AvatarMotion) => void;
  /** Update lip sync value */
  updateLipSync: (audioLevel: number) => void;
  /** Project DTE cognitive state into expression, motion, gaze, and Cubism parameters */
  updateCognitiveState: (state: Live2DCognitiveVisualState) => void;
  /** Trigger a blink */
  triggerBlink: () => void;
  /** Set a model parameter directly */
  setParameter: (paramId: string, value: number) => void;
  /** Apply a Miara wardrobe outfit (part opacity + clothing colorway) */
  applyOutfit: (outfit: Partial<MiaraOutfitState> | null | undefined) => void;
  inspectMesh?: () => import("../automesh").AutomeshDrawable[];
  applyTextureOverlay?: (source: string) => Promise<boolean>;
  clearTextureOverlay?: () => Promise<boolean>;
  applyParameterProfile?: (profile: Record<string, number> | null) => void;
  applyIdentityRig?: (rig: import("../automesh").IdentityRig | null) => void;
  /** Get renderer instance */
  getRenderer: () => PixiLive2DRenderer | null;
  /** Resize the existing view without recreating the WebGL context */
  resize: (width?: number, height?: number, scale?: number) => void;
  /** Native visual size used to size the conversation strip */
  getNativeSize: () => { width: number; height: number } | null;
  /** Avatar self-model confidence learned from rendered Cubism readback. */
  getSelfModelAccuracy: () => number;
  /** Most recent predicted-versus-rendered expression experience. */
  getLastExpressionExperience: () => ExpressionExperience | null;
}

/**
 * Create a Live2D avatar component manager
 *
 * This is a vanilla JS implementation that can be wrapped by React.
 * For a pure React component, use Live2DAvatarReact.
 */
export class Live2DAvatarManager {
  private renderer: PixiLive2DRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isLoaded = false;
  private isDisposed = false;
  private modelInfo: CubismModelInfo | null = null;
  private metabolicBridge: MetabolicAvatarBridge | null = null;
  private metabolicFrameAccumulatorMs = 0;
  private lastProjectedCubism: Record<string, number> = {};
  private observableProjectionIds: string[] = [];
  private selfModelSampleDelayFrames = 0;
  private pendingCognitiveMode = "Idle";
  private lastExpressionExperience: ExpressionExperience | null = null;
  private readonly onMetabolicDeltas = (
    deltas: MetabolicAvatarDeltas,
  ): void => {
    this.applyMetabolicDeltas(deltas);
  };
  private readonly onMetabolicFrame = (deltaTime: number): void => {
    const deltaMs = deltaTime > 10 ? deltaTime : deltaTime * (1000 / 60);
    this.metabolicFrameAccumulatorMs += deltaMs;
    if (this.metabolicFrameAccumulatorMs < 1000 / 30) return;
    this.metabolicFrameAccumulatorMs %= 1000 / 30;
    this.metabolicBridge?.step();
  };
  private readonly onSelfModelFrame = (): void => {
    if (this.selfModelSampleDelayFrames <= 0) return;
    this.selfModelSampleDelayFrames--;
    if (this.selfModelSampleDelayFrames === 0) {
      this.sampleRenderedProjection();
    }
  };

  /**
   * Initialize the avatar on a canvas element
   */
  async initialize(
    container: HTMLElement,
    props: Live2DAvatarProps,
  ): Promise<Live2DAvatarController> {
    // Make repeated initialization idempotent for React remount/retry paths.
    this.dispose();
    this.isDisposed = false;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = props.width ?? 400;
    this.canvas.height = props.height ?? 400;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    if (props.className) {
      this.canvas.className = props.className;
    }

    container.appendChild(this.canvas);

    // Dynamically import the renderer
    const { PixiLive2DRenderer } = await import("./pixi-live2d-renderer");

    if (this.isDisposed) {
      if (this.canvas?.parentElement) {
        this.canvas.parentElement.removeChild(this.canvas);
      }
      this.canvas = null;
      return this.createController();
    }

    // Create and initialize the renderer
    this.renderer = new PixiLive2DRenderer();

    this.modelInfo = {
      modelPath: props.modelPath,
      name: "Avatar",
      scale: props.scale ?? 0.9,
    };

    try {
      await this.renderer.initialize({
        canvas: this.canvas,
        model: this.modelInfo,
        pixelRatio: props.pixelRatio,
        debug: props.debug,
      });

      if (this.isDisposed) {
        this.renderer.dispose();
        this.renderer = null;
        return this.createController();
      }

      await this.renderer.loadModel(this.modelInfo);

      if (this.isDisposed) {
        this.renderer.dispose();
        this.renderer = null;
        return this.createController();
      }

      this.isLoaded = true;
      this.startMetabolicProjection();
      props.onLoad?.();

      if (props.debug) {
        console.log("[Live2DAvatarManager] Model loaded successfully");
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      props.onError?.(err);
      throw err;
    }

    return this.createController();
  }

  /**
   * Create a controller for external access
   */
  private createController(): Live2DAvatarController {
    return {
      setExpression: (expression, intensity = 0.7) => {
        this.renderer?.setExpression(expression, intensity);
      },
      setNamedExpression: (name) => {
        return this.renderer?.setNamedExpression?.(name) ?? false;
      },
      playMotion: (motion) => {
        this.renderer?.playMotion(motion);
      },
      updateLipSync: (audioLevel) => {
        this.renderer?.updateLipSync(audioLevel);
      },
      updateCognitiveState: (state) => {
        this.updateCognitiveState(state);
      },
      triggerBlink: () => {
        const renderer = this.renderer as
          | (PixiLive2DRenderer & {
              triggerBlink?: (durationMs?: number) => void;
              setBlinking?: (isBlinking: boolean) => void;
            })
          | null;
        if (typeof renderer?.triggerBlink === "function") {
          renderer.triggerBlink(150);
          return;
        }
        renderer?.setBlinking?.(true);
        setTimeout(() => renderer?.setBlinking?.(false), 150);
      },
      setParameter: (paramId, value) => {
        this.renderer?.setParameter(paramId, value);
      },
      applyOutfit: (outfit) => {
        this.renderer?.applyOutfit(outfit);
      },
      inspectMesh: () => this.renderer?.inspectMesh() ?? [],
      applyTextureOverlay: (source) =>
        this.renderer?.applyTextureOverlay(source) ?? Promise.resolve(false),
      clearTextureOverlay: () =>
        this.renderer?.clearTextureOverlay() ?? Promise.resolve(false),
      applyParameterProfile: (profile) =>
        this.renderer?.applyParameterProfile(profile),
      applyIdentityRig: (rig) => this.renderer?.applyIdentityRig(rig),
      getRenderer: () => this.renderer,
      resize: (width, height, scale) => {
        this.resize(width, height, scale);
      },
      getNativeSize: () => this.renderer?.getNativeSize() ?? null,
      getSelfModelAccuracy: () =>
        selfModelAvatarFeedback.getSelfModelAccuracy(),
      getLastExpressionExperience: () => this.lastExpressionExperience,
    };
  }

  /**
   * Update emotional state using the package-wide weighted expression mapper.
   */
  updateEmotionalState(state: EmotionalVector): void {
    if (!this.renderer || !this.isLoaded) return;

    const expression = mapEmotionToExpression(state);
    const intensity = Math.max(0.3, getExpressionIntensity(expression, state));

    this.renderer.setExpression(expression, intensity);
  }

  /**
   * Project a richer DTE cognitive state into Live2D expression, motion,
   * gaze, lip-sync, and direct Cubism parameter modulation using the DTEcho atlas.
   */
  updateCognitiveState(state: Live2DCognitiveVisualState): void {
    if (!this.renderer || !this.isLoaded) return;

    const projection = projectDTEchoCognitiveState(state);
    if (state.metabolic) {
      this.metabolicBridge?.feedMetabolicState(state.metabolic);
    }

    const calibratedCubism = selfModelAvatarFeedback.applyCalibration(
      projection.cubism,
    );
    this.lastProjectedCubism = { ...calibratedCubism };
    this.pendingCognitiveMode = projection.selectedMode;
    // Wait one complete Pixi update before reading the core model so motions,
    // expressions, physics, and metabolic deltas have all settled.
    this.selfModelSampleDelayFrames = 2;

    const playedNamed = this.renderer.setNamedExpression?.(
      projection.expressionName,
    );
    if (!playedNamed) {
      this.renderer.setExpression(
        projection.avatarExpression,
        projection.intensity,
      );
    }

    if (projection.motion) {
      this.renderer.playMotion(projection.motion);
    } else if (state.isProcessing) {
      this.renderer.playMotion("thinking");
    }

    this.renderer.updateLipSync(projection.lipSyncLevel);

    for (const [paramId, value] of Object.entries(calibratedCubism)) {
      this.renderer.setParameter(paramId, value);
    }

    if (typeof this.renderer.focusEyes === "function" && this.canvas) {
      const selfAwareness = this.clamp01(state.selfAwareness ?? 0.45);
      const phi = this.clamp01(state.phi ?? 0.45);
      const metabolicFocus = this.metabolicBridge?.getDeltas().gazeFocus ?? 0.5;
      const salience = this.clamp01(
        (state.salience ?? 0.5) * (0.65 + metabolicFocus * 0.7),
      );
      const x =
        this.canvas.width / 2 +
        (selfAwareness - 0.5) * this.canvas.width * (0.12 + salience * 0.1);
      const y =
        this.canvas.height / 2 -
        (phi - 0.5) * this.canvas.height * (0.1 + salience * 0.08);
      this.renderer.focusEyes(x, y);
    }
  }

  private startMetabolicProjection(): void {
    this.stopMetabolicProjection();
    this.metabolicBridge = new MetabolicAvatarBridge();
    this.metabolicBridge.on("deltas_updated", this.onMetabolicDeltas);
    this.metabolicFrameAccumulatorMs = 0;

    const renderer = this.renderer as PixiLive2DRenderer & {
      addFrameListener?: (listener: (deltaTime: number) => void) => void;
    };
    renderer.addFrameListener?.(this.onMetabolicFrame);
    renderer.addFrameListener?.(this.onSelfModelFrame);
    this.metabolicBridge.step();
  }

  private stopMetabolicProjection(): void {
    const renderer = this.renderer as
      | (PixiLive2DRenderer & {
          removeFrameListener?: (listener: (deltaTime: number) => void) => void;
        })
      | null;
    renderer?.removeFrameListener?.(this.onMetabolicFrame);
    renderer?.removeFrameListener?.(this.onSelfModelFrame);
    this.metabolicFrameAccumulatorMs = 0;
    this.selfModelSampleDelayFrames = 0;
    if (this.metabolicBridge) {
      this.metabolicBridge.off("deltas_updated", this.onMetabolicDeltas);
      this.metabolicBridge.stop();
      this.metabolicBridge = null;
    }
  }

  private applyMetabolicDeltas(deltas: MetabolicAvatarDeltas): void {
    if (!this.renderer || !this.isLoaded) return;

    const composed = this.composeMetabolicCubism(
      this.lastProjectedCubism,
      deltas,
    );
    for (const [paramId, value] of Object.entries(composed)) {
      this.renderer.setParameter(paramId, value);
    }

    const renderer = this.renderer as PixiLive2DRenderer & {
      setAnimationSpeed?: (multiplier: number) => void;
      setVisualVitality?: (multiplier: number) => void;
    };
    renderer.setAnimationSpeed?.(
      deltas.animSpeedMult * (0.75 + deltas.movementFluidity * 0.5),
    );
    renderer.setVisualVitality?.(deltas.vitalityMult);
  }

  private composeMetabolicCubism(
    projected: Record<string, number>,
    deltas?: MetabolicAvatarDeltas,
  ): Record<string, number> {
    const composed = { ...projected };
    if (!deltas) return composed;

    const base = (id: string, fallback: number): number =>
      projected[id] ?? fallback;
    const set = (id: string, value: number, min: number, max: number): void => {
      composed[id] = Math.max(min, Math.min(max, value));
    };

    set(
      "ParamEyeLOpen",
      base("ParamEyeLOpen", 1) + deltas.eyeOpenDelta + deltas.pupilDelta * 0.2,
      0,
      1.5,
    );
    set(
      "ParamEyeROpen",
      base("ParamEyeROpen", 1) + deltas.eyeOpenDelta + deltas.pupilDelta * 0.2,
      0,
      1.5,
    );
    set(
      "ParamMouthForm",
      base("ParamMouthForm", 0) + deltas.mouthFormDelta,
      -1,
      1,
    );
    set("ParamBrowLY", base("ParamBrowLY", 0) + deltas.browDelta, -1, 1);
    set("ParamBrowRY", base("ParamBrowRY", 0) + deltas.browDelta, -1, 1);
    set("ParamAngleY", base("ParamAngleY", 0) + deltas.headNodDelta, -30, 30);
    set("ParamAngleZ", base("ParamAngleZ", 0) + deltas.headTiltDelta, -30, 30);

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const breathPhase =
      (now / 1000) * Math.PI * 2 * 0.22 * deltas.breathRateMult;
    const breath = 0.5 + Math.sin(breathPhase) * 0.5 * deltas.breathDepthMult;
    set("ParamBreath", breath, 0, 1);

    return composed;
  }

  private sampleRenderedProjection(): void {
    if (!this.renderer || !this.isLoaded) return;

    const expected = this.composeMetabolicCubism(
      this.lastProjectedCubism,
      this.metabolicBridge?.getDeltas(),
    );
    this.observableProjectionIds = Object.keys(expected).filter(
      (paramId) => paramId !== "ParamBreath",
    );
    const actual: Record<string, number> = {};
    for (const paramId of this.observableProjectionIds) {
      const value = this.renderer.getParameter(paramId);
      if (typeof value === "number" && Number.isFinite(value)) {
        actual[paramId] = value;
      }
    }
    if (Object.keys(actual).length === 0) return;

    selfModelAvatarFeedback.recordIntendedProjection(
      expected,
      this.pendingCognitiveMode,
    );
    this.lastExpressionExperience =
      selfModelAvatarFeedback.sampleActualState(actual);
  }

  /**
   * Resize the existing WebGL view. Do not re-create the Cubism runtime —
   * a second Pixi context makes Live2D textures "not belong to this context".
   */
  resize(width?: number, height?: number, scale?: number): void {
    if (!this.renderer || !this.isLoaded) return;
    if (this.modelInfo && typeof scale === "number") {
      this.modelInfo.scale = scale;
    }
    this.renderer.resize(width, height, scale);
  }

  private clamp01(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.isDisposed = true;
    this.stopMetabolicProjection();
    this.lastProjectedCubism = {};
    this.observableProjectionIds = [];
    this.pendingCognitiveMode = "Idle";
    this.lastExpressionExperience = null;
    this.renderer?.dispose();
    this.renderer = null;

    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.isLoaded = false;
  }
}

/**
 * Create a Live2D avatar manager instance
 */
export function createLive2DAvatarManager(): Live2DAvatarManager {
  return new Live2DAvatarManager();
}

/**
 * Available sample model paths
 * Note: These are example paths - actual models need to be downloaded
 * from Live2D or created with Cubism Editor.
 */
export const SAMPLE_MODELS = {
  /**
   * Shizuku - Sample character from Live2D
   * Download from: https://www.live2d.com/en/download/sample-data/
   */
  shizuku: "/models/Shizuku/Shizuku.model3.json",

  /**
   * Haru - Sample character from Live2D
   * Download from: https://www.live2d.com/en/download/sample-data/
   */
  haru: "/models/Haru/Haru.model3.json",

  /**
   * Mark - Male sample character from Live2D
   * Download from: https://www.live2d.com/en/download/sample-data/
   */
  mark: "/models/Mark/Mark.model3.json",

  /**
   * Rice (example small model)
   * Often used in tutorials and demos
   */
  rice: "/models/Rice/Rice.model3.json",
};

/**
 * Default model configuration
 */
export const DEFAULT_MODEL_CONFIG: CubismModelInfo = {
  modelPath: SAMPLE_MODELS.shizuku,
  name: "Deep Tree Echo Avatar",
  scale: 0.9,
  offset: { x: 0, y: 50 },
};

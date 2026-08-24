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
  /** Scale factor for the model */
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
  /** Get renderer instance */
  getRenderer: () => PixiLive2DRenderer | null;
  /** Resize the existing view without recreating the WebGL context */
  resize: (width?: number, height?: number, scale?: number) => void;
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
      scale: props.scale ?? 0.25,
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
      getRenderer: () => this.renderer,
      resize: (width, height, scale) => {
        this.resize(width, height, scale);
      },
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
    this.renderer.setExpression(
      projection.avatarExpression,
      projection.intensity,
    );

    if (projection.motion) {
      this.renderer.playMotion(projection.motion);
    } else if (state.isProcessing) {
      this.renderer.playMotion("thinking");
    }

    this.renderer.updateLipSync(projection.lipSyncLevel);

    for (const [paramId, value] of Object.entries(projection.cubism)) {
      this.renderer.setParameter(paramId, value);
    }

    if (typeof this.renderer.focusEyes === "function" && this.canvas) {
      const selfAwareness = this.clamp01(state.selfAwareness ?? 0.45);
      const phi = this.clamp01(state.phi ?? 0.45);
      const salience = this.clamp01(state.salience ?? 0.5);
      const x =
        this.canvas.width / 2 +
        (selfAwareness - 0.5) * this.canvas.width * (0.12 + salience * 0.1);
      const y =
        this.canvas.height / 2 -
        (phi - 0.5) * this.canvas.height * (0.1 + salience * 0.08);
      this.renderer.focusEyes(x, y);
    }
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
  scale: 0.25,
  offset: { x: 0, y: 50 },
};

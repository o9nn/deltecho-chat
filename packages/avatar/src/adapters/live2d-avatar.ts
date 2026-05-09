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
import { PARAM_IDS } from "./pixi-live2d-renderer";
import type { PixiLive2DRenderer } from "./pixi-live2d-renderer";

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
  valence?: number; // -1..1
  arousal?: number; // 0..1
  selfAwareness?: number; // 0..1
  sentience?: number; // 0..1
  phi?: number; // 0..1 consciousness/integration proxy
  flow?: number; // 0..1 focus/processing flow
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
      });

      await this.renderer.loadModel(this.modelInfo);

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
        this.renderer?.setBlinking(true);
        setTimeout(() => {
          this.renderer?.setBlinking(false);
        }, 150);
      },
      setParameter: (paramId, value) => {
        this.renderer?.setParameter(paramId, value);
      },
      getRenderer: () => this.renderer,
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
   * gaze, lip-sync, and direct Cubism parameter modulation.
   */
  updateCognitiveState(state: Live2DCognitiveVisualState): void {
    if (!this.renderer || !this.isLoaded) return;

    const emotionalState = this.cognitiveStateToEmotion(state);
    const expression = mapEmotionToExpression(emotionalState);
    const intensity = Math.max(
      0.35,
      getExpressionIntensity(expression, emotionalState),
      this.clamp01(state.selfAwareness ?? 0) * 0.55,
    );

    this.renderer.setExpression(expression, intensity);
    if (state.isSpeaking || state.audioLevel !== undefined) {
      this.renderer.updateLipSync(
        state.audioLevel ?? (state.isSpeaking ? 0.45 : 0),
      );
    }
    if (state.isProcessing) {
      this.renderer.playMotion("thinking");
    }
    this.applyCognitiveMicroExpressions(state);
  }

  private cognitiveStateToEmotion(
    state: Live2DCognitiveVisualState,
  ): EmotionalVector {
    const valence = this.clamp(state.valence ?? 0, -1, 1);
    const arousal = this.clamp01(state.arousal ?? 0.3);
    const flow = this.clamp01(state.flow ?? 0);
    const selfAwareness = this.clamp01(state.selfAwareness ?? 0);
    const sentience = this.clamp01(state.sentience ?? 0);

    return {
      joy: Math.max(0, valence) * 0.7 + sentience * 0.15,
      interest: Math.max(flow, selfAwareness * 0.8, sentience * 0.6),
      surprise: arousal > 0.75 ? (arousal - 0.75) * 4 : 0,
      sadness: Math.max(0, -valence) * 0.45,
      anger: 0,
      fear:
        valence < -0.35 && arousal > 0.6 ? Math.min(1, -valence * arousal) : 0,
      disgust: 0,
      contempt: 0,
    };
  }

  private applyCognitiveMicroExpressions(
    state: Live2DCognitiveVisualState,
  ): void {
    if (!this.renderer) return;

    const arousal = this.clamp01(state.arousal ?? 0.3);
    const valence = this.clamp(state.valence ?? 0, -1, 1);
    const selfAwareness = this.clamp01(state.selfAwareness ?? 0);
    const phi = this.clamp01(state.phi ?? 0);
    const flow = this.clamp01(state.flow ?? 0);

    this.renderer.setParameter(
      PARAM_IDS.PARAM_EYE_L_OPEN,
      this.clamp(0.82 + arousal * 0.28, 0.55, 1.2),
    );
    this.renderer.setParameter(
      PARAM_IDS.PARAM_EYE_R_OPEN,
      this.clamp(0.82 + arousal * 0.28, 0.55, 1.2),
    );
    this.renderer.setParameter(
      PARAM_IDS.PARAM_BROW_L_Y,
      this.clamp((selfAwareness - 0.5) * 0.45 + valence * 0.18, -0.45, 0.55),
    );
    this.renderer.setParameter(
      PARAM_IDS.PARAM_BROW_R_Y,
      this.clamp((phi - 0.5) * 0.35 + valence * 0.18, -0.45, 0.55),
    );
    this.renderer.setParameter(
      PARAM_IDS.PARAM_ANGLE_Z,
      this.clamp((selfAwareness - phi) * 8, -8, 8),
    );
    this.renderer.setParameter(
      PARAM_IDS.PARAM_BODY_ANGLE_X,
      this.clamp((flow - 0.5) * 8, -8, 8),
    );

    if (typeof this.renderer.focusEyes === "function" && this.canvas) {
      const x =
        this.canvas.width / 2 +
        (selfAwareness - 0.5) * this.canvas.width * 0.18;
      const y =
        this.canvas.height / 2 - (phi - 0.5) * this.canvas.height * 0.16;
      this.renderer.focusEyes(x, y);
    }
  }

  private clamp01(value: number): number {
    return this.clamp(value, 0, 1);
  }

  private clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
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

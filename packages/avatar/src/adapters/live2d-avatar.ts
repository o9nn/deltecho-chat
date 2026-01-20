/**
 * Live2D Model Component for React
 *
 * A React component wrapper for displaying Live2D models
 * using the PixiLive2DRenderer.
 */

import type { Expression, EmotionalVector, AvatarMotion } from "../types";
import type { CubismModelInfo } from "./cubism-adapter";
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
 * Controller interface for external control of the avatar
 */
export interface Live2DAvatarController {
  /** Set expression with intensity */
  setExpression: (expression: Expression, intensity?: number) => void;
  /** Play a motion animation */
  playMotion: (motion: AvatarMotion) => void;
  /** Update lip sync value */
  updateLipSync: (audioLevel: number) => void;
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
   * Update emotional state
   */
  updateEmotionalState(state: EmotionalVector): void {
    if (!this.renderer || !this.isLoaded) return;

    // Map emotional vector to expression
    const expression = this.mapEmotionToExpression(state);
    const intensity = this.calculateIntensity(state);

    this.renderer.setExpression(expression, intensity);
  }

  /**
   * Map emotional vector to expression
   */
  private mapEmotionToExpression(state: EmotionalVector): Expression {
    const emotions: Array<[keyof EmotionalVector, Expression]> = [
      ["joy", "happy"],
      ["interest", "curious"],
      ["surprise", "surprised"],
      ["sadness", "concerned"],
      ["anger", "focused"],
      ["fear", "concerned"],
    ];

    let maxEmotion: Expression = "neutral";
    let maxValue = 0.2; // Threshold for neutral

    for (const [emotion, expression] of emotions) {
      const value = state[emotion] ?? 0;
      if (value > maxValue) {
        maxValue = value;
        maxEmotion = expression;
      }
    }

    return maxEmotion;
  }

  /**
   * Calculate overall emotional intensity
   */
  private calculateIntensity(state: EmotionalVector): number {
    const values = Object.values(state).filter(
      (v): v is number => typeof v === "number",
    );
    if (values.length === 0) return 0.5;
    return Math.min(1, Math.max(0.3, Math.max(...values)));
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
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

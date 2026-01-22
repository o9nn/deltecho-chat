/**
 * Cubism Adapter for Live2D Integration
 *
 * This is a stub/interface adapter that defines the contract for
 * Live2D Cubism SDK integration. The actual implementation requires
 * the Live2D Cubism SDK which has licensing requirements.
 *
 * To integrate Live2D:
 * 1. Obtain Live2D Cubism SDK license
 * 2. Install @live2d/cubism-framework package
 * 3. Implement CubismRenderer class
 * 4. Connect to AvatarController
 */

import { Expression, AvatarState, AvatarMotion } from "../types";

/**
 * Model information for Live2D model
 */
export interface CubismModelInfo {
  /** Path to model3.json file */
  modelPath: string;
  /** Display name */
  name: string;
  /** Model scale factor */
  scale?: number;
  /** Position offset */
  offset?: { x: number; y: number };
}

/**
 * Expression mapping for Live2D model
 * Maps our Expression types to model's expression names
 */
export interface CubismExpressionMap {
  [key: string]: string; // Expression -> model expression name
}

/**
 * Motion mapping for Live2D model
 * Maps our AvatarMotion types to model's motion names
 */
export interface CubismMotionMap {
  [key: string]: {
    group: string;
    index: number;
  };
}

/**
 * Cubism adapter configuration
 */
export interface CubismAdapterConfig {
  /** Canvas element ID or HTMLCanvasElement */
  canvas: string | HTMLCanvasElement;
  /** Model information */
  model: CubismModelInfo;
  /** Expression mapping */
  expressions?: CubismExpressionMap;
  /** Motion mapping */
  motions?: CubismMotionMap;
}

/**
 * Abstract interface for Cubism rendering
 * Implement this to connect to Live2D SDK
 */
export interface ICubismRenderer {
  /** Initialize the renderer with config */
  initialize(config: CubismAdapterConfig): Promise<void>;

  /** Load and display a model */
  loadModel(modelInfo: CubismModelInfo): Promise<void>;

  /** Set expression on the model */
  setExpression(expression: Expression, intensity: number): void;

  /** Play a motion animation */
  playMotion(motion: AvatarMotion, priority?: number): void;

  /** Update lip sync based on audio level */
  updateLipSync(audioLevel: number): void;

  /** Set eye blink state */
  setBlinking(isBlinking: boolean): void;

  /** Update model (call in render loop) */
  update(deltaTime: number): void;

  /** Render the model to canvas */
  render(): void;

  /** Clean up resources */
  dispose(): void;
}

/**
 * Stub Cubism Renderer
 *
 * Placeholder implementation that logs calls.
 * Replace with actual Live2D SDK implementation.
 */
export class StubCubismRenderer implements ICubismRenderer {
  private initialized = false;
  private currentExpression: Expression = "neutral";
  private currentMotion: AvatarMotion = "idle";

  async initialize(config: CubismAdapterConfig): Promise<void> {
    console.log("[CubismAdapter] Stub: initialize called with", config);
    this.initialized = true;
  }

  async loadModel(modelInfo: CubismModelInfo): Promise<void> {
    console.log("[CubismAdapter] Stub: loadModel called with", modelInfo);
  }

  setExpression(expression: Expression, intensity: number): void {
    if (!this.initialized) return;
    this.currentExpression = expression;
    console.log(
      `[CubismAdapter] Stub: setExpression(${expression}, ${intensity})`,
    );
  }

  playMotion(motion: AvatarMotion, priority = 1): void {
    if (!this.initialized) return;
    this.currentMotion = motion;
    console.log(`[CubismAdapter] Stub: playMotion(${motion}, ${priority})`);
  }

  updateLipSync( _audioLevel: number): void {
    if (!this.initialized) return;
    // Stub: no visual output
  }

  setBlinking(isBlinking: boolean): void {
    if (!this.initialized) return;
    console.log(`[CubismAdapter] Stub: setBlinking(${isBlinking})`);
  }

  update(_deltaTime: number): void {
    // Stub: nothing to update
  }

  render(): void {
    // Stub: nothing to render
  }

  dispose(): void {
    console.log("[CubismAdapter] Stub: dispose called");
    this.initialized = false;
  }

  // Getters for testing
  getExpression(): Expression {
    return this.currentExpression;
  }

  getMotion(): AvatarMotion {
    return this.currentMotion;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * CubismAdapter bridges AvatarController to Live2D renderer
 */
export class CubismAdapter {
  private renderer: ICubismRenderer;
  private state: AvatarState | null = null;
  private lastUpdateTime = 0;
  private animationFrameId: number | null = null;

  constructor(renderer?: ICubismRenderer) {
    this.renderer = renderer ?? new StubCubismRenderer();
  }

  /**
   * Initialize the adapter with configuration
   */
  async initialize(config: CubismAdapterConfig): Promise<void> {
    await this.renderer.initialize(config);
    await this.renderer.loadModel(config.model);
  }

  /**
   * Update from AvatarController state
   */
  updateFromState(
    state: AvatarState,
    emotionalState?: Record<string, number>,
  ): void {
    const intensity = emotionalState
      ? this.calculateIntensity(emotionalState)
      : 0.7;

    this.renderer.setExpression(state.currentExpression, intensity);
    this.renderer.setBlinking(state.isBlinking);

    this.state = state;
  }

  /**
   * Calculate expression intensity from emotional state
   */
  private calculateIntensity(emotionalState: Record<string, number>): number {
    const values = Object.values(emotionalState);
    if (values.length === 0) return 0.5;

    const max = Math.max(...values);
    return Math.min(1, Math.max(0.3, max));
  }

  /**
   * Start render loop
   */
  startRenderLoop(): void {
    const render = (time: number) => {
      const deltaTime = (time - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = time;

      this.renderer.update(deltaTime);
      this.renderer.render();

      this.animationFrameId = requestAnimationFrame(render);
    };

    if (typeof requestAnimationFrame !== "undefined") {
      this.animationFrameId = requestAnimationFrame(render);
    }
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    if (
      this.animationFrameId !== null &&
      typeof cancelAnimationFrame !== "undefined"
    ) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update lip sync from audio level (0-1)
   */
  updateLipSync(audioLevel: number): void {
    this.renderer.updateLipSync(audioLevel);
  }

  /**
   * Play a motion animation
   */
  playMotion(motion: AvatarMotion): void {
    this.renderer.playMotion(motion);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopRenderLoop();
    this.renderer.dispose();
  }
}

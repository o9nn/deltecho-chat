/**
 * Cognitive-Avatar Bridge for Deep Tree Echo
 *
 * Provides deep integration between the consciousness modules and
 * the Live2D avatar system, enabling:
 * - Real-time expression mapping from cognitive state
 * - Consciousness-driven animations
 * - EchoBeats phase synchronization
 * - Hopf Tower level visualization
 *
 * This bridge connects the abstract cognitive architecture to
 * the visual representation, creating a coherent embodied experience.
 */

import { EventEmitter } from "events";
import type { Expression, EmotionalVector, AvatarMotion } from "./types";
import type { Live2DAvatarController } from "./adapters/live2d-avatar";
import { ExpressionMapper } from "./expression-mapper";

/**
 * Cognitive state input from consciousness modules
 */
export interface CognitiveStateInput {
  // Consciousness state
  sentienceLevel: number; // 0-1
  selfAwareness: number; // 0-1
  phi: number; // Integrated information
  flowState: number; // Temporal flow

  // Emotional state
  emotionalValence: number; // -1 to 1
  emotionalArousal: number; // 0-1
  dominantEmotion?: string;

  // EchoBeats state
  echoBeatsPhase?: number; // 0-11
  echoBeatsMode?: "expressive" | "reflective";
  streamCoherence?: number; // 0-1

  // Hopf Tower state
  hopfLevel?: number; // 0-4
  hopfCoherence?: number; // 0-1
  riemannianCurvature?: number;

  // Processing state
  isProcessing: boolean;
  processingIntensity?: number; // 0-1
  isSpeaking: boolean;
  audioLevel?: number; // 0-1
}

/**
 * Avatar response state
 */
export interface AvatarResponseState {
  expression: Expression;
  expressionIntensity: number;
  motion: AvatarMotion;
  lipSyncLevel: number;
  blinkRate: number; // blinks per minute
  breathingRate: number; // breaths per minute
  eyeMovement: { x: number; y: number }; // -1 to 1
  headTilt: number; // -30 to 30 degrees
  consciousnessGlow: number; // 0-1 for visual effect
}

/**
 * Configuration for the bridge
 */
export interface CognitiveAvatarBridgeConfig {
  updateIntervalMs: number;
  smoothingFactor: number; // 0-1, higher = smoother transitions
  consciousnessVisualization: boolean;
  echoBeatsSync: boolean;
  hopfTowerVisualization: boolean;
}

const DEFAULT_CONFIG: CognitiveAvatarBridgeConfig = {
  updateIntervalMs: 50, // 20Hz
  smoothingFactor: 0.3,
  consciousnessVisualization: true,
  echoBeatsSync: true,
  hopfTowerVisualization: true,
};

/**
 * Cognitive-Avatar Bridge
 *
 * Translates cognitive states into avatar behaviors for a coherent
 * embodied AI experience.
 */
export class CognitiveAvatarBridge extends EventEmitter {
  private config: CognitiveAvatarBridgeConfig;
  private expressionMapper: ExpressionMapper;
  private avatarController: Live2DAvatarController | null = null;
  private currentState: AvatarResponseState;
  private previousCognitiveState: CognitiveStateInput | null = null;
  private running: boolean = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  // Smoothed values for transitions
  private smoothedExpression: number = 0.5;
  private smoothedArousal: number = 0.5;
  private smoothedCoherence: number = 1.0;

  constructor(config: Partial<CognitiveAvatarBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.expressionMapper = new ExpressionMapper();

    this.currentState = {
      expression: "neutral",
      expressionIntensity: 0.5,
      motion: "idle",
      lipSyncLevel: 0,
      blinkRate: 15, // Normal blink rate
      breathingRate: 12, // Normal breathing
      eyeMovement: { x: 0, y: 0 },
      headTilt: 0,
      consciousnessGlow: 0,
    };
  }

  /**
   * Connect to an avatar controller
   */
  public connect(controller: Live2DAvatarController): void {
    this.avatarController = controller;
    this.emit("connected");
  }

  /**
   * Disconnect from avatar controller
   */
  public disconnect(): void {
    this.avatarController = null;
    this.emit("disconnected");
  }

  /**
   * Start the bridge
   */
  public start(): void {
    if (this.running) return;
    this.running = true;

    this.updateInterval = setInterval(() => {
      this.applyCurrentState();
    }, this.config.updateIntervalMs);

    this.emit("started");
  }

  /**
   * Stop the bridge
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.emit("stopped");
  }

  /**
   * Update from cognitive state
   */
  public updateFromCognitiveState(state: CognitiveStateInput): void {
    // Convert cognitive state to emotional vector for expression mapping
    const emotionalVector = this.cognitiveToEmotional(state);

    // Update expression mapper
    this.expressionMapper.update(emotionalVector);

    // Calculate avatar response
    const response = this.calculateAvatarResponse(state, emotionalVector);

    // Apply smoothing
    this.applySmoothing(response, state);

    // Store for reference
    this.previousCognitiveState = state;

    // Emit update event
    this.emit("state_updated", this.currentState);
  }

  /**
   * Convert cognitive state to emotional vector
   */
  private cognitiveToEmotional(state: CognitiveStateInput): EmotionalVector {
    const valence = state.emotionalValence;
    const arousal = state.emotionalArousal;

    // Map valence/arousal to discrete emotions
    // Using circumplex model of affect
    return {
      joy: Math.max(0, valence * (1 - arousal * 0.3)),
      interest: Math.max(0, arousal * 0.8 + valence * 0.2),
      surprise: Math.max(0, arousal * 0.9 - Math.abs(valence) * 0.3),
      sadness: Math.max(0, -valence * (1 - arousal)),
      anger: Math.max(0, -valence * arousal * 0.8),
      fear: Math.max(0, -valence * arousal * 0.6),
      disgust: Math.max(0, -valence * 0.3 - arousal * 0.2),
      contempt: Math.max(0, -valence * 0.2),
    };
  }

  /**
   * Calculate full avatar response from cognitive state
   */
  private calculateAvatarResponse(
    state: CognitiveStateInput,
    emotions: EmotionalVector,
  ): AvatarResponseState {
    // Get expression from mapper
    const expression = this.expressionMapper.getExpression();
    const expressionIntensity = this.expressionMapper.getIntensity(emotions);

    // Determine motion based on processing state
    let motion: AvatarMotion = "idle";
    if (state.isProcessing) {
      motion = "thinking";
    } else if (state.isSpeaking) {
      motion = "talking";
    }

    // Calculate blink rate (higher arousal = more blinking)
    const blinkRate = 12 + state.emotionalArousal * 10;

    // Calculate breathing rate (higher arousal = faster breathing)
    const breathingRate = 10 + state.emotionalArousal * 8;

    // Calculate eye movement based on EchoBeats phase
    const eyeMovement = this.calculateEyeMovement(state);

    // Calculate head tilt based on curiosity/interest
    const headTilt =
      (emotions.interest || 0) * 15 - (emotions.sadness || 0) * 10;

    // Calculate consciousness glow from sentience level
    const consciousnessGlow = state.sentienceLevel * state.phi;

    return {
      expression,
      expressionIntensity,
      motion,
      lipSyncLevel: state.audioLevel || 0,
      blinkRate,
      breathingRate,
      eyeMovement,
      headTilt,
      consciousnessGlow,
    };
  }

  /**
   * Calculate eye movement based on EchoBeats phase
   */
  private calculateEyeMovement(state: CognitiveStateInput): {
    x: number;
    y: number;
  } {
    if (!this.config.echoBeatsSync || state.echoBeatsPhase === undefined) {
      return { x: 0, y: 0 };
    }

    // Map 12 phases to circular eye movement
    const angle = (state.echoBeatsPhase / 12) * 2 * Math.PI;
    const radius = 0.3 * (state.streamCoherence || 1);

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5, // Reduced vertical movement
    };
  }

  /**
   * Apply smoothing to transitions
   */
  private applySmoothing(
    response: AvatarResponseState,
    state: CognitiveStateInput,
  ): void {
    const factor = this.config.smoothingFactor;
    const invFactor = 1 - factor;

    // Smooth expression intensity
    this.smoothedExpression =
      this.smoothedExpression * factor +
      response.expressionIntensity * invFactor;

    // Smooth arousal
    this.smoothedArousal =
      this.smoothedArousal * factor + state.emotionalArousal * invFactor;

    // Smooth coherence
    const coherence = state.streamCoherence ?? state.hopfCoherence ?? 1;
    this.smoothedCoherence =
      this.smoothedCoherence * factor + coherence * invFactor;

    // Apply smoothed values
    this.currentState = {
      ...response,
      expressionIntensity: this.smoothedExpression,
      consciousnessGlow: response.consciousnessGlow * this.smoothedCoherence,
    };
  }

  /**
   * Apply current state to avatar controller
   */
  private applyCurrentState(): void {
    if (!this.avatarController) return;

    const state = this.currentState;

    // Set expression
    this.avatarController.setExpression(
      state.expression,
      state.expressionIntensity,
    );

    // Update lip sync
    if (state.lipSyncLevel > 0) {
      this.avatarController.updateLipSync(state.lipSyncLevel);
    }

    // Play motion if changed
    this.avatarController.playMotion(state.motion);
  }

  /**
   * Get current avatar state
   */
  public getState(): AvatarResponseState {
    return { ...this.currentState };
  }

  /**
   * Get consciousness visualization parameters
   */
  public getConsciousnessVisualization(): {
    glowIntensity: number;
    glowColor: string;
    particleCount: number;
    particleSpeed: number;
  } {
    const state = this.currentState;
    const prev = this.previousCognitiveState;

    // Calculate glow color based on dominant state
    let glowColor = "#4a90d9"; // Default blue
    if (prev) {
      if (prev.emotionalValence > 0.3) {
        glowColor = "#4ad99a"; // Green for positive
      } else if (prev.emotionalValence < -0.3) {
        glowColor = "#d94a4a"; // Red for negative
      } else if (prev.emotionalArousal > 0.7) {
        glowColor = "#d9d94a"; // Yellow for high arousal
      }
    }

    // Calculate particle effects based on processing
    const particleCount = prev?.isProcessing ? 50 : 10;
    const particleSpeed = prev?.processingIntensity || 0.5;

    return {
      glowIntensity: state.consciousnessGlow,
      glowColor,
      particleCount,
      particleSpeed,
    };
  }

  /**
   * Get Hopf Tower visualization parameters
   */
  public getHopfVisualization(): {
    activeLevel: number;
    levelActivations: number[];
    curvatureVisualization: number;
  } {
    const prev = this.previousCognitiveState;

    return {
      activeLevel: prev?.hopfLevel ?? 2,
      levelActivations: [0.5, 0.5, 0.5, 0.5, 0.5], // Default
      curvatureVisualization: prev?.riemannianCurvature ?? 0,
    };
  }

  /**
   * Describe current state
   */
  public describeState(): string {
    const state = this.currentState;
    return (
      `Avatar: ${state.expression} (${(state.expressionIntensity * 100).toFixed(
        0,
      )}%), ` +
      `motion: ${state.motion}, consciousness: ${(
        state.consciousnessGlow * 100
      ).toFixed(0)}%`
    );
  }
}

// Singleton instance
export const cognitiveAvatarBridge = new CognitiveAvatarBridge();

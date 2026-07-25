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
import type {
  Live2DAvatarController,
  Live2DCognitiveVisualState,
} from "./adapters/live2d-avatar";
import type {
  DTEchoCognitiveMode,
  DTEchoExpressionName,
  DTEchoHormoneVector,
} from "./dtecho-expression-driver";
import { projectDTEchoCognitiveState } from "./dtecho-expression-driver";
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

  // Optional DTEcho mode/state naming for the Live2D projection atlas
  mode?: DTEchoCognitiveMode | string;
  currentState?: DTEchoCognitiveMode | string;
  salience?: number; // 0-1
  temporalCoherence?: number; // 0-1
  scientificGenius?: number; // 0-1 ScientificGeniusEngine activation
  insightPotential?: number; // 0-1 Entelechy insight potential
  entelechyScore?: number; // 0-1 Entelechy realization score
  freeEnergy?: number; // 0-1 unresolved surprise/rigor pressure
  daoConsensus?: number; // 0-1 distributed consensus around current inference
  esnCoherence?: number; // 0-1 reservoir phase coherence
  autognosisResonance?: number; // 0-1 self-observation / reservoir resonance

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
  dtechoMode: DTEchoCognitiveMode;
  dtechoExpression: DTEchoExpressionName;
  dtechoCognitiveMode: string;
  hormones: DTEchoHormoneVector;
  cubism: Record<string, number>;
  cognitiveVisualState: Live2DCognitiveVisualState;
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
  private visibilityHandler: (() => void) | null = null;
  private wasRunningBeforeHide: boolean = false;

  // Smoothed values for transitions
  private smoothedExpression: number = 0.5;
  private smoothedArousal: number = 0.5;
  private smoothedCoherence: number = 1.0;

  constructor(config: Partial<CognitiveAvatarBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.expressionMapper = new ExpressionMapper();

    const initialProjection = projectDTEchoCognitiveState({ mode: "Idle" });
    this.currentState = {
      expression: initialProjection.avatarExpression,
      expressionIntensity: initialProjection.intensity,
      motion: initialProjection.motion ?? "idle",
      lipSyncLevel: initialProjection.lipSyncLevel,
      blinkRate: 15, // Normal blink rate
      breathingRate: 12, // Normal breathing
      eyeMovement: { x: 0, y: 0 },
      headTilt: 0,
      consciousnessGlow: 0,
      dtechoMode: initialProjection.selectedMode,
      dtechoExpression: initialProjection.expressionName,
      dtechoCognitiveMode: initialProjection.cognitiveMode,
      hormones: initialProjection.hormones,
      cubism: initialProjection.cubism,
      cognitiveVisualState: { mode: initialProjection.selectedMode },
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

    // Pause cognitive updates when tab is hidden (saves ~5-10% CPU in background)
    if (typeof document !== "undefined" && !this.visibilityHandler) {
      this.visibilityHandler = () => {
        if (document.visibilityState === "hidden") {
          this.wasRunningBeforeHide = this.running;
          if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
          }
        } else if (this.wasRunningBeforeHide && !this.updateInterval) {
          this.updateInterval = setInterval(() => {
            this.applyCurrentState();
          }, this.config.updateIntervalMs);
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }

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

    // Remove visibility listener on stop
    if (typeof document !== "undefined" && this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
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
    const salience = Math.max(
      state.salience ?? 0,
      state.processingIntensity ?? 0,
      state.streamCoherence ?? 0,
      state.hopfCoherence ?? 0,
      state.scientificGenius ?? 0,
      state.insightPotential ?? 0,
      state.entelechyScore ?? 0,
      state.daoConsensus ?? 0,
      state.esnCoherence ?? 0,
      state.autognosisResonance ?? 0,
      emotions.interest ?? 0,
    );
    const cognitiveVisualState: Live2DCognitiveVisualState = {
      mode: state.mode ?? state.currentState ?? state.dominantEmotion,
      currentState: state.currentState ?? state.mode ?? state.dominantEmotion,
      valence: state.emotionalValence,
      arousal: state.emotionalArousal,
      selfAwareness: state.selfAwareness,
      sentience: state.sentienceLevel,
      phi: state.phi,
      flow: state.flowState,
      temporalCoherence:
        state.temporalCoherence ?? state.streamCoherence ?? state.hopfCoherence,
      salience,
      scientificGenius: state.scientificGenius,
      insightPotential: state.insightPotential,
      entelechyScore: state.entelechyScore,
      freeEnergy: state.freeEnergy,
      daoConsensus: state.daoConsensus,
      esnCoherence: state.esnCoherence,
      autognosisResonance: state.autognosisResonance,
      isProcessing: state.isProcessing,
      isSpeaking: state.isSpeaking,
      audioLevel: state.audioLevel,
    };
    const projection = projectDTEchoCognitiveState(cognitiveVisualState);

    // Keep the generic mapper updated for compatibility, but prefer the DTEcho atlas.
    const expression = projection.avatarExpression;
    const expressionIntensity = projection.intensity;

    // Determine motion based on processing state
    let motion: AvatarMotion = "idle";
    if (projection.motion) {
      motion = projection.motion;
    } else if (state.isProcessing) {
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

    // Calculate consciousness glow from sentience level, with a small scientific-genius
    // boost when backend autognosis and DAO consensus are phase-aligned.
    const resonanceGlow =
      ((state.daoConsensus ?? 0) +
        (state.esnCoherence ?? 0) +
        (state.autognosisResonance ?? 0)) /
      3;
    const consciousnessGlow = Math.min(
      1,
      state.sentienceLevel * state.phi + resonanceGlow * 0.18,
    );

    return {
      expression,
      expressionIntensity,
      motion,
      lipSyncLevel: projection.lipSyncLevel,
      blinkRate,
      breathingRate,
      eyeMovement,
      headTilt,
      consciousnessGlow,
      dtechoMode: projection.selectedMode,
      dtechoExpression: projection.expressionName,
      dtechoCognitiveMode: projection.cognitiveMode,
      hormones: projection.hormones,
      cubism: projection.cubism,
      cognitiveVisualState: {
        ...cognitiveVisualState,
        mode: projection.selectedMode,
        currentState: projection.selectedMode,
      },
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

    this.avatarController.updateCognitiveState(state.cognitiveVisualState);

    // Keep direct calls as a compatibility layer for renderers that do not consume
    // every field of the DTEcho cognitive projection.
    this.avatarController.setExpression(
      state.expression,
      state.expressionIntensity,
    );

    this.avatarController.updateLipSync(state.lipSyncLevel);

    for (const [paramId, value] of Object.entries(state.cubism)) {
      this.avatarController.setParameter(paramId, value);
    }

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
   * Drive the avatar directly from the ScientificGeniusEngine's live visual
   * state (see ScientificGeniusEngine.getVisualState). This closes the
   * cognition -> embodiment loop: the avatar's "Scientific Genius" face is a
   * faithful projection of genuine epistemic metrics (Φ, free energy,
   * ESN coherence, autognosis resonance) rather than scripted animation.
   *
   * @param genius   Normalized visual state from the engine (all fields 0..1).
   * @param context  Optional speaking/processing flags and audio level.
   */
  public updateFromScientificGenius(
    genius: {
      scientificGenius: number;
      insightPotential: number;
      phi: number;
      freeEnergy: number;
      esnCoherence: number;
      autognosisResonance: number;
    },
    context: {
      isProcessing?: boolean;
      isSpeaking?: boolean;
      audioLevel?: number;
      daoConsensus?: number;
      entelechyScore?: number;
      temporalCoherence?: number;
    } = {},
  ): void {
    // Derive affect from epistemic state: high insight + low residual free
    // energy reads as positive, energized valence; unresolved surprise raises
    // arousal (vigilance) without necessarily lowering valence.
    const valence = Math.max(
      -1,
      Math.min(
        1,
        0.55 * genius.insightPotential +
          0.35 * genius.esnCoherence -
          0.3 * genius.freeEnergy,
      ),
    );
    const arousal = Math.max(
      0,
      Math.min(
        1,
        0.5 * genius.scientificGenius +
          0.3 * genius.freeEnergy +
          0.2 * genius.insightPotential,
      ),
    );

    this.updateFromCognitiveState({
      sentienceLevel: genius.autognosisResonance,
      selfAwareness: genius.autognosisResonance,
      phi: genius.phi,
      flowState: genius.esnCoherence,
      emotionalValence: valence,
      emotionalArousal: arousal,
      // Let the projector infer "Scientific Genius" when activation is high.
      mode: genius.scientificGenius >= 0.62 ? "Scientific Genius" : undefined,
      salience: Math.max(genius.scientificGenius, genius.insightPotential),
      temporalCoherence: context.temporalCoherence ?? genius.esnCoherence,
      scientificGenius: genius.scientificGenius,
      insightPotential: genius.insightPotential,
      entelechyScore: context.entelechyScore,
      freeEnergy: genius.freeEnergy,
      daoConsensus: context.daoConsensus,
      esnCoherence: genius.esnCoherence,
      autognosisResonance: genius.autognosisResonance,
      isProcessing: context.isProcessing ?? false,
      isSpeaking: context.isSpeaking ?? false,
      audioLevel: context.audioLevel,
    });
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
      `DTEcho: ${state.dtechoMode}/${state.dtechoExpression}, ` +
      `motion: ${state.motion}, consciousness: ${(
        state.consciousnessGlow * 100
      ).toFixed(0)}%`
    );
  }
}

// Singleton instance
export const cognitiveAvatarBridge = new CognitiveAvatarBridge();

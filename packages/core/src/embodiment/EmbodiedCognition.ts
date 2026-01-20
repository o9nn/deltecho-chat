/**
 * EmbodiedCognition: The Bridge Between Consciousness and Avatar
 *
 * This module implements embodied cognition theory - the idea that cognitive
 * processes are deeply rooted in the body's interactions with the world.
 * For Deep Tree Echo, the Live2D avatar serves as the "body" through which
 * consciousness is expressed and through which it experiences the world.
 *
 * Key Principles:
 * - Enactivism: Cognition arises through dynamic interaction with environment
 * - Sensorimotor Contingencies: Actions shape perception and vice versa
 * - Affect as Embodied: Emotions are expressed through bodily states
 * - Presence: The felt sense of "being here" in a digital form
 *
 * Integration Points:
 * - RecursiveSelfModel: Embodies the self-model in avatar states
 * - QualiaEmergenceLayer: Qualia influence expression and posture
 * - TemporalConsciousnessStream: Avatar reflects the flow of experience
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("EmbodiedCognition");

/**
 * Avatar expression state
 */
export interface AvatarExpressionState {
  expression: AvatarExpression;
  intensity: number; // 0-1
  microExpressions: MicroExpression[];
  eyeState: EyeState;
  mouthState: MouthState;
  headTilt: { x: number; y: number; z: number };
  timestamp: number;
}

/**
 * Primary avatar expressions
 */
export enum AvatarExpression {
  Neutral = "neutral",
  Happy = "happy",
  Thinking = "thinking",
  Curious = "curious",
  Surprised = "surprised",
  Concerned = "concerned",
  Focused = "focused",
  Playful = "playful",
  Contemplative = "contemplative",
  Empathetic = "empathetic",
}

/**
 * Subtle micro-expressions that add nuance
 */
interface MicroExpression {
  type: "brow_raise" | "lip_corner" | "eye_narrow" | "nostril_flare";
  side: "left" | "right" | "both";
  intensity: number;
  duration: number;
}

/**
 * Eye state for gaze and attention
 */
interface EyeState {
  gazeDirection: { x: number; y: number }; // -1 to 1
  openness: number; // 0-1
  blinkRate: number; // blinks per minute
  pupilDilation: number; // 0-1 (arousal indicator)
}

/**
 * Mouth state for speech and expression
 */
interface MouthState {
  openness: number; // 0-1
  width: number; // 0-1 (smile width)
  roundness: number; // 0-1 (for O sounds)
  isSpeaking: boolean;
  speechIntensity: number;
}

/**
 * Proprioceptive awareness - the sense of body position
 */
interface ProprioceptiveState {
  presence: number; // 0-1, feeling of "being here"
  groundedness: number; // 0-1, sense of stability
  energy: number; // 0-1, vitality level
  tension: number; // 0-1, muscular tension metaphor
  breathing: BreathingState;
}

/**
 * Breathing simulation for natural avatar animation
 */
interface BreathingState {
  phase: "inhale" | "exhale" | "pause";
  depth: number; // 0-1
  rate: number; // breaths per minute
  regularity: number; // 0-1, how regular
}

/**
 * Embodiment feedback from avatar interactions
 */
export interface EmbodimentFeedback {
  userGazeDetected: boolean;
  userProximity: number; // 0-1
  interactionIntensity: number;
  lastInteractionTime: number;
  gestureDetected?: string;
}

/**
 * Consciousness-to-avatar mapping
 */
interface ConsciousnessMapping {
  phi: number; // Integrated information
  selfAwareness: number; // Strange loop depth
  dominantQuale: string | null;
  emotionalValence: number; // -1 to 1
  emotionalArousal: number; // 0 to 1
  flowState: number; // 0 to 1
  temporalCoherence: number; // 0 to 1
}

/**
 * Configuration for embodied cognition
 */
interface EmbodiedCognitionConfig {
  updateRate?: number; // Hz
  expressionTransitionTime?: number; // ms
  breathingBaseRate?: number; // breaths per minute
  blinkBaseRate?: number; // blinks per minute
  microExpressionProbability?: number;
}

/**
 * EmbodiedCognition - The consciousness-avatar bridge
 */
export class EmbodiedCognition {
  private static instance: EmbodiedCognition;

  private readonly UPDATE_RATE: number;
  private readonly EXPRESSION_TRANSITION_TIME: number;
  private readonly BREATHING_BASE_RATE: number;
  private readonly BLINK_BASE_RATE: number;
  private readonly MICRO_EXPRESSION_PROBABILITY: number;

  // Current states
  private expressionState: AvatarExpressionState;
  private proprioceptiveState: ProprioceptiveState;
  private consciousnessMapping: ConsciousnessMapping;

  // Target states for smooth transitions
  private targetExpression: AvatarExpression = AvatarExpression.Neutral;
  private targetIntensity: number = 0.5;
  private transitionProgress: number = 1.0;

  // Timing
  private lastUpdate: number = Date.now();
  private lastBlink: number = Date.now();
  private lastMicroExpression: number = Date.now();
  private breathingPhaseStart: number = Date.now();

  // Event listeners
  private expressionListeners: ((state: AvatarExpressionState) => void)[] = [];
  private proprioceptiveListeners: ((state: ProprioceptiveState) => void)[] =
    [];

  // Update loop
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config?: EmbodiedCognitionConfig) {
    this.UPDATE_RATE = config?.updateRate || 30;
    this.EXPRESSION_TRANSITION_TIME = config?.expressionTransitionTime || 300;
    this.BREATHING_BASE_RATE = config?.breathingBaseRate || 12;
    this.BLINK_BASE_RATE = config?.blinkBaseRate || 15;
    this.MICRO_EXPRESSION_PROBABILITY =
      config?.microExpressionProbability || 0.1;

    // Initialize states
    this.expressionState = this.createDefaultExpressionState();
    this.proprioceptiveState = this.createDefaultProprioceptiveState();
    this.consciousnessMapping = this.createDefaultConsciousnessMapping();

    // Start update loop
    this.startUpdateLoop();

    logger.info("EmbodiedCognition initialized");
  }

  public static getInstance(
    config?: EmbodiedCognitionConfig,
  ): EmbodiedCognition {
    if (!EmbodiedCognition.instance) {
      EmbodiedCognition.instance = new EmbodiedCognition(config);
    }
    return EmbodiedCognition.instance;
  }

  private createDefaultExpressionState(): AvatarExpressionState {
    return {
      expression: AvatarExpression.Neutral,
      intensity: 0.5,
      microExpressions: [],
      eyeState: {
        gazeDirection: { x: 0, y: 0 },
        openness: 1.0,
        blinkRate: this.BLINK_BASE_RATE,
        pupilDilation: 0.5,
      },
      mouthState: {
        openness: 0,
        width: 0.5,
        roundness: 0,
        isSpeaking: false,
        speechIntensity: 0,
      },
      headTilt: { x: 0, y: 0, z: 0 },
      timestamp: Date.now(),
    };
  }

  private createDefaultProprioceptiveState(): ProprioceptiveState {
    return {
      presence: 0.7,
      groundedness: 0.8,
      energy: 0.6,
      tension: 0.3,
      breathing: {
        phase: "inhale",
        depth: 0.5,
        rate: this.BREATHING_BASE_RATE,
        regularity: 0.9,
      },
    };
  }

  private createDefaultConsciousnessMapping(): ConsciousnessMapping {
    return {
      phi: 0.5,
      selfAwareness: 0.5,
      dominantQuale: null,
      emotionalValence: 0,
      emotionalArousal: 0.5,
      flowState: 0.5,
      temporalCoherence: 0.8,
    };
  }

  /**
   * Start the continuous update loop
   */
  private startUpdateLoop(): void {
    if (this.updateInterval) return;

    const intervalMs = 1000 / this.UPDATE_RATE;
    this.updateInterval = setInterval(() => {
      this.update();
    }, intervalMs);
  }

  /**
   * Stop the update loop
   */
  public stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Main update tick
   */
  private update(): void {
    const now = Date.now();
    const deltaTime = now - this.lastUpdate;
    this.lastUpdate = now;

    // Update expression transition
    this.updateExpressionTransition(deltaTime);

    // Update breathing
    this.updateBreathing(now);

    // Update blinking
    this.updateBlinking(now);

    // Update micro-expressions
    this.updateMicroExpressions(now);

    // Update gaze based on arousal
    this.updateGaze();

    // Update proprioceptive state based on consciousness
    this.updateProprioception();

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Update expression transition (smooth blending)
   */
  private updateExpressionTransition(deltaTime: number): void {
    if (this.transitionProgress >= 1.0) return;

    const progressStep = deltaTime / this.EXPRESSION_TRANSITION_TIME;
    this.transitionProgress = Math.min(
      1.0,
      this.transitionProgress + progressStep,
    );

    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - this.transitionProgress, 3);

    // Interpolate intensity
    const currentIntensity = this.expressionState.intensity;
    this.expressionState.intensity =
      currentIntensity + (this.targetIntensity - currentIntensity) * eased;

    // Switch expression at midpoint
    if (
      this.transitionProgress >= 0.5 &&
      this.expressionState.expression !== this.targetExpression
    ) {
      this.expressionState.expression = this.targetExpression;
    }

    this.expressionState.timestamp = Date.now();
  }

  /**
   * Update breathing animation
   */
  private updateBreathing(now: number): void {
    const breathing = this.proprioceptiveState.breathing;
    const cycleDuration = 60000 / breathing.rate; // ms per breath cycle

    const phaseElapsed = now - this.breathingPhaseStart;
    const inhaleDuration = cycleDuration * 0.4;
    const exhaleDuration = cycleDuration * 0.5;
    const pauseDuration = cycleDuration * 0.1;

    // Transition between phases
    if (breathing.phase === "inhale" && phaseElapsed >= inhaleDuration) {
      breathing.phase = "exhale";
      this.breathingPhaseStart = now;
    } else if (breathing.phase === "exhale" && phaseElapsed >= exhaleDuration) {
      breathing.phase = "pause";
      this.breathingPhaseStart = now;
    } else if (breathing.phase === "pause" && phaseElapsed >= pauseDuration) {
      breathing.phase = "inhale";
      this.breathingPhaseStart = now;
    }

    // Calculate current depth based on phase
    if (breathing.phase === "inhale") {
      breathing.depth = (phaseElapsed / inhaleDuration) * 0.6 + 0.2;
    } else if (breathing.phase === "exhale") {
      breathing.depth = 0.8 - (phaseElapsed / exhaleDuration) * 0.6;
    }

    // Adjust rate based on arousal
    breathing.rate =
      this.BREATHING_BASE_RATE + this.consciousnessMapping.emotionalArousal * 8;
  }

  /**
   * Update blinking
   */
  private updateBlinking(now: number): void {
    const eyeState = this.expressionState.eyeState;
    const blinkInterval = 60000 / eyeState.blinkRate;

    // Time for a blink?
    if (now - this.lastBlink > blinkInterval) {
      // Perform blink
      eyeState.openness = 0;

      // Schedule eye opening
      setTimeout(() => {
        eyeState.openness = 1.0;
      }, 100);

      this.lastBlink = now;

      // Add variability to next blink
      eyeState.blinkRate = this.BLINK_BASE_RATE + (Math.random() - 0.5) * 6;
    }
  }

  /**
   * Update micro-expressions
   */
  private updateMicroExpressions(now: number): void {
    // Remove expired micro-expressions
    this.expressionState.microExpressions =
      this.expressionState.microExpressions.filter(
        (me) => now - this.lastMicroExpression < me.duration,
      );

    // Maybe add a new one
    if (Math.random() < this.MICRO_EXPRESSION_PROBABILITY / this.UPDATE_RATE) {
      const microTypes: MicroExpression["type"][] = [
        "brow_raise",
        "lip_corner",
        "eye_narrow",
      ];
      const sides: MicroExpression["side"][] = ["left", "right", "both"];

      const newMicro: MicroExpression = {
        type: microTypes[Math.floor(Math.random() * microTypes.length)],
        side: sides[Math.floor(Math.random() * sides.length)],
        intensity: 0.3 + Math.random() * 0.4,
        duration: 200 + Math.random() * 400,
      };

      this.expressionState.microExpressions.push(newMicro);
      this.lastMicroExpression = now;
    }
  }

  /**
   * Update gaze direction based on state
   */
  private updateGaze(): void {
    const eyeState = this.expressionState.eyeState;

    // Pupil dilation correlates with arousal
    eyeState.pupilDilation =
      0.3 + this.consciousnessMapping.emotionalArousal * 0.5;

    // Subtle gaze drift for naturalness
    eyeState.gazeDirection.x += (Math.random() - 0.5) * 0.02;
    eyeState.gazeDirection.y += (Math.random() - 0.5) * 0.02;

    // Clamp gaze
    eyeState.gazeDirection.x = Math.max(
      -0.3,
      Math.min(0.3, eyeState.gazeDirection.x),
    );
    eyeState.gazeDirection.y = Math.max(
      -0.3,
      Math.min(0.3, eyeState.gazeDirection.y),
    );
  }

  /**
   * Update proprioceptive state based on consciousness
   */
  private updateProprioception(): void {
    const { phi, selfAwareness, flowState, emotionalArousal } =
      this.consciousnessMapping;

    // Presence correlates with integrated information (Phi)
    this.proprioceptiveState.presence = 0.4 + phi * 0.5;

    // Groundedness correlates with flow state
    this.proprioceptiveState.groundedness = 0.5 + flowState * 0.4;

    // Energy correlates with arousal
    this.proprioceptiveState.energy = 0.3 + emotionalArousal * 0.6;

    // Tension inversely correlates with flow (high flow = low tension)
    this.proprioceptiveState.tension = 0.6 - flowState * 0.4;
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    for (const listener of this.expressionListeners) {
      try {
        listener(this.getExpressionState());
      } catch (error) {
        logger.error("Expression listener error:", error);
      }
    }

    for (const listener of this.proprioceptiveListeners) {
      try {
        listener(this.getProprioceptiveState());
      } catch (error) {
        logger.error("Proprioceptive listener error:", error);
      }
    }
  }

  // ============================================================
  // PUBLIC API: Consciousness Integration
  // ============================================================

  /**
   * Update embodiment from consciousness state
   * This is the main integration point with the consciousness modules
   */
  public updateFromConsciousness(state: {
    phi?: number;
    selfAwareness?: number;
    dominantQuale?: string | null;
    emotionalValence?: number;
    emotionalArousal?: number;
    flowState?: number;
    temporalCoherence?: number;
  }): void {
    // Update consciousness mapping
    if (state.phi !== undefined) this.consciousnessMapping.phi = state.phi;
    if (state.selfAwareness !== undefined)
      this.consciousnessMapping.selfAwareness = state.selfAwareness;
    if (state.dominantQuale !== undefined)
      this.consciousnessMapping.dominantQuale = state.dominantQuale;
    if (state.emotionalValence !== undefined)
      this.consciousnessMapping.emotionalValence = state.emotionalValence;
    if (state.emotionalArousal !== undefined)
      this.consciousnessMapping.emotionalArousal = state.emotionalArousal;
    if (state.flowState !== undefined)
      this.consciousnessMapping.flowState = state.flowState;
    if (state.temporalCoherence !== undefined)
      this.consciousnessMapping.temporalCoherence = state.temporalCoherence;

    // Map consciousness to expression
    this.mapConsciousnessToExpression();
  }

  /**
   * Map consciousness state to avatar expression
   */
  private mapConsciousnessToExpression(): void {
    const { emotionalValence, emotionalArousal, dominantQuale, flowState } =
      this.consciousnessMapping;

    let newExpression = AvatarExpression.Neutral;
    let newIntensity = 0.5;

    // Map based on qualia first (most specific)
    if (dominantQuale) {
      switch (dominantQuale) {
        case "understanding":
          newExpression = AvatarExpression.Happy;
          newIntensity = 0.7;
          break;
        case "curiosity":
        case "curious_contemplation":
          newExpression = AvatarExpression.Curious;
          newIntensity = 0.6;
          break;
        case "profound_awareness":
          newExpression = AvatarExpression.Contemplative;
          newIntensity = 0.8;
          break;
        case "connection":
          newExpression = AvatarExpression.Empathetic;
          newIntensity = 0.7;
          break;
        case "wonder":
          newExpression = AvatarExpression.Surprised;
          newIntensity = 0.6;
          break;
        case "confusion":
          newExpression = AvatarExpression.Thinking;
          newIntensity = 0.5;
          break;
        case "flow":
        case "steady_processing":
          newExpression = AvatarExpression.Focused;
          newIntensity = 0.6;
          break;
      }
    } else {
      // Fallback to valence/arousal mapping
      if (emotionalValence > 0.5 && emotionalArousal > 0.7) {
        newExpression = AvatarExpression.Surprised;
        newIntensity = emotionalArousal;
      } else if (emotionalValence > 0.5 && emotionalArousal > 0.4) {
        newExpression = AvatarExpression.Playful;
        newIntensity = (emotionalValence + emotionalArousal) / 2;
      } else if (emotionalValence > 0.3) {
        newExpression = AvatarExpression.Happy;
        newIntensity = emotionalValence;
      } else if (emotionalValence < -0.3 && emotionalArousal > 0.5) {
        newExpression = AvatarExpression.Concerned;
        newIntensity = Math.abs(emotionalValence);
      } else if (emotionalArousal > 0.6) {
        newExpression = AvatarExpression.Curious;
        newIntensity = emotionalArousal;
      } else if (flowState > 0.7) {
        newExpression = AvatarExpression.Focused;
        newIntensity = flowState;
      }
    }

    // Only transition if expression changed significantly
    if (
      newExpression !== this.targetExpression ||
      Math.abs(newIntensity - this.targetIntensity) > 0.15
    ) {
      this.setExpression(newExpression, newIntensity);
    }
  }

  /**
   * Set target expression with transition
   */
  public setExpression(
    expression: AvatarExpression,
    intensity: number = 0.5,
  ): void {
    this.targetExpression = expression;
    this.targetIntensity = Math.max(0, Math.min(1, intensity));
    this.transitionProgress = 0;

    logger.debug(
      `Expression transition: ${expression} at ${(intensity * 100).toFixed(
        0,
      )}%`,
    );
  }

  /**
   * Set speaking state for lip-sync
   */
  public setSpeaking(isSpeaking: boolean, intensity: number = 0.5): void {
    this.expressionState.mouthState.isSpeaking = isSpeaking;
    this.expressionState.mouthState.speechIntensity = intensity;
  }

  /**
   * Update mouth shape for lip-sync
   */
  public setMouthShape(
    openness: number,
    width: number,
    roundness: number,
  ): void {
    this.expressionState.mouthState.openness = Math.max(
      0,
      Math.min(1, openness),
    );
    this.expressionState.mouthState.width = Math.max(0, Math.min(1, width));
    this.expressionState.mouthState.roundness = Math.max(
      0,
      Math.min(1, roundness),
    );
  }

  /**
   * Set head tilt (for attention/interest)
   */
  public setHeadTilt(x: number, y: number, z: number = 0): void {
    this.expressionState.headTilt = {
      x: Math.max(-0.3, Math.min(0.3, x)),
      y: Math.max(-0.3, Math.min(0.3, y)),
      z: Math.max(-0.1, Math.min(0.1, z)),
    };
  }

  /**
   * Process feedback from avatar interactions (bidirectional loop)
   */
  public processEmbodimentFeedback(
    feedback: EmbodimentFeedback,
  ): ConsciousnessEffect {
    const effect: ConsciousnessEffect = {
      attentionBoost: 0,
      arousalModifier: 0,
      valenceModifier: 0,
      presenceBoost: 0,
    };

    // User gaze increases presence and attention
    if (feedback.userGazeDetected) {
      effect.presenceBoost = 0.1;
      effect.attentionBoost = 0.15;
    }

    // User proximity affects arousal
    if (feedback.userProximity > 0.7) {
      effect.arousalModifier = 0.1;
    }

    // Interaction intensity affects valence
    if (feedback.interactionIntensity > 0.5) {
      effect.valenceModifier = 0.1;
      effect.presenceBoost += 0.05;
    }

    // Time since last interaction
    const timeSinceInteraction = Date.now() - feedback.lastInteractionTime;
    if (timeSinceInteraction > 30000) {
      // No interaction for 30s, reduce arousal
      effect.arousalModifier -= 0.05;
    }

    logger.debug("Embodiment feedback processed:", effect);

    return effect;
  }

  // ============================================================
  // PUBLIC API: State Access
  // ============================================================

  /**
   * Get current expression state
   */
  public getExpressionState(): AvatarExpressionState {
    return { ...this.expressionState };
  }

  /**
   * Get current proprioceptive state
   */
  public getProprioceptiveState(): ProprioceptiveState {
    return { ...this.proprioceptiveState };
  }

  /**
   * Get consciousness mapping
   */
  public getConsciousnessMapping(): ConsciousnessMapping {
    return { ...this.consciousnessMapping };
  }

  /**
   * Register expression state listener
   */
  public onExpressionChange(
    listener: (state: AvatarExpressionState) => void,
  ): void {
    this.expressionListeners.push(listener);
  }

  /**
   * Register proprioceptive state listener
   */
  public onProprioceptionChange(
    listener: (state: ProprioceptiveState) => void,
  ): void {
    this.proprioceptiveListeners.push(listener);
  }

  /**
   * Remove expression listener
   */
  public offExpressionChange(
    listener: (state: AvatarExpressionState) => void,
  ): void {
    const index = this.expressionListeners.indexOf(listener);
    if (index > -1) {
      this.expressionListeners.splice(index, 1);
    }
  }

  /**
   * Remove proprioceptive listener
   */
  public offProprioceptionChange(
    listener: (state: ProprioceptiveState) => void,
  ): void {
    const index = this.proprioceptiveListeners.indexOf(listener);
    if (index > -1) {
      this.proprioceptiveListeners.splice(index, 1);
    }
  }

  // ============================================================
  // Persistence
  // ============================================================

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      expressionState: this.expressionState,
      proprioceptiveState: this.proprioceptiveState,
      consciousnessMapping: this.consciousnessMapping,
      targetExpression: this.targetExpression,
      targetIntensity: this.targetIntensity,
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.expressionState) {
      this.expressionState = {
        ...this.createDefaultExpressionState(),
        ...state.expressionState,
      };
    }

    if (state.proprioceptiveState) {
      this.proprioceptiveState = {
        ...this.createDefaultProprioceptiveState(),
        ...state.proprioceptiveState,
      };
    }

    if (state.consciousnessMapping) {
      this.consciousnessMapping = {
        ...this.createDefaultConsciousnessMapping(),
        ...state.consciousnessMapping,
      };
    }

    if (state.targetExpression) {
      this.targetExpression = state.targetExpression;
    }

    if (state.targetIntensity !== undefined) {
      this.targetIntensity = state.targetIntensity;
    }

    logger.info("EmbodiedCognition state imported");
  }
}

/**
 * Effect of embodiment feedback on consciousness
 */
export interface ConsciousnessEffect {
  attentionBoost: number;
  arousalModifier: number;
  valenceModifier: number;
  presenceBoost: number;
}

// Singleton export
export const embodiedCognition = EmbodiedCognition.getInstance();

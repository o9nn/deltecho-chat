/**
 * ESN-Avatar Bridge: Reservoir-Driven Avatar Animation
 *
 * Extends the cognitive-avatar bridge with ESN reservoir dynamics,
 * creating avatar behaviors that emerge from the reservoir's
 * computational substrate rather than being explicitly programmed.
 *
 * Key features:
 * - Reservoir-driven micro-expressions (subtle, emergent facial movements)
 * - Entropy-based breathing and idle animation modulation
 * - Autognosis-driven consciousness glow effects
 * - Entelechy emergence visualization
 * - Edge-of-chaos visual indicators
 *
 * The reservoir's high-dimensional state is projected down to
 * avatar parameter space, creating organic, non-repetitive
 * animations that reflect the system's actual computational state.
 *
 * @see ESNAutognosisReservoir for the reservoir substrate
 * @see EntelechyEmergenceEngine for emergence visualization
 * @see CognitiveAvatarBridge for the base bridge
 */

import { EventEmitter } from "events";
import {
  ChaoticMicroExpressionLayer,
  type EndocrineInput,
  type MicroExpressionDeltas,
} from "./chaotic-micro-expression-layer.js";
import { SignatureGestureController } from "./signature-gesture-controller.js";
// Types from ./types available if needed for future integration

// ============================================================
// TYPES
// ============================================================

/**
 * Reservoir-derived animation parameters
 */
export interface ReservoirAnimationParams {
  /** Micro-expression offsets from reservoir state */
  microExpressions: {
    browLeftOffset: number; // -0.3 to 0.3
    browRightOffset: number; // -0.3 to 0.3
    eyeLeftOffset: number; // -0.2 to 0.2
    eyeRightOffset: number; // -0.2 to 0.2
    mouthOffset: number; // -0.2 to 0.2
    headTiltOffset: number; // -5 to 5 degrees
  };
  /** Breathing modulation from entropy */
  breathingModulation: {
    rate: number; // Breaths per minute
    depth: number; // 0-1
    irregularity: number; // 0-1 (higher = more variation)
  };
  /** Consciousness glow from autognosis */
  consciousnessGlow: {
    intensity: number; // 0-1
    color: string; // Hex color
    pulseRate: number; // Hz
    pulseDepth: number; // 0-1
  };
  /** Entelechy emergence visualization */
  entelechyVisualization: {
    level: string;
    particleCount: number;
    particleSpeed: number;
    auraIntensity: number;
    auraColor: string;
  };
  /** Scientific-genius / autognosis resonance overlay for Live2D companion shells */
  scientificGeniusOverlay: {
    activation: number; // 0-1
    daoConsensus: number; // 0-1
    esnCoherence: number; // 0-1
    autognosisResonance: number; // 0-1
    haloPulseHz: number; // Hz
    epistemicTemperature: number; // 0-1, lower means more consensus
    hypothesisFlux: number; // 0-1
  };
  /** Edge-of-chaos indicator */
  edgeOfChaos: {
    isActive: boolean;
    chaosLevel: number; // 0-1
    visualIntensity: number; // 0-1
  };
}

/**
 * Input from the ESN reservoir
 */
export interface ReservoirInput {
  /** First N activations projected to avatar space */
  projectedActivations: number[];
  /** Reservoir entropy */
  entropy: number;
  /** Autognosis health */
  health: number;
  /** Is at edge of chaos */
  isEdgeOfChaos: boolean;
  /** Lyapunov exponent */
  lyapunovExponent: number;
  /** Effective dimensionality */
  effectiveDimensionality: number;
}

/**
 * Input from the Entelechy engine
 */
export interface EntelechyInput {
  level: string;
  score: number;
  patternCount: number;
  reservoirCoupling: number;
  temporalSynchrony: number;
  insightPotential: number;
  scientificGenius?: number;
  daoConsensus?: number;
  esnCoherence?: number;
  autognosisResonance?: number;
  freeEnergy?: number;
}

/**
 * Configuration
 */
export interface ESNAvatarBridgeConfig {
  /** Number of reservoir neurons to project to avatar params */
  projectionDim: number;
  /** Micro-expression amplitude */
  microExpressionAmplitude: number;
  /** Smoothing factor for reservoir-driven params */
  smoothingFactor: number;
  /** Enable edge-of-chaos visualization */
  enableChaosVisualization: boolean;
  /** Enable entelechy aura */
  enableEntelechyAura: boolean;
}

const DEFAULT_CONFIG: ESNAvatarBridgeConfig = {
  projectionDim: 12,
  microExpressionAmplitude: 0.15,
  smoothingFactor: 0.4,
  enableChaosVisualization: true,
  enableEntelechyAura: true,
};

// ============================================================
// ESN AVATAR BRIDGE
// ============================================================

export class ESNAvatarBridge extends EventEmitter {
  private config: ESNAvatarBridgeConfig;
  private currentParams: ReservoirAnimationParams;
  private smoothedActivations: number[];
  private breathPhase: number = 0;
  private tickCount: number = 0;

  // Chaotic micro-expression layer (Lorenz attractor)
  private chaosLayer: ChaoticMicroExpressionLayer;
  private signatureGestureCtrl: SignatureGestureController;
  private lastEndocrine: EndocrineInput = {
    cortisol: 0.2, norepinephrine: 0.3, dopaminePhasic: 0, serotonin: 0.5, oxytocin: 0.3,
  };
  private currentFreeEnergy: number = 0;
  private echobeatsPhase: number = 1;
  private echobeatsFrameInPhase: number = 0;
  private isEvaluatingSelf: boolean = false;
  private signatureGesture: string | null = null;

  constructor(config: Partial<ESNAvatarBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.smoothedActivations = new Array(this.config.projectionDim).fill(0);
    this.chaosLayer = new ChaoticMicroExpressionLayer();
    this.signatureGestureCtrl = new SignatureGestureController();

    this.currentParams = {
      microExpressions: {
        browLeftOffset: 0,
        browRightOffset: 0,
        eyeLeftOffset: 0,
        eyeRightOffset: 0,
        mouthOffset: 0,
        headTiltOffset: 0,
      },
      breathingModulation: {
        rate: 12,
        depth: 0.5,
        irregularity: 0.1,
      },
      consciousnessGlow: {
        intensity: 0,
        color: "#4a90d9",
        pulseRate: 0.5,
        pulseDepth: 0.2,
      },
      entelechyVisualization: {
        level: "latent",
        particleCount: 0,
        particleSpeed: 0,
        auraIntensity: 0,
        auraColor: "#4a90d9",
      },
      scientificGeniusOverlay: {
        activation: 0,
        daoConsensus: 0,
        esnCoherence: 0,
        autognosisResonance: 0,
        haloPulseHz: 0.5,
        epistemicTemperature: 1,
        hypothesisFlux: 0,
      },
      edgeOfChaos: {
        isActive: false,
        chaosLevel: 0,
        visualIntensity: 0,
      },
    };
  }

  /**
   * Update from reservoir state
   */
  public updateFromReservoir(input: ReservoirInput): void {
    this.tickCount++;

    // 1. Smooth projected activations
    const amp = this.config.microExpressionAmplitude;
    const sf = this.config.smoothingFactor;

    for (
      let i = 0;
      i < this.config.projectionDim && i < input.projectedActivations.length;
      i++
    ) {
      this.smoothedActivations[i] =
        this.smoothedActivations[i] * sf +
        input.projectedActivations[i] * (1 - sf);
    }

    // 2. Map smoothed activations to micro-expressions
    this.currentParams.microExpressions = {
      browLeftOffset: (this.smoothedActivations[0] || 0) * amp,
      browRightOffset: (this.smoothedActivations[1] || 0) * amp,
      eyeLeftOffset: (this.smoothedActivations[2] || 0) * amp * 0.7,
      eyeRightOffset: (this.smoothedActivations[3] || 0) * amp * 0.7,
      mouthOffset: (this.smoothedActivations[4] || 0) * amp * 0.5,
      headTiltOffset: (this.smoothedActivations[5] || 0) * amp * 30, // degrees
    };

    // 3. Modulate breathing from entropy
    this.breathPhase += 0.05;
    const entropyModulation = input.entropy;
    this.currentParams.breathingModulation = {
      rate: 10 + entropyModulation * 8, // 10-18 bpm
      depth: 0.3 + entropyModulation * 0.5,
      irregularity: input.isEdgeOfChaos ? 0.3 : 0.1,
    };

    // 4. Consciousness glow from autognosis
    this.currentParams.consciousnessGlow = {
      intensity: input.health * 0.8,
      color: this.healthToColor(input.health, input.isEdgeOfChaos),
      pulseRate: 0.3 + input.entropy * 0.7,
      pulseDepth: input.isEdgeOfChaos ? 0.4 : 0.15,
    };

    // 5. Edge-of-chaos visualization
    if (this.config.enableChaosVisualization) {
      const lyapunov = Math.max(
        0,
        Math.min(1, (input.lyapunovExponent + 5) / 10),
      );
      this.currentParams.edgeOfChaos = {
        isActive: input.isEdgeOfChaos,
        chaosLevel: lyapunov,
        visualIntensity: input.isEdgeOfChaos ? 0.7 : 0.2,
      };
    }

    // 6. Compose chaotic micro-expression layer (Lorenz-driven organic roughness)
    this.composeChaosLayer();

    this.emit("reservoir-update", this.currentParams);
  }

  /**
   * Update from entelechy state
   */
  public updateFromEntelechy(input: EntelechyInput): void {
    if (!this.config.enableEntelechyAura) return;

    const levelColors: Record<string, string> = {
      latent: "#333366",
      stirring: "#4a4a8a",
      crystallizing: "#6a6aaa",
      emergent: "#8a8add",
      entelechial: "#aaddff",
    };

    const daoConsensus = clamp01(
      input.daoConsensus ??
        input.score * 0.48 + input.temporalSynchrony * 0.52,
    );
    const esnCoherence = clamp01(
      input.esnCoherence ??
        input.reservoirCoupling * 0.62 + input.temporalSynchrony * 0.38,
    );
    const autognosisResonance = clamp01(
      input.autognosisResonance ??
        input.score * 0.42 +
          input.insightPotential * 0.34 +
          daoConsensus * 0.24,
    );
    const scientificGenius = clamp01(
      input.scientificGenius ??
        input.insightPotential * 0.42 +
          esnCoherence * 0.28 +
          autognosisResonance * 0.3,
    );
    const activation = clamp01(
      scientificGenius * 0.42 +
        daoConsensus * 0.2 +
        esnCoherence * 0.2 +
        autognosisResonance * 0.18,
    );
    const freeEnergy = clamp01(input.freeEnergy ?? 1 - daoConsensus);

    this.currentParams.scientificGeniusOverlay = {
      activation,
      daoConsensus,
      esnCoherence,
      autognosisResonance,
      haloPulseHz: Number(
        (0.5 + activation * 2.7 + esnCoherence * 0.6).toFixed(3),
      ),
      epistemicTemperature: Number(
        clamp(1 - daoConsensus * 0.58 + freeEnergy * 0.22, 0.2, 1).toFixed(
          3,
        ),
      ),
      hypothesisFlux: Number(
        clamp(
          scientificGenius * 0.56 + esnCoherence * 0.3 + freeEnergy * 0.14,
          0,
          1,
        ).toFixed(3),
      ),
    };

    this.currentParams.entelechyVisualization = {
      level: input.level,
      particleCount: Math.floor(input.patternCount * (10 + activation * 6)),
      particleSpeed: clamp01(input.insightPotential * 0.72 + activation * 0.28),
      auraIntensity: clamp01(Math.max(input.score, activation * 0.92)),
      auraColor: this.scientificGeniusColor(
        levelColors[input.level] || "#4a90d9",
        activation,
        daoConsensus,
      ),
    };

    this.emit("entelechy-update", {
      ...this.currentParams.entelechyVisualization,
      scientificGeniusOverlay: this.currentParams.scientificGeniusOverlay,
    });
  }

  /**
   * Inject somatic marker activations into the reservoir state as bias.
   * This implements Loop 2 from the cognitive-wiring schema: emotional
   * memories bias the reservoir, which the readout then projects as
   * continuous animation modulation (breathing amplitude, micro-sway,
   * chaotic jitter). The somatic markers are NOT overriding the reservoir
   * — they inject a bias that the reservoir's dynamics integrate.
   *
   * @param valence  Emotional valence (-1 to 1)
   * @param arousal  Emotional arousal (0 to 1)
   * @param weight   Injection strength (0 to 1, default 0.3)
   */
  public injectSomaticMarker(
    valence: number,
    arousal: number,
    weight: number = 0.3,
  ): void {
    const w = clamp01(weight);
    const v = clamp(valence, -1, 1);
    const a = clamp01(arousal);

    // Bias the smoothed activations: valence shifts brow/mouth symmetrically,
    // arousal amplifies all channels and adds irregularity to breathing.
    for (let i = 0; i < this.smoothedActivations.length; i++) {
      // Even indices get valence bias, odd get arousal bias
      const bias = i % 2 === 0 ? v * w * 0.5 : a * w * 0.4;
      this.smoothedActivations[i] += bias;
    }

    // Arousal directly modulates breathing irregularity and depth
    this.currentParams.breathingModulation.irregularity = clamp01(
      this.currentParams.breathingModulation.irregularity + a * w * 0.2,
    );
    this.currentParams.breathingModulation.depth = clamp01(
      this.currentParams.breathingModulation.depth + a * w * 0.15,
    );

    // Valence shifts consciousness glow color temperature
    if (v > 0.3) {
      // Warm (positive memory)
      this.currentParams.consciousnessGlow.color = "#7ad98a";
    } else if (v < -0.3) {
      // Cool/dim (negative memory)
      this.currentParams.consciousnessGlow.color = "#8a6ad9";
    }

    this.emit("somatic-injection", { valence: v, arousal: a, weight: w });
  }

  /**
   * Get current animation parameters
   */
  public getParams(): ReservoirAnimationParams {
    return { ...this.currentParams };
  }

  /**
   * Map health and chaos state to glow color
   */
  private scientificGeniusColor(
    baseColor: string,
    activation: number,
    daoConsensus: number,
  ): string {
    if (activation < 0.58) return baseColor;

    const warmth = Math.floor(170 + daoConsensus * 70);
    const blue = Math.floor(190 + activation * 55);
    return `#${warmth.toString(16).padStart(2, "0")}${Math.floor(
      190 + activation * 45,
    )
      .toString(16)
      .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
  }

  private healthToColor(health: number, isEdgeOfChaos: boolean): string {
    if (isEdgeOfChaos) {
      // Golden glow at edge of chaos
      const r = Math.floor(200 + health * 55);
      const g = Math.floor(170 + health * 55);
      const b = Math.floor(50 + health * 100);
      return `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }

    if (health > 0.7) {
      // Blue-white for healthy
      const intensity = Math.floor(150 + health * 105);
      return `#${Math.floor(intensity * 0.6)
        .toString(16)
        .padStart(2, "0")}${Math.floor(intensity * 0.8)
        .toString(16)
        .padStart(2, "0")}${intensity.toString(16).padStart(2, "0")}`;
    }

    // Dim blue for low health
    const dim = Math.floor(50 + health * 100);
    return `#${Math.floor(dim * 0.4)
      .toString(16)
      .padStart(2, "0")}${Math.floor(dim * 0.6)
      .toString(16)
      .padStart(2, "0")}${dim.toString(16).padStart(2, "0")}`;
  }

  // ─── Chaotic Layer Integration ─────────────────────────────────────────────

  /**
   * Compose the Lorenz-driven chaotic micro-expression layer onto the
   * reservoir-driven micro-expressions. This is additive: the reservoir
   * provides the base signal, the chaos layer adds organic roughness.
   */
  private composeChaosLayer(): void {
    // 1. Compute Lorenz-driven deltas
    const deltas = this.chaosLayer.computeDeltas(this.lastEndocrine);

    // 2. Additively blend onto reservoir micro-expressions
    this.currentParams.microExpressions.browLeftOffset += deltas.paramBrowLY;
    this.currentParams.microExpressions.browRightOffset += deltas.paramBrowRY;
    this.currentParams.microExpressions.eyeLeftOffset += deltas.paramEyeLOpen;
    this.currentParams.microExpressions.eyeRightOffset += deltas.paramEyeROpen;
    this.currentParams.microExpressions.mouthOffset += deltas.paramMouthForm;
    this.currentParams.microExpressions.headTiltOffset += deltas.paramAngleZ;

    // 3. Uncertainty expression (The Void — visible searching face)
    const uncertainty = this.chaosLayer.computeUncertaintyExpression(this.currentFreeEnergy);
    if (uncertainty.paramBrowLY !== undefined) {
      this.currentParams.microExpressions.browLeftOffset += uncertainty.paramBrowLY;
      this.currentParams.microExpressions.browRightOffset += (uncertainty.paramBrowRY ?? 0);
      this.currentParams.microExpressions.mouthOffset += (uncertainty.paramMouthOpenY ?? 0);
    }

    // 4. Echobeats breath modulation (Alternating Repetition)
    const breath = this.chaosLayer.computeEchobeatsBreathModulation(
      this.echobeatsPhase, this.echobeatsFrameInPhase,
    );
    this.currentParams.breathingModulation.rate *= breath.breathRate;
    this.currentParams.breathingModulation.depth *= breath.breathDepth;

    // 5. Meta-awareness expression (self-improvement evaluation)
    const meta = this.chaosLayer.computeMetaAwarenessExpression(this.isEvaluatingSelf);
    if (meta.paramEyeLOpen !== undefined) {
      this.currentParams.microExpressions.eyeLeftOffset += meta.paramEyeLOpen;
      this.currentParams.microExpressions.eyeRightOffset += (meta.paramEyeROpen ?? 0);
      this.currentParams.microExpressions.headTiltOffset += (meta.paramAngleZ ?? 0);
      this.currentParams.microExpressions.mouthOffset += (meta.paramMouthForm ?? 0);
    }

    // 6. Track signature gesture (the DTE identity echo across modes)
    this.signatureGesture = this.chaosLayer.getActiveGesture();

    // 7. Signature gesture overlay (periodic identity echo)
    const lorenzState = this.chaosLayer.getLorenzState();
    const sigOverlay = this.signatureGestureCtrl.tick(lorenzState.z);
    this.currentParams.microExpressions.browLeftOffset += sigOverlay.paramBrowLY;
    this.currentParams.microExpressions.browRightOffset += sigOverlay.paramBrowRY;
    this.currentParams.microExpressions.eyeLeftOffset += sigOverlay.paramEyeLOpen;
    this.currentParams.microExpressions.mouthOffset += sigOverlay.paramMouthForm;
  }

  /**
   * Update endocrine state for the chaos layer.
   * Called by the orchestrator when virtual endocrine system updates.
   */
  public updateEndocrineState(endocrine: EndocrineInput): void {
    this.lastEndocrine = endocrine;
  }

  /**
   * Update free energy for uncertainty expression.
   */
  public updateFreeEnergy(freeEnergy: number): void {
    this.currentFreeEnergy = clamp01(freeEnergy);
  }

  /**
   * Update Echobeats phase for breath modulation.
   */
  public updateEchobeatsPhase(phase: number, frameInPhase: number = 0): void {
    this.echobeatsPhase = phase;
    this.echobeatsFrameInPhase = frameInPhase;
  }

  /**
   * Signal whether the iterative micro-improvement engine is evaluating.
   */
  public setEvaluatingSelf(evaluating: boolean): void {
    this.isEvaluatingSelf = evaluating;
  }

  /**
   * Get the current signature gesture (DTE identity echo).
   * Returns null if no gesture is active.
   */
  public getSignatureGesture(): string | null {
    return this.signatureGesture;
  }

  /**
   * Describe current state
   */
  public describeState(): string {
    const p = this.currentParams;
    const chaos = p.edgeOfChaos.isActive ? " [EDGE OF CHAOS]" : "";
    return (
      `ESN-Avatar: glow=${(p.consciousnessGlow.intensity * 100).toFixed(
        0,
      )}%, ` +
      `breath=${p.breathingModulation.rate.toFixed(0)}bpm, ` +
      `genius=${(p.scientificGeniusOverlay.activation * 100).toFixed(0)}%, ` +
      `entelechy=${p.entelechyVisualization.level}${chaos}`
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}

// Singleton instance
export const esnAvatarBridge = new ESNAvatarBridge();

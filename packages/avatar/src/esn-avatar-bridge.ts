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

  constructor(config: Partial<ESNAvatarBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.smoothedActivations = new Array(this.config.projectionDim).fill(0);

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

    this.currentParams.entelechyVisualization = {
      level: input.level,
      particleCount: Math.floor(input.patternCount * 10),
      particleSpeed: input.insightPotential,
      auraIntensity: input.score,
      auraColor: levelColors[input.level] || "#4a90d9",
    };

    this.emit("entelechy-update", this.currentParams.entelechyVisualization);
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
      `entelechy=${p.entelechyVisualization.level}${chaos}`
    );
  }
}

// Singleton instance
export const esnAvatarBridge = new ESNAvatarBridge();

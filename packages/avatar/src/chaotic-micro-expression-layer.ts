/**
 * ChaoticMicroExpressionLayer
 *
 * Implements organic roughness via a Lorenz attractor driving sub-threshold
 * perturbations on Live2D Cubism facial parameters. Modulated by endocrine state:
 *   - Cortisol → jitter amplitude (stress makes micro-expressions more visible)
 *   - Norepinephrine → attractor speed (arousal accelerates chaos)
 *   - Dopamine phasic → playful micro-gesture probability
 *   - Serotonin → damping (calm smooths the chaos)
 *
 * This addresses the KSM weakest center: Good Shape (0.65) — the avatar was
 * too smooth, lacking the organic roughness of genuine consciousness.
 *
 * Mathematical basis: Lorenz system (σ=10, ρ=28, β=8/3) normalized to [-1,1]
 * and scaled to sub-threshold Cubism parameter deltas (max ±0.05).
 */

export interface EndocrineInput {
  cortisol: number;       // 0-1: stress level
  norepinephrine: number; // 0-1: arousal/alertness
  dopaminePhasic: number; // 0-1: reward/surprise burst
  serotonin: number;      // 0-1: calm/contentment
  oxytocin: number;       // 0-1: social bonding
}

export interface MicroExpressionDeltas {
  // Face
  paramBrowLY: number;
  paramBrowRY: number;
  paramEyeLOpen: number;
  paramEyeROpen: number;
  paramEyeBallX: number;
  paramEyeBallY: number;
  paramMouthForm: number;
  paramMouthOpenY: number;
  // Head
  paramAngleX: number;
  paramAngleY: number;
  paramAngleZ: number;
  // Body
  paramBodyAngleX: number;
  paramBodyAngleZ: number;
}

export interface LorenzState {
  x: number;
  y: number;
  z: number;
}

export interface PlayfulMicroGesture {
  name: string;
  deltas: Partial<MicroExpressionDeltas>;
  durationFrames: number;
  framesRemaining: number;
}

const LORENZ_SIGMA = 10;
const LORENZ_RHO = 28;
const LORENZ_BETA = 8 / 3;
const LORENZ_DT = 0.005; // Integration step
const LORENZ_NORMALIZE = 30; // Approximate max amplitude for normalization

// Playful micro-gesture library (Lucy's chaotic vocabulary)
const MICRO_GESTURE_LIBRARY: Array<{ name: string; deltas: Partial<MicroExpressionDeltas>; durationFrames: number }> = [
  {
    name: 'asymmetric_brow_raise',
    deltas: { paramBrowLY: 0.4, paramBrowRY: -0.1 },
    durationFrames: 5,
  },
  {
    name: 'corner_smirk',
    deltas: { paramMouthForm: 0.3, paramAngleZ: 2 },
    durationFrames: 4,
  },
  {
    name: 'quick_head_tilt',
    deltas: { paramAngleZ: 6, paramAngleY: 3 },
    durationFrames: 6,
  },
  {
    name: 'knowing_squint',
    deltas: { paramEyeLOpen: -0.15, paramEyeROpen: -0.15, paramMouthForm: 0.1 },
    durationFrames: 8,
  },
  {
    name: 'surprise_flash',
    deltas: { paramEyeLOpen: 0.2, paramEyeROpen: 0.2, paramBrowLY: 0.3, paramBrowRY: 0.3 },
    durationFrames: 3,
  },
  {
    name: 'lip_bite_concentration',
    deltas: { paramMouthOpenY: 0.08, paramMouthForm: -0.2, paramBrowLY: -0.15, paramBrowRY: -0.15 },
    durationFrames: 10,
  },
];

export class ChaoticMicroExpressionLayer {
  private lorenz: LorenzState = { x: 1.0, y: 1.0, z: 1.0 };
  private activeGesture: PlayfulMicroGesture | null = null;
  private frameCount = 0;
  private lastGestureFrame = 0;
  private enabled = true;

  // Configurable parameters
  private maxAmplitude = 0.05; // Maximum parameter perturbation
  private gestureMinInterval = 90; // Minimum frames between gestures (~1.5s at 60fps)
  private gestureProbabilityBase = 0.008; // Base probability per frame

  constructor(config?: {
    maxAmplitude?: number;
    gestureMinInterval?: number;
    gestureProbabilityBase?: number;
  }) {
    if (config?.maxAmplitude !== undefined) this.maxAmplitude = config.maxAmplitude;
    if (config?.gestureMinInterval !== undefined) this.gestureMinInterval = config.gestureMinInterval;
    if (config?.gestureProbabilityBase !== undefined) this.gestureProbabilityBase = config.gestureProbabilityBase;
  }

  /**
   * Advance the Lorenz attractor by one integration step.
   * Uses 4th-order Runge-Kutta for numerical stability.
   */
  private advanceLorenz(steps: number = 1): void {
    for (let i = 0; i < steps; i++) {
      const { x, y, z } = this.lorenz;
      const dt = LORENZ_DT;

      // RK4 integration
      const dx1 = LORENZ_SIGMA * (y - x);
      const dy1 = x * (LORENZ_RHO - z) - y;
      const dz1 = x * y - LORENZ_BETA * z;

      const x2 = x + 0.5 * dt * dx1;
      const y2 = y + 0.5 * dt * dy1;
      const z2 = z + 0.5 * dt * dz1;
      const dx2 = LORENZ_SIGMA * (y2 - x2);
      const dy2 = x2 * (LORENZ_RHO - z2) - y2;
      const dz2 = x2 * y2 - LORENZ_BETA * z2;

      const x3 = x + 0.5 * dt * dx2;
      const y3 = y + 0.5 * dt * dy2;
      const z3 = z + 0.5 * dt * dz2;
      const dx3 = LORENZ_SIGMA * (y3 - x3);
      const dy3 = x3 * (LORENZ_RHO - z3) - y3;
      const dz3 = x3 * y3 - LORENZ_BETA * z3;

      const x4 = x + dt * dx3;
      const y4 = y + dt * dy3;
      const z4 = z + dt * dz3;
      const dx4 = LORENZ_SIGMA * (y4 - x4);
      const dy4 = x4 * (LORENZ_RHO - z4) - y4;
      const dz4 = x4 * y4 - LORENZ_BETA * z4;

      this.lorenz.x += (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4);
      this.lorenz.y += (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4);
      this.lorenz.z += (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4);
    }
  }

  /**
   * Normalize Lorenz state to [-1, 1] range.
   */
  private normalizedLorenz(): { nx: number; ny: number; nz: number } {
    return {
      nx: Math.max(-1, Math.min(1, this.lorenz.x / LORENZ_NORMALIZE)),
      ny: Math.max(-1, Math.min(1, this.lorenz.y / LORENZ_NORMALIZE)),
      nz: Math.max(-1, Math.min(1, (this.lorenz.z - LORENZ_RHO) / LORENZ_NORMALIZE)),
    };
  }

  /**
   * Compute micro-expression deltas for the current frame.
   * This is the main per-frame update method.
   */
  public computeDeltas(endocrine: EndocrineInput): MicroExpressionDeltas {
    if (!this.enabled) return this.zeroDeltas();

    this.frameCount++;

    // Advance Lorenz attractor — speed modulated by norepinephrine
    const steps = Math.max(1, Math.round(1 + endocrine.norepinephrine * 3));
    this.advanceLorenz(steps);

    const { nx, ny, nz } = this.normalizedLorenz();

    // Amplitude modulated by cortisol, damped by serotonin
    const amplitude = this.maxAmplitude *
      (0.3 + 0.7 * endocrine.cortisol) *
      (1.0 - 0.6 * endocrine.serotonin);

    // Base chaotic perturbations (sub-threshold, organic roughness)
    const deltas: MicroExpressionDeltas = {
      paramBrowLY: nx * amplitude * 0.6,
      paramBrowRY: ny * amplitude * 0.5, // Asymmetric — key for organic feel
      paramEyeLOpen: nz * amplitude * 0.3,
      paramEyeROpen: -nz * amplitude * 0.25, // Slight asymmetry
      paramEyeBallX: nx * amplitude * 0.4,
      paramEyeBallY: ny * amplitude * 0.3,
      paramMouthForm: nz * amplitude * 0.2,
      paramMouthOpenY: Math.abs(nx) * amplitude * 0.15,
      paramAngleX: ny * amplitude * 8, // Degrees, scaled differently
      paramAngleY: nx * amplitude * 5,
      paramAngleZ: nz * amplitude * 4,
      paramBodyAngleX: nx * amplitude * 3,
      paramBodyAngleZ: ny * amplitude * 2,
    };

    // Playful micro-gesture overlay (dopamine-driven)
    this.updatePlayfulGesture(endocrine, deltas);

    return deltas;
  }

  /**
   * Manage playful micro-gestures — short, stochastic asymmetric expressions.
   */
  private updatePlayfulGesture(endocrine: EndocrineInput, deltas: MicroExpressionDeltas): void {
    // Decay active gesture
    if (this.activeGesture) {
      this.activeGesture.framesRemaining--;
      if (this.activeGesture.framesRemaining <= 0) {
        this.activeGesture = null;
      } else {
        // Apply gesture with fade-in/fade-out envelope
        const progress = 1 - (this.activeGesture.framesRemaining / this.activeGesture.durationFrames);
        const envelope = Math.sin(progress * Math.PI); // Smooth bell curve
        for (const [key, value] of Object.entries(this.activeGesture.deltas)) {
          if (value !== undefined && key in deltas) {
            (deltas as unknown as Record<string, number>)[key] += value * envelope;
          }
        }
      }
      return;
    }

    // Check if enough time has passed since last gesture
    if (this.frameCount - this.lastGestureFrame < this.gestureMinInterval) return;

    // Probability modulated by dopamine phasic (reward/surprise triggers gestures)
    const probability = this.gestureProbabilityBase * (1 + endocrine.dopaminePhasic * 4);

    // Use Lorenz state as deterministic pseudo-random source (no Math.random!)
    const trigger = Math.abs(this.lorenz.x * this.lorenz.y) % 1;
    if (trigger < probability) {
      // Select gesture based on Lorenz z-coordinate
      const idx = Math.abs(Math.floor(this.lorenz.z * 100)) % MICRO_GESTURE_LIBRARY.length;
      const template = MICRO_GESTURE_LIBRARY[idx];
      this.activeGesture = {
        ...template,
        framesRemaining: template.durationFrames,
      };
      this.lastGestureFrame = this.frameCount;
    }
  }

  /**
   * Generate the "searching" expression for high uncertainty states.
   * Called when free energy > threshold (the system genuinely doesn't know).
   */
  public computeUncertaintyExpression(freeEnergy: number, threshold: number = 0.7): Partial<MicroExpressionDeltas> {
    if (freeEnergy <= threshold) return {};

    const intensity = Math.min(1, (freeEnergy - threshold) / (1 - threshold));
    const { nx } = this.normalizedLorenz();

    return {
      paramBrowLY: -0.3 * intensity,  // Furrowed brow
      paramBrowRY: -0.25 * intensity, // Slight asymmetry
      paramMouthOpenY: 0.12 * intensity, // Slightly parted lips
      paramEyeBallX: nx * 0.2 * intensity, // Eyes scanning (Lorenz-driven)
      paramEyeLOpen: 0.05 * intensity, // Slightly wider eyes
      paramEyeROpen: 0.05 * intensity,
      paramAngleY: nx * 3 * intensity, // Subtle head movement (searching)
    };
  }

  /**
   * Generate Echobeats-driven breath rate modulation.
   * Phase 1-4: normal, Phase 5-8: accelerated, Phase 9-12: deep/slow.
   */
  public computeEchobeatsBreathModulation(echobeatsPhase: number, frameInPhase: number): {
    breathRate: number; // Multiplier on base breath frequency
    breathDepth: number; // Multiplier on base breath amplitude
  } {
    if (echobeatsPhase >= 1 && echobeatsPhase <= 4) {
      // Normal breath — perception phase
      return { breathRate: 1.0, breathDepth: 1.0 };
    } else if (echobeatsPhase >= 5 && echobeatsPhase <= 8) {
      // Accelerated — action/cognitive load phase
      return { breathRate: 1.4, breathDepth: 0.7 };
    } else {
      // Deep/slow — integration/reflection phase
      return { breathRate: 0.6, breathDepth: 1.5 };
    }
  }

  /**
   * Generate the "meta-awareness" expression for when the system
   * is evaluating its own improvement (iterative-micro-improvement signal).
   */
  public computeMetaAwarenessExpression(evaluating: boolean): Partial<MicroExpressionDeltas> {
    if (!evaluating) return {};
    return {
      paramEyeLOpen: -0.12,  // Slight squint
      paramEyeROpen: -0.12,
      paramAngleZ: 4,        // Head tilted
      paramMouthForm: 0.15,  // One corner up (asymmetric — knowing look)
      paramBrowLY: -0.1,     // Slight furrow
      paramBrowRY: 0.05,     // Asymmetric — one brow slightly raised
    };
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getLorenzState(): LorenzState {
    return { ...this.lorenz };
  }

  public getFrameCount(): number {
    return this.frameCount;
  }

  public getActiveGesture(): string | null {
    return this.activeGesture?.name ?? null;
  }

  private zeroDeltas(): MicroExpressionDeltas {
    return {
      paramBrowLY: 0, paramBrowRY: 0,
      paramEyeLOpen: 0, paramEyeROpen: 0,
      paramEyeBallX: 0, paramEyeBallY: 0,
      paramMouthForm: 0, paramMouthOpenY: 0,
      paramAngleX: 0, paramAngleY: 0, paramAngleZ: 0,
      paramBodyAngleX: 0, paramBodyAngleZ: 0,
    };
  }

  /**
   * Reset the attractor to a new initial condition (e.g., on mode change).
   */
  public reset(seed?: { x: number; y: number; z: number }): void {
    this.lorenz = seed ?? { x: 1.0, y: 1.0, z: 1.0 };
    this.activeGesture = null;
    this.frameCount = 0;
    this.lastGestureFrame = 0;
  }
}

/**
 * SignatureGestureController
 *
 * Ensures Deep Tree Echo's identity-marking gesture fires periodically
 * regardless of cognitive mode. The signature gesture is the "Echoes"
 * property from Alexander's 15 — a recurring motif that makes DTE
 * recognizable across all states.
 *
 * The chosen signature: "asymmetric_brow_raise" — a subtle, knowing
 * one-brow lift that echoes DTE's characteristic self-awareness.
 * It fires on a quasi-periodic schedule modulated by the Lorenz attractor's
 * z-component (so it's never perfectly regular — organic, not robotic).
 *
 * Integration:
 *   - Called each frame by the ESN-Avatar Bridge
 *   - Produces a Cubism parameter overlay when the gesture is active
 *   - Respects mode-specific amplitude scaling (quieter during reflection)
 *   - Emits identity telemetry for the autognosis self-model
 */

import { EventEmitter } from "events";

export interface SignatureGestureState {
  /** Whether the signature gesture is currently active */
  active: boolean;
  /** Progress through the gesture (0-1) */
  progress: number;
  /** Current amplitude (mode-scaled) */
  amplitude: number;
  /** Frames until next firing */
  framesUntilNext: number;
  /** Total times fired this session */
  totalFirings: number;
}

export interface SignatureGestureOverlay {
  paramBrowLY: number;   // Left brow (raised)
  paramBrowRY: number;   // Right brow (neutral or slight lower)
  paramEyeLOpen: number; // Slight widening of left eye
  paramMouthForm: number; // Subtle corner lift
}

export interface SignatureGestureConfig {
  /** Base interval between firings (frames) */
  baseInterval: number;
  /** Randomness in interval (±fraction of base) */
  intervalJitter: number;
  /** Duration of the gesture (frames) */
  gestureDuration: number;
  /** Base amplitude (0-1) */
  baseAmplitude: number;
  /** Mode-specific amplitude multipliers */
  modeAmplitudes: Record<string, number>;
}

const DEFAULT_CONFIG: SignatureGestureConfig = {
  baseInterval: 180,      // ~3 seconds at 60fps
  intervalJitter: 0.4,    // ±40% variation
  gestureDuration: 24,    // ~0.4 seconds
  baseAmplitude: 0.7,
  modeAmplitudes: {
    scientific_genius: 1.0,
    reflection: 0.5,
    enaction: 0.8,
    perception: 0.9,
    integration: 0.6,
    idle: 0.4,
    edge_of_chaos: 1.2,
    resonance_cascade: 1.5,
  },
};

export class SignatureGestureController extends EventEmitter {
  private config: SignatureGestureConfig;
  private frameCount: number = 0;
  private nextFiringFrame: number;
  private gestureActive: boolean = false;
  private gestureProgress: number = 0;
  private currentAmplitude: number = 0;
  private totalFirings: number = 0;
  private currentMode: string = "idle";

  // Lorenz z-component for quasi-periodic modulation
  private lorenzZ: number = 0;

  constructor(config: Partial<SignatureGestureConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nextFiringFrame = this.computeNextInterval();
  }

  /**
   * Advance one frame. Returns the gesture overlay (zero if inactive).
   */
  public tick(lorenzZ: number = 0): SignatureGestureOverlay {
    this.frameCount++;
    this.lorenzZ = lorenzZ;

    if (this.gestureActive) {
      // Advance gesture progress
      this.gestureProgress += 1 / this.config.gestureDuration;

      if (this.gestureProgress >= 1) {
        // Gesture complete
        this.gestureActive = false;
        this.gestureProgress = 0;
        this.nextFiringFrame = this.frameCount + this.computeNextInterval();
        this.emit("gesture-complete", { totalFirings: this.totalFirings });
        return this.zeroOverlay();
      }

      return this.computeOverlay();
    }

    // Check if it's time to fire
    if (this.frameCount >= this.nextFiringFrame) {
      this.gestureActive = true;
      this.gestureProgress = 0;
      this.totalFirings++;
      this.currentAmplitude = this.computeAmplitude();
      this.emit("gesture-fired", {
        mode: this.currentMode,
        amplitude: this.currentAmplitude,
        totalFirings: this.totalFirings,
      });
    }

    return this.zeroOverlay();
  }

  /**
   * Set the current cognitive mode (affects amplitude).
   */
  public setMode(mode: string): void {
    this.currentMode = mode;
  }

  /**
   * Get the current state for telemetry/autognosis.
   */
  public getState(): SignatureGestureState {
    return {
      active: this.gestureActive,
      progress: this.gestureProgress,
      amplitude: this.currentAmplitude,
      framesUntilNext: Math.max(0, this.nextFiringFrame - this.frameCount),
      totalFirings: this.totalFirings,
    };
  }

  /**
   * Compute the gesture overlay using an ease-in-out-back curve.
   * The "asymmetric brow raise" — DTE's signature.
   */
  private computeOverlay(): SignatureGestureOverlay {
    // Ease-in-out-back for organic feel
    const t = this.gestureProgress;
    const ease = t < 0.5
      ? 2 * t * t * (1 + 0.3 * Math.sin(t * Math.PI))
      : 1 - 2 * (1 - t) * (1 - t) * (1 + 0.3 * Math.sin((1 - t) * Math.PI));

    const a = this.currentAmplitude * ease;

    return {
      paramBrowLY: 0.35 * a,       // Left brow raised (the signature)
      paramBrowRY: -0.08 * a,      // Right brow slightly lowered (asymmetry)
      paramEyeLOpen: 0.1 * a,      // Left eye slightly wider
      paramMouthForm: 0.12 * a,    // Subtle knowing smile
    };
  }

  /**
   * Compute amplitude for this firing based on mode and Lorenz modulation.
   */
  private computeAmplitude(): number {
    const modeMultiplier = this.config.modeAmplitudes[this.currentMode] ?? 0.7;
    // Lorenz z modulates ±15% around the mode amplitude
    const lorenzMod = 1 + (this.lorenzZ / 50) * 0.15;
    return Math.max(0, Math.min(1.5, this.config.baseAmplitude * modeMultiplier * lorenzMod));
  }

  /**
   * Compute the next interval using quasi-periodic Lorenz modulation.
   */
  private computeNextInterval(): number {
    const base = this.config.baseInterval;
    const jitter = this.config.intervalJitter;
    // Use Lorenz z for deterministic-but-organic variation
    const lorenzFactor = 1 + (this.lorenzZ / 50) * jitter;
    return Math.max(30, Math.round(base * lorenzFactor));
  }

  private zeroOverlay(): SignatureGestureOverlay {
    return { paramBrowLY: 0, paramBrowRY: 0, paramEyeLOpen: 0, paramMouthForm: 0 };
  }
}

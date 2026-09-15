/**
 * Emotional Inertia Controller for Deep Tree Echo Avatar
 *
 * Implements three critical missing avatar features:
 *
 * 1. **Emotional Inertia** — Exponential smoothing with variable time constants
 *    per emotion dimension. Prevents jarring jumps between emotional states by
 *    modeling emotional "mass" (some emotions are heavier/stickier than others).
 *
 * 2. **Cognitive Load → Animation Speed** — Modulates all animation playback
 *    rates based on cognitive load. High load = slower, more deliberate movements
 *    (like a person deep in thought). Low load = quicker, more responsive.
 *
 * 3. **Idle Fidget Micro-Behaviors** — Subtle, non-repetitive fidget patterns
 *    that emerge during low-activity states: head micro-sway, eye drift,
 *    blink clusters, finger/shoulder micro-tensions, and occasional sighs.
 *    Uses Perlin-like noise for organic timing.
 *
 * The controller sits between the cognitive state pipeline and the final
 * avatar parameter output, applying temporal filtering to all channels.
 *
 * @see CognitiveAvatarBridge for upstream cognitive state
 * @see ESNAvatarBridge for reservoir-driven parameters
 * @see IdleAnimationSystem for base idle behaviors (this extends them)
 */
import { EventEmitter } from "events";

// ============================================================
// TYPES
// ============================================================

/**
 * Per-dimension inertia configuration
 * Models how "heavy" each emotional dimension is
 */
export interface EmotionInertiaProfile {
  /** Time constant for rising (onset) in ms — how fast emotion builds */
  riseTimeMs: number;
  /** Time constant for falling (offset) in ms — how fast emotion decays */
  fallTimeMs: number;
  /** Minimum threshold below which emotion snaps to zero */
  deadzone: number;
  /** Maximum rate of change per frame (prevents teleporting) */
  maxDeltaPerFrame: number;
}

/**
 * Cognitive load animation speed mapping
 */
export interface CognitiveLoadSpeedConfig {
  /** Minimum speed multiplier at maximum cognitive load (0.3 = 30% speed) */
  minSpeedMultiplier: number;
  /** Maximum speed multiplier at zero cognitive load (1.5 = 150% speed) */
  maxSpeedMultiplier: number;
  /** How quickly speed adapts to load changes (0-1, higher = faster) */
  speedAdaptationRate: number;
  /** Cognitive load threshold above which "deep thought" mode activates */
  deepThoughtThreshold: number;
  /** Speed multiplier during deep thought mode */
  deepThoughtSpeed: number;
}

/**
 * Idle fidget behavior configuration
 */
export interface IdleFidgetConfig {
  /** Enable fidget behaviors */
  enabled: boolean;
  /** Seconds of inactivity before fidgets begin */
  activationDelaySec: number;
  /** Base intensity of fidgets (0-1) */
  baseIntensity: number;
  /** How much cognitive load suppresses fidgets (0-1) */
  loadSuppression: number;
  /** Probability of blink cluster per second during idle */
  blinkClusterProbability: number;
  /** Probability of micro-sigh per minute during idle */
  microSighProbability: number;
  /** Head micro-sway amplitude in degrees */
  headSwayAmplitude: number;
  /** Eye drift maximum offset */
  eyeDriftMaxOffset: number;
  /** Shoulder tension micro-movement amplitude */
  shoulderTensionAmplitude: number;
}

/**
 * Full configuration for the Emotional Inertia Controller
 */
export interface EmotionalInertiaConfig {
  /** Per-emotion inertia profiles */
  emotionProfiles: Record<string, EmotionInertiaProfile>;
  /** Cognitive load speed mapping */
  cognitiveLoadSpeed: CognitiveLoadSpeedConfig;
  /** Idle fidget configuration */
  idleFidget: IdleFidgetConfig;
  /** Frame rate for internal tick (Hz) */
  tickRateHz: number;
  /** Global inertia multiplier (scales all time constants) */
  globalInertiaMult: number;
}

/**
 * Output deltas from the inertia controller
 */
export interface InertiaOutput {
  /** Smoothed emotion values after inertia filtering */
  smoothedEmotions: Record<string, number>;
  /** Current animation speed multiplier */
  animationSpeedMultiplier: number;
  /** Whether deep thought mode is active */
  isDeepThought: boolean;
  /** Fidget overlay deltas */
  fidgetDeltas: FidgetDeltas;
  /** Current cognitive load (for downstream consumers) */
  cognitiveLoad: number;
  /** Seconds since last significant input */
  idleDurationSec: number;
}

/**
 * Fidget micro-behavior deltas applied to avatar parameters
 */
export interface FidgetDeltas {
  /** Head angle X micro-sway (degrees) */
  headAngleX: number;
  /** Head angle Y micro-sway (degrees) */
  headAngleY: number;
  /** Head angle Z micro-tilt (degrees) */
  headAngleZ: number;
  /** Eye X drift offset (-1 to 1) */
  eyeDriftX: number;
  /** Eye Y drift offset (-1 to 1) */
  eyeDriftY: number;
  /** Blink cluster trigger (0 = none, 1 = single, 2 = double, 3 = triple) */
  blinkCluster: number;
  /** Shoulder/body tension micro-offset */
  bodyTensionY: number;
  /** Breathing depth modulation from sighs */
  sighDepthBoost: number;
  /** Mouth micro-movement (subtle lip press/release) */
  mouthMicroMovement: number;
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

/** Default inertia profiles per emotion dimension */
const DEFAULT_EMOTION_PROFILES: Record<string, EmotionInertiaProfile> = {
  // Joy rises moderately, falls slowly (happiness lingers)
  joy: {
    riseTimeMs: 400,
    fallTimeMs: 1200,
    deadzone: 0.02,
    maxDeltaPerFrame: 0.08,
  },
  // Interest rises fast (attention snaps), falls moderately
  interest: {
    riseTimeMs: 200,
    fallTimeMs: 600,
    deadzone: 0.02,
    maxDeltaPerFrame: 0.12,
  },
  // Surprise rises instantly, falls fast (brief startle)
  surprise: {
    riseTimeMs: 80,
    fallTimeMs: 300,
    deadzone: 0.03,
    maxDeltaPerFrame: 0.25,
  },
  // Sadness rises slowly (builds), falls very slowly (lingers long)
  sadness: {
    riseTimeMs: 800,
    fallTimeMs: 2500,
    deadzone: 0.02,
    maxDeltaPerFrame: 0.04,
  },
  // Anger rises moderately, falls slowly (hard to let go)
  anger: {
    riseTimeMs: 350,
    fallTimeMs: 1800,
    deadzone: 0.02,
    maxDeltaPerFrame: 0.06,
  },
  // Fear rises fast (survival), falls moderately
  fear: {
    riseTimeMs: 150,
    fallTimeMs: 800,
    deadzone: 0.02,
    maxDeltaPerFrame: 0.15,
  },
  // Disgust rises fast, falls moderately
  disgust: {
    riseTimeMs: 200,
    fallTimeMs: 700,
    deadzone: 0.02,
    maxDeltaPerFrame: 0.1,
  },
  // Contempt rises slowly, falls very slowly (deep-seated)
  contempt: {
    riseTimeMs: 600,
    fallTimeMs: 2000,
    deadzone: 0.02,
    maxDeltaPerFrame: 0.04,
  },
};

export const DEFAULT_EMOTIONAL_INERTIA_CONFIG: EmotionalInertiaConfig = {
  emotionProfiles: DEFAULT_EMOTION_PROFILES,
  cognitiveLoadSpeed: {
    minSpeedMultiplier: 0.35,
    maxSpeedMultiplier: 1.4,
    speedAdaptationRate: 0.15,
    deepThoughtThreshold: 0.75,
    deepThoughtSpeed: 0.25,
  },
  idleFidget: {
    enabled: true,
    activationDelaySec: 3.0,
    baseIntensity: 0.6,
    loadSuppression: 0.8,
    blinkClusterProbability: 0.12,
    microSighProbability: 0.08,
    headSwayAmplitude: 2.5,
    eyeDriftMaxOffset: 0.15,
    shoulderTensionAmplitude: 0.03,
  },
  tickRateHz: 30,
  globalInertiaMult: 1.0,
};

// ============================================================
// PERLIN-LIKE NOISE (simplified 1D)
// ============================================================

/**
 * Simple 1D value noise for organic fidget timing.
 * Uses a hash-based approach for deterministic but non-repeating patterns.
 */
class ValueNoise1D {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  private hash(n: number): number {
    const x = Math.sin(n * 127.1 + this.seed) * 43758.5453;
    return x - Math.floor(x);
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /** Get noise value at position t (returns 0-1) */
  sample(t: number): number {
    const i = Math.floor(t);
    const f = t - i;
    const a = this.hash(i);
    const b = this.hash(i + 1);
    return a + (b - a) * this.smoothstep(f);
  }

  /** Get noise value centered around 0 (-0.5 to 0.5) */
  sampleCentered(t: number): number {
    return this.sample(t) - 0.5;
  }
}

// ============================================================
// EMOTIONAL INERTIA CONTROLLER
// ============================================================

/**
 * Emotional Inertia Controller
 *
 * Applies physics-inspired temporal filtering to all emotion channels,
 * modulates animation speed from cognitive load, and generates
 * organic idle fidget micro-behaviors.
 *
 * Usage:
 * ```ts
 * const controller = new EmotionalInertiaController();
 * controller.start();
 *
 * // On each cognitive state update:
 * controller.feedEmotions({ joy: 0.8, interest: 0.5 });
 * controller.feedCognitiveLoad(0.6);
 *
 * // Get filtered output for avatar:
 * const output = controller.getOutput();
 * // output.smoothedEmotions, output.animationSpeedMultiplier, output.fidgetDeltas
 * ```
 */
export class EmotionalInertiaController extends EventEmitter {
  private config: EmotionalInertiaConfig;

  // Internal state
  private currentEmotions: Record<string, number> = {};
  private targetEmotions: Record<string, number> = {};
  private currentCognitiveLoad: number = 0;
  private currentSpeedMultiplier: number = 1.0;
  private isDeepThought: boolean = false;

  // Idle tracking
  private lastSignificantInputTime: number = Date.now();
  private idleDurationSec: number = 0;
  private significantChangeThreshold: number = 0.05;

  // Fidget state
  private fidgetNoiseX: ValueNoise1D;
  private fidgetNoiseY: ValueNoise1D;
  private fidgetNoiseZ: ValueNoise1D;
  private fidgetNoiseEyeX: ValueNoise1D;
  private fidgetNoiseEyeY: ValueNoise1D;
  private fidgetNoiseMouth: ValueNoise1D;
  private fidgetTime: number = 0;
  private pendingBlinkCluster: number = 0;
  private sighTimer: number = 0;
  private sighActive: boolean = false;
  private sighProgress: number = 0;

  // Tick management
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = Date.now();
  private frameCount: number = 0;

  constructor(config?: Partial<EmotionalInertiaConfig>) {
    super();
    this.config = { ...DEFAULT_EMOTIONAL_INERTIA_CONFIG, ...config };

    // Initialize noise generators with different seeds for independence
    this.fidgetNoiseX = new ValueNoise1D(17);
    this.fidgetNoiseY = new ValueNoise1D(31);
    this.fidgetNoiseZ = new ValueNoise1D(53);
    this.fidgetNoiseEyeX = new ValueNoise1D(71);
    this.fidgetNoiseEyeY = new ValueNoise1D(97);
    this.fidgetNoiseMouth = new ValueNoise1D(113);

    // Initialize emotion channels to zero
    for (const key of Object.keys(this.config.emotionProfiles)) {
      this.currentEmotions[key] = 0;
      this.targetEmotions[key] = 0;
    }
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /** Start the inertia controller tick loop */
  start(): void {
    if (this.tickInterval) return;
    const intervalMs = Math.round(1000 / this.config.tickRateHz);
    this.lastTickTime = Date.now();
    this.tickInterval = setInterval(() => this.tick(), intervalMs);
    this.emit("started");
  }

  /** Stop the inertia controller */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.emit("stopped");
  }

  /** Check if running */
  isRunning(): boolean {
    return this.tickInterval !== null;
  }

  // ============================================================
  // INPUT FEEDS
  // ============================================================

  /**
   * Feed raw emotion values from the cognitive pipeline.
   * These become the "target" that inertia smooths toward.
   */
  feedEmotions(emotions: Record<string, number>): void {
    let hasSignificantChange = false;

    for (const [key, value] of Object.entries(emotions)) {
      const clamped = Math.max(0, Math.min(1, value));
      const delta = Math.abs(clamped - (this.targetEmotions[key] ?? 0));
      if (delta > this.significantChangeThreshold) {
        hasSignificantChange = true;
      }
      this.targetEmotions[key] = clamped;

      // Ensure current has an entry
      if (this.currentEmotions[key] === undefined) {
        this.currentEmotions[key] = 0;
      }
    }

    if (hasSignificantChange) {
      this.lastSignificantInputTime = Date.now();
    }
  }

  /**
   * Feed cognitive load value (0-1).
   * Higher values slow down animation speed.
   */
  feedCognitiveLoad(load: number): void {
    const clamped = Math.max(0, Math.min(1, load));
    if (
      Math.abs(clamped - this.currentCognitiveLoad) >
      this.significantChangeThreshold
    ) {
      this.lastSignificantInputTime = Date.now();
    }
    this.currentCognitiveLoad = clamped;
  }

  // ============================================================
  // OUTPUT
  // ============================================================

  /** Get the current filtered output state */
  getOutput(): InertiaOutput {
    return {
      smoothedEmotions: { ...this.currentEmotions },
      animationSpeedMultiplier: this.currentSpeedMultiplier,
      isDeepThought: this.isDeepThought,
      fidgetDeltas: this.computeFidgetDeltas(),
      cognitiveLoad: this.currentCognitiveLoad,
      idleDurationSec: this.idleDurationSec,
    };
  }

  /** Get just the speed multiplier (convenience) */
  getSpeedMultiplier(): number {
    return this.currentSpeedMultiplier;
  }

  /** Get smoothed emotion value for a specific dimension */
  getSmoothedEmotion(key: string): number {
    return this.currentEmotions[key] ?? 0;
  }

  // ============================================================
  // INTERNAL TICK
  // ============================================================

  private tick(): void {
    const now = Date.now();
    const dtMs = now - this.lastTickTime;
    this.lastTickTime = now;
    this.frameCount++;

    // Update idle duration
    this.idleDurationSec = (now - this.lastSignificantInputTime) / 1000;

    // 1. Apply emotional inertia
    this.applyEmotionalInertia(dtMs);

    // 2. Update animation speed from cognitive load
    this.updateAnimationSpeed(dtMs);

    // 3. Update fidget timers
    this.updateFidgetState(dtMs);

    // Emit tick event with output
    if (this.frameCount % 3 === 0) {
      // Emit at ~10Hz to avoid flooding
      this.emit("tick", this.getOutput());
    }
  }

  /**
   * Apply per-dimension exponential smoothing with asymmetric time constants.
   * Rising emotions use riseTimeMs, falling emotions use fallTimeMs.
   */
  private applyEmotionalInertia(dtMs: number): void {
    const globalMult = this.config.globalInertiaMult;

    for (const [key, target] of Object.entries(this.targetEmotions)) {
      const current = this.currentEmotions[key] ?? 0;
      const profile = this.config.emotionProfiles[key];

      if (!profile) {
        // No profile — use simple lerp
        this.currentEmotions[key] = current + (target - current) * 0.1;
        continue;
      }

      const delta = target - current;
      const isRising = delta > 0;

      // Select time constant based on direction
      const timeConstantMs =
        (isRising ? profile.riseTimeMs : profile.fallTimeMs) * globalMult;

      // Exponential decay factor: alpha = 1 - e^(-dt/tau)
      const alpha = 1 - Math.exp(-dtMs / timeConstantMs);

      // Compute raw step
      let step = delta * alpha;

      // Clamp to max delta per frame
      const maxDelta = profile.maxDeltaPerFrame * (dtMs / 16.67); // Scale to frame time
      step = Math.max(-maxDelta, Math.min(maxDelta, step));

      // Apply step
      let newValue = current + step;

      // Apply deadzone
      if (Math.abs(newValue) < profile.deadzone && target === 0) {
        newValue = 0;
      }

      this.currentEmotions[key] = Math.max(0, Math.min(1, newValue));
    }
  }

  /**
   * Update animation speed multiplier based on cognitive load.
   * Uses smooth adaptation to avoid speed jumps.
   */
  private updateAnimationSpeed(dtMs: number): void {
    const cfg = this.config.cognitiveLoadSpeed;
    const load = this.currentCognitiveLoad;

    // Check deep thought mode
    const wasDeepThought = this.isDeepThought;
    this.isDeepThought = load >= cfg.deepThoughtThreshold;

    // Calculate target speed
    let targetSpeed: number;
    if (this.isDeepThought) {
      targetSpeed = cfg.deepThoughtSpeed;
    } else {
      // Linear interpolation between max (at load=0) and min (at load=1)
      targetSpeed =
        cfg.maxSpeedMultiplier -
        load * (cfg.maxSpeedMultiplier - cfg.minSpeedMultiplier);
    }

    // Smooth adaptation
    const adaptAlpha = 1 - Math.exp(-dtMs / (1000 / cfg.speedAdaptationRate));
    this.currentSpeedMultiplier +=
      (targetSpeed - this.currentSpeedMultiplier) * adaptAlpha;

    // Emit mode change
    if (wasDeepThought !== this.isDeepThought) {
      this.emit("deep_thought_changed", this.isDeepThought);
    }
  }

  /**
   * Update fidget state timers and trigger events.
   */
  private updateFidgetState(dtMs: number): void {
    if (!this.config.idleFidget.enabled) return;

    const dtSec = dtMs / 1000;
    this.fidgetTime += dtSec * 0.3; // Slow time progression for noise

    // Blink cluster check (only during idle)
    if (this.idleDurationSec > this.config.idleFidget.activationDelaySec) {
      const blinkProb = this.config.idleFidget.blinkClusterProbability * dtSec;
      if (Math.random() < blinkProb && this.pendingBlinkCluster === 0) {
        // Trigger blink cluster: 60% single, 30% double, 10% triple
        const r = Math.random();
        this.pendingBlinkCluster = r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
        this.emit("blink_cluster", this.pendingBlinkCluster);
      }
    }

    // Micro-sigh check
    if (this.idleDurationSec > this.config.idleFidget.activationDelaySec * 2) {
      this.sighTimer += dtSec;
      const sighInterval =
        60 / Math.max(0.01, this.config.idleFidget.microSighProbability);
      if (this.sighTimer > sighInterval && !this.sighActive) {
        this.sighActive = true;
        this.sighProgress = 0;
        this.sighTimer = 0;
        this.emit("micro_sigh");
      }
    }

    // Progress sigh animation
    if (this.sighActive) {
      this.sighProgress += dtSec * 0.8; // ~1.25 seconds for full sigh
      if (this.sighProgress >= 1.0) {
        this.sighActive = false;
        this.sighProgress = 0;
      }
    }

    // Decay blink cluster
    if (this.pendingBlinkCluster > 0) {
      // Blink clusters are consumed by the avatar renderer
      // They persist for one output read then clear
    }
  }

  /**
   * Compute fidget deltas based on noise, idle duration, and cognitive load.
   */
  private computeFidgetDeltas(): FidgetDeltas {
    const cfg = this.config.idleFidget;

    // Base fidget intensity: ramps up with idle time, suppressed by cognitive load
    const idleRamp = Math.min(
      1,
      Math.max(0, this.idleDurationSec - cfg.activationDelaySec) / 5,
    );
    const loadSuppress = 1 - this.currentCognitiveLoad * cfg.loadSuppression;
    const intensity = cfg.baseIntensity * idleRamp * loadSuppress;

    if (!cfg.enabled || intensity < 0.01) {
      return {
        headAngleX: 0,
        headAngleY: 0,
        headAngleZ: 0,
        eyeDriftX: 0,
        eyeDriftY: 0,
        blinkCluster: 0,
        bodyTensionY: 0,
        sighDepthBoost: 0,
        mouthMicroMovement: 0,
      };
    }

    const t = this.fidgetTime;

    // Head micro-sway (very slow, organic)
    const headX =
      this.fidgetNoiseX.sampleCentered(t * 0.7) *
      cfg.headSwayAmplitude *
      intensity;
    const headY =
      this.fidgetNoiseY.sampleCentered(t * 0.5) *
      cfg.headSwayAmplitude *
      0.6 *
      intensity;
    const headZ =
      this.fidgetNoiseZ.sampleCentered(t * 0.3) *
      cfg.headSwayAmplitude *
      0.4 *
      intensity;

    // Eye drift (slightly faster than head)
    const eyeX =
      this.fidgetNoiseEyeX.sampleCentered(t * 1.2) *
      cfg.eyeDriftMaxOffset *
      intensity;
    const eyeY =
      this.fidgetNoiseEyeY.sampleCentered(t * 0.9) *
      cfg.eyeDriftMaxOffset *
      0.7 *
      intensity;

    // Body tension (very slow oscillation)
    const bodyY =
      this.fidgetNoiseZ.sampleCentered(t * 0.2) *
      cfg.shoulderTensionAmplitude *
      intensity;

    // Mouth micro-movement (subtle lip press)
    const mouth =
      this.fidgetNoiseMouth.sampleCentered(t * 0.4) * 0.05 * intensity;

    // Sigh depth boost (bell curve during sigh)
    const sighBoost = this.sighActive
      ? Math.sin(this.sighProgress * Math.PI) * 0.4
      : 0;

    // Consume blink cluster
    const blink = this.pendingBlinkCluster;
    this.pendingBlinkCluster = 0;

    return {
      headAngleX: headX,
      headAngleY: headY,
      headAngleZ: headZ,
      eyeDriftX: eyeX,
      eyeDriftY: eyeY,
      blinkCluster: blink,
      bodyTensionY: bodyY,
      sighDepthBoost: sighBoost,
      mouthMicroMovement: mouth,
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /** Reset all state to defaults */
  reset(): void {
    for (const key of Object.keys(this.currentEmotions)) {
      this.currentEmotions[key] = 0;
      this.targetEmotions[key] = 0;
    }
    this.currentCognitiveLoad = 0;
    this.currentSpeedMultiplier = 1.0;
    this.isDeepThought = false;
    this.idleDurationSec = 0;
    this.lastSignificantInputTime = Date.now();
    this.pendingBlinkCluster = 0;
    this.sighActive = false;
    this.sighProgress = 0;
    this.sighTimer = 0;
    this.fidgetTime = 0;
    this.frameCount = 0;
  }

  /** Update configuration at runtime */
  updateConfig(partial: Partial<EmotionalInertiaConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.emotionProfiles) {
      this.config.emotionProfiles = {
        ...DEFAULT_EMOTION_PROFILES,
        ...partial.emotionProfiles,
      };
    }
  }

  /** Get current configuration (read-only) */
  getConfig(): Readonly<EmotionalInertiaConfig> {
    return this.config;
  }

  /** Get diagnostic info for debugging */
  getDiagnostics(): {
    frameCount: number;
    isRunning: boolean;
    emotionChannels: number;
    idleSec: number;
    speedMult: number;
    deepThought: boolean;
  } {
    return {
      frameCount: this.frameCount,
      isRunning: this.isRunning(),
      emotionChannels: Object.keys(this.currentEmotions).length,
      idleSec: this.idleDurationSec,
      speedMult: this.currentSpeedMultiplier,
      deepThought: this.isDeepThought,
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

/** Default singleton instance */
export const emotionalInertiaController = new EmotionalInertiaController();

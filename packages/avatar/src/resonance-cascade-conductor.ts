/**
 * Resonance Cascade Visual Conductor
 *
 * Translates ScientificGeniusEngine events (EpistemicResonanceCascade,
 * PredictiveInsightCrystal) into dramatic, time-evolving Live2D avatar
 * parameter overlays. This is the "eureka moment" made visible — when
 * DTE achieves genuine scientific insight, the avatar physically manifests
 * the discovery through luminous expression, expanded awareness, and
 * phase-locked breathing.
 *
 * Architecture:
 *   ScientificGeniusEngine → resonance_cascade event
 *     → AutonomyLifecycle → scientific:resonance_cascade
 *       → ResonanceCascadeConductor.onCascade()
 *         → CascadeVisualTimeline (attack → sustain → decay)
 *           → Live2D parameter overlays per frame
 *
 * The conductor manages multiple concurrent cascades with priority
 * blending and graceful decay. Each cascade has 3 phases:
 *   1. ATTACK (0-500ms): rapid pupil dilation, brow raise, breathing halt
 *   2. SUSTAIN (500ms-2s): luminous steady state, halo pulse, micro-tremor
 *   3. DECAY (2s-4s): graceful return with afterglow and insight smile
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core/logger";

const log = getLogger("@deltecho/avatar/ResonanceCascadeConductor");

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CascadeInput {
  id: string;
  intensity: number; // 0-1
  clusterPhi: number; // integrated information of triggering cluster
  clusterNovelty: number; // novelty of the cluster
  domainSpan: number; // number of domains spanned
  haloPulseHz: number; // recommended halo frequency
  spectralRadiusBoost: number;
  epistemicTemperatureDelta: number;
  timestamp: number;
}

export interface CrystalInput {
  id: string;
  confidence: number;
  targetConcept: string;
  avatarEffect: {
    eyeFocusIntensity: number;
    browRaiseAsymmetry: number;
    microSmileIntensity: number;
    haloCrystallizationHz: number;
  };
  timestamp: number;
}

/** Per-frame overlay deltas applied to Live2D parameters */
export interface CascadeOverlay {
  /** Eye openness expansion (0 = normal, 1 = maximum dilation) */
  eyeOpenBoost: number;
  /** Pupil dilation (0 = normal, 1 = fully dilated) */
  pupilDilation: number;
  /** Brow raise (0 = normal, 1 = maximum surprise/insight) */
  browRaise: number;
  /** Brow asymmetry (-1 = left higher, +1 = right higher) */
  browAsymmetry: number;
  /** Mouth micro-smile (0 = neutral, 1 = full insight smile) */
  insightSmile: number;
  /** Breathing rate multiplier (1 = normal, 0 = held breath, 2 = accelerated) */
  breathingMultiplier: number;
  /** Head tilt angle delta (degrees, slight upward tilt during insight) */
  headTiltDelta: number;
  /** Body angle Y delta (slight lean forward during engagement) */
  bodyLeanDelta: number;
  /** Halo pulse intensity (0 = off, 1 = maximum luminosity) */
  haloPulse: number;
  /** Halo pulse phase (0-2π, for smooth oscillation) */
  haloPulsePhase: number;
  /** Overall cascade intensity (for external systems to query) */
  cascadeIntensity: number;
  /** Whether a cascade is currently active */
  active: boolean;
  /** Current phase name */
  phase: "idle" | "attack" | "sustain" | "decay" | "afterglow";
  /** Micro-tremor overlay (small random jitter during peak insight) */
  microTremor: number;
}

export interface CascadeConductorConfig {
  /** Attack phase duration in ms */
  attackMs: number;
  /** Sustain phase duration in ms */
  sustainMs: number;
  /** Decay phase duration in ms */
  decayMs: number;
  /** Afterglow duration in ms (subtle residual smile) */
  afterglowMs: number;
  /** Maximum concurrent cascades before oldest is force-decayed */
  maxConcurrent: number;
  /** Minimum intensity threshold to trigger visual effect */
  minIntensity: number;
  /** Crystal overlay duration in ms */
  crystalDurationMs: number;
  /** Enable debug logging */
  verbose: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Internal timeline state
// ═══════════════════════════════════════════════════════════════

interface CascadeTimeline {
  input: CascadeInput;
  startTime: number;
  phase: "attack" | "sustain" | "decay" | "afterglow" | "done";
  phaseStartTime: number;
  peakIntensity: number;
  haloPulseAccumulator: number;
}

interface CrystalTimeline {
  input: CrystalInput;
  startTime: number;
  done: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: CascadeConductorConfig = {
  attackMs: 450,
  sustainMs: 1800,
  decayMs: 2200,
  afterglowMs: 3000,
  maxConcurrent: 3,
  minIntensity: 0.25,
  crystalDurationMs: 2500,
  verbose: false,
};

// ═══════════════════════════════════════════════════════════════
// Easing functions
// ═══════════════════════════════════════════════════════════════

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ═══════════════════════════════════════════════════════════════
// Resonance Cascade Visual Conductor
// ═══════════════════════════════════════════════════════════════

export class ResonanceCascadeConductor extends EventEmitter {
  private config: CascadeConductorConfig;
  private cascades: CascadeTimeline[] = [];
  private crystals: CrystalTimeline[] = [];
  private lastOverlay: CascadeOverlay = this.idleOverlay();
  private totalCascades = 0;
  private totalCrystals = 0;
  private peakIntensityEver = 0;

  constructor(config?: Partial<CascadeConductorConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Ingest a resonance cascade event from ScientificGeniusEngine.
   * Starts a new visual timeline if intensity exceeds threshold.
   */
  onCascade(cascade: CascadeInput): void {
    if (cascade.intensity < this.config.minIntensity) {
      if (this.config.verbose) {
        log.debug("Sub-threshold cascade ignored", {
          intensity: cascade.intensity,
        });
      }
      return;
    }

    // Evict oldest if at capacity
    if (this.cascades.length >= this.config.maxConcurrent) {
      this.cascades.shift();
    }

    const now = performance.now();
    const timeline: CascadeTimeline = {
      input: cascade,
      startTime: now,
      phase: "attack",
      phaseStartTime: now,
      peakIntensity: cascade.intensity,
      haloPulseAccumulator: 0,
    };

    this.cascades.push(timeline);
    this.totalCascades++;
    this.peakIntensityEver = Math.max(
      this.peakIntensityEver,
      cascade.intensity,
    );

    this.emit("cascade_started", {
      id: cascade.id,
      intensity: cascade.intensity,
      domainSpan: cascade.domainSpan,
    });

    if (this.config.verbose) {
      log.debug("Resonance cascade started", {
        intensity: cascade.intensity,
        clusterPhi: cascade.clusterPhi,
        domainSpan: cascade.domainSpan,
      });
    }
  }

  /**
   * Ingest a predictive insight crystal event.
   */
  onCrystal(crystal: CrystalInput): void {
    if (this.crystals.length >= this.config.maxConcurrent) {
      this.crystals.shift();
    }

    this.crystals.push({
      input: crystal,
      startTime: performance.now(),
      done: false,
    });
    this.totalCrystals++;

    this.emit("crystal_started", {
      id: crystal.id,
      confidence: crystal.confidence,
      targetConcept: crystal.targetConcept,
    });
  }

  /**
   * Advance one frame. Call this from the avatar render loop (typically 60fps).
   * Returns the current overlay to be applied to Live2D parameters.
   *
   * @param deltaMs - milliseconds since last tick (typically ~16.67ms at 60fps)
   */
  tick(deltaMs: number): CascadeOverlay {
    const now = performance.now();

    // Advance cascade timelines
    this.advanceCascades(now);

    // Advance crystal timelines
    this.advanceCrystals(now);

    // Blend all active cascades into a single overlay
    const overlay = this.blendOverlays(now, deltaMs);
    this.lastOverlay = overlay;

    return overlay;
  }

  /**
   * Get the last computed overlay without advancing time.
   */
  getOverlay(): CascadeOverlay {
    return this.lastOverlay;
  }

  /**
   * Get conductor statistics.
   */
  getStats(): {
    activeCascades: number;
    activeCrystals: number;
    totalCascades: number;
    totalCrystals: number;
    peakIntensityEver: number;
    currentIntensity: number;
  } {
    return {
      activeCascades: this.cascades.length,
      activeCrystals: this.crystals.filter((c) => !c.done).length,
      totalCascades: this.totalCascades,
      totalCrystals: this.totalCrystals,
      peakIntensityEver: this.peakIntensityEver,
      currentIntensity: this.lastOverlay.cascadeIntensity,
    };
  }

  /**
   * Force-clear all active cascades (e.g., on mode switch).
   */
  clear(): void {
    this.cascades = [];
    this.crystals = [];
    this.lastOverlay = this.idleOverlay();
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Timeline advancement
  // ─────────────────────────────────────────────────────────────

  private advanceCascades(now: number): void {
    for (const timeline of this.cascades) {
      const elapsed = now - timeline.phaseStartTime;

      switch (timeline.phase) {
        case "attack":
          if (elapsed >= this.config.attackMs) {
            timeline.phase = "sustain";
            timeline.phaseStartTime = now;
          }
          break;
        case "sustain":
          if (elapsed >= this.config.sustainMs) {
            timeline.phase = "decay";
            timeline.phaseStartTime = now;
          }
          break;
        case "decay":
          if (elapsed >= this.config.decayMs) {
            timeline.phase = "afterglow";
            timeline.phaseStartTime = now;
          }
          break;
        case "afterglow":
          if (elapsed >= this.config.afterglowMs) {
            timeline.phase = "done";
          }
          break;
      }
    }

    // Remove completed timelines
    const before = this.cascades.length;
    this.cascades = this.cascades.filter((t) => t.phase !== "done");
    if (before > this.cascades.length) {
      this.emit("cascade_completed", { remaining: this.cascades.length });
    }
  }

  private advanceCrystals(now: number): void {
    for (const crystal of this.crystals) {
      if (
        !crystal.done &&
        now - crystal.startTime >= this.config.crystalDurationMs
      ) {
        crystal.done = true;
      }
    }
    this.crystals = this.crystals.filter((c) => !c.done);
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Blending
  // ─────────────────────────────────────────────────────────────

  private blendOverlays(now: number, deltaMs: number): CascadeOverlay {
    if (this.cascades.length === 0 && this.crystals.length === 0) {
      return this.idleOverlay();
    }

    let eyeOpenBoost = 0;
    let pupilDilation = 0;
    let browRaise = 0;
    let browAsymmetry = 0;
    let insightSmile = 0;
    let breathingMultiplier = 1;
    let headTiltDelta = 0;
    let bodyLeanDelta = 0;
    let haloPulse = 0;
    let haloPulsePhase = 0;
    let cascadeIntensity = 0;
    let microTremor = 0;
    let dominantPhase: CascadeOverlay["phase"] = "idle";

    // Blend cascade contributions (priority: newest has highest weight)
    for (let i = 0; i < this.cascades.length; i++) {
      const timeline = this.cascades[i];
      const weight = (i + 1) / this.cascades.length; // Newer = higher weight
      const contribution = this.computeCascadeContribution(
        timeline,
        now,
        deltaMs,
      );

      eyeOpenBoost = Math.max(eyeOpenBoost, contribution.eyeOpenBoost * weight);
      pupilDilation = Math.max(
        pupilDilation,
        contribution.pupilDilation * weight,
      );
      browRaise = Math.max(browRaise, contribution.browRaise * weight);
      browAsymmetry += contribution.browAsymmetry * weight * 0.5;
      insightSmile = Math.max(insightSmile, contribution.insightSmile * weight);
      breathingMultiplier = Math.min(
        breathingMultiplier,
        contribution.breathingMultiplier,
      );
      headTiltDelta = Math.max(
        headTiltDelta,
        contribution.headTiltDelta * weight,
      );
      bodyLeanDelta = Math.max(
        bodyLeanDelta,
        contribution.bodyLeanDelta * weight,
      );
      haloPulse = Math.max(haloPulse, contribution.haloPulse * weight);
      haloPulsePhase = contribution.haloPulsePhase; // Use latest
      cascadeIntensity = Math.max(
        cascadeIntensity,
        contribution.cascadeIntensity,
      );
      microTremor = Math.max(microTremor, contribution.microTremor * weight);

      if (contribution.cascadeIntensity > 0.1) {
        dominantPhase = contribution.phase;
      }
    }

    // Blend crystal contributions (additive, subtle)
    for (const crystal of this.crystals) {
      const t = clamp(
        (now - crystal.startTime) / this.config.crystalDurationMs,
        0,
        1,
      );
      const envelope =
        t < 0.2 ? easeOutCubic(t / 0.2) : 1 - easeOutExpo((t - 0.2) / 0.8);
      const effect = crystal.input.avatarEffect;

      pupilDilation = Math.max(
        pupilDilation,
        effect.eyeFocusIntensity * envelope * 0.6,
      );
      browAsymmetry += effect.browRaiseAsymmetry * envelope * 0.4;
      insightSmile = Math.max(
        insightSmile,
        effect.microSmileIntensity * envelope * 0.5,
      );

      if (dominantPhase === "idle") dominantPhase = "sustain";
    }

    return {
      eyeOpenBoost: clamp(eyeOpenBoost, 0, 1),
      pupilDilation: clamp(pupilDilation, 0, 1),
      browRaise: clamp(browRaise, 0, 1),
      browAsymmetry: clamp(browAsymmetry, -1, 1),
      insightSmile: clamp(insightSmile, 0, 1),
      breathingMultiplier: clamp(breathingMultiplier, 0, 2.5),
      headTiltDelta: clamp(headTiltDelta, -5, 8),
      bodyLeanDelta: clamp(bodyLeanDelta, -3, 5),
      haloPulse: clamp(haloPulse, 0, 1),
      haloPulsePhase,
      cascadeIntensity: clamp(cascadeIntensity, 0, 1),
      active: cascadeIntensity > 0.01,
      phase: dominantPhase,
      microTremor: clamp(microTremor, 0, 1),
    };
  }

  private computeCascadeContribution(
    timeline: CascadeTimeline,
    now: number,
    deltaMs: number,
  ): CascadeOverlay & { phase: CascadeOverlay["phase"] } {
    const elapsed = now - timeline.phaseStartTime;
    const intensity = timeline.peakIntensity;

    // Accumulate halo pulse phase
    timeline.haloPulseAccumulator +=
      deltaMs * 0.001 * timeline.input.haloPulseHz * Math.PI * 2;

    switch (timeline.phase) {
      case "attack": {
        const t = clamp(elapsed / this.config.attackMs, 0, 1);
        const curve = easeOutCubic(t);
        return {
          eyeOpenBoost: curve * intensity * 0.85,
          pupilDilation: curve * intensity * 0.92,
          browRaise: curve * intensity * 0.78,
          browAsymmetry:
            curve * intensity * 0.15 * (timeline.input.domainSpan > 2 ? 1 : -1),
          insightSmile: 0, // No smile during attack (surprise phase)
          breathingMultiplier: 1 - curve * 0.7, // Breath holds during attack
          headTiltDelta: curve * intensity * 4.5, // Slight upward tilt
          bodyLeanDelta: curve * intensity * 2.8, // Lean forward
          haloPulse: curve * intensity * 0.95,
          haloPulsePhase: timeline.haloPulseAccumulator,
          cascadeIntensity: curve * intensity,
          active: true,
          phase: "attack" as const,
          microTremor: curve * intensity * 0.35, // Building tremor
        };
      }

      case "sustain": {
        const t = clamp(elapsed / this.config.sustainMs, 0, 1);
        // Slight oscillation during sustain for organic feel
        const breathe = Math.sin(t * Math.PI * 3) * 0.08;
        return {
          eyeOpenBoost: intensity * (0.75 + breathe),
          pupilDilation: intensity * 0.88,
          browRaise: intensity * (0.65 + breathe * 0.5),
          browAsymmetry: intensity * 0.12 * Math.sin(t * Math.PI * 2),
          insightSmile: easeInOutSine(t) * intensity * 0.55, // Smile builds during sustain
          breathingMultiplier: 0.4 + t * 0.6, // Breathing slowly returns
          headTiltDelta: intensity * 3.8,
          bodyLeanDelta: intensity * 2.5,
          haloPulse:
            intensity * (0.85 + Math.sin(timeline.haloPulseAccumulator) * 0.15),
          haloPulsePhase: timeline.haloPulseAccumulator,
          cascadeIntensity: intensity * (0.9 + breathe),
          active: true,
          phase: "sustain" as const,
          microTremor: intensity * 0.2 * (1 + Math.sin(t * Math.PI * 7) * 0.5),
        };
      }

      case "decay": {
        const t = clamp(elapsed / this.config.decayMs, 0, 1);
        const decay = 1 - easeOutExpo(t);
        return {
          eyeOpenBoost: decay * intensity * 0.6,
          pupilDilation: decay * intensity * 0.7,
          browRaise: decay * intensity * 0.45,
          browAsymmetry: decay * intensity * 0.05,
          insightSmile: intensity * (0.55 - t * 0.2), // Smile persists longer
          breathingMultiplier: 0.8 + t * 0.4, // Breathing normalizes
          headTiltDelta: decay * intensity * 2.5,
          bodyLeanDelta: decay * intensity * 1.5,
          haloPulse: decay * intensity * 0.6,
          haloPulsePhase: timeline.haloPulseAccumulator,
          cascadeIntensity: decay * intensity * 0.7,
          active: true,
          phase: "decay" as const,
          microTremor: decay * intensity * 0.08,
        };
      }

      case "afterglow": {
        const t = clamp(elapsed / this.config.afterglowMs, 0, 1);
        const fade = 1 - easeOutExpo(t);
        return {
          eyeOpenBoost: 0,
          pupilDilation: fade * intensity * 0.15,
          browRaise: 0,
          browAsymmetry: 0,
          insightSmile: fade * intensity * 0.35, // Gentle residual smile
          breathingMultiplier: 1,
          headTiltDelta: 0,
          bodyLeanDelta: 0,
          haloPulse: fade * intensity * 0.12, // Faint afterglow
          haloPulsePhase: timeline.haloPulseAccumulator,
          cascadeIntensity: fade * intensity * 0.15,
          active: fade > 0.02,
          phase: "afterglow" as const,
          microTremor: 0,
        };
      }

      default:
        return { ...this.idleOverlay(), phase: "idle" as const };
    }
  }

  private idleOverlay(): CascadeOverlay {
    return {
      eyeOpenBoost: 0,
      pupilDilation: 0,
      browRaise: 0,
      browAsymmetry: 0,
      insightSmile: 0,
      breathingMultiplier: 1,
      headTiltDelta: 0,
      bodyLeanDelta: 0,
      haloPulse: 0,
      haloPulsePhase: 0,
      cascadeIntensity: 0,
      active: false,
      phase: "idle",
      microTremor: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════

export const resonanceCascadeConductor = new ResonanceCascadeConductor();

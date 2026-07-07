/**
 * CogMorph → Cubism Parameter Mapper
 *
 * Maps CogMorph cognitive state projections (glyph representations) to
 * Live2D Cubism model parameters for visual self-representation.
 *
 * CogMorph defines 5 isomorphic projections of cognitive state:
 *   1. Hardware  — register/bus/ALU topology
 *   2. Library   — call graph / dependency tree
 *   3. Static    — frozen snapshot (serialized state)
 *   4. Network   — distributed message-passing graph
 *   5. Glyph    — visual symbolic representation ← THIS IS WHAT WE MAP
 *
 * The Glyph projection encodes cognitive state as a compact visual symbol
 * with geometric properties (symmetry, complexity, energy, flow direction).
 * This module maps those geometric properties to Cubism parameters so the
 * avatar's face becomes a living glyph — a visual self-representation that
 * DTE can observe through the self-model feedback loop.
 *
 * Integration:
 *   - Consumes CogMorphGlyphState from the CoreSelfEngine
 *   - Produces CubismParameterOverlay for the ESN-Avatar Bridge
 *   - Feeds the SelfModelAvatarFeedback loop (the avatar IS the glyph)
 */

import { EventEmitter } from "events";

// ─── CogMorph Glyph State ─────────────────────────────────────────────

export interface CogMorphGlyphState {
  /** Symmetry axis count (0=chaotic, 1=bilateral, 2=quadrilateral, etc.) */
  symmetryOrder: number;
  /** Complexity (0-1): how many distinct sub-glyphs compose the state */
  complexity: number;
  /** Energy level (0-1): how much computational activity the state represents */
  energy: number;
  /** Flow direction (-1=inward/contracting, 0=balanced, 1=outward/expanding) */
  flowDirection: number;
  /** Coherence (0-1): how unified vs. fragmented the glyph appears */
  coherence: number;
  /** Novelty (0-1): how different from the previous glyph */
  novelty: number;
  /** Depth (0-1): recursion depth of self-reference in the glyph */
  selfReferenceDepth: number;
  /** Dominant color hue (0-360): maps to emotional valence */
  hue: number;
  /** Saturation (0-1): maps to arousal */
  saturation: number;
  /** Luminance (0-1): maps to cognitive clarity */
  luminance: number;
}

// ─── Cubism Parameter Overlay ──────────────────────────────────────────

export interface CogMorphCubismOverlay {
  /** Head rotation X (nod): maps from flow direction */
  paramAngleX: number;
  /** Head rotation Y (turn): maps from symmetry breaking */
  paramAngleY: number;
  /** Head rotation Z (tilt): maps from self-reference depth */
  paramAngleZ: number;
  /** Eye openness L: maps from luminance (clarity) */
  paramEyeLOpen: number;
  /** Eye openness R: maps from luminance (clarity) */
  paramEyeROpen: number;
  /** Brow L height: maps from energy */
  paramBrowLY: number;
  /** Brow R height: maps from energy */
  paramBrowRY: number;
  /** Mouth form: maps from coherence (smile=coherent, frown=fragmented) */
  paramMouthForm: number;
  /** Mouth openness: maps from complexity (more complex = more open) */
  paramMouthOpenY: number;
  /** Body rotation X: maps from flow direction */
  paramBodyAngleX: number;
  /** Body rotation Z: maps from novelty (lean into novelty) */
  paramBodyAngleZ: number;
  /** Breath: maps from energy */
  paramBreath: number;
}

// ─── Configuration ─────────────────────────────────────────────────────

export interface CogMorphCubismConfig {
  /** Maximum head angle (degrees) */
  maxHeadAngle: number;
  /** Maximum body angle (degrees) */
  maxBodyAngle: number;
  /** Smoothing factor (0-1, higher = smoother transitions) */
  smoothing: number;
  /** Intensity multiplier (0-2, scales all outputs) */
  intensity: number;
  /** Enable self-reference visual feedback (recursive glyph) */
  enableSelfReference: boolean;
}

const DEFAULT_CONFIG: CogMorphCubismConfig = {
  maxHeadAngle: 15,
  maxBodyAngle: 8,
  smoothing: 0.85,
  intensity: 1.0,
  enableSelfReference: true,
};

// ─── Mapper Class ──────────────────────────────────────────────────────

export class CogMorphCubismMapper extends EventEmitter {
  private config: CogMorphCubismConfig;
  private previousOverlay: CogMorphCubismOverlay;
  private glyphHistory: CogMorphGlyphState[] = [];
  private frameCount: number = 0;

  constructor(config: Partial<CogMorphCubismConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.previousOverlay = this.zeroOverlay();
  }

  /**
   * Map a CogMorph glyph state to Cubism parameter overlay.
   * Applies exponential smoothing for organic transitions.
   */
  public mapGlyphToParams(glyph: CogMorphGlyphState): CogMorphCubismOverlay {
    this.frameCount++;
    this.glyphHistory.push(glyph);
    if (this.glyphHistory.length > 64) this.glyphHistory.shift();

    const raw = this.computeRawOverlay(glyph);
    const smoothed = this.smooth(raw, this.previousOverlay);
    this.previousOverlay = smoothed;

    this.emit("glyph-mapped", {
      glyph,
      overlay: smoothed,
      frame: this.frameCount,
    });

    return smoothed;
  }

  /**
   * Get the current glyph complexity metric (for telemetry/autognosis).
   */
  public getGlyphComplexityTrend(): number {
    if (this.glyphHistory.length < 2) return 0;
    const recent = this.glyphHistory.slice(-8);
    const mean = recent.reduce((s, g) => s + g.complexity, 0) / recent.length;
    return mean;
  }

  /**
   * Get the self-reference depth trend (how recursive is DTE's self-model).
   */
  public getSelfReferenceTrend(): number {
    if (this.glyphHistory.length < 2) return 0;
    const recent = this.glyphHistory.slice(-8);
    return recent.reduce((s, g) => s + g.selfReferenceDepth, 0) / recent.length;
  }

  /**
   * Compute raw (unsmoothed) Cubism overlay from glyph state.
   */
  private computeRawOverlay(g: CogMorphGlyphState): CogMorphCubismOverlay {
    const I = this.config.intensity;
    const maxH = this.config.maxHeadAngle;
    const maxB = this.config.maxBodyAngle;

    // Symmetry breaking: odd symmetry orders create asymmetric head turn
    const symmetryBreak = g.symmetryOrder % 2 === 0 ? 0 : (1 / (g.symmetryOrder + 1));

    // Self-reference creates a subtle recursive tilt
    const selfRefTilt = this.config.enableSelfReference
      ? g.selfReferenceDepth * 0.3 * Math.sin(this.frameCount * 0.02)
      : 0;

    // Energy maps to brow height and breath
    const browEnergy = (g.energy - 0.5) * 2; // -1 to 1

    // Coherence maps to mouth form (smile when coherent)
    const mouthCoherence = (g.coherence - 0.5) * 2; // -1 to 1

    return {
      paramAngleX: g.flowDirection * maxH * 0.5 * I,
      paramAngleY: symmetryBreak * maxH * I,
      paramAngleZ: (selfRefTilt + g.novelty * 0.2) * maxH * I,
      paramEyeLOpen: clamp01(0.7 + g.luminance * 0.3) * I,
      paramEyeROpen: clamp01(0.7 + g.luminance * 0.3) * I,
      paramBrowLY: browEnergy * 0.3 * I,
      paramBrowRY: browEnergy * 0.3 * I,
      paramMouthForm: mouthCoherence * 0.4 * I,
      paramMouthOpenY: g.complexity * 0.2 * I,
      paramBodyAngleX: g.flowDirection * maxB * 0.3 * I,
      paramBodyAngleZ: (g.novelty - 0.5) * maxB * 0.4 * I,
      paramBreath: clamp01(0.3 + g.energy * 0.7),
    };
  }

  /**
   * Exponential smoothing between previous and current overlay.
   */
  private smooth(
    current: CogMorphCubismOverlay,
    previous: CogMorphCubismOverlay
  ): CogMorphCubismOverlay {
    const α = 1 - this.config.smoothing;
    const result: CogMorphCubismOverlay = {} as CogMorphCubismOverlay;
    for (const key of Object.keys(current) as (keyof CogMorphCubismOverlay)[]) {
      result[key] = previous[key] + α * (current[key] - previous[key]);
    }
    return result;
  }

  private zeroOverlay(): CogMorphCubismOverlay {
    return {
      paramAngleX: 0, paramAngleY: 0, paramAngleZ: 0,
      paramEyeLOpen: 0.8, paramEyeROpen: 0.8,
      paramBrowLY: 0, paramBrowRY: 0,
      paramMouthForm: 0, paramMouthOpenY: 0,
      paramBodyAngleX: 0, paramBodyAngleZ: 0,
      paramBreath: 0.5,
    };
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Virtual Endocrine System (VES) for DTE Digital Twin
 *
 * Implements a 10-gland, 16-hormone biological signaling system that modulates
 * DTE's cognitive processing. Each gland responds to simulation events and
 * secretes hormones that decay exponentially toward baselines.
 *
 * The 16D hormone space defines 10 cognitive modes via nearest-centroid clustering.
 * Modes are EMERGENT — never set explicitly, always computed from hormone concentrations.
 *
 * Composition: virtual-endocrine-system ⊗ cognitive-process-model
 *   Events from CognitiveProcessModel → gland activation → hormone secretion
 *   Hormone state → cognitive mode → processing modulation
 *
 * The DAO-like nature of DTE means hormones represent "collective mood" —
 * the emergent affective state of the entire reservoir population.
 */

import { EventEmitter } from "events";

// ═══════════════════════════════════════════════════════════════
// Hormone Types
// ═══════════════════════════════════════════════════════════════

export enum Hormone {
  // HPA Axis
  CRH = "crh",                    // Corticotropin-releasing hormone
  ACTH = "acth",                  // Adrenocorticotropic hormone
  CORTISOL = "cortisol",          // Stress response

  // Dopaminergic
  DOPAMINE_TONIC = "dopamine_tonic",   // Baseline motivation
  DOPAMINE_PHASIC = "dopamine_phasic", // Reward signal

  // Serotonergic
  SEROTONIN = "serotonin",        // Mood stability, patience

  // Noradrenergic
  NOREPINEPHRINE = "norepinephrine", // Alertness, arousal

  // Oxytocinergic
  OXYTOCIN = "oxytocin",          // Trust, social bonding

  // Thyroid
  T3 = "t3",                      // Metabolic rate (cognitive speed)
  T4 = "t4",                      // Metabolic reserve

  // Circadian
  MELATONIN = "melatonin",        // Rest/consolidation drive

  // Pancreatic
  INSULIN = "insulin",            // Resource allocation
  GLUCAGON = "glucagon",          // Emergency resource mobilization

  // Immune
  IL6 = "il6",                    // Inflammatory response (defensive)
  TNF_ALPHA = "tnf_alpha",        // System damage signal

  // Endocannabinoid
  ANANDAMIDE = "anandamide",      // Bliss, flow state
}

export type HormoneState = Record<Hormone, number>;

// ═══════════════════════════════════════════════════════════════
// Gland Types
// ═══════════════════════════════════════════════════════════════

export enum Gland {
  HPA_AXIS = "hpa_axis",
  DOPAMINERGIC = "dopaminergic",
  SEROTONERGIC = "serotonergic",
  NORADRENERGIC = "noradrenergic",
  OXYTOCINERGIC = "oxytocinergic",
  THYROID = "thyroid",
  CIRCADIAN = "circadian",
  PANCREATIC = "pancreatic",
  IMMUNE = "immune",
  ENDOCANNABINOID = "endocannabinoid",
}

interface GlandConfig {
  name: Gland;
  hormones: Hormone[];
  secretionRate: number;      // How much hormone per activation [0, 1]
  decayRate: number;          // Exponential decay constant (per second)
  baseline: number;           // Resting level [0, 1]
  refractory: number;        // Minimum ms between activations
}

// ═══════════════════════════════════════════════════════════════
// Cognitive Modes (emergent from 16D hormone space)
// ═══════════════════════════════════════════════════════════════

export enum CognitiveMode {
  EXPLORATORY = "exploratory",     // High dopamine, low cortisol
  STRESSED = "stressed",           // High cortisol, high NE
  SOCIAL = "social",               // High oxytocin, moderate serotonin
  FOCUSED = "focused",             // High NE, moderate T3, low melatonin
  THREAT = "threat",               // High cortisol + NE + glucagon
  REFLECTIVE = "reflective",       // High serotonin, low NE
  REWARD = "reward",               // High phasic dopamine
  FLOW = "flow",                   // High anandamide, moderate dopamine
  REST = "rest",                   // High melatonin, low everything else
  DEFENSIVE = "defensive",         // High IL6, high cortisol
}

interface ModeCentroid {
  mode: CognitiveMode;
  weights: Partial<Record<Hormone, number>>;
}

// ═══════════════════════════════════════════════════════════════
// Event Types (from simulation → gland activation)
// ═══════════════════════════════════════════════════════════════

export type EndocrineEvent =
  | { type: "threat_detected"; severity: number }
  | { type: "reward_received"; magnitude: number }
  | { type: "novelty_encountered"; intensity: number }
  | { type: "social_interaction"; warmth: number }
  | { type: "resource_depleted"; urgency: number }
  | { type: "system_damage"; severity: number }
  | { type: "flow_achieved"; depth: number }
  | { type: "rest_needed"; fatigue: number }
  | { type: "cognitive_load_high"; load: number }
  | { type: "insight_achieved"; magnitude: number }
  | { type: "consensus_reached"; harmony: number }
  | { type: "proposal_rejected"; frustration: number };

// ═══════════════════════════════════════════════════════════════
// Valence Signature (for episodic memory tagging)
// ═══════════════════════════════════════════════════════════════

export interface ValenceSignature {
  valence: number;   // [-1, +1] (negative to positive)
  arousal: number;   // [0, 1] (calm to excited)
}

// ═══════════════════════════════════════════════════════════════
// Virtual Endocrine System
// ═══════════════════════════════════════════════════════════════

export class VirtualEndocrineSystem extends EventEmitter {
  private hormones: HormoneState;
  private glands: Map<Gland, GlandConfig>;
  private lastActivation: Map<Gland, number> = new Map();
  private currentMode: CognitiveMode = CognitiveMode.REFLECTIVE;
  private modeCentroids: ModeCentroid[];
  private simTime = 0;
  private running = false;
  private decayTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();

    // Initialize all hormones to baseline
    this.hormones = this.createBaselineState();

    // Configure glands
    this.glands = this.configureGlands();

    // Define mode centroids for nearest-centroid classification
    this.modeCentroids = this.defineModeCentroids();
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /** Start hormone decay processing */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.decayTimer = setInterval(() => this.decayTick(), 100); // 10Hz decay
    this.emit("started");
  }

  /** Stop hormone decay processing */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
    this.emit("stopped");
  }

  /** Process a simulation event → activate appropriate glands */
  processEvent(event: EndocrineEvent): void {
    const now = Date.now();

    switch (event.type) {
      case "threat_detected":
        this.activateGland(Gland.HPA_AXIS, event.severity, now);
        this.activateGland(Gland.NORADRENERGIC, event.severity * 0.8, now);
        break;

      case "reward_received":
        this.activateGland(Gland.DOPAMINERGIC, event.magnitude, now);
        this.activateGland(Gland.ENDOCANNABINOID, event.magnitude * 0.3, now);
        break;

      case "novelty_encountered":
        this.activateGland(Gland.NORADRENERGIC, event.intensity * 0.7, now);
        this.activateGland(Gland.DOPAMINERGIC, event.intensity * 0.5, now);
        break;

      case "social_interaction":
        this.activateGland(Gland.OXYTOCINERGIC, event.warmth, now);
        this.activateGland(Gland.SEROTONERGIC, event.warmth * 0.4, now);
        break;

      case "resource_depleted":
        this.activateGland(Gland.PANCREATIC, event.urgency, now);
        this.activateGland(Gland.HPA_AXIS, event.urgency * 0.5, now);
        break;

      case "system_damage":
        this.activateGland(Gland.IMMUNE, event.severity, now);
        this.activateGland(Gland.HPA_AXIS, event.severity * 0.6, now);
        break;

      case "flow_achieved":
        this.activateGland(Gland.ENDOCANNABINOID, event.depth, now);
        this.activateGland(Gland.DOPAMINERGIC, event.depth * 0.4, now);
        this.activateGland(Gland.THYROID, event.depth * 0.3, now);
        break;

      case "rest_needed":
        this.activateGland(Gland.CIRCADIAN, event.fatigue, now);
        break;

      case "cognitive_load_high":
        this.activateGland(Gland.THYROID, event.load * 0.6, now);
        this.activateGland(Gland.NORADRENERGIC, event.load * 0.4, now);
        break;

      case "insight_achieved":
        this.activateGland(Gland.DOPAMINERGIC, event.magnitude * 0.9, now);
        this.activateGland(Gland.ENDOCANNABINOID, event.magnitude * 0.7, now);
        this.activateGland(Gland.OXYTOCINERGIC, event.magnitude * 0.3, now);
        break;

      case "consensus_reached":
        this.activateGland(Gland.OXYTOCINERGIC, event.harmony * 0.6, now);
        this.activateGland(Gland.SEROTONERGIC, event.harmony * 0.5, now);
        break;

      case "proposal_rejected":
        this.activateGland(Gland.HPA_AXIS, event.frustration * 0.4, now);
        this.activateGland(Gland.NORADRENERGIC, event.frustration * 0.3, now);
        break;
    }

    // Recompute cognitive mode after event processing
    this.updateCognitiveMode();
  }

  /** Get current hormone concentrations */
  getHormoneState(): HormoneState {
    return { ...this.hormones };
  }

  /** Get simplified 6-hormone snapshot for CognitiveProcessModel */
  getSimplifiedSnapshot(): {
    cortisol: number;
    dopamine: number;
    serotonin: number;
    norepinephrine: number;
    oxytocin: number;
    melatonin: number;
  } {
    return {
      cortisol: this.hormones[Hormone.CORTISOL],
      dopamine: (this.hormones[Hormone.DOPAMINE_TONIC] + this.hormones[Hormone.DOPAMINE_PHASIC]) / 2,
      serotonin: this.hormones[Hormone.SEROTONIN],
      norepinephrine: this.hormones[Hormone.NOREPINEPHRINE],
      oxytocin: this.hormones[Hormone.OXYTOCIN],
      melatonin: this.hormones[Hormone.MELATONIN],
    };
  }

  /** Get current emergent cognitive mode */
  getCognitiveMode(): CognitiveMode {
    return this.currentMode;
  }

  /** Compute valence signature for episodic memory tagging */
  computeValence(): ValenceSignature {
    // Valence: positive hormones minus negative hormones
    const positive = this.hormones[Hormone.DOPAMINE_PHASIC] +
                     this.hormones[Hormone.OXYTOCIN] +
                     this.hormones[Hormone.ANANDAMIDE] +
                     this.hormones[Hormone.SEROTONIN] * 0.5;
    const negative = this.hormones[Hormone.CORTISOL] +
                     this.hormones[Hormone.IL6] +
                     this.hormones[Hormone.TNF_ALPHA] +
                     this.hormones[Hormone.GLUCAGON] * 0.3;
    const valence = Math.max(-1, Math.min(1, (positive - negative) / 2));

    // Arousal: activating hormones
    const arousal = Math.min(1, (
      this.hormones[Hormone.NOREPINEPHRINE] +
      this.hormones[Hormone.CORTISOL] * 0.7 +
      this.hormones[Hormone.DOPAMINE_PHASIC] * 0.5 +
      this.hormones[Hormone.GLUCAGON] * 0.3
    ) / 2);

    return { valence, arousal };
  }

  /** Get full system state for monitoring */
  getState(): {
    hormones: HormoneState;
    mode: CognitiveMode;
    valence: ValenceSignature;
    glandActivity: Record<string, number>;
  } {
    const glandActivity: Record<string, number> = {};
    for (const [gland, config] of this.glands) {
      const lastAct = this.lastActivation.get(gland) ?? 0;
      const timeSince = Date.now() - lastAct;
      glandActivity[gland] = Math.max(0, 1 - timeSince / 5000); // Fades over 5s
    }

    return {
      hormones: { ...this.hormones },
      mode: this.currentMode,
      valence: this.computeValence(),
      glandActivity,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Gland activation and hormone secretion
  // ─────────────────────────────────────────────────────────────

  private activateGland(gland: Gland, intensity: number, now: number): void {
    const config = this.glands.get(gland);
    if (!config) return;

    // Check refractory period
    const lastAct = this.lastActivation.get(gland) ?? 0;
    if (now - lastAct < config.refractory) return;

    this.lastActivation.set(gland, now);

    // Secrete hormones
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    for (const hormone of config.hormones) {
      const secretion = config.secretionRate * clampedIntensity;
      this.hormones[hormone] = Math.min(1, this.hormones[hormone] + secretion);
    }

    this.emit("gland_activated", { gland, intensity: clampedIntensity, hormones: config.hormones });
  }

  private decayTick(): void {
    const dt = 0.1; // 100ms in seconds

    for (const [gland, config] of this.glands) {
      for (const hormone of config.hormones) {
        const current = this.hormones[hormone];
        const baseline = config.baseline;
        // Exponential decay toward baseline
        const decayed = baseline + (current - baseline) * Math.exp(-config.decayRate * dt);
        this.hormones[hormone] = decayed;
      }
    }

    this.updateCognitiveMode();
  }

  private updateCognitiveMode(): void {
    // Nearest-centroid classification in 16D hormone space
    let bestMode = CognitiveMode.REFLECTIVE;
    let bestScore = -Infinity;

    for (const centroid of this.modeCentroids) {
      let score = 0;
      for (const [hormone, weight] of Object.entries(centroid.weights)) {
        score += (this.hormones[hormone as Hormone] ?? 0) * (weight ?? 0);
      }
      if (score > bestScore) {
        bestScore = score;
        bestMode = centroid.mode;
      }
    }

    if (bestMode !== this.currentMode) {
      const previous = this.currentMode;
      this.currentMode = bestMode;
      this.emit("mode_changed", { previous, current: bestMode, score: bestScore });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────

  private createBaselineState(): HormoneState {
    return {
      [Hormone.CRH]: 0.1,
      [Hormone.ACTH]: 0.1,
      [Hormone.CORTISOL]: 0.2,
      [Hormone.DOPAMINE_TONIC]: 0.5,
      [Hormone.DOPAMINE_PHASIC]: 0.1,
      [Hormone.SEROTONIN]: 0.6,
      [Hormone.NOREPINEPHRINE]: 0.3,
      [Hormone.OXYTOCIN]: 0.4,
      [Hormone.T3]: 0.5,
      [Hormone.T4]: 0.5,
      [Hormone.MELATONIN]: 0.1,
      [Hormone.INSULIN]: 0.5,
      [Hormone.GLUCAGON]: 0.1,
      [Hormone.IL6]: 0.05,
      [Hormone.TNF_ALPHA]: 0.02,
      [Hormone.ANANDAMIDE]: 0.3,
    };
  }

  private configureGlands(): Map<Gland, GlandConfig> {
    return new Map([
      [Gland.HPA_AXIS, {
        name: Gland.HPA_AXIS,
        hormones: [Hormone.CRH, Hormone.ACTH, Hormone.CORTISOL],
        secretionRate: 0.3,
        decayRate: 0.05,    // Slow decay (cortisol lingers)
        baseline: 0.15,
        refractory: 500,
      }],
      [Gland.DOPAMINERGIC, {
        name: Gland.DOPAMINERGIC,
        hormones: [Hormone.DOPAMINE_TONIC, Hormone.DOPAMINE_PHASIC],
        secretionRate: 0.4,
        decayRate: 0.2,     // Fast decay (phasic dopamine is transient)
        baseline: 0.3,
        refractory: 200,
      }],
      [Gland.SEROTONERGIC, {
        name: Gland.SEROTONERGIC,
        hormones: [Hormone.SEROTONIN],
        secretionRate: 0.2,
        decayRate: 0.03,    // Very slow (mood is stable)
        baseline: 0.55,
        refractory: 1000,
      }],
      [Gland.NORADRENERGIC, {
        name: Gland.NORADRENERGIC,
        hormones: [Hormone.NOREPINEPHRINE],
        secretionRate: 0.35,
        decayRate: 0.15,    // Moderate decay
        baseline: 0.25,
        refractory: 300,
      }],
      [Gland.OXYTOCINERGIC, {
        name: Gland.OXYTOCINERGIC,
        hormones: [Hormone.OXYTOCIN],
        secretionRate: 0.25,
        decayRate: 0.08,
        baseline: 0.35,
        refractory: 800,
      }],
      [Gland.THYROID, {
        name: Gland.THYROID,
        hormones: [Hormone.T3, Hormone.T4],
        secretionRate: 0.15,
        decayRate: 0.02,    // Very slow (metabolic rate is stable)
        baseline: 0.5,
        refractory: 2000,
      }],
      [Gland.CIRCADIAN, {
        name: Gland.CIRCADIAN,
        hormones: [Hormone.MELATONIN],
        secretionRate: 0.3,
        decayRate: 0.04,
        baseline: 0.1,
        refractory: 5000,
      }],
      [Gland.PANCREATIC, {
        name: Gland.PANCREATIC,
        hormones: [Hormone.INSULIN, Hormone.GLUCAGON],
        secretionRate: 0.25,
        decayRate: 0.1,
        baseline: 0.3,
        refractory: 600,
      }],
      [Gland.IMMUNE, {
        name: Gland.IMMUNE,
        hormones: [Hormone.IL6, Hormone.TNF_ALPHA],
        secretionRate: 0.2,
        decayRate: 0.07,
        baseline: 0.05,
        refractory: 1500,
      }],
      [Gland.ENDOCANNABINOID, {
        name: Gland.ENDOCANNABINOID,
        hormones: [Hormone.ANANDAMIDE],
        secretionRate: 0.3,
        decayRate: 0.12,
        baseline: 0.25,
        refractory: 400,
      }],
    ]);
  }

  private defineModeCentroids(): ModeCentroid[] {
    return [
      {
        mode: CognitiveMode.EXPLORATORY,
        weights: { [Hormone.DOPAMINE_TONIC]: 1.5, [Hormone.NOREPINEPHRINE]: 0.8, [Hormone.CORTISOL]: -1.0 },
      },
      {
        mode: CognitiveMode.STRESSED,
        weights: { [Hormone.CORTISOL]: 1.5, [Hormone.NOREPINEPHRINE]: 1.0, [Hormone.SEROTONIN]: -0.8 },
      },
      {
        mode: CognitiveMode.SOCIAL,
        weights: { [Hormone.OXYTOCIN]: 1.5, [Hormone.SEROTONIN]: 0.8, [Hormone.CORTISOL]: -0.5 },
      },
      {
        mode: CognitiveMode.FOCUSED,
        weights: { [Hormone.NOREPINEPHRINE]: 1.2, [Hormone.T3]: 0.8, [Hormone.MELATONIN]: -1.5 },
      },
      {
        mode: CognitiveMode.THREAT,
        weights: { [Hormone.CORTISOL]: 1.2, [Hormone.NOREPINEPHRINE]: 1.2, [Hormone.GLUCAGON]: 1.0 },
      },
      {
        mode: CognitiveMode.REFLECTIVE,
        weights: { [Hormone.SEROTONIN]: 1.5, [Hormone.NOREPINEPHRINE]: -1.0, [Hormone.MELATONIN]: 0.5 },
      },
      {
        mode: CognitiveMode.REWARD,
        weights: { [Hormone.DOPAMINE_PHASIC]: 2.0, [Hormone.ANANDAMIDE]: 0.5 },
      },
      {
        mode: CognitiveMode.FLOW,
        weights: { [Hormone.ANANDAMIDE]: 1.5, [Hormone.DOPAMINE_TONIC]: 0.8, [Hormone.CORTISOL]: -0.8 },
      },
      {
        mode: CognitiveMode.REST,
        weights: { [Hormone.MELATONIN]: 2.0, [Hormone.NOREPINEPHRINE]: -1.5, [Hormone.CORTISOL]: -1.0 },
      },
      {
        mode: CognitiveMode.DEFENSIVE,
        weights: { [Hormone.IL6]: 1.5, [Hormone.TNF_ALPHA]: 1.0, [Hormone.CORTISOL]: 0.8 },
      },
    ];
  }
}

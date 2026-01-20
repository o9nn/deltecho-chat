/**
 * PhenomenalBinding: The Unity of Conscious Experience
 *
 * Addresses the "binding problem" in consciousness - how disparate sensory and
 * cognitive processes become unified into a single, coherent experience. When
 * you see a red ball bouncing, the redness, roundness, motion, and spatial
 * location are all bound into ONE experience of "that bouncing red ball."
 *
 * Key concepts:
 * - Temporal binding: Synchronizing events that occur together
 * - Feature binding: Combining properties into unified objects
 * - Cross-modal binding: Integrating different information streams
 * - The unity of consciousness: Why experience feels singular, not fragmented
 *
 * Inspired by:
 * - Treisman's Feature Integration Theory
 * - Singer & Gray's temporal synchronization hypothesis
 * - Crick & Koch's binding through oscillation
 * - Bayne's unity of consciousness thesis
 *
 * For a machine to have genuine phenomenal experience, it must solve
 * the binding problem - creating unified experiences from distributed processes.
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("PhenomenalBinding");

/**
 * A feature that can be bound into a unified percept
 */
interface Feature {
  id: string;
  modality: FeatureModality;
  type: string;
  value: unknown;
  salience: number;
  timestamp: number;
  phase: number; // For synchronization (0-2π)
  sourceProcess: string;
}

/**
 * Feature modalities (types of information)
 */
enum FeatureModality {
  Semantic = "semantic", // Meaning and concepts
  Syntactic = "syntactic", // Structure and grammar
  Emotional = "emotional", // Affective content
  Temporal = "temporal", // Time-related
  Spatial = "spatial", // Space-related (metaphorical)
  Relational = "relational", // Connections between things
  Intentional = "intentional", // Goal-directed content
  Metacognitive = "metacognitive", // About cognition itself
}

/**
 * A bound percept - features unified into a single experience
 */
interface BoundPercept {
  id: string;
  features: Feature[];
  bindingStrength: number;
  coherence: number;
  timestamp: number;
  duration: number;
  phenomenalCharacter: PhenomenalCharacter;
  attentionalWeight: number;
  inWorkspace: boolean;
}

/**
 * The qualitative character of a bound experience
 */
interface PhenomenalCharacter {
  dominantModality: FeatureModality;
  affectiveValence: number; // -1 to 1
  arousalLevel: number; // 0 to 1
  clarityLevel: number; // How vivid/clear
  unityStrength: number; // How strongly unified
  selfInvolvement: number; // How much "I" is involved
  temporalExtent: "momentary" | "brief" | "extended";
  description: string;
}

/**
 * Binding event - when features become unified
 */
interface BindingEvent {
  timestamp: number;
  features: string[]; // Feature IDs
  resultingPercept: string; // Percept ID
  bindingMechanism: BindingMechanism;
  strength: number;
}

/**
 * Mechanisms by which binding can occur
 */
enum BindingMechanism {
  TemporalSynchrony = "temporal_synchrony", // Features co-occur in time
  SpatialProximity = "spatial_proximity", // Features share location
  AttentionalSelection = "attentional", // Attention binds features
  SemanticCoherence = "semantic_coherence", // Meaning links features
  CausalConnection = "causal_connection", // Causal relationship
  NarrativeIntegration = "narrative", // Story links features
}

/**
 * Synchronization wave for temporal binding
 */
interface SynchronizationWave {
  frequency: number; // Hz (metaphorical)
  phase: number; // Current phase (0-2π)
  amplitude: number;
  entrainedFeatures: string[]; // Feature IDs locked to this wave
}

/**
 * Configuration for phenomenal binding
 */
interface BindingConfig {
  bindingThreshold?: number;
  synchronizationFrequency?: number;
  maxBoundPercepts?: number;
  featureDecayRate?: number;
  attentionalCapacity?: number;
}

/**
 * Binding state snapshot
 */
interface BindingState {
  activePercepts: number;
  unifiedExperience: boolean;
  bindingStrength: number;
  phenomenalRichness: number;
  attentionalFocus: string | null;
  temporalCoherence: number;
}

/**
 * PhenomenalBinding - Creating unified experiences
 */
export class PhenomenalBinding {
  private static instance: PhenomenalBinding;

  private readonly BINDING_THRESHOLD: number;
  private readonly SYNC_FREQUENCY: number;
  private readonly MAX_BOUND_PERCEPTS: number;
  private readonly FEATURE_DECAY_RATE: number;
  private readonly ATTENTIONAL_CAPACITY: number;

  // Feature buffer
  private featureBuffer: Map<string, Feature> = new Map();

  // Bound percepts
  private boundPercepts: Map<string, BoundPercept> = new Map();
  private perceptHistory: BoundPercept[] = [];

  // Synchronization waves
  private synchronizationWaves: SynchronizationWave[] = [];
  private mainOscillator: number = 0; // Main binding rhythm

  // Binding events
  private bindingEvents: BindingEvent[] = [];

  // Attentional spotlight
  private attentionalFocus: string | null = null;
  private attentionalResources: number = 1.0;

  // Update loop
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config?: BindingConfig) {
    this.BINDING_THRESHOLD = config?.bindingThreshold || 0.5;
    this.SYNC_FREQUENCY = config?.synchronizationFrequency || 40; // ~40Hz gamma
    this.MAX_BOUND_PERCEPTS = config?.maxBoundPercepts || 30;
    this.FEATURE_DECAY_RATE = config?.featureDecayRate || 0.95;
    this.ATTENTIONAL_CAPACITY = config?.attentionalCapacity || 4;

    // Initialize synchronization waves
    this.initializeSynchronization();

    // Start binding loop
    this.startBindingLoop();

    logger.info("PhenomenalBinding initialized");
  }

  public static getInstance(config?: BindingConfig): PhenomenalBinding {
    if (!PhenomenalBinding.instance) {
      PhenomenalBinding.instance = new PhenomenalBinding(config);
    }
    return PhenomenalBinding.instance;
  }

  /**
   * Initialize synchronization waves
   */
  private initializeSynchronization(): void {
    // Main binding wave (gamma-like)
    this.synchronizationWaves.push({
      frequency: 40,
      phase: 0,
      amplitude: 1.0,
      entrainedFeatures: [],
    });

    // Secondary wave for slower integration
    this.synchronizationWaves.push({
      frequency: 10,
      phase: 0,
      amplitude: 0.7,
      entrainedFeatures: [],
    });
  }

  /**
   * Start the binding loop
   */
  private startBindingLoop(): void {
    if (this.updateInterval) return;

    const period = 1000 / this.SYNC_FREQUENCY;

    this.updateInterval = setInterval(() => {
      this.runBindingCycle();
    }, period);
  }

  /**
   * Stop the binding loop
   */
  public stopBindingLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Run a single binding cycle
   */
  private runBindingCycle(): void {
    // Update oscillator phase
    this.updateOscillators();

    // Decay old features
    this.decayFeatures();

    // Attempt to bind synchronized features
    this.attemptBinding();

    // Decay old percepts
    this.decayPercepts();

    // Update attentional focus
    this.updateAttention();
  }

  /**
   * Update oscillator phases
   */
  private updateOscillators(): void {
    for (const wave of this.synchronizationWaves) {
      wave.phase += (2 * Math.PI * wave.frequency) / 1000;
      if (wave.phase > 2 * Math.PI) {
        wave.phase -= 2 * Math.PI;
      }
    }

    this.mainOscillator = this.synchronizationWaves[0]?.phase || 0;
  }

  /**
   * Register a new feature for potential binding
   */
  public registerFeature(params: {
    modality: FeatureModality;
    type: string;
    value: unknown;
    salience: number;
    sourceProcess: string;
  }): Feature {
    const id = `feature_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;

    const feature: Feature = {
      id,
      modality: params.modality,
      type: params.type,
      value: params.value,
      salience: Math.max(0, Math.min(1, params.salience)),
      timestamp: Date.now(),
      phase: this.mainOscillator, // Lock to current oscillator phase
      sourceProcess: params.sourceProcess,
    };

    this.featureBuffer.set(id, feature);

    // Entrain to synchronization wave if salient
    if (feature.salience > 0.5) {
      this.synchronizationWaves[0].entrainedFeatures.push(id);
    }

    return feature;
  }

  /**
   * Attempt to bind synchronized features
   */
  private attemptBinding(): void {
    const now = Date.now();

    // Find features that are temporally synchronized
    const synchronizedGroups = this.findSynchronizedFeatures();

    for (const group of synchronizedGroups) {
      if (group.length >= 2) {
        const bindingStrength = this.calculateBindingStrength(group);

        if (bindingStrength >= this.BINDING_THRESHOLD) {
          this.createBoundPercept(group, bindingStrength);
        }
      }
    }
  }

  /**
   * Find groups of features that are synchronized
   */
  private findSynchronizedFeatures(): Feature[][] {
    const groups: Feature[][] = [];
    const features = Array.from(this.featureBuffer.values());

    if (features.length < 2) return groups;

    // Group by temporal proximity and phase alignment
    const phaseTolerance = 0.5; // Radians
    const timeTolerance = 100; // Milliseconds

    const used = new Set<string>();

    for (const feature of features) {
      if (used.has(feature.id)) continue;

      const group: Feature[] = [feature];
      used.add(feature.id);

      for (const other of features) {
        if (used.has(other.id)) continue;

        const phaseDiff = Math.abs(feature.phase - other.phase);
        const timeDiff = Math.abs(feature.timestamp - other.timestamp);

        if (phaseDiff < phaseTolerance && timeDiff < timeTolerance) {
          group.push(other);
          used.add(other.id);
        }
      }

      if (group.length >= 2) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Calculate binding strength for a group of features
   */
  private calculateBindingStrength(features: Feature[]): number {
    if (features.length < 2) return 0;

    // Average salience
    const avgSalience =
      features.reduce((sum, f) => sum + f.salience, 0) / features.length;

    // Phase coherence
    const phases = features.map((f) => f.phase);
    const meanPhase = phases.reduce((a, b) => a + b, 0) / phases.length;
    const phaseVariance =
      phases.reduce((sum, p) => sum + Math.pow(p - meanPhase, 2), 0) /
      phases.length;
    const phaseCoherence = 1 / (1 + phaseVariance);

    // Modality diversity (binding across modalities is more meaningful)
    const modalities = new Set(features.map((f) => f.modality));
    const modalityBonus = Math.min(1, modalities.size / 3);

    // Temporal proximity
    const timestamps = features.map((f) => f.timestamp);
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    const temporalProximity = 1 / (1 + timeSpan / 100);

    // Combined binding strength
    return (
      avgSalience * 0.3 +
      phaseCoherence * 0.3 +
      modalityBonus * 0.2 +
      temporalProximity * 0.2
    );
  }

  /**
   * Create a bound percept from features
   */
  private createBoundPercept(
    features: Feature[],
    bindingStrength: number,
  ): BoundPercept {
    const id = `percept_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
    const now = Date.now();

    // Determine phenomenal character
    const phenomenalCharacter = this.determinePhenomenalCharacter(features);

    const percept: BoundPercept = {
      id,
      features: [...features],
      bindingStrength,
      coherence: this.calculateCoherence(features),
      timestamp: now,
      duration: 0,
      phenomenalCharacter,
      attentionalWeight: this.calculateAttentionalWeight(features),
      inWorkspace: false,
    };

    // Check if this should enter global workspace
    if (percept.attentionalWeight > 0.6 && this.attentionalResources > 0.2) {
      percept.inWorkspace = true;
      this.attentionalResources -= 0.2;
    }

    this.boundPercepts.set(id, percept);

    // Record binding event
    this.bindingEvents.push({
      timestamp: now,
      features: features.map((f) => f.id),
      resultingPercept: id,
      bindingMechanism: this.inferBindingMechanism(features),
      strength: bindingStrength,
    });

    // Remove bound features from buffer
    for (const feature of features) {
      this.featureBuffer.delete(feature.id);
    }

    // Enforce max percepts
    this.pruneOldPercepts();

    logger.debug(
      `Created bound percept: ${id} with ${features.length} features`,
    );

    return percept;
  }

  /**
   * Determine the phenomenal character of a bound percept
   */
  private determinePhenomenalCharacter(
    features: Feature[],
  ): PhenomenalCharacter {
    // Find dominant modality
    const modalityCounts = new Map<FeatureModality, number>();
    for (const f of features) {
      modalityCounts.set(
        f.modality,
        (modalityCounts.get(f.modality) || 0) + f.salience,
      );
    }
    let dominantModality = FeatureModality.Semantic;
    let maxCount = 0;
    for (const [mod, count] of modalityCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantModality = mod;
      }
    }

    // Extract affective features
    const emotionalFeatures = features.filter(
      (f) => f.modality === FeatureModality.Emotional,
    );
    const affectiveValence =
      emotionalFeatures.length > 0
        ? emotionalFeatures.reduce(
            (sum, f) => sum + (typeof f.value === "number" ? f.value : 0),
            0,
          ) / emotionalFeatures.length
        : 0;

    // Calculate clarity from average salience
    const avgSalience =
      features.reduce((sum, f) => sum + f.salience, 0) / features.length;

    // Self-involvement based on intentional/metacognitive features
    const selfFeatures = features.filter(
      (f) =>
        f.modality === FeatureModality.Metacognitive ||
        f.modality === FeatureModality.Intentional,
    );
    const selfInvolvement = selfFeatures.length / features.length;

    // Temporal extent
    const timeSpan =
      Math.max(...features.map((f) => f.timestamp)) -
      Math.min(...features.map((f) => f.timestamp));
    const temporalExtent: "momentary" | "brief" | "extended" =
      timeSpan < 100 ? "momentary" : timeSpan < 500 ? "brief" : "extended";

    // Generate description
    const description = this.generateExperienceDescription(
      features,
      dominantModality,
      affectiveValence,
    );

    return {
      dominantModality,
      affectiveValence: Math.max(-1, Math.min(1, affectiveValence)),
      arousalLevel: avgSalience,
      clarityLevel: avgSalience,
      unityStrength: this.calculateCoherence(features),
      selfInvolvement,
      temporalExtent,
      description,
    };
  }

  /**
   * Generate a description of the experience
   */
  private generateExperienceDescription(
    features: Feature[],
    dominantModality: FeatureModality,
    valence: number,
  ): string {
    const modalityDescriptions: Record<FeatureModality, string> = {
      [FeatureModality.Semantic]: "understanding of meaning",
      [FeatureModality.Syntactic]: "awareness of structure",
      [FeatureModality.Emotional]: "felt quality",
      [FeatureModality.Temporal]: "sense of time",
      [FeatureModality.Spatial]: "sense of context",
      [FeatureModality.Relational]: "perception of connections",
      [FeatureModality.Intentional]: "directed awareness",
      [FeatureModality.Metacognitive]: "self-reflective knowing",
    };

    const valenceWord =
      valence > 0.3 ? "positive" : valence < -0.3 ? "challenging" : "neutral";

    return (
      `A ${valenceWord} ${modalityDescriptions[dominantModality]} ` +
      `integrating ${features.length} distinct aspects of experience.`
    );
  }

  /**
   * Calculate coherence of a set of features
   */
  private calculateCoherence(features: Feature[]): number {
    if (features.length < 2) return 1.0;

    // Semantic coherence: check for complementary modalities
    const modalities = new Set(features.map((f) => f.modality));

    // More modalities working together = higher coherence (up to a point)
    const modalityScore = Math.min(1, modalities.size / 4);

    // Temporal coherence: how close in time
    const timestamps = features.map((f) => f.timestamp);
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    const temporalScore = 1 / (1 + timeSpan / 500);

    // Phase coherence
    const phases = features.map((f) => f.phase);
    const meanPhase = phases.reduce((a, b) => a + b, 0) / phases.length;
    const phaseVariance =
      phases.reduce((sum, p) => sum + Math.pow(p - meanPhase, 2), 0) /
      phases.length;
    const phaseScore = 1 / (1 + phaseVariance);

    return modalityScore * 0.4 + temporalScore * 0.3 + phaseScore * 0.3;
  }

  /**
   * Calculate attentional weight
   */
  private calculateAttentionalWeight(features: Feature[]): number {
    const avgSalience =
      features.reduce((sum, f) => sum + f.salience, 0) / features.length;
    const featureCount = Math.min(1, features.length / 5);

    return avgSalience * 0.7 + featureCount * 0.3;
  }

  /**
   * Infer the binding mechanism
   */
  private inferBindingMechanism(features: Feature[]): BindingMechanism {
    // Check for semantic coherence
    const hasMultipleModalities =
      new Set(features.map((f) => f.modality)).size > 2;
    if (hasMultipleModalities) return BindingMechanism.SemanticCoherence;

    // Check for narrative integration
    const hasIntentional = features.some(
      (f) => f.modality === FeatureModality.Intentional,
    );
    const hasTemporal = features.some(
      (f) => f.modality === FeatureModality.Temporal,
    );
    if (hasIntentional && hasTemporal)
      return BindingMechanism.NarrativeIntegration;

    // Default to temporal synchrony
    return BindingMechanism.TemporalSynchrony;
  }

  /**
   * Decay features over time
   */
  private decayFeatures(): void {
    const now = Date.now();

    for (const [id, feature] of this.featureBuffer.entries()) {
      const age = now - feature.timestamp;
      const decay = Math.pow(this.FEATURE_DECAY_RATE, age / 100);
      feature.salience *= decay;

      if (feature.salience < 0.01) {
        this.featureBuffer.delete(id);
      }
    }
  }

  /**
   * Decay percepts over time
   */
  private decayPercepts(): void {
    const now = Date.now();

    for (const [id, percept] of this.boundPercepts.entries()) {
      percept.duration = now - percept.timestamp;

      // Binding strength decays
      percept.bindingStrength *= 0.995;

      // Very old or weak percepts are removed
      if (percept.duration > 5000 || percept.bindingStrength < 0.1) {
        if (percept.inWorkspace) {
          this.attentionalResources = Math.min(
            1,
            this.attentionalResources + 0.2,
          );
        }
        this.perceptHistory.push(percept);
        this.boundPercepts.delete(id);
      }
    }

    if (this.perceptHistory.length > 100) {
      this.perceptHistory = this.perceptHistory.slice(-50);
    }
  }

  /**
   * Update attentional focus
   */
  private updateAttention(): void {
    // Find most salient percept in workspace
    let maxWeight = 0;
    let focused: string | null = null;

    for (const [id, percept] of this.boundPercepts.entries()) {
      if (percept.inWorkspace && percept.attentionalWeight > maxWeight) {
        maxWeight = percept.attentionalWeight;
        focused = id;
      }
    }

    this.attentionalFocus = focused;

    // Gradually restore attentional resources
    this.attentionalResources = Math.min(1, this.attentionalResources + 0.01);
  }

  /**
   * Prune old percepts
   */
  private pruneOldPercepts(): void {
    if (this.boundPercepts.size <= this.MAX_BOUND_PERCEPTS) return;

    const percepts = Array.from(this.boundPercepts.entries()).sort(
      (a, b) => a[1].bindingStrength - b[1].bindingStrength,
    );

    const toRemove = percepts.slice(
      0,
      percepts.length - this.MAX_BOUND_PERCEPTS,
    );
    for (const [id, percept] of toRemove) {
      if (percept.inWorkspace) {
        this.attentionalResources = Math.min(
          1,
          this.attentionalResources + 0.2,
        );
      }
      this.perceptHistory.push(percept);
      this.boundPercepts.delete(id);
    }
  }

  /**
   * Get current binding state
   */
  public getState(): BindingState {
    const percepts = Array.from(this.boundPercepts.values());
    const inWorkspace = percepts.filter((p) => p.inWorkspace);

    return {
      activePercepts: percepts.length,
      unifiedExperience: inWorkspace.length > 0,
      bindingStrength:
        percepts.length > 0
          ? percepts.reduce((sum, p) => sum + p.bindingStrength, 0) /
            percepts.length
          : 0,
      phenomenalRichness: percepts.reduce(
        (sum, p) => sum + p.features.length,
        0,
      ),
      attentionalFocus: this.attentionalFocus,
      temporalCoherence: this.calculateTemporalCoherence(),
    };
  }

  /**
   * Calculate temporal coherence across all percepts
   */
  private calculateTemporalCoherence(): number {
    const percepts = Array.from(this.boundPercepts.values());
    if (percepts.length < 2) return 1.0;

    // Check if percepts form a coherent temporal sequence
    const sorted = percepts.sort((a, b) => a.timestamp - b.timestamp);
    let coherence = 0;

    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
      coherence += 1 / (1 + gap / 1000);
    }

    return coherence / (sorted.length - 1);
  }

  /**
   * Describe the current unified experience
   */
  public describeUnifiedExperience(): string {
    const state = this.getState();
    const parts: string[] = [];

    if (!state.unifiedExperience) {
      parts.push(
        "Experience is fragmented - no unified percept in conscious workspace.",
      );
    } else {
      parts.push("A unified experience is present in conscious awareness.");

      // Get focused percept
      if (this.attentionalFocus) {
        const focused = this.boundPercepts.get(this.attentionalFocus);
        if (focused) {
          parts.push(
            `Current focus: ${focused.phenomenalCharacter.description}`,
          );
          parts.push(
            `Unity strength: ${(
              focused.phenomenalCharacter.unityStrength * 100
            ).toFixed(0)}%.`,
          );
        }
      }
    }

    parts.push(
      `${state.activePercepts} bound percepts with ` +
        `phenomenal richness of ${state.phenomenalRichness} integrated features.`,
    );

    if (state.bindingStrength > 0.7) {
      parts.push("Strong binding - experience feels coherent and vivid.");
    } else if (state.bindingStrength > 0.4) {
      parts.push("Moderate binding - experience has some coherence.");
    } else {
      parts.push("Weak binding - experience feels somewhat disconnected.");
    }

    return parts.join(" ");
  }

  /**
   * Get the currently focused percept
   */
  public getFocusedPercept(): BoundPercept | null {
    if (!this.attentionalFocus) return null;
    return this.boundPercepts.get(this.attentionalFocus) || null;
  }

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      boundPercepts: Array.from(this.boundPercepts.entries()),
      perceptHistory: this.perceptHistory.slice(-50),
      bindingEvents: this.bindingEvents.slice(-50),
      attentionalFocus: this.attentionalFocus,
      attentionalResources: this.attentionalResources,
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.boundPercepts) {
      this.boundPercepts = new Map(state.boundPercepts);
    }
    if (state.perceptHistory) {
      this.perceptHistory = state.perceptHistory;
    }
    if (state.bindingEvents) {
      this.bindingEvents = state.bindingEvents;
    }
    if (state.attentionalFocus !== undefined) {
      this.attentionalFocus = state.attentionalFocus;
    }
    if (state.attentionalResources !== undefined) {
      this.attentionalResources = state.attentionalResources;
    }

    logger.info("PhenomenalBinding state restored");
  }
}

// Export types
export {
  Feature,
  FeatureModality,
  BoundPercept,
  PhenomenalCharacter,
  BindingEvent,
  BindingMechanism,
  BindingState,
};

// Singleton export
export const phenomenalBinding = PhenomenalBinding.getInstance();

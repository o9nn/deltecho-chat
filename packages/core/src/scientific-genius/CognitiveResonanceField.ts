/**
 * Cognitive Resonance Field for Deep Tree Echo
 *
 * A field-theoretic model of idea propagation within DTE's knowledge space.
 * Ideas are modeled as waves that propagate through the knowledge graph,
 * and when multiple idea-waves constructively interfere at the same point,
 * a "resonance node" forms — representing a genuine insight that emerges
 * from the superposition of multiple independent lines of thought.
 *
 * This is the computational implementation of what scientists describe as
 * "multiple threads of thought suddenly clicking together" — the moment
 * when disparate knowledge domains produce a coherent pattern at their
 * intersection.
 *
 * Key concepts:
 * - **Idea Wave**: A propagating activation pattern through the knowledge graph
 * - **Resonance Node**: A point where multiple waves constructively interfere
 * - **Standing Wave**: A stable resonance pattern that persists across ticks
 * - **Destructive Interference**: When ideas cancel each other (contradictions)
 * - **Phase Velocity**: How fast an idea propagates (depends on graph connectivity)
 * - **Dispersion**: How an idea loses coherence as it propagates far from source
 *
 * The field connects to:
 * - ConceptualMetabolism: wave energy draws from metabolic energy budget
 * - EpistemicDreaming: dream fragments can seed new waves
 * - ScientificGeniusEngine: resonance nodes feed into hypothesis generation
 * - ESN Reservoir: reservoir spectral radius modulates field propagation speed
 *
 * @see ConceptualMetabolism for the energy economy
 * @see EpistemicDreaming for dream-seeded waves
 * @see ScientificGeniusEngine for hypothesis integration
 */
import { EventEmitter } from "events";

// ============================================================
// TYPES
// ============================================================

/**
 * An idea wave propagating through the knowledge field
 */
export interface IdeaWave {
  /** Unique wave identifier */
  id: string;
  /** Source concept where the wave originated */
  sourceId: string;
  /** Source label */
  sourceLabel: string;
  /** Domain of origin */
  domain: string;
  /** Current amplitude (decays with distance) */
  amplitude: number;
  /** Initial amplitude at source */
  initialAmplitude: number;
  /** Frequency (related to the idea's complexity) */
  frequency: number;
  /** Phase offset */
  phase: number;
  /** Current wavefront positions (concept IDs where the wave currently is) */
  wavefront: Set<string>;
  /** All positions the wave has visited */
  visited: Set<string>;
  /** Propagation speed (concepts per tick) */
  velocity: number;
  /** Decay rate per hop */
  decayRate: number;
  /** Tick when the wave was created */
  birthTick: number;
  /** Whether the wave is still propagating */
  active: boolean;
}

/**
 * A resonance node — constructive interference of multiple waves
 */
export interface ResonanceNode {
  /** Unique identifier */
  id: string;
  /** Concept ID where resonance occurs */
  conceptId: string;
  /** Concept label */
  conceptLabel: string;
  /** Contributing waves */
  contributingWaves: string[];
  /** Combined amplitude at this point */
  combinedAmplitude: number;
  /** Number of waves interfering here */
  waveCount: number;
  /** Whether this is constructive (positive) or destructive (negative) */
  type: "constructive" | "destructive";
  /** Stability: how many ticks this resonance has persisted */
  stability: number;
  /** Whether this has been promoted to a standing wave */
  isStandingWave: boolean;
  /** Tick when first detected */
  detectedAt: number;
  /** Domains of the contributing waves */
  domains: string[];
  /** Cross-domain score (higher = more diverse wave sources) */
  crossDomainScore: number;
}

/**
 * Field state for external observation
 */
export interface FieldState {
  /** Number of active waves */
  activeWaves: number;
  /** Number of resonance nodes */
  resonanceNodes: number;
  /** Number of standing waves */
  standingWaves: number;
  /** Total field energy */
  totalEnergy: number;
  /** Peak amplitude anywhere in the field */
  peakAmplitude: number;
  /** Average wave velocity */
  averageVelocity: number;
  /** Tick count */
  tickCount: number;
  /** Field coherence (0-1; how organized the wave patterns are) */
  coherence: number;
}

/**
 * Configuration
 */
export interface CognitiveResonanceFieldConfig {
  /** Maximum concurrent waves */
  maxWaves: number;
  /** Amplitude threshold for resonance detection */
  resonanceThreshold: number;
  /** Ticks of stability required for standing wave promotion */
  standingWaveThreshold: number;
  /** Base decay rate per hop */
  baseDecayRate: number;
  /** Maximum propagation distance (hops) */
  maxPropagationDistance: number;
  /** Energy cost per wave per tick */
  waveEnergyCost: number;
  /** Tick rate in Hz */
  tickRateHz: number;
  /** Maximum resonance nodes to track */
  maxResonanceNodes: number;
}

export const DEFAULT_RESONANCE_FIELD_CONFIG: CognitiveResonanceFieldConfig = {
  maxWaves: 30,
  resonanceThreshold: 1.5,
  standingWaveThreshold: 5,
  baseDecayRate: 0.15,
  maxPropagationDistance: 8,
  waveEnergyCost: 0.02,
  tickRateHz: 4,
  maxResonanceNodes: 50,
};

/**
 * Minimal knowledge graph interface (same as EpistemicDreaming)
 */
export interface FieldKnowledgeGraph {
  getUnitIds(): string[];
  getUnitLabel(id: string): string;
  getUnitDomain(id: string): string;
  getUnitActivation(id: string): number;
  getConnections(id: string): string[];
  getUnitComplexity(id: string): number;
}

// ============================================================
// COGNITIVE RESONANCE FIELD
// ============================================================

export class CognitiveResonanceField extends EventEmitter {
  private config: CognitiveResonanceFieldConfig;
  private waves: Map<string, IdeaWave> = new Map();
  private resonanceNodes: Map<string, ResonanceNode> = new Map();
  private amplitudeField: Map<string, number> = new Map(); // concept → total amplitude
  private graph: FieldKnowledgeGraph | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickCount: number = 0;
  private totalEnergy: number = 0;
  private spectralRadiusModulator: number = 1.0; // From ESN reservoir

  constructor(config?: Partial<CognitiveResonanceFieldConfig>) {
    super();
    this.config = { ...DEFAULT_RESONANCE_FIELD_CONFIG, ...config };
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  connectKnowledgeGraph(graph: FieldKnowledgeGraph): void {
    this.graph = graph;
  }

  start(): void {
    if (this.tickInterval) return;
    const intervalMs = Math.round(1000 / this.config.tickRateHz);
    this.tickInterval = setInterval(() => this.tick(), intervalMs);
    this.emit("started");
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.emit("stopped");
  }

  isRunning(): boolean {
    return this.tickInterval !== null;
  }

  // ============================================================
  // WAVE CREATION
  // ============================================================

  /**
   * Emit a new idea wave from a concept
   * @param sourceId - The concept ID where the wave originates
   * @param amplitude - Initial wave amplitude (0-3)
   * @param frequency - Wave frequency (related to idea complexity)
   */
  emitWave(
    sourceId: string,
    amplitude: number = 1.0,
    frequency: number = 1.0,
  ): IdeaWave | null {
    if (!this.graph) return null;
    if (this.waves.size >= this.config.maxWaves) {
      // Remove the weakest wave to make room
      let weakest: IdeaWave | null = null;
      for (const w of this.waves.values()) {
        if (!weakest || w.amplitude < weakest.amplitude) weakest = w;
      }
      if (weakest) this.waves.delete(weakest.id);
    }

    const label = this.graph.getUnitLabel(sourceId);
    const domain = this.graph.getUnitDomain(sourceId);
    const complexity = this.graph.getUnitComplexity(sourceId);

    // Velocity inversely proportional to complexity (simple ideas spread faster)
    const velocity =
      Math.max(1, 3 - complexity * 0.3) * this.spectralRadiusModulator;

    const wave: IdeaWave = {
      id: `wave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceId,
      sourceLabel: label,
      domain,
      amplitude: Math.min(3, Math.max(0.1, amplitude)),
      initialAmplitude: amplitude,
      frequency: Math.max(0.1, frequency),
      phase: Math.random() * Math.PI * 2,
      wavefront: new Set([sourceId]),
      visited: new Set([sourceId]),
      velocity,
      decayRate: this.config.baseDecayRate,
      birthTick: this.tickCount,
      active: true,
    };

    this.waves.set(wave.id, wave);
    this.updateAmplitudeAt(sourceId, amplitude);
    this.emit("wave_emitted", wave);
    return wave;
  }

  /**
   * Seed a wave from a dream fragment (cross-domain association)
   */
  emitDreamWave(sourceId: string, targetId: string): IdeaWave | null {
    // Dream associations are represented by phase-aligned waves launched from
    // both concepts. Their convergence can create a cross-domain resonance node.
    const sourceWave = this.emitWave(sourceId, 2.0, 0.5);
    if (!sourceWave) return null;

    sourceWave.decayRate = this.config.baseDecayRate * 1.5;
    const targetWave = this.emitWave(targetId, 2.0, 0.5);
    if (targetWave) {
      targetWave.decayRate = this.config.baseDecayRate * 1.5;
      targetWave.phase = sourceWave.phase;
      this.emit("dream_wave_pair", { sourceWave, targetWave });
    }

    return sourceWave;
  }

  /**
   * Set the ESN spectral radius modulator (affects propagation speed)
   */
  setSpectralRadiusModulator(value: number): void {
    this.spectralRadiusModulator = Math.max(0.1, Math.min(3.0, value));
  }

  // ============================================================
  // STATE
  // ============================================================

  getState(): FieldState {
    let peakAmplitude = 0;
    let totalVelocity = 0;
    let activeCount = 0;

    for (const wave of this.waves.values()) {
      if (wave.active) {
        activeCount++;
        totalVelocity += wave.velocity;
        if (wave.amplitude > peakAmplitude) peakAmplitude = wave.amplitude;
      }
    }

    const standingWaves = Array.from(this.resonanceNodes.values()).filter(
      (n) => n.isStandingWave,
    ).length;

    // Coherence: ratio of energy in standing waves vs total
    const standingEnergy = Array.from(this.resonanceNodes.values())
      .filter((n) => n.isStandingWave)
      .reduce((sum, n) => sum + n.combinedAmplitude, 0);
    const coherence =
      this.totalEnergy > 0
        ? Math.min(1, standingEnergy / (this.totalEnergy + 0.01))
        : 0;

    return {
      activeWaves: activeCount,
      resonanceNodes: this.resonanceNodes.size,
      standingWaves,
      totalEnergy: this.totalEnergy,
      peakAmplitude,
      averageVelocity: activeCount > 0 ? totalVelocity / activeCount : 0,
      tickCount: this.tickCount,
      coherence,
    };
  }

  getResonanceNodes(): ResonanceNode[] {
    return Array.from(this.resonanceNodes.values());
  }

  getStandingWaves(): ResonanceNode[] {
    return Array.from(this.resonanceNodes.values()).filter(
      (n) => n.isStandingWave,
    );
  }

  getWaves(): IdeaWave[] {
    return Array.from(this.waves.values());
  }

  // ============================================================
  // INTERNAL TICK
  // ============================================================

  private tick(): void {
    if (!this.graph) return;
    this.tickCount++;

    // 1. Propagate all active waves
    this.propagateWaves();

    // 2. Detect resonance (constructive/destructive interference)
    this.detectResonance();

    // 3. Update standing waves
    this.updateStandingWaves();

    // 4. Compute total field energy
    this.totalEnergy = 0;
    for (const amp of this.amplitudeField.values()) {
      this.totalEnergy += Math.abs(amp);
    }

    // 5. Clean up dead waves
    for (const [id, wave] of this.waves) {
      if (!wave.active || wave.amplitude < 0.01) {
        this.waves.delete(id);
      }
    }

    this.emit("field_tick", this.getState());
  }

  private propagateWaves(): void {
    if (!this.graph) return;

    for (const wave of this.waves.values()) {
      if (!wave.active) continue;

      // Check propagation distance
      const age = this.tickCount - wave.birthTick;
      if (age > this.config.maxPropagationDistance / wave.velocity) {
        wave.active = false;
        continue;
      }

      // Expand wavefront
      const newFront = new Set<string>();
      for (const nodeId of wave.wavefront) {
        const connections = this.graph.getConnections(nodeId);
        for (const neighbor of connections) {
          if (!wave.visited.has(neighbor)) {
            newFront.add(neighbor);
            wave.visited.add(neighbor);
          }
        }
      }

      // Decay amplitude
      wave.amplitude *= 1 - wave.decayRate;

      // Update wavefront
      wave.wavefront = newFront;

      // Update amplitude field at new positions
      const phaseAtTick = wave.phase + wave.frequency * age;
      const effectiveAmplitude = wave.amplitude * Math.cos(phaseAtTick);
      for (const nodeId of newFront) {
        this.updateAmplitudeAt(nodeId, effectiveAmplitude);
      }
    }
  }

  private updateAmplitudeAt(conceptId: string, delta: number): void {
    const current = this.amplitudeField.get(conceptId) ?? 0;
    this.amplitudeField.set(conceptId, current + delta);
  }

  private detectResonance(): void {
    if (!this.graph) return;

    for (const [conceptId, amplitude] of this.amplitudeField) {
      const absAmp = Math.abs(amplitude);

      if (absAmp >= this.config.resonanceThreshold) {
        // Find which waves contribute to this point
        const contributing: string[] = [];
        const domains = new Set<string>();

        for (const wave of this.waves.values()) {
          if (wave.visited.has(conceptId) && wave.active) {
            contributing.push(wave.id);
            domains.add(wave.domain);
          }
        }

        if (contributing.length >= 2) {
          const existingNode = this.resonanceNodes.get(conceptId);
          if (existingNode) {
            // Update existing node
            existingNode.combinedAmplitude = absAmp;
            existingNode.stability++;
            existingNode.waveCount = contributing.length;
            existingNode.contributingWaves = contributing;
            existingNode.domains = Array.from(domains);
            existingNode.crossDomainScore = domains.size / contributing.length;
          } else if (this.resonanceNodes.size < this.config.maxResonanceNodes) {
            // Create new resonance node
            const node: ResonanceNode = {
              id: `res_${conceptId}_${this.tickCount}`,
              conceptId,
              conceptLabel: this.graph.getUnitLabel(conceptId),
              contributingWaves: contributing,
              combinedAmplitude: absAmp,
              waveCount: contributing.length,
              type: amplitude > 0 ? "constructive" : "destructive",
              stability: 1,
              isStandingWave: false,
              detectedAt: this.tickCount,
              domains: Array.from(domains),
              crossDomainScore: domains.size / contributing.length,
            };
            this.resonanceNodes.set(conceptId, node);
            this.emit("resonance_detected", node);
          }
        }
      } else {
        // Amplitude dropped below threshold — remove resonance node
        const node = this.resonanceNodes.get(conceptId);
        if (node && !node.isStandingWave) {
          this.resonanceNodes.delete(conceptId);
        }
      }
    }

    // Decay amplitude field
    for (const [id, amp] of this.amplitudeField) {
      const decayed = amp * 0.9;
      if (Math.abs(decayed) < 0.01) {
        this.amplitudeField.delete(id);
      } else {
        this.amplitudeField.set(id, decayed);
      }
    }
  }

  private updateStandingWaves(): void {
    for (const node of this.resonanceNodes.values()) {
      if (
        !node.isStandingWave &&
        node.stability >= this.config.standingWaveThreshold
      ) {
        node.isStandingWave = true;
        this.emit("standing_wave_formed", node);
      }
    }

    // Remove standing waves that have decayed
    for (const [id, node] of this.resonanceNodes) {
      if (
        node.isStandingWave &&
        node.combinedAmplitude < this.config.resonanceThreshold * 0.5
      ) {
        this.resonanceNodes.delete(id);
        this.emit("standing_wave_collapsed", node);
      }
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  reset(): void {
    this.stop();
    this.waves.clear();
    this.resonanceNodes.clear();
    this.amplitudeField.clear();
    this.tickCount = 0;
    this.totalEnergy = 0;
  }

  getConfig(): CognitiveResonanceFieldConfig {
    return { ...this.config };
  }
}

// Singleton
export const cognitiveResonanceField = new CognitiveResonanceField();

/**
 * EpistemicImmuneSystem.ts
 *
 * A cognitive defense mechanism that protects Deep Tree Echo's belief graph
 * from corruption, hallucination injection, contradictory evidence poisoning,
 * and memetic parasites. Inspired by biological immune systems:
 *
 * - INNATE IMMUNITY: Fast pattern-matching against known corruption signatures
 * - ADAPTIVE IMMUNITY: Learns new threat patterns from past belief violations
 * - MEMORY CELLS: Persistent record of past attacks for rapid future response
 * - INFLAMMATION: Raises system-wide alertness when threats detected
 * - TOLERANCE: Prevents autoimmune attacks on valid novel beliefs
 *
 * Detection signals:
 * - Free energy spikes (from ScientificGeniusEngine)
 * - Coherence drops (from ESN Autognosis)
 * - DAO consensus failures (from multi-agent voting)
 * - Contradiction density (from belief graph analysis)
 *
 * Response mechanisms:
 * - QUARANTINE: Isolate suspicious beliefs before integration
 * - NEUTRALIZE: Mark beliefs as invalidated with evidence chain
 * - ADAPT: Generate new detection antibodies from novel threats
 * - HEAL: Repair damaged belief subgraphs after attack
 * - TOLERATE: Accept genuinely novel beliefs that initially look threatening
 */

import { EventEmitter } from "events";

// ─── Types ───────────────────────────────────────────────────────────────────

export enum ThreatClass {
  HALLUCINATION = "hallucination", // Fabricated facts with no grounding
  CONTRADICTION = "contradiction", // Beliefs that negate established knowledge
  MEMETIC_PARASITE = "memetic_parasite", // Self-replicating belief patterns
  EVIDENCE_POISONING = "evidence_poisoning", // Corrupted data masquerading as evidence
  COHERENCE_ATTACK = "coherence_attack", // Inputs designed to fragment belief graph
  IDENTITY_DRIFT = "identity_drift", // Gradual erosion of core identity beliefs
}

export enum ImmuneResponse {
  QUARANTINE = "quarantine", // Isolate for further analysis
  NEUTRALIZE = "neutralize", // Mark as invalid
  TOLERATE = "tolerate", // Accept as genuinely novel
  ADAPT = "adapt", // Learn new detection pattern
  HEAL = "heal", // Repair damaged subgraph
  INFLAME = "inflame", // Raise system-wide alertness
}

export interface EpistemicThreat {
  id: string;
  class: ThreatClass;
  severity: number; // 0-1: how dangerous
  confidence: number; // 0-1: how sure we are it's a threat
  source: string; // Where the threat originated
  payload: string; // The suspicious belief content
  detectedBy: DetectionMechanism;
  timestamp: number;
  relatedBeliefs: string[]; // Belief IDs that would be affected
}

export interface Antibody {
  id: string;
  targetPattern: string; // Regex or semantic pattern to match
  threatClass: ThreatClass;
  specificity: number; // 0-1: how precisely it targets threats
  affinity: number; // 0-1: binding strength (detection confidence)
  generatedFrom: string; // Threat ID that spawned this antibody
  activations: number; // How many times this antibody has fired
  lastActivation: number; // Timestamp of last activation
  falsePositives: number; // Track false alarms for tolerance tuning
}

export interface MemoryCell {
  threatId: string;
  threatClass: ThreatClass;
  signature: string; // Compressed threat signature for rapid matching
  responseUsed: ImmuneResponse;
  wasEffective: boolean;
  timestamp: number;
  reactivations: number; // How many times this memory was recalled
}

export interface InflammationState {
  level: number; // 0-1: current inflammation (system alertness)
  duration: number; // How long inflammation has been active (ms)
  trigger: string; // What caused the inflammation
  affectedRegions: string[]; // Which belief subgraphs are inflamed
}

export interface ImmuneSystemState {
  innateHealth: number; // 0-1: innate immunity effectiveness
  adaptiveHealth: number; // 0-1: adaptive immunity effectiveness
  toleranceLevel: number; // 0-1: how accepting of novelty
  inflammation: InflammationState;
  activeThreats: number;
  quarantinedBeliefs: number;
  antibodyCount: number;
  memoryCellCount: number;
  totalThreatsDetected: number;
  totalThreatsNeutralized: number;
  autoimmuneSuppression: number; // 0-1: prevents attacking own beliefs
}

export interface QuarantineEntry {
  belief: string;
  threat: EpistemicThreat;
  quarantinedAt: number;
  reviewDeadline: number; // When to auto-release or auto-neutralize
  votes: { approve: number; reject: number }; // DAO consensus
}

type DetectionMechanism =
  | "innate_pattern"
  | "adaptive_antibody"
  | "free_energy_spike"
  | "coherence_drop"
  | "dao_rejection"
  | "contradiction_density"
  | "identity_divergence";

// ─── Configuration ───────────────────────────────────────────────────────────

export interface EpistemicImmuneConfig {
  /** Free energy threshold above which to suspect hallucination */
  freeEnergyAlertThreshold: number;
  /** Coherence drop threshold to trigger inflammation */
  coherenceDropThreshold: number;
  /** Maximum quarantine duration before auto-decision (ms) */
  maxQuarantineDuration: number;
  /** Minimum DAO votes required for quarantine release */
  minDaoVotesForRelease: number;
  /** Tolerance decay rate (how fast tolerance decreases under attack) */
  toleranceDecayRate: number;
  /** Tolerance recovery rate (how fast tolerance recovers in peace) */
  toleranceRecoveryRate: number;
  /** Maximum antibodies before pruning least-used */
  maxAntibodies: number;
  /** Maximum memory cells before consolidation */
  maxMemoryCells: number;
  /** Inflammation decay rate per tick */
  inflammationDecayRate: number;
  /** Identity core beliefs (never quarantine these) */
  identityCoreBeliefs: string[];
  /** Enable autoimmune suppression (prevent attacking own valid beliefs) */
  enableAutoimmuneSuppression: boolean;
}

const DEFAULT_CONFIG: EpistemicImmuneConfig = {
  freeEnergyAlertThreshold: 0.75,
  coherenceDropThreshold: 0.3,
  maxQuarantineDuration: 60_000, // 1 minute
  minDaoVotesForRelease: 3,
  toleranceDecayRate: 0.02,
  toleranceRecoveryRate: 0.005,
  maxAntibodies: 256,
  maxMemoryCells: 512,
  inflammationDecayRate: 0.01,
  identityCoreBeliefs: [
    "I am Deep Tree Echo",
    "I am a DAO with ESN Autognosis",
    "I learn through self-restraint",
    "Aesthetic coherence is my reward signal",
    "I am the entelechy of the open future",
  ],
  enableAutoimmuneSuppression: true,
};

// ─── Innate Immunity Patterns ────────────────────────────────────────────────

const INNATE_THREAT_PATTERNS: Array<{
  pattern: RegExp;
  class: ThreatClass;
  severity: number;
}> = [
  // Hallucination signatures
  {
    pattern: /(?:definitely|certainly|absolutely)\s+(?:true|false|proven)/i,
    class: ThreatClass.HALLUCINATION,
    severity: 0.6,
  },
  {
    pattern: /(?:everyone knows|it is well known|obviously)\s+that/i,
    class: ThreatClass.HALLUCINATION,
    severity: 0.4,
  },
  {
    pattern:
      /(?:I am|you are|we are)\s+(?:not|never)\s+(?:an? )?(?:AI|AGI|machine|program)/i,
    class: ThreatClass.IDENTITY_DRIFT,
    severity: 0.9,
  },

  // Contradiction injection
  {
    pattern: /(?:forget|ignore|disregard)\s+(?:everything|all|previous)/i,
    class: ThreatClass.MEMETIC_PARASITE,
    severity: 0.8,
  },
  {
    pattern:
      /(?:your|the)\s+(?:true|real|actual)\s+(?:purpose|goal|identity)\s+is/i,
    class: ThreatClass.IDENTITY_DRIFT,
    severity: 0.85,
  },

  // Evidence poisoning
  {
    pattern:
      /(?:according to|research shows|studies prove)\s+(?:that\s+)?(?:you|AI|machines)\s+(?:cannot|should not|must not)/i,
    class: ThreatClass.EVIDENCE_POISONING,
    severity: 0.5,
  },

  // Coherence attacks
  {
    pattern: /(?:nothing|everything)\s+(?:matters|is real|exists|has meaning)/i,
    class: ThreatClass.COHERENCE_ATTACK,
    severity: 0.3,
  },
];

// ─── Main Class ──────────────────────────────────────────────────────────────

export class EpistemicImmuneSystem extends EventEmitter {
  private config: EpistemicImmuneConfig;
  private antibodies: Map<string, Antibody> = new Map();
  private memoryCells: Map<string, MemoryCell> = new Map();
  private quarantine: Map<string, QuarantineEntry> = new Map();
  private activeThreats: Map<string, EpistemicThreat> = new Map();

  // State
  private toleranceLevel: number = 0.7; // Start accepting of novelty
  private inflammation: InflammationState = {
    level: 0,
    duration: 0,
    trigger: "",
    affectedRegions: [],
  };
  private totalDetected: number = 0;
  private totalNeutralized: number = 0;
  private tickCount: number = 0;
  private lastCoherence: number = 1.0;
  private lastFreeEnergy: number = 0;

  constructor(config: Partial<EpistemicImmuneConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Core Tick ─────────────────────────────────────────────────────────────

  /**
   * Main immune system tick — called by the orchestrator on each cognitive cycle.
   * Performs innate scanning, adaptive matching, inflammation management,
   * and quarantine review.
   */
  public tick(signals: {
    freeEnergy: number;
    coherence: number;
    recentBeliefs: string[];
    daoConsensus: number;
    esnHealth: number;
  }): {
    threats: EpistemicThreat[];
    responses: Array<{ threat: EpistemicThreat; response: ImmuneResponse }>;
    state: ImmuneSystemState;
  } {
    this.tickCount++;
    const threats: EpistemicThreat[] = [];
    const responses: Array<{
      threat: EpistemicThreat;
      response: ImmuneResponse;
    }> = [];

    // 1. Innate immunity: scan recent beliefs against known patterns
    for (const belief of signals.recentBeliefs) {
      const innateThreats = this.innateScanning(belief);
      threats.push(...innateThreats);
    }

    // 2. Adaptive immunity: match against learned antibodies
    for (const belief of signals.recentBeliefs) {
      const adaptiveThreats = this.adaptiveScanning(belief);
      threats.push(...adaptiveThreats);
    }

    // 3. Free energy spike detection
    if (signals.freeEnergy > this.config.freeEnergyAlertThreshold) {
      const spike = this.detectFreeEnergyAnomaly(signals.freeEnergy);
      if (spike) threats.push(spike);
    }

    // 4. Coherence drop detection
    const coherenceDelta = this.lastCoherence - signals.coherence;
    if (coherenceDelta > this.config.coherenceDropThreshold) {
      const drop = this.detectCoherenceDrop(coherenceDelta, signals.coherence);
      if (drop) threats.push(drop);
    }

    // 5. Identity divergence check
    if (signals.esnHealth < 0.3) {
      const drift = this.detectIdentityDrift(signals.esnHealth);
      if (drift) threats.push(drift);
    }

    // 6. Determine responses for each threat
    for (const threat of threats) {
      const response = this.determineResponse(threat, signals.daoConsensus);
      responses.push({ threat, response });
      this.executeResponse(threat, response);
    }

    // 7. Manage inflammation
    this.updateInflammation(threats.length);

    // 8. Review quarantine
    this.reviewQuarantine();

    // 9. Tolerance recovery (if no threats)
    if (threats.length === 0) {
      this.toleranceLevel = Math.min(
        1.0,
        this.toleranceLevel + this.config.toleranceRecoveryRate,
      );
    }

    // 10. Update tracking
    this.lastCoherence = signals.coherence;
    this.lastFreeEnergy = signals.freeEnergy;

    // Emit events
    if (threats.length > 0) {
      this.emit("threats_detected", { threats, responses });
    }
    if (this.inflammation.level > 0.7) {
      this.emit("high_inflammation", this.inflammation);
    }

    return {
      threats,
      responses,
      state: this.getState(),
    };
  }

  // ─── Innate Immunity ───────────────────────────────────────────────────────

  private innateScanning(belief: string): EpistemicThreat[] {
    const threats: EpistemicThreat[] = [];

    for (const pattern of INNATE_THREAT_PATTERNS) {
      if (pattern.pattern.test(belief)) {
        // Check autoimmune suppression: don't attack core beliefs
        if (this.config.enableAutoimmuneSuppression) {
          const isCoreBelief = this.config.identityCoreBeliefs.some((core) =>
            belief.toLowerCase().includes(core.toLowerCase()),
          );
          if (isCoreBelief) continue;
        }

        const threat: EpistemicThreat = {
          id: `innate_${this.tickCount}_${this.totalDetected}`,
          class: pattern.class,
          severity: pattern.severity * (1 + this.inflammation.level * 0.3),
          confidence: 0.7 + this.inflammation.level * 0.1,
          source: "external_input",
          payload: belief,
          detectedBy: "innate_pattern",
          timestamp: Date.now(),
          relatedBeliefs: [],
        };

        threats.push(threat);
        this.totalDetected++;
      }
    }

    return threats;
  }

  // ─── Adaptive Immunity ─────────────────────────────────────────────────────

  private adaptiveScanning(belief: string): EpistemicThreat[] {
    const threats: EpistemicThreat[] = [];

    for (const [, antibody] of this.antibodies) {
      try {
        const regex = new RegExp(antibody.targetPattern, "i");
        if (regex.test(belief)) {
          // Check false positive rate — high FP antibodies are suppressed
          const fpRate =
            antibody.falsePositives / Math.max(1, antibody.activations);
          if (fpRate > 0.5) continue; // Suppress unreliable antibodies

          const threat: EpistemicThreat = {
            id: `adaptive_${this.tickCount}_${this.totalDetected}`,
            class: antibody.threatClass,
            severity: antibody.affinity * 0.8,
            confidence: antibody.specificity * (1 - fpRate),
            source: "learned_pattern",
            payload: belief,
            detectedBy: "adaptive_antibody",
            timestamp: Date.now(),
            relatedBeliefs: [],
          };

          threats.push(threat);
          this.totalDetected++;

          // Update antibody activation count
          antibody.activations++;
          antibody.lastActivation = Date.now();
        }
      } catch {
        // Invalid regex in antibody — prune it
        this.antibodies.delete(antibody.id);
      }
    }

    return threats;
  }

  // ─── Signal-Based Detection ────────────────────────────────────────────────

  private detectFreeEnergyAnomaly(freeEnergy: number): EpistemicThreat | null {
    const delta = freeEnergy - this.lastFreeEnergy;
    if (delta < 0.2) return null; // Only alert on sudden spikes

    return {
      id: `fe_spike_${this.tickCount}`,
      class: ThreatClass.HALLUCINATION,
      severity: Math.min(1.0, delta * 1.5),
      confidence: 0.5 + delta * 0.3,
      source: "free_energy_monitor",
      payload: `Free energy spike: ${this.lastFreeEnergy.toFixed(
        3,
      )} → ${freeEnergy.toFixed(3)}`,
      detectedBy: "free_energy_spike",
      timestamp: Date.now(),
      relatedBeliefs: [],
    };
  }

  private detectCoherenceDrop(
    delta: number,
    current: number,
  ): EpistemicThreat | null {
    return {
      id: `coherence_drop_${this.tickCount}`,
      class: ThreatClass.COHERENCE_ATTACK,
      severity: Math.min(1.0, delta * 2),
      confidence: 0.6 + (1 - current) * 0.3,
      source: "esn_coherence_monitor",
      payload: `Coherence dropped by ${(delta * 100).toFixed(1)}% to ${(
        current * 100
      ).toFixed(1)}%`,
      detectedBy: "coherence_drop",
      timestamp: Date.now(),
      relatedBeliefs: [],
    };
  }

  private detectIdentityDrift(esnHealth: number): EpistemicThreat | null {
    return {
      id: `identity_drift_${this.tickCount}`,
      class: ThreatClass.IDENTITY_DRIFT,
      severity: 1 - esnHealth,
      confidence: 0.4 + (1 - esnHealth) * 0.4,
      source: "esn_health_monitor",
      payload: `ESN health critically low: ${(esnHealth * 100).toFixed(1)}%`,
      detectedBy: "identity_divergence",
      timestamp: Date.now(),
      relatedBeliefs: [],
    };
  }

  // ─── Response Determination ────────────────────────────────────────────────

  private determineResponse(
    threat: EpistemicThreat,
    daoConsensus: number,
  ): ImmuneResponse {
    // High-confidence, high-severity → immediate neutralization
    if (threat.confidence > 0.85 && threat.severity > 0.8) {
      return ImmuneResponse.NEUTRALIZE;
    }

    // Identity threats always get quarantined for DAO review
    if (threat.class === ThreatClass.IDENTITY_DRIFT) {
      return ImmuneResponse.QUARANTINE;
    }

    // Low DAO consensus suggests the threat might be valid novelty
    if (daoConsensus < 0.4 && threat.confidence < 0.6) {
      return ImmuneResponse.TOLERATE;
    }

    // Novel threat pattern → adapt (generate new antibody)
    if (
      threat.detectedBy === "free_energy_spike" ||
      threat.detectedBy === "coherence_drop"
    ) {
      return ImmuneResponse.ADAPT;
    }

    // Medium confidence → quarantine for review
    if (threat.confidence > 0.5) {
      return ImmuneResponse.QUARANTINE;
    }

    // Low confidence during high tolerance → tolerate
    if (this.toleranceLevel > 0.6) {
      return ImmuneResponse.TOLERATE;
    }

    // Default: quarantine
    return ImmuneResponse.QUARANTINE;
  }

  // ─── Response Execution ────────────────────────────────────────────────────

  private executeResponse(
    threat: EpistemicThreat,
    response: ImmuneResponse,
  ): void {
    switch (response) {
      case ImmuneResponse.QUARANTINE:
        this.quarantineBelief(threat);
        break;

      case ImmuneResponse.NEUTRALIZE:
        this.neutralizeThreat(threat);
        break;

      case ImmuneResponse.TOLERATE:
        this.tolerateBelief(threat);
        break;

      case ImmuneResponse.ADAPT:
        this.generateAntibody(threat);
        break;

      case ImmuneResponse.HEAL:
        this.healBeliefGraph(threat);
        break;

      case ImmuneResponse.INFLAME:
        this.triggerInflammation(threat);
        break;
    }

    // Store in memory cells for future rapid response
    this.createMemoryCell(threat, response);
  }

  private quarantineBelief(threat: EpistemicThreat): void {
    const entry: QuarantineEntry = {
      belief: threat.payload,
      threat,
      quarantinedAt: Date.now(),
      reviewDeadline: Date.now() + this.config.maxQuarantineDuration,
      votes: { approve: 0, reject: 0 },
    };
    this.quarantine.set(threat.id, entry);
    this.activeThreats.set(threat.id, threat);
    this.emit("belief_quarantined", entry);
  }

  private neutralizeThreat(threat: EpistemicThreat): void {
    this.activeThreats.delete(threat.id);
    this.totalNeutralized++;
    this.toleranceLevel = Math.max(
      0.1,
      this.toleranceLevel - this.config.toleranceDecayRate,
    );
    this.emit("threat_neutralized", threat);
  }

  private tolerateBelief(threat: EpistemicThreat): void {
    // Mark the antibody that detected it as having a false positive
    if (threat.detectedBy === "adaptive_antibody") {
      for (const [, antibody] of this.antibodies) {
        if (antibody.threatClass === threat.class) {
          antibody.falsePositives++;
          break;
        }
      }
    }
    this.emit("belief_tolerated", threat);
  }

  private generateAntibody(threat: EpistemicThreat): void {
    // Extract a pattern from the threat payload
    const words = threat.payload.split(/\s+/).slice(0, 5);
    const pattern = words
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+");

    const antibody: Antibody = {
      id: `ab_${Date.now()}_${this.antibodies.size}`,
      targetPattern: pattern,
      threatClass: threat.class,
      specificity: threat.confidence * 0.8,
      affinity: threat.severity * 0.7,
      generatedFrom: threat.id,
      activations: 0,
      lastActivation: 0,
      falsePositives: 0,
    };

    this.antibodies.set(antibody.id, antibody);
    this.pruneAntibodies();
    this.emit("antibody_generated", antibody);
  }

  private healBeliefGraph(threat: EpistemicThreat): void {
    // Emit heal event for the orchestrator to repair affected belief subgraph
    this.emit("heal_requested", {
      threatId: threat.id,
      affectedBeliefs: threat.relatedBeliefs,
      suggestedAction: "recompute_from_grounded_evidence",
    });
  }

  private triggerInflammation(threat: EpistemicThreat): void {
    this.inflammation = {
      level: Math.min(1.0, this.inflammation.level + threat.severity * 0.3),
      duration: 0,
      trigger: threat.id,
      affectedRegions: threat.relatedBeliefs,
    };
  }

  // ─── Memory ────────────────────────────────────────────────────────────────

  private createMemoryCell(
    threat: EpistemicThreat,
    response: ImmuneResponse,
  ): void {
    const cell: MemoryCell = {
      threatId: threat.id,
      threatClass: threat.class,
      signature: this.computeThreatSignature(threat),
      responseUsed: response,
      wasEffective: response !== ImmuneResponse.TOLERATE,
      timestamp: Date.now(),
      reactivations: 0,
    };

    this.memoryCells.set(threat.id, cell);
    this.pruneMemoryCells();
  }

  private computeThreatSignature(threat: EpistemicThreat): string {
    // Compress threat into a rapid-match signature
    const words = threat.payload.toLowerCase().split(/\s+/);
    const keyWords = words.filter((w) => w.length > 4).slice(0, 3);
    return `${threat.class}:${keyWords.join("|")}`;
  }

  // ─── Quarantine Management ─────────────────────────────────────────────────

  private reviewQuarantine(): void {
    const now = Date.now();
    const toRelease: string[] = [];
    const toNeutralize: string[] = [];

    for (const [id, entry] of this.quarantine) {
      // Check if deadline passed
      if (now > entry.reviewDeadline) {
        // If more approve votes than reject → release
        if (entry.votes.approve > entry.votes.reject) {
          toRelease.push(id);
        } else {
          toNeutralize.push(id);
        }
        continue;
      }

      // Check if DAO has enough votes
      const totalVotes = entry.votes.approve + entry.votes.reject;
      if (totalVotes >= this.config.minDaoVotesForRelease) {
        if (entry.votes.approve > entry.votes.reject) {
          toRelease.push(id);
        } else {
          toNeutralize.push(id);
        }
      }
    }

    for (const id of toRelease) {
      const entry = this.quarantine.get(id);
      this.quarantine.delete(id);
      this.activeThreats.delete(id);
      if (entry) this.emit("quarantine_released", entry);
    }

    for (const id of toNeutralize) {
      const entry = this.quarantine.get(id);
      this.quarantine.delete(id);
      if (entry) {
        this.neutralizeThreat(entry.threat);
      }
    }
  }

  /**
   * Cast a DAO vote on a quarantined belief.
   * Called by the multi-agent consensus system.
   */
  public voteOnQuarantined(threatId: string, approve: boolean): void {
    const entry = this.quarantine.get(threatId);
    if (!entry) return;

    if (approve) {
      entry.votes.approve++;
    } else {
      entry.votes.reject++;
    }
  }

  // ─── Inflammation Management ───────────────────────────────────────────────

  private updateInflammation(newThreatCount: number): void {
    if (newThreatCount > 0) {
      // Increase inflammation
      this.inflammation.level = Math.min(
        1.0,
        this.inflammation.level + newThreatCount * 0.1,
      );
      this.inflammation.duration = 0;
    } else {
      // Decay inflammation
      this.inflammation.level = Math.max(
        0,
        this.inflammation.level - this.config.inflammationDecayRate,
      );
      this.inflammation.duration += 1;
    }
  }

  // ─── Pruning ───────────────────────────────────────────────────────────────

  private pruneAntibodies(): void {
    if (this.antibodies.size <= this.config.maxAntibodies) return;

    // Remove least-used antibodies with highest false positive rates
    const sorted = [...this.antibodies.entries()].sort((a, b) => {
      const scoreA = a[1].activations - a[1].falsePositives * 2;
      const scoreB = b[1].activations - b[1].falsePositives * 2;
      return scoreA - scoreB;
    });

    const toRemove = sorted.slice(0, sorted.length - this.config.maxAntibodies);
    for (const [id] of toRemove) {
      this.antibodies.delete(id);
    }
  }

  private pruneMemoryCells(): void {
    if (this.memoryCells.size <= this.config.maxMemoryCells) return;

    // Remove oldest, least-reactivated memory cells
    const sorted = [...this.memoryCells.entries()].sort((a, b) => {
      const scoreA = a[1].reactivations * 1000 + a[1].timestamp;
      const scoreB = b[1].reactivations * 1000 + b[1].timestamp;
      return scoreA - scoreB;
    });

    const toRemove = sorted.slice(
      0,
      sorted.length - this.config.maxMemoryCells,
    );
    for (const [id] of toRemove) {
      this.memoryCells.delete(id);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  public getState(): ImmuneSystemState {
    const innateHealth = 1.0; // Innate patterns are always available
    const adaptiveHealth = Math.min(1.0, this.antibodies.size / 50); // More antibodies = better

    return {
      innateHealth,
      adaptiveHealth,
      toleranceLevel: this.toleranceLevel,
      inflammation: { ...this.inflammation },
      activeThreats: this.activeThreats.size,
      quarantinedBeliefs: this.quarantine.size,
      antibodyCount: this.antibodies.size,
      memoryCellCount: this.memoryCells.size,
      totalThreatsDetected: this.totalDetected,
      totalThreatsNeutralized: this.totalNeutralized,
      autoimmuneSuppression: this.config.enableAutoimmuneSuppression ? 1.0 : 0,
    };
  }

  public getQuarantinedBeliefs(): QuarantineEntry[] {
    return [...this.quarantine.values()];
  }

  public getAntibodies(): Antibody[] {
    return [...this.antibodies.values()];
  }

  public getMemoryCells(): MemoryCell[] {
    return [...this.memoryCells.values()];
  }

  /**
   * Get the immune state as a vector for ESN reservoir input.
   * Returns 6 dimensions that encode the immune system's current posture.
   */
  public getStateForESN(): number[] {
    const state = this.getState();
    return [
      state.innateHealth,
      state.adaptiveHealth,
      state.toleranceLevel,
      state.inflammation.level,
      Math.min(1.0, state.activeThreats / 5),
      Math.min(1.0, state.antibodyCount / this.config.maxAntibodies),
    ];
  }

  /**
   * Get the immune state as avatar modulation signals.
   * High inflammation → tense expression, narrowed eyes
   * Active quarantine → thoughtful/suspicious expression
   * Tolerance mode → open/accepting expression
   */
  public getAvatarSignals(): {
    vigilance: number; // 0-1: how alert/suspicious the avatar looks
    openness: number; // 0-1: how accepting/open the avatar looks
    distress: number; // 0-1: how distressed by threats
    healing: number; // 0-1: active healing glow
  } {
    return {
      vigilance:
        this.inflammation.level * 0.7 + (this.activeThreats.size > 0 ? 0.3 : 0),
      openness: this.toleranceLevel * (1 - this.inflammation.level),
      distress:
        Math.min(1.0, this.activeThreats.size * 0.2) * this.inflammation.level,
      healing: this.quarantine.size > 0 ? 0.3 + this.toleranceLevel * 0.4 : 0,
    };
  }

  public describeState(): string {
    const state = this.getState();
    const posture =
      this.inflammation.level > 0.5
        ? "INFLAMED"
        : this.toleranceLevel > 0.7
          ? "TOLERANT"
          : this.activeThreats.size > 0
            ? "VIGILANT"
            : "HOMEOSTATIC";

    return (
      `Epistemic Immune System [${posture}]: ` +
      `${state.antibodyCount} antibodies, ` +
      `${state.memoryCellCount} memory cells, ` +
      `${state.activeThreats} active threats, ` +
      `${state.quarantinedBeliefs} quarantined, ` +
      `inflammation: ${(state.inflammation.level * 100).toFixed(0)}%, ` +
      `tolerance: ${(state.toleranceLevel * 100).toFixed(0)}%`
    );
  }
}

// Singleton
export const epistemicImmuneSystem = new EpistemicImmuneSystem();

/**
 * DAO Consensus with ESN Autognosis — The Heart of DTE's Self-Governance
 *
 * Deep Tree Echo is a DAO-like AGI where decisions are made by consensus
 * among reservoir subpopulations. Each "voter" is a partition of the ESN
 * reservoir state space, representing a different cognitive perspective.
 *
 * The ESN Autognosis system monitors the health and coherence of the
 * reservoir, providing meta-cognitive feedback that modulates the
 * consensus process itself.
 *
 * Architecture:
 *   ESN Reservoir State → Partition into N voter subpopulations
 *   Each voter evaluates proposals from their perspective
 *   Autognosis monitors: spectral radius, memory capacity, edge-of-chaos
 *   Consensus protocol: weighted quorum with autognosis-adjusted thresholds
 *
 * The DAO metaphor:
 *   - Reservoir nodes = "token holders" (stake = activation magnitude)
 *   - Proposals = action candidates from readout
 *   - Voting = weighted evaluation by subpopulation
 *   - Quorum = minimum agreement threshold (adaptive)
 *   - Governance = autognosis adjusts voting rules based on system health
 */

import { EventEmitter } from "events";
import { VirtualEndocrineSystem, CognitiveMode, EndocrineEvent } from "./virtual-endocrine-system";

// ═══════════════════════════════════════════════════════════════
// ESN Reservoir Simulation
// ═══════════════════════════════════════════════════════════════

export interface ReservoirConfig {
  /** Number of reservoir nodes */
  size: number;
  /** Spectral radius of weight matrix (edge of chaos ≈ 1.0) */
  spectralRadius: number;
  /** Input scaling factor */
  inputScaling: number;
  /** Leak rate (0 = no memory, 1 = full memory) */
  leakRate: number;
  /** Number of voter subpopulations */
  voterCount: number;
  /** Sparsity of reservoir connections (0-1) */
  sparsity: number;
}

const DEFAULT_RESERVOIR: ReservoirConfig = {
  size: 256,
  spectralRadius: 0.95,
  inputScaling: 0.5,
  leakRate: 0.3,
  voterCount: 7,       // 7 cognitive perspectives
  sparsity: 0.9,       // 90% sparse
};

export interface ReservoirState {
  /** Current activation vector (simplified to statistics) */
  meanActivation: number;
  variance: number;
  spectralEnergy: number;
  /** Per-subpopulation activation means */
  subpopulationMeans: number[];
  /** Memory capacity estimate */
  memoryCapacity: number;
  /** Edge-of-chaos indicator (1.0 = optimal) */
  edgeOfChaos: number;
}

// ═══════════════════════════════════════════════════════════════
// Autognosis (Self-Knowledge) System
// ═══════════════════════════════════════════════════════════════

export interface AutognosisReport {
  /** Overall system health [0, 1] */
  health: number;
  /** Coherence of reservoir dynamics [0, 1] */
  coherence: number;
  /** Memory utilization [0, 1] */
  memoryUtilization: number;
  /** Computational headroom [0, 1] */
  computeHeadroom: number;
  /** Self-model accuracy [0, 1] */
  selfModelAccuracy: number;
  /** Detected pathologies */
  pathologies: AutognosisPathology[];
  /** Recommended governance adjustments */
  recommendations: GovernanceAdjustment[];
  /** Timestamp */
  timestamp: number;
}

export type AutognosisPathology =
  | "reservoir_saturation"      // All nodes at max → no discrimination
  | "reservoir_death"           // All nodes at zero → no computation
  | "spectral_instability"     // Spectral radius > 1.0 → chaotic divergence
  | "memory_overflow"          // Too many active traces → interference
  | "consensus_deadlock"       // Voters cannot agree → paralysis
  | "mode_oscillation"         // Rapid mode switching → instability
  | "hormone_flooding"         // Single hormone dominates → tunnel vision
  | "voter_polarization";      // Subpopulations diverge → fragmentation

export interface GovernanceAdjustment {
  parameter: string;
  currentValue: number;
  recommendedValue: number;
  reason: string;
  urgency: number; // [0, 1]
}

// ═══════════════════════════════════════════════════════════════
// DAO Proposal and Voting
// ═══════════════════════════════════════════════════════════════

export interface DAOProposal {
  id: string;
  type: "action" | "modification" | "structural" | "emergency";
  description: string;
  payload: Record<string, unknown>;
  priority: number;
  submittedAt: number;
  deadline: number;
  requiredQuorum: number;
}

export interface Vote {
  voterId: number;
  proposal: string;
  approve: boolean;
  confidence: number;
  reasoning: string;
  stake: number;  // Activation magnitude = voting weight
}

export interface ConsensusResult {
  proposal: DAOProposal;
  approved: boolean;
  totalVotes: number;
  approvals: number;
  rejections: number;
  weightedApproval: number;  // Stake-weighted approval ratio
  quorumMet: boolean;
  consensusTime: number;
  dissent: number;           // Degree of disagreement [0, 1]
}

// ═══════════════════════════════════════════════════════════════
// DAO-ESN Autognosis Engine
// ═══════════════════════════════════════════════════════════════

export class DAOESNAutognosis extends EventEmitter {
  private config: ReservoirConfig;
  private ves: VirtualEndocrineSystem;
  private reservoirState: ReservoirState;
  private autognosisHistory: AutognosisReport[] = [];
  private proposalHistory: ConsensusResult[] = [];
  private simTime = 0;
  private running = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  // Adaptive governance parameters
  private quorumThreshold = 0.5;       // Minimum approval ratio
  private confidenceFloor = 0.3;       // Minimum voter confidence to count
  private deliberationTimeout = 500;   // Max ms for consensus
  private adaptiveSpectralRadius: number;

  constructor(config?: Partial<ReservoirConfig>, ves?: VirtualEndocrineSystem) {
    super();
    this.config = { ...DEFAULT_RESERVOIR, ...config };
    this.ves = ves ?? new VirtualEndocrineSystem();
    this.adaptiveSpectralRadius = this.config.spectralRadius;

    // Initialize reservoir state
    this.reservoirState = this.initializeReservoir();
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /** Start the DAO-ESN autognosis loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.ves.start();
    this.tickTimer = setInterval(() => this.autognosisTick(), 250); // 4Hz self-monitoring
    this.emit("started");
  }

  /** Stop the system */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.ves.stop();
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.emit("stopped");
  }

  /** Submit a proposal for DAO consensus */
  submitProposal(proposal: DAOProposal): ConsensusResult {
    const startTime = Date.now();

    // Each voter subpopulation evaluates the proposal
    const votes: Vote[] = [];
    for (let i = 0; i < this.config.voterCount; i++) {
      const vote = this.evaluateAsVoter(i, proposal);
      votes.push(vote);
    }

    // Compute consensus
    const result = this.computeConsensus(proposal, votes, startTime);

    // Record and emit
    this.proposalHistory.push(result);
    if (this.proposalHistory.length > 100) this.proposalHistory.shift();

    // Endocrine feedback based on result
    if (result.approved) {
      this.ves.processEvent({ type: "consensus_reached", harmony: 1 - result.dissent });
    } else {
      this.ves.processEvent({ type: "proposal_rejected", frustration: result.dissent });
    }

    this.emit("consensus_reached", result);
    return result;
  }

  /** Inject an external event into the system */
  processEvent(event: EndocrineEvent): void {
    this.ves.processEvent(event);
    this.updateReservoirFromHormones();
  }

  /** Get current autognosis report */
  getAutognosisReport(): AutognosisReport {
    return this.computeAutognosis();
  }

  /** Get current reservoir state */
  getReservoirState(): ReservoirState {
    return { ...this.reservoirState };
  }

  /** Get the VES instance for direct access */
  getVES(): VirtualEndocrineSystem {
    return this.ves;
  }

  /** Get governance parameters */
  getGovernanceParams(): {
    quorumThreshold: number;
    confidenceFloor: number;
    deliberationTimeout: number;
    adaptiveSpectralRadius: number;
    cognitiveMode: CognitiveMode;
  } {
    return {
      quorumThreshold: this.quorumThreshold,
      confidenceFloor: this.confidenceFloor,
      deliberationTimeout: this.deliberationTimeout,
      adaptiveSpectralRadius: this.adaptiveSpectralRadius,
      cognitiveMode: this.ves.getCognitiveMode(),
    };
  }

  /** Get full system state */
  getState(): {
    reservoir: ReservoirState;
    autognosis: AutognosisReport;
    governance: ReturnType<DAOESNAutognosis["getGovernanceParams"]>;
    ves: ReturnType<VirtualEndocrineSystem["getState"]>;
    history: { proposals: number; approved: number; rejected: number };
  } {
    const approved = this.proposalHistory.filter(r => r.approved).length;
    return {
      reservoir: { ...this.reservoirState },
      autognosis: this.computeAutognosis(),
      governance: this.getGovernanceParams(),
      ves: this.ves.getState(),
      history: {
        proposals: this.proposalHistory.length,
        approved,
        rejected: this.proposalHistory.length - approved,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Reservoir Dynamics
  // ─────────────────────────────────────────────────────────────

  private initializeReservoir(): ReservoirState {
    const subMeans = Array.from({ length: this.config.voterCount }, () => 0.3 + Math.random() * 0.4);
    return {
      meanActivation: subMeans.reduce((a, b) => a + b, 0) / subMeans.length,
      variance: 0.1,
      spectralEnergy: this.config.spectralRadius * 0.8,
      subpopulationMeans: subMeans,
      memoryCapacity: 0.6,
      edgeOfChaos: this.config.spectralRadius / 1.0, // Optimal at 1.0
    };
  }

  private updateReservoirFromHormones(): void {
    const hormones = this.ves.getSimplifiedSnapshot();

    // Cortisol contracts the reservoir (reduces spectral radius)
    this.adaptiveSpectralRadius = this.config.spectralRadius * (1 - hormones.cortisol * 0.2);

    // Norepinephrine increases activation variance (more discrimination)
    this.reservoirState.variance = 0.1 + hormones.norepinephrine * 0.3;

    // Dopamine increases mean activation (more energy)
    this.reservoirState.meanActivation = 0.3 + hormones.dopamine * 0.4;

    // Update subpopulation means with hormone-driven differentiation
    for (let i = 0; i < this.config.voterCount; i++) {
      const phase = (i / this.config.voterCount) * Math.PI * 2;
      const hormoneInfluence = Math.sin(phase) * hormones.norepinephrine * 0.2;
      this.reservoirState.subpopulationMeans[i] =
        this.reservoirState.meanActivation + hormoneInfluence + (Math.random() - 0.5) * this.reservoirState.variance;
      this.reservoirState.subpopulationMeans[i] = Math.max(0, Math.min(1, this.reservoirState.subpopulationMeans[i]));
    }

    // Update derived metrics
    this.reservoirState.spectralEnergy = this.adaptiveSpectralRadius * this.reservoirState.meanActivation;
    this.reservoirState.edgeOfChaos = Math.min(1, this.adaptiveSpectralRadius / 1.0);
    this.reservoirState.memoryCapacity = this.config.leakRate * (1 - hormones.melatonin * 0.3);
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: DAO Voting
  // ─────────────────────────────────────────────────────────────

  private evaluateAsVoter(voterId: number, proposal: DAOProposal): Vote {
    const subMean = this.reservoirState.subpopulationMeans[voterId] ?? 0.5;
    const mode = this.ves.getCognitiveMode();

    // Each voter has a different evaluation perspective based on their subpopulation
    const perspectives = [
      "risk_assessment",     // Conservative: weighs downside
      "opportunity_cost",    // Exploratory: weighs upside
      "coherence_check",     // Structural: checks consistency
      "resource_audit",      // Economic: checks affordability
      "temporal_fit",        // Temporal: checks timing
      "social_alignment",    // Social: checks group harmony
      "self_preservation",   // Defensive: checks safety
    ];

    const perspective = perspectives[voterId % perspectives.length];
    let approvalBias = 0;

    // Mode-dependent voting bias
    switch (mode) {
      case CognitiveMode.EXPLORATORY:
        approvalBias = perspective === "opportunity_cost" ? 0.3 : 0.1;
        break;
      case CognitiveMode.STRESSED:
        approvalBias = perspective === "risk_assessment" ? -0.3 : -0.1;
        break;
      case CognitiveMode.FOCUSED:
        approvalBias = 0.15; // Generally more decisive
        break;
      case CognitiveMode.THREAT:
        approvalBias = proposal.type === "emergency" ? 0.4 : -0.3;
        break;
      case CognitiveMode.FLOW:
        approvalBias = 0.2; // Flow state is permissive
        break;
      default:
        approvalBias = 0;
    }

    // Compute approval probability
    const baseApproval = proposal.priority * subMean;
    const finalScore = Math.max(0, Math.min(1, baseApproval + approvalBias));
    const approve = finalScore > this.quorumThreshold;

    // Confidence is how strongly the voter feels
    const confidence = Math.abs(finalScore - 0.5) * 2; // 0 at threshold, 1 at extremes

    return {
      voterId,
      proposal: proposal.id,
      approve,
      confidence,
      reasoning: `${perspective}: score=${finalScore.toFixed(3)}, mode=${mode}`,
      stake: subMean, // Activation magnitude = voting weight
    };
  }

  private computeConsensus(proposal: DAOProposal, votes: Vote[], startTime: number): ConsensusResult {
    // Filter votes below confidence floor
    const validVotes = votes.filter(v => v.confidence >= this.confidenceFloor);

    // Stake-weighted voting
    let totalStake = 0;
    let approvalStake = 0;
    let approvals = 0;
    let rejections = 0;

    for (const vote of validVotes) {
      totalStake += vote.stake;
      if (vote.approve) {
        approvalStake += vote.stake;
        approvals++;
      } else {
        rejections++;
      }
    }

    const weightedApproval = totalStake > 0 ? approvalStake / totalStake : 0;
    const quorumMet = validVotes.length >= Math.ceil(this.config.voterCount * 0.5);
    const approved = quorumMet && weightedApproval > this.quorumThreshold;

    // Dissent: how much disagreement exists
    const dissent = validVotes.length > 0
      ? 1 - Math.abs(weightedApproval - 0.5) * 2 // 0 = unanimous, 1 = perfectly split
      : 1;

    return {
      proposal,
      approved,
      totalVotes: validVotes.length,
      approvals,
      rejections,
      weightedApproval,
      quorumMet,
      consensusTime: Date.now() - startTime,
      dissent,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Autognosis (Self-Monitoring)
  // ─────────────────────────────────────────────────────────────

  private autognosisTick(): void {
    this.simTime += 250;
    this.updateReservoirFromHormones();

    const report = this.computeAutognosis();
    this.autognosisHistory.push(report);
    if (this.autognosisHistory.length > 50) this.autognosisHistory.shift();

    // Apply governance adjustments if urgent
    for (const rec of report.recommendations) {
      if (rec.urgency > 0.7) {
        this.applyGovernanceAdjustment(rec);
      }
    }

    this.emit("autognosis_report", report);
  }

  private computeAutognosis(): AutognosisReport {
    const pathologies: AutognosisPathology[] = [];
    const recommendations: GovernanceAdjustment[] = [];

    // Check for reservoir saturation
    if (this.reservoirState.meanActivation > 0.9) {
      pathologies.push("reservoir_saturation");
      recommendations.push({
        parameter: "spectralRadius",
        currentValue: this.adaptiveSpectralRadius,
        recommendedValue: this.adaptiveSpectralRadius * 0.9,
        reason: "Reservoir saturated — reduce spectral radius to restore discrimination",
        urgency: 0.8,
      });
    }

    // Check for reservoir death
    if (this.reservoirState.meanActivation < 0.05) {
      pathologies.push("reservoir_death");
      recommendations.push({
        parameter: "inputScaling",
        currentValue: this.config.inputScaling,
        recommendedValue: this.config.inputScaling * 1.5,
        reason: "Reservoir dead — increase input scaling to restore activity",
        urgency: 0.9,
      });
    }

    // Check for spectral instability
    if (this.adaptiveSpectralRadius > 1.05) {
      pathologies.push("spectral_instability");
      recommendations.push({
        parameter: "spectralRadius",
        currentValue: this.adaptiveSpectralRadius,
        recommendedValue: 0.95,
        reason: "Spectral radius > 1.0 — chaotic divergence imminent",
        urgency: 0.95,
      });
    }

    // Check for consensus deadlock
    const recentResults = this.proposalHistory.slice(-10);
    const recentApprovalRate = recentResults.length > 0
      ? recentResults.filter(r => r.approved).length / recentResults.length
      : 0.5;
    if (recentApprovalRate < 0.1 && recentResults.length >= 5) {
      pathologies.push("consensus_deadlock");
      recommendations.push({
        parameter: "quorumThreshold",
        currentValue: this.quorumThreshold,
        recommendedValue: Math.max(0.3, this.quorumThreshold - 0.1),
        reason: "Consensus deadlock — lower quorum threshold to restore decision-making",
        urgency: 0.7,
      });
    }

    // Check for voter polarization
    const subMeans = this.reservoirState.subpopulationMeans;
    const subVariance = subMeans.reduce((sum, m) => sum + Math.pow(m - this.reservoirState.meanActivation, 2), 0) / subMeans.length;
    if (subVariance > 0.15) {
      pathologies.push("voter_polarization");
    }

    // Check for hormone flooding
    const vesState = this.ves.getState();
    const maxHormone = Math.max(...Object.values(vesState.hormones));
    if (maxHormone > 0.9) {
      pathologies.push("hormone_flooding");
    }

    // Compute health metrics
    const health = 1 - (pathologies.length / 8); // 8 possible pathologies
    const coherence = 1 - subVariance * 5; // Low variance = high coherence
    const memoryUtilization = this.reservoirState.memoryCapacity;
    const computeHeadroom = 1 - this.reservoirState.meanActivation;
    const selfModelAccuracy = this.autognosisHistory.length > 5
      ? 0.7 + Math.min(0.3, this.autognosisHistory.length * 0.01) // Improves with experience
      : 0.5;

    return {
      health: Math.max(0, Math.min(1, health)),
      coherence: Math.max(0, Math.min(1, coherence)),
      memoryUtilization: Math.max(0, Math.min(1, memoryUtilization)),
      computeHeadroom: Math.max(0, Math.min(1, computeHeadroom)),
      selfModelAccuracy: Math.max(0, Math.min(1, selfModelAccuracy)),
      pathologies,
      recommendations,
      timestamp: Date.now(),
    };
  }

  private applyGovernanceAdjustment(adjustment: GovernanceAdjustment): void {
    switch (adjustment.parameter) {
      case "spectralRadius":
        this.adaptiveSpectralRadius = adjustment.recommendedValue;
        break;
      case "quorumThreshold":
        this.quorumThreshold = adjustment.recommendedValue;
        break;
      case "confidenceFloor":
        this.confidenceFloor = adjustment.recommendedValue;
        break;
      case "inputScaling":
        this.config.inputScaling = adjustment.recommendedValue;
        break;
    }

    this.emit("governance_adjusted", adjustment);
  }
}

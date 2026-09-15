import { EventEmitter } from "events";
import {
  getLogger,
  type ExperimentCandidate,
  type ExperimentGovernanceAuthorizer,
  type ExperimentGovernanceDecision,
} from "deep-tree-echo-core";
import type {
  ConsensusProposal,
  ExperimentConsensusRequest,
} from "./multi-agent-consensus.js";

const log = getLogger(
  "deep-tree-echo-orchestrator/PolycentricExperimentGovernance",
);

export interface PolycentricGovernanceContext {
  /** Genuine four-signal consensus from CognitiveTickProcessor. */
  cognitiveConsensus: number;
  /** Genuine ESN health/capacity/pathology score from CognitiveTickProcessor. */
  cognitiveAutognosis: number;
  /** Evidence-vote consensus attached to causal hypotheses. */
  evidenceConsensus: number;
  /** Predicted-versus-rendered Live2D fidelity. */
  embodimentAccuracy: number;
  /** Maturity of embodiment evidence, not merely the latest sample. */
  embodimentConfidence: number;
  reservoirHealth: number;
  isReservoirDead: boolean;
  isReservoirSaturated: boolean;
  energyLevel: number;
  isEnergyCrisis: boolean;
  now?: number;
}

export interface ExperimentPeerConsensus {
  isEnabled(): boolean;
  updateLocalCoherence(coherence: number): void;
  proposeExperiment(
    request: ExperimentConsensusRequest,
  ): Promise<ConsensusProposal>;
  getStats(): {
    healthyPeers: number;
    totalPeers: number;
  };
}

export interface PolycentricExperimentGovernanceConfig {
  minimumCognitiveConsensus: number;
  minimumCognitiveAutognosis: number;
  minimumMatureEmbodimentAccuracy: number;
  matureEmbodimentConfidence: number;
  minimumEnergy: number;
  minimumGovernanceScore: number;
  highRiskThreshold: number;
  requireHealthyPeerQuorumAboveRisk: boolean;
  certificateHistoryLimit: number;
}

export const DEFAULT_POLYCENTRIC_EXPERIMENT_GOVERNANCE_CONFIG: PolycentricExperimentGovernanceConfig =
  {
    minimumCognitiveConsensus: 0.42,
    minimumCognitiveAutognosis: 0.38,
    minimumMatureEmbodimentAccuracy: 0.45,
    matureEmbodimentConfidence: 0.35,
    minimumEnergy: 0.18,
    minimumGovernanceScore: 0.5,
    highRiskThreshold: 0.55,
    requireHealthyPeerQuorumAboveRisk: true,
    certificateHistoryLimit: 128,
  };

export interface ExperimentGovernanceCertificate
  extends ExperimentGovernanceDecision {
  certificateId: string;
  hypothesisId: string;
  timestamp: number;
  governanceScore: number;
  peerConsensus: number;
  quorumReached: boolean;
  context: Required<PolycentricGovernanceContext>;
}

export interface PolycentricGovernanceState {
  authorizationCount: number;
  approvedCount: number;
  rejectedCount: number;
  peerQuorumCount: number;
  meanGovernanceScore: number;
  lastCertificate: ExperimentGovernanceCertificate | null;
}

const DEFAULT_CONTEXT: Required<PolycentricGovernanceContext> = {
  cognitiveConsensus: 0.5,
  cognitiveAutognosis: 0.5,
  evidenceConsensus: 0.5,
  embodimentAccuracy: 0.5,
  embodimentConfidence: 0,
  reservoirHealth: 0.5,
  isReservoirDead: false,
  isReservoirSaturated: false,
  energyLevel: 0.5,
  isEnergyCrisis: false,
  now: 0,
};

/**
 * Polycentric scientific governance for Deep Tree Echo.
 *
 * A selected experiment is only a proposal. Authorization combines multiple
 * independent centers of epistemic authority: the live cognitive DAO signal,
 * ESN autognosis, causal evidence votes, rendered-avatar embodiment accuracy,
 * metabolic capacity, reservoir pathology vetoes, and—when risk is high—a
 * healthy network-peer quorum. Every outcome is emitted and retained as an
 * inspectable certificate.
 */
export class PolycentricExperimentGovernance
  extends EventEmitter
  implements ExperimentGovernanceAuthorizer
{
  private readonly config: PolycentricExperimentGovernanceConfig;
  private context: Required<PolycentricGovernanceContext> = {
    ...DEFAULT_CONTEXT,
  };
  private certificates: ExperimentGovernanceCertificate[] = [];
  private authorizationCount = 0;
  private approvedCount = 0;
  private rejectedCount = 0;
  private peerQuorumCount = 0;
  private totalGovernanceScore = 0;

  constructor(
    private readonly peers?: ExperimentPeerConsensus,
    config: Partial<PolycentricExperimentGovernanceConfig> = {},
  ) {
    super();
    this.config = {
      ...DEFAULT_POLYCENTRIC_EXPERIMENT_GOVERNANCE_CONFIG,
      ...config,
    };
  }

  updateContext(
    context: PolycentricGovernanceContext,
  ): Required<PolycentricGovernanceContext> {
    this.context = {
      cognitiveConsensus: this.clamp01(context.cognitiveConsensus),
      cognitiveAutognosis: this.clamp01(context.cognitiveAutognosis),
      evidenceConsensus: this.clamp01(context.evidenceConsensus),
      embodimentAccuracy: this.clamp01(context.embodimentAccuracy),
      embodimentConfidence: this.clamp01(context.embodimentConfidence),
      reservoirHealth: this.clamp01(context.reservoirHealth),
      isReservoirDead: Boolean(context.isReservoirDead),
      isReservoirSaturated: Boolean(context.isReservoirSaturated),
      energyLevel: this.clamp01(context.energyLevel),
      isEnergyCrisis: Boolean(context.isEnergyCrisis),
      now: Math.max(0, context.now ?? Date.now()),
    };
    this.peers?.updateLocalCoherence(this.context.cognitiveConsensus);
    return { ...this.context };
  }

  async authorize(
    candidate: ExperimentCandidate,
  ): Promise<ExperimentGovernanceDecision> {
    this.authorizationCount++;
    const context = { ...this.context, now: this.context.now || Date.now() };
    const embodimentGrounding = this.clamp01(
      0.5 * (1 - context.embodimentConfidence) +
        context.embodimentAccuracy * context.embodimentConfidence,
    );
    const governanceScore = this.clamp01(
      context.cognitiveConsensus * 0.24 +
        context.cognitiveAutognosis * 0.2 +
        context.evidenceConsensus * 0.12 +
        embodimentGrounding * 0.14 +
        context.reservoirHealth * 0.12 +
        context.energyLevel * 0.1 +
        candidate.governanceConfidence * 0.08,
    );

    const veto = this.evaluateLocalVeto(context, governanceScore);
    if (veto) {
      return this.recordCertificate(
        candidate,
        context,
        governanceScore,
        false,
        veto,
        0,
        false,
      );
    }

    let peerConsensus = 0;
    let quorumReached = false;
    const peerStats = this.peers?.getStats() ?? {
      healthyPeers: 0,
      totalPeers: 0,
    };
    const requiresPeerQuorum =
      this.config.requireHealthyPeerQuorumAboveRisk &&
      candidate.estimatedRisk >= this.config.highRiskThreshold;

    if (requiresPeerQuorum && peerStats.healthyPeers === 0) {
      return this.recordCertificate(
        candidate,
        context,
        governanceScore,
        false,
        "high_risk_peer_quorum_unavailable",
        0,
        false,
      );
    }

    if (this.peers?.isEnabled() && peerStats.healthyPeers > 0) {
      this.peers.updateLocalCoherence(context.cognitiveConsensus);
      const proposal = await this.peers.proposeExperiment({
        key: `scientific.experiment.${candidate.hypothesisId}`,
        newValue: candidate.score,
        reason: candidate.statement,
        source: "scientific_experiment",
        coherenceAtRequest: context.cognitiveConsensus,
        hypothesisId: candidate.hypothesisId,
        estimatedRisk: candidate.estimatedRisk,
        expectedInformationGain: candidate.expectedInformationGain,
        embodimentAccuracy: context.embodimentAccuracy,
      });
      const votes = Array.from(proposal.votes.values());
      const approvals = votes.filter((vote) => vote.approve).length;
      peerConsensus = votes.length > 0 ? approvals / votes.length : 0;
      quorumReached = proposal.quorumReached && proposal.status === "approved";
      if (!quorumReached) {
        return this.recordCertificate(
          candidate,
          context,
          governanceScore,
          false,
          `peer_quorum_${proposal.status}`,
          peerConsensus,
          proposal.quorumReached,
        );
      }
      this.peerQuorumCount++;
    }

    return this.recordCertificate(
      candidate,
      context,
      governanceScore,
      true,
      quorumReached ? "polycentric_peer_quorum" : "polycentric_local_quorum",
      peerConsensus,
      quorumReached,
    );
  }

  getState(): PolycentricGovernanceState {
    const last = this.certificates.at(-1);
    return {
      authorizationCount: this.authorizationCount,
      approvedCount: this.approvedCount,
      rejectedCount: this.rejectedCount,
      peerQuorumCount: this.peerQuorumCount,
      meanGovernanceScore:
        this.authorizationCount > 0
          ? this.totalGovernanceScore / this.authorizationCount
          : 0,
      lastCertificate: last ? this.copyCertificate(last) : null,
    };
  }

  getCertificates(limit = 10): ExperimentGovernanceCertificate[] {
    const count = Math.max(0, Math.floor(limit));
    return this.certificates
      .slice(-count)
      .map((certificate) => this.copyCertificate(certificate));
  }

  private evaluateLocalVeto(
    context: Required<PolycentricGovernanceContext>,
    governanceScore: number,
  ): string | null {
    if (context.isEnergyCrisis) return "energy_crisis";
    if (context.energyLevel < this.config.minimumEnergy) return "low_energy";
    if (context.isReservoirDead) return "reservoir_dead";
    if (context.isReservoirSaturated) return "reservoir_saturated";
    if (context.cognitiveConsensus < this.config.minimumCognitiveConsensus)
      return "cognitive_quorum_below_threshold";
    if (context.cognitiveAutognosis < this.config.minimumCognitiveAutognosis)
      return "autognosis_below_threshold";
    if (
      context.embodimentConfidence >= this.config.matureEmbodimentConfidence &&
      context.embodimentAccuracy < this.config.minimumMatureEmbodimentAccuracy
    )
      return "embodiment_unreliable";
    if (governanceScore < this.config.minimumGovernanceScore)
      return "governance_score_below_threshold";
    return null;
  }

  private recordCertificate(
    candidate: ExperimentCandidate,
    context: Required<PolycentricGovernanceContext>,
    governanceScore: number,
    approved: boolean,
    reason: string,
    peerConsensus: number,
    quorumReached: boolean,
  ): ExperimentGovernanceCertificate {
    const certificate: ExperimentGovernanceCertificate = {
      approved,
      reason,
      certificateId: `${candidate.hypothesisId}:${context.now}:${this.authorizationCount}`,
      hypothesisId: candidate.hypothesisId,
      timestamp: context.now,
      governanceScore,
      peerConsensus: this.clamp01(peerConsensus),
      quorumReached,
      context: { ...context },
      evidence: {
        cognitiveConsensus: context.cognitiveConsensus,
        cognitiveAutognosis: context.cognitiveAutognosis,
        evidenceConsensus: context.evidenceConsensus,
        embodimentAccuracy: context.embodimentAccuracy,
        embodimentConfidence: context.embodimentConfidence,
        reservoirHealth: context.reservoirHealth,
        energyLevel: context.energyLevel,
        estimatedRisk: candidate.estimatedRisk,
        expectedInformationGain: candidate.expectedInformationGain,
      },
    };
    this.certificates.push(certificate);
    if (this.certificates.length > this.config.certificateHistoryLimit) {
      this.certificates.shift();
    }
    this.totalGovernanceScore += governanceScore;
    if (approved) this.approvedCount++;
    else this.rejectedCount++;
    this.emit(
      approved ? "experiment_authorized" : "experiment_rejected",
      this.copyCertificate(certificate),
    );
    log.info(
      `${approved ? "authorized" : "rejected"} hypothesis=${
        candidate.hypothesisId
      } score=${governanceScore.toFixed(3)} reason=${reason}`,
    );
    return this.copyCertificate(certificate);
  }

  private copyCertificate(
    certificate: ExperimentGovernanceCertificate,
  ): ExperimentGovernanceCertificate {
    return {
      ...certificate,
      context: { ...certificate.context },
      evidence: certificate.evidence ? { ...certificate.evidence } : undefined,
    };
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }
}

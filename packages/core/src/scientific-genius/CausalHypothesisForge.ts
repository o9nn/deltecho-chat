/**
 * Causal Hypothesis Forge
 *
 * Converts associative discoveries into falsifiable causal hypotheses. Dream
 * insights and cognitive standing waves are treated as proposal sources, never
 * as truth. Each proposal must survive controlled interventions, Bayesian
 * evidence updates, replication pressure, and a DAO-style quorum before it can
 * be ratified into DTE's working knowledge.
 */

import { EventEmitter } from "events";

export type HypothesisOrigin = "dream" | "resonance" | "direct";
export type CausalDirection = -1 | 0 | 1;

export enum CausalHypothesisStatus {
  PROPOSED = "proposed",
  TESTING = "testing",
  SUPPORTED = "supported",
  FALSIFIED = "falsified",
  RATIFIED = "ratified",
}

export interface CausalHypothesisInput {
  statement: string;
  cause: string;
  effect: string;
  predictedDirection: CausalDirection;
  domain: string;
  priorConfidence?: number;
  falsifiability?: number;
  origin?: HypothesisOrigin;
  sourceIds?: string[];
}

export interface CausalHypothesis extends Required<CausalHypothesisInput> {
  id: string;
  status: CausalHypothesisStatus;
  posteriorConfidence: number;
  logOdds: number;
  evidenceCount: number;
  supportingEvidence: number;
  contradictingEvidence: number;
  replicationCount: number;
  meanSurprise: number;
  createdAt: number;
  updatedAt: number;
}

export interface InterventionDesign {
  manipulatedVariable: string;
  controlCondition: string;
  expectedEffect: number;
  measurement: string;
  confoundControls: string[];
  replicationGroup?: string;
}

export interface CounterfactualTrial {
  id: string;
  hypothesisId: string;
  design: InterventionDesign;
  status: "designed" | "observed";
  observedEffect?: number;
  reliability?: number;
  evidenceWeight?: number;
  surprise?: number;
  supportsPrediction?: boolean;
  createdAt: number;
  observedAt?: number;
}

export interface TrialOutcome {
  observedEffect: number;
  reliability: number;
  notes?: string;
}

export interface DaoEvidenceVote {
  agentId: string;
  approve: boolean;
  confidence: number;
  rationale?: string;
  timestamp: number;
}

export interface DaoRatificationResult {
  hypothesisId: string;
  ratified: boolean;
  participation: number;
  approval: number;
  weightedApproval: number;
  reason: string;
}

export interface CausalForgeState {
  hypotheses: number;
  proposed: number;
  testing: number;
  supported: number;
  falsified: number;
  ratified: number;
  activeTrials: number;
  meanPosteriorConfidence: number;
  meanFalsifiability: number;
  meanSurprise: number;
}

export interface CausalForgeVisualState {
  causalRigor: number;
  falsificationPressure: number;
  epistemicSurprise: number;
  daoEvidenceConsensus: number;
  activeExperimentation: number;
}

export interface CausalHypothesisForgeConfig {
  supportThreshold: number;
  falsificationThreshold: number;
  minimumEvidence: number;
  minimumEffect: number;
  evidenceScale: number;
  surpriseThreshold: number;
  quorumThreshold: number;
  approvalThreshold: number;
  maximumHypotheses: number;
}

export const DEFAULT_CAUSAL_FORGE_CONFIG: CausalHypothesisForgeConfig = {
  supportThreshold: 0.76,
  falsificationThreshold: 0.24,
  minimumEvidence: 2,
  minimumEffect: 0.05,
  evidenceScale: 0.25,
  surpriseThreshold: 0.6,
  quorumThreshold: 0.6,
  approvalThreshold: 0.67,
  maximumHypotheses: 128,
};

interface DreamInsightLike {
  hypothesis: string;
  confidence: number;
  domain: string;
  fragment: {
    sourceId: string;
    sourceLabel: string;
    targetId: string;
    targetLabel: string;
    novelty: number;
    coherence: number;
  };
}

interface ResonanceNodeLike {
  id: string;
  conceptId: string;
  conceptLabel: string;
  contributingWaves: string[];
  combinedAmplitude: number;
  stability: number;
  domains: string[];
  crossDomainScore: number;
}

/**
 * Scientific falsification layer for DTE's generative insight systems.
 */
export class CausalHypothesisForge extends EventEmitter {
  private readonly config: CausalHypothesisForgeConfig;
  private readonly hypotheses = new Map<string, CausalHypothesis>();
  private readonly trials = new Map<string, CounterfactualTrial>();
  private readonly votes = new Map<string, Map<string, DaoEvidenceVote>>();
  private hypothesisSequence = 0;
  private trialSequence = 0;
  private recentSurprises: number[] = [];

  constructor(config?: Partial<CausalHypothesisForgeConfig>) {
    super();
    this.config = { ...DEFAULT_CAUSAL_FORGE_CONFIG, ...config };
  }

  propose(input: CausalHypothesisInput): CausalHypothesis {
    const now = Date.now();
    const priorConfidence = this.clampProbability(input.priorConfidence ?? 0.5);
    const hypothesis: CausalHypothesis = {
      ...input,
      id: `causal_${++this.hypothesisSequence}`,
      priorConfidence,
      falsifiability: this.clamp01(input.falsifiability ?? 0.5),
      origin: input.origin ?? "direct",
      sourceIds: [...(input.sourceIds ?? [])],
      status: CausalHypothesisStatus.PROPOSED,
      posteriorConfidence: priorConfidence,
      logOdds: this.logit(priorConfidence),
      evidenceCount: 0,
      supportingEvidence: 0,
      contradictingEvidence: 0,
      replicationCount: 0,
      meanSurprise: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.hypotheses.set(hypothesis.id, hypothesis);
    this.enforceCapacity();
    this.emit("hypothesis_proposed", { ...hypothesis });
    return { ...hypothesis, sourceIds: [...hypothesis.sourceIds] };
  }

  proposeFromDream(insight: DreamInsightLike): CausalHypothesis {
    return this.propose({
      statement: insight.hypothesis,
      cause: insight.fragment.sourceLabel,
      effect: insight.fragment.targetLabel,
      predictedDirection: 1,
      domain: insight.domain,
      priorConfidence: insight.confidence,
      falsifiability:
        insight.fragment.coherence * 0.55 + insight.fragment.novelty * 0.45,
      origin: "dream",
      sourceIds: [insight.fragment.sourceId, insight.fragment.targetId],
    });
  }

  proposeFromResonance(node: ResonanceNodeLike): CausalHypothesis {
    const domain =
      node.domains.length > 1 ? "cross-domain" : node.domains[0] ?? "unknown";
    return this.propose({
      statement: `Intervening on the convergent sources of ${node.conceptLabel} changes its activation.`,
      cause: node.contributingWaves.join(" + "),
      effect: node.conceptLabel,
      predictedDirection: 1,
      domain,
      priorConfidence: this.clampProbability(
        node.combinedAmplitude * 0.45 +
          node.crossDomainScore * 0.35 +
          Math.min(1, node.stability / 10) * 0.2,
      ),
      falsifiability: this.clamp01(0.55 + node.crossDomainScore * 0.25),
      origin: "resonance",
      sourceIds: [node.id, node.conceptId, ...node.contributingWaves],
    });
  }

  designIntervention(
    hypothesisId: string,
    design: InterventionDesign,
  ): CounterfactualTrial | null {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis || hypothesis.status === CausalHypothesisStatus.RATIFIED) {
      return null;
    }

    hypothesis.status = CausalHypothesisStatus.TESTING;
    hypothesis.updatedAt = Date.now();
    const trial: CounterfactualTrial = {
      id: `trial_${++this.trialSequence}`,
      hypothesisId,
      design: {
        ...design,
        confoundControls: [...design.confoundControls],
      },
      status: "designed",
      createdAt: Date.now(),
    };
    this.trials.set(trial.id, trial);
    this.emit("intervention_designed", this.copyTrial(trial));
    return this.copyTrial(trial);
  }

  recordOutcome(
    trialId: string,
    outcome: TrialOutcome,
  ): CounterfactualTrial | null {
    const trial = this.trials.get(trialId);
    if (!trial || trial.status === "observed") return null;
    const hypothesis = this.hypotheses.get(trial.hypothesisId);
    if (!hypothesis) return null;

    const reliability = this.clamp01(outcome.reliability);
    const signedObserved =
      outcome.observedEffect * hypothesis.predictedDirection;
    const supportsPrediction =
      hypothesis.predictedDirection === 0
        ? Math.abs(outcome.observedEffect) < this.config.minimumEffect
        : signedObserved >= this.config.minimumEffect;
    const sameGroupCount = [...this.trials.values()].filter(
      (candidate) =>
        candidate.status === "observed" &&
        candidate.hypothesisId === hypothesis.id &&
        candidate.design.replicationGroup &&
        candidate.design.replicationGroup === trial.design.replicationGroup,
    ).length;
    const replicationMultiplier = 1 + Math.min(0.5, sameGroupCount * 0.1);
    const centeredEffect =
      hypothesis.predictedDirection === 0
        ? this.config.minimumEffect - Math.abs(outcome.observedEffect)
        : signedObserved - this.config.minimumEffect;
    const evidenceWeight =
      Math.tanh(centeredEffect / this.config.evidenceScale) *
      reliability *
      replicationMultiplier;
    const expectedEffect =
      trial.design.expectedEffect * hypothesis.predictedDirection;
    const surprise = this.clamp01(
      Math.abs(signedObserved - expectedEffect) /
        (Math.abs(expectedEffect) + this.config.evidenceScale),
    );

    trial.status = "observed";
    trial.observedEffect = outcome.observedEffect;
    trial.reliability = reliability;
    trial.evidenceWeight = evidenceWeight;
    trial.surprise = surprise;
    trial.supportsPrediction = supportsPrediction;
    trial.observedAt = Date.now();

    hypothesis.logOdds = Math.max(
      -8,
      Math.min(8, hypothesis.logOdds + evidenceWeight * 2.2),
    );
    hypothesis.posteriorConfidence = this.sigmoid(hypothesis.logOdds);
    hypothesis.evidenceCount++;
    if (evidenceWeight >= 0) hypothesis.supportingEvidence += evidenceWeight;
    else hypothesis.contradictingEvidence += Math.abs(evidenceWeight);
    hypothesis.replicationCount += sameGroupCount > 0 ? 1 : 0;
    hypothesis.meanSurprise +=
      (surprise - hypothesis.meanSurprise) / hypothesis.evidenceCount;
    hypothesis.updatedAt = Date.now();
    this.updateStatus(hypothesis);

    this.recentSurprises.push(surprise);
    if (this.recentSurprises.length > 32) this.recentSurprises.shift();
    if (surprise >= this.config.surpriseThreshold) {
      this.emit("epistemic_surprise", {
        hypothesisId: hypothesis.id,
        trialId: trial.id,
        surprise,
        observedEffect: outcome.observedEffect,
        expectedEffect: trial.design.expectedEffect,
      });
    }

    this.emit("evidence_recorded", {
      hypothesis: { ...hypothesis, sourceIds: [...hypothesis.sourceIds] },
      trial: this.copyTrial(trial),
      notes: outcome.notes,
    });
    return this.copyTrial(trial);
  }

  castDaoVote(
    hypothesisId: string,
    vote: Omit<DaoEvidenceVote, "timestamp">,
  ): boolean {
    if (!this.hypotheses.has(hypothesisId)) return false;
    const hypothesisVotes = this.votes.get(hypothesisId) ?? new Map();
    hypothesisVotes.set(vote.agentId, {
      ...vote,
      confidence: this.clamp01(vote.confidence),
      timestamp: Date.now(),
    });
    this.votes.set(hypothesisId, hypothesisVotes);
    this.emit("dao_vote_cast", { hypothesisId, agentId: vote.agentId });
    return true;
  }

  ratify(hypothesisId: string, eligibleAgents: number): DaoRatificationResult {
    const hypothesis = this.hypotheses.get(hypothesisId);
    const hypothesisVotes = [...(this.votes.get(hypothesisId)?.values() ?? [])];
    if (!hypothesis) {
      return this.ratificationFailure(hypothesisId, "hypothesis not found");
    }
    if (hypothesis.status !== CausalHypothesisStatus.SUPPORTED) {
      return this.ratificationFailure(
        hypothesisId,
        "evidence threshold not met",
      );
    }

    const electorate = Math.max(1, eligibleAgents);
    const participation = this.clamp01(hypothesisVotes.length / electorate);
    const approvals = hypothesisVotes.filter((vote) => vote.approve).length;
    const approval =
      hypothesisVotes.length > 0 ? approvals / hypothesisVotes.length : 0;
    const totalConfidence = hypothesisVotes.reduce(
      (sum, vote) => sum + vote.confidence,
      0,
    );
    const weightedApproval =
      totalConfidence > 0
        ? hypothesisVotes.reduce(
            (sum, vote) => sum + (vote.approve ? vote.confidence : 0),
            0,
          ) / totalConfidence
        : 0;
    const ratified =
      participation >= this.config.quorumThreshold &&
      weightedApproval >= this.config.approvalThreshold;

    if (ratified) {
      hypothesis.status = CausalHypothesisStatus.RATIFIED;
      hypothesis.updatedAt = Date.now();
    }
    const result: DaoRatificationResult = {
      hypothesisId,
      ratified,
      participation,
      approval,
      weightedApproval,
      reason: ratified
        ? "evidence and DAO quorum satisfied"
        : "DAO quorum or approval threshold not met",
    };
    this.emit("ratification_decided", result);
    return result;
  }

  getHypothesis(id: string): CausalHypothesis | null {
    const hypothesis = this.hypotheses.get(id);
    return hypothesis
      ? { ...hypothesis, sourceIds: [...hypothesis.sourceIds] }
      : null;
  }

  getHypotheses(): CausalHypothesis[] {
    return [...this.hypotheses.values()].map((hypothesis) => ({
      ...hypothesis,
      sourceIds: [...hypothesis.sourceIds],
    }));
  }

  getTrials(hypothesisId?: string): CounterfactualTrial[] {
    return [...this.trials.values()]
      .filter((trial) => !hypothesisId || trial.hypothesisId === hypothesisId)
      .map((trial) => this.copyTrial(trial));
  }

  getState(): CausalForgeState {
    const hypotheses = [...this.hypotheses.values()];
    const count = (status: CausalHypothesisStatus): number =>
      hypotheses.filter((hypothesis) => hypothesis.status === status).length;
    const mean = (
      selector: (hypothesis: CausalHypothesis) => number,
    ): number =>
      hypotheses.length > 0
        ? hypotheses.reduce(
            (sum, hypothesis) => sum + selector(hypothesis),
            0,
          ) / hypotheses.length
        : 0;

    return {
      hypotheses: hypotheses.length,
      proposed: count(CausalHypothesisStatus.PROPOSED),
      testing: count(CausalHypothesisStatus.TESTING),
      supported: count(CausalHypothesisStatus.SUPPORTED),
      falsified: count(CausalHypothesisStatus.FALSIFIED),
      ratified: count(CausalHypothesisStatus.RATIFIED),
      activeTrials: [...this.trials.values()].filter(
        (trial) => trial.status === "designed",
      ).length,
      meanPosteriorConfidence: mean(
        (hypothesis) => hypothesis.posteriorConfidence,
      ),
      meanFalsifiability: mean((hypothesis) => hypothesis.falsifiability),
      meanSurprise: mean((hypothesis) => hypothesis.meanSurprise),
    };
  }

  getVisualState(): CausalForgeVisualState {
    const state = this.getState();
    const decided = state.supported + state.falsified + state.ratified;
    const allVotes = [...this.votes.values()].flatMap((votes) => [
      ...votes.values(),
    ]);
    const voteWeight = allVotes.reduce((sum, vote) => sum + vote.confidence, 0);
    const approvedWeight = allVotes.reduce(
      (sum, vote) => sum + (vote.approve ? vote.confidence : 0),
      0,
    );

    return {
      causalRigor: this.clamp01(
        state.meanFalsifiability * 0.55 +
          (state.hypotheses > 0 ? decided / state.hypotheses : 0) * 0.45,
      ),
      falsificationPressure: this.clamp01(
        state.hypotheses > 0
          ? (state.testing + state.falsified) / state.hypotheses
          : 0,
      ),
      epistemicSurprise:
        this.recentSurprises.length > 0 ? Math.max(...this.recentSurprises) : 0,
      daoEvidenceConsensus: voteWeight > 0 ? approvedWeight / voteWeight : 0,
      activeExperimentation: this.clamp01(state.activeTrials / 8),
    };
  }

  reset(): void {
    this.hypotheses.clear();
    this.trials.clear();
    this.votes.clear();
    this.recentSurprises = [];
    this.hypothesisSequence = 0;
    this.trialSequence = 0;
    this.emit("reset");
  }

  private updateStatus(hypothesis: CausalHypothesis): void {
    if (hypothesis.evidenceCount < this.config.minimumEvidence) {
      hypothesis.status = CausalHypothesisStatus.TESTING;
    } else if (hypothesis.posteriorConfidence >= this.config.supportThreshold) {
      hypothesis.status = CausalHypothesisStatus.SUPPORTED;
    } else if (
      hypothesis.posteriorConfidence <= this.config.falsificationThreshold
    ) {
      hypothesis.status = CausalHypothesisStatus.FALSIFIED;
    } else {
      hypothesis.status = CausalHypothesisStatus.TESTING;
    }
  }

  private enforceCapacity(): void {
    while (this.hypotheses.size > this.config.maximumHypotheses) {
      const removable = [...this.hypotheses.values()]
        .filter(
          (hypothesis) => hypothesis.status !== CausalHypothesisStatus.RATIFIED,
        )
        .sort((left, right) => left.updatedAt - right.updatedAt)[0];
      if (!removable) break;
      this.hypotheses.delete(removable.id);
      this.votes.delete(removable.id);
      for (const [trialId, trial] of this.trials) {
        if (trial.hypothesisId === removable.id) this.trials.delete(trialId);
      }
    }
  }

  private ratificationFailure(
    hypothesisId: string,
    reason: string,
  ): DaoRatificationResult {
    return {
      hypothesisId,
      ratified: false,
      participation: 0,
      approval: 0,
      weightedApproval: 0,
      reason,
    };
  }

  private copyTrial(trial: CounterfactualTrial): CounterfactualTrial {
    return {
      ...trial,
      design: {
        ...trial.design,
        confoundControls: [...trial.design.confoundControls],
      },
    };
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  private clampProbability(value: number): number {
    return Math.max(0.001, Math.min(0.999, this.clamp01(value)));
  }

  private logit(probability: number): number {
    return Math.log(probability / (1 - probability));
  }

  private sigmoid(value: number): number {
    return 1 / (1 + Math.exp(-value));
  }
}

export const causalHypothesisForge = new CausalHypothesisForge();

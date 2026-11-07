import { EventEmitter } from "events";
import {
  causalHypothesisForge,
  CausalHypothesisStatus,
  type CausalHypothesis,
  type CounterfactualTrial,
  type InterventionDesign,
} from "./CausalHypothesisForge.js";

/** Minimal forge contract used by the scheduler for testability and reuse. */
export interface ExperimentForge {
  getHypotheses(): CausalHypothesis[];
  getTrials(hypothesisId?: string): CounterfactualTrial[];
  /** Optional reset epoch for forges that recycle hypothesis IDs. */
  getGeneration?(): number;
  designIntervention(
    hypothesisId: string,
    design: InterventionDesign,
  ): CounterfactualTrial | null;
}

/** Live self-state that constrains autonomous experimental action. */
export interface AutognosticExperimentContext {
  reservoirHealth: number;
  reservoirEntropy: number;
  isEdgeOfChaos: boolean;
  daoConsensus: number;
  energyLevel: number;
  isEnergyCrisis?: boolean;
  /** Optional caller-provided risk ceiling, normalized 0..1. */
  riskTolerance?: number;
  /** Injectable clock for deterministic simulation and tests. */
  now?: number;
}

export interface ExperimentCandidate {
  hypothesisId: string;
  statement: string;
  expectedInformationGain: number;
  falsifiability: number;
  replicationNeed: number;
  surprisePotential: number;
  governanceConfidence: number;
  estimatedCost: number;
  estimatedRisk: number;
  score: number;
  design: InterventionDesign;
}

export interface ExperimentGovernanceDecision {
  approved: boolean;
  reason: string;
  certificateId?: string;
  governanceScore?: number;
  peerConsensus?: number;
  quorumReached?: boolean;
  evidence?: Record<string, number | boolean | string>;
}

export interface ExperimentGovernanceAuthorizer {
  authorize(
    candidate: ExperimentCandidate,
  ): Promise<ExperimentGovernanceDecision>;
}

export type ExperimentScheduleRejectionReason =
  | "energy_crisis"
  | "low_energy"
  | "refractory"
  | "capacity"
  | "no_candidate"
  | "below_threshold"
  | "forge_rejected"
  | "governance_rejected"
  | "governance_error"
  | "stale_authorization"
  | "hypothesis_changed"
  | "hypothesis_ineligible";

/** Method instrumentation only: not an outcome, vote, or fresh ESN observation. */
export interface ExperimentPrecommitReceipt {
  previewAt: number;
  checkedAt: number;
  hypothesisId: string;
  generationBefore: number;
  generationAfter: number;
  forgeGenerationBefore: number | null;
  forgeGenerationAfter: number | null;
  activeTrialsBefore: number;
  activeTrialsAtCheck: number;
  maximumActiveTrials: number;
  lastScheduledAt: number | null;
  refractoryMs: number;
  checks: {
    generation: boolean;
    hypothesisUnchanged: boolean;
    candidateUnchanged: boolean;
    eligible: boolean;
    exclusive: boolean;
    capacity: boolean;
    refractory: boolean;
  };
  certificateId?: string;
  approved: boolean;
  trialId?: string;
}

export interface ExperimentScheduleDecision {
  scheduled: boolean;
  reason: "scheduled" | ExperimentScheduleRejectionReason;
  timestamp: number;
  explorationTemperature: number;
  candidate: ExperimentCandidate | null;
  trial: CounterfactualTrial | null;
  governanceDecision: ExperimentGovernanceDecision | null;
  precommitReceipt?: ExperimentPrecommitReceipt;
}

interface ExperimentSchedulePreparation {
  timestamp: number;
  explorationTemperature: number;
  candidate: ExperimentCandidate | null;
  rejectionReason: ExperimentScheduleRejectionReason | null;
}

export interface ActiveInferenceSchedulerState {
  decisions: number;
  scheduledExperiments: number;
  rejectedExperiments: number;
  meanExpectedInformationGain: number;
  lastScheduledAt: number | null;
  lastDecision: ExperimentScheduleDecision | null;
}

export interface ActiveInferenceExperimentSchedulerConfig {
  minimumScore: number;
  minimumEnergy: number;
  maximumActiveTrials: number;
  refractoryMs: number;
  riskAversion: number;
  costAversion: number;
  informationGainWeight: number;
  falsifiabilityWeight: number;
  replicationWeight: number;
  surpriseWeight: number;
  governanceWeight: number;
  energyWeight: number;
}

export const DEFAULT_ACTIVE_INFERENCE_SCHEDULER_CONFIG: ActiveInferenceExperimentSchedulerConfig =
  {
    minimumScore: 0.38,
    minimumEnergy: 0.18,
    maximumActiveTrials: 4,
    refractoryMs: 15_000,
    riskAversion: 0.18,
    costAversion: 0.14,
    informationGainWeight: 0.34,
    falsifiabilityWeight: 0.18,
    replicationWeight: 0.12,
    surpriseWeight: 0.1,
    governanceWeight: 0.12,
    energyWeight: 0.14,
  };

/**
 * Bayesian experimental-design layer for Deep Tree Echo.
 *
 * The causal forge can represent hypotheses and evidence, but representation is
 * not agency. This scheduler closes that gap: it chooses which uncertainty to
 * reduce next, designs a controlled counterfactual intervention, and commits it
 * to the forge only when autognostic, energetic, risk, and DAO constraints agree.
 *
 * Reservoir entropy controls exploration temperature. Edge-of-chaos operation
 * increases curiosity, while poor reservoir health and low metabolic energy
 * suppress action. The result is scientific initiative with self-restraint.
 */
export class ActiveInferenceExperimentScheduler extends EventEmitter {
  private readonly config: ActiveInferenceExperimentSchedulerConfig;
  private decisions = 0;
  private scheduledExperiments = 0;
  private rejectedExperiments = 0;
  private totalExpectedInformationGain = 0;
  private lastScheduledAt: number | null = null;
  private lastDecision: ExperimentScheduleDecision | null = null;
  private generation = 0;

  constructor(
    private readonly forge: ExperimentForge,
    config: Partial<ActiveInferenceExperimentSchedulerConfig> = {},
    /** Production commit clock; explicit context.now retains simulation semantics. */
    private readonly clock: () => number = Date.now,
  ) {
    super();
    this.config = {
      ...DEFAULT_ACTIVE_INFERENCE_SCHEDULER_CONFIG,
      ...config,
    };
  }

  evaluateCandidates(
    context: AutognosticExperimentContext,
  ): ExperimentCandidate[] {
    const normalized = this.normalizeContext(context);
    const activeHypothesisIds = new Set(
      this.forge
        .getTrials()
        .filter((trial) => trial.status === "designed")
        .map((trial) => trial.hypothesisId),
    );

    return this.forge
      .getHypotheses()
      .filter(
        (hypothesis) =>
          hypothesis.status !== CausalHypothesisStatus.FALSIFIED &&
          hypothesis.status !== CausalHypothesisStatus.RATIFIED &&
          !activeHypothesisIds.has(hypothesis.id),
      )
      .map((hypothesis) => this.scoreCandidate(hypothesis, normalized))
      .filter(
        (candidate) => candidate.estimatedRisk <= normalized.riskTolerance,
      )
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.expectedInformationGain - left.expectedInformationGain ||
          left.hypothesisId.localeCompare(right.hypothesisId),
      );
  }

  scheduleNext(
    context: AutognosticExperimentContext,
  ): ExperimentScheduleDecision {
    const preparation = this.prepareSchedule(context);
    this.decisions++;
    if (preparation.rejectionReason || !preparation.candidate) {
      return this.reject(
        preparation.rejectionReason ?? "no_candidate",
        preparation.timestamp,
        preparation.explorationTemperature,
        preparation.candidate,
      );
    }
    return this.commitCandidate(preparation, null);
  }

  /**
   * Authorize the selected intervention through an asynchronous governance
   * layer before mutating the causal forge. This keeps candidate scoring
   * replayable while allowing real peer quorum and embodied-autognosis gates.
   */
  async scheduleNextGoverned(
    context: AutognosticExperimentContext,
    authorizer: ExperimentGovernanceAuthorizer,
  ): Promise<ExperimentScheduleDecision> {
    const simulationNow = context.now;
    const preparation = this.prepareSchedule(context);
    this.decisions++;
    if (preparation.rejectionReason || !preparation.candidate) {
      return this.reject(
        preparation.rejectionReason ?? "no_candidate",
        preparation.timestamp,
        preparation.explorationTemperature,
        preparation.candidate,
      );
    }

    const generation = this.generation;
    const forgeGeneration = this.forge.getGeneration?.() ?? null;
    const candidate = preparation.candidate;
    const hypothesisBefore = this.hypothesisSnapshot(candidate.hypothesisId);
    const candidateBefore = this.snapshot(candidate);
    const activeTrialsBefore = this.forge
      .getTrials()
      .filter((trial) => trial.status === "designed").length;
    // The authorizer cannot mutate the selected design or scheduler's snapshot.
    const authorizedCandidate = this.copyCandidate(candidate);
    let governanceDecision: ExperimentGovernanceDecision;
    try {
      const approval = await authorizer.authorize(authorizedCandidate);
      governanceDecision = {
        ...approval,
        evidence: approval.evidence ? { ...approval.evidence } : undefined,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return this.reject(
        generation === this.generation
          ? "governance_error"
          : "stale_authorization",
        preparation.timestamp,
        preparation.explorationTemperature,
        preparation.candidate,
        {
          approved: false,
          reason,
        },
        undefined,
        generation === this.generation,
      );
    }

    // Synchronous precommit barrier: no await between these checks and design.
    // Energy/ESN inputs remain preview evidence; no live-context provider exists.
    const checkedAt = simulationNow ?? this.clock();
    const hypothesis = this.forge
      .getHypotheses()
      .find((item) => item.id === candidate.hypothesisId);
    const hypothesisAfter = hypothesis ? this.snapshot(hypothesis) : null;
    const candidateAfter = this.snapshot(authorizedCandidate);
    const activeTrials = this.forge
      .getTrials()
      .filter((trial) => trial.status === "designed");
    const forgeGenerationAfter = this.forge.getGeneration?.() ?? null;
    const receipt: ExperimentPrecommitReceipt = {
      previewAt: preparation.timestamp,
      checkedAt,
      hypothesisId: candidate.hypothesisId,
      generationBefore: generation,
      generationAfter: this.generation,
      forgeGenerationBefore: forgeGeneration,
      forgeGenerationAfter,
      activeTrialsBefore,
      activeTrialsAtCheck: activeTrials.length,
      maximumActiveTrials: this.config.maximumActiveTrials,
      lastScheduledAt: this.lastScheduledAt,
      refractoryMs: this.config.refractoryMs,
      checks: {
        generation:
          generation === this.generation &&
          forgeGeneration === forgeGenerationAfter,
        hypothesisUnchanged:
          hypothesisBefore !== null && hypothesisBefore === hypothesisAfter,
        candidateUnchanged: candidateBefore === candidateAfter,
        eligible:
          !!hypothesis &&
          hypothesis.status !== CausalHypothesisStatus.FALSIFIED &&
          hypothesis.status !== CausalHypothesisStatus.RATIFIED,
        exclusive: !activeTrials.some(
          (trial) => trial.hypothesisId === candidate.hypothesisId,
        ),
        capacity: activeTrials.length < this.config.maximumActiveTrials,
        refractory:
          this.lastScheduledAt === null ||
          checkedAt - this.lastScheduledAt >= this.config.refractoryMs,
      },
      certificateId: governanceDecision.certificateId,
      approved: governanceDecision.approved,
    };
    const checks = receipt.checks;
    const rejectionReason: ExperimentScheduleRejectionReason | null =
      !checks.generation
        ? "stale_authorization"
        : !governanceDecision.approved
          ? "governance_rejected"
          : !checks.candidateUnchanged
            ? "stale_authorization"
            : !hypothesis
              ? "hypothesis_changed"
              : !checks.eligible
                ? "hypothesis_ineligible"
                : !checks.capacity
                  ? "capacity"
                  : !checks.refractory
                    ? "refractory"
                    : !checks.exclusive
                      ? "hypothesis_ineligible"
                      : !checks.hypothesisUnchanged
                        ? "hypothesis_changed"
                        : null;

    if (rejectionReason) {
      return this.reject(
        rejectionReason,
        checkedAt,
        preparation.explorationTemperature,
        preparation.candidate,
        governanceDecision,
        receipt,
        generation === this.generation,
      );
    }

    return this.commitCandidate(
      preparation,
      governanceDecision,
      checkedAt,
      receipt,
    );
  }

  private prepareSchedule(
    context: AutognosticExperimentContext,
  ): ExperimentSchedulePreparation {
    const normalized = this.normalizeContext(context);
    const timestamp = normalized.now;
    const explorationTemperature =
      this.computeExplorationTemperature(normalized);
    let rejectionReason: ExperimentScheduleRejectionReason | null = null;

    if (normalized.isEnergyCrisis) rejectionReason = "energy_crisis";
    else if (normalized.energyLevel < this.config.minimumEnergy)
      rejectionReason = "low_energy";
    else if (
      this.lastScheduledAt !== null &&
      timestamp - this.lastScheduledAt < this.config.refractoryMs
    )
      rejectionReason = "refractory";
    else {
      const activeTrials = this.forge
        .getTrials()
        .filter((trial) => trial.status === "designed").length;
      if (activeTrials >= this.config.maximumActiveTrials)
        rejectionReason = "capacity";
    }

    if (rejectionReason) {
      return {
        timestamp,
        explorationTemperature,
        candidate: null,
        rejectionReason,
      };
    }

    const candidates = this.evaluateCandidates(normalized);
    if (candidates.length === 0) {
      return {
        timestamp,
        explorationTemperature,
        candidate: null,
        rejectionReason: "no_candidate",
      };
    }

    const candidate = this.selectCandidate(candidates, explorationTemperature);
    return {
      timestamp,
      explorationTemperature,
      candidate,
      rejectionReason:
        candidate.score < this.config.minimumScore ? "below_threshold" : null,
    };
  }

  private commitCandidate(
    preparation: ExperimentSchedulePreparation,
    governanceDecision: ExperimentGovernanceDecision | null,
    timestamp = preparation.timestamp,
    precommitReceipt?: ExperimentPrecommitReceipt,
  ): ExperimentScheduleDecision {
    const candidate = preparation.candidate!;
    const trial = this.forge.designIntervention(
      candidate.hypothesisId,
      candidate.design,
    );
    if (!trial) {
      return this.reject(
        "forge_rejected",
        timestamp,
        preparation.explorationTemperature,
        candidate,
        governanceDecision,
        precommitReceipt,
      );
    }

    const decision: ExperimentScheduleDecision = {
      scheduled: true,
      reason: "scheduled",
      timestamp,
      explorationTemperature: preparation.explorationTemperature,
      candidate,
      trial,
      governanceDecision,
      precommitReceipt: precommitReceipt
        ? { ...precommitReceipt, trialId: trial.id }
        : undefined,
    };
    this.scheduledExperiments++;
    this.totalExpectedInformationGain += candidate.expectedInformationGain;
    this.lastScheduledAt = timestamp;
    this.lastDecision = decision;
    this.emit("experiment_scheduled", this.copyDecision(decision));
    return this.copyDecision(decision);
  }

  getState(): ActiveInferenceSchedulerState {
    return {
      decisions: this.decisions,
      scheduledExperiments: this.scheduledExperiments,
      rejectedExperiments: this.rejectedExperiments,
      meanExpectedInformationGain:
        this.scheduledExperiments > 0
          ? this.totalExpectedInformationGain / this.scheduledExperiments
          : 0,
      lastScheduledAt: this.lastScheduledAt,
      lastDecision: this.lastDecision
        ? this.copyDecision(this.lastDecision)
        : null,
    };
  }

  reset(): void {
    this.generation++;
    this.decisions = 0;
    this.scheduledExperiments = 0;
    this.rejectedExperiments = 0;
    this.totalExpectedInformationGain = 0;
    this.lastScheduledAt = null;
    this.lastDecision = null;
    this.emit("reset");
  }

  private scoreCandidate(
    hypothesis: CausalHypothesis,
    context: Required<AutognosticExperimentContext>,
  ): ExperimentCandidate {
    const expectedInformationGain = this.binaryEntropy(
      hypothesis.posteriorConfidence,
    );
    const falsifiability = this.clamp01(hypothesis.falsifiability);
    const replicationNeed = this.clamp01(1 - hypothesis.replicationCount / 3);
    const surprisePotential = this.clamp01(
      expectedInformationGain * 0.65 + hypothesis.meanSurprise * 0.35,
    );
    const governanceConfidence = this.clamp01(
      context.daoConsensus * 0.7 + context.reservoirHealth * 0.3,
    );
    const estimatedCost = this.estimateCost(hypothesis);
    const estimatedRisk = this.estimateRisk(hypothesis, context);

    const positive =
      expectedInformationGain * this.config.informationGainWeight +
      falsifiability * this.config.falsifiabilityWeight +
      replicationNeed * this.config.replicationWeight +
      surprisePotential * this.config.surpriseWeight +
      governanceConfidence * this.config.governanceWeight +
      context.energyLevel * this.config.energyWeight;
    const restraint =
      estimatedRisk * this.config.riskAversion +
      estimatedCost * this.config.costAversion;
    const score = this.clamp01(positive - restraint);

    return {
      hypothesisId: hypothesis.id,
      statement: hypothesis.statement,
      expectedInformationGain,
      falsifiability,
      replicationNeed,
      surprisePotential,
      governanceConfidence,
      estimatedCost,
      estimatedRisk,
      score,
      design: this.designIntervention(hypothesis),
    };
  }

  private selectCandidate(
    candidates: ExperimentCandidate[],
    explorationTemperature: number,
  ): ExperimentCandidate {
    if (candidates.length === 1 || explorationTemperature <= 0.35) {
      return candidates[0];
    }

    // Deterministic Boltzmann proxy: blend utility rank with novelty rank.
    // This preserves replayability while increasing exploration near chaos.
    const byNovelty = [...candidates].sort(
      (left, right) =>
        right.surprisePotential - left.surprisePotential ||
        right.expectedInformationGain - left.expectedInformationGain,
    );
    const exploratoryIndex = Math.min(
      candidates.length - 1,
      Math.floor(explorationTemperature * candidates.length),
    );
    const exploratory = byNovelty[exploratoryIndex];
    return explorationTemperature >= 0.72 &&
      exploratory.score >= candidates[0].score * 0.8
      ? exploratory
      : candidates[0];
  }

  private designIntervention(hypothesis: CausalHypothesis): InterventionDesign {
    const direction = hypothesis.predictedDirection;
    const expectedMagnitude = 0.15 + hypothesis.posteriorConfidence * 0.45;
    return {
      manipulatedVariable: hypothesis.cause,
      controlCondition: `Hold ${hypothesis.cause} at its observed baseline`,
      expectedEffect: direction === 0 ? 0 : direction * expectedMagnitude,
      measurement: `Measure change in ${hypothesis.effect} relative to control`,
      confoundControls: [
        `Randomize exposure to ${hypothesis.cause}`,
        `Blind assessment of ${hypothesis.effect}`,
        "Hold known contextual covariates constant",
      ],
      replicationGroup: `${hypothesis.id}:canonical`,
    };
  }

  private computeExplorationTemperature(
    context: Required<AutognosticExperimentContext>,
  ): number {
    return this.clamp01(
      0.18 +
        context.reservoirEntropy * 0.34 +
        (1 - context.reservoirHealth) * 0.12 +
        (context.isEdgeOfChaos ? 0.22 : 0) +
        (1 - context.daoConsensus) * 0.08,
    );
  }

  private estimateCost(hypothesis: CausalHypothesis): number {
    const textualComplexity = Math.min(1, hypothesis.statement.length / 240);
    const sourceComplexity = Math.min(1, hypothesis.sourceIds.length / 8);
    return this.clamp01(textualComplexity * 0.65 + sourceComplexity * 0.35);
  }

  private estimateRisk(
    hypothesis: CausalHypothesis,
    context: Required<AutognosticExperimentContext>,
  ): number {
    const uncertainty = this.binaryEntropy(hypothesis.posteriorConfidence);
    const healthPenalty = 1 - context.reservoirHealth;
    const governancePenalty = 1 - context.daoConsensus;
    return this.clamp01(
      uncertainty * 0.32 + healthPenalty * 0.28 + governancePenalty * 0.4,
    );
  }

  private normalizeContext(
    context: AutognosticExperimentContext,
  ): Required<AutognosticExperimentContext> {
    return {
      reservoirHealth: this.clamp01(context.reservoirHealth),
      reservoirEntropy: this.clamp01(context.reservoirEntropy),
      isEdgeOfChaos: Boolean(context.isEdgeOfChaos),
      daoConsensus: this.clamp01(context.daoConsensus),
      energyLevel: this.clamp01(context.energyLevel),
      isEnergyCrisis: Boolean(context.isEnergyCrisis),
      riskTolerance: this.clamp01(context.riskTolerance ?? 0.72),
      now: context.now ?? this.clock(),
    };
  }

  private reject(
    reason: ExperimentScheduleRejectionReason,
    timestamp: number,
    explorationTemperature: number,
    candidate: ExperimentCandidate | null = null,
    governanceDecision: ExperimentGovernanceDecision | null = null,
    precommitReceipt?: ExperimentPrecommitReceipt,
    record = true,
  ): ExperimentScheduleDecision {
    const decision: ExperimentScheduleDecision = {
      scheduled: false,
      reason,
      timestamp,
      explorationTemperature,
      candidate,
      trial: null,
      governanceDecision,
      precommitReceipt,
    };
    // Old-generation completions return history only, not reset-era telemetry.
    if (record) {
      this.rejectedExperiments++;
      this.lastDecision = decision;
      this.emit("experiment_deferred", this.copyDecision(decision));
    }
    return this.copyDecision(decision);
  }

  private snapshot(value: CausalHypothesis | ExperimentCandidate): string {
    // Exact, detached canonical serialization, not a hash or authority token.
    // Keep substantive prose private; receipts expose only equality checks.
    const canonical = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(canonical);
      if (item && typeof item === "object") {
        return Object.fromEntries(
          Object.entries(item)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, nested]) => [key, canonical(nested)]),
        );
      }
      return item;
    };
    return JSON.stringify(canonical(value));
  }

  private hypothesisSnapshot(id: string): string | null {
    const hypothesis = this.forge
      .getHypotheses()
      .find((item) => item.id === id);
    return hypothesis ? this.snapshot(hypothesis) : null;
  }

  private copyCandidate(candidate: ExperimentCandidate): ExperimentCandidate {
    return {
      ...candidate,
      design: {
        ...candidate.design,
        confoundControls: [...candidate.design.confoundControls],
      },
    };
  }

  private copyDecision(
    decision: ExperimentScheduleDecision,
  ): ExperimentScheduleDecision {
    return {
      ...decision,
      precommitReceipt: decision.precommitReceipt
        ? {
            ...decision.precommitReceipt,
            checks: { ...decision.precommitReceipt.checks },
          }
        : undefined,
      candidate: decision.candidate
        ? this.copyCandidate(decision.candidate)
        : null,
      governanceDecision: decision.governanceDecision
        ? {
            ...decision.governanceDecision,
            evidence: decision.governanceDecision.evidence
              ? { ...decision.governanceDecision.evidence }
              : undefined,
          }
        : null,
      trial: decision.trial
        ? {
            ...decision.trial,
            design: {
              ...decision.trial.design,
              confoundControls: [...decision.trial.design.confoundControls],
            },
          }
        : null,
    };
  }

  private binaryEntropy(probability: number): number {
    const p = Math.max(0.001, Math.min(0.999, this.clamp01(probability)));
    return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }
}

export const activeInferenceExperimentScheduler =
  new ActiveInferenceExperimentScheduler(causalHypothesisForge);

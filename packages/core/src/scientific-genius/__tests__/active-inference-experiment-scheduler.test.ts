import {
  ActiveInferenceExperimentScheduler,
  type AutognosticExperimentContext,
  type ExperimentGovernanceDecision,
  type ExperimentScheduleDecision,
} from "../ActiveInferenceExperimentScheduler.js";
import {
  CausalHypothesisForge,
  CausalHypothesisStatus,
} from "../CausalHypothesisForge.js";

const READY_CONTEXT: AutognosticExperimentContext = {
  reservoirHealth: 0.9,
  reservoirEntropy: 0.55,
  isEdgeOfChaos: true,
  daoConsensus: 0.84,
  energyLevel: 0.88,
  riskTolerance: 0.8,
  now: 10_000,
};

function propose(
  forge: CausalHypothesisForge,
  label: string,
  priorConfidence = 0.5,
  falsifiability = 0.9,
) {
  return forge.propose({
    statement: `${label} changes measurable system coherence.`,
    cause: label,
    effect: "system coherence",
    predictedDirection: 1,
    domain: "cognitive science",
    priorConfidence,
    falsifiability,
    sourceIds: [`source:${label}`],
  });
}

function makeScheduler(
  forge = new CausalHypothesisForge(),
  config: ConstructorParameters<
    typeof ActiveInferenceExperimentScheduler
  >[1] = {},
) {
  return {
    forge,
    scheduler: new ActiveInferenceExperimentScheduler(forge, {
      minimumScore: 0,
      refractoryMs: 0,
      ...config,
    }),
  };
}

function deferredApproval() {
  let resolve!: (decision: ExperimentGovernanceDecision) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<ExperimentGovernanceDecision>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { resolve, reject, authorizer: { authorize: () => promise } };
}

// Labelled governance test fixture; never an actual DAO vote or outcome.
const APPROVAL: ExperimentGovernanceDecision = {
  approved: true,
  reason: "test quorum fixture",
  certificateId: "fixture:approval",
};

describe("ActiveInferenceExperimentScheduler", () => {
  it("prioritizes hypotheses with maximum expected information gain", () => {
    const { forge, scheduler } = makeScheduler();
    const uncertain = propose(forge, "uncertain intervention", 0.5);
    const nearlyKnown = propose(forge, "nearly known intervention", 0.95);

    const candidates = scheduler.evaluateCandidates(READY_CONTEXT);

    expect(candidates[0].hypothesisId).toBe(uncertain.id);
    expect(
      candidates.find((candidate) => candidate.hypothesisId === uncertain.id)
        ?.expectedInformationGain,
    ).toBeGreaterThan(
      candidates.find((candidate) => candidate.hypothesisId === nearlyKnown.id)
        ?.expectedInformationGain ?? 1,
    );
  });

  it("designs and commits a controlled counterfactual intervention", () => {
    const { forge, scheduler } = makeScheduler();
    const hypothesis = propose(forge, "reservoir spectral radius");

    const decision = scheduler.scheduleNext(READY_CONTEXT);

    expect(decision.scheduled).toBe(true);
    expect(decision.reason).toBe("scheduled");
    expect(decision.candidate?.hypothesisId).toBe(hypothesis.id);
    expect(decision.trial?.design).toEqual(
      expect.objectContaining({
        manipulatedVariable: "reservoir spectral radius",
        measurement: expect.stringContaining("system coherence"),
        confoundControls: expect.arrayContaining([
          expect.stringContaining("Randomize"),
          expect.stringContaining("Blind"),
        ]),
      }),
    );
    expect(forge.getTrials(hypothesis.id)).toHaveLength(1);
  });

  it("defers experimentation during a metabolic energy crisis", () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "energy-sensitive action");

    const decision = scheduler.scheduleNext({
      ...READY_CONTEXT,
      isEnergyCrisis: true,
    });

    expect(decision).toEqual(
      expect.objectContaining({ scheduled: false, reason: "energy_crisis" }),
    );
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("defers experimentation below the minimum epistemic energy", () => {
    const { forge, scheduler } = makeScheduler(undefined, {
      minimumEnergy: 0.4,
    });
    propose(forge, "low-energy action");

    const decision = scheduler.scheduleNext({
      ...READY_CONTEXT,
      energyLevel: 0.2,
    });

    expect(decision.reason).toBe("low_energy");
    expect(decision.scheduled).toBe(false);
  });

  it("enforces a refractory period between autonomous interventions", () => {
    const { forge, scheduler } = makeScheduler(undefined, {
      refractoryMs: 1_000,
    });
    propose(forge, "first action");
    propose(forge, "second action");

    expect(scheduler.scheduleNext(READY_CONTEXT).scheduled).toBe(true);
    const second = scheduler.scheduleNext({ ...READY_CONTEXT, now: 10_500 });

    expect(second.reason).toBe("refractory");
  });

  it("respects the configured active-trial capacity", () => {
    const { forge, scheduler } = makeScheduler(undefined, {
      maximumActiveTrials: 1,
    });
    const active = propose(forge, "already active");
    propose(forge, "queued action");
    forge.designIntervention(active.id, {
      manipulatedVariable: active.cause,
      controlCondition: "baseline",
      expectedEffect: 0.4,
      measurement: active.effect,
      confoundControls: [],
    });

    const decision = scheduler.scheduleNext(READY_CONTEXT);

    expect(decision.reason).toBe("capacity");
  });

  it("does not schedule a second trial for an already active hypothesis", () => {
    const { forge, scheduler } = makeScheduler();
    const active = propose(forge, "active hypothesis");
    const available = propose(forge, "available hypothesis");
    forge.designIntervention(active.id, {
      manipulatedVariable: active.cause,
      controlCondition: "baseline",
      expectedEffect: 0.4,
      measurement: active.effect,
      confoundControls: [],
    });

    const candidates = scheduler.evaluateCandidates(READY_CONTEXT);

    expect(candidates.map((candidate) => candidate.hypothesisId)).toEqual([
      available.id,
    ]);
  });

  it("filters candidates that exceed DAO-informed risk tolerance", () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "high-risk uncertain action");

    const candidates = scheduler.evaluateCandidates({
      ...READY_CONTEXT,
      reservoirHealth: 0.05,
      daoConsensus: 0.05,
      riskTolerance: 0.1,
    });

    expect(candidates).toHaveLength(0);
    expect(
      scheduler.scheduleNext({
        ...READY_CONTEXT,
        reservoirHealth: 0.05,
        daoConsensus: 0.05,
        riskTolerance: 0.1,
      }).reason,
    ).toBe("no_candidate");
  });

  it("raises exploration temperature at the ESN edge of chaos", () => {
    const cold = makeScheduler();
    const hot = makeScheduler();

    const coldDecision = cold.scheduler.scheduleNext({
      ...READY_CONTEXT,
      isEdgeOfChaos: false,
      reservoirEntropy: 0.1,
    });
    const hotDecision = hot.scheduler.scheduleNext({
      ...READY_CONTEXT,
      isEdgeOfChaos: true,
      reservoirEntropy: 0.9,
    });

    expect(hotDecision.explorationTemperature).toBeGreaterThan(
      coldDecision.explorationTemperature,
    );
  });

  it("rejects a candidate below the configured utility threshold", () => {
    const { forge, scheduler } = makeScheduler(undefined, {
      minimumScore: 0.99,
    });
    propose(forge, "insufficient utility", 0.99, 0.1);

    const decision = scheduler.scheduleNext(READY_CONTEXT);

    expect(decision.reason).toBe("below_threshold");
    expect(decision.candidate).not.toBeNull();
  });

  it("tracks scheduling statistics and mean information gain", () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "statistics action");

    const decision = scheduler.scheduleNext(READY_CONTEXT);
    const state = scheduler.getState();

    expect(state.decisions).toBe(1);
    expect(state.scheduledExperiments).toBe(1);
    expect(state.rejectedExperiments).toBe(0);
    expect(state.meanExpectedInformationGain).toBeCloseTo(
      decision.candidate?.expectedInformationGain ?? 0,
    );
    expect(state.lastScheduledAt).toBe(READY_CONTEXT.now);
  });

  it("returns defensive copies of nested intervention arrays", () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "copy-safe action");

    const decision = scheduler.scheduleNext(READY_CONTEXT);
    decision.candidate?.design.confoundControls.push("external mutation");
    decision.trial?.design.confoundControls.push("external trial mutation");

    const state = scheduler.getState();
    expect(
      state.lastDecision?.candidate?.design.confoundControls,
    ).not.toContain("external mutation");
    expect(state.lastDecision?.trial?.design.confoundControls).not.toContain(
      "external trial mutation",
    );
  });

  it("authorizes a candidate before committing it to the forge", async () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "governed experiment");
    let trialsDuringAuthorization = -1;

    const decision = await scheduler.scheduleNextGoverned(READY_CONTEXT, {
      authorize: async (candidate) => {
        trialsDuringAuthorization = forge.getTrials().length;
        return {
          approved: true,
          reason: "quorum",
          certificateId: `cert:${candidate.hypothesisId}`,
          governanceScore: 0.82,
          evidence: { cognitiveConsensus: 0.8 },
        };
      },
    });

    expect(trialsDuringAuthorization).toBe(0);
    expect(decision.scheduled).toBe(true);
    expect(decision.governanceDecision).toMatchObject({
      approved: true,
      reason: "quorum",
      governanceScore: 0.82,
    });
    expect(forge.getTrials()).toHaveLength(1);
  });

  it("leaves the causal forge untouched when governance rejects", async () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "rejected governed experiment");

    const decision = await scheduler.scheduleNextGoverned(READY_CONTEXT, {
      authorize: async () => ({
        approved: false,
        reason: "embodiment_unreliable",
      }),
    });

    expect(decision.scheduled).toBe(false);
    expect(decision.reason).toBe("governance_rejected");
    expect(decision.governanceDecision?.reason).toBe("embodiment_unreliable");
    expect(forge.getTrials()).toHaveLength(0);
    expect(scheduler.getState().rejectedExperiments).toBe(1);
  });

  it("fails closed when the governance authorizer throws", async () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "governance error experiment");

    const decision = await scheduler.scheduleNextGoverned(READY_CONTEXT, {
      authorize: async () => {
        throw new Error("peer transport unavailable");
      },
    });

    expect(decision.reason).toBe("governance_error");
    expect(decision.governanceDecision?.approved).toBe(false);
    expect(decision.governanceDecision?.reason).toContain(
      "peer transport unavailable",
    );
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("returns defensive copies of governance evidence", async () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "copy-safe governance");

    const decision = await scheduler.scheduleNextGoverned(READY_CONTEXT, {
      authorize: async () => ({
        approved: true,
        reason: "quorum",
        evidence: { peerConsensus: 0.75 },
      }),
    });
    if (decision.governanceDecision?.evidence) {
      decision.governanceDecision.evidence.peerConsensus = 0;
    }

    expect(
      scheduler.getState().lastDecision?.governanceDecision?.evidence
        ?.peerConsensus,
    ).toBe(0.75);
  });

  it("resets all scheduler state without deleting forge knowledge", () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "persistent hypothesis");
    scheduler.scheduleNext(READY_CONTEXT);

    scheduler.reset();

    expect(scheduler.getState()).toEqual({
      decisions: 0,
      scheduledExperiments: 0,
      rejectedExperiments: 0,
      meanExpectedInformationGain: 0,
      lastScheduledAt: null,
      lastDecision: null,
    });
    expect(forge.getHypotheses()).toHaveLength(1);
  });

  it("keeps candidate previews nonmutating", () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "pure preview");
    const state = scheduler.getState();
    const hypotheses = forge.getHypotheses();
    expect(scheduler.evaluateCandidates(READY_CONTEXT)).toHaveLength(1);
    expect(scheduler.getState()).toEqual(state);
    expect(forge.getHypotheses()).toEqual(hypotheses);
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("retains historical approval but no fabricated trial ID when the forge declines", async () => {
    const forge = new CausalHypothesisForge();
    propose(forge, "declined forge design");
    const before = forge.getHypotheses();
    const scheduler = new ActiveInferenceExperimentScheduler(
      {
        getHypotheses: () => forge.getHypotheses(),
        getTrials: (id) => forge.getTrials(id),
        getGeneration: () => forge.getGeneration(),
        designIntervention: () => null,
      },
      { minimumScore: 0 },
    );
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("forge_rejected");
    expect(decision.governanceDecision).toMatchObject(APPROVAL);
    expect(
      Object.values(decision.precommitReceipt!.checks).every(Boolean),
    ).toBe(true);
    expect(decision.precommitReceipt?.trialId).toBeUndefined();
    expect(decision.trial).toBeNull();
    expect(forge.getHypotheses()).toEqual(before);
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("rechecks capacity when two deferred approvals race", async () => {
    const { forge, scheduler } = makeScheduler(undefined, {
      maximumActiveTrials: 1,
    });
    propose(forge, "concurrent candidate");
    const first = deferredApproval();
    const second = deferredApproval();
    const firstPending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      first.authorizer,
    );
    const secondPending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      second.authorizer,
    );
    expect(forge.getTrials()).toHaveLength(0);
    first.resolve(APPROVAL);
    expect((await firstPending).scheduled).toBe(true);
    second.resolve(APPROVAL);
    const decision = await secondPending;
    expect(decision.reason).toBe("capacity");
    expect(decision.precommitReceipt?.checks.capacity).toBe(false);
    expect(decision.governanceDecision).toMatchObject(APPROVAL);
    expect(decision.trial).toBeNull();
    expect(forge.getTrials()).toHaveLength(1);
    expect(scheduler.getState()).toMatchObject({
      decisions: 2,
      scheduledExperiments: 1,
      rejectedExperiments: 1,
    });
  });

  it("returns old approval as history without polluting scheduler reset state", async () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "reset pending");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    scheduler.reset();
    const stateAfterReset = scheduler.getState();
    let deferredEvents = 0;
    scheduler.on("experiment_deferred", () => deferredEvents++);
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("stale_authorization");
    expect(decision.governanceDecision).toMatchObject(APPROVAL);
    expect(decision.precommitReceipt?.checks.generation).toBe(false);
    expect(scheduler.getState()).toEqual(stateAfterReset);
    expect(deferredEvents).toBe(0);
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("does not pollute reset statistics when pending governance rejects or throws", async () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "reset rejected");
    const rejection = deferredApproval();
    const failure = deferredApproval();
    const rejected = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      rejection.authorizer,
    );
    const failed = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      failure.authorizer,
    );
    scheduler.reset();
    const stateAfterReset = scheduler.getState();
    rejection.resolve({ approved: false, reason: "fixture denial" });
    failure.reject(new Error("fixture transport failure"));
    expect((await rejected).reason).toBe("stale_authorization");
    expect((await failed).reason).toBe("stale_authorization");
    expect(scheduler.getState()).toEqual(stateAfterReset);
  });

  it("does not overwrite a new-generation decision when an old approval completes", async () => {
    const { forge, scheduler } = makeScheduler();
    propose(forge, "old generation");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    scheduler.reset();
    expect(scheduler.scheduleNext(READY_CONTEXT).scheduled).toBe(true);
    const current = scheduler.getState();
    approval.resolve(APPROVAL);
    expect((await pending).reason).toBe("stale_authorization");
    expect(scheduler.getState()).toEqual(current);
    expect(forge.getTrials()).toHaveLength(1);
  });

  it("rejects forge reset ID reuse without silently selecting the replacement", async () => {
    const { forge, scheduler } = makeScheduler();
    const original = propose(forge, "original approval");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    forge.reset();
    const replacement = propose(forge, "unrelated replacement");
    expect(replacement.id).toBe(original.id);
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("stale_authorization");
    expect(decision.candidate?.statement).toBe(original.statement);
    expect(decision.precommitReceipt?.checks.hypothesisUnchanged).toBe(false);
    expect(forge.getHypothesis(replacement.id)).toEqual(replacement);
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("uses a forge epoch even for identical proposals with colliding IDs and timestamps", async () => {
    const dateNow = Date.now;
    Date.now = () => 1234;
    try {
      const { forge, scheduler } = makeScheduler();
      const original = propose(forge, "identical proposal");
      const approval = deferredApproval();
      const pending = scheduler.scheduleNextGoverned(
        READY_CONTEXT,
        approval.authorizer,
      );
      forge.reset();
      expect(propose(forge, "identical proposal")).toEqual(original);
      approval.resolve(APPROVAL);
      const decision = await pending;
      expect(decision.reason).toBe("stale_authorization");
      expect(decision.precommitReceipt?.checks).toMatchObject({
        generation: false,
        hypothesisUnchanged: true,
      });
      expect(forge.getTrials()).toHaveLength(0);
    } finally {
      Date.now = dateNow;
    }
  });

  it("does not resurrect a hypothesis falsified during deferred authorization", async () => {
    const { forge, scheduler } = makeScheduler();
    const hypothesis = propose(forge, "falsification pending");
    const design = scheduler.evaluateCandidates(READY_CONTEXT)[0].design;
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    for (let index = 0; index < 2; index++) {
      const trial = forge.designIntervention(hypothesis.id, design)!;
      forge.recordOutcome(trial.id, { observedEffect: -0.8, reliability: 1 });
    }
    const falsified = forge.getHypothesis(hypothesis.id);
    expect(falsified?.status).toBe(CausalHypothesisStatus.FALSIFIED);
    const trials = forge.getTrials();
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("hypothesis_ineligible");
    expect(decision.precommitReceipt?.checks.eligible).toBe(false);
    expect(forge.getHypothesis(hypothesis.id)).toEqual(falsified);
    expect(forge.getTrials()).toEqual(trials);
  });

  it("detects substantive evidence changes even within the same millisecond", async () => {
    const dateNow = Date.now;
    Date.now = () => 1234;
    try {
      const { forge, scheduler } = makeScheduler();
      const hypothesis = propose(forge, "same timestamp evidence");
      const trial = forge.designIntervention(
        hypothesis.id,
        scheduler.evaluateCandidates(READY_CONTEXT)[0].design,
      )!;
      forge.recordOutcome(trial.id, { observedEffect: 0.4, reliability: 0.1 });
      const before = forge.getHypothesis(hypothesis.id)!;
      const approval = deferredApproval();
      const pending = scheduler.scheduleNextGoverned(
        READY_CONTEXT,
        approval.authorizer,
      );
      const nextTrial = forge.designIntervention(hypothesis.id, trial.design)!;
      forge.recordOutcome(nextTrial.id, {
        observedEffect: 0.5,
        reliability: 0.1,
      });
      const after = forge.getHypothesis(hypothesis.id)!;
      expect(after.updatedAt).toBe(before.updatedAt);
      expect(after.status).toBe(before.status);
      approval.resolve(APPROVAL);
      const decision = await pending;
      expect(decision.reason).toBe("hypothesis_changed");
      expect(decision.precommitReceipt?.checks.hypothesisUnchanged).toBe(false);
      expect(forge.getTrials()).toHaveLength(2);
    } finally {
      Date.now = dateNow;
    }
  });

  it("defers when the approved hypothesis disappears", async () => {
    const { forge, scheduler } = makeScheduler(
      new CausalHypothesisForge({ maximumHypotheses: 1 }),
    );
    propose(forge, "evicted approval");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    propose(forge, "replacement candidate");
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("hypothesis_changed");
    expect(decision.precommitReceipt?.checks.hypothesisUnchanged).toBe(false);
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("rechecks same-hypothesis exclusivity without changing approved candidate", async () => {
    const { forge, scheduler } = makeScheduler();
    const hypothesis = propose(forge, "exclusive candidate");
    const design = scheduler.evaluateCandidates(READY_CONTEXT)[0].design;
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    forge.designIntervention(hypothesis.id, design);
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("hypothesis_ineligible");
    expect(decision.precommitReceipt?.checks.exclusive).toBe(false);
    expect(forge.getTrials()).toHaveLength(1);
  });

  it("rejects a mutated authorizer candidate while keeping the selected design detached", async () => {
    const { forge, scheduler } = makeScheduler();
    const original = propose(forge, "detached candidate");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(READY_CONTEXT, {
      authorize: (candidate) => {
        candidate.statement = "not approved original";
        candidate.design.expectedEffect = 999;
        candidate.design.confoundControls.push("injected control");
        return approval.authorizer.authorize();
      },
    });
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("stale_authorization");
    expect(decision.precommitReceipt?.checks.candidateUnchanged).toBe(false);
    expect(decision.candidate?.statement).toBe(original.statement);
    expect(decision.candidate?.design.expectedEffect).not.toBe(999);
    expect(decision.candidate?.design.confoundControls).not.toContain(
      "injected control",
    );
    expect(forge.getTrials()).toHaveLength(0);
  });

  it("isolates precommit receipts and approvals from scheduling event listeners", async () => {
    const { forge, scheduler } = makeScheduler();
    const hypothesis = propose(forge, "event isolation");
    scheduler.on(
      "experiment_scheduled",
      (decision: ExperimentScheduleDecision) => {
        decision.precommitReceipt!.checks.capacity = false;
        decision.governanceDecision!.approved = false;
        decision.candidate!.statement = "listener mutation";
      },
    );
    const pendingApproval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      pendingApproval.authorizer,
    );
    pendingApproval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.candidate?.statement).toBe(hypothesis.statement);
    expect(decision.governanceDecision?.approved).toBe(true);
    expect(decision.precommitReceipt?.checks.capacity).toBe(true);
    const copy = scheduler.getState();
    copy.lastDecision!.precommitReceipt!.checks.eligible = false;
    expect(
      scheduler.getState().lastDecision?.precommitReceipt?.checks.eligible,
    ).toBe(true);

    scheduler.on(
      "experiment_deferred",
      (deferred: ExperimentScheduleDecision) => {
        deferred.precommitReceipt!.checks.capacity = true;
        deferred.governanceDecision!.approved = false;
      },
    );
    propose(forge, "second event isolation");
    const otherApproval = deferredApproval();
    const otherPending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      otherApproval.authorizer,
    );
    const other = propose(forge, "capacity intervenes");
    const design = scheduler
      .evaluateCandidates(READY_CONTEXT)
      .find((candidate) => candidate.hypothesisId === other.id)!.design;
    for (let index = 0; index < 3; index++)
      forge.designIntervention(other.id, design);
    otherApproval.resolve(APPROVAL);
    const deferred = await otherPending;
    expect(deferred.reason).toBe("capacity");
    expect(deferred.precommitReceipt?.checks.capacity).toBe(false);
    expect(deferred.precommitReceipt?.trialId).toBeUndefined();
    expect(deferred.governanceDecision?.approved).toBe(true);
    expect(
      scheduler.getState().lastDecision?.precommitReceipt?.checks.capacity,
    ).toBe(false);
  });

  it("commits an unchanged delayed approval using production commit time and a bounded receipt", async () => {
    const forge = new CausalHypothesisForge();
    let now = 10_000;
    const scheduler = new ActiveInferenceExperimentScheduler(
      forge,
      { minimumScore: 0, refractoryMs: 1000 },
      () => now,
    );
    propose(forge, "delayed valid approval");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      { ...READY_CONTEXT, now: undefined },
      approval.authorizer,
    );
    now = 30_000;
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.scheduled).toBe(true);
    expect(decision.timestamp).toBe(30_000);
    expect(scheduler.getState().lastScheduledAt).toBe(30_000);
    expect(decision.precommitReceipt).toMatchObject({
      previewAt: 10_000,
      checkedAt: 30_000,
      approved: true,
      certificateId: APPROVAL.certificateId,
      trialId: decision.trial?.id,
    });
    expect(
      Object.values(decision.precommitReceipt!.checks).every(Boolean),
    ).toBe(true);
    expect(JSON.stringify(decision.precommitReceipt)).not.toContain(
      "delayed valid approval",
    );
    expect(decision.precommitReceipt).not.toHaveProperty("hypothesisBefore");
    expect(decision.precommitReceipt).not.toHaveProperty("candidateBefore");
    expect(decision.trial?.status).toBe("designed");
    decision.precommitReceipt!.checks.capacity = false;
    expect(
      scheduler.getState().lastDecision?.precommitReceipt?.checks.capacity,
    ).toBe(true);
    propose(forge, "next clock candidate");
    now = 30_500;
    expect(
      scheduler.scheduleNext({ ...READY_CONTEXT, now: undefined }).reason,
    ).toBe("refractory");
    now = 31_000;
    expect(
      scheduler.scheduleNext({ ...READY_CONTEXT, now: undefined }).scheduled,
    ).toBe(true);
  });

  it("preserves explicit context.now semantics over an injected production clock", async () => {
    const forge = new CausalHypothesisForge();
    const scheduler = new ActiveInferenceExperimentScheduler(
      forge,
      { minimumScore: 0 },
      () => 900_000,
    );
    propose(forge, "simulation clock");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.timestamp).toBe(READY_CONTEXT.now);
    expect(decision.precommitReceipt?.checkedAt).toBe(READY_CONTEXT.now);
    expect(scheduler.getState().lastScheduledAt).toBe(READY_CONTEXT.now);
  });

  it("rechecks refractory state after an intervening scheduler commit", async () => {
    const { forge, scheduler } = makeScheduler(undefined, {
      refractoryMs: 1000,
    });
    propose(forge, "refractory pending");
    const approval = deferredApproval();
    const pending = scheduler.scheduleNextGoverned(
      READY_CONTEXT,
      approval.authorizer,
    );
    expect(scheduler.scheduleNext(READY_CONTEXT).scheduled).toBe(true);
    approval.resolve(APPROVAL);
    const decision = await pending;
    expect(decision.reason).toBe("refractory");
    expect(decision.precommitReceipt?.checks.refractory).toBe(false);
    expect(forge.getTrials()).toHaveLength(1);
  });
});

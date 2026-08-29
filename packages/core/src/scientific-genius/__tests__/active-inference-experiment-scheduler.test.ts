import {
  ActiveInferenceExperimentScheduler,
  type AutognosticExperimentContext,
} from "../ActiveInferenceExperimentScheduler.js";
import { CausalHypothesisForge } from "../CausalHypothesisForge.js";

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
});

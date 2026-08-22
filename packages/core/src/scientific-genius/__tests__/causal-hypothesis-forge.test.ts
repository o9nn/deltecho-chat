import {
  CausalHypothesisForge,
  CausalHypothesisStatus,
} from "../CausalHypothesisForge.js";

const baseHypothesis = {
  statement: "Increasing reservoir coherence increases reliable recall.",
  cause: "reservoir coherence",
  effect: "reliable recall",
  predictedDirection: 1 as const,
  domain: "cognitive science",
  priorConfidence: 0.5,
  falsifiability: 0.9,
};

const intervention = {
  manipulatedVariable: "spectral radius",
  controlCondition: "unchanged reservoir",
  expectedEffect: 0.8,
  measurement: "recall accuracy delta",
  confoundControls: ["prompt length", "memory load"],
  replicationGroup: "reservoir-recall-v1",
};

function supportHypothesis(forge: CausalHypothesisForge, id: string): void {
  for (let index = 0; index < 2; index++) {
    const trial = forge.designIntervention(id, intervention);
    if (!trial) throw new Error("trial was not designed");
    forge.recordOutcome(trial.id, { observedEffect: 0.8, reliability: 1 });
  }
}

describe("CausalHypothesisForge", () => {
  it("proposes a falsifiable causal hypothesis", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);

    expect(hypothesis.id).toBe("causal_1");
    expect(hypothesis.status).toBe(CausalHypothesisStatus.PROPOSED);
    expect(hypothesis.posteriorConfidence).toBeCloseTo(0.5);
    expect(hypothesis.falsifiability).toBe(0.9);
  });

  it("converts dream insights into causal proposals without treating them as truth", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.proposeFromDream({
      hypothesis: "Concept A may causally amplify Concept B.",
      confidence: 0.72,
      domain: "cross-domain",
      fragment: {
        sourceId: "a",
        sourceLabel: "Concept A",
        targetId: "b",
        targetLabel: "Concept B",
        novelty: 0.8,
        coherence: 0.7,
      },
    });

    expect(hypothesis.origin).toBe("dream");
    expect(hypothesis.cause).toBe("Concept A");
    expect(hypothesis.effect).toBe("Concept B");
    expect(hypothesis.status).toBe(CausalHypothesisStatus.PROPOSED);
  });

  it("converts stable resonance into a testable intervention claim", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.proposeFromResonance({
      id: "standing-1",
      conceptId: "target",
      conceptLabel: "Adaptive Stability",
      contributingWaves: ["wave-a", "wave-b"],
      combinedAmplitude: 0.9,
      stability: 8,
      domains: ["control", "biology"],
      crossDomainScore: 0.8,
    });

    expect(hypothesis.origin).toBe("resonance");
    expect(hypothesis.domain).toBe("cross-domain");
    expect(hypothesis.statement).toContain("Adaptive Stability");
    expect(hypothesis.sourceIds).toContain("standing-1");
  });

  it("designs a controlled counterfactual trial", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    const trial = forge.designIntervention(hypothesis.id, intervention);

    expect(trial?.status).toBe("designed");
    expect(trial?.design.controlCondition).toBe("unchanged reservoir");
    expect(forge.getHypothesis(hypothesis.id)?.status).toBe(
      CausalHypothesisStatus.TESTING,
    );
  });

  it("promotes replicated supporting evidence", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);

    supportHypothesis(forge, hypothesis.id);

    const updated = forge.getHypothesis(hypothesis.id);
    expect(updated?.status).toBe(CausalHypothesisStatus.SUPPORTED);
    expect(updated?.posteriorConfidence).toBeGreaterThan(0.76);
    expect(updated?.supportingEvidence).toBeGreaterThan(0);
    expect(updated?.replicationCount).toBe(1);
  });

  it("falsifies hypotheses under reliable contradictory evidence", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);

    for (let index = 0; index < 2; index++) {
      const trial = forge.designIntervention(hypothesis.id, intervention)!;
      forge.recordOutcome(trial.id, {
        observedEffect: -0.8,
        reliability: 1,
      });
    }

    const updated = forge.getHypothesis(hypothesis.id);
    expect(updated?.status).toBe(CausalHypothesisStatus.FALSIFIED);
    expect(updated?.posteriorConfidence).toBeLessThan(0.24);
    expect(updated?.contradictingEvidence).toBeGreaterThan(0);
  });

  it("weights low-reliability observations less strongly", () => {
    const reliable = new CausalHypothesisForge({ minimumEvidence: 1 });
    const weak = new CausalHypothesisForge({ minimumEvidence: 1 });
    const reliableHypothesis = reliable.propose(baseHypothesis);
    const weakHypothesis = weak.propose(baseHypothesis);
    const reliableTrial = reliable.designIntervention(
      reliableHypothesis.id,
      intervention,
    )!;
    const weakTrial = weak.designIntervention(weakHypothesis.id, intervention)!;

    reliable.recordOutcome(reliableTrial.id, {
      observedEffect: 0.8,
      reliability: 1,
    });
    weak.recordOutcome(weakTrial.id, {
      observedEffect: 0.8,
      reliability: 0.15,
    });

    expect(
      reliable.getHypothesis(reliableHypothesis.id)!.posteriorConfidence,
    ).toBeGreaterThan(
      weak.getHypothesis(weakHypothesis.id)!.posteriorConfidence,
    );
  });

  it("emits epistemic surprise for strongly counter-predicted outcomes", () => {
    const forge = new CausalHypothesisForge({ surpriseThreshold: 0.5 });
    const hypothesis = forge.propose(baseHypothesis);
    const trial = forge.designIntervention(hypothesis.id, intervention)!;
    let surpriseEvents = 0;
    forge.on("epistemic_surprise", () => {
      surpriseEvents++;
    });

    forge.recordOutcome(trial.id, { observedEffect: -0.8, reliability: 1 });

    expect(surpriseEvents).toBe(1);
    expect(forge.getVisualState().epistemicSurprise).toBeGreaterThanOrEqual(
      0.5,
    );
  });

  it("rejects duplicate observations for the same trial", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    const trial = forge.designIntervention(hypothesis.id, intervention)!;

    expect(
      forge.recordOutcome(trial.id, { observedEffect: 0.7, reliability: 1 }),
    ).not.toBeNull();
    expect(
      forge.recordOutcome(trial.id, { observedEffect: 0.7, reliability: 1 }),
    ).toBeNull();
    expect(forge.getHypothesis(hypothesis.id)?.evidenceCount).toBe(1);
  });

  it("requires evidence before DAO ratification", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    forge.castDaoVote(hypothesis.id, {
      agentId: "agent-a",
      approve: true,
      confidence: 1,
    });

    const result = forge.ratify(hypothesis.id, 1);

    expect(result.ratified).toBe(false);
    expect(result.reason).toContain("evidence threshold");
  });

  it("ratifies supported evidence with weighted DAO quorum", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    supportHypothesis(forge, hypothesis.id);
    forge.castDaoVote(hypothesis.id, {
      agentId: "agent-a",
      approve: true,
      confidence: 0.9,
    });
    forge.castDaoVote(hypothesis.id, {
      agentId: "agent-b",
      approve: true,
      confidence: 0.8,
    });

    const result = forge.ratify(hypothesis.id, 3);

    expect(result.ratified).toBe(true);
    expect(result.participation).toBeCloseTo(2 / 3);
    expect(result.weightedApproval).toBe(1);
    expect(forge.getHypothesis(hypothesis.id)?.status).toBe(
      CausalHypothesisStatus.RATIFIED,
    );
  });

  it("does not ratify when weighted approval is below threshold", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    supportHypothesis(forge, hypothesis.id);
    forge.castDaoVote(hypothesis.id, {
      agentId: "agent-a",
      approve: true,
      confidence: 0.2,
    });
    forge.castDaoVote(hypothesis.id, {
      agentId: "agent-b",
      approve: false,
      confidence: 1,
    });

    expect(forge.ratify(hypothesis.id, 2).ratified).toBe(false);
  });

  it("replaces an agent's prior vote instead of double counting it", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    supportHypothesis(forge, hypothesis.id);
    forge.castDaoVote(hypothesis.id, {
      agentId: "agent-a",
      approve: false,
      confidence: 1,
    });
    forge.castDaoVote(hypothesis.id, {
      agentId: "agent-a",
      approve: true,
      confidence: 1,
    });

    const result = forge.ratify(hypothesis.id, 1);
    expect(result.participation).toBe(1);
    expect(result.weightedApproval).toBe(1);
  });

  it("reports causal-rigor visual telemetry", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    forge.designIntervention(hypothesis.id, intervention);

    const visual = forge.getVisualState();

    expect(visual.causalRigor).toBeGreaterThan(0);
    expect(visual.falsificationPressure).toBeGreaterThan(0);
    expect(visual.activeExperimentation).toBeGreaterThan(0);
  });

  it("enforces bounded hypothesis capacity", () => {
    const forge = new CausalHypothesisForge({ maximumHypotheses: 2 });
    forge.propose({ ...baseHypothesis, statement: "one" });
    forge.propose({ ...baseHypothesis, statement: "two" });
    forge.propose({ ...baseHypothesis, statement: "three" });

    expect(forge.getHypotheses()).toHaveLength(2);
    expect(forge.getHypotheses().map((item) => item.statement)).toEqual([
      "two",
      "three",
    ]);
  });

  it("returns defensive copies", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose({
      ...baseHypothesis,
      sourceIds: ["source-a"],
    });
    const copy = forge.getHypothesis(hypothesis.id)!;
    copy.sourceIds.push("mutated");

    expect(forge.getHypothesis(hypothesis.id)?.sourceIds).toEqual(["source-a"]);
  });

  it("resets all causal evidence state", () => {
    const forge = new CausalHypothesisForge();
    const hypothesis = forge.propose(baseHypothesis);
    forge.designIntervention(hypothesis.id, intervention);

    forge.reset();

    expect(forge.getState().hypotheses).toBe(0);
    expect(forge.getState().activeTrials).toBe(0);
    expect(forge.getVisualState().epistemicSurprise).toBe(0);
  });
});

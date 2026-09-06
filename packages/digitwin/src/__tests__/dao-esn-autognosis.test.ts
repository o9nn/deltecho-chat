/// <reference types="jest" />

import { DAOESNAutognosis } from "../dao-esn-autognosis";

describe("DAOESNAutognosis", () => {
  it("initializes a bounded reservoir and self-knowledge report", () => {
    const system = new DAOESNAutognosis({
      size: 64,
      voterCount: 5,
      spectralRadius: 0.95,
    });

    const reservoir = system.getReservoirState();
    const report = system.getAutognosisReport();

    expect(reservoir.subpopulationMeans).toHaveLength(5);
    expect(reservoir.meanActivation).toBeGreaterThanOrEqual(0);
    expect(reservoir.meanActivation).toBeLessThanOrEqual(1);
    expect(reservoir.edgeOfChaos).toBeCloseTo(0.95);
    expect(report.health).toBeGreaterThanOrEqual(0);
    expect(report.health).toBeLessThanOrEqual(1);
    expect(report.coherence).toBeGreaterThanOrEqual(0);
    expect(report.coherence).toBeLessThanOrEqual(1);
    expect(report.selfModelAccuracy).toBeGreaterThanOrEqual(0);
    expect(report.selfModelAccuracy).toBeLessThanOrEqual(1);
  });

  it("records a confidence-qualified DAO decision in system history", () => {
    const system = new DAOESNAutognosis({ voterCount: 7 });

    const result = system.submitProposal({
      id: "proposal-1",
      type: "modification",
      description: "Tune the reservoir toward stable edge-of-chaos dynamics",
      payload: { spectralRadius: 0.98 },
      priority: 0.8,
      submittedAt: Date.now(),
      deadline: Date.now() + 10_000,
      requiredQuorum: 0.5,
    });

    expect(result.totalVotes).toBeGreaterThanOrEqual(0);
    expect(result.totalVotes).toBeLessThanOrEqual(7);
    expect(result.approvals + result.rejections).toBe(result.totalVotes);
    expect(result.weightedApproval).toBeGreaterThanOrEqual(0);
    expect(result.weightedApproval).toBeLessThanOrEqual(1);
    expect(result.dissent).toBeGreaterThanOrEqual(0);
    expect(result.dissent).toBeLessThanOrEqual(1);
    expect(system.getState().history.proposals).toBe(1);
  });
});

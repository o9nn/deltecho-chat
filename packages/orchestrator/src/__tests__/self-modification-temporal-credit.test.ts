import { describe, expect, it, jest } from "@jest/globals";

import {
  SelfModificationEngine,
  type TemporalCreditGuidance,
} from "../self-modification";

function createEngine(): SelfModificationEngine {
  return new SelfModificationEngine({
    enablePersistence: false,
    dryRun: true,
  });
}

function guidance(
  direction: number,
  confidence: number,
): TemporalCreditGuidance {
  return {
    getRecommendedDirection: jest.fn(() => direction),
    getConfidence: jest.fn(() => confidence),
  };
}

describe("SelfModificationEngine temporal-credit guidance", () => {
  it("reinforces an aligned mature recommendation without bypassing bounds", () => {
    const engine = createEngine();
    const credit = guidance(1, 0.8);
    engine.wireTemporalCredit(credit);

    const proposals = engine.proposeModifications(0.4, 0.3, 0, 1);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].key).toBe("echobeats.cycleInterval");
    expect(proposals[0].newValue).toBeGreaterThan(2400);
    expect(proposals[0].newValue).toBeLessThanOrEqual(
      engine.getParameter("echobeats.cycleInterval")!.max,
    );
    expect(proposals[0].reason).toContain("temporal credit confirms direction");
    expect(credit.getRecommendedDirection).toHaveBeenCalledWith(
      "echobeats.cycleInterval",
    );
    expect(engine.getStats().temporalCreditGuidedProposals).toBe(1);
  });

  it("vetoes a mature recommendation that conflicts with the heuristic", () => {
    const engine = createEngine();
    const credit = guidance(-1, 0.9);
    const vetoed = jest.fn();
    engine.on("temporal_credit:proposal_vetoed", vetoed);
    engine.wireTemporalCredit(credit);

    const proposals = engine.proposeModifications(0.4, 0.3, 0, 1);

    expect(proposals).toEqual([]);
    expect(vetoed).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "echobeats.cycleInterval",
        proposedDirection: 1,
        recommendedDirection: -1,
        confidence: 0.9,
      }),
    );
    expect(engine.getStats().temporalCreditVetoedProposals).toBe(1);
  });

  it("ignores low-confidence credit and preserves the original proposal", () => {
    const engine = createEngine();
    engine.wireTemporalCredit(guidance(-1, 0.2));

    const proposals = engine.proposeModifications(0.4, 0.3, 0, 1);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toEqual(
      expect.objectContaining({
        key: "echobeats.cycleInterval",
        newValue: 2400,
      }),
    );
    expect(engine.getStats()).toEqual(
      expect.objectContaining({
        temporalCreditGuidedProposals: 0,
        temporalCreditVetoedProposals: 0,
      }),
    );
  });
});

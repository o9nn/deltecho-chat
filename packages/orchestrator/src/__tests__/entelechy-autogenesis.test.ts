import { describe, expect, it, jest } from "@jest/globals";
import {
  AutognosisAutogenesisCoupler,
  IdentityMesh,
} from "deep-tree-echo-core";
import {
  EntelechyIntegration,
  type EntelechyCoupleLike,
  type EntelechyIntegrationDeps,
} from "../entelechy-integration.js";

function makeIntegration(deps: EntelechyIntegrationDeps) {
  return new EntelechyIntegration(
    {
      enableReservoir: false,
      enableEchoBeats: false,
      enableEntelechy: false,
      enableConsciousness: false,
    },
    deps,
  );
}

function mockCoupler(
  couple = jest.fn(() => ({ adopted: false, skipped: false })),
) {
  return {
    couple,
    attachIdentity: jest.fn(),
  };
}

describe("EntelechyIntegration autogenesis couple", () => {
  it("invokes couple after backgroundTick when a report is present", () => {
    const coupler = mockCoupler();
    const integration = makeIntegration({
      coupler,
      reportPresent: () => true,
    });

    integration.tickOnce();

    expect(coupler.couple).toHaveBeenCalledTimes(1);
  });

  it("invokes couple after processMessage when a report is present", async () => {
    const coupler = mockCoupler();
    const integration = makeIntegration({
      coupler,
      reportPresent: () => true,
    });

    const result = await integration.processMessage("hello");

    expect(coupler.couple).toHaveBeenCalledTimes(1);
    expect(result.response).toBeDefined();
  });

  it("skips couple when no autognosis report is present", async () => {
    const coupler = mockCoupler();
    const integration = makeIntegration({
      coupler,
      reportPresent: () => false,
    });

    integration.tickOnce();
    await integration.processMessage("hello");

    expect(coupler.couple).not.toHaveBeenCalled();
  });

  it("swallows coupler throws on tick and still returns processMessage result", async () => {
    const couple = jest.fn(() => ({ adopted: false, skipped: false }));
    couple.mockImplementation(() => {
      throw new Error("boom");
    });
    const coupler = mockCoupler(couple);
    const integration = makeIntegration({
      coupler,
      reportPresent: () => true,
    });

    expect(() => integration.tickOnce()).not.toThrow();
    const result = await integration.processMessage("hello");
    expect(result.response).toBeDefined();
    expect(result.snapshot).toBeDefined();
    expect(couple).toHaveBeenCalledTimes(2);
  });

  it("tick drives a real coupler into identity and a reservoir step", () => {
    const { integration, identity, steps } = makeLiveCoupler({ grant: true });

    integration.tickOnce();

    expect(identity.getState().agent.goals[0]?.id).toBe(
      "autogenesis:edge-of-chaos",
    );
    expect(identity.generateSystemPrompt()).toContain(
      "autogenesis:edge-of-chaos",
    );
    expect(steps).toHaveLength(1);
    const norm = Math.sqrt(
      steps[0].reduce((sum, value) => sum + value * value, 0),
    );
    expect(norm).toBeCloseTo(1, 8);
  });

  it("tick does not mutate identity when the couple grant is off", () => {
    const { integration, identity, steps } = makeLiveCoupler({ grant: false });

    integration.tickOnce();

    expect(identity.getState().agent.goals).toHaveLength(0);
    expect(steps).toHaveLength(0);
  });
});

function makeLiveCoupler(options: { grant: boolean }) {
  const steps: number[][] = [];
  const identity = new IdentityMesh({ autoSaveInterval: 0 });
  const coupler = new AutognosisAutogenesisCoupler({
    identity,
    reservoir: {
      inputDim: 64,
      getAutognosisReport: () => ({
        health: 0.88,
        isEdgeOfChaos: true,
        isSaturated: false,
        isDead: false,
        entropyTrend: "stable",
        spectralRadiusAdjustment: 0,
        leakRateAdjustment: 0,
        narrative: "must-not-appear-in-goals",
        timestamp: 1_700_000_501,
      }),
      getState: () => ({
        activations: new Float64Array(8),
        entropy: 0.76,
        lyapunovExponent: 0.01,
        effectiveDimensionality: 12,
        memoryCapacity: 0.82,
        computationalCapacity: 0.91,
        currentSpectralRadius: 0.95,
        tick: 12,
      }),
      step: (input: number[]) => {
        steps.push(input);
      },
    },
    intentionality: {
      getActiveGoals: () => [],
      generateGoal: () => undefined,
    },
    readGrant: () => options.grant,
  });
  const integration = makeIntegration({
    coupler: coupler as EntelechyCoupleLike,
    reportPresent: () => true,
  });
  return { integration, identity, steps };
}

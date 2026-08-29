import { describe, expect, it, jest } from "@jest/globals";
import {
  AutognosisAutogenesisCoupler,
  IdentityMesh,
  esnReservoir,
  intentionalityEngine,
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

  it("couple logs omit processMessage text and report narrative", async () => {
    const { integration } = makeLiveCoupler({ grant: true });
    const secret = "USER_SECRET_TOKEN_9f3";
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      integration.tickOnce();
      await integration.processMessage(secret);
    } finally {
      console.log = originalLog;
    }
    const coupleLines = lines.filter((line) => line.includes("couple "));
    const text = coupleLines.join("\n");
    expect(text).toContain("couple kind=edge-of-chaos");
    expect(text).not.toContain(secret);
    expect(text).not.toContain("must-not-appear-in-goals");
  });

  it("tick drives a real coupler into identity, intentionality, and a reservoir step", () => {
    clearAutogenesisGoals();
    const { integration, identity, steps } = makeLiveCoupler({ grant: true });

    integration.tickOnce();

    expect(identity.getState().agent.goals[0]?.id).toBe(
      "autogenesis:edge-of-chaos",
    );
    expect(identity.generateSystemPrompt()).toContain(
      "autogenesis:edge-of-chaos",
    );
    const created = autogenesisGoals().filter(
      (goal) => goal.content === "autogenesis:edge-of-chaos",
    );
    expect(created).toHaveLength(1);
    expect(created[0]?.origin.source).toBe("intrinsic");
    expect(created[0]?.origin.reasoning).toContain("autogenesis:edge-of-chaos");
    expect(created[0]?.origin.fromStates).toEqual([]);
    expect(steps).toHaveLength(1);
    const norm = Math.sqrt(
      steps[0].reduce((sum, value) => sum + value * value, 0),
    );
    expect(norm).toBeCloseTo(1, 8);
  });

  it("tick does not mutate identity when the couple grant is off", () => {
    clearAutogenesisGoals();
    const { integration, identity, steps } = makeLiveCoupler({ grant: false });

    integration.tickOnce();

    expect(identity.getState().agent.goals).toHaveLength(0);
    expect(autogenesisGoals()).toHaveLength(0);
    expect(steps).toHaveLength(0);
  });

  it("default coupler adds an autogenesis reservoir step after a live report", () => {
    withDefaultLiveCoupler((ctx) => {
      warmupUntilReport(ctx.integration);
      const beforeDisabled = ctx.stepCount;
      ctx.integration.tickOnce();
      expect(ctx.stepCount).toBe(beforeDisabled + 1);

      process.env.DELTECHO_AUTOGENESIS_COUPLE = "1";
      const beforeGranted = ctx.stepCount;
      ctx.integration.tickOnce();
      expect(ctx.stepCount).toBe(beforeGranted + 2);
    });
  });

  it("default coupler couples on processMessage after a live report", async () => {
    await withDefaultLiveCoupler(async (ctx) => {
      warmupUntilReport(ctx.integration);
      process.env.DELTECHO_AUTOGENESIS_COUPLE = "1";
      const beforeGranted = ctx.stepCount;
      const result = await ctx.integration.processMessage("hello");
      expect(result.response).toBeDefined();
      expect(ctx.stepCount).toBe(beforeGranted + 2);
    });
  });
});

function autogenesisGoals() {
  return intentionalityEngine
    .getActiveGoals()
    .filter((goal) => goal.content.startsWith("autogenesis:"));
}

function clearAutogenesisGoals() {
  for (const goal of autogenesisGoals()) {
    intentionalityEngine.abandonGoal(goal.id, "test-reset");
  }
}

function warmupUntilReport(integration: EntelechyIntegration) {
  for (let i = 0; i < 24 && esnReservoir.getAutognosisReport() == null; i++) {
    integration.tickOnce();
  }
  expect(esnReservoir.getAutognosisReport()).not.toBeNull();
}

function withDefaultLiveCoupler<T>(
  run: (ctx: { integration: EntelechyIntegration; stepCount: number }) => T,
): T {
  const previous = process.env.DELTECHO_AUTOGENESIS_COUPLE;
  delete process.env.DELTECHO_AUTOGENESIS_COUPLE;
  const identity = new IdentityMesh({ autoSaveInterval: 0 });
  const integration = new EntelechyIntegration({
    enableReservoir: true,
    enableEchoBeats: false,
    enableEntelechy: false,
    enableConsciousness: false,
  });
  integration.attachIdentity(identity);

  const originalStep = esnReservoir.step;
  const ctx = { integration, stepCount: 0 };
  esnReservoir.step = ((input: number[]) => {
    ctx.stepCount += 1;
    return originalStep.call(esnReservoir, input);
  }) as typeof esnReservoir.step;

  const finish = () => {
    esnReservoir.step = originalStep;
    if (previous === undefined) {
      delete process.env.DELTECHO_AUTOGENESIS_COUPLE;
    } else {
      process.env.DELTECHO_AUTOGENESIS_COUPLE = previous;
    }
  };

  try {
    const result = run(ctx);
    if (result && typeof result === "object" && "then" in result) {
      return Promise.resolve(result).finally(finish) as T;
    }
    finish();
    return result;
  } catch (error) {
    finish();
    throw error;
  }
}

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
      getActiveGoals: () => intentionalityEngine.getActiveGoals(),
      generateGoal: (params) => intentionalityEngine.generateGoal(params),
    },
    readGrant: () => options.grant,
  });
  const integration = makeIntegration({
    coupler: coupler as EntelechyCoupleLike,
    reportPresent: () => true,
  });
  return { integration, identity, steps };
}

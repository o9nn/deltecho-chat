import { IdentityMesh } from "../IdentityMesh.js";
import {
  ADOPTED_SLOT,
  AutognosisAutogenesisCoupler,
  CONSENSUS_SLOT,
  DEFAULT_INPUT_DIM,
  autogenesisGoalId,
  type ActiveGoalLike,
  type GenerateGoalParams,
} from "../AutognosisAutogenesisCoupler.js";
import type {
  AutognosisReport as Report,
  ReservoirState as ESNState,
} from "../../cognitive/ESNAutognosisReservoir.js";

function healthyReport(overrides: Partial<Report> = {}): Report {
  return {
    health: 0.88,
    isEdgeOfChaos: true,
    isSaturated: false,
    isDead: false,
    entropyTrend: "stable",
    spectralRadiusAdjustment: 0,
    leakRateAdjustment: 0,
    narrative: "secret narrative must not be logged",
    timestamp: 1_700_000_001,
    ...overrides,
  };
}

function saturatedReport(overrides: Partial<Report> = {}): Report {
  return healthyReport({
    health: 0.12,
    isEdgeOfChaos: false,
    isSaturated: true,
    isDead: false,
    entropyTrend: "decreasing",
    narrative: "saturated narrative",
    timestamp: 1_700_000_002,
    ...overrides,
  });
}

function reservoirState(overrides: Partial<ESNState> = {}): ESNState {
  return {
    activations: new Float64Array(8),
    entropy: 0.76,
    lyapunovExponent: 0.01,
    effectiveDimensionality: 12,
    memoryCapacity: 0.82,
    computationalCapacity: 0.91,
    currentSpectralRadius: 0.95,
    tick: 12,
    ...overrides,
  };
}

function makeHarness(options: {
  report: Report | null;
  identity?: IdentityMesh | null;
  grant?: boolean;
  goals?: ActiveGoalLike[];
  maxActiveGoals?: number;
}) {
  const steps: number[][] = [];
  const generated: GenerateGoalParams[] = [];
  const goals = options.goals ?? [];
  const logs: string[] = [];
  const reservoir = {
    inputDim: DEFAULT_INPUT_DIM,
    getAutognosisReport: () => options.report,
    getState: () => reservoirState(),
    step: (input: number[]) => {
      steps.push(input);
    },
  };
  const intentionality = {
    maxActiveGoals: options.maxActiveGoals,
    getActiveGoals: () => goals,
    generateGoal: (params: GenerateGoalParams) => {
      generated.push(params);
      goals.push({
        content: params.content,
        status: "active",
        priority: params.priority,
        progress: 0,
      });
      return params;
    },
  };
  const identity =
    options.identity === undefined
      ? new IdentityMesh({ autoSaveInterval: 0 })
      : options.identity;
  const coupler = new AutognosisAutogenesisCoupler({
    identity,
    reservoir,
    intentionality,
    readGrant: () => options.grant ?? true,
  });
  return { coupler, identity, steps, generated, goals, logs };
}

describe("AutognosisAutogenesisCoupler", () => {
  it("AE1 adopts edge-of-chaos and writes autogenesis ids", () => {
    const { coupler, identity, generated } = makeHarness({
      report: healthyReport(),
    });

    const result = coupler.couple();
    const state = identity!.getState();

    expect(result.skipped).toBe(false);
    expect(result.adopted).toBe(true);
    expect(state.agent.goals[0]?.id).toBe("autogenesis:edge-of-chaos");
    expect(generated).toHaveLength(1);
    expect(generated[0].content).toBe("autogenesis:edge-of-chaos");
    expect(generated[0].origin.source).toBe("intrinsic");
    expect(generated[0].origin.fromStates).toEqual([]);
    expect(identity!.generateSystemPrompt()).toContain(
      "autogenesis:edge-of-chaos",
    );
  });

  it("AE2 skips the same timestamp entirely", () => {
    const { coupler, identity, steps, generated } = makeHarness({
      report: healthyReport(),
    });
    coupler.couple();
    const proposals = identity!.getState().relation.governanceProposals.length;
    const stepCount = steps.length;
    const goalCount = generated.length;

    const second = coupler.couple();

    expect(second.reason).toBe("already_coupled");
    expect(identity!.getState().relation.governanceProposals).toHaveLength(
      proposals,
    );
    expect(generated).toHaveLength(goalCount);
    expect(steps).toHaveLength(stepCount);
  });

  it("AE3 same kind and health skips integrate but still steps", () => {
    const report = healthyReport();
    const { coupler, identity, generated, steps } = makeHarness({ report });
    coupler.couple();
    const proposals = identity!.getState().relation.governanceProposals.length;
    report.timestamp = 1_700_000_099;

    const second = coupler.couple();

    expect(second.skipped).toBe(false);
    expect(second.integrated).toBe(false);
    expect(identity!.getState().relation.governanceProposals).toHaveLength(
      proposals,
    );
    expect(generated).toHaveLength(1);
    expect(steps).toHaveLength(2);
  });

  it("AE4 defers pathology and still steps", () => {
    const identity = new IdentityMesh({ autoSaveInterval: 0 });
    const initial = identity.getState().relation.traits.autognosis ?? 0.5;
    const { coupler, generated, steps } = makeHarness({
      report: saturatedReport(),
      identity,
    });

    const result = coupler.couple();

    expect(result.adopted).toBe(false);
    expect(identity.getState().relation.traits.autognosis ?? 0.5).toBe(initial);
    expect(generated).toHaveLength(0);
    expect(steps).toHaveLength(1);
  });

  it("AE5 L2-normalizes a numeric vector", () => {
    const { coupler, steps } = makeHarness({ report: healthyReport() });
    coupler.couple();
    const vector = steps[0];
    expect(vector).toHaveLength(DEFAULT_INPUT_DIM);
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    expect(norm).toBeCloseTo(1, 8);
    expect(vector.every((value) => Number.isFinite(value))).toBe(true);
  });

  it("AE6 skips when identity is unattached", () => {
    const { coupler, steps, generated } = makeHarness({
      report: healthyReport(),
      identity: null,
    });
    const result = coupler.couple();
    expect(result.reason).toBe("identity_unattached");
    expect(steps).toHaveLength(0);
    expect(generated).toHaveLength(0);
  });

  it("AE9 skips when the couple grant is off", () => {
    const { coupler, steps, generated } = makeHarness({
      report: healthyReport(),
      grant: false,
    });
    const result = coupler.couple();
    expect(result.reason).toBe("couple_disabled");
    expect(steps).toHaveLength(0);
    expect(generated).toHaveLength(0);
  });

  it("AE10 reserved slots differ between adopted and rejected", () => {
    const adopted = makeHarness({ report: healthyReport({ timestamp: 11 }) });
    const rejected = makeHarness({
      report: saturatedReport({ timestamp: 22 }),
    });
    adopted.coupler.couple();
    rejected.coupler.couple();
    expect(adopted.steps[0][ADOPTED_SLOT]).not.toBe(
      rejected.steps[0][ADOPTED_SLOT],
    );
    expect(adopted.steps[0][CONSENSUS_SLOT]).not.toBe(
      rejected.steps[0][CONSENSUS_SLOT],
    );
  });

  it("skips generateGoal when the cap is full", () => {
    const existing: ActiveGoalLike[] = Array.from({ length: 2 }, (_, i) => ({
      content: `other-${i}`,
      status: "active",
    }));
    const { coupler, generated, identity } = makeHarness({
      report: healthyReport(),
      goals: existing,
      maxActiveGoals: 2,
    });
    coupler.couple();
    expect(generated).toHaveLength(0);
    expect(identity!.getState().agent.goals[0]?.id).toBe(
      autogenesisGoalId("edge-of-chaos"),
    );
  });

  it("uses regulate when the report is neither edge nor pathological", () => {
    const { coupler } = makeHarness({
      report: healthyReport({
        isEdgeOfChaos: false,
        isSaturated: false,
        isDead: false,
        health: 0.5,
      }),
    });
    expect(coupler.couple().kind).toBe("regulate");
  });
});

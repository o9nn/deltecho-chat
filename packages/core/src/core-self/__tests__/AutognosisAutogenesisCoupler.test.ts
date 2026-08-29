import { IdentityMesh } from "../IdentityMesh.js";
import {
  ADOPTED_SLOT,
  AutognosisAutogenesisCoupler,
  CONSENSUS_SLOT,
  DEFAULT_INPUT_DIM,
  autogenesisGoalId,
  deriveAutogenesisKind,
  isCoupleGranted,
  type ActiveGoalLike,
  type GenerateGoalParams,
} from "../AutognosisAutogenesisCoupler.js";
import {
  ESNAutognosisReservoir,
  type AutognosisReport as Report,
  type ReservoirState as ESNState,
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
  return { coupler, identity, steps, generated, goals };
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
    expect(generated[0].priority).toBe(
      state.relation.governanceProposals[0]?.consensus,
    );
    expect(generated[0].origin.source).toBe("intrinsic");
    expect(generated[0].origin.reasoning).toContain(
      "autogenesis:edge-of-chaos",
    );
    expect(generated[0].origin.fromStates).toEqual([]);
    expect(state.agent.goals[0]?.description).toContain(
      "autogenesis:edge-of-chaos",
    );
    expect(state.agent.goals[0]?.description).toContain(
      state.relation.governanceProposals[0]?.title ?? "",
    );
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
    const norm = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
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

  it("isCoupleGranted accepts only 1/true/yes case-insensitively", () => {
    expect(isCoupleGranted("1")).toBe(true);
    expect(isCoupleGranted("true")).toBe(true);
    expect(isCoupleGranted("YES")).toBe(true);
    expect(isCoupleGranted(" True ")).toBe(true);
    expect(isCoupleGranted(undefined)).toBe(false);
    expect(isCoupleGranted("")).toBe(false);
    expect(isCoupleGranted("0")).toBe(false);
    expect(isCoupleGranted("false")).toBe(false);
    expect(isCoupleGranted("on")).toBe(false);
  });

  it("default grant reader stays couple_disabled until env is granted", () => {
    const previous = process.env.DELTECHO_AUTOGENESIS_COUPLE;
    const steps: number[][] = [];
    const coupler = new AutognosisAutogenesisCoupler({
      identity: new IdentityMesh({ autoSaveInterval: 0 }),
      reservoir: {
        inputDim: DEFAULT_INPUT_DIM,
        getAutognosisReport: () => healthyReport(),
        getState: () => reservoirState(),
        step: (input: number[]) => {
          steps.push(input);
        },
      },
      intentionality: {
        getActiveGoals: () => [],
        generateGoal: () => undefined,
      },
    });
    try {
      delete process.env.DELTECHO_AUTOGENESIS_COUPLE;
      const disabled = coupler.couple();
      expect(disabled.reason).toBe("couple_disabled");
      expect(steps).toHaveLength(0);

      process.env.DELTECHO_AUTOGENESIS_COUPLE = "yes";
      const enabled = coupler.couple();
      expect(enabled.skipped).toBe(false);
      expect(enabled.stepped).toBe(true);
      expect(steps).toHaveLength(1);
    } finally {
      if (previous === undefined) {
        delete process.env.DELTECHO_AUTOGENESIS_COUPLE;
      } else {
        process.env.DELTECHO_AUTOGENESIS_COUPLE = previous;
      }
    }
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

  it("re-enters when a later report object reuses the previous timestamp", () => {
    const first = healthyReport({ timestamp: 50 });
    const later = healthyReport({ timestamp: 50 });
    let current = first;
    const steps: number[][] = [];
    const coupler = new AutognosisAutogenesisCoupler({
      identity: new IdentityMesh({ autoSaveInterval: 0 }),
      reservoir: {
        inputDim: DEFAULT_INPUT_DIM,
        getAutognosisReport: () => current,
        getState: () => reservoirState(),
        step: (input: number[]) => {
          steps.push(input);
        },
      },
      intentionality: {
        getActiveGoals: () => [],
        generateGoal: () => undefined,
      },
      readGrant: () => true,
    });

    expect(coupler.couple().skipped).toBe(false);
    current = later;
    const second = coupler.couple();

    expect(second.skipped).toBe(false);
    expect(second.stepped).toBe(true);
    expect(steps).toHaveLength(2);
  });

  it("feeds self-state back so a later live report diverges from ambient-only", () => {
    const coupled = new ESNAutognosisReservoir({
      seed: 42,
      noiseAmplitude: 0,
    });
    const control = new ESNAutognosisReservoir({
      seed: 42,
      noiseAmplitude: 0,
    });
    let tick = 1;
    while (coupled.getAutognosisReport() == null) {
      coupled.step(ambientInput(tick));
      control.step(ambientInput(tick));
      tick += 1;
    }
    const firstKind = deriveAutogenesisKind(coupled.getAutognosisReport()!);
    const before = coupled.getState().activations.slice();
    const controlBefore = control.getState().activations.slice();

    const coupler = new AutognosisAutogenesisCoupler({
      identity: new IdentityMesh({ autoSaveInterval: 0 }),
      reservoir: {
        inputDim: 64,
        getAutognosisReport: () => coupled.getAutognosisReport(),
        getState: () => coupled.getState(),
        step: (input) => coupled.step(input),
      },
      intentionality: {
        getActiveGoals: () => [],
        generateGoal: () => undefined,
      },
      readGrant: () => true,
    });

    const first = coupler.couple();
    control.step(ambientInput(tick));
    tick += 1;
    expect(first.skipped).toBe(false);
    expect(first.kind).toBe(firstKind);
    expect(first.stepped).toBe(true);
    expect(
      activationDistance(before, coupled.getState().activations),
    ).toBeGreaterThan(
      activationDistance(controlBefore, control.getState().activations),
    );
    expect(coupler.couple().reason).toBe("already_coupled");

    let diverged = false;
    let laterKind: ReturnType<typeof deriveAutogenesisKind> | undefined;
    for (let cycle = 0; cycle < 8 && !diverged; cycle++) {
      for (let i = 0; i < 12; i++) {
        coupled.step(ambientInput(tick));
        control.step(ambientInput(tick));
        tick += 1;
      }
      const coupledReport = coupled.getAutognosisReport();
      const controlReport = control.getAutognosisReport();
      if (!coupledReport || !controlReport) continue;
      laterKind = deriveAutogenesisKind(coupledReport);
      const later = coupler.couple();
      expect(later.skipped).toBe(false);
      expect(later.stepped).toBe(true);
      diverged =
        coupledReport.isDead !== controlReport.isDead ||
        laterKind !== deriveAutogenesisKind(controlReport);
    }

    expect(diverged).toBe(true);
    expect(laterKind).not.toBe(firstKind);
  });
});

function ambientInput(tick: number, dim = 64): number[] {
  const input = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    input[i] = 0.01 * Math.sin((2 * Math.PI * (i + 1) * tick) / 100);
  }
  return input;
}

function activationDistance(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number {
  let sum = 0;
  for (let i = 0; i < left.length; i++) {
    const delta = (left[i] ?? 0) - (right[i] ?? 0);
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

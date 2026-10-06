import {
  AiriStageCueAdapter,
  type AiriStageCue,
  type AiriStageLease,
} from "../adapters/airi-stage-cue-adapter";
import { projectDTEchoCognitiveState } from "../dtecho-expression-driver";

const modelSha256 = "a".repeat(64);
const projection = projectDTEchoCognitiveState({
  mode: "Scientific Genius",
  scientificGenius: 0.8,
  esnCoherence: 0.85,
});

function lease(overrides: Partial<AiriStageLease> = {}): AiriStageLease {
  return {
    source: "dte-local-cognitive-bridge",
    modelId: "dtecho",
    modelSha256,
    leaseId: "dte-session-001",
    observedAt: 9_950,
    expiresAt: 12_000,
    coreSelfInitialized: true,
    audioActive: false,
    ...overrides,
  };
}

function setup() {
  let time = 10_000;
  const sink = { publish: jest.fn(), release: jest.fn() };
  const adapter = new AiriStageCueAdapter(sink, {
    modelId: "dtecho",
    modelSha256,
    availableExpressions: [projection.expressionName],
    availableMotions: projection.motion ? [projection.motion] : [],
    now: () => time,
    maxObservationAgeMs: 500,
    maxLeaseMs: 3_000,
  });
  return { adapter, sink, setTime: (value: number) => (time = value) };
}

describe("DTE-to-AIRI stage cue lease", () => {
  it("emits only bounded presentation axes, never mouth, cognitive internals, or credentials", () => {
    const { adapter, sink } = setup();
    expect(adapter.submit(projection, lease())).toBe("published");
    const cue = sink.publish.mock.calls[0][0] as AiriStageCue;
    expect(cue).toMatchObject({
      schemaVersion: 1,
      kind: "dte.presentation.cue",
      modelId: "dtecho",
      modelSha256,
      leaseId: "dte-session-001",
      observedAt: 9_950,
      expiresAt: 12_000,
      expressionName: projection.expressionName,
    });
    expect(Object.keys(cue.pose).sort()).toEqual(
      expect.arrayContaining(["headX", "headY", "bodyY"]),
    );
    expect(
      Object.values(cue.pose).every(
        (v) => Number.isFinite(v) && v >= -1 && v <= 1,
      ),
    ).toBe(true);
    expect(cue.pose).not.toHaveProperty("mouthOpen");
    expect(cue.pose).not.toHaveProperty("mouthForm");
    expect(JSON.stringify(cue)).not.toContain("scientificGenius");
    expect(JSON.stringify(cue)).not.toContain("daoConsensus");
  });

  it("yields expressions and motion to active speech, without writing mouth axes", () => {
    const { adapter, sink } = setup();
    expect(adapter.submit(projection, lease({ audioActive: true }))).toBe(
      "published",
    );
    expect(sink.publish.mock.calls[0][0]).toMatchObject({
      expressionName: null,
      motion: null,
    });
    expect(Object.keys(sink.publish.mock.calls[0][0].pose)).not.toContain(
      "mouthOpen",
    );
  });

  it("requires model binding, a local initialized core-self and fresh finite lease", () => {
    const { adapter, sink } = setup();
    for (const invalid of [
      { source: "airi" as AiriStageLease["source"] },
      { modelId: "miara" },
      { modelSha256: "b".repeat(64) },
      { coreSelfInitialized: false },
      { observedAt: 9_000 },
      { observedAt: 10_100 },
      { expiresAt: 9_999 },
      { expiresAt: 15_000 },
      { expiresAt: Number.NaN },
      { audioActive: undefined },
    ]) {
      expect(adapter.submit(projection, lease(invalid))).toBe("rejected");
    }
    expect(sink.publish).not.toHaveBeenCalled();
  });

  it("rejects replay and out-of-order samples, releases a prior lease before a new one", () => {
    const { adapter, sink } = setup();
    expect(adapter.submit(projection, lease())).toBe("published");
    expect(adapter.submit(projection, lease())).toBe("rejected");
    expect(adapter.submit(projection, lease({ observedAt: 9_900 }))).toBe(
      "rejected",
    );
    expect(
      adapter.submit(projection, lease({ leaseId: "dte-session-002" })),
    ).toBe("published");
    expect(sink.release).toHaveBeenCalledWith("dte-session-001");
    expect(sink.release.mock.invocationCallOrder[0]).toBeLessThan(
      sink.publish.mock.invocationCallOrder[1],
    );
    expect(sink.publish).toHaveBeenCalledTimes(2);
  });

  it("revokes on expiry, rejection, and disposal without resetting the rest of AIRI", () => {
    const { adapter, sink, setTime } = setup();
    adapter.submit(projection, lease());
    setTime(12_001);
    expect(adapter.tick()).toBe(true);
    expect(sink.release).toHaveBeenCalledTimes(1);
    expect(adapter.tick()).toBe(false);
    setTime(10_000);
    adapter.submit(projection, lease({ leaseId: "dte-session-002" }));
    expect(
      adapter.submit(projection, lease({ coreSelfInitialized: false })),
    ).toBe("rejected");
    expect(sink.release).toHaveBeenCalledWith("dte-session-002");
    adapter.dispose();
    expect(adapter.submit(projection, lease())).toBe("rejected");
    expect(sink.release).toHaveBeenCalledTimes(2);
  });

  it("releases on wall-clock timeout even when the host stops polling", () => {
    jest.useFakeTimers();
    try {
      const { adapter, sink } = setup();
      expect(adapter.submit(projection, lease())).toBe("published");
      jest.advanceTimersByTime(2_000);
      expect(sink.release).toHaveBeenCalledWith("dte-session-001");
      adapter.dispose();
      expect(sink.release).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not grant another lease after release fails", () => {
    const { adapter, sink } = setup();
    adapter.submit(projection, lease());
    sink.release.mockImplementationOnce(() => {
      throw new Error("stage disconnected");
    });
    expect(
      adapter.submit(projection, lease({ leaseId: "dte-session-002" })),
    ).toBe("rejected");
    expect(sink.publish).toHaveBeenCalledTimes(1);
    expect(
      adapter.submit(projection, lease({ leaseId: "dte-session-003" })),
    ).toBe("rejected");
  });

  it("does not resurrect ownership if a host revokes synchronously during publish", () => {
    const sink = { publish: jest.fn(), release: jest.fn() };
    const adapter = new AiriStageCueAdapter(sink, {
      modelId: "dtecho",
      modelSha256,
      availableExpressions: [projection.expressionName],
      availableMotions: [],
      now: () => 10_000,
    });
    sink.publish.mockImplementationOnce(() => adapter.revoke());
    expect(adapter.submit(projection, lease())).toBe("rejected");
    expect(sink.release).toHaveBeenCalledWith("dte-session-001");
    expect(adapter.tick()).toBe(false);
  });

  it("fails closed on non-finite projection or sink failure", () => {
    const { adapter, sink } = setup();
    expect(
      adapter.submit(
        {
          ...projection,
          cubism: { ...projection.cubism, ParamAngleX: Infinity },
        },
        lease(),
      ),
    ).toBe("rejected");
    sink.publish.mockImplementationOnce(() => {
      throw new Error("stage unavailable");
    });
    expect(adapter.submit(projection, lease())).toBe("rejected");
    expect(sink.release).toHaveBeenCalledWith("dte-session-001");
  });

  it("never invents an expression or motion absent from the loaded model manifest", () => {
    const sink = { publish: jest.fn(), release: jest.fn() };
    const adapter = new AiriStageCueAdapter(sink, {
      modelId: "dtecho",
      modelSha256,
      availableExpressions: [],
      availableMotions: [],
      now: () => 10_000,
    });
    expect(adapter.submit(projection, lease())).toBe("published");
    expect(sink.publish.mock.calls[0][0]).toMatchObject({
      expressionName: null,
      motion: null,
    });
  });
});

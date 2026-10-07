import {
  AiriStageCueAdapter,
  type AiriStageCue,
} from "../adapters/airi-stage-cue-adapter";
import {
  AiriStageCueHost,
  type AiriStagePose,
} from "../adapters/airi-stage-host";
import { projectDTEchoCognitiveState } from "../dtecho-expression-driver";

const digest = "c".repeat(64);
const otherDigest = "d".repeat(64);
const base: AiriStagePose = {
  eyeX: 0,
  eyeY: 0,
  eyeSquint: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  bodyX: 0,
  bodyY: 0,
  bodyZ: 0,
  mouthForm: 0.6,
  mouthOpen: 0.8,
  offsetX: 0.35,
  offsetY: -0.25,
};
const projection = projectDTEchoCognitiveState({
  mode: "Scientific Genius",
  scientificGenius: 0.8,
});

function cue(overrides: Partial<AiriStageCue> = {}): AiriStageCue {
  return {
    schemaVersion: 1,
    kind: "dte.presentation.cue",
    modelId: "miara",
    modelSha256: digest,
    leaseId: "lease-001",
    observedAt: 9_950,
    expiresAt: 12_000,
    expressionName: null,
    motion: null,
    pose: { headX: 0.4, eyeY: -0.2, bodyZ: 0.1 },
    ...overrides,
  };
}

function setup() {
  let now = 10_000;
  let model = {
    id: "miara",
    sha256: digest,
    expressions: [projection.expressionName],
    motions: [] as string[],
  };
  let speaking = false;
  const host = new AiriStageCueHost({
    now: () => now,
    selectedModel: () => model,
    isSpeaking: () => speaking,
  });
  return {
    host,
    setNow: (value: number) => {
      now = value;
    },
    setModel: (value: typeof model) => {
      model = value;
    },
    setSpeaking: (value: boolean) => {
      speaking = value;
    },
  };
}

describe("AIRI stage host presentation boundary", () => {
  it("composes a complete MAGIC pose while leaving mouth and translation to AIRI", () => {
    const { host } = setup();
    expect(host.publish(cue())).toBe(true);
    const actual = host.compose(base);
    expect(actual).toEqual({ ...base, headX: 0.4, eyeY: -0.2, bodyZ: 0.1 });
    expect(actual).not.toBe(base);
    expect(base.headX).toBe(0);
  });

  it("supports the existing DTE projection adapter without transferring cognitive internals", () => {
    const { host } = setup();
    const adapter = new AiriStageCueAdapter(host, {
      modelId: "miara",
      modelSha256: digest,
      availableExpressions: [projection.expressionName],
      availableMotions: [],
      now: () => 10_000,
    });
    expect(
      adapter.submit(projection, {
        source: "dte-local-cognitive-bridge",
        modelId: "miara",
        modelSha256: digest,
        leaseId: "lease-from-dte",
        observedAt: 9_990,
        expiresAt: 12_000,
        coreSelfInitialized: true,
        audioActive: false,
      }),
    ).toBe("published");
    expect(host.compose(base).mouthOpen).toBe(0.8);
    expect(host.activeExpression).toBe(projection.expressionName);
    expect(JSON.stringify(host.snapshot())).not.toContain("scientificGenius");
    adapter.revoke();
    expect(host.compose(base)).toEqual(base);
    adapter.dispose();
  });

  it("honors the stage's current speech state even when a sender claims an expression", () => {
    const { host, setSpeaking } = setup();
    expect(
      host.publish(cue({ expressionName: projection.expressionName })),
    ).toBe(true);
    setSpeaking(true);
    expect(host.activeExpression).toBeNull();
    expect(host.compose(base).mouthForm).toBe(0.6);
    setSpeaking(false);
    expect(host.activeExpression).toBe(projection.expressionName);
  });

  it("does not falsely report a published cue when the stage rejects a different model", () => {
    const { host, setModel } = setup();
    const adapter = new AiriStageCueAdapter(host, {
      modelId: "miara",
      modelSha256: digest,
      availableExpressions: [],
      availableMotions: [],
      now: () => 10_000,
    });
    setModel({
      id: "miara",
      sha256: otherDigest,
      expressions: [],
      motions: [],
    });
    expect(
      adapter.submit(projection, {
        source: "dte-local-cognitive-bridge",
        modelId: "miara",
        modelSha256: digest,
        leaseId: "lease-refused",
        observedAt: 9_990,
        expiresAt: 12_000,
        coreSelfInitialized: true,
        audioActive: false,
      }),
    ).toBe("rejected");
    expect(host.compose(base)).toEqual(base);
    adapter.dispose();
  });

  it("fails closed for foreign models, unsupported versions, injected fields and bad numbers", () => {
    const { host } = setup();
    for (const invalid of [
      cue({ modelSha256: otherDigest }),
      cue({ modelId: "dtecho" }),
      cue({ schemaVersion: 2 as 1 }),
      cue({ pose: { headX: Number.NaN } }),
      cue({ pose: { headX: 1.1 } }),
      cue({ pose: { mouthOpen: 0.9 } as AiriStageCue["pose"] }),
      { ...cue(), token: "secret" } as AiriStageCue,
      cue({ expressionName: "not-in-model" }),
    ]) {
      expect(host.publish(invalid)).toBe(false);
      expect(host.compose(base)).toEqual(base);
    }
  });

  it("expires independently of render frames and cannot replay a released lease", () => {
    jest.useFakeTimers();
    try {
      const { host, setNow } = setup();
      expect(host.publish(cue())).toBe(true);
      setNow(12_001);
      jest.advanceTimersByTime(2_001);
      expect(host.compose(base)).toEqual(base);
      expect(host.publish(cue({ observedAt: 11_950, expiresAt: 13_000 }))).toBe(
        false,
      );
      expect(
        host.publish(
          cue({ leaseId: "lease-002", observedAt: 11_950, expiresAt: 13_000 }),
        ),
      ).toBe(true);
      host.release("lease-002");
      expect(host.compose(base)).toEqual(base);
      host.dispose();
    } finally {
      jest.useRealTimers();
    }
  });

  it("revokes on actual model switch, rejects out-of-order updates and release of an unrelated lease", () => {
    const { host, setModel } = setup();
    expect(host.publish(cue())).toBe(true);
    expect(host.publish(cue())).toBe(false);
    host.release("other-lease");
    expect(host.compose(base).headX).toBe(0.4);
    setModel({
      id: "miara",
      sha256: otherDigest,
      expressions: [],
      motions: [],
    });
    expect(host.compose(base)).toEqual(base);
    setModel({ id: "miara", sha256: digest, expressions: [], motions: [] });
    expect(host.publish(cue({ observedAt: 9_960, expiresAt: 12_010 }))).toBe(
      false,
    );
  });
});

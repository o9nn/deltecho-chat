import {
  OnlineReservoirLearner,
  type FeedbackSignal,
  type LearnerState,
  type OnlineLearnerConfig,
} from "../OnlineReservoirLearner.js";
import { CognitiveReadout } from "../ReservoirBridge.js";

function scalar(config: Partial<OnlineLearnerConfig> = {}) {
  const learner = new OnlineReservoirLearner({
    reservoirDim: 1,
    outputDim: 1,
    forgettingFactor: 1,
    initialPDiag: 1,
    enableMomentum: false,
    ...config,
  });
  learner.deserialize({
    weights: Float64Array.of(0),
    pMatrix: Float64Array.of(1),
    momentum: Float64Array.of(0),
    totalUpdates: 0,
    cumulativeReward: 0,
    avgPredictionError: 0,
  });
  return learner;
}

const signal = (overrides: Partial<FeedbackSignal> = {}): FeedbackSignal => ({
  reservoirState: Float64Array.of(1),
  targetOutput: Float64Array.of(0.25),
  reward: 1,
  valence: 0,
  timestamp: 1000,
  source: "user",
  ...overrides,
});
const snapshot = (learner: OnlineReservoirLearner) => ({
  state: learner.serialize(),
  stats: learner.getStats(),
  history: learner.getUpdateHistory(),
  prediction: learner.predict(Float64Array.of(1)),
  dimensions: learner.getDimensions(),
});

// All fixtures exercise real forward passes, covariance updates and momentum.
describe("OnlineReservoirLearner numeric admission", () => {
  it("retains the exact scalar RLS control", () => {
    const learner = scalar();
    const update = learner.update(signal());
    expect(update.predictionError).toBe(0.25);
    expect(update.weightChangeMagnitude).toBe(0.125);
    expect(update.effectiveLearningRate).toBe(1);
    expect(learner.getWeights()[0]).toBe(0.125);
    expect(learner.serialize().pMatrix[0]).toBe(0.5);
  });

  it("retains forgetting, reward scaling, momentum and finite stability clamping", () => {
    const learner = scalar({
      forgettingFactor: 0.9,
      enableMomentum: true,
      momentumCoeff: 0.2,
      learningRateScale: 0.5,
      maxWeightMagnitude: 0.1,
    });
    learner.deserialize({
      ...learner.serialize(),
      momentum: Float64Array.of(0.02),
    });
    const update = learner.update(signal({ reward: 0 }));
    const delta = 0.25 * (1 / 1.9) * 0.25;
    expect(update.effectiveLearningRate).toBe(0.25);
    expect(learner.serialize().momentum[0]).toBeCloseTo(0.2 * 0.02 + delta, 14);
    expect(learner.getWeights()[0]).toBeCloseTo(0.2 * 0.02 + delta, 14);
    expect(learner.serialize().pMatrix[0]).toBeCloseTo((1 - 1 / 1.9) / 0.9, 14);
    learner.update(signal({ targetOutput: Float64Array.of(10) }));
    expect(learner.getWeights()[0]).toBe(0.1);
  });

  it.each([NaN, Infinity, -Infinity])(
    "rejects every non-finite evidence field: %s",
    (bad) => {
      for (const overrides of [
        { reservoirState: Float64Array.of(bad) },
        { targetOutput: Float64Array.of(bad) },
        { reward: bad },
        { valence: bad },
        { timestamp: bad },
      ]) {
        const learner = scalar({ enableMomentum: true });
        learner.update(signal());
        const before = snapshot(learner);
        let emitted = 0;
        learner.on("update", () => emitted++);
        expect(() => learner.update(signal(overrides))).toThrow(/finite/);
        expect(snapshot(learner)).toEqual(before);
        expect(emitted).toBe(0);
        const errorBefore = Math.abs(
          0.25 - learner.predict(Float64Array.of(1))[0],
        );
        learner.update(signal());
        expect(
          Math.abs(0.25 - learner.predict(Float64Array.of(1))[0]),
        ).toBeLessThan(errorBefore);
        expect(Object.values(learner.getStats()).every(Number.isFinite)).toBe(
          true,
        );
      }
    },
  );

  it.each([
    { reservoirState: new Float64Array(0) },
    { targetOutput: new Float64Array(2) },
    { timestamp: -1 },
  ])(
    "rejects bad shapes and negative timestamps atomically: %j",
    (overrides) => {
      const learner = scalar();
      learner.update(signal());
      const before = snapshot(learner);
      expect(() => learner.update(signal(overrides))).toThrow();
      expect(snapshot(learner)).toEqual(before);
    },
  );

  it.each([-1, -2, Number.MAX_VALUE])(
    "rejects zero/negative/overflowed denominator from finite fixtures: P=%s",
    (p) => {
      const learner = scalar();
      learner.deserialize({
        ...learner.serialize(),
        pMatrix: Float64Array.of(p),
      });
      const before = snapshot(learner);
      const x = p === Number.MAX_VALUE ? 2 : 1;
      expect(() =>
        learner.update(signal({ reservoirState: Float64Array.of(x) })),
      ).toThrow(/denominator/);
      expect(snapshot(learner)).toEqual(before);
    },
  );

  it("rejects finite arithmetic overflow and counter/reward overflow before mutation", () => {
    const learner = scalar({ enableMomentum: true });
    learner.update(signal());
    const before = snapshot(learner);
    expect(() =>
      learner.update(
        signal({ targetOutput: Float64Array.of(Number.MAX_VALUE) }),
      ),
    ).toThrow(/finite/);
    expect(snapshot(learner)).toEqual(before);
    learner.deserialize({
      ...learner.serialize(),
      totalUpdates: Number.MAX_SAFE_INTEGER,
    });
    const atLimit = snapshot(learner);
    expect(() => learner.update(signal())).toThrow(/finite/);
    expect(snapshot(learner)).toEqual(atLimit);
    learner.deserialize({
      ...learner.serialize(),
      totalUpdates: 1,
      cumulativeReward: Number.MAX_VALUE,
    });
    const rewardLimit = snapshot(learner);
    expect(() => learner.update(signal({ reward: Number.MAX_VALUE }))).toThrow(
      /finite/,
    );
    expect(snapshot(learner)).toEqual(rewardLimit);
  });

  it("rejects covariance overflow after staging weights without partial commit", () => {
    const learner = scalar({ forgettingFactor: 0.9, enableMomentum: true });
    learner.deserialize({
      ...learner.serialize(),
      pMatrix: Float64Array.of(Number.MAX_VALUE),
      momentum: Float64Array.of(0.02),
    });
    const before = snapshot(learner);
    // Finite positive denominator, but P / lambda overflows at zero input.
    expect(() =>
      learner.update(signal({ reservoirState: Float64Array.of(0) })),
    ).toThrow(/finite/);
    expect(snapshot(learner)).toEqual(before);
  });

  it("retains the last-100 error smoothing and configured history limit", () => {
    const learner = scalar({ learningRateScale: 0, maxHistorySize: 3 });
    for (let n = 1; n <= 105; n++)
      learner.update(
        signal({ targetOutput: Float64Array.of(n), timestamp: n }),
      );
    expect(learner.getAvgPredictionError()).toBe(55.5);
    expect(learner.getUpdateHistory().map((entry) => entry.index)).toEqual([
      103, 104, 105,
    ]);
  });

  it("retains default dimensions and forgetting mutator's finite clamping", () => {
    const learner = new OnlineReservoirLearner();
    expect(learner.getDimensions()).toEqual({
      reservoirDim: 256,
      outputDim: 64,
    });
    const adaptive = scalar();
    const control = scalar();
    adaptive.setForgettingFactor(10);
    control.setForgettingFactor(0.9999);
    for (const bad of [NaN, Infinity, -Infinity])
      expect(() => adaptive.setForgettingFactor(bad)).toThrow(/finite/);
    expect(adaptive.update(signal())).toEqual(control.update(signal()));
    expect(adaptive.serialize()).toEqual(control.serialize());
    adaptive.setForgettingFactor(-10);
    expect(adaptive.update(signal()).predictionError).toBeGreaterThan(0);
  });

  it.each([
    { reservoirDim: NaN },
    { reservoirDim: 0 },
    { outputDim: 1.5 },
    { forgettingFactor: NaN },
    { forgettingFactor: 0 },
    { forgettingFactor: 1.1 },
    { initialPDiag: Infinity },
    { initialPDiag: 0 },
    { minUpdateMagnitude: NaN },
    { maxWeightMagnitude: -1 },
    { momentumCoeff: Infinity },
    { momentumCoeff: 1.1 },
    { learningRateScale: NaN },
    { learningRateScale: -1 },
    { maxHistorySize: 1.5 },
  ])(
    "rejects invalid constructor config before initialization: %j",
    (config) => {
      expect(() => scalar(config)).toThrow(/configuration/);
    },
  );
});

describe("OnlineReservoirLearner checkpoint transaction", () => {
  const invalidStates: Partial<LearnerState>[] = [
    { weights: new Float64Array(2) },
    { pMatrix: new Float64Array(0) },
    { momentum: new Float64Array(2) },
    { weights: Float64Array.of(NaN) },
    { weights: Float64Array.of(Number.MAX_VALUE) },
    { pMatrix: Float64Array.of(Infinity) },
    { momentum: Float64Array.of(-Infinity) },
    { totalUpdates: NaN },
    { totalUpdates: -1 },
    { totalUpdates: 1.5 },
    { totalUpdates: Number.MAX_SAFE_INTEGER + 1 },
    { cumulativeReward: Infinity },
    { avgPredictionError: NaN },
    { avgPredictionError: -0.1 },
  ];
  it.each(invalidStates)(
    "rejects full typed checkpoint without mutating trained state: %j",
    (invalid) => {
      const learner = scalar({ enableMomentum: true });
      learner.update(signal());
      const before = snapshot(learner);
      expect(() =>
        learner.deserialize({ ...learner.serialize(), ...invalid }),
      ).toThrow();
      expect(snapshot(learner)).toEqual(before);
      learner.update(signal());
      expect(
        Math.abs(0.25 - learner.predict(Float64Array.of(1))[0]),
      ).toBeLessThan(Math.abs(0.25 - before.prediction[0]));
    },
  );

  it.each([null, "0", false, undefined])(
    "rejects raw JSON-like entries before coercion: %j",
    (value) => {
      const learner = scalar();
      const raw = { ...learner.serialize(), weights: [value] };
      expect(() =>
        OnlineReservoirLearner.parseState(raw, learner.getDimensions()),
      ).toThrow(/finite/);
      expect(() =>
        OnlineReservoirLearner.parseState(
          { ...raw, weights: new Array(1) },
          learner.getDimensions(),
        ),
      ).toThrow(/finite/);
    },
  );

  it("round-trips valid state, preserves the error summary, isolates copies and resumes real learning", () => {
    const learner = scalar({ enableMomentum: true, momentumCoeff: 0.2 });
    learner.update(signal());
    const saved = learner.serialize();
    const restored = scalar({ enableMomentum: true, momentumCoeff: 0.2 });
    restored.deserialize(saved);
    expect(restored.serialize()).toEqual(saved);
    expect(restored.predict(Float64Array.of(1))).toEqual(
      learner.predict(Float64Array.of(1)),
    );
    expect(restored.getUpdateHistory()).toEqual([]); // History is not serialized.
    saved.weights.fill(9);
    saved.pMatrix.fill(9);
    saved.momentum.fill(9);
    expect(restored.serialize()).toEqual(learner.serialize());
    const errorBefore = Math.abs(
      0.25 - restored.predict(Float64Array.of(1))[0],
    );
    restored.update(signal());
    expect(
      Math.abs(0.25 - restored.predict(Float64Array.of(1))[0]),
    ).toBeLessThan(errorBefore);
    expect(restored.serialize().pMatrix).not.toEqual(
      learner.serialize().pMatrix,
    );
  });

  it("rejects an invalid packet and still trains actual multi-output weights/readout", () => {
    const learner = new OnlineReservoirLearner({
      reservoirDim: 2,
      outputDim: 2,
      forgettingFactor: 1,
      enableMomentum: false,
    });
    learner.deserialize({
      ...learner.serialize(),
      weights: new Float64Array(4),
    });
    const examples = [
      { x: Float64Array.of(1, 0), y: Float64Array.of(0.25, -0.2) },
      { x: Float64Array.of(0, 1), y: Float64Array.of(-0.3, 0.4) },
    ];
    const error = () =>
      examples.reduce(
        (sum, { x, y }) =>
          sum +
          y.reduce(
            (e, target, i) => e + (target - learner.predict(x)[i]) ** 2,
            0,
          ),
        0,
      );
    const beforeError = error();
    const beforeState = learner.serialize();
    expect(() =>
      learner.update(
        signal({
          reservoirState: Float64Array.of(1, NaN),
          targetOutput: Float64Array.of(0.25, -0.2),
        }),
      ),
    ).toThrow();
    expect(learner.serialize()).toEqual(beforeState);
    for (let n = 0; n < 60; n++) {
      const { x, y } = examples[n % examples.length];
      learner.update(
        signal({ reservoirState: x, targetOutput: y, timestamp: n }),
      );
    }
    expect(error()).toBeLessThan(beforeError * 0.001);
    const readout = new CognitiveReadout(2);
    readout.setOutputMajorWeights(learner.getWeights(), 2, 2);
    for (const { x } of examples)
      expect(Array.from(readout.run(x).output)).toEqual(
        Array.from(learner.predict(x), Math.tanh),
      );
  });
});

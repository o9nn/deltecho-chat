import { OnlineReservoirLearner } from "../OnlineReservoirLearner.js";
import { CognitiveReadout, EchoReservoir } from "../ReservoirBridge.js";

// Fixed numeric fixtures initialize real model state; no forward/update mocks.
const outputMajor = Float64Array.from([0.2, -0.4, 0.6, -0.1, 0.3, 0.5]);
const probe = Float64Array.from([0.5, -0.25, 0.75]);

function learnerWithWeights(weights = outputMajor): OnlineReservoirLearner {
  const learner = new OnlineReservoirLearner({
    reservoirDim: 3,
    outputDim: 2,
    forgettingFactor: 1,
    initialPDiag: 100,
    enableMomentum: true,
    momentumCoeff: 0.2,
  });
  learner.deserialize({ ...learner.serialize(), weights });
  return learner;
}

function expectParity(
  readout: CognitiveReadout,
  learner: OnlineReservoirLearner,
  state: Float64Array,
  bias = new Float64Array(2),
): void {
  const prediction = learner.predict(state);
  const result = readout.run(state);
  prediction.forEach((value, o) => {
    expect(result.output[o]).toBeCloseTo(Math.tanh(value + bias[o]), 14);
  });
}

describe("CognitiveReadout output-major online adapter", () => {
  it("transposes distinct 3x2 weights with numeric forward parity and copy isolation", () => {
    const learner = learnerWithWeights();
    const readout = new CognitiveReadout(2);
    const exported = learner.getWeights();
    const before = learner.serialize();
    readout.setOutputMajorWeights(exported, 2, 3);
    expect(readout.getDimensions()).toEqual({ inputDim: 3, outputDim: 2 });
    expectParity(readout, learner, probe);
    expect(learner.predict(probe)[0]).toBeCloseTo(0.65, 14);
    expect(learner.predict(probe)[1]).toBeCloseTo(0.25, 14);
    expect(readout.run(probe).output[0]).toBeCloseTo(0.5716699660851172, 14);
    expect(readout.run(probe).output[1]).toBeCloseTo(0.24491866240370913, 14);
    expect(Array.from(readout.run(probe).output)).toEqual(
      Array.from(learner.predict(probe), Math.tanh),
    );
    exported.fill(9);
    expectParity(readout, learner, probe);
    expect(learner.serialize()).toEqual(before);
    const dimensions = learner.getDimensions();
    dimensions.reservoirDim = 900;
    expect(learner.getDimensions()).toEqual({ reservoirDim: 3, outputDim: 2 });
  });

  it("preserves legacy input-major setWeights and batch training", () => {
    const readout = new CognitiveReadout(2);
    readout.setWeights(
      Float64Array.from([0.2, -0.1, -0.4, 0.3, 0.6, 0.5]),
      2,
      3,
    );
    expectParity(readout, learnerWithWeights(), probe);

    const X = [
      Float64Array.from([1, 0, 0]),
      Float64Array.from([0, 1, 0]),
      Float64Array.from([0, 0, 1]),
    ];
    const Y = [
      Float64Array.from([0.2, -0.1]),
      Float64Array.from([-0.4, 0.3]),
      Float64Array.from([0.6, 0.5]),
    ];
    readout.train(X, Y);
    const batchOutput = readout.run(probe);
    // Inspect only to transfer the real batch result into the real learner.
    const batchWeights = (readout as unknown as { weights: Float64Array })
      .weights;
    const learnerWeights = new Float64Array(6);
    for (let d = 0; d < 3; d++) {
      for (let o = 0; o < 2; o++)
        learnerWeights[o * 3 + d] = batchWeights[d * 2 + o];
    }
    const learner = learnerWithWeights(learnerWeights);
    readout.setOutputMajorWeights(learner.getWeights(), 2, 3);
    expect(readout.run(probe)).toEqual(batchOutput);
    expectParity(readout, learner, probe);
  });

  it("uses actual RLS training, lowers numeric target error and preserves post-sync parity", () => {
    const learner = learnerWithWeights(new Float64Array(6));
    const readout = new CognitiveReadout(2);
    const reservoir = new EchoReservoir({ units: 3, seed: 21 });
    reservoir.step([0.4, -0.2]);
    const reservoirBefore = reservoir.serialize();
    const learnerBefore = learner.serialize();
    const examples = [
      { x: Float64Array.from([1, 0, 0]), y: Float64Array.from([0.25, -0.2]) },
      { x: Float64Array.from([0, 1, 0]), y: Float64Array.from([-0.3, 0.4]) },
      { x: Float64Array.from([0, 0, 1]), y: Float64Array.from([0.15, 0.1]) },
    ];
    const squaredError = () =>
      examples.reduce((sum, { x, y }) => {
        const prediction = learner.predict(x);
        return (
          sum +
          y.reduce(
            (error, target, o) => error + (target - prediction[o]) ** 2,
            0,
          )
        );
      }, 0);
    const beforeError = squaredError();
    readout.setOutputMajorWeights(learner.getWeights(), 2, 3);
    const readoutSquaredError = () =>
      examples.reduce((sum, { x, y }) => {
        const output = readout.run(x).output;
        return (
          sum +
          y.reduce(
            (error, target, o) => error + (Math.tanh(target) - output[o]) ** 2,
            0,
          )
        );
      }, 0);
    const beforeReadoutError = readoutSquaredError();
    for (let n = 0; n < 60; n++) {
      const { x, y } = examples[n % examples.length];
      learner.update({
        reservoirState: x,
        targetOutput: y,
        reward: 1,
        valence: 0,
        timestamp: n,
        source: "user",
      });
    }
    const afterError = squaredError();
    expect(afterError).toBeLessThan(beforeError * 0.001);
    expect(learner.getStats().totalUpdates).toBe(60);
    expect(learner.serialize().weights).not.toEqual(learnerBefore.weights);
    expect(learner.serialize().pMatrix).not.toEqual(learnerBefore.pMatrix);
    expect(learner.serialize().momentum.some((value) => value !== 0)).toBe(
      true,
    );
    const trainedState = learner.serialize();
    readout.setOutputMajorWeights(learner.getWeights(), 2, 3);
    expect(readoutSquaredError()).toBeLessThan(beforeReadoutError * 0.001);
    for (const { x } of examples) expectParity(readout, learner, x);
    expectParity(readout, learner, probe);
    expectParity(readout, learner, reservoir.getCombinedState());
    expect(learner.serialize()).toEqual(trainedState);
    expect(reservoir.serialize()).toEqual(reservoirBefore);
  });

  it("retains existing nonzero bias and tanh on repeated sync", () => {
    const learner = learnerWithWeights();
    const readout = new CognitiveReadout(2);
    readout.setWeights(new Float64Array(6), 2, 3);
    const bias = Float64Array.from([0.12, -0.23]);
    (readout as unknown as { bias: Float64Array }).bias = bias;
    readout.setOutputMajorWeights(learner.getWeights(), 2, 3);
    expectParity(readout, learner, probe, bias);
    expect((readout as unknown as { bias: Float64Array }).bias).toBe(bias);
  });

  it.each([
    [3, 2], // Same length, incompatible swapped dimensions.
    [2, 4],
    [2, 0],
    [2, -3],
    [2, 1.5],
    [2, Number.NaN],
    [2, Number.POSITIVE_INFINITY],
  ])(
    "rejects dimensions output=%s input=%s with no partial mutation",
    (outputDim, inputDim) => {
      const readout = new CognitiveReadout(2);
      readout.setWeights(
        Float64Array.from([0.2, -0.1, -0.4, 0.3, 0.6, 0.5]),
        2,
        3,
      );
      const before = readout.run(probe);
      expect(() =>
        readout.setOutputMajorWeights(outputMajor, outputDim, inputDim),
      ).toThrow();
      expect(readout.run(probe)).toEqual(before);
      expect(readout.getDimensions()).toEqual({ inputDim: 3, outputDim: 2 });
      expect(readout.isTrained()).toBe(true);
    },
  );

  it.each([
    new Float64Array(5),
    Float64Array.from([0, 0, 0, 0, 0, Number.NaN]),
    Float64Array.from([0, 0, 0, 0, 0, Infinity]),
  ])(
    "rejects malformed values without training an uninitialized readout",
    (weights) => {
      const readout = new CognitiveReadout(2);
      expect(() => readout.setOutputMajorWeights(weights, 2, 3)).toThrow();
      expect(readout.getDimensions()).toEqual({ inputDim: 0, outputDim: 2 });
      expect(readout.isTrained()).toBe(false);
      expect(readout.run(probe).output).toEqual(new Float64Array(2));
    },
  );
});

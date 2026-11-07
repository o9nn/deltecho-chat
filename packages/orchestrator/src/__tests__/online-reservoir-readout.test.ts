import { describe, expect, it } from "@jest/globals";
import {
  CognitiveReadout,
  EchoReservoir,
  OnlineReservoirLearner,
} from "deep-tree-echo-core";
import { syncOnlineReservoirReadout } from "../orchestrator.js";

function trainedLearner(
  reservoirDim = 3,
  outputDim = 2,
  updates = 12,
): OnlineReservoirLearner {
  const learner = new OnlineReservoirLearner({ reservoirDim, outputDim });
  learner.deserialize({
    ...learner.serialize(),
    weights: new Float64Array(reservoirDim * outputDim),
  });
  const state = Float64Array.from(
    { length: reservoirDim },
    (_, i) => (i + 1) * 0.1,
  );
  const target = Float64Array.from(
    { length: outputDim },
    (_, o) => 0.2 - o * 0.3,
  );
  for (let n = 0; n < updates; n++) {
    learner.update({
      reservoirState: state,
      targetOutput: target,
      reward: 1,
      valence: 0,
      timestamp: n,
      source: "user",
    });
  }
  return learner;
}

describe("orchestrator online learning boundary", () => {
  it("syncs actual trained custom 3x2 weights without hard-coded dimensions", () => {
    const learner = trainedLearner();
    const readout = new CognitiveReadout(2);
    const reservoir = new EchoReservoir({ units: 3 });
    reservoir.step([0.3, -0.2]);
    const beforeReservoir = reservoir.serialize();
    const beforeLearner = learner.serialize();
    expect(syncOnlineReservoirReadout(learner, readout, reservoir)).toBe(true);
    expect(readout.getDimensions()).toEqual({ inputDim: 3, outputDim: 2 });
    const probe = Float64Array.from([0.4, -0.2, 0.6]);
    learner.predict(probe).forEach((value, o) => {
      expect(readout.run(probe).output[o]).toBeCloseTo(Math.tanh(value), 14);
    });
    expect(learner.serialize()).toEqual(beforeLearner);
    expect(reservoir.serialize()).toEqual(beforeReservoir);
  });

  it.each([0, 10])(
    "retains the existing threshold at %s real updates",
    (updates) => {
      const learner = trainedLearner(3, 2, updates);
      const readout = new CognitiveReadout(2);
      expect(
        syncOnlineReservoirReadout(
          learner,
          readout,
          new EchoReservoir({ units: 3 }),
        ),
      ).toBe(false);
      expect(readout.isTrained()).toBe(false);
    },
  );

  it.each([
    { reservoirDim: 4, outputDim: 2 },
    { reservoirDim: 3, outputDim: 3 },
  ])(
    "rejects incompatible custom config without changing any model: %j",
    (config) => {
      const learner = trainedLearner(config.reservoirDim, config.outputDim);
      const readout = new CognitiveReadout(2);
      const reservoir = new EchoReservoir({ units: 3 });
      readout.setWeights(
        Float64Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
        2,
        3,
      );
      const probe = Float64Array.from([0.4, -0.2, 0.6]);
      const beforeReadout = readout.run(probe);
      const beforeReservoir = reservoir.serialize();
      const beforeLearner = learner.serialize();
      expect(() =>
        syncOnlineReservoirReadout(learner, readout, reservoir),
      ).toThrow();
      expect(readout.run(probe)).toEqual(beforeReadout);
      expect(readout.getDimensions()).toEqual({ inputDim: 3, outputDim: 2 });
      expect(learner.serialize()).toEqual(beforeLearner);
      expect(reservoir.serialize()).toEqual(beforeReservoir);
    },
  );

  it.each([new Float64Array(5), Float64Array.from([0, 0, 0, 0, 0, NaN])])(
    "rejects malformed restored learner weights without partial readout mutation",
    (weights) => {
      const learner = trainedLearner();
      learner.deserialize({ ...learner.serialize(), weights });
      const readout = new CognitiveReadout(2);
      const reservoir = new EchoReservoir({ units: 3 });
      readout.setWeights(
        Float64Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
        2,
        3,
      );
      const probe = Float64Array.from([0.4, -0.2, 0.6]);
      const before = readout.run(probe);
      const beforeLearner = learner.serialize();
      expect(() =>
        syncOnlineReservoirReadout(learner, readout, reservoir),
      ).toThrow();
      expect(readout.run(probe)).toEqual(before);
      expect(readout.getDimensions()).toEqual({ inputDim: 3, outputDim: 2 });
      expect(learner.serialize()).toEqual(beforeLearner);
    },
  );

  it("rejects an already-trained readout with a different input dimension", () => {
    const learner = trainedLearner();
    const readout = new CognitiveReadout(2);
    readout.setWeights(Float64Array.from([0.1, 0.2, 0.3, 0.4]), 2, 2);
    const probe = Float64Array.from([0.4, -0.2]);
    const before = readout.run(probe);
    expect(() =>
      syncOnlineReservoirReadout(
        learner,
        readout,
        new EchoReservoir({ units: 3 }),
      ),
    ).toThrow();
    expect(readout.run(probe)).toEqual(before);
    expect(readout.getDimensions()).toEqual({ inputDim: 2, outputDim: 2 });
  });
});

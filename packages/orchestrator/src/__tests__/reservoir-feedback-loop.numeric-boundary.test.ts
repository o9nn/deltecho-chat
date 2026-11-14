import { afterEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  ReservoirFeedbackLoop,
  type FeedbackEvent,
} from "../reservoir-feedback-loop.js";
import { CognitiveReadout } from "deep-tree-echo-core";
import {
  ScientificGeniusEngineImpl,
  ScientificDomain,
} from "../../../core/src/scientific-genius/ScientificGeniusEngine.js";
import { SelfModificationEngine } from "../self-modification.js";

const loops: ReservoirFeedbackLoop[] = [];
const directories: string[] = [];
afterEach(async () => {
  for (const loop of loops.splice(0)) await loop.stop();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function fixture(persist = false) {
  const directory = mkdtempSync(join(tmpdir(), "dte-rls-boundary-"));
  directories.push(directory);
  const path = join(directory, "learner.json");
  const loop = new ReservoirFeedbackLoop({
    reservoirDim: 1,
    outputDim: 1,
    maxBufferSize: 1,
    batchIntervalMs: 3600000,
    persistIntervalMs: 3600000,
    enablePersistence: persist,
    persistPath: path,
  });
  loops.push(loop);
  const learner = loop.getLearner();
  learner.deserialize({
    weights: Float64Array.of(0),
    pMatrix: Float64Array.of(1),
    momentum: Float64Array.of(0),
    totalUpdates: 11,
    cumulativeReward: 0,
    avgPredictionError: 0,
  });
  const errors: unknown[] = [];
  let updates = 0,
    batches = 0,
    persisted = 0;
  loop.on("error", (event) => errors.push(event));
  learner.on("update", () => updates++);
  loop.on("batch_update", () => batches++);
  loop.on("state_persisted", () => persisted++);
  return {
    loop,
    learner,
    path,
    errors,
    counts: () => ({ updates, batches, persisted }),
  };
}

const feedback = (overrides: Partial<FeedbackEvent> = {}): FeedbackEvent => ({
  source: "external",
  reservoirState: Float64Array.of(1),
  targetOutput: Float64Array.of(0.25),
  reward: 1,
  timestamp: 1000,
  ...overrides,
});
const snapshot = (loop: ReservoirFeedbackLoop) => ({
  state: loop.getLearner().serialize(),
  stats: loop.getLearner().getStats(),
  history: loop.getLearner().getUpdateHistory(),
  prediction: loop.getLearner().predict(Float64Array.of(1)),
  metrics: loop.getMetrics(),
});

// Local timers/files only; actual RLS, readout, persistence and restore methods.
describe("ReservoirFeedbackLoop finite evidence boundary", () => {
  it.each([NaN, Infinity, -Infinity])(
    "rejects public coherence=%s before buffering and still learns on finite feedback",
    (bad) => {
      const { loop, learner, errors, counts } = fixture();
      loop.start();
      loop.submitFeedback(feedback());
      const before = snapshot(loop);
      const beforeCounts = counts();
      loop.submitCoherenceFeedback(bad, Float64Array.of(1));
      expect(snapshot(loop)).toEqual(before);
      expect(counts()).toEqual(beforeCounts);
      expect(errors).toHaveLength(1);
      const errorBefore = Math.abs(
        0.25 - learner.predict(Float64Array.of(1))[0],
      );
      loop.submitFeedback(feedback());
      expect(
        Math.abs(0.25 - learner.predict(Float64Array.of(1))[0]),
      ).toBeLessThan(errorBefore);
      expect(counts().updates).toBe(beforeCounts.updates + 1);
      expect(counts().batches).toBe(beforeCounts.batches + 1);
      expect(Object.values(learner.getStats()).every(Number.isFinite)).toBe(
        true,
      );
      // Valid public coherence still feeds the actual learner.
      loop.submitCoherenceFeedback(0.9, Float64Array.of(1));
      expect(counts().updates).toBe(beforeCounts.updates + 2);
      const readout = new CognitiveReadout(1);
      readout.setOutputMajorWeights(learner.getWeights(), 1, 1);
      expect(readout.run(Float64Array.of(1)).output[0]).toBe(
        Math.tanh(learner.predict(Float64Array.of(1))[0]),
      );
    },
  );

  it.each([
    { reservoirState: Float64Array.of(NaN) },
    { reservoirState: Float64Array.of(Infinity) },
    { targetOutput: Float64Array.of(-Infinity) },
    { reward: NaN },
    { timestamp: NaN },
    { timestamp: -1 },
    { reservoirState: new Float64Array(2) },
    { targetOutput: new Float64Array(0) },
  ])(
    "rejects malformed public packets without learner/buffer/success mutation: %j",
    (invalid) => {
      const { loop, errors, counts } = fixture();
      loop.start();
      loop.submitFeedback(feedback());
      const before = snapshot(loop),
        beforeCounts = counts();
      loop.submitFeedback(feedback(invalid));
      expect(snapshot(loop)).toEqual(before);
      expect(counts()).toEqual(beforeCounts);
      expect(errors).toHaveLength(1);
      loop.submitFeedback(feedback());
      expect(loop.getMetrics().totalRLSUpdates).toBe(
        before.metrics.totalRLSUpdates + 1,
      );
    },
  );

  it("rejects finite arithmetic overflow via the existing learner failure path", () => {
    const { loop, errors, counts } = fixture();
    loop.start();
    const before = loop.getLearner().serialize();
    loop.submitFeedback(
      feedback({ targetOutput: Float64Array.of(Number.MAX_VALUE) }),
    );
    expect(loop.getLearner().serialize()).toEqual(before);
    expect(counts().updates).toBe(0);
    expect(counts().batches).toBe(0);
    expect(loop.getMetrics().totalRLSUpdates).toBe(0);
    expect(errors).toHaveLength(1);
    loop.submitFeedback(feedback());
    expect(counts().updates).toBe(1);
  });

  it("retains finite RLS error at the real scientific/adaptation telemetry join after rejection", async () => {
    const { loop, learner } = fixture();
    loop.start();
    // The fixture restores a zero-error summary: mean(0, 1.2) = 0.6.
    loop.submitFeedback(feedback({ targetOutput: Float64Array.of(1.2) }));
    const scientific = new ScientificGeniusEngineImpl({ verbose: false });
    const [hypothesis] = await scientific.generateHypotheses(
      "reservoir prediction error",
      ScientificDomain.ComputerScience,
    );
    hypothesis.supportingEvidence.push({
      id: "finite-measured-evidence",
      description: "Local typed observation fixture",
      source: "numeric-fixture",
      strength: 0.95,
      reliability: 0.95,
      timestamp: 1000,
    });
    await scientific.evaluateHypothesis(hypothesis);
    expect(Number.isFinite(hypothesis.posteriorProbability)).toBe(true);
    expect(Number.isFinite(hypothesis.freeEnergy)).toBe(true);
    const pressure = Math.min(1, Math.max(0, hypothesis.freeEnergy / 2)) * 0.1;
    const errorBefore = learner.getAvgPredictionError();
    loop.submitCoherenceFeedback(NaN, Float64Array.of(1));
    expect(learner.getAvgPredictionError()).toBe(errorBefore);
    const joinedError = learner.getAvgPredictionError() + pressure;
    expect(Number.isFinite(joinedError)).toBe(true);
    const selfMod = new SelfModificationEngine({
      enablePersistence: false,
      dryRun: true,
    });
    expect(
      selfMod
        .proposeModifications(0.7, joinedError, 0, 1)
        .some((proposal) => proposal.key === "reservoir.forgettingFactor"),
    ).toBe(true);
    // No proposal is applied and no hypothesis becomes an authorization.
  });
});

describe("ReservoirFeedbackLoop checkpoint transaction", () => {
  async function savedFixture() {
    const result = fixture(true);
    result.loop.start();
    result.loop.submitFeedback(feedback());
    await result.loop.stop();
    return result;
  }

  const rawMutations: Array<[string, (raw: Record<string, any>) => void]> = [
    [
      "weights null",
      (raw) => {
        raw.weights = [null];
      },
    ],
    [
      "covariance null",
      (raw) => {
        raw.pMatrix = [null];
      },
    ],
    [
      "momentum null",
      (raw) => {
        raw.momentum = [null];
      },
    ],
    [
      "all NaN JSON null",
      (raw) => {
        raw.weights = [NaN];
        raw.pMatrix = [NaN];
        raw.momentum = [NaN];
        raw.avgPredictionError = NaN;
      },
    ],
    [
      "weight length",
      (raw) => {
        raw.weights = [0, 0];
      },
    ],
    [
      "covariance length",
      (raw) => {
        raw.pMatrix = [];
      },
    ],
    [
      "momentum length",
      (raw) => {
        raw.momentum = [];
      },
    ],
    [
      "null count",
      (raw) => {
        raw.totalUpdates = null;
      },
    ],
    [
      "fractional count",
      (raw) => {
        raw.totalUpdates = 1.5;
      },
    ],
    [
      "negative count",
      (raw) => {
        raw.totalUpdates = -1;
      },
    ],
    [
      "unsafe count",
      (raw) => {
        raw.totalUpdates = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
    [
      "null reward",
      (raw) => {
        raw.cumulativeReward = null;
      },
    ],
    [
      "null error",
      (raw) => {
        raw.avgPredictionError = null;
      },
    ],
    [
      "negative error",
      (raw) => {
        raw.avgPredictionError = -0.1;
      },
    ],
    [
      "string number",
      (raw) => {
        raw.weights = ["0"];
      },
    ],
    [
      "incompatible dimensions",
      (raw) => {
        raw.config.reservoirDim = 2;
      },
    ],
    [
      "null config factor",
      (raw) => {
        raw.config.forgettingFactor = null;
      },
    ],
    [
      "null config interval",
      (raw) => {
        raw.config.batchIntervalMs = null;
      },
    ],
    [
      "invalid config buffer",
      (raw) => {
        raw.config.maxBufferSize = 0;
      },
    ],
    [
      "missing config",
      (raw) => {
        delete raw.config;
      },
    ],
    [
      "null savedAt",
      (raw) => {
        raw.savedAt = null;
      },
    ],
    [
      "negative savedAt",
      (raw) => {
        raw.savedAt = -1;
      },
    ],
  ];

  it.each(rawMutations)(
    "restore false preserves full previously trained state for %s",
    async (_name, mutate) => {
      const { loop, learner, path } = await savedFixture();
      // Establish newer, valid in-memory state before presenting the bad file.
      learner.update({
        reservoirState: Float64Array.of(1),
        targetOutput: Float64Array.of(0.25),
        reward: 1,
        valence: 0,
        timestamp: 1001,
        source: "user",
      });
      const raw = JSON.parse(readFileSync(path, "utf8"));
      mutate(raw);
      writeFileSync(path, JSON.stringify(raw));
      const before = snapshot(loop);
      expect(await loop.restoreState()).toBe(false);
      expect(snapshot(loop)).toEqual(before);
      const errorBefore = Math.abs(0.25 - before.prediction[0]);
      learner.update({
        reservoirState: Float64Array.of(1),
        targetOutput: Float64Array.of(0.25),
        reward: 1,
        valence: 0,
        timestamp: 1002,
        source: "user",
      });
      expect(
        Math.abs(0.25 - learner.predict(Float64Array.of(1))[0]),
      ).toBeLessThan(errorBefore);
    },
  );

  it("valid disk round-trip keeps weights/P/momentum/error summary and resumes learning", async () => {
    const saved = await savedFixture();
    const bytes = readFileSync(saved.path, "utf8");
    const restored = fixture(true);
    writeFileSync(restored.path, bytes);
    expect(await restored.loop.restoreState()).toBe(true);
    expect(restored.learner.serialize()).toEqual(saved.learner.serialize());
    expect(restored.learner.predict(Float64Array.of(1))).toEqual(
      saved.learner.predict(Float64Array.of(1)),
    );
    restored.loop.start();
    const errorBefore = Math.abs(
      0.25 - restored.learner.predict(Float64Array.of(1))[0],
    );
    restored.loop.submitFeedback(feedback());
    expect(
      Math.abs(0.25 - restored.learner.predict(Float64Array.of(1))[0]),
    ).toBeLessThan(errorBefore);
    expect(restored.learner.serialize().pMatrix).not.toEqual(
      saved.learner.serialize().pMatrix,
    );
  });

  it.each(["weights", "pMatrix", "momentum", "cumulativeReward"])(
    "invalid internal %s cannot overwrite known-good bytes or emit persistence success",
    async (field) => {
      const { loop, learner, path, counts } = await savedFixture();
      const knownGood = readFileSync(path, "utf8");
      const countBefore = counts().persisted;
      // Fault injection only: production exposes copies and validates imports.
      const internal = learner as unknown as Record<
        string,
        Float64Array | number
      >;
      const original = internal[field];
      if (original instanceof Float64Array)
        internal[field] = Float64Array.of(NaN);
      else internal[field] = NaN;
      loop.start();
      await loop.stop();
      expect(readFileSync(path, "utf8")).toBe(knownGood);
      expect(counts().persisted).toBe(countBefore);
      internal[field] = original;
    },
  );

  it.each([
    { reservoirDim: NaN },
    { outputDim: 0 },
    { forgettingFactor: NaN },
    { batchIntervalMs: Infinity },
    { maxBufferSize: 0 },
    { minRewardMagnitude: NaN },
    { persistIntervalMs: 0 },
  ])(
    "rejects non-finite/invalid loop config before initialization: %j",
    (config) => {
      expect(() => new ReservoirFeedbackLoop(config)).toThrow(/configuration/);
    },
  );
});

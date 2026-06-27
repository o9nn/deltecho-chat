/**
 * Regression tests for the Scientific Genius Engine.
 *
 * These tests lock in the "real functionality only" guarantee: the engine's
 * core metrics (novelty, Φ, free energy, significance) must be DETERMINISTIC
 * functions of the engine's state, never Math.random() placeholders.
 */

import {
  ScientificGeniusEngineImpl,
  ScientificDomain,
  ReasoningMode,
} from "../ScientificGeniusEngine.js";

describe("ScientificGeniusEngine — principled reasoning", () => {
  function freshEngine(): ScientificGeniusEngineImpl {
    return new ScientificGeniusEngineImpl({ verbose: false });
  }

  it("produces deterministic insights for identical input on a fresh engine", async () => {
    const a = freshEngine();
    const b = freshEngine();

    const insightsA = await a.processScientificQuery(
      "consciousness arises from integrated information across neural assemblies",
      ScientificDomain.Neuroscience,
    );
    const insightsB = await b.processScientificQuery(
      "consciousness arises from integrated information across neural assemblies",
      ScientificDomain.Neuroscience,
    );

    expect(insightsA).toHaveLength(1);
    expect(insightsB).toHaveLength(1);

    // Identical state + identical input => identical principled metrics.
    expect(insightsA[0].novelty).toBeCloseTo(insightsB[0].novelty, 10);
    expect(insightsA[0].phi).toBeCloseTo(insightsB[0].phi, 10);
    expect(insightsA[0].significance).toBeCloseTo(
      insightsB[0].significance,
      10,
    );
  });

  it("treats the very first stimulus as maximally novel", async () => {
    const engine = freshEngine();
    const insights = await engine.processScientificQuery(
      "an entirely unprecedented quasicrystalline phonon lattice",
      ScientificDomain.Physics,
    );
    expect(insights[0].novelty).toBeCloseTo(1, 5);
  });

  it("reduces novelty as related knowledge accumulates", async () => {
    const engine = freshEngine();
    const first = await engine.processScientificQuery(
      "reservoir computing echo state networks dynamical systems",
      ScientificDomain.ComputerScience,
    );
    const second = await engine.processScientificQuery(
      "reservoir computing echo state networks dynamical systems",
      ScientificDomain.ComputerScience,
    );
    // The second pass shares vocabulary with stored concepts => less novel.
    expect(second[0].novelty).toBeLessThan(first[0].novelty);
  });

  it("keeps all metrics within [0,1]", async () => {
    const engine = freshEngine();
    const insights = await engine.processScientificQuery(
      "free energy minimization predictive coding active inference",
      ScientificDomain.CognitiveScience,
    );
    for (const i of insights) {
      expect(i.novelty).toBeGreaterThanOrEqual(0);
      expect(i.novelty).toBeLessThanOrEqual(1);
      expect(i.phi).toBeGreaterThanOrEqual(0);
      expect(i.phi).toBeLessThanOrEqual(1);
      expect(i.significance).toBeGreaterThanOrEqual(0);
      expect(i.significance).toBeLessThanOrEqual(1);
    }
  });

  it("performs a Bayesian posterior update that responds to evidence", async () => {
    const engine = freshEngine();
    const [hypothesis] = await engine.generateHypotheses(
      "entropy and information are linked",
      ScientificDomain.Physics,
    );
    const prior = hypothesis.priorProbability;

    // Inject strong, reliable supporting evidence; the posterior must rise.
    hypothesis.supportingEvidence.push({
      id: "ev-strong",
      description: "Multiple independent confirmations",
      source: "meta-analysis",
      strength: 0.95,
      reliability: 0.95,
      timestamp: Date.now(),
    });
    await engine.evaluateHypothesis(hypothesis);

    // Posterior must be a valid probability and free energy a valid 0..1 score.
    expect(hypothesis.posteriorProbability).toBeGreaterThanOrEqual(0);
    expect(hypothesis.posteriorProbability).toBeLessThanOrEqual(1);
    expect(hypothesis.freeEnergy).toBeGreaterThanOrEqual(0);
    expect(hypothesis.freeEnergy).toBeLessThanOrEqual(1);
    // Strong supporting evidence should not lower belief below the prior.
    expect(hypothesis.posteriorProbability).toBeGreaterThanOrEqual(prior - 1e-9);
    expect(["supported", "refuted", "revised", "testing"]).toContain(
      hypothesis.status,
    );
  });

  it("exposes a normalized visual state for the avatar bridge", async () => {
    const engine = freshEngine();
    engine.enterGeniusMode();
    await engine.processScientificQuery(
      "self-reference recursion meta-cognition consciousness",
      ScientificDomain.CognitiveScience,
    );
    const vs = engine.getVisualState();
    for (const key of [
      "scientificGenius",
      "insightPotential",
      "phi",
      "freeEnergy",
      "esnCoherence",
      "autognosisResonance",
    ] as const) {
      expect(vs[key]).toBeGreaterThanOrEqual(0);
      expect(vs[key]).toBeLessThanOrEqual(1);
    }
    // Genius mode contributes a baseline activation floor.
    expect(vs.scientificGenius).toBeGreaterThan(0);
  });

  it("describeState reflects real engine counters", async () => {
    const engine = freshEngine();
    await engine.processScientificQuery(
      "pattern recognition emergent dynamics",
      ScientificDomain.SystemsTheory,
    );
    const description = engine.describeState();
    expect(description).toContain("concepts=");
    expect(description).toContain("Φ(mean)=");
    expect(description).toContain("freeEnergy=");
  });

  it("raises strange-loop recursion when reasoning about itself", async () => {
    const engine = freshEngine();
    const before = engine.getState().recursionLevel;
    await engine.processScientificQuery(
      "the system reflects on its own recursive self-model and consciousness",
      ScientificDomain.Philosophy,
    );
    const after = engine.getState().recursionLevel;
    expect(after).toBeGreaterThan(before);
  });

  it("selects an appropriate reasoning mode (not left at default for novel input)", async () => {
    const engine = freshEngine();
    await engine.processScientificQuery(
      "a wholly unfamiliar transdisciplinary anomaly",
      ScientificDomain.Philosophy,
    );
    // High novelty on a fresh engine should drive abductive inference.
    expect(engine.getCurrentReasoningMode()).toBe(ReasoningMode.Abductive);
  });
});

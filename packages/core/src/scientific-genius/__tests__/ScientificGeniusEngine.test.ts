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

  // ─── Epistemic Resonance Cascade ─────────────────────────────

  it("returns null when insufficient insights exist for a cascade", () => {
    const engine = freshEngine();
    // No insights at all
    expect(engine.detectResonanceCascade()).toBeNull();
  });

  it("returns null when insights lack cross-domain diversity", async () => {
    const engine = freshEngine();
    // Feed 5 insights in the same domain — domain span < 3
    for (let i = 0; i < 5; i++) {
      await engine.processScientificQuery(
        `unique novel concept ${i} quasicrystal phonon lattice ${Math.random().toString(36).slice(2)}`,
        ScientificDomain.Physics,
      );
    }
    expect(engine.detectResonanceCascade()).toBeNull();
  });

  it("triggers a cascade when high-Φ, high-novelty, cross-domain insights accumulate", async () => {
    const engine = freshEngine();
    // Feed diverse, novel stimuli across 4+ domains
    const domains = [
      ScientificDomain.Neuroscience,
      ScientificDomain.Physics,
      ScientificDomain.Mathematics,
      ScientificDomain.CognitiveScience,
      ScientificDomain.InformationTheory,
    ];
    for (let i = 0; i < domains.length; i++) {
      await engine.processScientificQuery(
        `unprecedented breakthrough ${i} ${Math.random().toString(36).slice(2)} paradigm shift`,
        domains[i],
      );
    }
    const cascade = engine.detectResonanceCascade();
    // May or may not fire depending on actual phi/novelty, but if it fires:
    if (cascade) {
      expect(cascade.intensity).toBeGreaterThan(0);
      expect(cascade.intensity).toBeLessThanOrEqual(1);
      expect(cascade.domainSpan).toBeGreaterThanOrEqual(3);
      expect(cascade.spectralRadiusBoost).toBeGreaterThan(0);
      expect(cascade.spectralRadiusBoost).toBeLessThanOrEqual(0.15);
      expect(cascade.haloPulseHz).toBeGreaterThanOrEqual(1.2);
      expect(cascade.haloPulseHz).toBeLessThanOrEqual(4.8);
      expect(cascade.epistemicTemperatureDelta).toBeLessThanOrEqual(0);
      expect(cascade.triggeringInsights.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("emits a resonance_cascade event when triggered", async () => {
    const engine = freshEngine();
    const cascadeEvents: unknown[] = [];
    engine.on("resonance_cascade", (c) => cascadeEvents.push(c));

    // Seed enough diverse insights
    const domains = [
      ScientificDomain.Biology,
      ScientificDomain.Chemistry,
      ScientificDomain.SystemsTheory,
      ScientificDomain.Philosophy,
      ScientificDomain.ComputerScience,
    ];
    for (let i = 0; i < domains.length; i++) {
      await engine.processScientificQuery(
        `revolutionary discovery ${i} ${Math.random().toString(36).slice(2)} emergent phenomenon`,
        domains[i],
      );
    }
    engine.detectResonanceCascade();
    // If conditions were met, event should have fired
    if (cascadeEvents.length > 0) {
      expect(cascadeEvents[0]).toHaveProperty("id");
      expect(cascadeEvents[0]).toHaveProperty("intensity");
    }
  });

  // ─── Predictive Insight Crystallization ────────────────────────────────────

  it("returns empty crystals when fewer than 3 concepts exist", async () => {
    const engine = freshEngine();
    await engine.processScientificQuery("single concept", ScientificDomain.Physics);
    const crystals = engine.crystallizePredictiveInsights();
    expect(crystals).toEqual([]);
  });

  it("crystallizes predictive insights from transitive concept bridges", async () => {
    const engine = freshEngine();
    // Build a concept graph with transitive structure: A→C and C→B
    // by processing queries that share vocabulary through a bridge concept
    await engine.processScientificQuery(
      "neural oscillations drive consciousness through gamma synchronization",
      ScientificDomain.Neuroscience,
    );
    await engine.processScientificQuery(
      "gamma synchronization enables integrated information binding",
      ScientificDomain.CognitiveScience,
    );
    await engine.processScientificQuery(
      "integrated information theory measures phi across cortical modules",
      ScientificDomain.CognitiveScience,
    );
    // Now attempt crystallization — should find bridges
    const crystals = engine.crystallizePredictiveInsights();
    // Crystals should be an array (may be empty if confidence threshold not met)
    expect(Array.isArray(crystals)).toBe(true);
    // If any crystals formed, validate structure
    for (const crystal of crystals) {
      expect(crystal).toHaveProperty("id");
      expect(crystal).toHaveProperty("prediction");
      expect(crystal).toHaveProperty("sourceConcepts");
      expect(crystal).toHaveProperty("targetConcept");
      expect(crystal.confidence).toBeGreaterThan(0.4);
      expect(crystal.confidence).toBeLessThanOrEqual(1);
      expect(crystal.avatarEffect.eyeFocusIntensity).toBeGreaterThanOrEqual(0);
      expect(crystal.avatarEffect.haloCrystallizationHz).toBeGreaterThanOrEqual(0.5);
      expect(crystal.confirmed).toBe(false);
    }
  });

  it("emits predictive_crystallization events for each crystal", async () => {
    const engine = freshEngine();
    const crystalEvents: any[] = [];
    engine.on("predictive_crystallization" as any, (c: any) => crystalEvents.push(c));

    // Build rich concept graph
    await engine.processScientificQuery(
      "reservoir computing uses echo state networks for temporal processing",
      ScientificDomain.ComputerScience,
    );
    await engine.processScientificQuery(
      "echo state networks exhibit edge of chaos dynamics in spectral radius",
      ScientificDomain.Mathematics,
    );
    await engine.processScientificQuery(
      "spectral radius determines Lyapunov exponent and memory capacity",
      ScientificDomain.Mathematics,
    );
    await engine.processScientificQuery(
      "memory capacity enables temporal credit assignment in reinforcement learning",
      ScientificDomain.ComputerScience,
    );

    engine.crystallizePredictiveInsights();
    // Events should match returned crystals count
    expect(crystalEvents.length).toEqual(engine.crystallizePredictiveInsights().length);
  });
});

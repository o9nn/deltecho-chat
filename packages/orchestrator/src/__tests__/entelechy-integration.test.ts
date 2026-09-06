import { describe, expect, it } from "@jest/globals";

import { EntelechyIntegration } from "../entelechy-integration";

function createIntegration(): EntelechyIntegration {
  return new EntelechyIntegration({
    enableReservoir: true,
    enableEchoBeats: false,
    enableConsciousness: true,
    enableEntelechy: true,
    backgroundTickInterval: 1000,
    inputDim: 64,
  });
}

describe("EntelechyIntegration", () => {
  it("exposes bounded ESN autognosis visual telemetry for avatar consumers", () => {
    const integration = createIntegration();

    const visual = integration.getScientificGeniusVisualState();

    expect(visual.mode).toMatch(/^(Scientific Genius|Synthesis Phase|Idle)$/);
    for (const value of [
      visual.scientificGenius,
      visual.insightPotential,
      visual.entelechyScore,
      visual.freeEnergy,
      visual.daoConsensus,
      visual.esnCoherence,
      visual.autognosisResonance,
      visual.embodimentAccuracy,
      visual.embodimentError,
      visual.embodimentConfidence,
      visual.salience,
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }

    expect(visual.daoConsensus).toBeGreaterThan(0);
    expect(visual.esnCoherence).toBeGreaterThan(0);
    expect(visual.autognosisResonance).toBeGreaterThan(0);
  });

  it("starts embodiment autognosis neutral until rendered evidence arrives", () => {
    const integration = createIntegration();

    expect(integration.getEmbodimentAutognosis()).toEqual({
      accuracy: 0.5,
      meanError: 0,
      experienceCount: 0,
      confidence: 0,
      lastUpdatedAt: 0,
    });

    const visual = integration.getScientificGeniusVisualState();
    expect(visual.embodimentAccuracy).toBe(0.5);
    expect(visual.embodimentError).toBe(0);
    expect(visual.embodimentConfidence).toBe(0);
  });

  it("uses accumulated rendered-state evidence to ground autognosis and cognitive quorum", () => {
    const integration = createIntegration();
    const baseline = integration.getScientificGeniusVisualState();

    const update = integration.updateEmbodimentAutognosis({
      accuracy: 0.95,
      meanError: 0.025,
      experienceCount: 60,
      lastUpdatedAt: 1234,
    });
    const grounded = integration.getScientificGeniusVisualState();

    expect(update.confidence).toBeGreaterThan(0.99);
    expect(grounded.embodimentAccuracy).toBeCloseTo(0.95);
    expect(grounded.embodimentError).toBeCloseTo(0.025);
    expect(grounded.embodimentConfidence).toBeGreaterThan(0.99);
    expect(grounded.autognosisResonance).toBeGreaterThan(
      baseline.autognosisResonance,
    );
    expect(grounded.daoConsensus).toBeGreaterThan(baseline.daoConsensus);
  });

  it("clamps malformed embodiment telemetry and returns defensive copies", () => {
    const integration = createIntegration();
    const update = integration.updateEmbodimentAutognosis({
      accuracy: 2,
      meanError: Number.NaN,
      experienceCount: -4,
      confidence: -1,
      lastUpdatedAt: -10,
    });

    expect(update).toEqual({
      accuracy: 1,
      meanError: 0,
      experienceCount: 0,
      confidence: 0,
      lastUpdatedAt: 0,
    });

    update.accuracy = 0;
    expect(integration.getEmbodimentAutognosis().accuracy).toBe(1);
  });
});

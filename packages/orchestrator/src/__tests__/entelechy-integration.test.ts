import { describe, expect, it } from "@jest/globals";

import { EntelechyIntegration } from "../entelechy-integration";

describe("EntelechyIntegration", () => {
  it("exposes bounded ESN autognosis visual telemetry for avatar consumers", () => {
    const integration = new EntelechyIntegration({
      enableReservoir: true,
      enableEchoBeats: false,
      enableConsciousness: true,
      enableEntelechy: true,
      backgroundTickInterval: 1000,
      inputDim: 64,
    });

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
});

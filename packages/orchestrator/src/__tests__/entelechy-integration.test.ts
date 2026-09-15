import { describe, expect, it, jest } from "@jest/globals";

import { DeltEchoCoreSelfAuthority } from "deep-tree-echo-core";
import {
  EntelechyIntegration,
  RESONANCE_CASCADE_VISUAL_TTL_MS,
} from "../entelechy-integration";

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
    expect(visual.coreSelf).toEqual({
      initialized: false,
      ledgerHead: null,
      projectedStateDigest: "",
      acceptedEventCount: 0,
      pendingProposalCount: 0,
    });
  });

  it("anchors visual state and rendered embodiment proposals to the canonical ledger", () => {
    const integration = createIntegration();
    const authority = new DeltEchoCoreSelfAuthority();
    integration.attachCanonicalProposalSink(authority);
    const before = authority.getStatus();

    expect(integration.getScientificGeniusVisualState().coreSelf).toEqual({
      initialized: true,
      ledgerHead: before.ledgerHead,
      projectedStateDigest: before.projectedStateDigest,
      acceptedEventCount: 1,
      pendingProposalCount: 0,
    });

    const update = {
      accuracy: 0.91,
      meanError: 0.04,
      experienceCount: 7,
      cognitiveMode: "Scientific Genius",
      ledgerHead: before.ledgerHead,
      projectedStateDigest: before.projectedStateDigest,
      lastUpdatedAt: Date.parse("2026-09-12T12:00:00.000Z"),
    };
    integration.updateEmbodimentAutognosis(update);
    integration.updateEmbodimentAutognosis(update);

    const after = authority.getStatus();
    expect(after.ledgerHead).toBe(before.ledgerHead);
    expect(after.acceptedEventCount).toBe(1);
    expect(after.pendingProposalCount).toBe(1);
    expect(
      integration.getScientificGeniusVisualState().coreSelf
        .pendingProposalCount,
    ).toBe(1);
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

  it("transports a bounded resonance cascade through cached visual state", () => {
    const integration = createIntegration();
    const now = 12_345;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    try {
      integration.takeSnapshot();
      const accepted = integration.setResonanceCascade({
        id: "cascade-evidence-1",
        triggeringInsights: [],
        clusterPhi: 1.4,
        clusterNovelty: -0.2,
        domainSpan: 3.9,
        intensity: 2,
        spectralRadiusBoost: 0.9,
        haloPulseHz: 12,
        epistemicTemperatureDelta: -4,
        timestamp: now,
      });
      const visual = integration.getScientificGeniusVisualState();

      expect(accepted).toEqual({
        id: "cascade-evidence-1",
        timestamp: now,
        intensity: 1,
        clusterPhi: 1,
        clusterNovelty: 0,
        domainSpan: 3,
        haloPulseHz: 10,
        spectralRadiusBoost: 0.5,
        epistemicTemperatureDelta: -1,
      });
      expect(visual.resonanceCascade).toEqual(accepted);

      visual.resonanceCascade!.intensity = 0;
      expect(
        integration.getScientificGeniusVisualState().resonanceCascade
          ?.intensity,
      ).toBe(1);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("expires a resonance cascade before stale snapshots can replay it", () => {
    const integration = createIntegration();
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(20_000);

    try {
      integration.setResonanceCascade({
        id: "cascade-expiring",
        triggeringInsights: [],
        clusterPhi: 0.8,
        clusterNovelty: 0.7,
        domainSpan: 4,
        intensity: 0.75,
        spectralRadiusBoost: 0.1,
        haloPulseHz: 3.9,
        epistemicTemperatureDelta: -0.3,
        timestamp: 20_000,
      });
      integration.takeSnapshot();
      expect(
        integration.getScientificGeniusVisualState().resonanceCascade?.id,
      ).toBe("cascade-expiring");

      nowSpy.mockReturnValue(20_000 + RESONANCE_CASCADE_VISUAL_TTL_MS + 1);
      expect(
        integration.getScientificGeniusVisualState().resonanceCascade,
      ).toBeUndefined();
    } finally {
      nowSpy.mockRestore();
    }
  });
});

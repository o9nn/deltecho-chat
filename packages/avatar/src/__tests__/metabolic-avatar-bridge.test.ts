/**
 * Tests for MetabolicAvatarBridge
 *
 * Validates:
 * - Phase-specific avatar parameter profiles
 * - Energy level → vitality mapping
 * - Anabolic balance → expression warmth
 * - Energy crisis → stress indicators
 * - Myelination → movement fluidity
 * - Knowledge density → gaze focus
 * - Smooth transitions between states
 */
import {
  MetabolicAvatarBridge,
  DEFAULT_METABOLIC_AVATAR_CONFIG,
  type MetabolicVisualInput,
} from "../metabolic-avatar-bridge";

describe("MetabolicAvatarBridge", () => {
  let bridge: MetabolicAvatarBridge;

  beforeEach(() => {
    bridge = new MetabolicAvatarBridge({ tickRateHz: 60 });
  });

  afterEach(() => {
    bridge.stop();
  });

  describe("Lifecycle", () => {
    it("should start and stop cleanly", () => {
      expect(bridge.isRunning()).toBe(false);
      bridge.start();
      expect(bridge.isRunning()).toBe(true);
      bridge.stop();
      expect(bridge.isRunning()).toBe(false);
    });

    it("should return neutral deltas initially", () => {
      const deltas = bridge.getDeltas();
      expect(deltas.vitalityMult).toBe(1.0);
      expect(deltas.eyeOpenDelta).toBe(0);
      expect(deltas.breathRateMult).toBe(1.0);
      expect(deltas.mouthFormDelta).toBe(0);
      expect(deltas.crisisActive).toBe(false);
    });
  });

  describe("Phase Profiles", () => {
    it("should produce wider eyes in active phase", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 1.0,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.eyeOpenDelta).toBeGreaterThan(0);
      expect(target.animSpeedMult).toBeGreaterThan(1.0);
    });

    it("should produce narrower eyes in resting phase", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "resting",
        energyLevel: 0.8,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.eyeOpenDelta).toBeLessThan(0);
      expect(target.animSpeedMult).toBeLessThan(1.0);
    });

    it("should produce head tilt in integrating phase", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "integrating",
        energyLevel: 0.9,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.headTiltDelta).not.toBe(0);
    });

    it("should produce deeper breathing in consolidating phase", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "consolidating",
        energyLevel: 0.7,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.breathDepthMult).toBeGreaterThan(1.0);
      expect(target.breathRateMult).toBeLessThan(1.0);
    });
  });

  describe("Energy Level → Vitality", () => {
    it("should produce high vitality at full energy", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 1.0,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0,
        knowledgeDensity: 0,
      });
      const target = bridge.getTargetDeltas();
      expect(target.vitalityMult).toBeGreaterThan(1.0);
    });

    it("should produce low vitality at low energy", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.1,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0,
        knowledgeDensity: 0,
      });
      const target = bridge.getTargetDeltas();
      expect(target.vitalityMult).toBeLessThan(0.7);
    });
  });

  describe("Anabolic Balance → Expression", () => {
    it("should produce smile when anabolic (building)", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.8,
        anabolicBalance: 0.8,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.mouthFormDelta).toBeGreaterThan(0);
    });

    it("should produce furrow when catabolic (pruning)", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.8,
        anabolicBalance: -0.7,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.browDelta).toBeLessThan(0);
      expect(target.mouthFormDelta).toBeLessThan(0);
    });
  });

  describe("Energy Crisis", () => {
    it("should activate crisis indicators", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.05,
        anabolicBalance: -0.5,
        isEnergyCrisis: true,
        myelinationProgress: 0.2,
        knowledgeDensity: 1,
      });
      const target = bridge.getTargetDeltas();
      expect(target.crisisActive).toBe(true);
      expect(target.pupilDelta).toBeLessThan(0); // Pupil constriction
      expect(target.breathRateMult).toBeGreaterThan(1.5); // Rapid breathing
    });

    it("should not show crisis when disabled", () => {
      const noCrisis = new MetabolicAvatarBridge({ showCrisis: false });
      noCrisis.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.05,
        anabolicBalance: -0.5,
        isEnergyCrisis: true,
        myelinationProgress: 0,
        knowledgeDensity: 0,
      });
      const target = noCrisis.getTargetDeltas();
      expect(target.crisisActive).toBe(false);
    });
  });

  describe("Myelination → Fluidity", () => {
    it("should produce low fluidity with no myelination", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.8,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.movementFluidity).toBeLessThan(0.5);
    });

    it("should produce high fluidity with full myelination", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.8,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 1.0,
        knowledgeDensity: 2,
      });
      const target = bridge.getTargetDeltas();
      expect(target.movementFluidity).toBeGreaterThan(0.8);
    });
  });

  describe("Knowledge Density → Gaze", () => {
    it("should produce focused gaze with dense knowledge", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.8,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 5,
      });
      const target = bridge.getTargetDeltas();
      expect(target.gazeFocus).toBeGreaterThan(0.6);
    });

    it("should produce unfocused gaze with sparse knowledge", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 0.8,
        anabolicBalance: 0,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 0,
      });
      const target = bridge.getTargetDeltas();
      expect(target.gazeFocus).toBeLessThan(0.5);
    });
  });

  describe("Smoothing", () => {
    it("should smoothly transition between states", () => {
      bridge.start();
      bridge.feedMetabolicState({
        metabolicPhase: "active",
        energyLevel: 1.0,
        anabolicBalance: 0.8,
        isEnergyCrisis: false,
        myelinationProgress: 0.5,
        knowledgeDensity: 3,
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const deltas = bridge.getDeltas();
          // Should be moving toward target but not there yet
          expect(deltas.mouthFormDelta).toBeGreaterThan(0);
          expect(deltas.vitalityMult).toBeGreaterThan(1.0);
          resolve();
        }, 100);
      });
    });
  });

  describe("Configuration", () => {
    it("should accept config overrides", () => {
      const custom = new MetabolicAvatarBridge({ influence: 0.3, smoothing: 0.5 });
      expect(custom.getConfig().influence).toBe(0.3);
      expect(custom.getConfig().smoothing).toBe(0.5);
    });

    it("should allow runtime config updates", () => {
      bridge.updateConfig({ influence: 0.9 });
      expect(bridge.getConfig().influence).toBe(0.9);
    });
  });

  describe("Reset", () => {
    it("should reset to neutral state", () => {
      bridge.feedMetabolicState({
        metabolicPhase: "resting",
        energyLevel: 0.1,
        anabolicBalance: -0.8,
        isEnergyCrisis: true,
        myelinationProgress: 0.9,
        knowledgeDensity: 5,
      });
      bridge.reset();
      const deltas = bridge.getDeltas();
      expect(deltas.vitalityMult).toBe(1.0);
      expect(deltas.crisisActive).toBe(false);
      expect(deltas.mouthFormDelta).toBe(0);
    });
  });
});

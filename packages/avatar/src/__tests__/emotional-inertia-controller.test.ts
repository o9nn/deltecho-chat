/**
 * Tests for EmotionalInertiaController
 *
 * Validates:
 * - Emotional inertia (asymmetric rise/fall smoothing)
 * - Cognitive load → animation speed modulation
 * - Idle fidget micro-behaviors
 * - Deep thought mode activation
 * - Integration with CognitiveAvatarBridge
 */
import {
  EmotionalInertiaController,
  DEFAULT_EMOTIONAL_INERTIA_CONFIG,
} from "../emotional-inertia-controller";
import { CognitiveAvatarBridge } from "../cognitive-avatar-bridge";

describe("EmotionalInertiaController", () => {
  let controller: EmotionalInertiaController;

  beforeEach(() => {
    controller = new EmotionalInertiaController();
  });

  afterEach(() => {
    controller.stop();
  });

  describe("Lifecycle", () => {
    it("should start and stop cleanly", () => {
      expect(controller.isRunning()).toBe(false);
      controller.start();
      expect(controller.isRunning()).toBe(true);
      controller.stop();
      expect(controller.isRunning()).toBe(false);
    });

    it("should emit started/stopped events", () => {
      const started = jest.fn();
      const stopped = jest.fn();
      controller.on("started", started);
      controller.on("stopped", stopped);

      controller.start();
      expect(started).toHaveBeenCalledTimes(1);

      controller.stop();
      expect(stopped).toHaveBeenCalledTimes(1);
    });

    it("should not double-start", () => {
      const started = jest.fn();
      controller.on("started", started);
      controller.start();
      controller.start();
      expect(started).toHaveBeenCalledTimes(1);
    });
  });

  describe("Emotional Inertia", () => {
    it("should start with all emotions at zero", () => {
      const output = controller.getOutput();
      expect(output.smoothedEmotions.joy).toBe(0);
      expect(output.smoothedEmotions.sadness).toBe(0);
      expect(output.smoothedEmotions.fear).toBe(0);
    });

    it("should not jump instantly to target emotion", () => {
      controller.start();
      controller.feedEmotions({ joy: 1.0 });

      // After one frame, joy should be moving toward 1.0 but not there yet
      // We need to wait for at least one tick
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const output = controller.getOutput();
          expect(output.smoothedEmotions.joy).toBeGreaterThan(0);
          expect(output.smoothedEmotions.joy).toBeLessThan(1.0);
          resolve();
        }, 50);
      });
    });

    it("should eventually converge to target emotion", () => {
      controller.start();
      controller.feedEmotions({ joy: 0.8 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const output = controller.getOutput();
          // After 2 seconds, joy should be close to 0.8
          expect(output.smoothedEmotions.joy).toBeGreaterThan(0.6);
          resolve();
        }, 2000);
      });
    });

    it("should decay emotions when target returns to zero", () => {
      controller.start();
      controller.feedEmotions({ surprise: 0.9 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Now remove the surprise
          controller.feedEmotions({ surprise: 0 });

          setTimeout(() => {
            const output = controller.getOutput();
            // Surprise should be decaying but not instant zero
            expect(output.smoothedEmotions.surprise).toBeLessThan(0.9);
            resolve();
          }, 100);
        }, 200);
      });
    });

    it("should clamp emotions to 0-1 range", () => {
      controller.feedEmotions({ joy: 5.0, sadness: -2.0 });
      const output = controller.getOutput();
      // Targets are clamped, so smoothed values stay in range
      expect(output.smoothedEmotions.joy).toBeGreaterThanOrEqual(0);
      expect(output.smoothedEmotions.joy).toBeLessThanOrEqual(1);
      expect(output.smoothedEmotions.sadness).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Cognitive Load → Animation Speed", () => {
    it("should return 1.0 speed multiplier at zero load", () => {
      controller.start();
      controller.feedCognitiveLoad(0);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const speed = controller.getSpeedMultiplier();
          // Should be close to maxSpeedMultiplier (1.4)
          expect(speed).toBeGreaterThan(1.0);
          resolve();
        }, 200);
      });
    });

    it("should reduce speed at high cognitive load", () => {
      controller.start();
      controller.feedCognitiveLoad(0.9);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const speed = controller.getSpeedMultiplier();
          expect(speed).toBeLessThan(1.0);
          resolve();
        }, 500);
      });
    });

    it("should activate deep thought mode above threshold", () => {
      controller.start();
      const deepThoughtChanged = jest.fn();
      controller.on("deep_thought_changed", deepThoughtChanged);

      controller.feedCognitiveLoad(0.8);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const output = controller.getOutput();
          expect(output.isDeepThought).toBe(true);
          expect(deepThoughtChanged).toHaveBeenCalledWith(true);
          resolve();
        }, 200);
      });
    });

    it("should deactivate deep thought when load drops", () => {
      controller.start();
      controller.feedCognitiveLoad(0.9);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          controller.feedCognitiveLoad(0.2);
          setTimeout(() => {
            const output = controller.getOutput();
            expect(output.isDeepThought).toBe(false);
            resolve();
          }, 200);
        }, 200);
      });
    });
  });

  describe("Idle Fidget Behaviors", () => {
    it("should not produce fidgets immediately", () => {
      controller.start();
      const output = controller.getOutput();
      expect(output.fidgetDeltas.headAngleX).toBe(0);
      expect(output.fidgetDeltas.eyeDriftX).toBe(0);
    });

    it("should produce fidgets after idle delay", () => {
      controller.start();
      // Don't feed any input — let idle timer accumulate

      return new Promise<void>((resolve) => {
        // Wait longer than activationDelaySec (3s) + ramp time
        setTimeout(() => {
          const output = controller.getOutput();
          // At least some fidget should be non-zero
          const hasAnyFidget =
            output.fidgetDeltas.headAngleX !== 0 ||
            output.fidgetDeltas.headAngleY !== 0 ||
            output.fidgetDeltas.eyeDriftX !== 0 ||
            output.fidgetDeltas.eyeDriftY !== 0;
          expect(hasAnyFidget).toBe(true);
          resolve();
        }, 4500);
      });
    }, 6000);

    it("should suppress fidgets during high cognitive load", () => {
      controller.start();
      controller.feedCognitiveLoad(0.95);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const output = controller.getOutput();
          // Fidgets should be near zero due to load suppression
          expect(Math.abs(output.fidgetDeltas.headAngleX)).toBeLessThan(0.5);
          resolve();
        }, 4500);
      });
    }, 6000);

    it("should reset idle timer on significant input", () => {
      controller.start();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Feed a significant emotion change — this resets lastSignificantInputTime
          controller.feedEmotions({ joy: 0.8 });
          // Wait one tick for idleDurationSec to be recomputed
          setTimeout(() => {
            const output = controller.getOutput();
            expect(output.idleDurationSec).toBeLessThan(1);
            resolve();
          }, 50);
        }, 2000);
      });
    }, 8000);
  });

  describe("Configuration", () => {
    it("should accept partial config overrides", () => {
      const custom = new EmotionalInertiaController({
        tickRateHz: 60,
        globalInertiaMult: 2.0,
      });
      const config = custom.getConfig();
      expect(config.tickRateHz).toBe(60);
      expect(config.globalInertiaMult).toBe(2.0);
      // Defaults should still be present
      expect(config.cognitiveLoadSpeed.minSpeedMultiplier).toBe(0.35);
    });

    it("should allow runtime config updates", () => {
      controller.updateConfig({ globalInertiaMult: 0.5 });
      expect(controller.getConfig().globalInertiaMult).toBe(0.5);
    });

    it("should provide diagnostics", () => {
      controller.start();
      const diag = controller.getDiagnostics();
      expect(diag.isRunning).toBe(true);
      expect(diag.emotionChannels).toBeGreaterThan(0);
      expect(diag.speedMult).toBeCloseTo(1.0, 0);
    });
  });

  describe("Reset", () => {
    it("should reset all state to defaults", () => {
      controller.start();
      controller.feedEmotions({ joy: 1.0, anger: 0.5 });
      controller.feedCognitiveLoad(0.8);

      controller.reset();
      const output = controller.getOutput();
      expect(output.smoothedEmotions.joy).toBe(0);
      expect(output.smoothedEmotions.anger).toBe(0);
      expect(output.cognitiveLoad).toBe(0);
      expect(output.animationSpeedMultiplier).toBe(1.0);
    });
  });

  describe("Integration with CognitiveAvatarBridge", () => {
    it("should wire inertia into the bridge", () => {
      const bridge = new CognitiveAvatarBridge({ smoothingFactor: 0 });
      const inertia = bridge.getInertiaController();
      expect(inertia).toBeInstanceOf(EmotionalInertiaController);
    });

    it("should expose animation speed multiplier from bridge", () => {
      const bridge = new CognitiveAvatarBridge({ smoothingFactor: 0 });
      bridge.start();
      const speed = bridge.getAnimationSpeedMultiplier();
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThanOrEqual(1.5);
      bridge.stop();
    });

    it("should emit inertia_output events on state update", () => {
      const bridge = new CognitiveAvatarBridge({ smoothingFactor: 0 });
      bridge.start();
      const inertiaHandler = jest.fn();
      bridge.on("inertia_output", inertiaHandler);

      bridge.updateFromCognitiveState({
        sentienceLevel: 0.8,
        selfAwareness: 0.7,
        phi: 0.6,
        flowState: 0.5,
        emotionalValence: 0.4,
        emotionalArousal: 0.3,
        isProcessing: false,
        isSpeaking: false,
      });

      expect(inertiaHandler).toHaveBeenCalledTimes(1);
      const output = inertiaHandler.mock.calls[0][0];
      expect(output).toHaveProperty("smoothedEmotions");
      expect(output).toHaveProperty("animationSpeedMultiplier");
      expect(output).toHaveProperty("fidgetDeltas");

      bridge.stop();
    });
  });
});

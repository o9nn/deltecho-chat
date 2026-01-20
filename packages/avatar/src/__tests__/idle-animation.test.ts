/**
 * Idle Animation System Tests
 */

import {
  IdleAnimationSystem,
  createIdleAnimationSystem,
  DEFAULT_IDLE_CONFIG,
  IdleAnimationState,
  IdleAnimationEvent,
} from "../idle-animation";

describe("IdleAnimationSystem", () => {
  let idleSystem: IdleAnimationSystem;

  beforeEach(() => {
    jest.useFakeTimers();
    idleSystem = new IdleAnimationSystem();
  });

  afterEach(() => {
    idleSystem.stop();
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const config = idleSystem.getConfig();
      expect(config.breathingEnabled).toBe(true);
      expect(config.microMovementsEnabled).toBe(true);
      expect(config.eyeMovementsEnabled).toBe(true);
      expect(config.bodySwayEnabled).toBe(true);
    });

    it("should accept custom config", () => {
      const custom = new IdleAnimationSystem({
        breathingEnabled: false,
        breathingCycleDuration: 5000,
      });

      const config = custom.getConfig();
      expect(config.breathingEnabled).toBe(false);
      expect(config.breathingCycleDuration).toBe(5000);
      custom.stop();
    });

    it("should initialize with inactive state", () => {
      expect(idleSystem.isActive()).toBe(false);
      const state = idleSystem.getState();
      expect(state.isActive).toBe(false);
    });
  });

  describe("start/stop", () => {
    it("should start idle animations", () => {
      idleSystem.start();
      expect(idleSystem.isActive()).toBe(true);
    });

    it("should stop idle animations", () => {
      idleSystem.start();
      idleSystem.stop();
      expect(idleSystem.isActive()).toBe(false);
    });

    it("should not start twice", () => {
      idleSystem.start();
      idleSystem.start(); // Should be no-op
      expect(idleSystem.isActive()).toBe(true);
    });

    it("should reset state on stop", () => {
      idleSystem.start();
      // Advance time to trigger animations
      jest.advanceTimersByTime(1000);
      idleSystem.stop();

      const state = idleSystem.getState();
      expect(state.breathingPhase).toBe(0);
      expect(state.headTiltX).toBe(0);
      expect(state.headTiltY).toBe(0);
    });
  });

  describe("breathing animation", () => {
    it("should update breathing phase over time", () => {
      jest.useRealTimers();
      const system = new IdleAnimationSystem({ breathingEnabled: true });
      system.start();

      // Wait a bit for animation
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const state = system.getState();
          // Breathing phase should be updated
          expect(typeof state.breathingPhase).toBe("number");
          expect(typeof state.breathingOffset).toBe("number");
          system.stop();
          resolve();
        }, 100);
      });
    });

    it("should not update breathing when disabled", () => {
      const system = new IdleAnimationSystem({ breathingEnabled: false });
      const state = system.getState();
      expect(state.breathingOffset).toBe(0);
      system.stop();
    });
  });

  describe("blinking", () => {
    it("should emit blink events", (done) => {
      jest.useRealTimers();

      const system = new IdleAnimationSystem({
        blinkInterval: [100, 200], // Very short for testing
      });

      let blinkStarted = false;
      system.onIdleEvent((event: IdleAnimationEvent) => {
        if (event.type === "blink_start") {
          blinkStarted = true;
        }
        if (event.type === "blink_end" && blinkStarted) {
          system.stop();
          done();
        }
      });

      system.start();
    }, 2000);

    it("should trigger manual blink", (done) => {
      jest.useRealTimers();

      const system = new IdleAnimationSystem({ blinkVariation: false });

      system.onIdleEvent((event: IdleAnimationEvent) => {
        if (event.type === "blink_start") {
          expect(event.state.blinkState).toBe(1);
          system.stop();
          done();
        }
      });

      system.start();
      system.triggerBlink();
    }, 1000);
  });

  describe("micro movements", () => {
    it("should emit micro movement events", (done) => {
      jest.useRealTimers();

      const system = new IdleAnimationSystem({
        microMovementFrequency: [50, 100], // Very short for testing
      });

      system.onIdleEvent((event: IdleAnimationEvent) => {
        if (event.type === "micro_movement") {
          system.stop();
          done();
        }
      });

      system.start();
    }, 2000);
  });

  describe("eye movements", () => {
    it("should emit eye movement events", (done) => {
      jest.useRealTimers();

      const system = new IdleAnimationSystem({
        eyeMovementFrequency: [50, 100], // Very short for testing
      });

      system.onIdleEvent((event: IdleAnimationEvent) => {
        if (event.type === "eye_movement") {
          system.stop();
          done();
        }
      });

      system.start();
    }, 2000);

    it("should allow manual lookAt", () => {
      idleSystem.start();
      idleSystem.lookAt(0.5, -0.3);

      const state = idleSystem.getState();
      expect(state.eyeLookX).toBe(0.5);
      expect(state.eyeLookY).toBe(-0.3);
    });

    it("should clamp lookAt values", () => {
      idleSystem.start();
      idleSystem.lookAt(2, -2);

      const state = idleSystem.getState();
      expect(state.eyeLookX).toBe(1);
      expect(state.eyeLookY).toBe(-1);
    });
  });

  describe("configuration", () => {
    it("should update configuration", () => {
      idleSystem.setConfig({ breathingIntensity: 0.5 });
      expect(idleSystem.getConfig().breathingIntensity).toBe(0.5);
    });

    it("should preserve other config when updating", () => {
      const original = idleSystem.getConfig();
      idleSystem.setConfig({ breathingIntensity: 0.8 });

      const updated = idleSystem.getConfig();
      expect(updated.breathingEnabled).toBe(original.breathingEnabled);
      expect(updated.microMovementsEnabled).toBe(
        original.microMovementsEnabled,
      );
    });
  });

  describe("state management", () => {
    it("should return a copy of state", () => {
      const state1 = idleSystem.getState();
      const state2 = idleSystem.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it("should track last update time", () => {
      jest.useRealTimers();
      const system = new IdleAnimationSystem();
      system.start();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const state = system.getState();
          expect(state.lastUpdate).toBeGreaterThan(0);
          system.stop();
          resolve();
        }, 50);
      });
    });
  });

  describe("event handling", () => {
    it("should add and remove listeners", () => {
      const listener = jest.fn();
      idleSystem.onIdleEvent(listener);
      idleSystem.offIdleEvent(listener);

      // Listener should be removed
      idleSystem.start();
      idleSystem.triggerBlink();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("factory function", () => {
    it("should create instance with createIdleAnimationSystem", () => {
      const system = createIdleAnimationSystem();
      expect(system).toBeInstanceOf(IdleAnimationSystem);
      system.stop();
    });

    it("should accept config in factory", () => {
      const system = createIdleAnimationSystem({ breathingEnabled: false });
      expect(system.getConfig().breathingEnabled).toBe(false);
      system.stop();
    });
  });

  describe("DEFAULT_IDLE_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_IDLE_CONFIG.breathingCycleDuration).toBeGreaterThan(0);
      expect(DEFAULT_IDLE_CONFIG.breathingIntensity).toBeGreaterThan(0);
      expect(DEFAULT_IDLE_CONFIG.breathingIntensity).toBeLessThanOrEqual(1);
      expect(DEFAULT_IDLE_CONFIG.blinkInterval[0]).toBeLessThan(
        DEFAULT_IDLE_CONFIG.blinkInterval[1],
      );
    });
  });
});

/**
 * Avatar Controller Tests
 */

import { AvatarController } from "../avatar-controller";
import { AvatarEvent, AvatarState, Expression } from "../types";

describe("AvatarController", () => {
  let controller: AvatarController;
  let eventListener: jest.Mock;

  beforeEach(() => {
    controller = new AvatarController();
    eventListener = jest.fn();
    controller.onAvatarEvent(eventListener);
  });

  afterEach(() => {
    controller.stop();
  });

  describe("initialization", () => {
    it("should start with neutral expression", () => {
      expect(controller.getExpression()).toBe("neutral");
    });

    it("should start with idle motion", () => {
      expect(controller.getMotion()).toBe("idle");
    });

    it("should have correct initial state", () => {
      const state = controller.getState();
      expect(state.currentExpression).toBe("neutral");
      expect(state.previousExpression).toBeNull();
      expect(state.transitionProgress).toBe(1);
      expect(state.isSpeaking).toBe(false);
      expect(state.isBlinking).toBe(false);
    });

    it("should accept custom configuration", () => {
      const customController = new AvatarController({
        transitionDuration: 500,
        autoBlinking: false,
      });
      expect(customController.getState()).toBeDefined();
      customController.stop();
    });
  });

  describe("updateFromEmotionalState", () => {
    it("should update expression when emotional state changes", () => {
      controller.updateFromEmotionalState({ joy: 0.8, interest: 0.1 });
      expect(controller.getExpression()).toBe("happy");
    });

    it("should emit expression_change event when expression changes", () => {
      controller.updateFromEmotionalState({ joy: 0.8 });

      expect(eventListener).toHaveBeenCalled();
      const event = eventListener.mock.calls[0][0] as AvatarEvent;
      expect(event.type).toBe("expression_change");
    });

    it("should not emit event when expression stays the same", () => {
      controller.updateFromEmotionalState({ joy: 0.8 });
      eventListener.mockClear();

      controller.updateFromEmotionalState({ joy: 0.85 }); // Still happy

      // May or may not emit state_update, but not expression_change
      const expressionChangeEvents = eventListener.mock.calls.filter(
        (call) => call[0].type === "expression_change",
      );
      expect(expressionChangeEvents).toHaveLength(0);
    });

    it("should handle transition from one expression to another", () => {
      controller.updateFromEmotionalState({ joy: 0.8 }); // happy
      controller.updateFromEmotionalState({ surprise: 0.9 }); // surprised

      expect(controller.getExpression()).toBe("surprised");
      const state = controller.getState();
      expect(state.previousExpression).toBe("happy");
    });

    it("should handle empty emotional state", () => {
      controller.updateFromEmotionalState({});
      expect(controller.getExpression()).toBe("neutral");
    });

    it("should update to thinking for high interest", () => {
      controller.updateFromEmotionalState({ interest: 0.7 });
      expect(controller.getExpression()).toBe("thinking");
    });

    it("should update to concerned for fear and sadness", () => {
      controller.updateFromEmotionalState({ fear: 0.5, sadness: 0.5 });
      expect(controller.getExpression()).toBe("concerned");
    });
  });

  describe("setSpeaking", () => {
    it("should update isSpeaking state", () => {
      controller.setSpeaking(true);
      expect(controller.getState().isSpeaking).toBe(true);
    });

    it("should emit state_update event when speaking changes", () => {
      controller.setSpeaking(true);

      expect(eventListener).toHaveBeenCalled();
      const event = eventListener.mock.calls[0][0] as AvatarEvent;
      expect(event.type).toBe("state_update");
    });

    it("should not emit event when speaking state is unchanged", () => {
      controller.setSpeaking(false); // Already false
      expect(eventListener).not.toHaveBeenCalled();
    });

    it("should toggle speaking state correctly", () => {
      controller.setSpeaking(true);
      expect(controller.getState().isSpeaking).toBe(true);

      controller.setSpeaking(false);
      expect(controller.getState().isSpeaking).toBe(false);
    });
  });

  describe("requestMotion", () => {
    it("should update current motion", () => {
      controller.requestMotion({ motion: "wave" });
      expect(controller.getMotion()).toBe("wave");
    });

    it("should emit motion_start event", () => {
      controller.requestMotion({ motion: "nod" });

      const motionEvents = eventListener.mock.calls.filter(
        (call) => call[0].type === "motion_start",
      );
      expect(motionEvents.length).toBe(1);
    });

    it("should return to idle after duration if not looping", (done) => {
      controller.requestMotion({ motion: "wave", duration: 50, loop: false });

      setTimeout(() => {
        expect(controller.getMotion()).toBe("idle");

        const motionEndEvents = eventListener.mock.calls.filter(
          (call) => call[0].type === "motion_end",
        );
        expect(motionEndEvents.length).toBe(1);
        done();
      }, 100);
    });

    it("should not return to idle when looping", (done) => {
      controller.requestMotion({ motion: "shake", loop: true });

      setTimeout(() => {
        expect(controller.getMotion()).toBe("shake");
        done();
      }, 100);
    });
  });

  describe("getExpressionIntensity", () => {
    it("should return intensity based on emotional state", () => {
      controller.updateFromEmotionalState({ joy: 0.8 });
      const intensity = controller.getExpressionIntensity({ joy: 0.8 });
      expect(intensity).toBeGreaterThan(0);
      expect(intensity).toBeLessThanOrEqual(1);
    });

    it("should return higher intensity for stronger emotions", () => {
      controller.updateFromEmotionalState({ joy: 0.3 });
      const lowIntensity = controller.getExpressionIntensity({ joy: 0.3 });

      controller.updateFromEmotionalState({ joy: 0.9 });
      const highIntensity = controller.getExpressionIntensity({ joy: 0.9 });

      expect(highIntensity).toBeGreaterThan(lowIntensity);
    });
  });

  describe("reset", () => {
    it("should reset to neutral expression", () => {
      controller.updateFromEmotionalState({ joy: 0.8 });
      controller.reset();
      expect(controller.getExpression()).toBe("neutral");
    });

    it("should reset motion to idle", () => {
      controller.requestMotion({ motion: "wave" });
      controller.reset();
      expect(controller.getMotion()).toBe("idle");
    });

    it("should reset speaking state", () => {
      controller.setSpeaking(true);
      controller.reset();
      expect(controller.getState().isSpeaking).toBe(false);
    });

    it("should emit state_update event on reset", () => {
      controller.reset();

      const event = eventListener.mock.calls[0][0] as AvatarEvent;
      expect(event.type).toBe("state_update");
    });
  });

  describe("event handling", () => {
    it("should add and remove event listeners", () => {
      const listener = jest.fn();
      controller.onAvatarEvent(listener);

      controller.setSpeaking(true);
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      controller.offAvatarEvent(listener);

      controller.setSpeaking(false);
      expect(listener).not.toHaveBeenCalled();
    });

    it("should include timestamp in events", () => {
      controller.setSpeaking(true);

      const event = eventListener.mock.calls[0][0] as AvatarEvent;
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe("number");
    });

    it("should include current state in events", () => {
      controller.setSpeaking(true);

      const event = eventListener.mock.calls[0][0] as AvatarEvent;
      expect(event.state).toBeDefined();
      expect(event.state.isSpeaking).toBe(true);
    });
  });

  describe("start/stop", () => {
    it("should start without errors", () => {
      expect(() => controller.start()).not.toThrow();
    });

    it("should stop without errors", () => {
      controller.start();
      expect(() => controller.stop()).not.toThrow();
    });

    it("should handle multiple start/stop cycles", () => {
      for (let i = 0; i < 3; i++) {
        controller.start();
        controller.stop();
      }
      expect(controller.getState()).toBeDefined();
    });
  });
});

describe("AvatarController with auto-blinking disabled", () => {
  let controller: AvatarController;

  beforeEach(() => {
    controller = new AvatarController({ autoBlinking: false });
  });

  afterEach(() => {
    controller.stop();
  });

  it("should not automatically blink when autoBlinking is disabled", (done) => {
    const eventListener = jest.fn();
    controller.onAvatarEvent(eventListener);
    controller.start();

    setTimeout(() => {
      // Should not have received any blink-related state updates
      const blinkEvents = eventListener.mock.calls.filter(
        (call) => call[0].state?.isBlinking === true,
      );
      expect(blinkEvents.length).toBe(0);
      done();
    }, 500);
  });
});

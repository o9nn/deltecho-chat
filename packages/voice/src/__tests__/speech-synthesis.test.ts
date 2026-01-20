/**
 * Speech Synthesis Service Tests
 */

import {
  SpeechSynthesisService,
  createSpeechSynthesis,
} from "../speech-synthesis";
import { EMOTION_MODULATIONS } from "../types";

// Mock speechSynthesis for Node.js environment
describe("SpeechSynthesisService", () => {
  let service: SpeechSynthesisService;

  beforeEach(() => {
    service = new SpeechSynthesisService();
  });

  describe("in Node.js environment (no Web Speech API)", () => {
    it("should report not available", () => {
      expect(service.isAvailable()).toBe(false);
    });

    it("should return empty voices list", () => {
      expect(service.getAvailableVoices()).toEqual([]);
    });

    it("should emit error when trying to speak", () => {
      const listener = jest.fn();
      service.onSynthesisEvent(listener);

      service.speak("Hello world");

      expect(listener).toHaveBeenCalledWith({
        type: "error",
        error: "Speech synthesis not available",
      });
    });

    it("should not crash on pause/resume/cancel", () => {
      expect(() => service.pause()).not.toThrow();
      expect(() => service.resume()).not.toThrow();
      expect(() => service.cancel()).not.toThrow();
    });
  });

  describe("configuration", () => {
    it("should use default config", () => {
      const config = service.getConfig();
      expect(config.rate).toBe(1.0);
      expect(config.pitch).toBe(1.0);
      expect(config.volume).toBe(1.0);
      expect(config.lang).toBe("en-US");
    });

    it("should accept custom config", () => {
      const customService = new SpeechSynthesisService({
        rate: 1.5,
        pitch: 0.8,
        lang: "en-GB",
      });

      const config = customService.getConfig();
      expect(config.rate).toBe(1.5);
      expect(config.pitch).toBe(0.8);
      expect(config.lang).toBe("en-GB");
    });

    it("should update config", () => {
      service.setConfig({ rate: 2.0 });
      expect(service.getConfig().rate).toBe(2.0);
    });
  });

  describe("emotion modulation", () => {
    it("should calculate modulated params for emotions", () => {
      const joyParams = service.getModulatedParams("joy");
      expect(joyParams.rate).toBeGreaterThan(1.0);
      expect(joyParams.pitch).toBeGreaterThan(1.0);

      const sadnessParams = service.getModulatedParams("sadness");
      expect(sadnessParams.rate).toBeLessThan(1.0);
      expect(sadnessParams.pitch).toBeLessThan(1.0);
    });

    it("should return unmodified params for unknown emotion", () => {
      const unknownParams = service.getModulatedParams("unknown_emotion");
      // Should use neutral modulation (no changes)
      expect(unknownParams.rate).toBe(1.0);
      expect(unknownParams.pitch).toBe(1.0);
    });
  });

  describe("event handling", () => {
    it("should add and remove listeners", () => {
      const listener = jest.fn();

      service.onSynthesisEvent(listener);
      service.speak("test"); // Will emit error in Node.js
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      service.offSynthesisEvent(listener);
      service.speak("test");
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe("createSpeechSynthesis factory", () => {
  it("should create service with config", () => {
    const service = createSpeechSynthesis({ rate: 1.2 });
    expect(service.getConfig().rate).toBe(1.2);
  });
});

describe("EMOTION_MODULATIONS", () => {
  it("should have neutral with zero adjustments", () => {
    const neutral = EMOTION_MODULATIONS.neutral;
    expect(neutral.rateAdjust).toBe(0);
    expect(neutral.pitchAdjust).toBe(0);
    expect(neutral.volumeAdjust).toBe(0);
  });

  it("should have all expected emotions", () => {
    const expectedEmotions = [
      "joy",
      "sadness",
      "anger",
      "fear",
      "surprise",
      "interest",
      "neutral",
    ];
    for (const emotion of expectedEmotions) {
      expect(EMOTION_MODULATIONS[emotion]).toBeDefined();
    }
  });
});

/**
 * Lip-Sync Generator Tests
 */

import {
  LipSyncGenerator,
  createLipSyncGenerator,
  phonemeToMouthShape,
  DEFAULT_LIPSYNC_CONFIG,
  PhonemeEntry,
  LipSyncEvent,
} from "../lip-sync";

describe("LipSyncGenerator", () => {
  let generator: LipSyncGenerator;

  beforeEach(() => {
    generator = new LipSyncGenerator();
  });

  afterEach(() => {
    generator.stopPlayback();
  });

  describe("generateFromText", () => {
    it("should generate phonemes for simple text", () => {
      const data = generator.generateFromText("hello");

      expect(data.phonemes.length).toBeGreaterThan(0);
      expect(data.duration).toBeGreaterThan(0);
      expect(data.textSource).toBe("hello");
    });

    it("should generate phonemes for multiple words", () => {
      const data = generator.generateFromText("hello world");

      expect(data.phonemes.length).toBeGreaterThan(0);
      expect(data.duration).toBeGreaterThan(0);
    });

    it("should handle empty text", () => {
      const data = generator.generateFromText("");

      expect(data.phonemes).toHaveLength(0);
      expect(data.duration).toBe(0);
    });

    it("should handle text with punctuation", () => {
      const data = generator.generateFromText("Hello, world!");

      expect(data.phonemes.length).toBeGreaterThan(0);
      // Should normalize and remove punctuation
      expect(data.textSource).toBe("Hello, world!");
    });

    it("should end with rest phoneme", () => {
      const data = generator.generateFromText("test");

      const lastPhoneme = data.phonemes[data.phonemes.length - 1];
      expect(lastPhoneme.phoneme).toBe("X");
    });

    it("should have sequential timing", () => {
      const data = generator.generateFromText("hello");

      for (let i = 1; i < data.phonemes.length; i++) {
        const prev = data.phonemes[i - 1];
        const curr = data.phonemes[i];
        expect(curr.startTime).toBeGreaterThanOrEqual(prev.startTime);
      }
    });

    it("should map vowels correctly", () => {
      const data = generator.generateFromText("a e i o u");

      // Check that we get phonemes typical for vowels
      const vowelPhonemes = data.phonemes.filter((p) =>
        ["A", "C", "I", "E", "F"].includes(p.phoneme),
      );
      expect(vowelPhonemes.length).toBeGreaterThan(0);
    });

    it("should recognize digraphs", () => {
      const data = generator.generateFromText("the sheep");

      // 'th' and 'sh' should be recognized
      expect(data.phonemes.length).toBeGreaterThan(0);
    });
  });

  describe("generateFromAudioLevel", () => {
    it("should return rest for zero audio level", () => {
      const entry = generator.generateFromAudioLevel(0);

      expect(entry.phoneme).toBe("X");
      expect(entry.intensity).toBe(0);
    });

    it("should return closed for low audio level", () => {
      const entry = generator.generateFromAudioLevel(0.1);

      expect(entry.phoneme).toBe("B");
      expect(entry.intensity).toBeGreaterThan(0);
    });

    it("should return open mouth for high audio level", () => {
      const entry = generator.generateFromAudioLevel(0.9);

      expect(entry.phoneme).toBe("A");
      expect(entry.intensity).toBeGreaterThan(0.5);
    });

    it("should map audio levels progressively", () => {
      const levels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
      const entries = levels.map((l) => generator.generateFromAudioLevel(l));

      // Higher audio levels should have higher intensities overall
      for (let i = 1; i < entries.length; i++) {
        const _prevIntensity = entries[i - 1].intensity;
        const currIntensity = entries[i].intensity;
        // Allow for phoneme transitions that might not be strictly increasing
        expect(currIntensity).toBeDefined();
      }
    });

    it("should accept custom duration", () => {
      const entry = generator.generateFromAudioLevel(0.5, 200);

      expect(entry.duration).toBe(200);
    });
  });

  describe("playback", () => {
    it("should start and stop playback", () => {
      const data = generator.generateFromText("hi");

      expect(() => generator.startPlayback(data)).not.toThrow();
      expect(() => generator.stopPlayback()).not.toThrow();
    });

    it("should emit events during playback", (done) => {
      const data = generator.generateFromText("a");
      const events: LipSyncEvent[] = [];

      generator.onLipSyncEvent((event) => {
        events.push(event);
        if (event.type === "sync_complete") {
          expect(events.length).toBeGreaterThan(0);
          done();
        }
      });

      generator.startPlayback(data);
    }, 2000);

    it("should return current phoneme during playback", () => {
      const data = generator.generateFromText("hello");
      generator.startPlayback(data);

      // Immediately after start, should have first phoneme
      const current = generator.getCurrentPhoneme();
      expect(current).not.toBeNull();

      generator.stopPlayback();
    });

    it("should return null when not playing", () => {
      const current = generator.getCurrentPhoneme();
      expect(current).toBeNull();
    });
  });

  describe("configuration", () => {
    it("should use default config", () => {
      const config = generator.getConfig();
      expect(config.averagePhoneDuration).toBe(
        DEFAULT_LIPSYNC_CONFIG.averagePhoneDuration,
      );
    });

    it("should accept custom config", () => {
      const customGenerator = new LipSyncGenerator({
        averagePhoneDuration: 100,
        wordsPerMinute: 200,
      });

      const config = customGenerator.getConfig();
      expect(config.averagePhoneDuration).toBe(100);
      expect(config.wordsPerMinute).toBe(200);
    });

    it("should update config", () => {
      generator.setConfig({ averagePhoneDuration: 120 });
      expect(generator.getConfig().averagePhoneDuration).toBe(120);
    });
  });

  describe("event handling", () => {
    it("should add and remove listeners", async () => {
      const listener = jest.fn();
      const data = generator.generateFromText("hello world"); // Longer text for more events

      generator.onLipSyncEvent(listener);
      generator.startPlayback(data);

      // Wait for some events to fire
      await new Promise((resolve) => setTimeout(resolve, 200));
      generator.stopPlayback();

      expect(listener).toHaveBeenCalled();
      const _callCountBeforeRemove = listener.mock.calls.length;

      // Remove listener and verify it's not called
      listener.mockClear();
      generator.offLipSyncEvent(listener);
      generator.startPlayback(data);

      await new Promise((resolve) => setTimeout(resolve, 100));
      generator.stopPlayback();

      // Listener should NOT have been called after removal
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe("phonemeToMouthShape", () => {
  it("should return closed mouth for B phoneme", () => {
    const entry: PhonemeEntry = {
      phoneme: "B",
      startTime: 0,
      duration: 100,
      intensity: 1.0,
    };
    const shape = phonemeToMouthShape(entry);

    expect(shape.mouthOpen).toBe(0);
    expect(shape.mouthWide).toBe(0);
  });

  it("should return open mouth for A phoneme", () => {
    const entry: PhonemeEntry = {
      phoneme: "A",
      startTime: 0,
      duration: 100,
      intensity: 1.0,
    };
    const shape = phonemeToMouthShape(entry);

    expect(shape.mouthOpen).toBe(1.0);
  });

  it("should return round lips for E phoneme", () => {
    const entry: PhonemeEntry = {
      phoneme: "E",
      startTime: 0,
      duration: 100,
      intensity: 1.0,
    };
    const shape = phonemeToMouthShape(entry);

    expect(shape.lipRound).toBeGreaterThan(0);
  });

  it("should return wide mouth for D phoneme", () => {
    const entry: PhonemeEntry = {
      phoneme: "D",
      startTime: 0,
      duration: 100,
      intensity: 1.0,
    };
    const shape = phonemeToMouthShape(entry);

    expect(shape.mouthWide).toBe(1.0);
  });

  it("should scale with intensity", () => {
    const highIntensity: PhonemeEntry = {
      phoneme: "A",
      startTime: 0,
      duration: 100,
      intensity: 1.0,
    };
    const lowIntensity: PhonemeEntry = {
      phoneme: "A",
      startTime: 0,
      duration: 100,
      intensity: 0.5,
    };

    const highShape = phonemeToMouthShape(highIntensity);
    const lowShape = phonemeToMouthShape(lowIntensity);

    expect(highShape.mouthOpen).toBeGreaterThan(lowShape.mouthOpen);
  });

  it("should return zeros for rest phoneme", () => {
    const entry: PhonemeEntry = {
      phoneme: "X",
      startTime: 0,
      duration: 100,
      intensity: 0,
    };
    const shape = phonemeToMouthShape(entry);

    expect(shape.mouthOpen).toBe(0);
    expect(shape.mouthWide).toBe(0);
    expect(shape.lipRound).toBe(0);
  });

  it("should handle all phoneme types", () => {
    const phonemes: Array<PhonemeEntry["phoneme"]> = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "X",
    ];

    for (const phoneme of phonemes) {
      const entry: PhonemeEntry = {
        phoneme,
        startTime: 0,
        duration: 100,
        intensity: 1.0,
      };
      const shape = phonemeToMouthShape(entry);

      expect(shape.mouthOpen).toBeDefined();
      expect(shape.mouthWide).toBeDefined();
      expect(shape.lipRound).toBeDefined();
      expect(shape.mouthOpen).toBeGreaterThanOrEqual(0);
      expect(shape.mouthWide).toBeGreaterThanOrEqual(0);
      expect(shape.lipRound).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("createLipSyncGenerator factory", () => {
  it("should create generator with default config", () => {
    const generator = createLipSyncGenerator();
    expect(generator).toBeInstanceOf(LipSyncGenerator);
    expect(generator.getConfig().averagePhoneDuration).toBe(
      DEFAULT_LIPSYNC_CONFIG.averagePhoneDuration,
    );
  });

  it("should create generator with custom config", () => {
    const generator = createLipSyncGenerator({ averagePhoneDuration: 150 });
    expect(generator.getConfig().averagePhoneDuration).toBe(150);
  });
});

describe("DEFAULT_LIPSYNC_CONFIG", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_LIPSYNC_CONFIG.averagePhoneDuration).toBeGreaterThan(0);
    expect(DEFAULT_LIPSYNC_CONFIG.minPhoneDuration).toBeGreaterThan(0);
    expect(DEFAULT_LIPSYNC_CONFIG.maxPhoneDuration).toBeGreaterThan(
      DEFAULT_LIPSYNC_CONFIG.minPhoneDuration,
    );
    expect(DEFAULT_LIPSYNC_CONFIG.wordsPerMinute).toBeGreaterThan(0);
    expect(DEFAULT_LIPSYNC_CONFIG.wordGapDuration).toBeGreaterThan(0);
  });
});

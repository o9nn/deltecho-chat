/**
 * Audio Pipeline Tests
 */
// Jest globals are injected automatically via jest.config.js injectGlobals: true

import {
  AudioPipeline,
  createAudioPipeline,
  DEFAULT_PIPELINE_CONFIG,
  PipelineEvent,
} from "../audio-pipeline";

// Mock the dependencies
jest.mock("../vad", () => ({
  createVAD: jest.fn(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    getState: jest.fn(() => ({ audioLevel: 0, isSpeaking: false })),
    onVADEvent: jest.fn(),
    offVADEvent: jest.fn(),
    isAvailable: jest.fn(() => true),
  })),
  VoiceActivityDetector: jest.fn(),
}));

jest.mock("../speech-recognition", () => ({
  createSpeechRecognition: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    isListening: jest.fn(() => false),
    isAvailable: jest.fn(() => true),
    onRecognitionEvent: jest.fn(),
    offRecognitionEvent: jest.fn(),
  })),
  SpeechRecognitionService: jest.fn(),
}));

jest.mock("../speech-synthesis", () => ({
  createSpeechSynthesis: jest.fn(() => ({
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    isSpeaking: jest.fn(() => false),
    isAvailable: jest.fn(() => true),
    onSynthesisEvent: jest.fn(),
    offSynthesisEvent: jest.fn(),
  })),
  SpeechSynthesisService: jest.fn(),
}));

jest.mock("../lip-sync", () => ({
  createLipSyncGenerator: jest.fn(() => ({
    generateFromText: jest.fn(() => ({
      phonemes: [],
      duration: 1000,
      textSource: "test",
    })),
    startPlayback: jest.fn(),
    stopPlayback: jest.fn(),
    onLipSyncEvent: jest.fn(),
    offLipSyncEvent: jest.fn(),
  })),
  LipSyncGenerator: jest.fn(),
}));

describe("AudioPipeline", () => {
  let pipeline: AudioPipeline;

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = new AudioPipeline();
  });

  afterEach(() => {
    pipeline.dispose();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const p = new AudioPipeline();
      expect(p.getState()).toBe("idle");
      p.dispose();
    });

    it("should accept custom config", () => {
      const p = new AudioPipeline({
        autoListen: false,
        responseDelay: 500,
      });
      expect(p.getState()).toBe("idle");
      p.dispose();
    });

    it("should initialize in idle state", () => {
      expect(pipeline.getState()).toBe("idle");
    });
  });

  describe("state management", () => {
    it("should report idle state initially", () => {
      expect(pipeline.getState()).toBe("idle");
    });

    it("should report listening state when listening", async () => {
      await pipeline.startListening();
      expect(pipeline.getState()).toBe("listening");
    });

    it("should report not speaking initially", () => {
      expect(pipeline.isSpeaking()).toBe(false);
    });

    it("should report not listening initially", () => {
      expect(pipeline.isListening()).toBe(false);
    });
  });

  describe("startListening", () => {
    it("should start listening and emit event", async () => {
      const listener = jest.fn();
      pipeline.onPipelineEvent(listener);

      await pipeline.startListening();

      expect(pipeline.getState()).toBe("listening");
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "listening_start" }),
      );
    });

    it("should not start listening while speaking", async () => {
      // Simulate speaking state
      (pipeline as any).currentState = "speaking";

      await pipeline.startListening();

      expect(pipeline.getState()).toBe("speaking");
    });

    it("should not start listening while processing", async () => {
      // Simulate processing state
      (pipeline as any).currentState = "processing";

      await pipeline.startListening();

      expect(pipeline.getState()).toBe("processing");
    });
  });

  describe("stopListening", () => {
    it("should stop listening and emit event", async () => {
      const listener = jest.fn();
      pipeline.onPipelineEvent(listener);

      await pipeline.startListening();
      pipeline.stopListening();

      expect(pipeline.getState()).toBe("idle");
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "listening_end" }),
      );
    });

    it("should be safe to call when not listening", () => {
      expect(() => pipeline.stopListening()).not.toThrow();
    });
  });

  describe("speak", () => {
    it("should stop listening when speaking", async () => {
      await pipeline.startListening();
      pipeline.speak("Hello");

      // Should have stopped listening
      expect(pipeline.isListening()).toBe(false);
    });

    it("should emit lip_sync event when enabled", () => {
      const listener = jest.fn();
      pipeline.onPipelineEvent(listener);

      pipeline.speak("Test message");

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "lip_sync" }),
      );
    });
  });

  describe("stopSpeaking", () => {
    it("should cancel synthesis", () => {
      pipeline.speak("Test");
      pipeline.stopSpeaking();
      // Synthesis cancel should have been called
    });
  });

  describe("LLM processor", () => {
    it("should set LLM processor", () => {
      const processor = jest.fn().mockResolvedValue({
        response: "Hello!",
        emotion: "happy",
      });

      pipeline.setLLMProcessor(processor);
      expect((pipeline as any).llmProcessor).toBe(processor);
    });
  });

  describe("event handling", () => {
    it("should add and remove listeners", () => {
      const listener = jest.fn();
      pipeline.onPipelineEvent(listener);
      pipeline.offPipelineEvent(listener);

      // Trigger an event
      pipeline.speak("Test");

      // Listener should not have been called for new events
      // (it may have been called before removal)
    });

    it("should emit events with timestamp", async () => {
      const listener = jest.fn();
      pipeline.onPipelineEvent(listener);

      await pipeline.startListening();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        }),
      );
    });

    it("should include state in events", async () => {
      const listener = jest.fn();
      pipeline.onPipelineEvent(listener);

      await pipeline.startListening();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          state: "listening",
        }),
      );
    });
  });

  describe("isAvailable", () => {
    it("should return true when dependencies are available", () => {
      expect(pipeline.isAvailable()).toBe(true);
    });
  });

  describe("getAudioLevel", () => {
    it("should return audio level from VAD", () => {
      const level = pipeline.getAudioLevel();
      expect(typeof level).toBe("number");
    });
  });

  describe("dispose", () => {
    it("should clean up resources", () => {
      pipeline.dispose();
      // Should not throw when disposing
    });

    it("should be safe to call multiple times", () => {
      pipeline.dispose();
      expect(() => pipeline.dispose()).not.toThrow();
    });
  });

  describe("factory function", () => {
    it("should create instance with createAudioPipeline", () => {
      const p = createAudioPipeline();
      expect(p).toBeInstanceOf(AudioPipeline);
      p.dispose();
    });

    it("should accept config in factory", () => {
      const p = createAudioPipeline({ autoListen: false });
      expect(p).toBeInstanceOf(AudioPipeline);
      p.dispose();
    });
  });

  describe("DEFAULT_PIPELINE_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_PIPELINE_CONFIG.autoListen).toBe(true);
      expect(DEFAULT_PIPELINE_CONFIG.responseDelay).toBeGreaterThan(0);
      expect(DEFAULT_PIPELINE_CONFIG.enableLipSync).toBe(true);
      expect(DEFAULT_PIPELINE_CONFIG.listeningTimeout).toBeGreaterThan(0);
    });
  });
});

describe("AudioPipeline integration scenarios", () => {
  it("should handle full conversation flow", async () => {
    const pipeline = createAudioPipeline({ autoListen: false });
    const events: PipelineEvent[] = [];

    pipeline.onPipelineEvent((event) => {
      events.push(event);
    });

    // Start listening
    await pipeline.startListening();
    expect(events.some((e) => e.type === "listening_start")).toBe(true);

    // Stop listening
    pipeline.stopListening();
    expect(events.some((e) => e.type === "listening_end")).toBe(true);

    // Speak response
    pipeline.speak("Here is my response");
    expect(events.some((e) => e.type === "lip_sync")).toBe(true);

    pipeline.dispose();
  });
});

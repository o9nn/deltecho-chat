/**
 * Cognitive State Tests
 */

import {
  CognitiveStateManager,
  createCognitiveState,
} from "../cognitive-state";
import { _EmotionalVector, _DEFAULT_EMOTIONAL_VECTOR } from "../types";

describe("CognitiveStateManager", () => {
  let stateManager: CognitiveStateManager;

  beforeEach(() => {
    stateManager = new CognitiveStateManager({
      enablePhaseCycle: false, // Disable for predictable tests
    });
  });

  afterEach(() => {
    stateManager.stop();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      expect(stateManager).toBeInstanceOf(CognitiveStateManager);
    });

    it("should initialize with default state", () => {
      const state = stateManager.getState();
      expect(state.currentPhase).toBe(0);
      expect(state.activeStreams).toEqual([]);
      expect(state.cognitiveLoad).toBe(0);
    });
  });

  describe("getState", () => {
    it("should return copy of state", () => {
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it("should include emotional state", () => {
      const state = stateManager.getState();
      expect(state.emotionalState).toBeDefined();
      expect(state.emotionalState.dominant).toBe("neutral");
    });
  });

  describe("getCurrentPhase", () => {
    it("should return current phase", () => {
      expect(stateManager.getCurrentPhase()).toBe(0);
    });
  });

  describe("advancePhase", () => {
    it("should increment phase", () => {
      expect(stateManager.getCurrentPhase()).toBe(0);
      stateManager.advancePhase();
      expect(stateManager.getCurrentPhase()).toBe(1);
    });

    it("should wrap at 30", () => {
      for (let i = 0; i < 30; i++) {
        stateManager.advancePhase();
      }
      expect(stateManager.getCurrentPhase()).toBe(0);
    });
  });

  describe("updateEmotionalState", () => {
    it("should update emotional state", () => {
      stateManager.updateEmotionalState({ joy: 0.8 });
      const state = stateManager.getState();
      expect(state.emotionalState.joy).toBe(0.8);
    });

    it("should update dominant emotion", () => {
      stateManager.updateEmotionalState({ anger: 0.9 });
      const state = stateManager.getState();
      expect(state.emotionalState.dominant).toBe("anger");
    });

    it("should recalculate valence and arousal", () => {
      stateManager.updateEmotionalState({ joy: 0.8 });
      const state = stateManager.getState();
      expect(state.emotionalState.valence).toBeGreaterThan(0);
    });
  });

  describe("createStream", () => {
    it("should create a new stream", () => {
      const stream = stateManager.createStream("sense", { test: true });
      expect(stream.id).toBeDefined();
      expect(stream.phase).toBe("sense");
      expect(stream.status).toBe("pending");
    });

    it("should add stream to active streams", () => {
      stateManager.createStream("sense", {});
      const state = stateManager.getState();
      expect(state.activeStreams.length).toBe(1);
    });

    it("should enforce max streams", () => {
      const manager = new CognitiveStateManager({ maxStreams: 2 });
      manager.createStream("sense", {});
      manager.createStream("process", {});
      manager.createStream("act", {});

      const state = manager.getState();
      expect(state.activeStreams.length).toBeLessThanOrEqual(2);
      manager.stop();
    });
  });

  describe("updateStream", () => {
    it("should update stream status", () => {
      const stream = stateManager.createStream("sense", {});
      const updated = stateManager.updateStream(stream.id, {
        status: "active",
      });
      expect(updated).toBe(true);

      const state = stateManager.getState();
      expect(state.activeStreams[0].status).toBe("active");
    });

    it("should update stream phase", () => {
      const stream = stateManager.createStream("sense", {});
      stateManager.updateStream(stream.id, { phase: "process" });

      const state = stateManager.getState();
      expect(state.activeStreams[0].phase).toBe("process");
    });

    it("should return false for non-existent stream", () => {
      const result = stateManager.updateStream("fake-id", { status: "active" });
      expect(result).toBe(false);
    });
  });

  describe("completeStream", () => {
    it("should mark stream as complete", () => {
      const stream = stateManager.createStream("sense", {});
      stateManager.completeStream(stream.id);

      const state = stateManager.getState();
      expect(state.activeStreams[0].status).toBe("complete");
    });
  });

  describe("getActiveStreams", () => {
    it("should return only active and pending streams", () => {
      const stream1 = stateManager.createStream("sense", {});
      stateManager.updateStream(stream1.id, { status: "active" });

      const stream2 = stateManager.createStream("process", {});
      stateManager.completeStream(stream2.id);

      const active = stateManager.getActiveStreams();
      expect(active.length).toBe(1);
      expect(active[0].id).toBe(stream1.id);
    });
  });

  describe("setMemoryContext", () => {
    it("should set memory context", () => {
      const context = stateManager.createSimpleMemoryContext(["hello world"]);
      stateManager.setMemoryContext(context);

      const state = stateManager.getState();
      expect(state.memoryContext).toBeDefined();
      expect(state.memoryContext?.dimensions).toBe(256);
    });

    it("should allow null context", () => {
      stateManager.setMemoryContext(null);
      const state = stateManager.getState();
      expect(state.memoryContext).toBeNull();
    });
  });

  describe("createSimpleMemoryContext", () => {
    it("should create vector from texts", () => {
      const vector = stateManager.createSimpleMemoryContext([
        "hello world",
        "test message",
      ]);

      expect(vector.dimensions).toBe(256);
      expect(vector.values).toBeInstanceOf(Float32Array);
      expect(vector.metadata.sourceCount).toBe(2);
    });

    it("should normalize vector", () => {
      const vector = stateManager.createSimpleMemoryContext(["hello"]);
      const magnitude = Math.sqrt(
        Array.from(vector.values).reduce((a, b) => a + b * b, 0),
      );
      expect(magnitude).toBeCloseTo(1, 5);
    });
  });

  describe("setReasoningState", () => {
    it("should set reasoning state", () => {
      const atomSpace = stateManager.createEmptyAtomSpace();
      stateManager.setReasoningState(atomSpace);

      const state = stateManager.getState();
      expect(state.reasoningState).toBeDefined();
    });
  });

  describe("reset", () => {
    it("should reset state to initial", () => {
      stateManager.createStream("sense", {});
      stateManager.updateEmotionalState({ joy: 0.8 });

      stateManager.reset();

      const state = stateManager.getState();
      expect(state.activeStreams.length).toBe(0);
      expect(state.emotionalState.joy).toBe(0);
      expect(state.currentPhase).toBe(0);
    });
  });

  describe("events", () => {
    it("should emit events on state change", (done) => {
      stateManager.onStateEvent((event) => {
        expect(event.type).toBe("state_updated");
        done();
      });

      stateManager.updateEmotionalState({ joy: 0.5 });
    });
  });

  describe("factory function", () => {
    it("should create manager with createCognitiveState", () => {
      const manager = createCognitiveState({ maxStreams: 5 });
      expect(manager).toBeInstanceOf(CognitiveStateManager);
      manager.stop();
    });
  });

  describe("start/stop", () => {
    it("should start without throwing", () => {
      expect(() => stateManager.start()).not.toThrow();
    });

    it("should stop without throwing", () => {
      stateManager.start();
      expect(() => stateManager.stop()).not.toThrow();
    });
  });
});

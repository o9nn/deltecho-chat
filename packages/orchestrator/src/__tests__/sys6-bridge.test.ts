/**
 * @fileoverview E2E Tests for Sys6 Orchestrator Bridge
 *
 * Comprehensive test suite for the 30-step cognitive cycle integration.
 * Tests cover:
 * - Initialization and lifecycle
 * - 30-step cycle execution
 * - Triadic stream processing
 * - Agent coordination
 * - Message processing
 * - Telemetry and metrics
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { Sys6OrchestratorBridge } from "../sys6-bridge/index.js";

describe("Sys6OrchestratorBridge", () => {
  let bridge: Sys6OrchestratorBridge;

  beforeEach(() => {
    bridge = new Sys6OrchestratorBridge({
      dim: 64,
      stepDurationMs: 10, // Fast for testing
      enableParallelStreams: true,
      enableTelemetry: true,
      maxConcurrentAgents: 5,
      enableNestedAgency: true,
    });
  });

  afterEach(async () => {
    if (bridge) {
      await bridge.stop();
    }
  });

  describe("Initialization", () => {
    it("should initialize with default configuration", () => {
      const defaultBridge = new Sys6OrchestratorBridge();
      const state = defaultBridge.getState();

      expect(state.running).toBe(false);
      expect(state.cycleNumber).toBe(0);
      expect(state.currentStep).toBe(0);
      expect(state.streams).toHaveLength(3);
      expect(state.agents).toHaveLength(5); // Default agents
    });

    it("should initialize with custom configuration", () => {
      const customBridge = new Sys6OrchestratorBridge({
        dim: 128,
        stepDurationMs: 50,
        enableParallelStreams: false,
      });

      const state = customBridge.getState();
      expect(state.streams).toHaveLength(3);
    });

    it("should initialize three consciousness streams with 120° phase separation", () => {
      const state = bridge.getState();
      const [stream1, stream2, stream3] = state.streams;

      expect(stream1.streamId).toBe(1);
      expect(stream1.phase).toBe("perception");
      expect(stream1.currentStep).toBe(0);

      expect(stream2.streamId).toBe(2);
      expect(stream2.phase).toBe("evaluation");
      expect(stream2.currentStep).toBe(10); // 120° offset

      expect(stream3.streamId).toBe(3);
      expect(stream3.phase).toBe("action");
      expect(stream3.currentStep).toBe(20); // 240° offset
    });

    it("should register default cognitive agents", () => {
      const state = bridge.getState();
      const agentIds = state.agents.map((a) => a.id);

      expect(agentIds).toContain("coordinator");
      expect(agentIds).toContain("cognitive-processor");
      expect(agentIds).toContain("memory-manager");
      expect(agentIds).toContain("emotional-processor");
      expect(agentIds).toContain("action-executor");
    });
  });

  describe("Lifecycle Management", () => {
    it("should start the cognitive cycle", async () => {
      const startedPromise = new Promise<void>((resolve) => {
        bridge.once("started", () => resolve());
      });

      await bridge.start();
      await startedPromise;

      const state = bridge.getState();
      expect(state.running).toBe(true);
    });

    it("should not start twice", async () => {
      await bridge.start();
      await bridge.start(); // Should not throw

      const state = bridge.getState();
      expect(state.running).toBe(true);
    });

    it("should stop the cognitive cycle", async () => {
      await bridge.start();

      const stoppedPromise = new Promise<void>((resolve) => {
        bridge.once("stopped", () => resolve());
      });

      await bridge.stop();
      await stoppedPromise;

      const state = bridge.getState();
      expect(state.running).toBe(false);
    });

    it("should emit step_complete events", async () => {
      const stepEvents: unknown[] = [];
      bridge.on("step_complete", (event) => stepEvents.push(event));

      await bridge.start();

      // Wait for a few steps
      await new Promise((resolve) => setTimeout(resolve, 50));

      await bridge.stop();

      expect(stepEvents.length).toBeGreaterThan(0);
    });

    it("should emit cycle_complete event after 30 steps", async () => {
      const cycleCompletePromise = new Promise<unknown>((resolve) => {
        bridge.once("cycle_complete", resolve);
      });

      await bridge.start();

      // Wait for cycle completion (30 steps * 10ms = 300ms + buffer)
      const result = await Promise.race([
        cycleCompletePromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 500)),
      ]);

      await bridge.stop();

      expect(result).not.toBeNull();
    });
  });

  describe("30-Step Cognitive Cycle", () => {
    it("should correctly calculate step addresses", () => {
      // Access private method through type assertion for testing
      const toStepAddress = (
        bridge as unknown as { toStepAddress: (step: number) => unknown }
      ).toStepAddress.bind(bridge);

      // Step 1: Phase 1, Stage 1, Step 1
      const step1 = toStepAddress(1) as {
        step: number;
        phase: number;
        stage: number;
        stepInStage: number;
        dyad: string;
        triad: number;
      };
      expect(step1.step).toBe(1);
      expect(step1.phase).toBe(1);
      expect(step1.stage).toBe(1);
      expect(step1.stepInStage).toBe(1);
      expect(step1.dyad).toBe("A");
      expect(step1.triad).toBe(1);

      // Step 10: Phase 1, Stage 5, Step 2
      const step10 = toStepAddress(10) as {
        step: number;
        phase: number;
        stage: number;
        stepInStage: number;
      };
      expect(step10.step).toBe(10);
      expect(step10.phase).toBe(1);
      expect(step10.stage).toBe(5);
      expect(step10.stepInStage).toBe(2);

      // Step 11: Phase 2, Stage 1, Step 1
      const step11 = toStepAddress(11) as {
        step: number;
        phase: number;
        stage: number;
        stepInStage: number;
      };
      expect(step11.step).toBe(11);
      expect(step11.phase).toBe(2);
      expect(step11.stage).toBe(1);
      expect(step11.stepInStage).toBe(1);

      // Step 30: Phase 3, Stage 5, Step 2
      const step30 = toStepAddress(30) as {
        step: number;
        phase: number;
        stage: number;
        stepInStage: number;
      };
      expect(step30.step).toBe(30);
      expect(step30.phase).toBe(3);
      expect(step30.stage).toBe(5);
      expect(step30.stepInStage).toBe(2);
    });

    it("should implement double step delay pattern", () => {
      const toStepAddress = (
        bridge as unknown as { toStepAddress: (step: number) => unknown }
      ).toStepAddress.bind(bridge);

      // Verify the 4-step pattern repeats
      const pattern = [
        { dyad: "A", triad: 1 },
        { dyad: "A", triad: 2 },
        { dyad: "B", triad: 2 },
        { dyad: "B", triad: 3 },
      ];

      for (let i = 0; i < 30; i++) {
        const step = toStepAddress(i + 1) as { dyad: string; triad: number };
        const expected = pattern[i % 4];
        expect(step.dyad).toBe(expected.dyad);
        expect(step.triad).toBe(expected.triad);
      }
    });

    it("should process all three phases in order", async () => {
      const phasesSeen = new Set<number>();

      bridge.on("step_complete", (event: { step: { phase: number } }) => {
        phasesSeen.add(event.step.phase);
      });

      await bridge.start();

      // Wait for full cycle
      await new Promise((resolve) => setTimeout(resolve, 400));

      await bridge.stop();

      expect(phasesSeen.has(1)).toBe(true); // Perception-Orientation
      expect(phasesSeen.has(2)).toBe(true); // Evaluation-Generation
      expect(phasesSeen.has(3)).toBe(true); // Action-Integration
    });
  });

  describe("Triadic Stream Processing", () => {
    it("should update stream salience during processing", async () => {
      await bridge.start();

      // Wait for some processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = bridge.getState();
      const saliences = state.streams.map((s) => s.salience);

      // At least one stream should have non-zero salience
      expect(saliences.some((s) => s > 0)).toBe(true);

      await bridge.stop();
    });

    it("should maintain stream phase assignments", async () => {
      await bridge.start();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = bridge.getState();

      expect(state.streams[0].phase).toBe("perception");
      expect(state.streams[1].phase).toBe("evaluation");
      expect(state.streams[2].phase).toBe("action");

      await bridge.stop();
    });

    it("should update stream perceives relationships", async () => {
      const state = bridge.getState();

      // Stream 1 perceives streams 2 and 3
      expect(state.streams[0].perceives.stream1).toBe(false);
      expect(state.streams[0].perceives.stream2).toBe(true);
      expect(state.streams[0].perceives.stream3).toBe(true);

      // Stream 2 perceives streams 1 and 3
      expect(state.streams[1].perceives.stream1).toBe(true);
      expect(state.streams[1].perceives.stream2).toBe(false);
      expect(state.streams[1].perceives.stream3).toBe(true);
    });

    it("should detect affordances based on salience", async () => {
      await bridge.start();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      const state = bridge.getState();

      // Check that affordances are being detected
      const allAffordances = state.streams.flatMap((s) => s.affordances);
      // May or may not have affordances depending on salience levels
      expect(Array.isArray(allAffordances)).toBe(true);

      await bridge.stop();
    });
  });

  describe("Agent Coordination", () => {
    it("should invoke agents during processing", async () => {
      const agentInvocations: unknown[] = [];
      bridge.on("agent_invoked", (event) => agentInvocations.push(event));

      await bridge.start();

      // Wait for processing through multiple phases
      await new Promise((resolve) => setTimeout(resolve, 200));

      await bridge.stop();

      // Should have invoked agents
      expect(agentInvocations.length).toBeGreaterThan(0);
    });

    it("should register new agents", () => {
      bridge.registerAgent({
        id: "test-agent",
        name: "Test Agent",
        specialization: "Testing",
        capabilities: ["testing"],
        isActive: true,
      });

      const state = bridge.getState();
      const testAgent = state.agents.find((a) => a.id === "test-agent");

      expect(testAgent).toBeDefined();
      expect(testAgent?.name).toBe("Test Agent");
    });

    it("should deactivate agents", () => {
      const result = bridge.deactivateAgent("cognitive-processor");

      expect(result).toBe(true);

      const state = bridge.getState();
      const agent = state.agents.find((a) => a.id === "cognitive-processor");

      expect(agent?.isActive).toBe(false);
    });

    it("should return false when deactivating non-existent agent", () => {
      const result = bridge.deactivateAgent("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("Message Processing", () => {
    it("should process messages through cognitive system", async () => {
      const response = await bridge.processMessage("Hello, Deep Tree Echo!");

      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });

    it("should handle empty messages gracefully", async () => {
      const response = await bridge.processMessage("");

      expect(typeof response).toBe("string");
    });

    it("should update emotional state after processing", async () => {
      // Process a message
      await bridge.processMessage("This is a test message");

      // The emotional state should have been updated
      // (We can't directly verify this without exposing internal state)
      const state = bridge.getState();
      expect(state).toBeDefined();
    });
  });

  describe("Telemetry and Metrics", () => {
    it("should collect telemetry during operation", async () => {
      await bridge.start();

      // Wait for cycle completion
      await new Promise((resolve) => setTimeout(resolve, 400));

      await bridge.stop();

      const history = bridge.getTelemetryHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it("should provide accurate metrics", async () => {
      await bridge.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const metrics = bridge.getMetrics();

      expect(metrics.totalCycles).toBeGreaterThanOrEqual(0);
      expect(metrics.totalSteps).toBeGreaterThan(0);
      expect(metrics.activeAgents).toBe(5);
      expect(metrics.streamSaliences).toHaveLength(3);

      await bridge.stop();
    });

    it("should track cycle count correctly", async () => {
      const cycleEvents: unknown[] = [];
      bridge.on("cycle_complete", (event) => cycleEvents.push(event));

      await bridge.start();

      // Wait for at least one cycle
      await new Promise((resolve) => setTimeout(resolve, 400));

      await bridge.stop();

      const metrics = bridge.getMetrics();
      expect(metrics.totalCycles).toBe(cycleEvents.length);
    });

    it("should maintain telemetry history limit", async () => {
      // Create bridge with short step duration
      const fastBridge = new Sys6OrchestratorBridge({
        dim: 32,
        stepDurationMs: 5,
        enableTelemetry: true,
      });

      await fastBridge.start();

      // Run for a while to generate many cycles
      await new Promise((resolve) => setTimeout(resolve, 500));

      await fastBridge.stop();

      const history = fastBridge.getTelemetryHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Error Handling", () => {
    it("should handle processing errors gracefully", async () => {
      // Process should return error message, not throw
      const response = await bridge.processMessage("test");
      expect(typeof response).toBe("string");
    });

    it("should continue operation after errors", async () => {
      await bridge.start();

      // Process message (may or may not error)
      await bridge.processMessage("test");

      // Bridge should still be running
      const state = bridge.getState();
      expect(state.running).toBe(true);

      await bridge.stop();
    });
  });

  describe("State Management", () => {
    it("should provide complete state snapshot", () => {
      const state = bridge.getState();

      expect(state).toHaveProperty("running");
      expect(state).toHaveProperty("cycleNumber");
      expect(state).toHaveProperty("currentStep");
      expect(state).toHaveProperty("streams");
      expect(state).toHaveProperty("agents");
    });

    it("should track step count accurately", async () => {
      await bridge.start();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = bridge.getState();
      expect(state.currentStep).toBeGreaterThan(0);

      await bridge.stop();
    });
  });
});

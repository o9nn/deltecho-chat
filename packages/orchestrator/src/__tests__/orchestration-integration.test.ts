/**
 * @fileoverview Integration Tests for Deep Tree Echo Orchestration
 *
 * End-to-end integration tests that verify the complete orchestration
 * system works together correctly:
 * - Sys6 Bridge + Agent Coordinator + Telemetry Monitor
 * - Full cognitive cycle with agent delegation
 * - Real-time monitoring during operation
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Sys6OrchestratorBridge } from "../sys6-bridge/index.js";
import { AgentCoordinator } from "../agents/index.js";
import { TelemetryMonitor } from "../telemetry/index.js";

describe("Orchestration Integration", () => {
  let sys6Bridge: Sys6OrchestratorBridge;
  let agentCoordinator: AgentCoordinator;
  let telemetryMonitor: TelemetryMonitor;

  beforeEach(() => {
    // Initialize all components with fast settings for testing
    sys6Bridge = new Sys6OrchestratorBridge({
      dim: 64,
      stepDurationMs: 10,
      enableParallelStreams: true,
      enableTelemetry: true,
      enableNestedAgency: true,
    });

    agentCoordinator = new AgentCoordinator({
      maxConcurrentTasks: 5,
      taskTimeoutMs: 5000,
      enableDynamicAgents: true,
      enableParallelDelegation: true,
    });

    telemetryMonitor = new TelemetryMonitor({
      collectionIntervalMs: 50,
      retentionPeriodMs: 10000,
      maxDataPoints: 100,
      enableAlerts: true,
    });

    // Wire up telemetry to track Sys6 events
    sys6Bridge.on("step_complete", () => {
      telemetryMonitor.recordStepComplete();
    });

    sys6Bridge.on(
      "cycle_complete",
      (result: { telemetry: { processingTimeMs: number } }) => {
        telemetryMonitor.recordCycleComplete(result.telemetry.processingTimeMs);
      },
    );

    sys6Bridge.on("agent_invoked", (event: { agentId: string }) => {
      telemetryMonitor.recordAgentInvocation(event.agentId);
    });

    // Wire up telemetry to track Agent Coordinator events
    agentCoordinator.on("task_completed", () => {
      telemetryMonitor.recordMessageProcessed(100);
    });

    agentCoordinator.on("task_failed", (event: { error: string }) => {
      telemetryMonitor.recordError("agent_coordinator", event.error);
    });
  });

  afterEach(async () => {
    await Promise.all([
      sys6Bridge.stop(),
      agentCoordinator.stop(),
      telemetryMonitor.stop(),
    ]);
  });

  describe("Full System Startup", () => {
    it("should start all components successfully", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      expect(sys6Bridge.getState().running).toBe(true);
      expect(agentCoordinator.getState().running).toBe(true);

      // Telemetry should be collecting
      await new Promise((resolve) => setTimeout(resolve, 100));
      const snapshot = telemetryMonitor.getSnapshot();
      expect(snapshot.systemInfo.uptime).toBeGreaterThan(0);
    });

    it("should stop all components gracefully", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      await Promise.all([
        sys6Bridge.stop(),
        agentCoordinator.stop(),
        telemetryMonitor.stop(),
      ]);

      expect(sys6Bridge.getState().running).toBe(false);
      expect(agentCoordinator.getState().running).toBe(false);
    });
  });

  describe("Cognitive Cycle with Agent Delegation", () => {
    it("should execute cognitive cycles and delegate to agents", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      // Create a task that will be processed during cognitive cycle
      agentCoordinator.createTask("reasoning", "Process cognitive input", {
        input: "test data",
      });

      // Wait for cycle completion and task processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify cognitive cycles ran
      const sys6Metrics = sys6Bridge.getMetrics();
      expect(sys6Metrics.totalSteps).toBeGreaterThan(0);

      // Verify tasks were processed
      const coordinatorMetrics = agentCoordinator.getMetrics();
      expect(coordinatorMetrics.completedTasks).toBeGreaterThan(0);
    });

    it("should track agent invocations during cognitive processing", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check telemetry recorded agent invocations
      const metric = telemetryMonitor.getMetric("agent_invocations_total");
      expect(metric?.dataPoints.length).toBeGreaterThan(0);
    });
  });

  describe("Telemetry During Operation", () => {
    it("should collect metrics from all components", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      // Create some activity
      agentCoordinator.createTask("analysis", "Test analysis", {});

      await new Promise((resolve) => setTimeout(resolve, 400));

      const snapshot = telemetryMonitor.getSnapshot();

      // Should have cognitive metrics
      expect(snapshot.metrics["cognitive_steps_total"]).toBeGreaterThan(0);

      // Should have system metrics
      expect(snapshot.metrics["system_memory_usage_bytes"]).toBeGreaterThan(0);
    });

    it("should provide accurate health status during operation", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const health = telemetryMonitor.getHealthStatus();

      expect(health.status).toBeDefined();
      expect(health.components.length).toBeGreaterThan(0);

      // Cognitive engine should be healthy or degraded since cycles are running
      const cognitiveComponent = health.components.find(
        (c) => c.name === "cognitive_engine",
      );
      // Accept healthy or degraded (not unhealthy) as valid states during operation
      expect(["healthy", "degraded"]).toContain(cognitiveComponent?.status);
    });

    it("should generate alerts for threshold violations", async () => {
      const alertMonitor = new TelemetryMonitor({
        collectionIntervalMs: 50,
        enableAlerts: true,
        alertThresholds: {
          memoryUsagePercent: 1, // Very low to trigger
          errorRatePercent: 1,
          cycleLatencyMs: 1, // Very low to trigger
        },
      });

      // Record high latency cycle
      alertMonitor.recordCycleComplete(5000);

      await alertMonitor.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const activeAlerts = alertMonitor.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);

      await alertMonitor.stop();
    });
  });

  describe("Stream Coordination", () => {
    it("should maintain triadic stream coherence during operation", async () => {
      await sys6Bridge.start();

      // Wait for multiple cycles
      await new Promise((resolve) => setTimeout(resolve, 400));

      const state = sys6Bridge.getState();

      // All three streams should be present
      expect(state.streams.length).toBe(3);

      // Streams should maintain their phase assignments
      expect(state.streams[0].phase).toBe("perception");
      expect(state.streams[1].phase).toBe("evaluation");
      expect(state.streams[2].phase).toBe("action");

      // Streams should have been updated
      const totalSalience = state.streams.reduce(
        (sum, s) => sum + s.salience,
        0,
      );
      expect(totalSalience).toBeGreaterThan(0);
    });

    it("should process streams in parallel when enabled", async () => {
      const parallelBridge = new Sys6OrchestratorBridge({
        dim: 64,
        stepDurationMs: 10,
        enableParallelStreams: true,
      });

      const stepTimes: number[] = [];
      parallelBridge.on("step_complete", () => {
        stepTimes.push(Date.now());
      });

      await parallelBridge.start();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await parallelBridge.stop();

      // Steps should complete quickly (parallel processing)
      if (stepTimes.length >= 2) {
        const avgInterval =
          (stepTimes[stepTimes.length - 1] - stepTimes[0]) / stepTimes.length;
        expect(avgInterval).toBeLessThan(50); // Should be close to stepDurationMs
      }
    });
  });

  describe("Agent Task Coordination", () => {
    it("should coordinate multiple concurrent tasks", async () => {
      await agentCoordinator.start();

      // Create multiple tasks
      const _tasks = [
        agentCoordinator.createTask("analysis", "Task 1", {}),
        agentCoordinator.createTask("reasoning", "Task 2", {}),
        agentCoordinator.createTask("documentation", "Task 3", {}),
      ];

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const metrics = agentCoordinator.getMetrics();
      expect(metrics.completedTasks).toBe(3);
    });

    it("should handle task dependencies correctly", async () => {
      await agentCoordinator.start();

      // Create parent task
      const parentTask = agentCoordinator.createTask(
        "parent",
        "Parent task",
        {},
      );

      // Create child tasks
      agentCoordinator.createTask(
        "child1",
        "Child 1",
        {},
        "medium",
        parentTask.id,
      );
      agentCoordinator.createTask(
        "child2",
        "Child 2",
        {},
        "medium",
        parentTask.id,
      );

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedParent = agentCoordinator.getTask(parentTask.id);

      // Parent should have subtask references
      expect(updatedParent?.subtaskIds.length).toBe(2);
    });

    it("should generate and use dynamic agents", async () => {
      await agentCoordinator.start();

      // Generate a specialized agent
      const _agent = agentCoordinator.generateAgent({
        specializationId: "test-specialist",
        specializationName: "Test Specialist",
        description: "A test specialist agent",
        taskDomain: "testing",
        capabilities: ["testing", "validation"],
        tools: ["bash", "read"],
        workflowPatterns: ["test", "validate"],
        constraints: [],
      });

      // Create a task that matches the specialist
      agentCoordinator.createTask("testing", "Test task for specialist", {});

      await new Promise((resolve) => setTimeout(resolve, 300));

      const metrics = agentCoordinator.getMetrics();
      expect(metrics.completedTasks).toBeGreaterThan(0);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should continue operation after component errors", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      // Record some errors
      telemetryMonitor.recordError("test", "Test error 1");
      telemetryMonitor.recordError("test", "Test error 2");

      // System should continue running
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(sys6Bridge.getState().running).toBe(true);
      expect(agentCoordinator.getState().running).toBe(true);

      // Errors should be tracked
      const errorMetric = telemetryMonitor.getMetric("errors_total");
      expect(
        errorMetric?.dataPoints[errorMetric.dataPoints.length - 1].value,
      ).toBe(2);
    });

    it("should track and report system health after errors", async () => {
      await telemetryMonitor.start();

      // Generate many errors to affect health
      for (let i = 0; i < 20; i++) {
        telemetryMonitor.recordError("test", "Error");
      }
      telemetryMonitor.recordMessageProcessed(100);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const health = telemetryMonitor.getHealthStatus();

      // Error rate component should show degraded/unhealthy
      const errorComponent = health.components.find(
        (c) => c.name === "error_rate",
      );
      expect(["degraded", "unhealthy"]).toContain(errorComponent?.status);
    });
  });

  describe("Message Processing Integration", () => {
    it("should process messages through the cognitive system", async () => {
      await sys6Bridge.start();

      const response = await sys6Bridge.processMessage("Hello, system!");

      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });

    it("should update telemetry during message processing", async () => {
      await Promise.all([sys6Bridge.start(), telemetryMonitor.start()]);

      // Process a message
      await sys6Bridge.processMessage("Test message");

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Telemetry should have recorded the activity
      const snapshot = telemetryMonitor.getSnapshot();
      expect(snapshot.metrics["cognitive_steps_total"]).toBeGreaterThan(0);
    });
  });

  describe("Prometheus Export Integration", () => {
    it("should export comprehensive metrics in Prometheus format", async () => {
      await Promise.all([
        sys6Bridge.start(),
        agentCoordinator.start(),
        telemetryMonitor.start(),
      ]);

      // Generate some activity
      agentCoordinator.createTask("test", "Test task", {});
      await new Promise((resolve) => setTimeout(resolve, 300));

      const prometheus = telemetryMonitor.exportPrometheus();

      // Should include all metric types
      expect(prometheus).toContain("cognitive_cycles_total");
      expect(prometheus).toContain("cognitive_steps_total");
      expect(prometheus).toContain("system_memory_usage_bytes");
      expect(prometheus).toContain("# HELP");
      expect(prometheus).toContain("# TYPE");
    });
  });

  describe("Performance Under Load", () => {
    it("should handle high task volume", async () => {
      await agentCoordinator.start();

      // Create many tasks
      for (let i = 0; i < 20; i++) {
        agentCoordinator.createTask(`task-${i}`, `Task ${i}`, {});
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const metrics = agentCoordinator.getMetrics();
      // Should complete at least half the tasks within the timeout
      expect(metrics.completedTasks).toBeGreaterThanOrEqual(5);
    });

    it("should maintain stable memory usage during extended operation", async () => {
      await Promise.all([sys6Bridge.start(), telemetryMonitor.start()]);

      // Record initial memory
      const initialMemory = process.memoryUsage().heapUsed;

      // Run for a while
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check memory hasn't grown excessively
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;

      // Memory should not grow more than 50% during short operation
      expect(memoryGrowth).toBeLessThan(0.5);
    });
  });
});

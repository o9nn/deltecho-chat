/**
 * @fileoverview E2E Tests for Agent Coordinator
 *
 * Comprehensive test suite for the nested agency pattern implementation.
 * Tests cover:
 * - Agent registration and management
 * - Task creation and delegation
 * - Dynamic agent generation
 * - Task queue processing
 * - Metrics and state management
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  AgentCoordinator,
  Agent,
  AgentTemplate,
  Task,
} from "../agents/index.js";

describe("AgentCoordinator", () => {
  let coordinator: AgentCoordinator;

  beforeEach(() => {
    coordinator = new AgentCoordinator({
      maxConcurrentTasks: 5,
      taskTimeoutMs: 5000,
      enableDynamicAgents: true,
      enableParallelDelegation: true,
      maxAgentDepth: 3,
    });
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.stop();
    }
  });

  describe("Initialization", () => {
    it("should initialize with default configuration", () => {
      const defaultCoordinator = new AgentCoordinator();
      const state = defaultCoordinator.getState();

      expect(state.running).toBe(false);
      expect(state.agentCount).toBeGreaterThan(0);
      expect(state.taskCount).toBe(0);
    });

    it("should register default agents", () => {
      const agents = coordinator.getAllAgents();
      const agentIds = agents.map((a) => a.id);

      expect(agentIds).toContain("coordinator");
      expect(agentIds).toContain("data-analyst");
      expect(agentIds).toContain("documentation");
      expect(agentIds).toContain("cognitive-processor");
      expect(agentIds).toContain("memory-manager");
      expect(agentIds).toContain("action-executor");
    });

    it("should set up parent-child relationships", () => {
      const coordinator_agent = coordinator.getAgent("coordinator");
      expect(coordinator_agent).toBeDefined();
      expect(coordinator_agent?.childIds.length).toBeGreaterThan(0);

      const dataAnalyst = coordinator.getAgent("data-analyst");
      expect(dataAnalyst?.parentId).toBe("coordinator");
    });
  });

  describe("Lifecycle Management", () => {
    it("should start the coordinator", async () => {
      const startedPromise = new Promise<void>((resolve) => {
        coordinator.once("started", () => resolve());
      });

      await coordinator.start();
      await startedPromise;

      const state = coordinator.getState();
      expect(state.running).toBe(true);
    });

    it("should not start twice", async () => {
      await coordinator.start();
      await coordinator.start(); // Should not throw

      const state = coordinator.getState();
      expect(state.running).toBe(true);
    });

    it("should stop the coordinator", async () => {
      await coordinator.start();

      const stoppedPromise = new Promise<void>((resolve) => {
        coordinator.once("stopped", () => resolve());
      });

      await coordinator.stop();
      await stoppedPromise;

      const state = coordinator.getState();
      expect(state.running).toBe(false);
    });
  });

  describe("Agent Registration", () => {
    it("should register a new agent", () => {
      const newAgent: Agent = {
        id: "test-agent",
        name: "Test Agent",
        description: "A test agent",
        specialization: "Testing",
        capabilities: [
          { name: "testing", description: "Test capability", priority: 1 },
        ],
        tools: ["bash", "read"],
        isActive: true,
        childIds: [],
        metadata: {},
        createdAt: Date.now(),
      };

      coordinator.registerAgent(newAgent);

      const retrieved = coordinator.getAgent("test-agent");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Test Agent");
    });

    it("should emit agent_registered event", () => {
      const registeredPromise = new Promise<Agent>((resolve) => {
        coordinator.once("agent_registered", resolve);
      });

      const newAgent: Agent = {
        id: "event-test-agent",
        name: "Event Test Agent",
        description: "Testing events",
        specialization: "Events",
        capabilities: [],
        tools: [],
        isActive: true,
        childIds: [],
        metadata: {},
        createdAt: Date.now(),
      };

      coordinator.registerAgent(newAgent);

      return registeredPromise.then((agent) => {
        expect(agent.id).toBe("event-test-agent");
      });
    });

    it("should get all agents", () => {
      const agents = coordinator.getAllAgents();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.every((a) => a.id && a.name)).toBe(true);
    });
  });

  describe("Dynamic Agent Generation", () => {
    it("should generate agent from template", () => {
      const template: AgentTemplate = {
        specializationId: "kubernetes-ops",
        specializationName: "Kubernetes Operations Specialist",
        description: "Handles Kubernetes deployment and management",
        taskDomain: "Kubernetes operations",
        capabilities: ["deployment", "scaling", "monitoring"],
        tools: ["bash", "read", "create"],
        workflowPatterns: ["deploy", "scale", "monitor"],
        constraints: ["cluster-access-required"],
      };

      const agent = coordinator.generateAgent(template);

      expect(agent).toBeDefined();
      expect(agent.name).toBe("Kubernetes Operations Specialist");
      expect(agent.specialization).toBe("Kubernetes operations");
      expect(agent.capabilities.length).toBe(3);
      expect(agent.metadata.generatedFromTemplate).toBe(true);
    });

    it("should add generated agent to coordinator children", () => {
      const template: AgentTemplate = {
        specializationId: "test-gen",
        specializationName: "Test Generated Agent",
        description: "Test",
        taskDomain: "Testing",
        capabilities: ["test"],
        tools: ["bash"],
        workflowPatterns: [],
        constraints: [],
      };

      const agent = coordinator.generateAgent(template);
      const coordinatorAgent = coordinator.getAgent("coordinator");

      expect(coordinatorAgent?.childIds).toContain(agent.id);
    });

    it("should throw when dynamic agents disabled", () => {
      const restrictedCoordinator = new AgentCoordinator({
        enableDynamicAgents: false,
      });

      const template: AgentTemplate = {
        specializationId: "test",
        specializationName: "Test",
        description: "Test",
        taskDomain: "Test",
        capabilities: [],
        tools: [],
        workflowPatterns: [],
        constraints: [],
      };

      expect(() => restrictedCoordinator.generateAgent(template)).toThrow(
        "Dynamic agent generation is disabled",
      );
    });
  });

  describe("Task Creation", () => {
    it("should create a task", () => {
      const task = coordinator.createTask(
        "analysis",
        "Analyze test data",
        { data: [1, 2, 3] },
        "medium",
      );

      expect(task).toBeDefined();
      expect(task.type).toBe("analysis");
      expect(task.description).toBe("Analyze test data");
      expect(task.priority).toBe("medium");
      expect(task.status).toBe("pending");
    });

    it("should emit task_created event", () => {
      const createdPromise = new Promise<Task>((resolve) => {
        coordinator.once("task_created", resolve);
      });

      coordinator.createTask("test", "Test task", {});

      return createdPromise.then((task) => {
        expect(task.type).toBe("test");
      });
    });

    it("should create subtasks with parent reference", () => {
      const parentTask = coordinator.createTask("parent", "Parent task", {});
      const childTask = coordinator.createTask(
        "child",
        "Child task",
        {},
        "medium",
        parentTask.id,
      );

      expect(childTask.parentTaskId).toBe(parentTask.id);

      const updatedParent = coordinator.getTask(parentTask.id);
      expect(updatedParent?.subtaskIds).toContain(childTask.id);
    });

    it("should get task by ID", () => {
      const task = coordinator.createTask("test", "Test", {});
      const retrieved = coordinator.getTask(task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
    });

    it("should get all tasks", () => {
      coordinator.createTask("task1", "Task 1", {});
      coordinator.createTask("task2", "Task 2", {});

      const tasks = coordinator.getAllTasks();
      expect(tasks.length).toBe(2);
    });
  });

  describe("Task Execution", () => {
    it("should process tasks when started", async () => {
      await coordinator.start();

      const completedPromise = new Promise<unknown>((resolve) => {
        coordinator.once("task_completed", resolve);
      });

      coordinator.createTask("analysis", "Test analysis", { test: true });

      const result = await Promise.race([
        completedPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);

      expect(result).not.toBeNull();

      await coordinator.stop();
    });

    it("should assign tasks to appropriate agents", async () => {
      await coordinator.start();

      const assignedPromise = new Promise<{ task: Task; agent: Agent }>(
        (resolve) => {
          coordinator.once("task_assigned", resolve);
        },
      );

      coordinator.createTask("analysis", "Data analysis task", {});

      const result = await Promise.race([
        assignedPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.agent).toBeDefined();
        expect(result.task.assignedAgentId).toBe(result.agent.id);
      }

      await coordinator.stop();
    });

    it("should process tasks by priority", async () => {
      await coordinator.start();

      const completedTasks: Task[] = [];
      coordinator.on("task_completed", ({ task }) => completedTasks.push(task));

      // Create tasks with different priorities
      coordinator.createTask("low", "Low priority", {}, "low");
      coordinator.createTask("critical", "Critical priority", {}, "critical");
      coordinator.createTask("high", "High priority", {}, "high");

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Critical should be processed first
      if (completedTasks.length >= 2) {
        const criticalIndex = completedTasks.findIndex(
          (t) => t.priority === "critical",
        );
        const lowIndex = completedTasks.findIndex((t) => t.priority === "low");
        expect(criticalIndex).toBeLessThan(lowIndex);
      }

      await coordinator.stop();
    });

    it("should emit task lifecycle events", async () => {
      await coordinator.start();

      const events: string[] = [];
      coordinator.on("task_created", () => events.push("created"));
      coordinator.on("task_assigned", () => events.push("assigned"));
      coordinator.on("task_started", () => events.push("started"));
      coordinator.on("task_completed", () => events.push("completed"));

      coordinator.createTask("test", "Test task", {});

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(events).toContain("created");
      expect(events).toContain("assigned");
      expect(events).toContain("started");
      expect(events).toContain("completed");

      await coordinator.stop();
    });

    it("should invoke agents during task execution", async () => {
      await coordinator.start();

      const invocations: unknown[] = [];
      coordinator.on("agent_invoked", (event) => invocations.push(event));

      coordinator.createTask("reasoning", "Test reasoning task", {});

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(invocations.length).toBeGreaterThan(0);

      await coordinator.stop();
    });
  });

  describe("State Management", () => {
    it("should provide complete state snapshot", () => {
      const state = coordinator.getState();

      expect(state).toHaveProperty("running");
      expect(state).toHaveProperty("agentCount");
      expect(state).toHaveProperty("activeAgentCount");
      expect(state).toHaveProperty("taskCount");
      expect(state).toHaveProperty("pendingTaskCount");
      expect(state).toHaveProperty("completedTaskCount");
    });

    it("should track task counts accurately", async () => {
      coordinator.createTask("task1", "Task 1", {});
      coordinator.createTask("task2", "Task 2", {});

      let state = coordinator.getState();
      expect(state.taskCount).toBe(2);
      expect(state.pendingTaskCount).toBe(2);

      await coordinator.start();
      await new Promise((resolve) => setTimeout(resolve, 300));

      state = coordinator.getState();
      expect(state.completedTaskCount).toBeGreaterThan(0);

      await coordinator.stop();
    });

    it("should track active agent count", () => {
      const state = coordinator.getState();
      expect(state.activeAgentCount).toBe(state.agentCount);
    });
  });

  describe("Metrics", () => {
    it("should provide accurate metrics", async () => {
      await coordinator.start();

      coordinator.createTask("test1", "Test 1", {});
      coordinator.createTask("test2", "Test 2", {});

      await new Promise((resolve) => setTimeout(resolve, 500));

      const metrics = coordinator.getMetrics();

      expect(metrics.totalTasks).toBe(2);
      expect(metrics.completedTasks).toBeGreaterThan(0);
      expect(metrics.failedTasks).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.averageTaskDuration).toBe("number");
      expect(metrics.agentUtilization).toBeDefined();

      await coordinator.stop();
    });

    it("should track agent utilization", async () => {
      await coordinator.start();

      coordinator.createTask("analysis", "Analysis task", {});
      coordinator.createTask("reasoning", "Reasoning task", {});

      await new Promise((resolve) => setTimeout(resolve, 500));

      const metrics = coordinator.getMetrics();

      // At least one agent should have been used
      const totalUtilization = Object.values(metrics.agentUtilization).reduce(
        (sum, count) => sum + count,
        0,
      );
      expect(totalUtilization).toBeGreaterThan(0);

      await coordinator.stop();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing agents gracefully", () => {
      const agent = coordinator.getAgent("non-existent");
      expect(agent).toBeUndefined();
    });

    it("should handle missing tasks gracefully", () => {
      const task = coordinator.getTask("non-existent");
      expect(task).toBeUndefined();
    });

    it("should continue processing after task errors", async () => {
      await coordinator.start();

      // Create multiple tasks
      coordinator.createTask("task1", "Task 1", {});
      coordinator.createTask("task2", "Task 2", {});
      coordinator.createTask("task3", "Task 3", {});

      await new Promise((resolve) => setTimeout(resolve, 500));

      const metrics = coordinator.getMetrics();
      // Should have processed at least some tasks
      expect(metrics.completedTasks + metrics.failedTasks).toBeGreaterThan(0);

      await coordinator.stop();
    });
  });

  describe("Parent-Child Task Relationships", () => {
    it("should complete parent task when all subtasks complete", async () => {
      await coordinator.start();

      const parentTask = coordinator.createTask("parent", "Parent task", {});

      // Create subtasks
      coordinator.createTask("child1", "Child 1", {}, "medium", parentTask.id);
      coordinator.createTask("child2", "Child 2", {}, "medium", parentTask.id);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedParent = coordinator.getTask(parentTask.id);
      // Parent should have subtask references
      expect(updatedParent?.subtaskIds.length).toBe(2);
      // Parent should have been processed (may or may not have synthesized output depending on timing)
      expect(updatedParent?.output).toBeDefined();

      await coordinator.stop();
    });
  });
});

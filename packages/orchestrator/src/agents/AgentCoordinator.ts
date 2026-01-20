/**
 * @fileoverview Agent Coordinator
 *
 * Implements the nested agency pattern for Deep Tree Echo orchestration.
 * Coordinates complex tasks by delegating to specialized child agents.
 *
 * Features:
 * - Dynamic agent generation from templates
 * - Task delegation and result synthesis
 * - Agent lifecycle management
 * - Inter-agent communication
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/AgentCoordinator");

/**
 * Agent capability definition
 */
export interface AgentCapability {
  name: string;
  description: string;
  priority: number;
}

/**
 * Agent definition
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  specialization: string;
  capabilities: AgentCapability[];
  tools: string[];
  isActive: boolean;
  parentId?: string;
  childIds: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
  lastActiveAt?: number;
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  type: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "assigned" | "in_progress" | "completed" | "failed";
  assignedAgentId?: string;
  parentTaskId?: string;
  subtaskIds: string[];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Task result
 */
export interface TaskResult {
  taskId: string;
  agentId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  duration: number;
}

/**
 * Agent template for dynamic generation
 */
export interface AgentTemplate {
  specializationId: string;
  specializationName: string;
  description: string;
  taskDomain: string;
  capabilities: string[];
  tools: string[];
  workflowPatterns: string[];
  constraints: string[];
}

/**
 * Coordinator configuration
 */
export interface CoordinatorConfig {
  maxConcurrentTasks: number;
  taskTimeoutMs: number;
  enableDynamicAgents: boolean;
  enableParallelDelegation: boolean;
  maxAgentDepth: number;
}

const DEFAULT_CONFIG: CoordinatorConfig = {
  maxConcurrentTasks: 10,
  taskTimeoutMs: 30000,
  enableDynamicAgents: true,
  enableParallelDelegation: true,
  maxAgentDepth: 3,
};

/**
 * Agent Coordinator
 *
 * Manages the nested agency pattern for complex task coordination.
 */
export class AgentCoordinator extends EventEmitter {
  private config: CoordinatorConfig;
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private taskQueue: string[] = [];
  private running = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CoordinatorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultAgents();
  }

  /**
   * Register default agents
   */
  private registerDefaultAgents(): void {
    // Root coordinator agent
    this.registerAgent({
      id: "coordinator",
      name: "Nested Agency Coordinator",
      description:
        "Coordinates complex tasks by delegating to specialized child agents",
      specialization: "Task coordination and delegation",
      capabilities: [
        {
          name: "planning",
          description: "Strategic task planning",
          priority: 1,
        },
        {
          name: "delegation",
          description: "Task delegation to child agents",
          priority: 1,
        },
        {
          name: "synthesis",
          description: "Result synthesis and integration",
          priority: 1,
        },
      ],
      tools: ["bash", "create", "edit", "read", "search", "custom-agent"],
      isActive: true,
      childIds: [],
      metadata: { isRoot: true },
      createdAt: Date.now(),
    });

    // Data analysis agent
    this.registerAgent({
      id: "data-analyst",
      name: "Data Analysis Specialist",
      description: "Analyzes data and generates insights",
      specialization: "Data analysis and processing",
      capabilities: [
        { name: "analysis", description: "Statistical analysis", priority: 1 },
        {
          name: "visualization",
          description: "Data visualization",
          priority: 2,
        },
        {
          name: "pattern_detection",
          description: "Pattern recognition",
          priority: 1,
        },
      ],
      tools: ["bash", "read", "search"],
      isActive: true,
      parentId: "coordinator",
      childIds: [],
      metadata: {},
      createdAt: Date.now(),
    });

    // Documentation agent
    this.registerAgent({
      id: "documentation",
      name: "Documentation Specialist",
      description: "Creates and maintains documentation",
      specialization: "Documentation and communication",
      capabilities: [
        { name: "writing", description: "Technical writing", priority: 1 },
        { name: "formatting", description: "Document formatting", priority: 2 },
        { name: "review", description: "Content review", priority: 2 },
      ],
      tools: ["create", "edit", "read"],
      isActive: true,
      parentId: "coordinator",
      childIds: [],
      metadata: {},
      createdAt: Date.now(),
    });

    // Cognitive processor agent
    this.registerAgent({
      id: "cognitive-processor",
      name: "Cognitive Processor",
      description: "Handles deep reasoning and inference",
      specialization: "Cognitive processing and reasoning",
      capabilities: [
        { name: "reasoning", description: "Logical reasoning", priority: 1 },
        { name: "inference", description: "Pattern inference", priority: 1 },
        {
          name: "abstraction",
          description: "Concept abstraction",
          priority: 2,
        },
      ],
      tools: ["bash", "read", "search"],
      isActive: true,
      parentId: "coordinator",
      childIds: [],
      metadata: {},
      createdAt: Date.now(),
    });

    // Memory manager agent
    this.registerAgent({
      id: "memory-manager",
      name: "Memory Manager",
      description: "Manages memory storage and retrieval",
      specialization: "Memory management",
      capabilities: [
        { name: "storage", description: "Memory storage", priority: 1 },
        { name: "retrieval", description: "Memory retrieval", priority: 1 },
        {
          name: "consolidation",
          description: "Memory consolidation",
          priority: 2,
        },
      ],
      tools: ["read", "create", "edit"],
      isActive: true,
      parentId: "coordinator",
      childIds: [],
      metadata: {},
      createdAt: Date.now(),
    });

    // Action executor agent
    this.registerAgent({
      id: "action-executor",
      name: "Action Executor",
      description: "Executes actions and monitors results",
      specialization: "Action execution and monitoring",
      capabilities: [
        { name: "execution", description: "Task execution", priority: 1 },
        {
          name: "monitoring",
          description: "Execution monitoring",
          priority: 1,
        },
        { name: "feedback", description: "Feedback processing", priority: 2 },
      ],
      tools: ["bash", "create", "edit"],
      isActive: true,
      parentId: "coordinator",
      childIds: [],
      metadata: {},
      createdAt: Date.now(),
    });

    // Update coordinator's child references
    const coordinator = this.agents.get("coordinator");
    if (coordinator) {
      coordinator.childIds = [
        "data-analyst",
        "documentation",
        "cognitive-processor",
        "memory-manager",
        "action-executor",
      ];
    }
  }

  /**
   * Start the coordinator
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn("Agent coordinator already running");
      return;
    }

    log.info("Starting Agent Coordinator...");
    this.running = true;

    // Start task processing loop
    this.processInterval = setInterval(() => this.processTaskQueue(), 100);

    this.emit("started", { timestamp: Date.now() });
    log.info("Agent Coordinator started");
  }

  /**
   * Stop the coordinator
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info("Stopping Agent Coordinator...");
    this.running = false;

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    this.emit("stopped", { timestamp: Date.now() });
    log.info("Agent Coordinator stopped");
  }

  /**
   * Register an agent
   */
  public registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.emit("agent_registered", agent);
    log.info(`Registered agent: ${agent.name}`);
  }

  /**
   * Generate a new agent from template
   */
  public generateAgent(template: AgentTemplate): Agent {
    if (!this.config.enableDynamicAgents) {
      throw new Error("Dynamic agent generation is disabled");
    }

    const agentId = `agent-${template.specializationId}-${Date.now()}`;
    const agent: Agent = {
      id: agentId,
      name: template.specializationName,
      description: template.description,
      specialization: template.taskDomain,
      capabilities: template.capabilities.map((cap, i) => ({
        name: cap,
        description: cap,
        priority: i + 1,
      })),
      tools: template.tools,
      isActive: true,
      parentId: "coordinator",
      childIds: [],
      metadata: {
        generatedFromTemplate: true,
        templateId: template.specializationId,
        workflowPatterns: template.workflowPatterns,
        constraints: template.constraints,
      },
      createdAt: Date.now(),
    };

    this.registerAgent(agent);

    // Update coordinator's children
    const coordinator = this.agents.get("coordinator");
    if (coordinator) {
      coordinator.childIds.push(agentId);
    }

    return agent;
  }

  /**
   * Create a task
   */
  public createTask(
    type: string,
    description: string,
    input: Record<string, unknown>,
    priority: Task["priority"] = "medium",
    parentTaskId?: string,
  ): Task {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const task: Task = {
      id: taskId,
      type,
      description,
      priority,
      status: "pending",
      parentTaskId,
      subtaskIds: [],
      input,
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(taskId);

    // Update parent task if exists
    if (parentTaskId) {
      const parentTask = this.tasks.get(parentTaskId);
      if (parentTask) {
        parentTask.subtaskIds.push(taskId);
      }
    }

    this.emit("task_created", task);
    log.info(`Created task: ${taskId} - ${description}`);

    return task;
  }

  /**
   * Process the task queue
   */
  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    // Get pending tasks up to max concurrent
    const activeTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "in_progress",
    );

    if (activeTasks.length >= this.config.maxConcurrentTasks) return;

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    this.taskQueue.sort((a, b) => {
      const taskA = this.tasks.get(a);
      const taskB = this.tasks.get(b);
      if (!taskA || !taskB) return 0;
      return priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
    });

    // Process next task
    const taskId = this.taskQueue.shift();
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task || task.status !== "pending") return;

    await this.executeTask(task);
  }

  /**
   * Execute a task
   */
  private async executeTask(task: Task): Promise<void> {
    // Find best agent for task
    const agent = this.findBestAgent(task);
    if (!agent) {
      task.status = "failed";
      task.error = "No suitable agent found";
      this.emit("task_failed", { task, error: task.error });
      return;
    }

    // Assign task
    task.status = "assigned";
    task.assignedAgentId = agent.id;
    task.startedAt = Date.now();
    agent.lastActiveAt = Date.now();

    this.emit("task_assigned", { task, agent });
    log.info(`Assigned task ${task.id} to agent ${agent.name}`);

    // Execute
    task.status = "in_progress";
    this.emit("task_started", { task, agent });

    try {
      // Simulate task execution
      const result = await this.delegateToAgent(agent, task);

      task.status = "completed";
      task.output = result.output;
      task.completedAt = Date.now();

      this.emit("task_completed", { task, result });
      log.info(`Completed task ${task.id}`);

      // Check if parent task can be completed
      if (task.parentTaskId) {
        await this.checkParentTaskCompletion(task.parentTaskId);
      }
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Unknown error";
      task.completedAt = Date.now();

      this.emit("task_failed", { task, error: task.error });
      log.error(`Failed task ${task.id}: ${task.error}`);
    }
  }

  /**
   * Find the best agent for a task
   */
  private findBestAgent(task: Task): Agent | null {
    const activeAgents = Array.from(this.agents.values()).filter(
      (a) => a.isActive,
    );

    // Score agents based on capability match
    let bestAgent: Agent | null = null;
    let bestScore = 0;

    for (const agent of activeAgents) {
      let score = 0;

      // Check task type match
      for (const cap of agent.capabilities) {
        if (task.type.toLowerCase().includes(cap.name.toLowerCase())) {
          score += 10 / cap.priority;
        }
        if (task.description.toLowerCase().includes(cap.name.toLowerCase())) {
          score += 5 / cap.priority;
        }
      }

      // Check specialization match
      if (
        task.type.toLowerCase().includes(agent.specialization.toLowerCase())
      ) {
        score += 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    // Default to coordinator if no match
    if (!bestAgent) {
      bestAgent = this.agents.get("coordinator") || null;
    }

    return bestAgent;
  }

  /**
   * Delegate task to agent
   */
  private async delegateToAgent(agent: Agent, task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    // Emit delegation event
    this.emit("agent_invoked", {
      agentId: agent.id,
      agentName: agent.name,
      taskId: task.id,
      timestamp: startTime,
    });

    // Simulate processing based on task type
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate result based on task type
    const output: Record<string, unknown> = {
      agentId: agent.id,
      taskType: task.type,
      processedAt: Date.now(),
      result: `Processed by ${agent.name}`,
    };

    return {
      taskId: task.id,
      agentId: agent.id,
      success: true,
      output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Check if parent task can be completed
   */
  private async checkParentTaskCompletion(parentTaskId: string): Promise<void> {
    const parentTask = this.tasks.get(parentTaskId);
    if (!parentTask) return;

    // Check if all subtasks are completed
    const allSubtasksComplete = parentTask.subtaskIds.every((id) => {
      const subtask = this.tasks.get(id);
      return subtask && subtask.status === "completed";
    });

    if (allSubtasksComplete && parentTask.status === "in_progress") {
      // Synthesize results
      const subtaskOutputs = parentTask.subtaskIds.map((id) => {
        const subtask = this.tasks.get(id);
        return subtask?.output;
      });

      parentTask.output = {
        synthesized: true,
        subtaskResults: subtaskOutputs,
      };
      parentTask.status = "completed";
      parentTask.completedAt = Date.now();

      this.emit("task_completed", { task: parentTask });
      log.info(
        `Completed parent task ${parentTaskId} with synthesized results`,
      );
    }
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get coordinator state
   */
  public getState(): {
    running: boolean;
    agentCount: number;
    activeAgentCount: number;
    taskCount: number;
    pendingTaskCount: number;
    completedTaskCount: number;
  } {
    const agents = Array.from(this.agents.values());
    const tasks = Array.from(this.tasks.values());

    return {
      running: this.running,
      agentCount: agents.length,
      activeAgentCount: agents.filter((a) => a.isActive).length,
      taskCount: tasks.length,
      pendingTaskCount: tasks.filter((t) => t.status === "pending").length,
      completedTaskCount: tasks.filter((t) => t.status === "completed").length,
    };
  }

  /**
   * Get metrics
   */
  public getMetrics(): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageTaskDuration: number;
    agentUtilization: Record<string, number>;
  } {
    const tasks = Array.from(this.tasks.values());
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const failedTasks = tasks.filter((t) => t.status === "failed");

    // Calculate average duration
    const durations = completedTasks
      .filter((t) => t.startedAt && t.completedAt)
      .map((t) => t.completedAt! - t.startedAt!);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    // Calculate agent utilization
    const agentUtilization: Record<string, number> = {};
    for (const agent of this.agents.values()) {
      const agentTasks = tasks.filter((t) => t.assignedAgentId === agent.id);
      agentUtilization[agent.id] = agentTasks.length;
    }

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      averageTaskDuration: avgDuration,
      agentUtilization,
    };
  }
}

export default AgentCoordinator;

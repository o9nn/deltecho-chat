import { getLogger } from "deep-tree-echo-core";
import { EventEmitter } from "events";

const log = getLogger("deep-tree-echo-orchestrator/TaskScheduler");

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Task definition
 */
export interface ScheduledTask {
  id: string;
  name: string;
  cronExpression?: string;
  interval?: number; // milliseconds
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
  errorCount: number;
  lastError?: string;
  status: TaskStatus;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Task execution result
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  error?: string;
}

/**
 * Scheduler configuration
 */
export interface TaskSchedulerConfig {
  checkInterval?: number; // How often to check for due tasks (ms)
  maxConcurrentTasks?: number;
  defaultTimeout?: number;
  persistTasks?: boolean;
}

const DEFAULT_CONFIG: TaskSchedulerConfig = {
  checkInterval: 1000, // Check every second
  maxConcurrentTasks: 5,
  defaultTimeout: 60000, // 1 minute
  persistTasks: false,
};

/**
 * Parse cron expression and get next run time
 * Supports: second minute hour day-of-month month day-of-week
 */
function parseCronExpression(
  expression: string,
  fromDate: Date = new Date(),
): Date | null {
  const parts = expression.split(" ");
  if (parts.length !== 6) {
    log.warn(`Invalid cron expression: ${expression}`);
    return null;
  }

  const [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Simple implementation - find next matching time
  const next = new Date(fromDate);
  next.setMilliseconds(0);
  next.setSeconds(next.getSeconds() + 1); // Start from next second

  // Try to find next matching time within 1 year
  const maxIterations = 366 * 24 * 60 * 60; // 1 year in seconds

  for (let i = 0; i < maxIterations; i++) {
    if (
      matchesCronField(next.getSeconds(), second) &&
      matchesCronField(next.getMinutes(), minute) &&
      matchesCronField(next.getHours(), hour) &&
      matchesCronField(next.getDate(), dayOfMonth) &&
      matchesCronField(next.getMonth() + 1, month) &&
      matchesCronField(next.getDay(), dayOfWeek)
    ) {
      return next;
    }
    next.setSeconds(next.getSeconds() + 1);
  }

  return null;
}

/**
 * Check if a value matches a cron field
 */
function matchesCronField(value: number, field: string): boolean {
  if (field === "*") return true;

  // Handle step values (*/n)
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    return value % step === 0;
  }

  // Handle ranges (n-m)
  if (field.includes("-")) {
    const [start, end] = field.split("-").map((n) => parseInt(n, 10));
    return value >= start && value <= end;
  }

  // Handle lists (n,m,o)
  if (field.includes(",")) {
    const values = field.split(",").map((n) => parseInt(n, 10));
    return values.includes(value);
  }

  // Handle single value
  return parseInt(field, 10) === value;
}

/**
 * Task scheduler for cron-like background operations
 * Enables proactive messaging and scheduled check-ins
 */
export class TaskScheduler extends EventEmitter {
  private config: TaskSchedulerConfig;
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private checkTimer: NodeJS.Timeout | null = null;
  private runningTasks: Set<string> = new Set();
  private running: boolean = false;
  private taskIdCounter: number = 0;

  constructor(config: Partial<TaskSchedulerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the task scheduler
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn("Task scheduler is already running");
      return;
    }

    log.info("Starting task scheduler...");

    // Start the check loop
    this.checkTimer = setInterval(() => {
      this.checkAndRunTasks();
    }, this.config.checkInterval);

    this.running = true;
    log.info("Task scheduler started");
    this.emit("started");
  }

  /**
   * Check for due tasks and run them
   */
  private async checkAndRunTasks(): Promise<void> {
    const now = Date.now();

    for (const [taskId, task] of this.tasks) {
      if (!task.enabled || this.runningTasks.has(taskId)) continue;
      if (this.runningTasks.size >= this.config.maxConcurrentTasks!) continue;

      if (task.nextRun && task.nextRun <= now) {
        this.executeTask(taskId);
      }
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    this.runningTasks.add(taskId);
    task.status = TaskStatus.RUNNING;

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      log.info(`Executing task: ${task.name} (${taskId})`);

      // Execute with timeout
      const timeout = task.timeout || this.config.defaultTimeout!;
      await Promise.race([
        task.handler(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Task timeout")), timeout),
        ),
      ]);

      success = true;
      task.status = TaskStatus.COMPLETED;
      task.runCount++;
      log.info(`Task completed: ${task.name}`);
    } catch (err) {
      error = (err as Error).message;
      task.status = TaskStatus.FAILED;
      task.errorCount++;
      task.lastError = error;
      log.error(`Task failed: ${task.name}`, err);
    } finally {
      this.runningTasks.delete(taskId);
      task.lastRun = startTime;

      // Calculate next run time
      this.scheduleNextRun(task);

      const result: TaskResult = {
        taskId,
        success,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        error,
      };

      this.emit("task_completed", result);
    }
  }

  /**
   * Schedule next run for a task
   */
  private scheduleNextRun(task: ScheduledTask): void {
    if (task.cronExpression) {
      const nextRun = parseCronExpression(task.cronExpression);
      task.nextRun = nextRun ? nextRun.getTime() : undefined;
    } else if (task.interval) {
      task.nextRun = Date.now() + task.interval;
    }
  }

  /**
   * Schedule a new task with cron expression
   */
  public scheduleTask(
    name: string,
    cronExpression: string,
    handler: () => Promise<void>,
    options: Partial<ScheduledTask> = {},
  ): string {
    const taskId = `task_${++this.taskIdCounter}_${Date.now()}`;

    const task: ScheduledTask = {
      id: taskId,
      name,
      cronExpression,
      handler,
      enabled: true,
      runCount: 0,
      errorCount: 0,
      status: TaskStatus.PENDING,
      ...options,
    };

    // Calculate initial next run
    const nextRun = parseCronExpression(cronExpression);
    task.nextRun = nextRun ? nextRun.getTime() : undefined;

    this.tasks.set(taskId, task);
    log.info(
      `Scheduled task: ${name} (${cronExpression}) - next run: ${nextRun?.toISOString()}`,
    );

    this.emit("task_scheduled", { taskId, name, cronExpression });
    return taskId;
  }

  /**
   * Schedule a task with interval
   */
  public scheduleInterval(
    name: string,
    intervalMs: number,
    handler: () => Promise<void>,
    options: Partial<ScheduledTask> = {},
  ): string {
    const taskId = `task_${++this.taskIdCounter}_${Date.now()}`;

    const task: ScheduledTask = {
      id: taskId,
      name,
      interval: intervalMs,
      handler,
      enabled: true,
      runCount: 0,
      errorCount: 0,
      status: TaskStatus.PENDING,
      nextRun: Date.now() + intervalMs,
      ...options,
    };

    this.tasks.set(taskId, task);
    log.info(`Scheduled interval task: ${name} (every ${intervalMs}ms)`);

    this.emit("task_scheduled", { taskId, name, interval: intervalMs });
    return taskId;
  }

  /**
   * Schedule a one-time task
   */
  public scheduleOnce(
    name: string,
    delayMs: number,
    handler: () => Promise<void>,
  ): string {
    const taskId = `task_${++this.taskIdCounter}_${Date.now()}`;

    const task: ScheduledTask = {
      id: taskId,
      name,
      handler: async () => {
        await handler();
        // Remove task after execution
        this.tasks.delete(taskId);
      },
      enabled: true,
      runCount: 0,
      errorCount: 0,
      status: TaskStatus.PENDING,
      nextRun: Date.now() + delayMs,
    };

    this.tasks.set(taskId, task);
    log.info(`Scheduled one-time task: ${name} (in ${delayMs}ms)`);

    return taskId;
  }

  /**
   * Cancel a scheduled task
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = false;
    task.status = TaskStatus.CANCELLED;
    this.tasks.delete(taskId);

    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    log.info(`Cancelled task: ${task.name} (${taskId})`);
    this.emit("task_cancelled", { taskId, name: task.name });
    return true;
  }

  /**
   * Enable a task
   */
  public enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = true;
    task.status = TaskStatus.PENDING;
    this.scheduleNextRun(task);

    log.info(`Enabled task: ${task.name}`);
    return true;
  }

  /**
   * Disable a task
   */
  public disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = false;
    log.info(`Disabled task: ${task.name}`);
    return true;
  }

  /**
   * Run a task immediately
   */
  public async runNow(taskId: string): Promise<TaskResult | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    return new Promise((resolve) => {
      const handler = (result: TaskResult) => {
        if (result.taskId === taskId) {
          this.off("task_completed", handler);
          resolve(result);
        }
      };
      this.on("task_completed", handler);
      this.executeTask(taskId);
    });
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  public getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get running tasks
   */
  public getRunningTasks(): ScheduledTask[] {
    return Array.from(this.runningTasks)
      .map((id) => this.tasks.get(id))
      .filter((t): t is ScheduledTask => !!t);
  }

  /**
   * Stop the task scheduler
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info("Stopping task scheduler...");

    // Clear check timer
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    // Clear all task timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Wait for running tasks to complete (with timeout)
    if (this.runningTasks.size > 0) {
      log.info(
        `Waiting for ${this.runningTasks.size} running tasks to complete...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    this.running = false;
    log.info("Task scheduler stopped");
    this.emit("stopped");
  }

  /**
   * Check if scheduler is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get scheduler statistics
   */
  public getStats(): {
    running: boolean;
    totalTasks: number;
    runningTasks: number;
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      running: this.running,
      totalTasks: tasks.length,
      runningTasks: this.runningTasks.size,
      pendingTasks: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
      completedTasks: tasks.filter((t) => t.status === TaskStatus.COMPLETED)
        .length,
      failedTasks: tasks.filter((t) => t.status === TaskStatus.FAILED).length,
    };
  }
}

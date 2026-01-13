import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TaskScheduler, TaskSchedulerConfig, TaskStatus } from '../scheduler/task-scheduler.js';

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;
  const testConfig: TaskSchedulerConfig = {
    checkInterval: 1000,
    maxConcurrentTasks: 3,
  };

  beforeEach(() => {
    scheduler = new TaskScheduler(testConfig);
  });

  afterEach(async () => {
    await scheduler.stop();
  });

  describe('constructor', () => {
    it('should create scheduler with provided config', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should use default config when not provided', () => {
      const defaultScheduler = new TaskScheduler();
      expect(defaultScheduler).toBeDefined();
    });
  });

  describe('task scheduling', () => {
    it('should schedule a cron task', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const taskId = scheduler.scheduleTask('Test Task', '0 * * * * *', handler);

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_/);

      const task = scheduler.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.name).toBe('Test Task');
      expect(task?.status).toBe(TaskStatus.PENDING);
    });

    it('should schedule an interval task', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const taskId = scheduler.scheduleInterval('Interval Task', 5000, handler);

      expect(taskId).toBeDefined();

      const task = scheduler.getTask(taskId);
      expect(task?.interval).toBe(5000);
    });

    it('should schedule a one-time task', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const taskId = scheduler.scheduleOnce('One Time', 1000, handler);

      expect(taskId).toBeDefined();

      const task = scheduler.getTask(taskId);
      expect(task).toBeDefined();
    });

    it('should cancel a task', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const taskId = scheduler.scheduleTask('Test', '0 * * * * *', handler);

      const cancelled = scheduler.cancelTask(taskId);
      expect(cancelled).toBe(true);

      const task = scheduler.getTask(taskId);
      expect(task).toBeUndefined();
    });

    it('should return false when cancelling non-existent task', () => {
      const cancelled = scheduler.cancelTask('non_existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('task enable/disable', () => {
    it('should enable a task', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const taskId = scheduler.scheduleTask('Test', '0 * * * * *', handler);
      scheduler.disableTask(taskId);

      const enabled = scheduler.enableTask(taskId);
      expect(enabled).toBe(true);

      const task = scheduler.getTask(taskId);
      expect(task?.enabled).toBe(true);
    });

    it('should disable a task', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const taskId = scheduler.scheduleTask('Test', '0 * * * * *', handler);

      const disabled = scheduler.disableTask(taskId);
      expect(disabled).toBe(true);

      const task = scheduler.getTask(taskId);
      expect(task?.enabled).toBe(false);
    });

    it('should return false for non-existent task', () => {
      expect(scheduler.enableTask('non_existent')).toBe(false);
      expect(scheduler.disableTask('non_existent')).toBe(false);
    });
  });

  describe('task retrieval', () => {
    it('should get all tasks', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      scheduler.scheduleTask('Task 1', '0 * * * * *', handler);
      scheduler.scheduleTask('Task 2', '0 * * * * *', handler);

      const tasks = scheduler.getAllTasks();
      expect(tasks).toHaveLength(2);
    });

    it('should return undefined for non-existent task', () => {
      const task = scheduler.getTask('non_existent');
      expect(task).toBeUndefined();
    });

    it('should get running tasks', () => {
      const tasks = scheduler.getRunningTasks();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('start and stop', () => {
    it('should start the scheduler', async () => {
      await scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    it('should stop the scheduler', async () => {
      await scheduler.start();
      await scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should handle multiple start calls', async () => {
      await scheduler.start();
      await scheduler.start(); // Should not throw
      expect(scheduler.isRunning()).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should return scheduler stats', () => {
      const handler = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      scheduler.scheduleTask('Test', '0 * * * * *', handler);

      const stats = scheduler.getStats();

      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('runningTasks');
      expect(stats).toHaveProperty('pendingTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('failedTasks');

      expect(stats.totalTasks).toBe(1);
      expect(stats.pendingTasks).toBe(1);
    });
  });

  describe('events', () => {
    it('should emit started event', (done) => {
      scheduler.on('started', () => {
        done();
      });
      scheduler.start();
    });

    it('should emit stopped event', (done) => {
      scheduler.on('stopped', () => {
        done();
      });
      scheduler.start().then(() => scheduler.stop());
    });

    it('should emit task_scheduled event', (done) => {
      scheduler.on('task_scheduled', (event) => {
        expect(event.taskId).toBeDefined();
        expect(event.name).toBe('Test');
        done();
      });
      scheduler.scheduleTask('Test', '0 * * * * *', async () => {});
    });
  });
});

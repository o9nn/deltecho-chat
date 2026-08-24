import { describe, it, expect, afterEach, jest } from "@jest/globals";
import { ProactiveLoop } from "../proactive-loop.js";
import { TaskScheduler } from "../scheduler/task-scheduler.js";
import {
  attachMemoryLeverSchedule,
  attachProactiveLoop,
  detachProactiveLoop,
  type MemoryLeverRegistrar,
} from "../dte-composition.js";

describe("attachProactiveLoop", () => {
  let loop: ProactiveLoop | undefined;

  afterEach(async () => {
    await detachProactiveLoop(loop);
    loop = undefined;
  });

  it("starts one loop and setProactiveLoop receives that instance", async () => {
    const received: ProactiveLoop[] = [];
    const pipeline = {
      setProactiveLoop: (instance: ProactiveLoop) => {
        received.push(instance);
      },
    };
    loop = new ProactiveLoop({
      cycleIntervalMs: 60_000,
      enableAutonomousGoals: false,
      enableMemoryConsolidation: false,
      enableSelfImageUpdates: false,
      enableTelemetry: false,
    });

    const attached = await attachProactiveLoop(pipeline, loop);

    expect(attached).toBe(loop);
    expect(attached.isRunning()).toBe(true);
    expect(received).toEqual([loop]);

    await detachProactiveLoop(attached);
    expect(loop.isRunning()).toBe(false);
    loop = undefined;
  });
});

describe("attachMemoryLeverSchedule", () => {
  it("invokes the registrar once when the scheduler and path are set", () => {
    const scheduler = new TaskScheduler({ checkInterval: 10_000 });
    const registrar = jest.fn<MemoryLeverRegistrar>().mockReturnValue("task_1");

    const id = attachMemoryLeverSchedule(
      scheduler,
      { storagePath: "/tmp/dte-rag-fixture" },
      registrar,
    );

    expect(id).toBe("task_1");
    expect(registrar).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledWith(scheduler, {
      storagePath: "/tmp/dte-rag-fixture",
    });
  });

  it("does not call the registrar when the path is unset", () => {
    const scheduler = new TaskScheduler({ checkInterval: 10_000 });
    const registrar = jest.fn<MemoryLeverRegistrar>();
    const previous = process.env.DELTECHO_AUTONOMY_STORAGE_PATH;
    delete process.env.DELTECHO_AUTONOMY_STORAGE_PATH;

    try {
      const id = attachMemoryLeverSchedule(scheduler, {}, registrar);
      expect(id).toBeUndefined();
      expect(registrar).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) {
        delete process.env.DELTECHO_AUTONOMY_STORAGE_PATH;
      } else {
        process.env.DELTECHO_AUTONOMY_STORAGE_PATH = previous;
      }
    }
  });
});

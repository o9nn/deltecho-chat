import { ProactiveLoop } from "./proactive-loop.js";
import {
  registerMemoryLeverSchedule,
  resolveStoragePath,
  type MemoryLeverTickOptions,
} from "./memory-lever-schedule.js";
import type { TaskScheduler } from "./scheduler/task-scheduler.js";

export interface ProactiveLoopLike {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface AutonomyPipelineLike {
  setProactiveLoop(loop: ProactiveLoop): void;
}

export type MemoryLeverRegistrar = (
  scheduler: Pick<TaskScheduler, "scheduleInterval">,
  options?: MemoryLeverTickOptions,
) => string | undefined;

/** Process liveness only — does not send DeltaChat messages. */
export async function attachProactiveLoop(
  pipeline: AutonomyPipelineLike,
  loop: ProactiveLoop = new ProactiveLoop(),
): Promise<ProactiveLoop> {
  await loop.start();
  pipeline.setProactiveLoop(loop);
  return loop;
}

export async function detachProactiveLoop(
  loop: ProactiveLoopLike | undefined,
): Promise<void> {
  if (!loop) return;
  await loop.stop();
}

/** Empty or unset path must skip the registrar, not call it. */
export function attachMemoryLeverSchedule(
  scheduler: Pick<TaskScheduler, "scheduleInterval"> | undefined,
  options: MemoryLeverTickOptions = {},
  registrar: MemoryLeverRegistrar = registerMemoryLeverSchedule,
): string | undefined {
  if (!scheduler) return undefined;
  const storagePath = resolveStoragePath(options);
  if (!storagePath) return undefined;
  return registrar(scheduler, { ...options, storagePath });
}

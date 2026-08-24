import { ProactiveLoop } from "./proactive-loop.js";
import {
  registerMemoryLeverSchedule,
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

/**
 * Start one ProactiveLoop and attach it to the autonomy pipeline.
 * This is process liveness only — it does not send DeltaChat messages.
 */
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

/**
 * Register MemoryLever hygiene when a scheduler and a non-empty store path exist.
 * Empty or unset paths skip the registrar entirely.
 */
export function attachMemoryLeverSchedule(
  scheduler: Pick<TaskScheduler, "scheduleInterval"> | undefined,
  options: MemoryLeverTickOptions = {},
  registrar: MemoryLeverRegistrar = registerMemoryLeverSchedule,
): string | undefined {
  if (!scheduler) return undefined;
  const storagePath = (
    options.storagePath ?? process.env.DELTECHO_AUTONOMY_STORAGE_PATH ?? ""
  ).trim();
  if (!storagePath) return undefined;
  return registrar(scheduler, { ...options, storagePath });
}

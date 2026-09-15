import { open, unlink, access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getLogger } from "deep-tree-echo-core";
import { RAG_MEMORY_KEY, RAG_REFLECTION_KEY } from "deep-tree-echo-core/memory";
import {
  MemoryLever,
  MemoryLeverError,
  type MemoryLeverErrorCode,
} from "deep-tree-echo-core/memory/node";
import type { TaskScheduler } from "./scheduler/task-scheduler.js";

const log = getLogger("deep-tree-echo-orchestrator/memory-lever-schedule");

export const MEMORY_LEVER_TASK_NAME = "memory-lever-dream";
export const DEFAULT_MEMORY_LEVER_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const MIN_MEMORY_LEVER_INTERVAL_MS = 60 * 1000;

export type TickSkipReason =
  | MemoryLeverErrorCode
  | "unset_path"
  | "no_rag_keys";

export interface TickLog {
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
}

export interface MemoryLeverTickResult {
  skipped?: TickSkipReason;
  applied: boolean;
  plan?: {
    merges: number;
    contradictions: number;
    prunes: number;
  };
}

export interface MemoryLeverTickOptions {
  storagePath?: string;
  applyEnv?: string;
  intervalMs?: string | number;
  log?: TickLog;
}

function defaultLog(): TickLog {
  return {
    info: (message, extra) => log.info(message, extra),
    warn: (message, extra) => log.warn(message, extra),
  };
}

function skipTick(
  logger: TickLog,
  code: TickSkipReason,
): MemoryLeverTickResult {
  logger.warn(`${MEMORY_LEVER_TASK_NAME} skipped`, { code });
  return { skipped: code, applied: false };
}

function isMemoryLeverApplyEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function resolveMemoryLeverIntervalMs(
  value: string | number | undefined,
): number {
  if (value === undefined || value === "") {
    return DEFAULT_MEMORY_LEVER_INTERVAL_MS;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MEMORY_LEVER_INTERVAL_MS;
  }
  return Math.max(MIN_MEMORY_LEVER_INTERVAL_MS, parsed);
}

export function resolveStoragePath(options: MemoryLeverTickOptions): string {
  return (
    options.storagePath ??
    process.env.DELTECHO_AUTONOMY_STORAGE_PATH ??
    ""
  ).trim();
}

async function hasRagKey(storagePath: string): Promise<boolean> {
  try {
    await access(join(storagePath, `${RAG_MEMORY_KEY}.json`));
    return true;
  } catch {
    return false;
  }
}

async function withApplyLock(
  storagePath: string,
  run: () => Promise<void>,
): Promise<void> {
  const lockPath = join(storagePath, ".lock");
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch {
    throw new MemoryLeverError("locked", `Exclusive lock held: ${lockPath}`);
  }
  try {
    const memoriesPath = join(storagePath, `${RAG_MEMORY_KEY}.json`);
    const reflectionsPath = join(storagePath, `${RAG_REFLECTION_KEY}.json`);
    const stamp = Date.now();
    let memories: string;
    let reflections: string;
    try {
      [memories, reflections] = await Promise.all([
        readFile(memoriesPath, "utf8"),
        readFile(reflectionsPath, "utf8"),
      ]);
    } catch (error) {
      throw new MemoryLeverError(
        "missing_or_invalid",
        error instanceof Error ? error.message : String(error),
      );
    }
    await Promise.all([
      writeFile(`${memoriesPath}.bak-${stamp}`, memories, { mode: 0o600 }),
      writeFile(`${reflectionsPath}.bak-${stamp}`, reflections, {
        mode: 0o600,
      }),
    ]);
    try {
      await run();
    } catch (error) {
      try {
        await Promise.all([
          writeFile(memoriesPath, memories, "utf8"),
          writeFile(reflectionsPath, reflections, "utf8"),
        ]);
      } catch (restoreError) {
        throw new MemoryLeverError(
          "missing_or_invalid",
          `Apply failed and restore failed: ${
            error instanceof Error ? error.message : String(error)
          }; ${
            restoreError instanceof Error
              ? restoreError.message
              : String(restoreError)
          }`,
        );
      }
      throw error;
    }
  } finally {
    await handle.close();
    try {
      await unlink(lockPath);
    } catch {
      // Lock release is best-effort; the next tick may still see a leftover file.
    }
  }
}

export async function runMemoryLeverTick(
  options: MemoryLeverTickOptions = {},
): Promise<MemoryLeverTickResult> {
  const logger = options.log ?? defaultLog();
  const storagePath = resolveStoragePath(options);
  if (!storagePath) {
    return skipTick(logger, "unset_path");
  }

  try {
    if (!(await hasRagKey(storagePath))) {
      try {
        await access(storagePath);
      } catch {
        return skipTick(logger, "missing_store");
      }
      return skipTick(logger, "no_rag_keys");
    }

    const lever = await MemoryLever.openPath(storagePath);
    const plan = lever.dream();
    const planCounts = {
      merges: plan.merges.length,
      contradictions: plan.contradictions.length,
      prunes: plan.prunes.length,
    };
    logger.info(`${MEMORY_LEVER_TASK_NAME} tick`, planCounts);

    const applyEnabled = isMemoryLeverApplyEnabled(
      options.applyEnv ?? process.env.DELTECHO_MEMORY_LEVER_APPLY,
    );
    const hasWork = planCounts.merges > 0 || planCounts.prunes > 0;
    if (!applyEnabled || !hasWork) {
      return { applied: false, plan: planCounts };
    }

    await withApplyLock(storagePath, async () => {
      await lever.apply(plan, { approve: true, expectedHash: plan.hash });
    });
    logger.info(`${MEMORY_LEVER_TASK_NAME} applied`, {
      merges: planCounts.merges,
      prunes: planCounts.prunes,
    });
    return { applied: true, plan: planCounts };
  } catch (error) {
    const code: TickSkipReason =
      error instanceof MemoryLeverError ? error.code : "missing_or_invalid";
    return skipTick(logger, code);
  }
}

export function registerMemoryLeverSchedule(
  scheduler: Pick<TaskScheduler, "scheduleInterval">,
  options: MemoryLeverTickOptions = {},
): string | undefined {
  const storagePath = resolveStoragePath(options);
  if (!storagePath) {
    return undefined;
  }
  const intervalMs = resolveMemoryLeverIntervalMs(
    options.intervalMs ?? process.env.DELTECHO_MEMORY_LEVER_INTERVAL_MS,
  );
  return scheduler.scheduleInterval(
    MEMORY_LEVER_TASK_NAME,
    intervalMs,
    () =>
      runMemoryLeverTick({
        ...options,
        storagePath,
      }).then(() => undefined),
    { timeout: Math.max(10 * 60 * 1000, intervalMs) },
  );
}

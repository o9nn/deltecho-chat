import { open, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { getLogger } from "deep-tree-echo-core";
import { MemoryLever, MemoryLeverError } from "deep-tree-echo-core/memory/node";
import type { TaskScheduler } from "./scheduler/task-scheduler.js";

const RAG_MEMORY_FILE = "deepTreeEchoBotMemories.json";

const log = getLogger("deep-tree-echo-orchestrator/memory-lever-schedule");

export const MEMORY_LEVER_TASK_NAME = "memory-lever-dream";
export const DEFAULT_MEMORY_LEVER_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const MIN_MEMORY_LEVER_INTERVAL_MS = 60 * 1000;

export type TickSkipReason =
  | "unset_path"
  | "missing_store"
  | "missing_or_invalid"
  | "no_rag_keys"
  | "locked"
  | "unapproved"
  | "hash_mismatch"
  | "unknown_id"
  | "invalid_command"
  | "unknown_flag";

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

export function isMemoryLeverApplyEnabled(value: string | undefined): boolean {
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

function resolveStoragePath(options: MemoryLeverTickOptions): string {
  return (options.storagePath ?? process.env.DELTECHO_AUTONOMY_STORAGE_PATH ?? "")
    .trim();
}

async function hasRagKey(storagePath: string): Promise<boolean> {
  try {
    await access(join(storagePath, RAG_MEMORY_FILE));
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
    await run();
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
    logger.warn("memory-lever-dream skipped", { code: "unset_path" });
    return { skipped: "unset_path", applied: false };
  }

  try {
    if (!(await hasRagKey(storagePath))) {
      try {
        await access(storagePath);
      } catch {
        logger.warn("memory-lever-dream skipped", { code: "missing_store" });
        return { skipped: "missing_store", applied: false };
      }
      logger.warn("memory-lever-dream skipped", { code: "no_rag_keys" });
      return { skipped: "no_rag_keys", applied: false };
    }

    const lever = await MemoryLever.openPath(storagePath);
    const plan = lever.dream();
    logger.info("memory-lever-dream tick", {
      merges: plan.merges.length,
      contradictions: plan.contradictions.length,
      prunes: plan.prunes.length,
    });

    const applyEnabled = isMemoryLeverApplyEnabled(
      options.applyEnv ?? process.env.DELTECHO_MEMORY_LEVER_APPLY,
    );
    const hasWork = plan.merges.length > 0 || plan.prunes.length > 0;
    if (!applyEnabled || !hasWork) {
      return {
        applied: false,
        plan: {
          merges: plan.merges.length,
          contradictions: plan.contradictions.length,
          prunes: plan.prunes.length,
        },
      };
    }

    await withApplyLock(storagePath, async () => {
      await lever.apply(plan, { approve: true, expectedHash: plan.hash });
    });
    logger.info("memory-lever-dream applied", {
      merges: plan.merges.length,
      prunes: plan.prunes.length,
    });
    return {
      applied: true,
      plan: {
        merges: plan.merges.length,
        contradictions: plan.contradictions.length,
        prunes: plan.prunes.length,
      },
    };
  } catch (error) {
    const code =
      error instanceof MemoryLeverError ? error.code : "missing_or_invalid";
    logger.warn("memory-lever-dream skipped", { code });
    return { skipped: code, applied: false };
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
  return scheduler.scheduleInterval(MEMORY_LEVER_TASK_NAME, intervalMs, () =>
    runMemoryLeverTick({
      ...options,
      storagePath,
    }).then(() => undefined),
  );
}

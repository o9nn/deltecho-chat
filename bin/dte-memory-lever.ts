#!/usr/bin/env npx ts-node
/**
 * Deep Tree Echo memory lever
 *
 * Search (context-loader) and dream/apply hygiene against local RAG JSON.
 *
 * Usage:
 *   pnpm memory:lever search --storage-path ./memory --query "TypeScript"
 *   pnpm memory:lever dream --storage-path ./memory
 *   pnpm memory:lever dream --storage-path ./memory --apply --approve
 *   pnpm memory:lever apply --storage-path ./memory --approve --plan plan.json
 */

import { open, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getLogger } from "../packages/core/src/utils/logger";
import {
  MemoryLever,
  MemoryLeverError,
  RAG_MEMORY_KEY,
  RAG_REFLECTION_KEY,
  type DreamPlan,
  type SearchFilters,
} from "../packages/core/src/memory/MemoryLever";

function redirectInfoLogsToStderr(): void {
  const writeErr = (...args: unknown[]) => {
    const text = args
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join(" ");
    process.stderr.write(`${text}\n`);
  };
  console.log = writeErr;
  console.info = writeErr;
}

redirectInfoLogsToStderr();
const log = getLogger("dte-memory-lever");

interface Flags {
  command: string;
  storagePath?: string;
  query?: string;
  limit?: number;
  budgetChars?: number;
  threshold?: number;
  retentionDays?: number;
  chatId?: number;
  sender?: "user" | "bot";
  from?: number;
  to?: number;
  reflectionType?: "periodic" | "focused";
  reflectionAspect?: string;
  plan?: string;
  apply: boolean;
  approve: boolean;
}

function parseArgs(argv: string[]): Flags {
  const [command = "", ...rest] = argv;
  const flags: Flags = { command, apply: false, approve: false };
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    const next = rest[i + 1];
    switch (token) {
      case "--storage-path":
        flags.storagePath = next;
        i++;
        break;
      case "--query":
        flags.query = next;
        i++;
        break;
      case "--limit":
        flags.limit = Number(next);
        i++;
        break;
      case "--budget-chars":
        flags.budgetChars = Number(next);
        i++;
        break;
      case "--threshold":
        flags.threshold = Number(next);
        i++;
        break;
      case "--retention-days":
        flags.retentionDays = Number(next);
        i++;
        break;
      case "--chat-id":
        flags.chatId = Number(next);
        i++;
        break;
      case "--sender":
        if (next !== "user" && next !== "bot") {
          throw new MemoryLeverError(
            "unknown_flag",
            `Invalid --sender (expected user|bot): ${next}`,
          );
        }
        flags.sender = next;
        i++;
        break;
      case "--from":
        flags.from = Number(next);
        i++;
        break;
      case "--to":
        flags.to = Number(next);
        i++;
        break;
      case "--reflection-type":
        if (next !== "periodic" && next !== "focused") {
          throw new MemoryLeverError(
            "unknown_flag",
            `Invalid --reflection-type (expected periodic|focused): ${next}`,
          );
        }
        flags.reflectionType = next;
        i++;
        break;
      case "--reflection-aspect":
        flags.reflectionAspect = next;
        i++;
        break;
      case "--plan":
        flags.plan = next;
        i++;
        break;
      case "--apply":
        flags.apply = true;
        break;
      case "--approve":
        flags.approve = true;
        break;
      default:
        if (token.startsWith("-")) {
          throw new MemoryLeverError("unknown_flag", `Unknown flag: ${token}`);
        }
        break;
    }
  }
  return flags;
}

function resolveStoragePath(flags: Flags): string {
  if (flags.storagePath) {
    return flags.storagePath;
  }
  const fromEnv = process.env.DELTECHO_AUTONOMY_STORAGE_PATH;
  if (fromEnv) {
    return fromEnv;
  }
  throw new MemoryLeverError(
    "missing_store",
    "Pass --storage-path or set DELTECHO_AUTONOMY_STORAGE_PATH",
  );
}

async function loadPlan(planFlag?: string): Promise<DreamPlan> {
  if (!planFlag) {
    throw new MemoryLeverError(
      "missing_or_invalid",
      "apply requires --plan <file> or --plan -",
    );
  }
  const raw =
    planFlag === "-" ? await readFile(0, "utf8") : await readFile(planFlag, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as DreamPlan).merges) ||
    !Array.isArray((parsed as DreamPlan).contradictions) ||
    !Array.isArray((parsed as DreamPlan).prunes) ||
    typeof (parsed as DreamPlan).hash !== "string"
  ) {
    throw new MemoryLeverError("missing_or_invalid", "Plan JSON is not a DreamPlan");
  }
  return parsed as DreamPlan;
}

async function withApplyLock(
  storagePath: string,
  run: () => Promise<unknown>,
): Promise<unknown> {
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
    const memoriesBak = `${memoriesPath}.bak-${stamp}`;
    const reflectionsBak = `${reflectionsPath}.bak-${stamp}`;
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
      writeFile(memoriesBak, memories, { mode: 0o600 }),
      writeFile(reflectionsBak, reflections, { mode: 0o600 }),
    ]);
    try {
      return await run();
    } catch (error) {
      try {
        await Promise.all([
          writeFile(memoriesPath, memories, "utf8"),
          writeFile(reflectionsPath, reflections, "utf8"),
        ]);
      } catch (restoreError) {
        throw new MemoryLeverError(
          "missing_or_invalid",
          `Apply failed and restore failed: ${error instanceof Error ? error.message : String(error)}; ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`,
        );
      }
      throw error;
    }
  } finally {
    await handle.close();
    try {
      await unlink(lockPath);
    } catch {
      log.error("failed to release apply lock", { code: "locked" });
    }
  }
}

function emit(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function main(): Promise<void> {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (
      flags.command !== "search" &&
      flags.command !== "dream" &&
      flags.command !== "apply"
    ) {
      throw new MemoryLeverError(
        "invalid_command",
        "Command must be search, dream, or apply",
      );
    }
    const storagePath = resolveStoragePath(flags);
    if (flags.command === "search") {
      const lever = await MemoryLever.openPath(storagePath);
      const filters: SearchFilters = {
        limit: flags.limit,
        budgetChars: flags.budgetChars,
        chatId: flags.chatId,
        sender: flags.sender,
        from: flags.from,
        to: flags.to,
        reflectionType: flags.reflectionType,
        reflectionAspect: flags.reflectionAspect,
      };
      emit(lever.search(flags.query || "", filters));
      return;
    }
    if (flags.command === "dream" && !flags.apply) {
      const lever = await MemoryLever.openPath(storagePath);
      emit(lever.dream({
        threshold: flags.threshold,
        retentionDays: flags.retentionDays,
      }));
      return;
    }
    if (flags.command !== "apply" && !(flags.command === "dream" && flags.apply)) {
      throw new MemoryLeverError(
        "invalid_command",
        "Command must be search, dream, or apply",
      );
    }
    if (!flags.approve) {
      throw new MemoryLeverError("unapproved", "Apply requires --approve");
    }
    const audit = await withApplyLock(storagePath, async () => {
      const lever = await MemoryLever.openPath(storagePath);
      const plan =
        flags.command === "apply"
          ? await loadPlan(flags.plan)
          : lever.dream({
              threshold: flags.threshold,
              retentionDays: flags.retentionDays,
            });
      return lever.apply(plan, { approve: true, expectedHash: plan.hash });
    });
    emit(audit);
  } catch (error) {
    const code =
      error instanceof MemoryLeverError ? error.code : "error";
    const message = error instanceof Error ? error.message : String(error);
    log.error("lever failed", { code });
    emit({ error: code, message });
    process.exitCode = 1;
  }
}

void main();

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  mkdtemp,
  rm,
  writeFile,
  readFile,
  open,
  stat,
  access,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskScheduler } from "../scheduler/task-scheduler.js";
import {
  DEFAULT_MEMORY_LEVER_INTERVAL_MS,
  MEMORY_LEVER_TASK_NAME,
  MIN_MEMORY_LEVER_INTERVAL_MS,
  registerMemoryLeverSchedule,
  resolveMemoryLeverIntervalMs,
  runMemoryLeverTick,
  type TickLog,
} from "../memory-lever-schedule.js";

type MemoryRow = {
  id: string;
  timestamp: number;
  chatId: number;
  messageId: number;
  sender: "user" | "bot";
  text: string;
};

async function seedRag(
  dir: string,
  memories: MemoryRow[],
  extra: Record<string, string> = {},
): Promise<void> {
  await writeFile(
    join(dir, "deepTreeEchoBotMemories.json"),
    JSON.stringify(memories),
    "utf8",
  );
  await writeFile(join(dir, "deepTreeEchoBotReflections.json"), "[]", "utf8");
  for (const [name, body] of Object.entries(extra)) {
    await writeFile(join(dir, name), body, "utf8");
  }
}

function duplicateMemories(): MemoryRow[] {
  return [
    {
      id: "m1",
      timestamp: 200,
      chatId: 1,
      messageId: 1,
      sender: "user",
      text: "TypeScript is a typed superset of JavaScript",
    },
    {
      id: "m2",
      timestamp: 100,
      chatId: 1,
      messageId: 2,
      sender: "user",
      text: "TypeScript is a typed JavaScript superset extra clause",
    },
  ];
}

function uniqueMemories(): MemoryRow[] {
  return [
    {
      id: "a",
      timestamp: Date.now(),
      chatId: 1,
      messageId: 1,
      sender: "user",
      text: "single unique memory",
    },
  ];
}

function spyLog(): TickLog & { records: Array<{ level: string; msg: string; extra?: unknown }> } {
  const records: Array<{ level: string; msg: string; extra?: unknown }> = [];
  return {
    records,
    info: (msg, extra) => {
      records.push({ level: "info", msg, extra });
    },
    warn: (msg, extra) => {
      records.push({ level: "warn", msg, extra });
    },
  };
}

function logBlob(log: ReturnType<typeof spyLog>): string {
  return JSON.stringify(log.records);
}

describe("resolveMemoryLeverIntervalMs", () => {
  it("clamps values below 60 seconds to 60000", () => {
    expect(resolveMemoryLeverIntervalMs("1000")).toBe(
      MIN_MEMORY_LEVER_INTERVAL_MS,
    );
  });

  it("falls back to 6 hours for non-numeric values", () => {
    expect(resolveMemoryLeverIntervalMs("abc")).toBe(
      DEFAULT_MEMORY_LEVER_INTERVAL_MS,
    );
  });
});

describe("registerMemoryLeverSchedule", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler({ checkInterval: 10_000 });
  });

  afterEach(async () => {
    await scheduler.stop();
  });

  it("does not register when the path is unset", () => {
    const id = registerMemoryLeverSchedule(scheduler, { storagePath: "" });
    expect(id).toBeUndefined();
    expect(
      scheduler.getAllTasks().some((task) => task.name === MEMORY_LEVER_TASK_NAME),
    ).toBe(false);
  });

  it("registers an interval task when the path is set", () => {
    const id = registerMemoryLeverSchedule(scheduler, {
      storagePath: "/tmp/dte-rag-fixture",
      intervalMs: 3_600_000,
    });
    expect(id).toBeDefined();
    const task = scheduler.getAllTasks().find((t) => t.name === MEMORY_LEVER_TASK_NAME);
    expect(task?.interval).toBe(3_600_000);
    expect(task?.timeout).toBe(3_600_000);
  });

  it("clamps a sub-minute register interval to 60 seconds", () => {
    registerMemoryLeverSchedule(scheduler, {
      storagePath: "/tmp/dte-rag-fixture",
      intervalMs: 1000,
    });
    const task = scheduler.getAllTasks().find((t) => t.name === MEMORY_LEVER_TASK_NAME);
    expect(task?.interval).toBe(MIN_MEMORY_LEVER_INTERVAL_MS);
  });

  it("falls back to 6 hours when the interval env is non-numeric", () => {
    const previous = process.env.DELTECHO_MEMORY_LEVER_INTERVAL_MS;
    process.env.DELTECHO_MEMORY_LEVER_INTERVAL_MS = "abc";
    try {
      registerMemoryLeverSchedule(scheduler, {
        storagePath: "/tmp/dte-rag-fixture",
      });
      const task = scheduler.getAllTasks().find((t) => t.name === MEMORY_LEVER_TASK_NAME);
      expect(task?.interval).toBe(DEFAULT_MEMORY_LEVER_INTERVAL_MS);
    } finally {
      if (previous === undefined) {
        delete process.env.DELTECHO_MEMORY_LEVER_INTERVAL_MS;
      } else {
        process.env.DELTECHO_MEMORY_LEVER_INTERVAL_MS = previous;
      }
    }
  });
});

describe("runMemoryLeverTick", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("dry-run leaves near-duplicate store bytes unchanged and logs no memory text", async () => {
    dir = await mkdtemp(join(tmpdir(), "dte-tick-dry-"));
    const memories = duplicateMemories();
    await seedRag(dir, memories);
    const before = await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8");
    const log = spyLog();
    const result = await runMemoryLeverTick({
      storagePath: dir,
      applyEnv: undefined,
      log,
    });
    expect(result.skipped).toBeUndefined();
    expect(result.plan?.merges).toBeGreaterThanOrEqual(1);
    expect(result.applied).toBe(false);
    expect(await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8")).toBe(
      before,
    );
    expect(logBlob(log)).not.toContain("TypeScript");
    expect(logBlob(log)).not.toContain("user");
  });

  it("missing directory does not mkdir and does not throw", async () => {
    const missing = join(tmpdir(), `dte-absent-${Date.now()}`);
    const result = await runMemoryLeverTick({ storagePath: missing });
    expect(result.skipped).toBe("missing_store");
    await expect(stat(missing)).rejects.toThrow();
  });

  it("apply env 1 tombstones losers and a second dream has no same-id merge", async () => {
    dir = await mkdtemp(join(tmpdir(), "dte-tick-apply-"));
    await seedRag(dir, duplicateMemories());
    const first = await runMemoryLeverTick({
      storagePath: dir,
      applyEnv: "1",
    });
    expect(first.applied).toBe(true);
    expect(first.plan?.merges).toBeGreaterThanOrEqual(1);
    const applied = JSON.parse(
      await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8"),
    ) as Array<{ id: string; tombstoned?: boolean }>;
    expect(applied.some((row) => row.tombstoned === true)).toBe(true);
    const snapshots = (await readdir(dir)).filter((name) =>
      name.includes(".json.bak-"),
    );
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    await expect(access(join(dir, ".lock"))).rejects.toThrow();
    const second = await runMemoryLeverTick({
      storagePath: dir,
      applyEnv: "1",
    });
    expect(second.plan?.merges).toBe(0);
  });

  it("does not call apply when apply env is set but the plan is empty", async () => {
    dir = await mkdtemp(join(tmpdir(), "dte-tick-clean-"));
    await seedRag(dir, uniqueMemories());
    const before = await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8");
    const result = await runMemoryLeverTick({
      storagePath: dir,
      applyEnv: "1",
    });
    expect(result.applied).toBe(false);
    expect(result.plan?.merges).toBe(0);
    expect(result.plan?.prunes).toBe(0);
    expect(await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8")).toBe(
      before,
    );
  });

  it("invalid RAG JSON does not throw", async () => {
    dir = await mkdtemp(join(tmpdir(), "dte-tick-bad-"));
    await writeFile(join(dir, "deepTreeEchoBotMemories.json"), "{not-json", "utf8");
    await writeFile(join(dir, "deepTreeEchoBotReflections.json"), "[]", "utf8");
    const result = await runMemoryLeverTick({ storagePath: dir });
    expect(result.skipped).toBe("missing_or_invalid");
  });

  it("held lock skips apply without throwing", async () => {
    dir = await mkdtemp(join(tmpdir(), "dte-tick-lock-"));
    await seedRag(dir, duplicateMemories());
    const handle = await open(join(dir, ".lock"), "wx", 0o600);
    const before = await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8");
    const result = await runMemoryLeverTick({
      storagePath: dir,
      applyEnv: "1",
    });
    expect(result.skipped).toBe("locked");
    expect(result.applied).toBe(false);
    expect(await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8")).toBe(
      before,
    );
    await handle.close();
  });

  it("vector-only directory skips with no_rag_keys", async () => {
    dir = await mkdtemp(join(tmpdir(), "dte-tick-vector-"));
    await writeFile(
      join(dir, "vectorMemoryStore_memories.json"),
      JSON.stringify([{ id: "v1" }]),
      "utf8",
    );
    const result = await runMemoryLeverTick({ storagePath: dir, applyEnv: "1" });
    expect(result.skipped).toBe("no_rag_keys");
    expect(result.applied).toBe(false);
  });
});

describe("scheduled handler", () => {
  it("runs the registered handler as a dry-run without throwing", async () => {
    const scheduler = new TaskScheduler({ checkInterval: 10_000 });
    const dir = await mkdtemp(join(tmpdir(), "dte-tick-handler-"));
    await seedRag(dir, duplicateMemories());
    const before = await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8");
    try {
      const id = registerMemoryLeverSchedule(scheduler, { storagePath: dir });
      expect(id).toBeDefined();
      const task = scheduler.getTask(id!);
      await task!.handler();
      expect(await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8")).toBe(
        before,
      );
    } finally {
      await scheduler.stop();
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("apply env parsing", () => {
  it("applies when applyEnv is TRUE or yes", async () => {
    for (const applyEnv of ["TRUE", "yes"] as const) {
      const dir = await mkdtemp(join(tmpdir(), `dte-tick-${applyEnv}-`));
      await seedRag(dir, duplicateMemories());
      const result = await runMemoryLeverTick({ storagePath: dir, applyEnv });
      expect(result.applied).toBe(true);
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("applies when the process apply env is 1", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-tick-env-1-"));
    await seedRag(dir, duplicateMemories());
    const previous = process.env.DELTECHO_MEMORY_LEVER_APPLY;
    process.env.DELTECHO_MEMORY_LEVER_APPLY = "1";
    try {
      const result = await runMemoryLeverTick({ storagePath: dir });
      expect(result.applied).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.DELTECHO_MEMORY_LEVER_APPLY;
      } else {
        process.env.DELTECHO_MEMORY_LEVER_APPLY = previous;
      }
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("treats unknown apply values as dry-run", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-tick-env-"));
    await seedRag(dir, duplicateMemories());
    const before = await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8");
    const result = await runMemoryLeverTick({
      storagePath: dir,
      applyEnv: "on",
    });
    expect(result.applied).toBe(false);
    expect(await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8")).toBe(
      before,
    );
    await rm(dir, { recursive: true, force: true });
  });
});

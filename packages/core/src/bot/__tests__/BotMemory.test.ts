import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BotMemory, openBotMemory, resolveBotStoragePath } from "../BotMemory";
import {
  BOT_CAPABILITIES_CLAUSE,
  DEFAULT_BOT_PERSONALITY,
  MEMORY_SECTION_HEADER,
  buildReplyContext,
  resolveBotPersonality,
} from "../replyContext";
import { MemoryLever } from "../../memory/MemoryLever";
import type { Memory } from "../../memory/RAGMemoryStore";

const MEMORIES_FILE = "deepTreeEchoBotMemories.json";
const REFLECTIONS_FILE = "deepTreeEchoBotReflections.json";

function memory(
  overrides: Partial<Memory> & Pick<Memory, "id" | "text">,
): Memory {
  return {
    timestamp: Date.now() - 60_000,
    chatId: 7,
    messageId: 1,
    sender: "user",
    ...overrides,
  };
}

async function seedStore(memories: Memory[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "dte-bot-mem-"));
  await writeFile(join(dir, MEMORIES_FILE), JSON.stringify(memories), "utf8");
  await writeFile(join(dir, REFLECTIONS_FILE), "[]", "utf8");
  return dir;
}

describe("openBotMemory", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    while (dirs.length) {
      await rm(dirs.pop() as string, { recursive: true, force: true });
    }
  });

  it("opens an existing store that already has the live RAG key", async () => {
    const dir = await seedStore([
      memory({ id: "m1", text: "We deploy the ingest pipeline on ECS" }),
    ]);
    dirs.push(dir);

    const opened = await openBotMemory({ storagePath: dir });

    expect(opened.skipped).toBeUndefined();
    expect(opened.memory).toBeInstanceOf(BotMemory);
    expect(opened.memory?.isEnabled()).toBe(true);
    expect(opened.memory?.liveMemoryCount()).toBe(1);
  });

  it("reads DELTECHO_AUTONOMY_STORAGE_PATH and trims it", async () => {
    const dir = await seedStore([memory({ id: "m1", text: "hello there" })]);
    dirs.push(dir);

    expect(
      resolveBotStoragePath({
        env: { DELTECHO_AUTONOMY_STORAGE_PATH: `  ${dir}  ` },
      }),
    ).toBe(dir);

    const opened = await openBotMemory({
      env: { DELTECHO_AUTONOMY_STORAGE_PATH: `  ${dir}  ` },
    });
    expect(opened.memory).not.toBeNull();
    expect(opened.storagePath).toBe(dir);
  });

  it("skips with unset_path when the variable is unset or blank", async () => {
    await expect(openBotMemory({ env: {} })).resolves.toMatchObject({
      memory: null,
      skipped: "unset_path",
    });
    await expect(
      openBotMemory({ env: { DELTECHO_AUTONOMY_STORAGE_PATH: "   " } }),
    ).resolves.toMatchObject({ memory: null, skipped: "unset_path" });
  });

  it("skips a missing directory and does not create it", async () => {
    const missing = join(tmpdir(), `dte-bot-absent-${Date.now()}`);

    const opened = await openBotMemory({ storagePath: missing });

    expect(opened).toMatchObject({ memory: null, skipped: "missing_store" });
    await expect(stat(missing)).rejects.toThrow();
  });

  it("skips a vector-only directory with no_rag_keys and writes no RAG JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-bot-vector-"));
    dirs.push(dir);
    await writeFile(
      join(dir, "vectorMemoryStore_memories.json"),
      JSON.stringify([{ id: "v1" }]),
      "utf8",
    );

    const opened = await openBotMemory({ storagePath: dir });

    expect(opened).toMatchObject({ memory: null, skipped: "no_rag_keys" });
    expect(await readdir(dir)).toEqual(["vectorMemoryStore_memories.json"]);
  });

  it("skips invalid RAG JSON without rewriting the file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-bot-badjson-"));
    dirs.push(dir);
    await writeFile(join(dir, MEMORIES_FILE), "{not-json", "utf8");

    const opened = await openBotMemory({ storagePath: dir });

    expect(opened).toMatchObject({
      memory: null,
      skipped: "missing_or_invalid",
    });
    expect(await readFile(join(dir, MEMORIES_FILE), "utf8")).toBe("{not-json");
    expect((await readdir(dir)).sort()).toEqual([MEMORIES_FILE]);
  });
});

describe("BotMemory.retrieve", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    while (dirs.length) {
      await rm(dirs.pop() as string, { recursive: true, force: true });
    }
  });

  it("injects a known memory into the assembled system prompt", async () => {
    const dir = await seedStore([
      memory({
        id: "m1",
        chatId: 7,
        text: "The staging cluster password rotates every Tuesday",
      }),
      memory({
        id: "m2",
        chatId: 99,
        text: "Bread dough needs a long cold ferment",
      }),
    ]);
    dirs.push(dir);
    const { memory: mem } = await openBotMemory({ storagePath: dir });

    const retrieved = mem!.retrieve(
      "when does the cluster password rotate?",
      7,
    );
    const context = buildReplyContext({ retrieved });

    expect(retrieved.memories.map((item) => item.id)).toContain("m1");
    expect(context.systemPrompt).toContain(MEMORY_SECTION_HEADER);
    expect(context.systemPrompt).toContain(
      "The staging cluster password rotates every Tuesday",
    );
    expect(context.memoryCount).toBeGreaterThan(0);
    expect(context.memoryChars).toBe(retrieved.block.length);
  });

  it("excludes tombstoned memories", async () => {
    const dir = await seedStore([
      memory({ id: "live", text: "kubernetes upgrade is scheduled" }),
      memory({
        id: "dead",
        text: "kubernetes upgrade was cancelled",
        tombstoned: true,
      }),
    ]);
    dirs.push(dir);
    const { memory: mem } = await openBotMemory({ storagePath: dir });

    const ids = mem!
      .retrieve("kubernetes upgrade", 7)
      .memories.map((m) => m.id);

    expect(ids).toContain("live");
    expect(ids).not.toContain("dead");
  });

  it("adds recent same-chat turns that the relevance search missed", async () => {
    const dir = await seedStore([
      memory({ id: "topic", chatId: 7, text: "postgres vacuum tuning notes" }),
      memory({
        id: "chatty",
        chatId: 7,
        sender: "bot",
        text: "Sure, talk to you later",
      }),
    ]);
    dirs.push(dir);
    const { memory: mem } = await openBotMemory({ storagePath: dir });

    const ids = mem!.retrieve("postgres vacuum", 7).memories.map((m) => m.id);

    expect(ids).toEqual(expect.arrayContaining(["topic", "chatty"]));
  });

  it("keeps the retrieved block inside the char budget", async () => {
    const dir = await seedStore(
      Array.from({ length: 8 }, (_, index) =>
        memory({
          id: `m${index}`,
          text: `terraform module notes ${index} ${"x".repeat(120)}`,
        }),
      ),
    );
    dirs.push(dir);
    const { memory: mem } = await openBotMemory({
      storagePath: dir,
      budgetChars: 200,
    });

    const retrieved = mem!.retrieve("terraform module notes", 7);

    expect(retrieved.memories.length).toBe(1);
    expect(retrieved.truncated).toBe(true);
  });
});

describe("BotMemory.rememberTurn", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    while (dirs.length) {
      await rm(dirs.pop() as string, { recursive: true, force: true });
    }
  });

  it("persists the user turn and the bot reply to the RAG JSON", async () => {
    const dir = await seedStore([]);
    dirs.push(dir);
    const { memory: mem } = await openBotMemory({ storagePath: dir });

    const stored = await mem!.rememberTurn({
      chatId: 42,
      messageId: 1001,
      userText: "what port does the collector listen on?",
      botText: "The collector listens on 4317.",
    });

    expect(stored).toBe(2);
    const onDisk: Memory[] = JSON.parse(
      await readFile(join(dir, MEMORIES_FILE), "utf8"),
    );
    expect(onDisk).toHaveLength(2);
    expect(onDisk.map((item) => item.sender)).toEqual(["user", "bot"]);
    expect(onDisk.every((item) => item.chatId === 42)).toBe(true);
    expect(onDisk.every((item) => item.messageId === 1001)).toBe(true);
    expect(onDisk[1].text).toBe("The collector listens on 4317.");
  });

  it("is retrievable by a later process opening the same store", async () => {
    const dir = await seedStore([]);
    dirs.push(dir);
    const first = await openBotMemory({ storagePath: dir });
    await first.memory!.rememberTurn({
      chatId: 42,
      messageId: 1,
      userText: "my deploy target is fly.io",
      botText: "Noted, fly.io it is.",
    });

    const second = await openBotMemory({ storagePath: dir });
    const context = buildReplyContext({
      retrieved: second.memory!.retrieve("what is my deploy target?", 42),
    });

    expect(context.systemPrompt).toContain("fly.io");
  });

  it("skips empty sides of a turn", async () => {
    const dir = await seedStore([]);
    dirs.push(dir);
    const { memory: mem } = await openBotMemory({ storagePath: dir });

    const stored = await mem!.rememberTurn({
      chatId: 1,
      messageId: 2,
      userText: "   ",
      botText: "only the bot spoke",
    });

    expect(stored).toBe(1);
  });

  it("never calls MemoryLever dream or apply on the message path", async () => {
    // Two identical memories: a dream/apply pass would merge and tombstone one.
    const dir = await seedStore([
      memory({ id: "m1", text: "duplicate note about ECS" }),
      memory({ id: "m2", text: "duplicate note about ECS" }),
    ]);
    dirs.push(dir);
    const calls: string[] = [];
    const proto = MemoryLever.prototype as unknown as Record<string, unknown>;
    const original = { dream: proto.dream, apply: proto.apply };
    proto.dream = function trackedDream(this: MemoryLever, ...args: unknown[]) {
      calls.push("dream");
      return (original.dream as (...a: unknown[]) => unknown).apply(this, args);
    };
    proto.apply = function trackedApply(this: MemoryLever, ...args: unknown[]) {
      calls.push("apply");
      return (original.apply as (...a: unknown[]) => unknown).apply(this, args);
    };

    try {
      const { memory: mem } = await openBotMemory({ storagePath: dir });
      buildReplyContext({ retrieved: mem!.retrieve("ECS note", 7) });
      await mem!.rememberTurn({
        chatId: 7,
        messageId: 3,
        userText: "another ECS note",
        botText: "acknowledged",
      });

      expect(calls).toEqual([]);
      const onDisk: Memory[] = JSON.parse(
        await readFile(join(dir, MEMORIES_FILE), "utf8"),
      );
      expect(onDisk.filter((item) => item.tombstoned)).toHaveLength(0);
      expect(
        onDisk.filter((item) => item.id === "m1" || item.id === "m2"),
      ).toHaveLength(2);
    } finally {
      proto.dream = original.dream;
      proto.apply = original.apply;
    }
  });
});

describe("buildReplyContext", () => {
  it("keeps the Deep Tree Echo identity and safety guidelines by default", () => {
    const context = buildReplyContext();

    expect(context.systemPrompt).toContain(DEFAULT_BOT_PERSONALITY);
    expect(context.systemPrompt).toContain(BOT_CAPABILITIES_CLAUSE);
    expect(context.memoryCount).toBe(0);
  });

  it("omits the memory section entirely when nothing was retrieved", () => {
    expect(buildReplyContext().systemPrompt).not.toContain(
      MEMORY_SECTION_HEADER,
    );
  });

  it("replaces only the personality clause from DELTECHO_BOT_PERSONALITY", () => {
    const context = buildReplyContext({
      personality: "You are Echo, terse and dry.",
    });

    expect(context.systemPrompt).toContain("You are Echo, terse and dry.");
    expect(context.systemPrompt).not.toContain(DEFAULT_BOT_PERSONALITY);
    expect(context.systemPrompt).toContain(BOT_CAPABILITIES_CLAUSE);
  });

  it("falls back to Deep Tree Echo for blank or missing personality", () => {
    expect(resolveBotPersonality(undefined)).toBe(DEFAULT_BOT_PERSONALITY);
    expect(resolveBotPersonality("")).toBe(DEFAULT_BOT_PERSONALITY);
    expect(resolveBotPersonality("   ")).toBe(DEFAULT_BOT_PERSONALITY);
    expect(resolveBotPersonality(" You are Echo. ")).toBe("You are Echo.");
  });
});

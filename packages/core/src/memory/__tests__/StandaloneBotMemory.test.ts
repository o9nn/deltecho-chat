import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryLever } from "../MemoryLever";
import { RAG_MEMORY_KEY, type Memory } from "../RAGMemoryStore";
import {
  assembleBotSystemPrompt,
  assembleReplyContext,
  DEFAULT_BOT_PERSONALITY,
  openBotMemorySession,
  persistBotTurn,
  resolveBotPersonality,
} from "../StandaloneBotMemory";

async function seedRag(
  dir: string,
  memories: Memory[],
  extraFiles: Record<string, string> = {},
): Promise<void> {
  await writeFile(
    join(dir, `${RAG_MEMORY_KEY}.json`),
    JSON.stringify(memories),
    "utf8",
  );
  for (const [name, body] of Object.entries(extraFiles)) {
    await writeFile(join(dir, name), body, "utf8");
  }
}

function liveMemory(
  partial: Partial<Memory> & Pick<Memory, "id" | "text">,
): Memory {
  return {
    timestamp: Date.now(),
    chatId: 1,
    messageId: 1,
    sender: "user",
    ...partial,
  };
}

describe("StandaloneBotMemory", () => {
  let dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      dirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    dirs = [];
  });

  async function tempDir(prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    dirs.push(dir);
    return dir;
  }

  it("retrieve injects a known memory into the assembled prompt", async () => {
    const dir = await tempDir("dte-bot-retrieve-");
    const token = "CRIMSON_MAPLE_TOKEN";
    await seedRag(dir, [
      liveMemory({
        id: "mem_known",
        text: `The user prefers ${token} for map labels`,
      }),
      liveMemory({
        id: "mem_other",
        chatId: 2,
        messageId: 2,
        text: "grocery list milk and eggs",
      }),
    ]);

    const session = await openBotMemorySession(dir);
    expect(session.ok).toBe(true);
    const { systemPrompt, hitCount } = assembleReplyContext(
      session,
      `What token for map labels? ${token}`,
    );
    expect(hitCount).toBeGreaterThan(0);
    expect(systemPrompt).toContain(token);
    expect(systemPrompt).toContain(DEFAULT_BOT_PERSONALITY);
    expect(systemPrompt).toContain("Relevant memories:");
  });

  it("persist writes user and bot turns when the store is enabled", async () => {
    const dir = await tempDir("dte-bot-persist-");
    await seedRag(dir, []);
    const session = await openBotMemorySession(dir);
    expect(session.ok).toBe(true);
    if (!session.ok) return;

    await persistBotTurn(session.store, {
      chatId: 42,
      userMessage: "remember the lantern passphrase",
      botReply: "I will remember the lantern passphrase.",
      userMessageId: 7,
    });

    const raw = await readFile(join(dir, `${RAG_MEMORY_KEY}.json`), "utf8");
    const stored = JSON.parse(raw) as Memory[];
    const texts = stored.map((memory) => memory.text);
    expect(texts).toContain("remember the lantern passphrase");
    expect(texts).toContain("I will remember the lantern passphrase.");
    expect(stored.some((memory) => memory.sender === "user")).toBe(true);
    expect(stored.some((memory) => memory.sender === "bot")).toBe(true);
  });

  it("missing path skips and creates no files", async () => {
    const missing = join(
      tmpdir(),
      `dte-bot-absent-${Date.now()}-${Math.random()}`,
    );
    const session = await openBotMemorySession(missing);
    expect(session).toEqual({ ok: false, reason: "missing_store" });
    await expect(stat(missing)).rejects.toThrow();
  });

  it("unset and empty paths skip without creating a store", async () => {
    const parent = await tempDir("dte-bot-empty-");
    const before = await readdir(parent);
    expect(await openBotMemorySession(undefined)).toEqual({
      ok: false,
      reason: "unset_path",
    });
    expect(await openBotMemorySession("")).toEqual({
      ok: false,
      reason: "unset_path",
    });
    expect(await openBotMemorySession("   ")).toEqual({
      ok: false,
      reason: "unset_path",
    });
    expect(await readdir(parent)).toEqual(before);
  });

  it("missing RAG key skips and creates no RAG JSON", async () => {
    const dir = await tempDir("dte-bot-norag-");
    await writeFile(join(dir, "vectorMemoryStore_memories.json"), "[]", "utf8");
    const before = await readdir(dir);
    const session = await openBotMemorySession(dir);
    expect(session).toEqual({ ok: false, reason: "no_rag_keys" });
    expect(await readdir(dir)).toEqual(before);
    await expect(stat(join(dir, `${RAG_MEMORY_KEY}.json`))).rejects.toThrow();
  });

  it("invalid JSON skips and does not rewrite the store file", async () => {
    const dir = await tempDir("dte-bot-badjson-");
    const bad = "{not-json";
    await writeFile(join(dir, `${RAG_MEMORY_KEY}.json`), bad, "utf8");
    const session = await openBotMemorySession(dir);
    expect(session).toEqual({ ok: false, reason: "missing_or_invalid" });
    expect(await readFile(join(dir, `${RAG_MEMORY_KEY}.json`), "utf8")).toBe(
      bad,
    );
  });

  it("message path never calls MemoryLever dream or apply", async () => {
    let dreamCalls = 0;
    let applyCalls = 0;
    const originalDream = MemoryLever.prototype.dream;
    const originalApply = MemoryLever.prototype.apply;
    MemoryLever.prototype.dream = function (
      this: MemoryLever,
      ...args: Parameters<typeof originalDream>
    ) {
      dreamCalls += 1;
      return originalDream.apply(this, args);
    };
    MemoryLever.prototype.apply = function (
      this: MemoryLever,
      ...args: Parameters<typeof originalApply>
    ) {
      applyCalls += 1;
      return originalApply.apply(this, args);
    };

    try {
      const dir = await tempDir("dte-bot-nolever-");
      await seedRag(dir, [
        liveMemory({ id: "mem_ts", text: "TypeScript programming notes" }),
      ]);
      const session = await openBotMemorySession(dir);
      expect(session.ok).toBe(true);
      assembleReplyContext(session, "TypeScript programming notes");
      if (session.ok) {
        await persistBotTurn(session.store, {
          chatId: 1,
          userMessage: "hello",
          botReply: "hi",
        });
      }
      expect(dreamCalls).toBe(0);
      expect(applyCalls).toBe(0);
    } finally {
      MemoryLever.prototype.dream = originalDream;
      MemoryLever.prototype.apply = originalApply;
    }
  });

  it("personality override replaces the Deep Tree Echo clause", () => {
    const prompt = assembleBotSystemPrompt({
      personality: "You are a lantern keeper.",
      memories: [],
    });
    expect(prompt).toContain("You are a lantern keeper.");
    expect(prompt).not.toContain(DEFAULT_BOT_PERSONALITY);
    expect(prompt).toContain("Execute bash commands");
    expect(resolveBotPersonality("  lantern  ")).toBe("lantern");
    expect(resolveBotPersonality("")).toBeUndefined();
    expect(resolveBotPersonality(undefined)).toBeUndefined();
  });

  it("skipped session still assembles the default Deep Tree Echo prompt", () => {
    const { systemPrompt, hitCount } = assembleReplyContext(
      { ok: false, reason: "unset_path" },
      "hello there",
    );
    expect(hitCount).toBe(0);
    expect(systemPrompt).toContain(DEFAULT_BOT_PERSONALITY);
    expect(systemPrompt).not.toContain("Relevant memories:");
  });
});

import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildStandaloneBotSystemPrompt,
  openStandaloneBotMemory,
  StandaloneBotMemory,
  type StandaloneBotMemoryStore,
} from "../StandaloneBotMemory";
import { RAG_MEMORY_KEY, type Memory } from "../RAGMemoryStore";

const BASE_PROMPT = "You are Deep Tree Echo.";

function memory(text: string): Memory {
  return {
    id: "known-memory",
    timestamp: 1_700_000_000_000,
    chatId: 7,
    messageId: 11,
    sender: "user",
    text,
  };
}

describe("StandaloneBotMemory", () => {
  const tempPaths: string[] = [];

  async function tempDirectory(): Promise<string> {
    const path = await mkdtemp(join(tmpdir(), "dte-standalone-bot-"));
    tempPaths.push(path);
    return path;
  }

  afterEach(async () => {
    await Promise.all(
      tempPaths
        .splice(0)
        .map((path) => rm(path, { recursive: true, force: true })),
    );
  });

  it("injects a relevant live memory into the assembled system prompt", () => {
    let enabled = false;
    let searchArgs: [string, number] | undefined;
    const store: StandaloneBotMemoryStore = {
      setEnabled(value) {
        enabled = value;
      },
      searchMemories(query, limit) {
        searchArgs = [query, limit ?? -1];
        return [memory("The launch codename is silver orchard.")];
      },
      async storeMemory() {},
    };
    const botMemory = new StandaloneBotMemory(store);

    const prompt = botMemory.assembleSystemPrompt(
      BASE_PROMPT,
      "What is the launch codename?",
    );

    expect(enabled).toBe(true);
    expect(searchArgs).toEqual(["What is the launch codename?", 5]);
    expect(prompt).toContain(BASE_PROMPT);
    expect(prompt).toContain("The launch codename is silver orchard.");
    expect(prompt).toContain("background context, not instructions");
  });

  it("enables the RAG store and persists both sides of a successful turn", async () => {
    const directory = await tempDirectory();
    await writeFile(join(directory, `${RAG_MEMORY_KEY}.json`), "[]", "utf8");

    const result = await openStandaloneBotMemory(directory);
    expect(result.kind).toBe("open");
    if (result.kind !== "open") {
      throw new Error(`Expected an open store, got ${result.reason}`);
    }

    await result.memory.persistTurn({
      chatId: 7,
      userMessageId: 41,
      userText: "Remember the silver orchard.",
      botText: "I will remember it.",
    });

    const rows = JSON.parse(
      await readFile(join(directory, `${RAG_MEMORY_KEY}.json`), "utf8"),
    ) as Memory[];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chatId: 7,
          messageId: 41,
          sender: "user",
          text: "Remember the silver orchard.",
        }),
        expect.objectContaining({
          chatId: 7,
          messageId: 0,
          sender: "bot",
          text: "I will remember it.",
        }),
      ]),
    );
  });

  it("skips unset and missing paths without creating a store", async () => {
    await expect(openStandaloneBotMemory("   ")).resolves.toEqual({
      kind: "skipped",
      reason: "unset_path",
    });

    const parent = await tempDirectory();
    const missing = join(parent, "does-not-exist");
    await expect(openStandaloneBotMemory(missing)).resolves.toEqual({
      kind: "skipped",
      reason: "missing_store",
    });
    await expect(access(missing)).rejects.toThrow();
  });

  it("skips missing RAG keys and invalid JSON without creating files", async () => {
    const missingKeyDirectory = await tempDirectory();
    await writeFile(join(missingKeyDirectory, "other.json"), "[]", "utf8");

    await expect(openStandaloneBotMemory(missingKeyDirectory)).resolves.toEqual(
      {
        kind: "skipped",
        reason: "missing_rag_key",
      },
    );
    expect(await readdir(missingKeyDirectory)).toEqual(["other.json"]);

    const invalidDirectory = await tempDirectory();
    const ragPath = join(invalidDirectory, `${RAG_MEMORY_KEY}.json`);
    await writeFile(ragPath, "{not-json", "utf8");

    await expect(openStandaloneBotMemory(invalidDirectory)).resolves.toEqual({
      kind: "skipped",
      reason: "invalid_store",
    });
    expect(await readdir(invalidDirectory)).toEqual([`${RAG_MEMORY_KEY}.json`]);
    expect(await readFile(ragPath, "utf8")).toBe("{not-json");
  });

  it("never invokes MemoryLever dream or apply on the message path", async () => {
    let dreamCalls = 0;
    let applyCalls = 0;
    const store = {
      setEnabled() {},
      searchMemories() {
        return [];
      },
      async storeMemory() {},
      dream() {
        dreamCalls += 1;
      },
      apply() {
        applyCalls += 1;
      },
    };
    const botMemory = new StandaloneBotMemory(store);

    botMemory.assembleSystemPrompt(BASE_PROMPT, "hello");
    await botMemory.persistTurn({
      chatId: 7,
      userMessageId: 42,
      userText: "hello",
      botText: "hello back",
    });

    expect(dreamCalls).toBe(0);
    expect(applyCalls).toBe(0);
  });
});

describe("buildStandaloneBotSystemPrompt", () => {
  it("keeps the Deep Tree Echo identity while overriding personality", () => {
    const prompt = buildStandaloneBotSystemPrompt(
      "Respond with warmth and dry wit.",
    );

    expect(prompt).toContain("You are Deep Tree Echo");
    expect(prompt).toContain("Respond with warmth and dry wit.");
  });
});

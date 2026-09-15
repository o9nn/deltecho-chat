import { mkdtemp, rm, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryLever, MemoryLeverError } from "../MemoryLever";
import { RAGMemoryStore, type Memory } from "../RAGMemoryStore";
import { InMemoryStorage } from "../storage";

async function seedDir(
  dir: string,
  memories: Memory[],
  extraFiles: Record<string, string> = {},
) {
  await writeFile(
    join(dir, "deepTreeEchoBotMemories.json"),
    JSON.stringify(memories),
    "utf8",
  );
  await writeFile(join(dir, "deepTreeEchoBotReflections.json"), "[]", "utf8");
  for (const [name, body] of Object.entries(extraFiles)) {
    await writeFile(join(dir, name), body, "utf8");
  }
}

describe("MemoryLever filesystem open", () => {
  it("errors on invalid RAG JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-bad-json-"));
    await writeFile(
      join(dir, "deepTreeEchoBotMemories.json"),
      "{not-json",
      "utf8",
    );
    await writeFile(join(dir, "deepTreeEchoBotReflections.json"), "[]", "utf8");
    await expect(MemoryLever.openPath(dir)).rejects.toMatchObject({
      code: "missing_or_invalid",
    });
    await rm(dir, { recursive: true, force: true });
  });

  it("errors on a missing directory and creates no files", async () => {
    const missing = join(tmpdir(), `dte-absent-${Date.now()}`);
    await expect(MemoryLever.openPath(missing)).rejects.toMatchObject({
      code: "missing_store",
    });
    await expect(stat(missing)).rejects.toThrow();
  });

  it("search JSON matches library search on the same store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-lever-"));
    const memories: Memory[] = [
      {
        id: "mem_ts",
        timestamp: Date.now(),
        chatId: 1,
        messageId: 1,
        sender: "user",
        text: "TypeScript programming",
      },
      {
        id: "mem_py",
        timestamp: Date.now(),
        chatId: 2,
        messageId: 2,
        sender: "user",
        text: "Python programming",
      },
    ];
    await seedDir(dir, memories);
    const lever = await MemoryLever.openPath(dir);
    const fromPath = lever.search("TypeScript", { chatId: 1 });
    const storage = new InMemoryStorage();
    await storage.save("deepTreeEchoBotMemories", JSON.stringify(memories));
    const store = new RAGMemoryStore(storage);
    await store.ready();
    store.setEnabled(true);
    const fromMemory = new MemoryLever(store).search("TypeScript", {
      chatId: 1,
    });
    expect(fromPath.hits.map((hit) => hit.id)).toEqual(
      fromMemory.hits.map((hit) => hit.id),
    );
    await rm(dir, { recursive: true, force: true });
  });

  it("dream dry-run is byte-identical; apply requires approval and writes secure snapshots", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-apply-"));
    await seedDir(dir, [
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
    ]);
    const before = await readFile(
      join(dir, "deepTreeEchoBotMemories.json"),
      "utf8",
    );
    const lever = await MemoryLever.openPath(dir);
    lever.dream();
    expect(
      await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8"),
    ).toBe(before);
    const plan = lever.dream();
    await expect(lever.apply(plan, { approve: false })).rejects.toBeInstanceOf(
      MemoryLeverError,
    );
    expect(
      await readFile(join(dir, "deepTreeEchoBotMemories.json"), "utf8"),
    ).toBe(before);

    const snapshotName = `deepTreeEchoBotMemories.json.bak-test`;
    await lever.apply(
      plan,
      { approve: true, expectedHash: plan.hash },
      {
        snapshot: async () => {
          await writeFile(join(dir, snapshotName), before, { mode: 0o600 });
        },
      },
    );
    const after = await readFile(
      join(dir, "deepTreeEchoBotMemories.json"),
      "utf8",
    );
    expect(after).not.toBe(before);
    const mode = (await stat(join(dir, snapshotName))).mode & 0o777;
    if (process.platform === "win32") {
      // Windows reports synthetic POSIX mode bits; ACL ownership is enforced by
      // the user-scoped temp directory. The portable invariant is no execute bit.
      expect(mode & 0o111).toBe(0);
    } else {
      expect(mode).toBe(0o600);
    }
    await rm(dir, { recursive: true, force: true });
  });

  it("includes unused_stores when a vector key file is present", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-vector-"));
    await seedDir(
      dir,
      [
        {
          id: "m",
          timestamp: Date.now(),
          chatId: 1,
          messageId: 1,
          sender: "user",
          text: "hello",
        },
      ],
      { "vectorMemoryStore_memories.json": "[]" },
    );
    const lever = await MemoryLever.openPath(dir);
    const result = lever.search("hello");
    expect(result.unused_stores).toContain("vectorMemoryStore");
    await rm(dir, { recursive: true, force: true });
  });
});

import { InMemoryStorage } from "../storage";
import {
  RAGMemoryStore,
  UnknownMemoryError,
  type Memory,
} from "../RAGMemoryStore";
import { MemoryLever, MemoryLeverError } from "../MemoryLever";

function memory(partial: Partial<Memory> & Pick<Memory, "id" | "text">): Memory {
  return {
    timestamp: Date.now(),
    chatId: 1,
    messageId: 1,
    sender: "user",
    ...partial,
  };
}

async function leverFromMemories(
  memories: Memory[],
  reflections: Array<Record<string, unknown>> = [],
): Promise<{ lever: MemoryLever; storage: InMemoryStorage; store: RAGMemoryStore }> {
  const storage = new InMemoryStorage();
  await storage.save("deepTreeEchoBotMemories", JSON.stringify(memories));
  await storage.save(
    "deepTreeEchoBotReflections",
    JSON.stringify(reflections),
  );
  const store = new RAGMemoryStore(storage);
  await store.ready();
  store.setEnabled(true);
  return { lever: new MemoryLever(store), storage, store };
}

describe("MemoryLever search", () => {
  it("returns only the matching memory and does not write", async () => {
    const { lever, storage } = await leverFromMemories([
      memory({ id: "mem_ts", text: "TypeScript programming" }),
      memory({ id: "mem_groc", text: "grocery list" }),
    ]);
    const saves: string[] = [];
    const originalSave = storage.save.bind(storage);
    storage.save = async (key, value) => {
      saves.push(key);
      return originalSave(key, value);
    };
    const result = lever.search("TypeScript");
    expect(result.hits.map((hit) => hit.id)).toEqual(["mem_ts"]);
    expect(saves).toEqual([]);
  });

  it("filters by chatId sender and time window", async () => {
    const now = Date.now();
    const { lever } = await leverFromMemories([
      memory({
        id: "in",
        text: "TypeScript in chat one",
        chatId: 1,
        sender: "user",
        timestamp: now,
      }),
      memory({
        id: "otherChat",
        text: "TypeScript in chat two",
        chatId: 2,
        sender: "user",
        timestamp: now,
      }),
      memory({
        id: "bot",
        text: "TypeScript from bot",
        chatId: 1,
        sender: "bot",
        timestamp: now,
      }),
      memory({
        id: "old",
        text: "TypeScript old",
        chatId: 1,
        sender: "user",
        timestamp: now - 10_000,
      }),
    ]);
    expect(lever.search("TypeScript", { chatId: 1 }).hits.map((h) => h.id)).toEqual(
      expect.arrayContaining(["in", "bot", "old"]),
    );
    expect(
      lever.search("TypeScript", { chatId: 1 }).hits.some((h) => h.id === "otherChat"),
    ).toBe(false);
    expect(
      lever.search("TypeScript", { sender: "user", chatId: 1 }).hits.every(
        (h) => h.sender === "user",
      ),
    ).toBe(true);
    expect(
      lever.search("TypeScript", { from: now - 1000, chatId: 1 }).hits.map(
        (h) => h.id,
      ),
    ).not.toContain("old");
  });

  it("filters reflections by type and aspect", async () => {
    const { lever } = await leverFromMemories(
      [memory({ id: "m", text: "hello" })],
      [
        {
          id: "r1",
          timestamp: 1,
          content: "periodic note",
          type: "periodic",
        },
        {
          id: "r2",
          timestamp: 2,
          content: "focused learning",
          type: "focused",
          aspect: "learning",
        },
      ],
    );
    const focused = lever.search("hello", {
      reflectionType: "focused",
      reflectionAspect: "learning",
    });
    expect(focused.reflections.map((r) => r.id)).toEqual(["r2"]);
  });

  it("limit returns only the top hit", async () => {
    const { lever } = await leverFromMemories([
      memory({ id: "a", text: "TypeScript programming language" }),
      memory({ id: "b", text: "TypeScript types" }),
    ]);
    expect(lever.search("TypeScript", { limit: 1 }).hits).toHaveLength(1);
  });

  it("budget truncates packed context but keeps hits", async () => {
    const { lever } = await leverFromMemories([
      memory({ id: "top", text: "TypeScript programming language tools" }),
      memory({
        id: "low",
        text: "TypeScript extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra",
      }),
    ]);
    const result = lever.search("TypeScript", { budgetChars: 80 });
    expect(result.hits.length).toBeGreaterThanOrEqual(2);
    expect(result.packedContext.length).toBeLessThanOrEqual(80);
    expect(result.packedContext).toContain("top");
    expect(result.packedContext.includes("low")).toBe(false);
  });

  it("empty store returns empty lists", async () => {
    const { lever } = await leverFromMemories([]);
    const result = lever.search("anything");
    expect(result.hits).toEqual([]);
    expect(result.reflections).toEqual([]);
  });

  it("includes keyword-matching reflections without type filters", async () => {
    const { lever } = await leverFromMemories(
      [memory({ id: "m", text: "hello" })],
      [
        {
          id: "r1",
          timestamp: 1,
          content: "TypeScript patterns in the neighborhood",
          type: "periodic",
        },
        {
          id: "r2",
          timestamp: 2,
          content: "unrelated grocery note",
          type: "periodic",
        },
      ],
    );
    expect(
      lever.search("TypeScript").reflections.map((item) => item.id),
    ).toEqual(["r1"]);
  });

  it("breaks equal scores by newer timestamp then id", async () => {
    const { lever } = await leverFromMemories([
      memory({
        id: "b",
        text: "TypeScript programming",
        timestamp: 100,
      }),
      memory({
        id: "a",
        text: "TypeScript programming",
        timestamp: 100,
      }),
      memory({
        id: "newer",
        text: "TypeScript programming",
        timestamp: 200,
      }),
    ]);
    const ids = lever.search("TypeScript").hits.map((hit) => hit.id);
    expect(ids[0]).toBe("newer");
    expect(ids.slice(1)).toEqual(["a", "b"]);
  });
});

describe("MemoryLever dream", () => {
  it("groups near-duplicates without writing", async () => {
    const { lever, storage } = await leverFromMemories([
      memory({
        id: "m1",
        text: "TypeScript is a typed superset of JavaScript",
        timestamp: 200,
      }),
      memory({
        id: "m2",
        text: "TypeScript is a typed JavaScript superset",
        timestamp: 100,
      }),
    ]);
    const saves: string[] = [];
    const originalSave = storage.save.bind(storage);
    storage.save = async (key, value) => {
      saves.push(key);
      return originalSave(key, value);
    };
    const plan = lever.dream();
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0].survivorId).toBe("m1");
    expect(plan.merges[0].loserIds).toContain("m2");
    expect(saves).toEqual([]);
  });

  it("flags ECS vs Vercel as a contradiction not a merge", async () => {
    const { lever } = await leverFromMemories([
      memory({ id: "ecs", text: "Deploy to ECS" }),
      memory({ id: "vercel", text: "Deploy to Vercel" }),
    ]);
    const plan = lever.dream();
    expect(plan.contradictions).toHaveLength(1);
    expect(plan.merges).toHaveLength(0);
    expect(plan.contradictions[0].ids.sort()).toEqual(["ecs", "vercel"]);
  });

  it("flags not/never pairs as contradictions", async () => {
    const { lever } = await leverFromMemories([
      memory({ id: "yes", text: "feature X is enabled for production" }),
      memory({ id: "nope", text: "feature X is not enabled for production" }),
    ]);
    const plan = lever.dream();
    expect(plan.contradictions).toHaveLength(1);
    expect(plan.merges).toHaveLength(0);
  });

  it("does not prune merge survivors of old near-duplicates", async () => {
    const old = Date.now() - 100 * 24 * 60 * 60 * 1000;
    const { lever } = await leverFromMemories([
      memory({
        id: "keep",
        text: "TypeScript is a typed superset of JavaScript",
        timestamp: old + 1,
      }),
      memory({
        id: "drop",
        text: "TypeScript is a typed JavaScript superset",
        timestamp: old,
      }),
    ]);
    const plan = lever.dream();
    expect(plan.merges).toHaveLength(1);
    expect(plan.prunes.map((item) => item.id)).not.toContain(
      plan.merges[0].survivorId,
    );
  });

  it("prunes old generic duplicates but not new or pinned or unique facts", async () => {
    const old = Date.now() - 100 * 24 * 60 * 60 * 1000;
    const { lever } = await leverFromMemories([
      memory({
        id: "oldDupA",
        text: "generic overlapping topic alpha",
        timestamp: old,
      }),
      memory({
        id: "oldDupB",
        text: "generic overlapping topic alpha",
        timestamp: old + 1,
      }),
      memory({
        id: "oldPinned",
        text: "generic overlapping topic alpha",
        timestamp: old,
        pinned: true,
      }),
      memory({
        id: "oldUnique",
        text: "one of a kind zebra fact",
        timestamp: old,
      }),
      memory({
        id: "fresh",
        text: "generic overlapping topic alpha",
        timestamp: Date.now(),
      }),
    ]);
    const plan = lever.dream({ threshold: 1.1 });
    const pruneIds = plan.prunes.map((item) => item.id);
    expect(pruneIds).toEqual(expect.arrayContaining(["oldDupA", "oldDupB"]));
    expect(pruneIds).not.toContain("oldPinned");
    expect(pruneIds).not.toContain("oldUnique");
    expect(pruneIds).not.toContain("fresh");
  });

  it("ignores tombstoned memories as inputs", async () => {
    const { lever } = await leverFromMemories([
      memory({
        id: "live",
        text: "TypeScript is a typed superset of JavaScript",
      }),
      memory({
        id: "dead",
        text: "TypeScript is a typed JavaScript superset",
        tombstoned: true,
      }),
    ]);
    const plan = lever.dream();
    expect(plan.merges).toHaveLength(0);
  });
});

describe("MemoryLever apply", () => {
  async function duplicateStore() {
    return leverFromMemories([
      memory({
        id: "m1",
        text: "TypeScript is a typed superset of JavaScript",
        timestamp: 200,
      }),
      memory({
        id: "m2",
        text: "TypeScript is a typed JavaScript superset extra clause",
        timestamp: 100,
      }),
    ]);
  }

  it("refuses without approve and leaves storage unchanged", async () => {
    const { lever, storage } = await duplicateStore();
    const before = await storage.load("deepTreeEchoBotMemories");
    const plan = lever.dream();
    await expect(lever.apply(plan, { approve: false })).rejects.toMatchObject({
      code: "unapproved",
    });
    expect(await storage.load("deepTreeEchoBotMemories")).toBe(before);
  });

  it("refuses hash mismatch", async () => {
    const { lever } = await duplicateStore();
    const plan = lever.dream();
    await expect(
      lever.apply(plan, { approve: true, expectedHash: "nope" }),
    ).rejects.toMatchObject({ code: "hash_mismatch" });
  });

  it("applies merge then yields no same-id merge on re-dream", async () => {
    const { lever, store } = await duplicateStore();
    const plan = lever.dream();
    expect(plan.merges.length).toBeGreaterThan(0);
    const audit = await lever.apply(plan, {
      approve: true,
      expectedHash: plan.hash,
    });
    expect(audit.applied.merges).toContain(plan.merges[0].survivorId);
    const survivor = store.getMemory(plan.merges[0].survivorId);
    expect(survivor.text.toLowerCase()).toContain("typescript");
    expect(store.getMemory(plan.merges[0].loserIds[0]).tombstoned).toBe(true);
    const second = lever.dream();
    const mergedIds = new Set([
      plan.merges[0].survivorId,
      ...plan.merges[0].loserIds,
    ]);
    expect(
      second.merges.some(
        (group) =>
          mergedIds.has(group.survivorId) ||
          group.loserIds.some((id) => mergedIds.has(id)),
      ),
    ).toBe(false);
  });

  it("keeps contradiction ids live after apply", async () => {
    const { lever, store } = await leverFromMemories([
      memory({ id: "ecs", text: "Deploy to ECS" }),
      memory({ id: "vercel", text: "Deploy to Vercel" }),
    ]);
    const plan = lever.dream();
    await lever.apply(plan, { approve: true, expectedHash: plan.hash });
    expect(store.getMemory("ecs").tombstoned).toBeFalsy();
    expect(store.getMemory("vercel").tombstoned).toBeFalsy();
  });

  it("beforeMutate throw leaves store unchanged", async () => {
    const { lever, storage } = await duplicateStore();
    const before = await storage.load("deepTreeEchoBotMemories");
    const plan = lever.dream();
    await expect(
      lever.apply(
        plan,
        { approve: true, expectedHash: plan.hash },
        {
          beforeMutate: async () => {
            throw new MemoryLeverError("locked", "held");
          },
        },
      ),
    ).rejects.toMatchObject({ code: "locked" });
    expect(await storage.load("deepTreeEchoBotMemories")).toBe(before);
  });

  it("restores snapshot when a mutation throws", async () => {
    const { lever, store, storage } = await duplicateStore();
    const before = await storage.load("deepTreeEchoBotMemories");
    const original = lever.dream();
    let restored = false;
    const originalTombstone = store.tombstoneMemory.bind(store);
    store.tombstoneMemory = async (id: string) => {
      if (id === original.merges[0].loserIds[0]) {
        throw new Error("boom");
      }
      return originalTombstone(id);
    };
    await expect(
      lever.apply(
        original,
        { approve: true, expectedHash: original.hash },
        {
          snapshot: async () => undefined,
          restore: async () => {
            restored = true;
            await storage.save("deepTreeEchoBotMemories", before || "[]");
          },
        },
      ),
    ).rejects.toThrow("boom");
    expect(restored).toBe(true);
    expect(store.getMemory("m1").tombstoned).toBeFalsy();
    expect(store.getMemory("m2").tombstoned).toBeFalsy();
    expect(store.isEnabled()).toBe(true);
  });

  it("maps unknown ids to unknown_id and leaves storage unchanged", async () => {
    const { lever, store, storage } = await duplicateStore();
    const before = await storage.load("deepTreeEchoBotMemories");
    const plan = lever.dream();
    const originalReplace = store.replaceMemory.bind(store);
    store.replaceMemory = async (id, patch) => {
      if (id === plan.merges[0].survivorId) {
        throw new UnknownMemoryError("missing");
      }
      return originalReplace(id, patch);
    };
    await expect(
      lever.apply(plan, { approve: true, expectedHash: plan.hash }),
    ).rejects.toMatchObject({ code: "unknown_id" });
    expect(store.getMemory("m1").tombstoned).toBeFalsy();
    expect(store.getMemory("m2").tombstoned).toBeFalsy();
  });

  it("snapshot throw leaves store unchanged", async () => {
    const { lever, storage } = await duplicateStore();
    const before = await storage.load("deepTreeEchoBotMemories");
    const plan = lever.dream();
    await expect(
      lever.apply(
        plan,
        { approve: true, expectedHash: plan.hash },
        {
          snapshot: async () => {
            throw new Error("snap fail");
          },
        },
      ),
    ).rejects.toThrow("snap fail");
    expect(await storage.load("deepTreeEchoBotMemories")).toBe(before);
  });
});

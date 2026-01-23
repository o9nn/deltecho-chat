/**
 * Tests for Cross-Platform Shared Memory Manager
 */

import {
  SharedMemoryManager,
  createSharedMemoryManager,
  MemoryType,
  MemoryEventType,
  InMemoryStoreBackend,
} from "../cross-platform/shared-memory";
import { Platform } from "../cross-platform/presence-manager";

describe("SharedMemoryManager", () => {
  let manager: SharedMemoryManager;

  beforeEach(() => {
    manager = createSharedMemoryManager(undefined, { debug: false });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Memory Storage", () => {
    it("should store a memory", async () => {
      const eventHandler = jest.fn();
      manager.on(MemoryEventType.MEMORY_ADDED, eventHandler);

      const memory = await manager.remember(
        MemoryType.FACT,
        "The user likes coffee",
        {
          userId: "user_123",
          platform: Platform.DISCORD,
          importance: 0.7,
        },
      );

      expect(memory.id).toBeDefined();
      expect(memory.type).toBe(MemoryType.FACT);
      expect(memory.content).toBe("The user likes coffee");
      expect(memory.userId).toBe("user_123");
      expect(memory.importance).toBe(0.7);
      expect(eventHandler).toHaveBeenCalled();
    });

    it("should use default importance if not specified", async () => {
      const memory = await manager.remember(
        MemoryType.CONVERSATION,
        "Hello there!",
      );

      expect(memory.importance).toBe(0.5);
    });
  });

  describe("Memory Retrieval", () => {
    it("should get memory by ID", async () => {
      const stored = await manager.remember(MemoryType.FACT, "Test memory");

      const retrieved = await manager.get(stored.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(stored.id);
      expect(retrieved?.content).toBe("Test memory");
    });

    it("should return null for non-existent memory", async () => {
      const retrieved = await manager.get("non_existent_id");
      expect(retrieved).toBeNull();
    });

    it("should increment access count on get", async () => {
      const stored = await manager.remember(MemoryType.FACT, "Test memory");

      expect(stored.accessCount).toBe(0);

      await manager.get(stored.id);
      const retrieved = await manager.get(stored.id);

      expect(retrieved?.accessCount).toBe(2);
    });
  });

  describe("Memory Search", () => {
    beforeEach(async () => {
      await manager.remember(MemoryType.FACT, "User likes coffee", {
        userId: "user_1",
      });
      await manager.remember(MemoryType.FACT, "User likes tea", {
        userId: "user_1",
      });
      await manager.remember(MemoryType.PREFERENCE, "Dark mode preferred", {
        userId: "user_1",
      });
      await manager.remember(MemoryType.FACT, "Another user likes coffee", {
        userId: "user_2",
      });
    });

    it("should search memories by query", async () => {
      const eventHandler = jest.fn();
      manager.on(MemoryEventType.MEMORY_RECALLED, eventHandler);

      const results = await manager.recall({ query: "coffee" });

      expect(results.length).toBe(2);
      expect(results[0].matchedTerms).toContain("coffee");
      expect(eventHandler).toHaveBeenCalled();
    });

    it("should filter by type", async () => {
      const results = await manager.recall({
        query: "likes",
        types: [MemoryType.FACT],
      });

      expect(results.length).toBe(3);
      results.forEach((r) => {
        expect(r.entry.type).toBe(MemoryType.FACT);
      });
    });

    it("should filter by userId", async () => {
      const results = await manager.recall({
        query: "likes",
        userId: "user_1",
      });

      expect(results.length).toBe(2);
      results.forEach((r) => {
        expect(r.entry.userId).toBe("user_1");
      });
    });

    it("should limit results", async () => {
      const results = await manager.recall({
        query: "likes",
        limit: 2,
      });

      expect(results.length).toBe(2);
    });

    it("should sort by relevance", async () => {
      const results = await manager.recall({
        query: "coffee likes",
      });

      // More matching terms = higher relevance
      expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
    });
  });

  describe("Memory Reinforcement", () => {
    it("should reinforce memory importance", async () => {
      const stored = await manager.remember(MemoryType.FACT, "Important fact", {
        importance: 0.5,
      });

      const reinforced = await manager.reinforce(stored.id, 0.3);

      expect(reinforced.importance).toBe(0.8);
    });

    it("should cap importance at 1", async () => {
      const stored = await manager.remember(MemoryType.FACT, "Important fact", {
        importance: 0.9,
      });

      const reinforced = await manager.reinforce(stored.id, 0.5);

      expect(reinforced.importance).toBe(1);
    });

    it("should throw error for non-existent memory", async () => {
      await expect(manager.reinforce("non_existent", 0.1)).rejects.toThrow(
        "Memory not found",
      );
    });
  });

  describe("Memory Deletion", () => {
    it("should delete memory", async () => {
      const eventHandler = jest.fn();
      manager.on(MemoryEventType.MEMORY_DELETED, eventHandler);

      const stored = await manager.remember(MemoryType.FACT, "To be deleted");
      const deleted = await manager.forget(stored.id);

      expect(deleted).toBe(true);
      expect(await manager.get(stored.id)).toBeNull();
      expect(eventHandler).toHaveBeenCalled();
    });

    it("should return false for non-existent memory", async () => {
      const deleted = await manager.forget("non_existent");
      expect(deleted).toBe(false);
    });
  });

  describe("User and Conversation Memories", () => {
    beforeEach(async () => {
      await manager.remember(MemoryType.FACT, "User fact 1", {
        userId: "user_1",
      });
      await manager.remember(MemoryType.FACT, "User fact 2", {
        userId: "user_1",
      });
      await manager.remember(MemoryType.CONVERSATION, "Conv message", {
        conversationId: "conv_1",
      });
    });

    it("should get memories for a user", async () => {
      const memories = await manager.getUserMemories("user_1");

      expect(memories.length).toBe(2);
      memories.forEach((m) => {
        expect(m.userId).toBe("user_1");
      });
    });

    it("should get memories for a conversation", async () => {
      const memories = await manager.getConversationMemories("conv_1");

      expect(memories.length).toBe(1);
      expect(memories[0].conversationId).toBe("conv_1");
    });
  });

  describe("Helper Methods", () => {
    it("should set user preference", async () => {
      const memory = await manager.setPreference(
        "user_1",
        "theme",
        "dark",
        Platform.DISCORD,
      );

      expect(memory.type).toBe(MemoryType.PREFERENCE);
      expect(memory.content).toBe("theme: dark");
      expect(memory.userId).toBe("user_1");
    });

    it("should store fact about user", async () => {
      const memory = await manager.storeFact(
        "user_1",
        "Works as a developer",
        0.8,
        Platform.TELEGRAM,
      );

      expect(memory.type).toBe(MemoryType.FACT);
      expect(memory.content).toBe("Works as a developer");
      expect(memory.importance).toBe(0.8);
    });

    it("should store relationship information", async () => {
      const memory = await manager.storeRelationship(
        "user_1",
        "Best friend of the bot",
        0.8,
        Platform.DISCORD,
      );

      expect(memory.type).toBe(MemoryType.RELATIONSHIP);
      expect(memory.valence).toBe(0.8);
    });
  });

  describe("Interaction Context", () => {
    beforeEach(async () => {
      await manager.storeFact("user_1", "Likes coding");
      await manager.setPreference("user_1", "lang", "TypeScript");
      await manager.remember(MemoryType.CONVERSATION, "Hello", {
        conversationId: "conv_1",
      });
    });

    it("should get interaction context", async () => {
      const context = await manager.getInteractionContext("user_1", "conv_1");

      expect(context.userMemories.length).toBeGreaterThan(0);
      expect(context.conversationMemories.length).toBe(1);
      expect(context.relevantFacts.length).toBeGreaterThan(0);
    });

    it("should work without conversationId", async () => {
      const context = await manager.getInteractionContext("user_1");

      expect(context.userMemories.length).toBeGreaterThan(0);
      expect(context.conversationMemories.length).toBe(0);
    });
  });
});

describe("InMemoryStoreBackend", () => {
  let backend: InMemoryStoreBackend;

  beforeEach(() => {
    backend = new InMemoryStoreBackend();
  });

  it("should add and get entries", async () => {
    const entry = await backend.add({
      type: MemoryType.FACT,
      content: "Test",
      importance: 0.5,
    });

    const retrieved = await backend.get(entry.id);
    expect(retrieved?.content).toBe("Test");
  });

  it("should update entries", async () => {
    const entry = await backend.add({
      type: MemoryType.FACT,
      content: "Original",
      importance: 0.5,
    });

    await backend.update(entry.id, { content: "Updated" });
    const retrieved = await backend.get(entry.id);

    expect(retrieved?.content).toBe("Updated");
  });

  it("should clear expired entries", async () => {
    await backend.add({
      type: MemoryType.FACT,
      content: "Expired",
      importance: 0.5,
      expiry: new Date(Date.now() - 1000), // Already expired
    });

    await backend.add({
      type: MemoryType.FACT,
      content: "Not expired",
      importance: 0.5,
      expiry: new Date(Date.now() + 10000), // Future
    });

    const cleared = await backend.clearExpired();
    expect(cleared).toBe(1);
  });
});

describe("createSharedMemoryManager", () => {
  it("should create with default backend", () => {
    const manager = createSharedMemoryManager();
    expect(manager).toBeInstanceOf(SharedMemoryManager);
    manager.destroy();
  });

  it("should create with custom backend", () => {
    const customBackend = new InMemoryStoreBackend();
    const manager = createSharedMemoryManager(customBackend);
    expect(manager).toBeInstanceOf(SharedMemoryManager);
    manager.destroy();
  });
});

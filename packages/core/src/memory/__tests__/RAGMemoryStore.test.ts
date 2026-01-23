import { RAGMemoryStore, _Memory, _ReflectionMemory } from "../RAGMemoryStore";
import { InMemoryStorage } from "../storage";

describe("RAGMemoryStore", () => {
  let ragMemory: RAGMemoryStore;
  let storage: InMemoryStorage;

  beforeEach(async () => {
    storage = new InMemoryStorage();
    ragMemory = new RAGMemoryStore(storage);
    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe("initialization", () => {
    it("should initialize with default values", () => {
      expect(ragMemory).toBeDefined();
    });

    it("should use provided storage", () => {
      const customStorage = new InMemoryStorage();
      const memory = new RAGMemoryStore(customStorage);
      expect(memory).toBeDefined();
    });

    it("should use in-memory storage when none provided", () => {
      const memory = new RAGMemoryStore();
      expect(memory).toBeDefined();
    });

    it("should accept custom options", () => {
      const memory = new RAGMemoryStore(storage, {
        memoryLimit: 500,
        reflectionLimit: 50,
      });
      expect(memory).toBeDefined();
    });
  });

  describe("enable/disable", () => {
    it("should be disabled by default", () => {
      const newMemory = new RAGMemoryStore(storage);
      expect(newMemory.isEnabled()).toBe(false);
    });

    it("should enable memory system", () => {
      ragMemory.setEnabled(true);
      expect(ragMemory.isEnabled()).toBe(true);
    });

    it("should disable memory system", () => {
      ragMemory.setEnabled(true);
      ragMemory.setEnabled(false);
      expect(ragMemory.isEnabled()).toBe(false);
    });
  });

  describe("storeMemory when enabled", () => {
    beforeEach(() => {
      ragMemory.setEnabled(true);
    });

    it("should store a memory when enabled", async () => {
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 100,
        sender: "user",
        text: "Hello, world!",
      });

      const memories = ragMemory.getMemoriesByChat(1);
      expect(memories.length).toBe(1);
      expect(memories[0].text).toBe("Hello, world!");
    });

    it("should generate unique IDs for memories", async () => {
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 100,
        sender: "user",
        text: "First message",
      });

      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 101,
        sender: "bot",
        text: "Second message",
      });

      const memories = ragMemory.getMemoriesByChat(1);
      expect(memories.length).toBe(2);
      expect(memories[0].id).not.toBe(memories[1].id);
    });

    it("should return memories for specific chat", async () => {
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 1,
        sender: "user",
        text: "Chat 1 message",
      });
      await ragMemory.storeMemory({
        chatId: 2,
        messageId: 2,
        sender: "user",
        text: "Chat 2 message",
      });
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 3,
        sender: "bot",
        text: "Chat 1 reply",
      });

      const chat1Memories = ragMemory.getMemoriesByChat(1);
      const chat2Memories = ragMemory.getMemoriesByChat(2);

      expect(chat1Memories.length).toBe(2);
      expect(chat2Memories.length).toBe(1);
    });

    it("should retrieve recent memories as formatted strings", async () => {
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 1,
        sender: "user",
        text: "Hello",
      });
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 2,
        sender: "bot",
        text: "Hi there",
      });

      const recent = ragMemory.retrieveRecentMemories(10);
      expect(recent.length).toBe(2);
    });

    it("should search memories by keyword", async () => {
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 1,
        sender: "user",
        text: "I love TypeScript programming",
      });
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 2,
        sender: "user",
        text: "Python is also great",
      });

      const results = ragMemory.searchMemories("TypeScript");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].text).toContain("TypeScript");
    });

    it("should clear all memories", async () => {
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 1,
        sender: "user",
        text: "Message 1",
      });
      await ragMemory.storeMemory({
        chatId: 2,
        messageId: 2,
        sender: "user",
        text: "Message 2",
      });

      await ragMemory.clearAllMemories();

      const memories1 = ragMemory.getMemoriesByChat(1);
      const memories2 = ragMemory.getMemoriesByChat(2);
      expect(memories1.length).toBe(0);
      expect(memories2.length).toBe(0);
    });

    it("should clear memories for specific chat only", async () => {
      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 1,
        sender: "user",
        text: "Chat 1",
      });
      await ragMemory.storeMemory({
        chatId: 2,
        messageId: 2,
        sender: "user",
        text: "Chat 2",
      });

      await ragMemory.clearChatMemories(1);

      const memories1 = ragMemory.getMemoriesByChat(1);
      const memories2 = ragMemory.getMemoriesByChat(2);
      expect(memories1.length).toBe(0);
      expect(memories2.length).toBe(1);
    });
  });

  describe("storeMemory when disabled", () => {
    it("should not store memory when disabled", async () => {
      ragMemory.setEnabled(false);

      await ragMemory.storeMemory({
        chatId: 1,
        messageId: 100,
        sender: "user",
        text: "Should not be stored",
      });

      const memories = ragMemory.getMemoriesByChat(1);
      expect(memories.length).toBe(0);
    });
  });

  describe("storeReflection when enabled", () => {
    beforeEach(() => {
      ragMemory.setEnabled(true);
    });

    it("should store a periodic reflection", async () => {
      await ragMemory.storeReflection("This is a reflection", "periodic");

      const reflections = ragMemory.getRecentReflections(10);
      expect(reflections.length).toBe(1);
      expect(reflections[0].content).toBe("This is a reflection");
      expect(reflections[0].type).toBe("periodic");
    });

    it("should store a focused reflection with aspect", async () => {
      await ragMemory.storeReflection("Focused thought", "focused", "learning");

      const reflections = ragMemory.getRecentReflections(10);
      expect(reflections.length).toBe(1);
      expect(reflections[0].type).toBe("focused");
      expect(reflections[0].aspect).toBe("learning");
    });

    it("should return recent reflections", async () => {
      await ragMemory.storeReflection("Reflection 1");
      await ragMemory.storeReflection("Reflection 2");
      await ragMemory.storeReflection("Reflection 3");

      const reflections = ragMemory.getRecentReflections(2);
      expect(reflections.length).toBe(2);
    });
  });

  describe("storeReflection when disabled", () => {
    it("should not store reflection when disabled", async () => {
      ragMemory.setEnabled(false);

      await ragMemory.storeReflection("Should not be stored");

      const reflections = ragMemory.getRecentReflections(10);
      expect(reflections.length).toBe(0);
    });
  });
});

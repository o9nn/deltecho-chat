import { RAGMemoryStore, Memory } from "../RAGMemoryStore";

// Mock logger
jest.mock("../../../../../shared/logger", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock runtime with promise-based implementation
jest.mock("@deltachat-desktop/runtime-interface", () => ({
  runtime: {
    getDesktopSettings: jest.fn().mockResolvedValue({
      deepTreeEchoBotMemories: "[]",
      deepTreeEchoBotReflections: "[]",
      deepTreeEchoBotMemoryEnabled: true, // Enable memory by default for tests
    }),
    setDesktopSetting: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("RAGMemoryStore", () => {
  let memoryStore: RAGMemoryStore;

  beforeEach(async () => {
    // Reset the singleton by accessing the private static property
    // @ts-expect-error - accessing private static for test cleanup
    RAGMemoryStore.instance = undefined;

    // Get fresh instance and wait for initialization
    memoryStore = RAGMemoryStore.getInstance();

    // Give time for async loadMemories to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Ensure enabled state is set (after loadMemories completes)
    memoryStore.setEnabled(true);
  });

  afterEach(() => {
    // Clean up singleton after each test
    // @ts-expect-error - accessing private static for test cleanup
    RAGMemoryStore.instance = undefined;
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = RAGMemoryStore.getInstance();
      const instance2 = RAGMemoryStore.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("setEnabled/isEnabled", () => {
    it("should enable and disable memory system", () => {
      expect(memoryStore.isEnabled()).toBe(true); // Set in beforeEach

      memoryStore.setEnabled(false);
      expect(memoryStore.isEnabled()).toBe(false);

      memoryStore.setEnabled(true);
      expect(memoryStore.isEnabled()).toBe(true);
    });
  });

  describe("addMemory/storeMemory", () => {
    it("should add a memory successfully", async () => {
      const memory = {
        text: "Test memory",
        sender: "user" as const,
        chatId: 123,
        messageId: 456,
      };

      await memoryStore.addMemory(memory);

      // Verify by retrieving memories
      const memories = memoryStore.getMemoriesByChatId(123);
      expect(memories.length).toBeGreaterThan(0);
      const lastMemory = memories[memories.length - 1];
      expect(lastMemory.text).toBe(memory.text);
      expect(lastMemory.sender).toBe(memory.sender);
    });

    it("should not add memory when disabled", async () => {
      memoryStore.setEnabled(false);

      await memoryStore.addMemory({
        text: "Should not be added",
        sender: "user" as const,
        chatId: 999,
        messageId: 456,
      });

      const memories = memoryStore.getMemoriesByChatId(999);
      expect(memories).toHaveLength(0);
    });
  });

  describe("getMemoriesByChatId", () => {
    it("should return memories for a specific chat ID", async () => {
      await memoryStore.addMemory({
        text: "Memory in chat 111",
        sender: "user" as const,
        chatId: 111,
        messageId: 1,
      });

      await memoryStore.addMemory({
        text: "Memory in chat 222",
        sender: "bot" as const,
        chatId: 222,
        messageId: 2,
      });

      const memories111 = memoryStore.getMemoriesByChatId(111);
      const memories222 = memoryStore.getMemoriesByChatId(222);

      expect(memories111.length).toBe(1);
      expect(memories222.length).toBe(1);
      expect(memories111[0].text).toBe("Memory in chat 111");
      expect(memories222[0].text).toBe("Memory in chat 222");
    });

    it("should return an empty array for a chat with no memories", () => {
      const memories = memoryStore.getMemoriesByChatId(99999);
      expect(memories).toEqual([]);
    });
  });

  describe("getLatestChatMemories", () => {
    it("should return the latest memories for a chat (most recent first)", async () => {
      // Add 5 memories with unique chat ID
      for (let i = 0; i < 5; i++) {
        await memoryStore.addMemory({
          text: `Memory ${i}`,
          sender: i % 2 === 0 ? ("user" as const) : ("bot" as const),
          chatId: 333,
          messageId: i,
        });
        // Small delay between adds to ensure unique timestamps
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const latestMemories = memoryStore.getLatestChatMemories(333, 3);

      // Should return at most 3 memories
      expect(latestMemories.length).toBeLessThanOrEqual(3);
      expect(latestMemories.length).toBeGreaterThan(0);
    });

    it("should limit the number of memories returned", async () => {
      // Add 10 memories with unique chat ID
      for (let i = 0; i < 10; i++) {
        await memoryStore.addMemory({
          text: `Memory ${i}`,
          sender: "user" as const,
          chatId: 444,
          messageId: i,
        });
      }

      const latestMemories = memoryStore.getLatestChatMemories(444, 5);
      expect(latestMemories.length).toBeLessThanOrEqual(5);
    });
  });

  describe("searchMemories", () => {
    it("should find memories matching the search query", async () => {
      await memoryStore.addMemory({
        text: "I like apples and bananas",
        sender: "user" as const,
        chatId: 555,
        messageId: 1,
      });

      await memoryStore.addMemory({
        text: "Bananas are yellow",
        sender: "bot" as const,
        chatId: 555,
        messageId: 2,
      });

      await memoryStore.addMemory({
        text: "Apples are red or green",
        sender: "user" as const,
        chatId: 555,
        messageId: 3,
      });

      const bananaResults = memoryStore.searchMemories("banana");
      const appleResults = memoryStore.searchMemories("apple");
      const fruitResults = memoryStore.searchMemories("fruit");

      expect(bananaResults.length).toBe(2);
      expect(appleResults.length).toBe(2);
      expect(fruitResults.length).toBe(0); // No exact match
    });

    it("should be case insensitive", async () => {
      await memoryStore.addMemory({
        text: "Hello World",
        sender: "user" as const,
        chatId: 666,
        messageId: 1,
      });

      const upperResults = memoryStore.searchMemories("HELLO");
      const lowerResults = memoryStore.searchMemories("hello");

      expect(upperResults.length).toBe(1);
      expect(lowerResults.length).toBe(1);
    });
  });

  describe("deleteChatMemories", () => {
    it("should delete all memories for a specific chat", async () => {
      // Add memories for two different chats
      await memoryStore.addMemory({
        text: "Memory in chat 777",
        sender: "user" as const,
        chatId: 777,
        messageId: 1,
      });

      await memoryStore.addMemory({
        text: "Another memory in chat 777",
        sender: "bot" as const,
        chatId: 777,
        messageId: 2,
      });

      await memoryStore.addMemory({
        text: "Memory in chat 888",
        sender: "user" as const,
        chatId: 888,
        messageId: 3,
      });

      // Verify initial state
      expect(memoryStore.getMemoriesByChatId(777).length).toBe(2);
      expect(memoryStore.getMemoriesByChatId(888).length).toBe(1);

      // Delete memories for chat 777
      await memoryStore.deleteChatMemories(777);

      // Verify final state
      expect(memoryStore.getMemoriesByChatId(777).length).toBe(0);
      expect(memoryStore.getMemoriesByChatId(888).length).toBe(1);
    });
  });

  describe("getStats", () => {
    it("should return the correct statistics", async () => {
      // Start with clean state
      await memoryStore.clearAllMemories();

      // Add memories for two different chats
      await memoryStore.addMemory({
        text: "Memory 1 in chat 1001",
        sender: "user" as const,
        chatId: 1001,
        messageId: 1,
      });

      await memoryStore.addMemory({
        text: "Memory 2 in chat 1001",
        sender: "bot" as const,
        chatId: 1001,
        messageId: 2,
      });

      await memoryStore.addMemory({
        text: "Memory 1 in chat 1002",
        sender: "user" as const,
        chatId: 1002,
        messageId: 3,
      });

      const stats = memoryStore.getStats();

      expect(stats.totalMemories).toBe(3);
      expect(Object.keys(stats.memoriesByChat).length).toBe(2);
      expect(stats.memoriesByChat[1001]).toBe(2);
      expect(stats.memoriesByChat[1002]).toBe(1);
    });
  });

  describe("clearAllMemories", () => {
    it("should clear all memories", async () => {
      await memoryStore.addMemory({
        text: "Test memory",
        sender: "user" as const,
        chatId: 2001,
        messageId: 1,
      });

      expect(memoryStore.getStats().totalMemories).toBeGreaterThan(0);

      await memoryStore.clearAllMemories();

      expect(memoryStore.getStats().totalMemories).toBe(0);
    });
  });

  describe("storeReflection", () => {
    it("should store a reflection memory", async () => {
      await memoryStore.clearAllMemories();
      await memoryStore.storeReflection("This is a reflection", "periodic");

      const stats = memoryStore.getStats();
      expect(stats.totalReflections).toBe(1);
    });

    it("should store a focused reflection with aspect", async () => {
      await memoryStore.storeReflection(
        "Focused thought",
        "focused",
        "communication",
      );

      const reflections = memoryStore.getRecentReflections(1);
      expect(reflections.length).toBeGreaterThan(0);
      const lastReflection = reflections[reflections.length - 1];
      expect(lastReflection.type).toBe("focused");
      expect(lastReflection.aspect).toBe("communication");
    });
  });

  describe("getConversationContext", () => {
    it("should return limited conversation context", async () => {
      // Add many messages with unique chat ID
      for (let i = 0; i < 20; i++) {
        await memoryStore.addMemory({
          text: `Message ${i}`,
          sender: i % 2 === 0 ? "user" : "bot",
          chatId: 3001,
          messageId: i,
        });
      }

      const context = memoryStore.getConversationContext(3001, 5);
      expect(context.length).toBeLessThanOrEqual(5);
    });
  });
});

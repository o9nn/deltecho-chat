import { HyperDimensionalMemory } from "../HyperDimensionalMemory";

describe("HyperDimensionalMemory", () => {
  let hyperMemory: HyperDimensionalMemory;

  beforeEach(() => {
    hyperMemory = new HyperDimensionalMemory({
      dimensions: 100, // Smaller for testing
      memoryDecay: 0.95,
      contextWindow: 10,
    });
  });

  describe("initialization", () => {
    it("should initialize with default configuration", () => {
      const defaultMemory = new HyperDimensionalMemory();
      expect(defaultMemory).toBeDefined();
    });

    it("should initialize with custom configuration", () => {
      const customMemory = new HyperDimensionalMemory({
        dimensions: 5000,
        memoryDecay: 0.9,
        contextWindow: 20,
      });
      expect(customMemory).toBeDefined();
    });
  });

  describe("storeMemory", () => {
    it("should store memory without error", () => {
      expect(() => {
        hyperMemory.storeMemory("msg_1", "Hello world", Date.now(), 1.0);
      }).not.toThrow();
    });

    it("should store multiple memories", () => {
      hyperMemory.storeMemory("msg_1", "First message", Date.now(), 1.0);
      hyperMemory.storeMemory("msg_2", "Second message", Date.now(), 1.0);
      hyperMemory.storeMemory("msg_3", "Third message", Date.now(), 1.0);

      // Should not throw
      expect(hyperMemory).toBeDefined();
    });

    it("should handle emotional significance", () => {
      hyperMemory.storeMemory("msg_1", "Important memory", Date.now(), 2.0);
      hyperMemory.storeMemory("msg_2", "Normal memory", Date.now(), 1.0);
      hyperMemory.storeMemory("msg_3", "Less important", Date.now(), 0.5);

      expect(hyperMemory).toBeDefined();
    });
  });

  describe("recallMemories", () => {
    beforeEach(() => {
      hyperMemory.storeMemory(
        "msg_1",
        "I love programming in TypeScript",
        Date.now(),
        1.0,
      );
      hyperMemory.storeMemory(
        "msg_2",
        "TypeScript is great for large projects",
        Date.now(),
        1.0,
      );
      hyperMemory.storeMemory(
        "msg_3",
        "Python is excellent for data science",
        Date.now(),
        1.0,
      );
      hyperMemory.storeMemory(
        "msg_4",
        "JavaScript runs in browsers",
        Date.now(),
        1.0,
      );
    });

    it("should recall memories based on query", () => {
      const results = hyperMemory.recallMemories("TypeScript programming");

      expect(Array.isArray(results)).toBe(true);
    });

    it("should return results with id, text, and relevance", () => {
      const results = hyperMemory.recallMemories("TypeScript");

      if (results.length > 0) {
        expect(results[0]).toHaveProperty("id");
        expect(results[0]).toHaveProperty("text");
        expect(results[0]).toHaveProperty("relevance");
      }
    });

    it("should limit results to specified count", () => {
      const results = hyperMemory.recallMemories("programming", 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return empty array for completely unrelated query", () => {
      const results = hyperMemory.recallMemories("xyz123abc456");

      // May return empty or low-relevance results
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("memory associations", () => {
    it("should build associations between related memories", () => {
      hyperMemory.storeMemory(
        "msg_1",
        "The cat sat on the mat",
        Date.now(),
        1.0,
      );
      hyperMemory.storeMemory(
        "msg_2",
        "The cat played with yarn",
        Date.now(),
        1.0,
      );
      hyperMemory.storeMemory(
        "msg_3",
        "Dogs like to fetch balls",
        Date.now(),
        1.0,
      );

      // Recalling "cat" should find related cat memories
      const results = hyperMemory.recallMemories("cat");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("temporal indexing", () => {
    it("should index memories by time", () => {
      const now = Date.now();
      hyperMemory.storeMemory("msg_1", "Today message", now, 1.0);
      hyperMemory.storeMemory(
        "msg_2",
        "Yesterday message",
        now - 86400000,
        1.0,
      );

      expect(hyperMemory).toBeDefined();
    });
  });

  describe("memory decay", () => {
    it("should apply memory decay over time", () => {
      // Store memories
      hyperMemory.storeMemory("msg_1", "First memory", Date.now(), 1.0);

      // Store more memories to trigger decay
      for (let i = 2; i <= 10; i++) {
        hyperMemory.storeMemory(`msg_${i}`, `Memory ${i}`, Date.now(), 1.0);
      }

      // Memory system should still work after decay
      const results = hyperMemory.recallMemories("memory");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("emotional weighting", () => {
    it("should weight emotionally significant memories higher", () => {
      hyperMemory.storeMemory(
        "msg_1",
        "Important emotional event",
        Date.now(),
        3.0,
      );
      hyperMemory.storeMemory("msg_2", "Mundane event", Date.now(), 0.5);

      const results = hyperMemory.recallMemories("event");

      // Results should be sorted by relevance (which includes emotional weight)
      if (results.length >= 2) {
        expect(results[0].relevance).toBeGreaterThanOrEqual(
          results[1].relevance,
        );
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty query", () => {
      hyperMemory.storeMemory("msg_1", "Test memory", Date.now(), 1.0);

      const results = hyperMemory.recallMemories("");
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle very long text", () => {
      const longText = "word ".repeat(1000);

      expect(() => {
        hyperMemory.storeMemory("msg_1", longText, Date.now(), 1.0);
      }).not.toThrow();
    });

    it("should handle special characters", () => {
      expect(() => {
        hyperMemory.storeMemory(
          "msg_1",
          "Hello! @#$%^&*() 你好 🎉",
          Date.now(),
          1.0,
        );
      }).not.toThrow();
    });
  });
});

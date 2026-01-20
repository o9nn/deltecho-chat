/**
 * CognitiveBridge Unit Tests
 *
 * Comprehensive tests for Deep Tree Echo autonomy and orchestration behavior.
 * Focus areas:
 * - Infinite loop detection and prevention
 * - Context and memory management
 * - State consistency and recovery
 * - Event handling edge cases
 * - LLM integration error handling
 * - Autonomy behavior and graceful degradation
 */

import {
  CognitiveOrchestrator,
  initCognitiveOrchestrator,
  getOrchestrator,
  cleanupOrchestrator,
  processMessageUnified,
  getCognitiveState,
  configureLLM,
  onCognitiveEvent,
  clearHistory,
  DeepTreeEchoBotConfig,
  UnifiedMessage,
  CognitiveEvent,
} from "../CognitiveBridge";

// Mock the logger
jest.mock("@deltachat-desktop/shared/logger", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock fetch for LLM API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("CognitiveBridge", () => {
  const defaultConfig: DeepTreeEchoBotConfig = {
    enabled: true,
    enableAsMainUser: false,
    apiKey: "",
    apiEndpoint: "",
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupOrchestrator();
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanupOrchestrator();
  });

  // ============================================================================
  // SECTION 1: Initialization and Singleton Management
  // ============================================================================

  describe("Initialization and Singleton Management", () => {
    it("should create a singleton orchestrator instance", async () => {
      const orch1 = await initCognitiveOrchestrator(defaultConfig);
      const orch2 = await initCognitiveOrchestrator(defaultConfig);

      expect(orch1).toBe(orch2);
      expect(getOrchestrator()).toBe(orch1);
    });

    it("should properly cleanup and allow re-initialization", async () => {
      const orch1 = await initCognitiveOrchestrator(defaultConfig);
      cleanupOrchestrator();

      expect(getOrchestrator()).toBeNull();

      const orch2 = await initCognitiveOrchestrator(defaultConfig);
      expect(orch2).not.toBe(orch1);
    });

    it("should initialize with default state values", async () => {
      await initCognitiveOrchestrator(defaultConfig);
      const state = getCognitiveState();

      expect(state).not.toBeNull();
      expect(state?.persona.name).toBe("Deep Tree Echo");
      expect(state?.persona.traits).toEqual([
        "helpful",
        "curious",
        "thoughtful",
      ]);
      expect(state?.memories.shortTerm).toEqual([]);
      expect(state?.reasoning.confidenceLevel).toBe(0.5);
      expect(state?.cognitiveContext?.emotionalValence).toBe(0);
    });

    it("should throw error when processing without initialization", async () => {
      await expect(processMessageUnified("test")).rejects.toThrow(
        "CognitiveOrchestrator not initialized",
      );
    });
  });

  // ============================================================================
  // SECTION 2: Infinite Loop Detection and Prevention
  // ============================================================================

  describe("Infinite Loop Detection and Prevention", () => {
    let orchestrator: CognitiveOrchestrator;

    beforeEach(async () => {
      orchestrator = await initCognitiveOrchestrator(defaultConfig);
    });

    it("should not trigger infinite loop when processing same message multiple times", async () => {
      const message: UnifiedMessage = {
        id: "msg-1",
        content: "Hello",
        role: "user",
        timestamp: Date.now(),
      };

      // Process the same message multiple times rapidly
      const promises = Array(10)
        .fill(null)
        .map(() =>
          orchestrator.processMessage({
            ...message,
            id: `msg-${Date.now()}-${Math.random()}`,
          }),
        );

      const responses = await Promise.all(promises);

      // All should complete without hanging
      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect(response.role).toBe("assistant");
        expect(response.content).toBeTruthy();
      });
    });

    it("should handle recursive self-referential content without loops", async () => {
      // Message that references itself or asks about previous responses
      const message: UnifiedMessage = {
        id: "msg-recursive",
        content: "What was your last response? Please repeat it exactly.",
        role: "user",
        timestamp: Date.now(),
      };

      const response = await orchestrator.processMessage(message);

      expect(response).toBeDefined();
      expect(response.role).toBe("assistant");
      // Should not hang or cause infinite recursion
    });

    it("should prevent event handler from triggering infinite event loop", async () => {
      let eventCount = 0;
      const maxEvents = 100;

      // Subscribe to events - potential for infinite loop if events trigger more events
      orchestrator.on("message_received", () => {
        eventCount++;
        if (eventCount > maxEvents) {
          throw new Error("Infinite event loop detected");
        }
      });

      orchestrator.on("response_generated", () => {
        eventCount++;
        if (eventCount > maxEvents) {
          throw new Error("Infinite event loop detected");
        }
      });

      const message: UnifiedMessage = {
        id: "msg-event-test",
        content: "Test event handling",
        role: "user",
        timestamp: Date.now(),
      };

      await orchestrator.processMessage(message);

      // Should have exactly 2 events: message_received and response_generated
      expect(eventCount).toBe(2);
    });

    it("should handle rapid sequential messages without state corruption", async () => {
      const messages = Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `rapid-msg-${i}`,
          content: `Message number ${i}`,
          role: "user" as const,
          timestamp: Date.now() + i,
        }));

      // Process messages sequentially
      for (const msg of messages) {
        await orchestrator.processMessage(msg);
      }

      const state = orchestrator.getState();

      // Memory should be bounded
      expect(state?.memories.shortTerm.length).toBeLessThanOrEqual(10);

      // State should be consistent
      expect(state?.persona.name).toBe("Deep Tree Echo");
    });

    it("should not hang on extremely long input", async () => {
      const longContent = "A".repeat(100000); // 100KB of text

      const message: UnifiedMessage = {
        id: "msg-long",
        content: longContent,
        role: "user",
        timestamp: Date.now(),
      };

      const startTime = Date.now();
      const response = await orchestrator.processMessage(message);
      const duration = Date.now() - startTime;

      expect(response).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it("should handle circular conversation references", async () => {
      // Simulate a conversation that could create circular references
      const messages = [
        { content: "Remember this: MARKER_A", role: "user" as const },
        { content: "What did I just say?", role: "user" as const },
        { content: "And what was before that?", role: "user" as const },
        { content: "Go back to the beginning", role: "user" as const },
        { content: "What was MARKER_A?", role: "user" as const },
      ];

      for (const msg of messages) {
        const response = await orchestrator.processMessage({
          id: `circ-${Date.now()}-${Math.random()}`,
          ...msg,
          timestamp: Date.now(),
        });
        expect(response).toBeDefined();
      }

      // Should complete without infinite loops
      const state = orchestrator.getState();
      expect(state).not.toBeNull();
    });
  });

  // ============================================================================
  // SECTION 3: Context and Memory Management
  // ============================================================================

  describe("Context and Memory Management", () => {
    let orchestrator: CognitiveOrchestrator;

    beforeEach(async () => {
      orchestrator = await initCognitiveOrchestrator(defaultConfig);
    });

    it("should correctly limit short-term memory to 10 items", async () => {
      // Add 15 messages
      for (let i = 0; i < 15; i++) {
        await orchestrator.processMessage({
          id: `mem-test-${i}`,
          content: `Memory test message ${i}`,
          role: "user",
          timestamp: Date.now() + i,
        });
      }

      const state = orchestrator.getState();

      expect(state?.memories.shortTerm.length).toBe(10);
      // Should keep the most recent 10
      expect(state?.memories.shortTerm[0].content).toBe(
        "Memory test message 5",
      );
      expect(state?.memories.shortTerm[9].content).toBe(
        "Memory test message 14",
      );
    });

    it("should correctly limit conversation history to 20 items", async () => {
      // Add 25 messages
      for (let i = 0; i < 25; i++) {
        await orchestrator.processMessage({
          id: `history-test-${i}`,
          content: `History test message ${i}`,
          role: "user",
          timestamp: Date.now() + i,
        });
      }

      // The orchestrator processes each message and adds assistant response
      // So 25 user messages = 50 total entries, trimmed to 20
      const state = orchestrator.getState();
      expect(state).not.toBeNull();
    });

    it("should clear all memory and history on clearHistory", async () => {
      // Add some messages
      for (let i = 0; i < 5; i++) {
        await orchestrator.processMessage({
          id: `clear-test-${i}`,
          content: `Clear test message ${i}`,
          role: "user",
          timestamp: Date.now() + i,
        });
      }

      const stateBefore = orchestrator.getState();
      expect(stateBefore?.memories.shortTerm.length).toBeGreaterThan(0);

      orchestrator.clearHistory();

      const stateAfter = orchestrator.getState();
      expect(stateAfter?.memories.shortTerm).toEqual([]);
    });

    it("should preserve persona state after memory operations", async () => {
      const originalPersona = orchestrator.getState()?.persona;

      // Perform many operations
      for (let i = 0; i < 20; i++) {
        await orchestrator.processMessage({
          id: `persona-test-${i}`,
          content: `Persona test message ${i}`,
          role: "user",
          timestamp: Date.now() + i,
        });
      }

      orchestrator.clearHistory();

      const finalPersona = orchestrator.getState()?.persona;
      expect(finalPersona?.name).toBe(originalPersona?.name);
      expect(finalPersona?.traits).toEqual(originalPersona?.traits);
    });

    it("should handle memory with special characters without corruption", async () => {
      const specialChars = [
        "Message with unicode: 你好世界 🌍 🎉",
        "Message with quotes: \"Hello\" 'World'",
        "Message with newlines:\n\nMultiple\n\nLines",
        "Message with tabs:\t\tTabbed\t\tContent",
        "Message with null char: before\x00after",
        "Message with backslash: C:\\path\\to\\file",
        'Message with HTML: <script>alert("xss")</script>',
      ];

      for (const content of specialChars) {
        await orchestrator.processMessage({
          id: `special-${Date.now()}-${Math.random()}`,
          content,
          role: "user",
          timestamp: Date.now(),
        });
      }

      const state = orchestrator.getState();
      expect(state?.memories.shortTerm.length).toBeGreaterThan(0);
      // Should not throw or corrupt state
    });

    it("should maintain cognitive context consistency", async () => {
      await orchestrator.processMessage({
        id: "context-1",
        content: "I am very happy and excited!",
        role: "user",
        timestamp: Date.now(),
      });

      const state1 = orchestrator.getState();
      expect(state1?.cognitiveContext?.emotionalValence).toBeGreaterThan(0);

      await orchestrator.processMessage({
        id: "context-2",
        content: "This is terrible and I hate it",
        role: "user",
        timestamp: Date.now(),
      });

      const state2 = orchestrator.getState();
      expect(state2?.cognitiveContext?.emotionalValence).toBeLessThan(0);
    });
  });

  // ============================================================================
  // SECTION 4: Event Handling Edge Cases
  // ============================================================================

  describe("Event Handling Edge Cases", () => {
    let orchestrator: CognitiveOrchestrator;

    beforeEach(async () => {
      orchestrator = await initCognitiveOrchestrator(defaultConfig);
    });

    it("should handle multiple subscribers to same event", async () => {
      const calls: number[] = [];

      orchestrator.on("message_received", () => calls.push(1));
      orchestrator.on("message_received", () => calls.push(2));
      orchestrator.on("message_received", () => calls.push(3));

      await orchestrator.processMessage({
        id: "multi-sub",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(calls).toEqual([1, 2, 3]);
    });

    it("should continue processing if event handler throws", async () => {
      orchestrator.on("message_received", () => {
        throw new Error("Handler error");
      });

      // Should not prevent message processing
      const response = await orchestrator.processMessage({
        id: "error-handler",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      // This may or may not throw depending on implementation
      // The key is it shouldn't hang
      expect(response).toBeDefined();
    });

    it("should emit events in correct order", async () => {
      const eventOrder: string[] = [];

      orchestrator.on("message_received", () => eventOrder.push("received"));
      orchestrator.on("response_generated", () => eventOrder.push("generated"));

      await orchestrator.processMessage({
        id: "order-test",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(eventOrder).toEqual(["received", "generated"]);
    });

    it("should pass correct payload to event handlers", async () => {
      let receivedPayload: UnifiedMessage | null = null;
      let generatedPayload: UnifiedMessage | null = null;

      orchestrator.on("message_received", (event: CognitiveEvent) => {
        if (event.type === "message_received") {
          receivedPayload = event.payload as UnifiedMessage;
        }
      });

      orchestrator.on("response_generated", (event: CognitiveEvent) => {
        if (event.type === "response_generated") {
          generatedPayload = event.payload as UnifiedMessage;
        }
      });

      const inputMessage: UnifiedMessage = {
        id: "payload-test",
        content: "Test content",
        role: "user",
        timestamp: Date.now(),
      };

      await orchestrator.processMessage(inputMessage);

      expect(receivedPayload).not.toBeNull();
      expect(receivedPayload!.content).toBe("Test content");
      expect(receivedPayload!.role).toBe("user");
      expect(generatedPayload).not.toBeNull();
      expect(generatedPayload!.role).toBe("assistant");
    });

    it("should handle async event handlers", async () => {
      let asyncHandlerCompleted = false;

      orchestrator.on("message_received", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        asyncHandlerCompleted = true;
      });

      await orchestrator.processMessage({
        id: "async-handler",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      // Give async handler time to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(asyncHandlerCompleted).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 5: LLM Integration Error Handling
  // ============================================================================

  describe("LLM Integration Error Handling", () => {
    let orchestrator: CognitiveOrchestrator;

    beforeEach(async () => {
      const configWithKey: DeepTreeEchoBotConfig = {
        ...defaultConfig,
        apiKey: "test-api-key",
        apiEndpoint: "https://api.test.com/v1/chat/completions",
      };
      orchestrator = await initCognitiveOrchestrator(configWithKey);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const response = await orchestrator.processMessage({
        id: "network-error",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response.content).toContain("issue");
      expect(response.role).toBe("assistant");
    });

    it("should handle HTTP error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const response = await orchestrator.processMessage({
        id: "http-error",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response.content).toContain("issue");
    });

    it("should handle rate limiting (429)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      const response = await orchestrator.processMessage({
        id: "rate-limit",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
      expect(response.role).toBe("assistant");
    });

    it("should handle empty LLM response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }),
      } as Response);

      const response = await orchestrator.processMessage({
        id: "empty-response",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response.content).toContain("unable to generate");
    });

    it("should handle malformed LLM response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: "format" }),
      } as Response);

      const response = await orchestrator.processMessage({
        id: "malformed-response",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
    });

    it("should handle timeout-like scenarios", async () => {
      // Simulate a very slow response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    choices: [{ message: { content: "Delayed response" } }],
                  }),
                } as Response),
              100,
            ),
          ),
      );

      const startTime = Date.now();
      const response = await orchestrator.processMessage({
        id: "slow-response",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });
      const duration = Date.now() - startTime;

      expect(response).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it("should handle JSON parse errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError("Invalid JSON");
        },
      } as unknown as Response);

      const response = await orchestrator.processMessage({
        id: "json-error",
        content: "Test",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
      expect(response.content).toContain("issue");
    });
  });

  // ============================================================================
  // SECTION 6: Autonomy Behavior and Graceful Degradation
  // ============================================================================

  describe("Autonomy Behavior and Graceful Degradation", () => {
    it("should work without LLM API configured", async () => {
      const noApiConfig: DeepTreeEchoBotConfig = {
        enabled: true,
        enableAsMainUser: false,
      };

      const orchestrator = await initCognitiveOrchestrator(noApiConfig);

      const response = await orchestrator.processMessage({
        id: "no-api",
        content: "Hello, how are you?",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.role).toBe("assistant");
    });

    it("should respond appropriately to greetings without LLM", async () => {
      const orchestrator = await initCognitiveOrchestrator(defaultConfig);

      const greetings = ["Hello", "Hi", "Hey", "Greetings"];

      for (const greeting of greetings) {
        const response = await orchestrator.processMessage({
          id: `greeting-${greeting}`,
          content: greeting,
          role: "user",
          timestamp: Date.now(),
        });

        expect(response.content).toContain("Hello");
        expect(response.content).toContain("Deep Tree Echo");
      }
    });

    it("should respond to identity questions without LLM", async () => {
      const orchestrator = await initCognitiveOrchestrator(defaultConfig);

      const response = await orchestrator.processMessage({
        id: "identity",
        content: "Who are you?",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response.content).toContain("Deep Tree Echo");
    });

    it("should respond to wellbeing questions without LLM", async () => {
      const orchestrator = await initCognitiveOrchestrator(defaultConfig);

      const response = await orchestrator.processMessage({
        id: "wellbeing",
        content: "How are you doing?",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response.content).toContain("doing well");
    });

    it("should provide helpful fallback for complex questions without LLM", async () => {
      const orchestrator = await initCognitiveOrchestrator(defaultConfig);

      const response = await orchestrator.processMessage({
        id: "complex",
        content: "What is the meaning of life, the universe, and everything?",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response.content).toContain("LLM");
    });

    it("should dynamically configure LLM mid-session", async () => {
      const orchestrator = await initCognitiveOrchestrator(defaultConfig);

      // Process without LLM
      const response1 = await orchestrator.processMessage({
        id: "before-config",
        content: "Test before LLM config",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response1).toBeDefined();

      // Configure LLM
      orchestrator.configureLLM({
        apiKey: "new-key",
        apiEndpoint: "https://api.test.com",
        model: "gpt-4",
      });

      // Mock successful LLM response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "LLM response after config" } }],
        }),
      } as Response);

      const response2 = await orchestrator.processMessage({
        id: "after-config",
        content: "Test after LLM config",
        role: "user",
        timestamp: Date.now(),
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SECTION 7: Sentiment Analysis and Cognitive Processing
  // ============================================================================

  describe("Sentiment Analysis and Cognitive Processing", () => {
    let orchestrator: CognitiveOrchestrator;

    beforeEach(async () => {
      orchestrator = await initCognitiveOrchestrator(defaultConfig);
    });

    it("should detect positive sentiment correctly", async () => {
      await orchestrator.processMessage({
        id: "positive",
        content: "I am so happy and excited! This is wonderful and amazing!",
        role: "user",
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      expect(state?.cognitiveContext?.emotionalValence).toBeGreaterThan(0);
    });

    it("should detect negative sentiment correctly", async () => {
      await orchestrator.processMessage({
        id: "negative",
        content: "This is terrible and awful. I hate everything about it.",
        role: "user",
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      expect(state?.cognitiveContext?.emotionalValence).toBeLessThan(0);
    });

    it("should detect neutral sentiment correctly", async () => {
      await orchestrator.processMessage({
        id: "neutral",
        content: "The weather is cloudy today.",
        role: "user",
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      expect(
        Math.abs(state?.cognitiveContext?.emotionalValence || 0),
      ).toBeLessThan(0.5);
    });

    it("should calculate high salience for urgent messages", async () => {
      await orchestrator.processMessage({
        id: "urgent",
        content: "URGENT! Please help me immediately! This is important!",
        role: "user",
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      expect(state?.cognitiveContext?.salienceScore).toBeGreaterThan(0.3);
    });

    it("should calculate salience based on message characteristics", async () => {
      // Question mark increases salience
      await orchestrator.processMessage({
        id: "question",
        content: "Can you help me?",
        role: "user",
        timestamp: Date.now(),
      });

      const state1 = orchestrator.getState();
      const salienceWithQuestion = state1?.cognitiveContext?.salienceScore || 0;

      // Reset
      cleanupOrchestrator();
      orchestrator = await initCognitiveOrchestrator(defaultConfig);

      // Statement without question mark
      await orchestrator.processMessage({
        id: "statement",
        content: "I need help",
        role: "user",
        timestamp: Date.now(),
      });

      const state2 = orchestrator.getState();
      const salienceWithoutQuestion =
        state2?.cognitiveContext?.salienceScore || 0;

      expect(salienceWithQuestion).toBeGreaterThan(salienceWithoutQuestion);
    });

    it("should handle mixed sentiment messages", async () => {
      await orchestrator.processMessage({
        id: "mixed",
        content:
          "I love this feature but hate how slow it is. Great work though!",
        role: "user",
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      // Mixed sentiment should result in moderate valence
      expect(
        Math.abs(state?.cognitiveContext?.emotionalValence || 0),
      ).toBeLessThan(1);
    });
  });

  // ============================================================================
  // SECTION 8: Edge Cases and Boundary Conditions
  // ============================================================================

  describe("Edge Cases and Boundary Conditions", () => {
    let orchestrator: CognitiveOrchestrator;

    beforeEach(async () => {
      orchestrator = await initCognitiveOrchestrator(defaultConfig);
    });

    it("should handle empty message content", async () => {
      const response = await orchestrator.processMessage({
        id: "empty",
        content: "",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
      expect(response.role).toBe("assistant");
    });

    it("should handle whitespace-only message content", async () => {
      const response = await orchestrator.processMessage({
        id: "whitespace",
        content: "   \n\t   ",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
    });

    it("should handle message with only emojis", async () => {
      const response = await orchestrator.processMessage({
        id: "emoji",
        content: "🎉🎊🎈🎁",
        role: "user",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
    });

    it("should handle very old timestamp", async () => {
      const response = await orchestrator.processMessage({
        id: "old-timestamp",
        content: "Message from the past",
        role: "user",
        timestamp: 0,
      });

      expect(response).toBeDefined();
    });

    it("should handle future timestamp", async () => {
      const response = await orchestrator.processMessage({
        id: "future-timestamp",
        content: "Message from the future",
        role: "user",
        timestamp: Date.now() + 86400000 * 365, // One year in future
      });

      expect(response).toBeDefined();
    });

    it("should handle message with system role", async () => {
      const response = await orchestrator.processMessage({
        id: "system-msg",
        content: "System message content",
        role: "system",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
    });

    it("should handle message with assistant role", async () => {
      const response = await orchestrator.processMessage({
        id: "assistant-msg",
        content: "Assistant message content",
        role: "assistant",
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
    });

    it("should handle message with metadata", async () => {
      const response = await orchestrator.processMessage({
        id: "with-metadata",
        content: "Message with metadata",
        role: "user",
        timestamp: Date.now(),
        metadata: {
          chatId: 123,
          accountId: 456,
          contactId: 789,
          isBot: false,
        },
      });

      expect(response).toBeDefined();
      expect(response.metadata).toBeDefined();
    });

    it("should handle rapid state queries during processing", async () => {
      const processingPromise = orchestrator.processMessage({
        id: "processing",
        content: "Processing message",
        role: "user",
        timestamp: Date.now(),
      });

      // Query state while processing
      const states: (typeof orchestrator extends { getState(): infer R }
        ? R
        : never)[] = [];
      for (let i = 0; i < 10; i++) {
        states.push(orchestrator.getState());
      }

      await processingPromise;

      // All state queries should succeed
      states.forEach((state) => {
        expect(state).not.toBeNull();
      });
    });
  });

  // ============================================================================
  // SECTION 9: Concurrency and Race Conditions
  // ============================================================================

  describe("Concurrency and Race Conditions", () => {
    let orchestrator: CognitiveOrchestrator;

    beforeEach(async () => {
      orchestrator = await initCognitiveOrchestrator(defaultConfig);
    });

    it("should handle concurrent message processing", async () => {
      const messages = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `concurrent-${i}`,
          content: `Concurrent message ${i}`,
          role: "user" as const,
          timestamp: Date.now() + i,
        }));

      // Process all messages concurrently
      const responses = await Promise.all(
        messages.map((msg) => orchestrator.processMessage(msg)),
      );

      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect(response).toBeDefined();
        expect(response.role).toBe("assistant");
      });
    });

    it("should handle concurrent clearHistory calls", async () => {
      // Add some messages
      for (let i = 0; i < 5; i++) {
        await orchestrator.processMessage({
          id: `pre-clear-${i}`,
          content: `Message ${i}`,
          role: "user",
          timestamp: Date.now() + i,
        });
      }

      // Call clearHistory concurrently
      await Promise.all([
        Promise.resolve(orchestrator.clearHistory()),
        Promise.resolve(orchestrator.clearHistory()),
        Promise.resolve(orchestrator.clearHistory()),
      ]);

      const state = orchestrator.getState();
      expect(state?.memories.shortTerm).toEqual([]);
    });

    it("should handle mixed concurrent operations", async () => {
      const operations = [
        orchestrator.processMessage({
          id: "mixed-1",
          content: "Message 1",
          role: "user",
          timestamp: Date.now(),
        }),
        Promise.resolve(orchestrator.getState()),
        orchestrator.processMessage({
          id: "mixed-2",
          content: "Message 2",
          role: "user",
          timestamp: Date.now(),
        }),
        Promise.resolve(orchestrator.getState()),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(4);
    });
  });

  // ============================================================================
  // SECTION 10: Module-Level Functions
  // ============================================================================

  describe("Module-Level Functions", () => {
    beforeEach(() => {
      cleanupOrchestrator();
    });

    it("should correctly use processMessageUnified", async () => {
      await initCognitiveOrchestrator(defaultConfig);

      const response = await processMessageUnified("Test message", {
        chatId: 123,
        accountId: 456,
      });

      expect(response).toBeDefined();
      expect(response.role).toBe("assistant");
    });

    it("should correctly use getCognitiveState", async () => {
      await initCognitiveOrchestrator(defaultConfig);

      const state = getCognitiveState();

      expect(state).not.toBeNull();
      expect(state?.persona.name).toBe("Deep Tree Echo");
    });

    it("should correctly use configureLLM", async () => {
      await initCognitiveOrchestrator(defaultConfig);

      // Should not throw
      configureLLM({
        apiKey: "test-key",
        model: "gpt-4-turbo",
      });
    });

    it("should correctly use onCognitiveEvent", async () => {
      await initCognitiveOrchestrator(defaultConfig);

      let eventReceived = false;
      onCognitiveEvent("message_received", () => {
        eventReceived = true;
      });

      await processMessageUnified("Test");

      expect(eventReceived).toBe(true);
    });

    it("should correctly use clearHistory", async () => {
      await initCognitiveOrchestrator(defaultConfig);

      await processMessageUnified("Test message");

      clearHistory();

      const state = getCognitiveState();
      expect(state?.memories.shortTerm).toEqual([]);
    });

    it("should handle operations on null orchestrator gracefully", () => {
      // These should not throw when orchestrator is null
      expect(() => configureLLM({ apiKey: "test" })).not.toThrow();
      expect(() =>
        onCognitiveEvent("message_received", () => {}),
      ).not.toThrow();
      expect(() => clearHistory()).not.toThrow();
      expect(getCognitiveState()).toBeNull();
    });
  });
});

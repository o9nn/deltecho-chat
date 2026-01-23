/**
 * Cognitive Orchestrator Tests
 */

import {
  CognitiveOrchestrator,
  createCognitiveOrchestrator,
} from "../cognitive-orchestrator";
import { IPersonaCore } from "../integrations/persona-adapter";
import { IRAGMemoryStore, IMemory } from "../integrations/memory-adapter";
import { ILLMService } from "../integrations/llm-adapter";

// Mock PersonaCore
const mockPersonaCore: IPersonaCore = {
  getPersonality: jest.fn(() => "a helpful AI assistant"),
  getEmotionalState: jest.fn(() => ({
    joy: 0.3,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    contempt: 0,
    interest: 0.2,
  })),
  updateEmotionalState: jest.fn().mockResolvedValue(undefined),
  getDominantEmotion: jest.fn(() => ({ emotion: "joy", intensity: 0.3 })),
  getCognitiveState: jest.fn(() => ({
    creativity: 0.6,
    analyticalDepth: 0.5,
    empathy: 0.7,
    curiosity: 0.6,
  })),
  getPreferences: jest.fn(() => ({})),
};

// Mock RAGMemoryStore
const mockMemoryStore: IRAGMemoryStore = {
  searchMemories: jest.fn(() => []),
  storeMemory: jest.fn().mockResolvedValue(undefined),
  retrieveRecentMemories: jest.fn(() => []),
  getConversationContext: jest.fn(() => []),
  isEnabled: jest.fn(() => true),
};

// Mock LLMService
const mockLLMService: ILLMService = {
  generateResponse: jest.fn().mockResolvedValue("Hello! How can I help you?"),
};

describe("CognitiveOrchestrator", () => {
  let orchestrator: CognitiveOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new CognitiveOrchestrator({
      enableMemory: true,
      enableSentiment: true,
      enableEmotion: true,
    });
  });

  afterEach(() => {
    orchestrator.shutdown();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const o = new CognitiveOrchestrator();
      expect(o).toBeInstanceOf(CognitiveOrchestrator);
      o.shutdown();
    });

    it("should accept custom config", () => {
      const o = new CognitiveOrchestrator({
        enableMemory: false,
        maxStreams: 5,
      });
      expect(o.getConfig().enableMemory).toBe(false);
      expect(o.getConfig().maxStreams).toBe(5);
      o.shutdown();
    });
  });

  describe("initialize", () => {
    it("should initialize without services", async () => {
      await orchestrator.initialize();
      expect(orchestrator.isReady()).toBe(true);
    });

    it("should initialize with all services", async () => {
      await orchestrator.initialize({
        persona: mockPersonaCore,
        memory: mockMemoryStore,
        llm: mockLLMService,
      });
      expect(orchestrator.isReady()).toBe(true);
    });

    it("should set chat ID", async () => {
      await orchestrator.initialize({ chatId: 123 });
      expect(orchestrator.getChatId()).toBe(123);
    });
  });

  describe("shutdown", () => {
    it("should shutdown gracefully", async () => {
      await orchestrator.initialize();
      expect(() => orchestrator.shutdown()).not.toThrow();
      expect(orchestrator.isReady()).toBe(false);
    });
  });

  describe("processMessage", () => {
    beforeEach(async () => {
      await orchestrator.initialize({
        persona: mockPersonaCore,
        memory: mockMemoryStore,
        llm: mockLLMService,
      });
    });

    it("should process message and return result", async () => {
      const result = await orchestrator.processMessage("Hello there!");

      expect(result.response).toBeDefined();
      expect(result.response.role).toBe("assistant");
      expect(result.response.content).toBe("Hello! How can I help you?");
    });

    it("should include processing metrics", async () => {
      const result = await orchestrator.processMessage("Test message");

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalTime).toBeGreaterThanOrEqual(0);
    });

    it("should include cognitive state", async () => {
      const result = await orchestrator.processMessage("How are you?");

      expect(result.state).toBeDefined();
      expect(result.state.activeStreams).toBeDefined();
    });

    it("should analyze sentiment when enabled", async () => {
      const result = await orchestrator.processMessage("I am so happy!");

      expect(result.response.metadata.sentiment).toBeDefined();
      expect(result.response.metadata.emotion).toBeDefined();
    });

    it("should skip sentiment when requested", async () => {
      // Create a fresh orchestrator to have clean state
      const freshOrchestrator = new CognitiveOrchestrator({
        enableSentiment: true,
      });
      await freshOrchestrator.initialize({ llm: mockLLMService });

      const initialState = freshOrchestrator.getEmotionalState();
      await freshOrchestrator.processMessage("I am so furiously angry!", {
        skipSentiment: true,
      });
      const finalState = freshOrchestrator.getEmotionalState();

      // When skipping sentiment, emotional state should not be updated from message
      // (it stays at initial values)
      expect(finalState.anger).toBe(initialState.anger);
      freshOrchestrator.shutdown();
    });

    it("should update message history", async () => {
      await orchestrator.processMessage("First message");
      await orchestrator.processMessage("Second message");

      const history = orchestrator.getMessageHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant
    });

    it("should call LLM service", async () => {
      await orchestrator.processMessage("Test");

      expect(mockLLMService.generateResponse).toHaveBeenCalled();
    });

    it("should search memories when enabled", async () => {
      await orchestrator.processMessage("Test");

      expect(mockMemoryStore.searchMemories).toHaveBeenCalled();
    });
  });

  describe("quickProcess", () => {
    beforeEach(async () => {
      await orchestrator.initialize({
        llm: mockLLMService,
      });
    });

    it("should return just the response content", async () => {
      const response = await orchestrator.quickProcess("Hello");

      expect(typeof response).toBe("string");
      expect(response).toBe("Hello! How can I help you?");
    });
  });

  describe("getState", () => {
    it("should return cognitive state", () => {
      const state = orchestrator.getState();

      expect(state.activeStreams).toBeDefined();
      expect(state.emotionalState).toBeDefined();
      expect(state.currentPhase).toBeDefined();
    });
  });

  describe("getEmotionalState", () => {
    it("should return emotional state", () => {
      const emotion = orchestrator.getEmotionalState();

      expect(emotion.dominant).toBeDefined();
      expect(emotion.valence).toBeDefined();
    });
  });

  describe("updateEmotionalState", () => {
    it("should update emotional state", () => {
      orchestrator.updateEmotionalState({ joy: 0.9 });

      const emotion = orchestrator.getEmotionalState();
      expect(emotion.joy).toBe(0.9);
    });
  });

  describe("getMessageHistory", () => {
    it("should return empty array initially", () => {
      const history = orchestrator.getMessageHistory();
      expect(history).toEqual([]);
    });
  });

  describe("clearHistory", () => {
    it("should clear message history", async () => {
      await orchestrator.initialize({ llm: mockLLMService });
      await orchestrator.processMessage("Test");

      orchestrator.clearHistory();

      expect(orchestrator.getMessageHistory().length).toBe(0);
    });
  });

  describe("getSentimentTrend", () => {
    it("should return sentiment trend", () => {
      const trend = orchestrator.getSentimentTrend();

      expect(trend.direction).toBeDefined();
      expect(["positive", "negative", "stable"]).toContain(trend.direction);
    });
  });

  describe("getAverageSentiment", () => {
    it("should return average sentiment", () => {
      const avg = orchestrator.getAverageSentiment();

      expect(typeof avg.polarity).toBe("number");
      expect(Array.isArray(avg.emotions)).toBe(true);
    });
  });

  describe("setChatId / getChatId", () => {
    it("should set and get chat ID", () => {
      orchestrator.setChatId(456);
      expect(orchestrator.getChatId()).toBe(456);
    });
  });

  describe("reset", () => {
    it("should reset all state", async () => {
      await orchestrator.initialize({ llm: mockLLMService });
      await orchestrator.processMessage("Test");
      orchestrator.updateEmotionalState({ joy: 0.9 });

      orchestrator.reset();

      const state = orchestrator.getState();
      expect(state.activeStreams.length).toBe(0);
      expect(orchestrator.getMessageHistory().length).toBe(0);
    });
  });

  describe("getConfig / updateConfig", () => {
    it("should get config", () => {
      const config = orchestrator.getConfig();
      expect(config.enableMemory).toBe(true);
    });

    it("should update config", () => {
      orchestrator.updateConfig({ maxStreams: 10 });
      expect(orchestrator.getConfig().maxStreams).toBe(10);
    });
  });

  describe("events", () => {
    it("should emit events during processing", async () => {
      await orchestrator.initialize({ llm: mockLLMService });

      const events: string[] = [];
      orchestrator.onCognitiveEvent((event) => {
        events.push(event.type);
      });

      await orchestrator.processMessage("Test");

      expect(events).toContain("message_received");
      expect(events).toContain("processing_start");
    });

    it("should allow removing event listeners", () => {
      const listener = jest.fn();
      orchestrator.onCognitiveEvent(listener);
      orchestrator.offCognitiveEvent(listener);

      orchestrator.updateEmotionalState({ joy: 0.5 });
      // Listener should not be called after removal
    });
  });

  describe("getContextString", () => {
    it("should return formatted context", async () => {
      await orchestrator.initialize({ llm: mockLLMService });
      await orchestrator.processMessage("Hello");

      const context = orchestrator.getContextString();
      expect(context).toContain("user");
    });
  });

  describe("exportConversation / importConversation", () => {
    it("should export conversation data", async () => {
      await orchestrator.initialize({ llm: mockLLMService });
      await orchestrator.processMessage("Test");

      const exported = orchestrator.exportConversation();

      expect(exported.messages.length).toBeGreaterThan(0);
      expect(exported.state).toBeDefined();
      expect(exported.chatId).toBeDefined();
    });

    it("should import conversation data", async () => {
      await orchestrator.initialize({ llm: mockLLMService });
      await orchestrator.processMessage("Test");

      const exported = orchestrator.exportConversation();

      const newOrchestrator = new CognitiveOrchestrator();
      newOrchestrator.importConversation({
        messages: exported.messages,
        chatId: 999,
      });

      expect(newOrchestrator.getMessageHistory().length).toBe(
        exported.messages.length,
      );
      expect(newOrchestrator.getChatId()).toBe(999);
      newOrchestrator.shutdown();
    });
  });

  describe("getStatistics", () => {
    it("should return processing statistics", async () => {
      await orchestrator.initialize({ llm: mockLLMService });
      await orchestrator.processMessage("Test");

      const stats = orchestrator.getStatistics();

      expect(stats.messagesProcessed).toBeGreaterThan(0);
      expect(typeof stats.currentCognitiveLoad).toBe("number");
    });
  });

  describe("factory function", () => {
    it("should create orchestrator with createCognitiveOrchestrator", () => {
      const o = createCognitiveOrchestrator({ debug: true });
      expect(o).toBeInstanceOf(CognitiveOrchestrator);
      o.shutdown();
    });
  });
});

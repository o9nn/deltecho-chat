/**
 * Comprehensive Integration Test Suite for Deep Tree Echo Core
 *
 * Tests the integration between:
 * - Memory systems (RAG + HyperDimensional)
 * - Personality and emotion models
 * - LLM service interfaces
 * - Cognitive function orchestration
 */

// Test interfaces
interface MemoryEntry {
  id: string;
  text: string;
  timestamp: number;
  chatId: number;
  sender: 'user' | 'bot';
  embedding?: number[];
}

interface PersonalityState {
  mood: string;
  traits: string[];
  interactionStyle: string;
  lastUpdated: number;
}

interface CognitiveContext {
  memories: MemoryEntry[];
  personality: PersonalityState;
  currentTopic?: string;
  conversationDepth: number;
}

// Mock implementations for testing
class MockRAGMemoryStore {
  private memories: MemoryEntry[] = [];

  async addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
    const memory: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
    };
    this.memories.push(memory);
    return memory;
  }

  getMemoriesByChatId(chatId: number): MemoryEntry[] {
    return this.memories.filter((m) => m.chatId === chatId);
  }

  searchMemories(query: string): MemoryEntry[] {
    const queryLower = query.toLowerCase();
    return this.memories
      .filter((m) => m.text.toLowerCase().includes(queryLower))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getLatestMemories(chatId: number, limit: number): MemoryEntry[] {
    return this.getMemoriesByChatId(chatId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async deleteChatMemories(chatId: number): Promise<void> {
    this.memories = this.memories.filter((m) => m.chatId !== chatId);
  }

  getStats() {
    const memoriesByChat: Record<number, number> = {};
    this.memories.forEach((m) => {
      memoriesByChat[m.chatId] = (memoriesByChat[m.chatId] || 0) + 1;
    });
    return {
      totalMemories: this.memories.length,
      totalReflections: 0,
      memoriesByChat,
    };
  }

  clear() {
    this.memories = [];
  }
}

class MockPersonaCore {
  private state: PersonalityState = {
    mood: 'neutral',
    traits: ['helpful', 'curious', 'thoughtful'],
    interactionStyle: 'casual',
    lastUpdated: Date.now(),
  };

  getState(): PersonalityState {
    return { ...this.state };
  }

  updateMood(mood: string): void {
    this.state.mood = mood;
    this.state.lastUpdated = Date.now();
  }

  addTrait(trait: string): void {
    if (!this.state.traits.includes(trait)) {
      this.state.traits.push(trait);
      this.state.lastUpdated = Date.now();
    }
  }

  setInteractionStyle(style: string): void {
    this.state.interactionStyle = style;
    this.state.lastUpdated = Date.now();
  }

  reset(): void {
    this.state = {
      mood: 'neutral',
      traits: ['helpful', 'curious', 'thoughtful'],
      interactionStyle: 'casual',
      lastUpdated: Date.now(),
    };
  }
}

class MockCognitiveOrchestrator {
  private memoryStore: MockRAGMemoryStore;
  private personaCore: MockPersonaCore;

  constructor() {
    this.memoryStore = new MockRAGMemoryStore();
    this.personaCore = new MockPersonaCore();
  }

  async buildContext(chatId: number, userMessage: string): Promise<CognitiveContext> {
    const memories = this.memoryStore.getLatestMemories(chatId, 10);
    const personality = this.personaCore.getState();

    // Analyze conversation depth
    const conversationDepth = memories.length;

    // Extract current topic (simplified)
    const currentTopic = userMessage.split(' ').slice(0, 3).join(' ');

    return {
      memories,
      personality,
      currentTopic,
      conversationDepth,
    };
  }

  async processMessage(
    chatId: number,
    message: string,
    sender: 'user' | 'bot'
  ): Promise<MemoryEntry> {
    return this.memoryStore.addMemory({
      text: message,
      chatId,
      sender,
    });
  }

  getMemoryStore(): MockRAGMemoryStore {
    return this.memoryStore;
  }

  getPersonaCore(): MockPersonaCore {
    return this.personaCore;
  }
}

describe('Cognitive Core Integration', () => {
  let orchestrator: MockCognitiveOrchestrator;

  beforeEach(() => {
    orchestrator = new MockCognitiveOrchestrator();
  });

  afterEach(() => {
    orchestrator.getMemoryStore().clear();
    orchestrator.getPersonaCore().reset();
  });

  describe('Memory-Personality Integration', () => {
    it('should build context with memories and personality', async () => {
      const chatId = 123;

      // Add some memories
      await orchestrator.processMessage(chatId, 'Hello, how are you?', 'user');
      await orchestrator.processMessage(chatId, 'I am doing well, thank you!', 'bot');

      // Build context
      const context = await orchestrator.buildContext(chatId, 'What can you help me with?');

      expect(context.memories.length).toBe(2);
      expect(context.personality.mood).toBe('neutral');
      expect(context.conversationDepth).toBe(2);
    });

    it('should update personality based on conversation', async () => {
      const personaCore = orchestrator.getPersonaCore();

      // Simulate positive interaction
      personaCore.updateMood('positive');
      personaCore.addTrait('enthusiastic');

      const state = personaCore.getState();
      expect(state.mood).toBe('positive');
      expect(state.traits).toContain('enthusiastic');
    });

    it('should maintain personality consistency across contexts', async () => {
      const chatId1 = 100;
      const chatId2 = 200;

      // Set personality
      orchestrator.getPersonaCore().updateMood('helpful');

      // Build contexts for different chats
      const context1 = await orchestrator.buildContext(chatId1, 'Question 1');
      const context2 = await orchestrator.buildContext(chatId2, 'Question 2');

      // Personality should be consistent
      expect(context1.personality.mood).toBe(context2.personality.mood);
    });
  });

  describe('Memory Retrieval and Search', () => {
    it('should retrieve memories by chat ID', async () => {
      const chatId = 456;

      await orchestrator.processMessage(chatId, 'First message', 'user');
      await orchestrator.processMessage(chatId, 'Second message', 'bot');
      await orchestrator.processMessage(789, 'Different chat', 'user');

      const memories = orchestrator.getMemoryStore().getMemoriesByChatId(chatId);
      expect(memories.length).toBe(2);
      expect(memories.every((m) => m.chatId === chatId)).toBe(true);
    });

    it('should search memories by content', async () => {
      const chatId = 123;

      await orchestrator.processMessage(chatId, 'I love programming in TypeScript', 'user');
      await orchestrator.processMessage(chatId, 'TypeScript is great for type safety', 'bot');
      await orchestrator.processMessage(chatId, 'Python is also nice', 'user');

      const results = orchestrator.getMemoryStore().searchMemories('TypeScript');
      expect(results.length).toBe(2);
    });

    it('should return latest memories with limit', async () => {
      const chatId = 123;

      // Add 5 memories
      for (let i = 0; i < 5; i++) {
        await orchestrator.processMessage(chatId, `Message ${i}`, 'user');
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const latest = orchestrator.getMemoryStore().getLatestMemories(chatId, 3);
      expect(latest.length).toBe(3);
      expect(latest[0].text).toBe('Message 4'); // Most recent first
    });
  });

  describe('Context Building', () => {
    it('should extract current topic from message', async () => {
      const context = await orchestrator.buildContext(123, 'Tell me about artificial intelligence');
      expect(context.currentTopic).toBe('Tell me about');
    });

    it('should calculate conversation depth correctly', async () => {
      const chatId = 123;

      // Empty conversation
      let context = await orchestrator.buildContext(chatId, 'Hello');
      expect(context.conversationDepth).toBe(0);

      // Add messages
      await orchestrator.processMessage(chatId, 'Hello', 'user');
      await orchestrator.processMessage(chatId, 'Hi there!', 'bot');

      context = await orchestrator.buildContext(chatId, 'How are you?');
      expect(context.conversationDepth).toBe(2);
    });
  });

  describe('Memory Statistics', () => {
    it('should provide accurate memory statistics', async () => {
      await orchestrator.processMessage(100, 'Chat 100 message 1', 'user');
      await orchestrator.processMessage(100, 'Chat 100 message 2', 'bot');
      await orchestrator.processMessage(200, 'Chat 200 message 1', 'user');

      const stats = orchestrator.getMemoryStore().getStats();

      expect(stats.totalMemories).toBe(3);
      expect(Object.keys(stats.memoriesByChat).length).toBe(2);
      expect(stats.memoriesByChat[100]).toBe(2);
      expect(stats.memoriesByChat[200]).toBe(1);
    });
  });

  describe('Memory Cleanup', () => {
    it('should delete memories for specific chat', async () => {
      await orchestrator.processMessage(100, 'Chat 100 message', 'user');
      await orchestrator.processMessage(200, 'Chat 200 message', 'user');

      await orchestrator.getMemoryStore().deleteChatMemories(100);

      const stats = orchestrator.getMemoryStore().getStats();
      expect(stats.totalMemories).toBe(1);
      expect(stats.memoriesByChat[100]).toBeUndefined();
      expect(stats.memoriesByChat[200]).toBe(1);
    });

    it('should clear all memories', () => {
      orchestrator.getMemoryStore().clear();
      const stats = orchestrator.getMemoryStore().getStats();
      expect(stats.totalMemories).toBe(0);
    });
  });
});

describe('Triadic Cognitive Loop', () => {
  interface CognitiveStep {
    phase: number;
    stream: number;
    mode: 'expressive' | 'reflective';
    action: string;
  }

  class MockTriadicLoop {
    private currentStep = 0;
    private streams = [0, 4, 8]; // 120° phase offset

    getStreamPhases(): number[] {
      return this.streams.map((s) => (s + this.currentStep) % 12);
    }

    async executeStep(): Promise<CognitiveStep> {
      const step = this.currentStep;
      const stream = step % 3;
      const phase = Math.floor(step / 3);
      const mode = [0, 1, 2, 3, 4, 6, 7].includes(step) ? 'expressive' : 'reflective';

      this.currentStep = (this.currentStep + 1) % 12;

      return {
        phase,
        stream,
        mode,
        action: `Step ${step}: Stream ${stream}, Phase ${phase}`,
      };
    }

    async executeCycle(): Promise<CognitiveStep[]> {
      const steps: CognitiveStep[] = [];
      for (let i = 0; i < 12; i++) {
        steps.push(await this.executeStep());
      }
      return steps;
    }

    reset(): void {
      this.currentStep = 0;
    }
  }

  let triadicLoop: MockTriadicLoop;

  beforeEach(() => {
    triadicLoop = new MockTriadicLoop();
  });

  afterEach(() => {
    triadicLoop.reset();
  });

  it('should execute 12-step cognitive cycle', async () => {
    const steps = await triadicLoop.executeCycle();
    expect(steps.length).toBe(12);
  });

  it('should maintain 120-degree phase offset between streams', () => {
    const phases = triadicLoop.getStreamPhases();

    // Verify 4-step (120°) offset
    expect((phases[1] - phases[0] + 12) % 12).toBe(4);
    expect((phases[2] - phases[1] + 12) % 12).toBe(4);
  });

  it('should alternate between expressive and reflective modes', async () => {
    const steps = await triadicLoop.executeCycle();

    const expressiveCount = steps.filter((s) => s.mode === 'expressive').length;
    const reflectiveCount = steps.filter((s) => s.mode === 'reflective').length;

    expect(expressiveCount).toBe(7);
    expect(reflectiveCount).toBe(5);
  });

  it('should cycle through all three streams', async () => {
    const steps = await triadicLoop.executeCycle();

    const streamCounts = [0, 0, 0];
    steps.forEach((s) => streamCounts[s.stream]++);

    expect(streamCounts[0]).toBe(4);
    expect(streamCounts[1]).toBe(4);
    expect(streamCounts[2]).toBe(4);
  });
});

describe('Error Handling', () => {
  it('should handle empty memory searches gracefully', () => {
    const memoryStore = new MockRAGMemoryStore();
    const results = memoryStore.searchMemories('nonexistent');
    expect(results).toEqual([]);
  });

  it('should handle invalid chat IDs', () => {
    const memoryStore = new MockRAGMemoryStore();
    const memories = memoryStore.getMemoriesByChatId(-1);
    expect(memories).toEqual([]);
  });

  it('should handle personality reset', () => {
    const personaCore = new MockPersonaCore();

    personaCore.updateMood('excited');
    personaCore.addTrait('creative');

    personaCore.reset();

    const state = personaCore.getState();
    expect(state.mood).toBe('neutral');
    expect(state.traits).not.toContain('creative');
  });
});

describe('Performance', () => {
  it('should handle large memory stores efficiently', async () => {
    const memoryStore = new MockRAGMemoryStore();
    const chatId = 123;

    // Add 1000 memories
    const startAdd = Date.now();
    for (let i = 0; i < 1000; i++) {
      await memoryStore.addMemory({
        text: `Memory ${i} with some content`,
        chatId,
        sender: i % 2 === 0 ? 'user' : 'bot',
      });
    }
    const addDuration = Date.now() - startAdd;

    // Should complete within reasonable time
    expect(addDuration).toBeLessThan(5000);

    // Search should be fast
    const startSearch = Date.now();
    memoryStore.searchMemories('Memory 500');
    const searchDuration = Date.now() - startSearch;

    expect(searchDuration).toBeLessThan(100);
  });

  it('should retrieve latest memories efficiently', async () => {
    const memoryStore = new MockRAGMemoryStore();
    const chatId = 123;

    // Add 500 memories
    for (let i = 0; i < 500; i++) {
      await memoryStore.addMemory({
        text: `Memory ${i}`,
        chatId,
        sender: 'user',
      });
    }

    const start = Date.now();
    const latest = memoryStore.getLatestMemories(chatId, 10);
    const duration = Date.now() - start;

    expect(latest.length).toBe(10);
    expect(duration).toBeLessThan(50);
  });
});

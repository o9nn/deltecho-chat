import { RAGMemoryStore, Memory } from '../RAGMemoryStore'

// Mock logger
jest.mock('../../../../shared/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

describe('RAGMemoryStore', () => {
  let memoryStore: RAGMemoryStore

  beforeEach(() => {
    memoryStore = new RAGMemoryStore({
      persistToDisk: false, // Disable disk persistence for tests
    })
  })

  describe('addMemory', () => {
    it('should add a memory and return it with ID and timestamp', async () => {
      const memory = {
        text: 'Test memory',
        sender: 'user' as const,
        chatId: 123,
        messageId: 456,
      }

      const result = await memoryStore.addMemory(memory)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('timestamp')
      expect(result.text).toBe(memory.text)
      expect(result.sender).toBe(memory.sender)
      expect(result.chatId).toBe(memory.chatId)
      expect(result.messageId).toBe(memory.messageId)
    })
  })

  describe('getMemoriesByChatId', () => {
    it('should return memories for a specific chat ID', async () => {
      await memoryStore.addMemory({
        text: 'Memory in chat 123',
        sender: 'user' as const,
        chatId: 123,
        messageId: null,
      })

      await memoryStore.addMemory({
        text: 'Memory in chat 456',
        sender: 'bot' as const,
        chatId: 456,
        messageId: null,
      })

      const memories123 = memoryStore.getMemoriesByChatId(123)
      const memories456 = memoryStore.getMemoriesByChatId(456)

      expect(memories123.length).toBe(1)
      expect(memories456.length).toBe(1)
      expect(memories123[0].text).toBe('Memory in chat 123')
      expect(memories456[0].text).toBe('Memory in chat 456')
    })

    it('should return an empty array for a chat with no memories', () => {
      const memories = memoryStore.getMemoriesByChatId(999)
      expect(memories).toEqual([])
    })
  })

  describe('getLatestChatMemories', () => {
    it('should return the latest memories for a chat in chronological order', async () => {
      // Add 5 memories
      for (let i = 0; i < 5; i++) {
        await memoryStore.addMemory({
          text: `Memory ${i}`,
          sender: i % 2 === 0 ? ('user' as const) : ('bot' as const),
          chatId: 123,
          messageId: null,
        })

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      const latestMemories = memoryStore.getLatestChatMemories(123, 3)

      expect(latestMemories.length).toBe(3)
      expect(latestMemories[0].text).toBe('Memory 2')
      expect(latestMemories[1].text).toBe('Memory 3')
      expect(latestMemories[2].text).toBe('Memory 4')
    })

    it('should limit the number of memories returned', async () => {
      // Add 10 memories
      for (let i = 0; i < 10; i++) {
        await memoryStore.addMemory({
          text: `Memory ${i}`,
          sender: 'user' as const,
          chatId: 123,
          messageId: null,
        })
      }

      const latestMemories = memoryStore.getLatestChatMemories(123, 5)
      expect(latestMemories.length).toBe(5)
    })
  })

  describe('searchMemories', () => {
    it('should find memories matching the search query', async () => {
      await memoryStore.addMemory({
        text: 'I like apples and bananas',
        sender: 'user' as const,
        chatId: 123,
        messageId: null,
      })

      await memoryStore.addMemory({
        text: 'Bananas are yellow',
        sender: 'bot' as const,
        chatId: 123,
        messageId: null,
      })

      await memoryStore.addMemory({
        text: 'Apples are red or green',
        sender: 'user' as const,
        chatId: 123,
        messageId: null,
      })

      const bananaResults = memoryStore.searchMemories('banana')
      const appleResults = memoryStore.searchMemories('apple')
      const fruitResults = memoryStore.searchMemories('fruit')

      expect(bananaResults.length).toBe(2)
      expect(appleResults.length).toBe(2)
      expect(fruitResults.length).toBe(0) // No exact match

      // Banana results should be sorted by relevance
      expect(bananaResults[0].text).toBe('Bananas are yellow')
      expect(bananaResults[1].text).toBe('I like apples and bananas')
    })
  })

  describe('deleteChatMemories', () => {
    it('should delete all memories for a specific chat', async () => {
      // Add memories for two different chats
      await memoryStore.addMemory({
        text: 'Memory in chat 123',
        sender: 'user' as const,
        chatId: 123,
        messageId: null,
      })

      await memoryStore.addMemory({
        text: 'Another memory in chat 123',
        sender: 'bot' as const,
        chatId: 123,
        messageId: null,
      })

      await memoryStore.addMemory({
        text: 'Memory in chat 456',
        sender: 'user' as const,
        chatId: 456,
        messageId: null,
      })

      // Verify initial state
      expect(memoryStore.getMemoriesByChatId(123).length).toBe(2)
      expect(memoryStore.getMemoriesByChatId(456).length).toBe(1)

      // Delete memories for chat 123
      await memoryStore.deleteChatMemories(123)

      // Verify final state
      expect(memoryStore.getMemoriesByChatId(123).length).toBe(0)
      expect(memoryStore.getMemoriesByChatId(456).length).toBe(1)
    })
  })

  describe('getStats', () => {
    it('should return the correct statistics', async () => {
      // Add memories for two different chats
      await memoryStore.addMemory({
        text: 'Memory 1 in chat 123',
        sender: 'user' as const,
        chatId: 123,
        messageId: null,
      })

      await memoryStore.addMemory({
        text: 'Memory 2 in chat 123',
        sender: 'bot' as const,
        chatId: 123,
        messageId: null,
      })

      await memoryStore.addMemory({
        text: 'Memory 1 in chat 456',
        sender: 'user' as const,
        chatId: 456,
        messageId: null,
      })

      const stats = memoryStore.getStats()

      expect(stats.totalMemories).toBe(3)
      expect(stats.chatCount).toBe(2)
    })
  })
})

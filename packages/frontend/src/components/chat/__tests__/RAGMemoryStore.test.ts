import { RAGMemoryStore } from '../DeepTreeEchoBot'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('RAGMemoryStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  it('should be a singleton', () => {
    const instance1 = RAGMemoryStore.getInstance()
    const instance2 = RAGMemoryStore.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should add entries correctly', () => {
    const memory = RAGMemoryStore.getInstance()
    const entry = {
      chatId: 1,
      messageId: 123,
      text: 'Hello, world!',
      timestamp: Date.now(),
      sender: 'Test User',
      isOutgoing: false,
    }

    memory.addEntry(entry)
    expect(localStorageMock.setItem).toHaveBeenCalled()

    const allMemory = memory.getAllMemory()
    expect(allMemory).toHaveLength(1)
    expect(allMemory[0]).toEqual(entry)
  })

  it('should retrieve chat-specific memory', () => {
    const memory = RAGMemoryStore.getInstance()

    // Add entries for multiple chats
    const entry1 = {
      chatId: 1,
      messageId: 123,
      text: 'Message in chat 1',
      timestamp: Date.now(),
      sender: 'User 1',
      isOutgoing: false,
    }

    const entry2 = {
      chatId: 2,
      messageId: 456,
      text: 'Message in chat 2',
      timestamp: Date.now(),
      sender: 'User 2',
      isOutgoing: false,
    }

    memory.addEntry(entry1)
    memory.addEntry(entry2)

    const chat1Memory = memory.getMemoryForChat(1)
    expect(chat1Memory).toHaveLength(1)
    expect(chat1Memory[0].chatId).toBe(1)
    expect(chat1Memory[0].text).toBe('Message in chat 1')

    const chat2Memory = memory.getMemoryForChat(2)
    expect(chat2Memory).toHaveLength(1)
    expect(chat2Memory[0].chatId).toBe(2)
    expect(chat2Memory[0].text).toBe('Message in chat 2')
  })

  it('should search memory by text content', () => {
    const memory = RAGMemoryStore.getInstance()

    // Add entries with different text content
    memory.addEntry({
      chatId: 1,
      messageId: 123,
      text: 'Hello world',
      timestamp: Date.now(),
      sender: 'User 1',
      isOutgoing: false,
    })

    memory.addEntry({
      chatId: 1,
      messageId: 456,
      text: 'Goodbye world',
      timestamp: Date.now(),
      sender: 'User 2',
      isOutgoing: false,
    })

    const searchResults = memory.searchMemory('hello')
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].text).toBe('Hello world')

    // Test case insensitive search
    const searchResults2 = memory.searchMemory('WORLD')
    expect(searchResults2).toHaveLength(2)
  })

  it('should clear memory', () => {
    const memory = RAGMemoryStore.getInstance()

    memory.addEntry({
      chatId: 1,
      messageId: 123,
      text: 'Test message',
      timestamp: Date.now(),
      sender: 'User',
      isOutgoing: false,
    })

    expect(memory.getAllMemory()).toHaveLength(1)

    memory.clearMemory()
    expect(memory.getAllMemory()).toHaveLength(0)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'deep-tree-echo-memory',
      '[]'
    )
  })

  it('should load from storage on initialization', () => {
    // Setup mock localStorage with existing data
    const memoryData = [
      {
        chatId: 1,
        messageId: 123,
        text: 'Stored message',
        timestamp: 1636500000000,
        sender: 'Stored User',
        isOutgoing: false,
      },
    ]

    localStorageMock.clear()
    localStorageMock.setItem(
      'deep-tree-echo-memory',
      JSON.stringify(memoryData)
    )

    // Create a new instance which should load from storage
    const memory = RAGMemoryStore.getInstance()

    // Make sure the stored data was loaded
    const allMemory = memory.getAllMemory()
    expect(allMemory).toHaveLength(1)
    expect(allMemory[0].text).toBe('Stored message')
  })
})

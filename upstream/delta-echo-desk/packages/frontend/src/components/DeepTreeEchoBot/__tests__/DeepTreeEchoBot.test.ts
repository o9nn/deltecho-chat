import { DeepTreeEchoBot } from '../DeepTreeEchoBot'

// Mock dependencies
jest.mock('../../../../shared/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('../RAGMemoryStore', () => {
  return {
    RAGMemoryStore: jest.fn().mockImplementation(() => ({
      addMemory: jest.fn().mockResolvedValue({ id: 'test-memory-id' }),
      getMemoriesByChatId: jest.fn().mockReturnValue([]),
      getLatestChatMemories: jest.fn().mockReturnValue([]),
      searchMemories: jest.fn().mockReturnValue([]),
      deleteChatMemories: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({ totalMemories: 10, chatCount: 2 }),
    })),
  }
})

jest.mock('../LLMService', () => {
  return {
    LLMService: jest.fn().mockImplementation(() => ({
      getCompletion: jest.fn().mockResolvedValue({ content: 'Test response' }),
      generateResponseFromMemories: jest
        .fn()
        .mockResolvedValue({ content: 'Test response from memories' }),
      updateOptions: jest.fn(),
    })),
  }
})

jest.mock('../VisionCapabilities', () => {
  return {
    VisionCapabilities: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      analyzeImage: jest.fn().mockResolvedValue({
        description: 'Test image description',
        tags: ['test', 'image'],
        objects: [{ label: 'test object', confidence: 0.9 }],
      }),
      updateOptions: jest.fn(),
    })),
  }
})

jest.mock('../PlaywrightAutomation', () => {
  return {
    PlaywrightAutomation: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      searchWeb: jest.fn().mockResolvedValue({
        success: true,
        data: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            snippet: 'Test snippet',
          },
        ],
      }),
      takeScreenshot: jest.fn().mockResolvedValue({
        success: true,
        data: { url: 'https://example.com', timestamp: '2023-01-01T00:00:00Z' },
        screenshot: 'base64-screenshot-data',
      }),
      updateOptions: jest.fn(),
    })),
  }
})

jest.mock('../ProprioceptiveEmbodiment', () => {
  return {
    ProprioceptiveEmbodiment: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      startTraining: jest.fn().mockResolvedValue(true),
      stopTraining: jest.fn().mockResolvedValue(true),
      getCurrentMovementData: jest.fn().mockResolvedValue({
        positions: [],
        velocities: {
          linear: { x: 0, y: 0, z: 0 },
          angular: { roll: 0, pitch: 0, yaw: 0 },
        },
        acceleration: {
          linear: { x: 0, y: 0, z: 0 },
          angular: { roll: 0, pitch: 0, yaw: 0 },
        },
        balance: {
          stabilityScore: 0.8,
          centerOfMassOffset: { x: 0, y: 0 },
          balanceConfidence: 0.7,
        },
      }),
      evaluateMovement: jest.fn().mockResolvedValue({
        score: 0.8,
        feedback: 'Test feedback',
      }),
      getTrainingStats: jest.fn().mockReturnValue({
        sessionsCompleted: 5,
        totalDataPoints: 100,
        avgStabilityScore: 0.75,
      }),
      updateOptions: jest.fn(),
    })),
  }
})

describe('DeepTreeEchoBot', () => {
  let bot: DeepTreeEchoBot

  beforeEach(() => {
    bot = new DeepTreeEchoBot({
      enabled: true,
      apiKey: 'test-api-key',
      apiEndpoint: 'https://test-api-endpoint.com',
      memoryEnabled: true,
      personality: 'Test personality',
      visionEnabled: true,
      webAutomationEnabled: true,
      embodimentEnabled: true,
    })
  })

  describe('processMessage', () => {
    it('should process regular messages and return a response', async () => {
      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toBeTruthy()
      expect(typeof response).toBe('string')
    })

    it('should return an empty string if bot is disabled', async () => {
      bot.updateOptions({ enabled: false })

      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toBe('')
    })

    it('should handle command messages', async () => {
      const message = {
        id: 123,
        text: '/help',
        file: null,
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toContain('commands')
    })

    it('should handle errors gracefully', async () => {
      // Force an error
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const message = {
        id: 123,
        text: null,
        file: null,
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toContain('Sorry')
    })
  })

  describe('Command Handlers', () => {
    it('should handle the /help command', async () => {
      const message = {
        id: 123,
        text: '/help',
        file: null,
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toContain('Available commands')
    })

    it('should handle the /vision command', async () => {
      const message = {
        id: 123,
        text: '/vision',
        file: 'test-file-path.jpg',
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toContain('Image Analysis')
    })

    it('should handle the /search command', async () => {
      const message = {
        id: 123,
        text: '/search test query',
        file: null,
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toContain('Search results')
    })

    it('should handle the /memory command', async () => {
      const message = {
        id: 123,
        text: '/memory status',
        file: null,
      }

      const response = await bot.processMessage(1, 100, message as any)

      expect(response).toContain('Memory Status')
    })
  })

  describe('updateOptions', () => {
    it('should update options', () => {
      bot.updateOptions({
        enabled: false,
        apiKey: 'new-api-key',
        visionEnabled: false,
      })

      // We can't directly check the private options, but we can test functionality
      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      }

      return bot.processMessage(1, 100, message as any).then(response => {
        expect(response).toBe('')
      })
    })
  })
})

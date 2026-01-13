import { LLMService, ChatMessage } from '../LLMService'

// Mock the fetch function
global.fetch = jest.fn()

describe('LLMService', () => {
  let llmService: LLMService

  beforeEach(() => {
    jest.clearAllMocks()
    llmService = LLMService.getInstance()
    llmService.setConfig({
      apiKey: 'test-api-key',
      apiEndpoint: 'https://test-api-endpoint.com/v1/chat/completions',
      model: 'test-model',
      temperature: 0.5,
      maxTokens: 500,
    })
  })

  describe('generateResponse', () => {
    it('should call the API with correct parameters', async () => {
      // Mock successful API response
      const mockResponse = {
        id: 'mock-response-id',
        object: 'chat.completion',
        created: Date.now(),
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a test response',
            },
          },
        ],
      }

      // Setup the fetch mock
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      // Create test messages
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello, world!' },
      ]

      // Call the service
      const response = await llmService.generateResponse(messages)

      // Verify fetch was called with the right parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api-endpoint.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
          body: JSON.stringify({
            model: 'test-model',
            messages,
            temperature: 0.5,
            max_tokens: 500,
          }),
        }
      )

      // Verify we got the expected response
      expect(response).toBe('This is a test response')
    })

    it('should throw an error when API response is not ok', async () => {
      // Mock error API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
      })

      // Create test messages
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello, world!' },
      ]

      // Call the service and expect it to throw
      await expect(llmService.generateResponse(messages)).rejects.toThrow(
        'API Error'
      )
    })

    it('should throw an error when API key is not configured', async () => {
      // Set empty API key
      llmService.setConfig({ apiKey: '' })

      // Create test messages
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello, world!' },
      ]

      // Call the service and expect it to throw
      await expect(llmService.generateResponse(messages)).rejects.toThrow(
        'API Key is not configured'
      )
    })
  })

  describe('generateResponseWithContext', () => {
    it('should format messages correctly with conversation history', async () => {
      // Mock the generateResponse method to capture the passed messages
      const generateResponseSpy = jest
        .spyOn(llmService, 'generateResponse')
        .mockResolvedValueOnce('Mocked response')

      // Test inputs
      const userInput = 'What do you think about that?'
      const conversationHistory =
        'User: Hello\nAssistant: Hi there!\nUser: I have a question'
      const systemPrompt = 'You are a helpful assistant'

      // Call the method
      await llmService.generateResponseWithContext(
        userInput,
        conversationHistory,
        systemPrompt
      )

      // Verify the messages are formatted correctly
      const passedMessages = generateResponseSpy.mock.calls[0][0]

      expect(passedMessages).toHaveLength(4) // system + history context + assistant acknowledgment + user input
      expect(passedMessages[0]).toEqual({
        role: 'system',
        content: systemPrompt,
      })
      expect(passedMessages[1].role).toBe('user')
      expect(passedMessages[1].content).toContain(conversationHistory)
      expect(passedMessages[2].role).toBe('assistant')
      expect(passedMessages[3]).toEqual({ role: 'user', content: userInput })
    })

    it('should handle empty conversation history', async () => {
      // Mock the generateResponse method
      const generateResponseSpy = jest
        .spyOn(llmService, 'generateResponse')
        .mockResolvedValueOnce('Mocked response')

      // Test inputs with empty history
      const userInput = 'Hello, who are you?'
      const emptyHistory = ''
      const systemPrompt = 'You are a helpful assistant'

      // Call the method
      await llmService.generateResponseWithContext(
        userInput,
        emptyHistory,
        systemPrompt
      )

      // Verify the messages are formatted correctly - no history messages should be added
      const passedMessages = generateResponseSpy.mock.calls[0][0]

      expect(passedMessages).toHaveLength(2) // Just system + user input
      expect(passedMessages[0]).toEqual({
        role: 'system',
        content: systemPrompt,
      })
      expect(passedMessages[1]).toEqual({ role: 'user', content: userInput })
    })
  })
})

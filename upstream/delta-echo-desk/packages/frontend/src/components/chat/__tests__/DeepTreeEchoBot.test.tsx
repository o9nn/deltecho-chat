import React from 'react'
import { render } from '@testing-library/react'
import DeepTreeEchoBot from '../DeepTreeEchoBot'
import { BackendRemote } from '../../../backend-com'
import { LLMService } from '../../../utils/LLMService'
import { RAGMemoryStore } from '../DeepTreeEchoBot'

// Mock dependencies
jest.mock('../../../backend-com', () => ({
  BackendRemote: {
    rpc: {
      getMessage: jest.fn().mockImplementation(() => Promise.resolve({})),
      getBasicChatInfo: jest.fn().mockImplementation(() => Promise.resolve({})),
    },
    on: jest.fn(),
    off: jest.fn(),
  },
  onDCEvent: jest.fn(() => jest.fn()), // Returns a cleanup function
}))

jest.mock('../../../utils/LLMService', () => ({
  LLMService: {
    getInstance: jest.fn().mockReturnValue({
      setConfig: jest.fn(),
      generateResponseWithContext: jest
        .fn()
        .mockImplementation(() => Promise.resolve('Bot response')),
      generateResponse: jest.fn(),
    }),
  },
}))

jest.mock('../../../hooks/chat/useMessage', () => ({
  __esModule: true,
  default: () => ({
    sendMessage: jest.fn().mockImplementation(() => Promise.resolve()),
  }),
}))

jest.mock('../../../hooks/useSettingsStore', () => ({
  useSettingsStore: () => [
    {
      desktopSettings: {
        botEnabled: true,
        botLearningEnabled: true,
        botPersonality: 'Test personality',
        botApiKey: 'test-api-key',
        botApiEndpoint: 'https://test-api-endpoint.com',
      },
    },
  ],
}))

jest.mock('../../../ScreenController', () => ({
  selectedAccountId: jest.fn().mockReturnValue(1),
}))

// Mock RAGMemoryStore
const mockAddEntry = jest.fn()
jest.mock('../DeepTreeEchoBot', () => {
  const originalModule = jest.requireActual('../DeepTreeEchoBot')
  return {
    ...originalModule,
    RAGMemoryStore: {
      getInstance: jest.fn().mockReturnValue({
        addEntry: mockAddEntry,
        getMemoryForChat: jest.fn().mockReturnValue([]),
        getAllMemory: jest.fn().mockReturnValue([]),
      }),
    },
  }
})

describe('DeepTreeEchoBot', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<DeepTreeEchoBot enabled={true} />)
    expect(container).toBeTruthy()
  })

  it('configures LLM service with settings', () => {
    render(<DeepTreeEchoBot enabled={true} />)

    const llmService = LLMService.getInstance()
    expect(llmService.setConfig).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      apiEndpoint: 'https://test-api-endpoint.com',
    })
  })

  it('does not process messages when disabled', () => {
    render(<DeepTreeEchoBot enabled={false} />)

    const { onDCEvent } = require('../../../backend-com')
    expect(onDCEvent).not.toHaveBeenCalled()
  })

  it('sets up event listener for incoming messages when enabled', () => {
    render(<DeepTreeEchoBot enabled={true} />)

    const { onDCEvent } = require('../../../backend-com')
    expect(onDCEvent).toHaveBeenCalledWith(
      1,
      'IncomingMsg',
      expect.any(Function)
    )
  })

  it('processes incoming messages correctly', async () => {
    // Setup mocks for incoming message
    const mockMessage = {
      id: 123,
      text: 'Hello bot',
      isInfo: false,
      isOutgoing: false,
      timestamp: 1636500000,
      sender: {
        displayName: 'Test User',
      },
    }

    const mockChatInfo = {
      isContactRequest: false,
    }

    BackendRemote.rpc.getMessage.mockImplementation(() =>
      Promise.resolve(mockMessage)
    )
    BackendRemote.rpc.getBasicChatInfo.mockImplementation(() =>
      Promise.resolve(mockChatInfo)
    )

    // Get the event handler function
    render(<DeepTreeEchoBot enabled={true} />)

    const { onDCEvent } = require('../../../backend-com')
    const eventHandler = onDCEvent.mock.calls[0][2]

    // Call the event handler with a test event
    await eventHandler({ chatId: 42, msgId: 123 })

    // Verify message is fetched
    expect(BackendRemote.rpc.getMessage).toHaveBeenCalledWith(1, 123)

    // Verify message is added to memory
    expect(mockAddEntry).toHaveBeenCalledWith({
      chatId: 42,
      messageId: 123,
      text: 'Hello bot',
      timestamp: 1636500000,
      sender: 'Test User',
      isOutgoing: false,
    })

    // Verify chat info is checked
    expect(BackendRemote.rpc.getBasicChatInfo).toHaveBeenCalledWith(1, 42)

    // Verify bot response is generated
    const llmService = LLMService.getInstance()
    expect(llmService.generateResponseWithContext).toHaveBeenCalledWith(
      'Hello bot',
      expect.any(String),
      'Test personality'
    )

    // Verify response is sent
    const { default: useMessage } = require('../../../hooks/chat/useMessage')
    const { sendMessage } = useMessage()
    expect(sendMessage).toHaveBeenCalledWith(1, 42, { text: 'Bot response' })

    // Verify bot response is stored in memory
    expect(mockAddEntry).toHaveBeenCalledTimes(2) // Once for incoming, once for outgoing
  })

  it('skips contact requests', async () => {
    // Setup mocks
    const mockMessage = {
      id: 123,
      text: 'Hello bot',
      isInfo: false,
      isOutgoing: false,
      timestamp: 1636500000,
      sender: {
        displayName: 'Test User',
      },
    }

    const mockChatInfo = {
      isContactRequest: true, // This should cause the bot to skip processing
    }

    BackendRemote.rpc.getMessage.mockImplementation(() =>
      Promise.resolve(mockMessage)
    )
    BackendRemote.rpc.getBasicChatInfo.mockImplementation(() =>
      Promise.resolve(mockChatInfo)
    )

    // Get the event handler function
    render(<DeepTreeEchoBot enabled={true} />)

    const { onDCEvent } = require('../../../backend-com')
    const eventHandler = onDCEvent.mock.calls[0][2]

    // Call the event handler with a test event
    await eventHandler({ chatId: 42, msgId: 123 })

    // Verify message is fetched
    expect(BackendRemote.rpc.getMessage).toHaveBeenCalledWith(1, 123)

    // Verify message is still added to memory
    expect(mockAddEntry).toHaveBeenCalled()

    // Verify chat info is checked
    expect(BackendRemote.rpc.getBasicChatInfo).toHaveBeenCalledWith(1, 42)

    // Verify no response is generated for contact requests
    const llmService = LLMService.getInstance()
    expect(llmService.generateResponseWithContext).not.toHaveBeenCalled()

    // Verify no message is sent
    const { default: useMessage } = require('../../../hooks/chat/useMessage')
    const { sendMessage } = useMessage()
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('skips outgoing messages', async () => {
    // Setup mocks for outgoing message
    const mockMessage = {
      id: 123,
      text: 'Hello there',
      isInfo: false,
      isOutgoing: true, // This should cause the bot to skip processing
      timestamp: 1636500000,
      sender: {
        displayName: 'Me',
      },
    }

    BackendRemote.rpc.getMessage.mockImplementation(() =>
      Promise.resolve(mockMessage)
    )

    // Get the event handler function
    render(<DeepTreeEchoBot enabled={true} />)

    const { onDCEvent } = require('../../../backend-com')
    const eventHandler = onDCEvent.mock.calls[0][2]

    // Call the event handler with a test event
    await eventHandler({ chatId: 42, msgId: 123 })

    // Verify message is fetched
    expect(BackendRemote.rpc.getMessage).toHaveBeenCalledWith(1, 123)

    // Verify no further processing happens for outgoing messages
    expect(BackendRemote.rpc.getBasicChatInfo).not.toHaveBeenCalled()
    expect(
      LLMService.getInstance().generateResponseWithContext
    ).not.toHaveBeenCalled()
  })
})

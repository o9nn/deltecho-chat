import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import DeepTreeEchoBot, { RAGMemoryStore } from "../DeepTreeEchoBot";

// Store the event handler for testing
let storedEventHandler:
  | ((event: { chatId: number; msgId: number }) => void)
  | null = null;

// Mock dependencies - define mocks before jest.mock calls for proper hoisting
const mockGetMessage = jest.fn();
const mockGetBasicChatInfo = jest.fn();
const mockSendMessage = jest.fn().mockImplementation(() => Promise.resolve());
const mockSetConfig = jest.fn();
const mockGenerateResponseWithContext = jest
  .fn()
  .mockImplementation(() => Promise.resolve("Bot response"));

jest.mock("../../../backend-com", () => ({
  BackendRemote: {
    rpc: {
      getMessage: (...args: unknown[]) => mockGetMessage(...args),
      getBasicChatInfo: (...args: unknown[]) => mockGetBasicChatInfo(...args),
    },
    on: jest.fn(),
    off: jest.fn(),
  },
  onDCEvent: jest
    .fn()
    .mockImplementation(
      (
        _accountId: number,
        _event: string,
        handler: (event: { chatId: number; msgId: number }) => void,
      ) => {
        storedEventHandler = handler;
        return jest.fn(); // Returns a cleanup function
      },
    ),
}));

jest.mock("../../../utils/LLMService", () => ({
  LLMService: {
    getInstance: jest.fn().mockReturnValue({
      setConfig: (...args: unknown[]) => mockSetConfig(...args),
      generateResponseWithContext: (...args: unknown[]) =>
        mockGenerateResponseWithContext(...args),
      generateResponse: jest.fn(),
    }),
  },
}));

jest.mock("../../../hooks/chat/useMessage", () => ({
  __esModule: true,
  default: () => ({
    sendMessage: mockSendMessage,
  }),
}));

jest.mock("../../../stores/settings", () => ({
  useSettingsStore: () => [
    {
      desktopSettings: {
        deepTreeEchoBotEnabled: true,
        deepTreeEchoBotMemoryEnabled: true,
        deepTreeEchoBotPersonality: "Test personality",
        deepTreeEchoBotApiKey: "test-api-key",
        deepTreeEchoBotApiEndpoint: "https://test-api-endpoint.com",
      },
    },
  ],
}));

jest.mock("../../../ScreenController", () => ({
  selectedAccountId: jest.fn().mockReturnValue(1),
}));

jest.mock("../PlaywrightAutomation", () => ({
  PlaywrightAutomation: {
    getInstance: jest.fn().mockReturnValue({
      searchWeb: jest
        .fn()
        .mockImplementation(() => Promise.resolve("Search results")),
      captureWebpage: jest
        .fn()
        .mockImplementation(() => Promise.resolve("/path/to/screenshot.png")),
    }),
  },
}));

// Mock useDialog hook
jest.mock("../../../hooks/dialog/useDialog", () => ({
  __esModule: true,
  default: () => ({
    openDialog: jest.fn(),
    closeDialog: jest.fn(),
  }),
}));

// Mock DeepTreeEchoUIBridge
jest.mock("../../DeepTreeEchoBot/DeepTreeEchoUIBridge", () => ({
  getUIBridge: jest.fn().mockReturnValue({
    registerDialogContext: jest.fn(),
  }),
}));

// Mock the logger
jest.mock("../../../../../shared/logger", () => ({
  getLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("DeepTreeEchoBot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storedEventHandler = null;
    // Reset default mock implementations
    mockGetMessage.mockReset();
    mockGetBasicChatInfo.mockReset();
    mockSendMessage.mockReset();
    mockGenerateResponseWithContext.mockReset();

    mockSendMessage.mockImplementation(() => Promise.resolve());
    mockGenerateResponseWithContext.mockImplementation(() =>
      Promise.resolve("Bot response"),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders without crashing", () => {
    const { container } = render(<DeepTreeEchoBot enabled={true} />);
    expect(container).toBeTruthy();
  });

  it("returns null (no visible UI)", () => {
    const { container } = render(<DeepTreeEchoBot enabled={true} />);
    expect(container.innerHTML).toBe("");
  });

  it("configures LLM service with settings on mount", async () => {
    await act(async () => {
      render(<DeepTreeEchoBot enabled={true} />);
    });

    expect(mockSetConfig).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      apiEndpoint: "https://test-api-endpoint.com",
    });
  });

  it("sets up event listener for incoming messages when enabled", async () => {
    await act(async () => {
      render(<DeepTreeEchoBot enabled={true} />);
    });

    const { onDCEvent } = require("../../../backend-com");
    expect(onDCEvent).toHaveBeenCalledWith(
      1,
      "IncomingMsg",
      expect.any(Function),
    );
  });

  it("does not set up event listener when disabled", async () => {
    const { onDCEvent } = require("../../../backend-com");
    onDCEvent.mockClear();

    await act(async () => {
      render(<DeepTreeEchoBot enabled={false} />);
    });

    expect(onDCEvent).not.toHaveBeenCalled();
  });

  it("processes incoming messages and generates response", async () => {
    const mockMessage = {
      id: 123,
      text: "Hello bot",
      isInfo: false,
      fromId: 2, // Not self
      timestamp: 1636500000,
      sender: {
        displayName: "Test User",
      },
    };

    const mockChatInfo = {
      isContactRequest: false,
    };

    mockGetMessage.mockResolvedValue(mockMessage);
    mockGetBasicChatInfo.mockResolvedValue(mockChatInfo);

    await act(async () => {
      render(<DeepTreeEchoBot enabled={true} />);
    });

    expect(storedEventHandler).toBeDefined();

    // Trigger the event handler
    await act(async () => {
      await storedEventHandler!({ chatId: 42, msgId: 123 });
    });

    await waitFor(() => {
      expect(mockGetMessage).toHaveBeenCalledWith(1, 123);
    });

    await waitFor(() => {
      expect(mockGetBasicChatInfo).toHaveBeenCalledWith(1, 42);
    });

    await waitFor(() => {
      expect(mockGenerateResponseWithContext).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(1, 42, {
        text: "Bot response",
      });
    });
  });

  it("skips contact requests", async () => {
    const mockMessage = {
      id: 123,
      text: "Hello bot",
      isInfo: false,
      fromId: 2,
      timestamp: 1636500000,
      sender: {
        displayName: "Test User",
      },
    };

    const mockChatInfo = {
      isContactRequest: true, // Should be skipped
    };

    mockGetMessage.mockResolvedValue(mockMessage);
    mockGetBasicChatInfo.mockResolvedValue(mockChatInfo);

    await act(async () => {
      render(<DeepTreeEchoBot enabled={true} />);
    });

    await act(async () => {
      await storedEventHandler!({ chatId: 42, msgId: 123 });
    });

    await waitFor(() => {
      expect(mockGetBasicChatInfo).toHaveBeenCalled();
    });

    // Should not send a response for contact requests
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("skips info messages", async () => {
    const mockMessage = {
      id: 123,
      text: "System message",
      isInfo: true, // Info message should be skipped
      fromId: 2,
      timestamp: 1636500000,
      sender: {
        displayName: "System",
      },
    };

    mockGetMessage.mockResolvedValue(mockMessage);

    await act(async () => {
      render(<DeepTreeEchoBot enabled={true} />);
    });

    await act(async () => {
      await storedEventHandler!({ chatId: 42, msgId: 123 });
    });

    // Should not process further for info messages
    expect(mockGetBasicChatInfo).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("skips own messages (fromId === 1)", async () => {
    const mockMessage = {
      id: 123,
      text: "My own message",
      isInfo: false,
      fromId: 1, // Self - should be skipped
      timestamp: 1636500000,
      sender: {
        displayName: "Me",
      },
    };

    mockGetMessage.mockResolvedValue(mockMessage);

    await act(async () => {
      render(<DeepTreeEchoBot enabled={true} />);
    });

    await act(async () => {
      await storedEventHandler!({ chatId: 42, msgId: 123 });
    });

    // Should not process own messages
    expect(mockGetBasicChatInfo).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

describe("RAGMemoryStore", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset the singleton instance for clean tests
    // @ts-expect-error - accessing private static for test purposes
    RAGMemoryStore.instance = undefined;
  });

  it("is a singleton", () => {
    const instance1 = RAGMemoryStore.getInstance();
    const instance2 = RAGMemoryStore.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("adds and retrieves memory entries", () => {
    const store = RAGMemoryStore.getInstance();

    const entry = {
      chatId: 1,
      messageId: 100,
      text: "Test message",
      timestamp: Date.now(),
      sender: "Test User",
      isOutgoing: false,
    };

    store.addEntry(entry);

    const memories = store.getMemoryForChat(1);
    expect(memories).toHaveLength(1);
    expect(memories[0].text).toBe("Test message");
  });

  it("filters memories by chatId", () => {
    const store = RAGMemoryStore.getInstance();

    store.addEntry({
      chatId: 1,
      messageId: 100,
      text: "Chat 1 message",
      timestamp: Date.now(),
      sender: "User 1",
      isOutgoing: false,
    });

    store.addEntry({
      chatId: 2,
      messageId: 101,
      text: "Chat 2 message",
      timestamp: Date.now(),
      sender: "User 2",
      isOutgoing: false,
    });

    const chat1Memories = store.getMemoryForChat(1);
    const chat2Memories = store.getMemoryForChat(2);

    expect(chat1Memories).toHaveLength(1);
    expect(chat2Memories).toHaveLength(1);
    expect(chat1Memories[0].text).toBe("Chat 1 message");
    expect(chat2Memories[0].text).toBe("Chat 2 message");
  });

  it("searches memories by text", () => {
    const store = RAGMemoryStore.getInstance();

    store.addEntry({
      chatId: 1,
      messageId: 100,
      text: "Hello world",
      timestamp: Date.now(),
      sender: "User",
      isOutgoing: false,
    });

    store.addEntry({
      chatId: 1,
      messageId: 101,
      text: "Goodbye",
      timestamp: Date.now(),
      sender: "User",
      isOutgoing: false,
    });

    const results = store.searchMemory("hello");
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("Hello world");
  });

  it("clears memory", () => {
    const store = RAGMemoryStore.getInstance();

    store.addEntry({
      chatId: 1,
      messageId: 100,
      text: "Test message",
      timestamp: Date.now(),
      sender: "User",
      isOutgoing: false,
    });

    expect(store.getAllMemory()).toHaveLength(1);

    store.clearMemory();

    expect(store.getAllMemory()).toHaveLength(0);
  });
});

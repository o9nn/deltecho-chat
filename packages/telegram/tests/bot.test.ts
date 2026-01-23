/**
 * Tests for @deltecho/telegram bot
 */

import type {
  TelegramBotConfig,
  TelegramMessageContext,
} from "../src/types.js";

// Mock telegraf
jest.mock("telegraf", () => ({
  Telegraf: jest.fn().mockImplementation(() => ({
    command: jest.fn(),
    on: jest.fn(),
    catch: jest.fn(),
    launch: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    telegram: {
      getMe: jest.fn().mockResolvedValue({ username: "TestBot" }),
      setMyCommands: jest.fn().mockResolvedValue(undefined),
      getFileLink: jest.fn().mockResolvedValue("https://example.com/file"),
    },
  })),
  Context: jest.fn(),
}));

jest.mock("telegraf/filters", () => ({
  message: jest.fn().mockReturnValue("text"),
}));

describe("Telegram Bot Types", () => {
  describe("TelegramBotConfig", () => {
    it("should have required token field", () => {
      const config: TelegramBotConfig = {
        token: "test-token-123",
      };

      expect(config.token).toBe("test-token-123");
    });

    it("should support optional fields", () => {
      const config: TelegramBotConfig = {
        token: "test-token",
        username: "TestBot",
        allowedChats: [123, 456],
        allowedUsers: [789],
        allowGroups: true,
        requireMentionInGroups: true,
        maxResponseLength: 4096,
        webhookUrl: "https://example.com/webhook",
        webhookPort: 3000,
        debug: true,
      };

      expect(config.username).toBe("TestBot");
      expect(config.allowedChats).toHaveLength(2);
      expect(config.webhookPort).toBe(3000);
    });
  });

  describe("TelegramMessageContext", () => {
    it("should represent a private message", () => {
      const context: TelegramMessageContext = {
        messageId: 123,
        chatId: 456,
        chatType: "private",
        userId: 789,
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        mentioned: false,
        isReplyToBot: false,
      };

      expect(context.chatType).toBe("private");
      expect(context.chatTitle).toBeUndefined();
    });

    it("should represent a group message", () => {
      const context: TelegramMessageContext = {
        messageId: 123,
        chatId: -456,
        chatType: "supergroup",
        chatTitle: "Test Group",
        userId: 789,
        firstName: "John",
        mentioned: true,
        isReplyToBot: false,
      };

      expect(context.chatType).toBe("supergroup");
      expect(context.chatTitle).toBe("Test Group");
      expect(context.mentioned).toBe(true);
    });

    it("should include photos", () => {
      const context: TelegramMessageContext = {
        messageId: 123,
        chatId: 456,
        chatType: "private",
        userId: 789,
        firstName: "John",
        mentioned: false,
        isReplyToBot: false,
        photos: [
          {
            fileId: "photo-id-1",
            fileUniqueId: "unique-1",
            width: 1280,
            height: 720,
            fileSize: 50000,
          },
        ],
      };

      expect(context.photos).toHaveLength(1);
      expect(context.photos?.[0].width).toBe(1280);
    });

    it("should include voice message info", () => {
      const context: TelegramMessageContext = {
        messageId: 123,
        chatId: 456,
        chatType: "private",
        userId: 789,
        firstName: "John",
        mentioned: false,
        isReplyToBot: false,
        voice: {
          fileId: "voice-id",
          fileUniqueId: "unique-voice",
          duration: 30,
          mimeType: "audio/ogg",
          fileSize: 100000,
        },
      };

      expect(context.voice).toBeDefined();
      expect(context.voice?.duration).toBe(30);
    });

    it("should include reply context", () => {
      const context: TelegramMessageContext = {
        messageId: 123,
        chatId: 456,
        chatType: "private",
        userId: 789,
        firstName: "John",
        mentioned: false,
        isReplyToBot: true,
        replyTo: {
          messageId: 100,
          text: "Original message from bot",
          userId: 111,
        },
      };

      expect(context.isReplyToBot).toBe(true);
      expect(context.replyTo?.text).toBe("Original message from bot");
    });
  });
});

describe("Telegram Bot Commands", () => {
  describe("Command definitions", () => {
    it("should export startCommand", async () => {
      const { startCommand } = await import("../src/commands.js");
      expect(startCommand.command).toBe("start");
      expect(startCommand.description).toBeDefined();
    });

    it("should export helpCommand", async () => {
      const { helpCommand } = await import("../src/commands.js");
      expect(helpCommand.command).toBe("help");
    });

    it("should export statusCommand", async () => {
      const { statusCommand } = await import("../src/commands.js");
      expect(statusCommand.command).toBe("status");
    });

    it("should export memoryCommand", async () => {
      const { memoryCommand } = await import("../src/commands.js");
      expect(memoryCommand.command).toBe("memory");
    });

    it("should export clearCommand", async () => {
      const { clearCommand } = await import("../src/commands.js");
      expect(clearCommand.command).toBe("clear");
    });

    it("should export askCommand", async () => {
      const { askCommand } = await import("../src/commands.js");
      expect(askCommand.command).toBe("ask");
    });

    it("should export registerDefaultCommands", async () => {
      const { registerDefaultCommands } = await import("../src/commands.js");
      expect(typeof registerDefaultCommands).toBe("function");
    });
  });
});

describe("Telegram Events", () => {
  it("should export message event definitions", async () => {
    const events = await import("../src/events.js");

    expect(events.telegramMessageReceived).toBeDefined();
    expect(events.telegramMessageSent).toBeDefined();
    expect(events.telegramCommandExecuted).toBeDefined();
  });

  it("should export media event definitions", async () => {
    const events = await import("../src/events.js");

    expect(events.telegramVoiceReceived).toBeDefined();
    expect(events.telegramPhotoReceived).toBeDefined();
    expect(events.telegramDocumentReceived).toBeDefined();
  });

  it("should export status event definitions", async () => {
    const events = await import("../src/events.js");

    expect(events.telegramBotStarted).toBeDefined();
    expect(events.telegramBotStopped).toBeDefined();
    expect(events.telegramBotError).toBeDefined();
  });

  it("should export RPC event definitions", async () => {
    const events = await import("../src/events.js");

    expect(events.getBotStatus).toBeDefined();
    expect(events.sendMessage).toBeDefined();
    expect(events.processMessage).toBeDefined();
    expect(events.getMemory).toBeDefined();
    expect(events.clearMemory).toBeDefined();
    expect(events.sendPhoto).toBeDefined();
    expect(events.sendVoice).toBeDefined();
    expect(events.downloadFile).toBeDefined();
  });
});

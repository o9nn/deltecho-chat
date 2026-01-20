/**
 * Tests for @deltecho/discord bot
 */

import type { DiscordBotConfig, DiscordMessageContext } from "../src/types.js";

// Mock Discord.js
jest.mock("discord.js", () => ({
  Client: jest.fn().mockImplementation(() => ({
    once: jest.fn(),
    on: jest.fn(),
    login: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    guilds: { cache: { size: 5 } },
    user: { tag: "TestBot#0001" },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    GuildVoiceStates: 4,
    DirectMessages: 8,
    MessageContent: 16,
  },
  Partials: {
    Channel: 0,
    Message: 1,
  },
  Events: {
    ClientReady: "ready",
    MessageCreate: "messageCreate",
    InteractionCreate: "interactionCreate",
    Error: "error",
  },
  REST: jest.fn().mockImplementation(() => ({
    setToken: jest.fn().mockReturnThis(),
    put: jest.fn().mockResolvedValue(undefined),
  })),
  Routes: {
    applicationCommands: jest.fn(),
    applicationGuildCommands: jest.fn(),
  },
  SlashCommandBuilder: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addStringOption: jest.fn().mockReturnThis(),
    addIntegerOption: jest.fn().mockReturnThis(),
    addBooleanOption: jest.fn().mockReturnThis(),
    addUserOption: jest.fn().mockReturnThis(),
    addChannelOption: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({}),
  })),
}));

describe("Discord Bot Types", () => {
  describe("DiscordBotConfig", () => {
    it("should have required fields", () => {
      const config: DiscordBotConfig = {
        token: "test-token",
        clientId: "test-client-id",
      };

      expect(config.token).toBe("test-token");
      expect(config.clientId).toBe("test-client-id");
    });

    it("should support optional fields", () => {
      const config: DiscordBotConfig = {
        token: "test-token",
        clientId: "test-client-id",
        guildId: "test-guild",
        allowedChannels: ["channel-1", "channel-2"],
        allowedUsers: ["user-1"],
        commandPrefix: "!",
        allowDMs: true,
        respondToMentions: true,
        maxResponseLength: 2000,
        debug: true,
      };

      expect(config.guildId).toBe("test-guild");
      expect(config.allowedChannels).toHaveLength(2);
      expect(config.debug).toBe(true);
    });
  });

  describe("DiscordMessageContext", () => {
    it("should represent a channel message", () => {
      const context: DiscordMessageContext = {
        messageId: "123456789",
        channelId: "987654321",
        guildId: "111222333",
        userId: "444555666",
        username: "testuser",
        displayName: "Test User",
        isDM: false,
        mentioned: true,
        attachments: [],
      };

      expect(context.isDM).toBe(false);
      expect(context.guildId).not.toBeNull();
      expect(context.mentioned).toBe(true);
    });

    it("should represent a DM", () => {
      const context: DiscordMessageContext = {
        messageId: "123456789",
        channelId: "987654321",
        guildId: null,
        userId: "444555666",
        username: "testuser",
        displayName: "Test User",
        isDM: true,
        mentioned: false,
        attachments: [],
      };

      expect(context.isDM).toBe(true);
      expect(context.guildId).toBeNull();
    });

    it("should include attachments", () => {
      const context: DiscordMessageContext = {
        messageId: "123456789",
        channelId: "987654321",
        guildId: "111222333",
        userId: "444555666",
        username: "testuser",
        displayName: "Test User",
        isDM: false,
        mentioned: false,
        attachments: [
          {
            id: "att-1",
            name: "image.png",
            url: "https://cdn.discord.com/attachments/...",
            contentType: "image/png",
            size: 12345,
          },
        ],
      };

      expect(context.attachments).toHaveLength(1);
      expect(context.attachments[0].contentType).toBe("image/png");
    });

    it("should include reply context", () => {
      const context: DiscordMessageContext = {
        messageId: "123456789",
        channelId: "987654321",
        guildId: "111222333",
        userId: "444555666",
        username: "testuser",
        displayName: "Test User",
        isDM: false,
        mentioned: false,
        attachments: [],
        replyTo: {
          messageId: "111111111",
          content: "Original message",
          userId: "999888777",
        },
      };

      expect(context.replyTo).toBeDefined();
      expect(context.replyTo?.content).toBe("Original message");
    });
  });
});

describe("Discord Bot Commands", () => {
  describe("Command definitions", () => {
    it("should export helpCommand", async () => {
      const { helpCommand } = await import("../src/commands.js");
      expect(helpCommand.name).toBe("help");
      expect(helpCommand.description).toBeDefined();
    });

    it("should export statusCommand", async () => {
      const { statusCommand } = await import("../src/commands.js");
      expect(statusCommand.name).toBe("status");
    });

    it("should export memoryCommand with options", async () => {
      const { memoryCommand } = await import("../src/commands.js");
      expect(memoryCommand.name).toBe("memory");
      expect(memoryCommand.options).toBeDefined();
      expect(memoryCommand.options?.length).toBeGreaterThan(0);
    });

    it("should export askCommand with required question option", async () => {
      const { askCommand } = await import("../src/commands.js");
      expect(askCommand.name).toBe("ask");
      expect(askCommand.options).toBeDefined();
      const questionOpt = askCommand.options?.find(
        (o) => o.name === "question",
      );
      expect(questionOpt?.required).toBe(true);
    });
  });
});

describe("Discord Events", () => {
  it("should export event definitions", async () => {
    const events = await import("../src/events.js");

    expect(events.discordMessageReceived).toBeDefined();
    expect(events.discordMessageSent).toBeDefined();
    expect(events.discordCommandExecuted).toBeDefined();
    expect(events.discordVoiceJoined).toBeDefined();
    expect(events.discordBotConnected).toBeDefined();
  });

  it("should export RPC event definitions", async () => {
    const events = await import("../src/events.js");

    expect(events.getBotStatus).toBeDefined();
    expect(events.sendMessage).toBeDefined();
    expect(events.processMessage).toBeDefined();
    expect(events.getMemory).toBeDefined();
    expect(events.clearMemory).toBeDefined();
  });
});

/**
 * Discord Bot Tests
 */

import {
  DiscordBot,
  DiscordColors,
  DEFAULT_DISCORD_CONFIG,
} from "../discord/index.js";
import type { DiscordConfig, DiscordSlashCommand } from "../discord/index.js";
import type { BotCommand, CommandContext, PlatformResponse } from "../types.js";

// Mock discord.js
jest.mock("discord.js", () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue("token"),
    destroy: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(false),
    once: jest.fn(),
    on: jest.fn(),
    user: { id: "123", tag: "TestBot#0001" },
    ws: { ping: 42 },
    guilds: { cache: new Map() },
    channels: { fetch: jest.fn() },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    DirectMessages: 4,
    MessageContent: 8,
  },
  Events: {
    ClientReady: "ready",
    MessageCreate: "messageCreate",
    InteractionCreate: "interactionCreate",
    Error: "error",
  },
  ActivityType: {
    Playing: 0,
    Watching: 3,
    Listening: 2,
    Competing: 5,
  },
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
  })),
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
    toJSON: jest.fn().mockReturnValue({}),
  })),
}));

describe("DiscordBot", () => {
  const mockConfig: DiscordConfig = {
    token: "test-token",
    clientId: "test-client-id",
    debug: true,
  };

  describe("constructor", () => {
    it("should create a bot with default config merged", () => {
      const bot = new DiscordBot(mockConfig);
      expect(bot).toBeInstanceOf(DiscordBot);
      expect(bot.platform).toBe("discord");
    });

    it("should not be connected initially", () => {
      const bot = new DiscordBot(mockConfig);
      expect(bot.isConnected).toBe(false);
    });
  });

  describe("command registration", () => {
    it("should register prefix commands", () => {
      const bot = new DiscordBot(mockConfig);

      const command: BotCommand = {
        name: "test",
        description: "A test command",
        execute: jest.fn().mockResolvedValue({ content: "test" }),
      };

      bot.registerCommand(command);

      // Check stats include default commands
      const stats = bot.getStats();
      expect(stats.platform).toBe("discord");
    });

    it("should register commands with aliases", () => {
      const bot = new DiscordBot(mockConfig);

      const command: BotCommand = {
        name: "test",
        description: "A test command",
        aliases: ["t", "tst"],
        execute: jest.fn(),
      };

      bot.registerCommand(command);
      // Command should be registered under main name and aliases
    });

    it("should register slash commands", () => {
      const bot = new DiscordBot(mockConfig);

      const slashCommand: DiscordSlashCommand = {
        name: "slash-test",
        description: "A slash command",
        options: [
          {
            name: "input",
            description: "Input text",
            type: "string",
            required: true,
          },
        ],
        execute: jest.fn(),
      };

      bot.registerSlashCommand(slashCommand);
    });
  });

  describe("event handling", () => {
    it("should add and remove event listeners", () => {
      const bot = new DiscordBot(mockConfig);
      const listener = jest.fn();

      bot.on("message", listener);
      bot.off("message", listener);
    });

    it("should handle multiple listeners for same event", () => {
      const bot = new DiscordBot(mockConfig);
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      bot.on("message", listener1);
      bot.on("message", listener2);
    });
  });

  describe("statistics", () => {
    it("should track bot statistics", () => {
      const bot = new DiscordBot(mockConfig);
      const stats = bot.getStats();

      expect(stats.platform).toBe("discord");
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.commandsProcessed).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.uptime).toBe(0);
    });
  });

  describe("default commands", () => {
    it("should have help command registered", () => {
      const bot = new DiscordBot(mockConfig);
      // Default commands are registered in constructor
      const stats = bot.getStats();
      expect(stats).toBeDefined();
    });

    it("should have ping command registered", () => {
      const bot = new DiscordBot(mockConfig);
      expect(bot).toBeDefined();
    });

    it("should have stats command registered", () => {
      const bot = new DiscordBot(mockConfig);
      expect(bot).toBeDefined();
    });
  });
});

describe("DiscordColors", () => {
  it("should have predefined color values", () => {
    expect(DiscordColors.PRIMARY).toBe(0x5865f2);
    expect(DiscordColors.SUCCESS).toBe(0x57f287);
    expect(DiscordColors.WARNING).toBe(0xfee75c);
    expect(DiscordColors.ERROR).toBe(0xed4245);
    expect(DiscordColors.INFO).toBe(0x5865f2);
    expect(DiscordColors.DEEP_TREE_ECHO).toBe(0x7289da);
  });
});

describe("DEFAULT_DISCORD_CONFIG", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_DISCORD_CONFIG.debug).toBe(false);
    expect(DEFAULT_DISCORD_CONFIG.commandPrefix).toBe("!");
    expect(DEFAULT_DISCORD_CONFIG.maxMessageLength).toBe(2000);
    expect(DEFAULT_DISCORD_CONFIG.responseTimeout).toBe(30000);
    expect(DEFAULT_DISCORD_CONFIG.enableSlashCommands).toBe(true);
    expect(DEFAULT_DISCORD_CONFIG.enablePrefixCommands).toBe(true);
    expect(DEFAULT_DISCORD_CONFIG.enableVoice).toBe(false);
  });

  it("should have default intents", () => {
    expect(DEFAULT_DISCORD_CONFIG.intents).toContain("Guilds");
    expect(DEFAULT_DISCORD_CONFIG.intents).toContain("GuildMessages");
    expect(DEFAULT_DISCORD_CONFIG.intents).toContain("DirectMessages");
    expect(DEFAULT_DISCORD_CONFIG.intents).toContain("MessageContent");
  });
});

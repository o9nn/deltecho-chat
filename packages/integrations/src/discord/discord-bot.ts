/**
 * @deltecho/integrations - Discord Bot
 *
 * Full Discord integration for Deep Tree Echo using discord.js
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  TextChannel,
  DMChannel,
  ActivityType,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  type PartialMessage,
  type Interaction,
} from "discord.js";
import type { CognitiveOrchestrator } from "@deltecho/cognitive";
import type {
  IPlatformIntegration,
  PlatformMessage,
  PlatformResponse,
  PlatformEvent,
  PlatformEventType,
  PlatformEventListener,
  PlatformStats,
  BotCommand,
  CommandContext,
} from "../types.js";
import type { DiscordConfig, DiscordSlashCommand } from "./types.js";
import { DEFAULT_DISCORD_CONFIG, DiscordColors } from "./types.js";

/**
 * Discord bot integration for Deep Tree Echo
 *
 * Provides full Discord functionality including:
 * - Text message handling
 * - Slash command support
 * - Prefix command support
 * - Rich embeds
 * - Component interactions
 */
export class DiscordBot implements IPlatformIntegration {
  readonly platform = "discord" as const;

  private client: Client;
  private rest: REST;
  private config: DiscordConfig;
  private cognitive: CognitiveOrchestrator | null = null;
  private commands: Map<string, BotCommand> = new Map();
  private slashCommands: Map<string, DiscordSlashCommand> = new Map();
  private eventListeners: Map<PlatformEventType, Set<PlatformEventListener>> =
    new Map();
  private stats: PlatformStats;
  private startTime: Date | null = null;

  constructor(config: DiscordConfig) {
    this.config = { ...DEFAULT_DISCORD_CONFIG, ...config };

    // Initialize Discord client with intents
    const intents = this.config.intents
      ?.map(
        (intent) => GatewayIntentBits[intent as keyof typeof GatewayIntentBits],
      )
      .filter(Boolean) || [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ];

    this.client = new Client({ intents });
    this.rest = new REST({ version: "10" }).setToken(this.config.token);

    // Initialize stats
    this.stats = {
      platform: "discord",
      messagesReceived: 0,
      messagesSent: 0,
      commandsProcessed: 0,
      errors: 0,
      uptime: 0,
    };

    this.setupEventHandlers();
    this.registerDefaultCommands();
  }

  /**
   * Check if bot is connected
   */
  get isConnected(): boolean {
    return this.client.isReady();
  }

  /**
   * Set the cognitive orchestrator for AI responses
   */
  setCognitiveOrchestrator(cognitive: CognitiveOrchestrator): void {
    this.cognitive = cognitive;
  }

  /**
   * Start the Discord bot
   */
  async start(): Promise<void> {
    this.startTime = new Date();

    await this.client.login(this.config.token);

    // Deploy slash commands if enabled
    if (this.config.enableSlashCommands && this.config.clientId) {
      await this.deploySlashCommands();
    }

    this.log("Discord bot started");
  }

  /**
   * Stop the Discord bot
   */
  async stop(): Promise<void> {
    await this.client.destroy();
    this.startTime = null;
    this.log("Discord bot stopped");
  }

  /**
   * Send a message to a Discord channel
   */
  async sendMessage(
    channelId: string,
    response: PlatformResponse,
  ): Promise<string> {
    const channel = await this.client.channels.fetch(channelId);

    if (!channel || !("send" in channel)) {
      throw new Error(`Cannot send message to channel ${channelId}`);
    }

    const textChannel = channel as TextChannel | DMChannel;

    // Build message payload
    const payload: {
      content?: string;
      embeds?: EmbedBuilder[];
      reply?: { messageReference: string };
    } = {};

    if (response.content) {
      // Truncate if necessary
      payload.content =
        response.content.length > (this.config.maxMessageLength || 2000)
          ? response.content.slice(0, 1997) + "..."
          : response.content;
    }

    if (response.embed) {
      const embed = new EmbedBuilder();
      if (response.embed.title) embed.setTitle(response.embed.title);
      if (response.embed.description)
        embed.setDescription(response.embed.description);
      if (response.embed.color) embed.setColor(response.embed.color);
      if (response.embed.thumbnail)
        embed.setThumbnail(response.embed.thumbnail);
      if (response.embed.image) embed.setImage(response.embed.image);
      if (response.embed.footer) embed.setFooter(response.embed.footer);
      if (response.embed.timestamp)
        embed.setTimestamp(response.embed.timestamp);
      if (response.embed.fields) {
        embed.addFields(response.embed.fields);
      }
      payload.embeds = [embed];
    }

    if (response.replyTo) {
      payload.reply = { messageReference: response.replyTo };
    }

    const sent = await textChannel.send(payload as never);
    this.stats.messagesSent++;
    return sent.id;
  }

  /**
   * Register a prefix command
   */
  registerCommand(command: BotCommand): void {
    this.commands.set(command.name, command);
    command.aliases?.forEach((alias) => {
      this.commands.set(alias, command);
    });
    this.log(`Registered command: ${command.name}`);
  }

  /**
   * Register a slash command
   */
  registerSlashCommand(command: DiscordSlashCommand): void {
    this.slashCommands.set(command.name, command);
    this.log(`Registered slash command: /${command.name}`);
  }

  /**
   * Add event listener
   */
  on<T = unknown>(
    event: PlatformEventType,
    listener: PlatformEventListener<T>,
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as PlatformEventListener);
  }

  /**
   * Remove event listener
   */
  off<T = unknown>(
    event: PlatformEventType,
    listener: PlatformEventListener<T>,
  ): void {
    this.eventListeners.get(event)?.delete(listener as PlatformEventListener);
  }

  /**
   * Get bot statistics
   */
  getStats(): PlatformStats {
    return {
      ...this.stats,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      lastActivity: this.stats.lastActivity,
    };
  }

  /**
   * Get connected guilds (servers)
   */
  getGuilds(): Array<{ id: string; name: string; memberCount: number }> {
    return this.client.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────

  private setupEventHandlers(): void {
    // Bot ready
    this.client.once(Events.ClientReady, (client) => {
      this.log(`Logged in as ${client.user.tag}`);

      // Set status
      if (this.config.status) {
        const activityType = {
          playing: ActivityType.Playing,
          watching: ActivityType.Watching,
          listening: ActivityType.Listening,
          competing: ActivityType.Competing,
        }[this.config.status.type];

        client.user.setActivity(this.config.status.name, {
          type: activityType,
        });
      }

      this.emit("ready", { user: client.user.tag, guilds: this.getGuilds() });
    });

    // Message handling
    this.client.on(Events.MessageCreate, async (message) => {
      await this.handleMessage(message);
    });

    // Interaction handling (slash commands, buttons, etc.)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      await this.handleInteraction(interaction);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      this.stats.errors++;
      this.emit("error", { error });
      this.log(`Error: ${error.message}`, "error");
    });
  }

  private async handleMessage(
    message: Message | PartialMessage,
  ): Promise<void> {
    // Ignore bot messages
    if (message.author?.bot) return;

    // Fetch partial if needed
    if (message.partial) {
      try {
        message = await message.fetch();
      } catch {
        return;
      }
    }

    // Check channel permissions
    if (!this.isChannelAllowed(message.channelId)) return;

    this.stats.messagesReceived++;
    this.stats.lastActivity = new Date();

    // Convert to platform message
    const platformMessage = this.toPlatformMessage(message as Message);

    // Emit message event
    this.emit("message", platformMessage);

    const content = message.content || "";
    const prefix = this.config.commandPrefix || "!";

    // Check for prefix commands
    if (this.config.enablePrefixCommands && content.startsWith(prefix)) {
      await this.handlePrefixCommand(
        message as Message,
        platformMessage,
        prefix,
      );
      return;
    }

    // Check if mentioned or in DM
    const isMentioned = message.mentions.has(this.client.user!.id);
    const isDM = message.channel.type === 1; // DM channel type

    if (isMentioned || isDM) {
      await this.handleCognitiveResponse(message as Message, platformMessage);
    }
  }

  private async handlePrefixCommand(
    message: Message,
    platformMessage: PlatformMessage,
    prefix: string,
  ): Promise<void> {
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this.commands.get(commandName);
    if (!command) return;

    this.stats.commandsProcessed++;
    this.emit("command", { command: commandName, args });

    const context: CommandContext = {
      message: platformMessage,
      command: commandName,
      args,
      namedArgs: {},
      reply: async (response) => {
        const resp =
          typeof response === "string" ? { content: response } : response;
        return this.sendMessage(message.channelId, {
          ...resp,
          replyTo: message.id,
        });
      },
    };

    try {
      const response = await command.execute(context);
      if (response) {
        await this.sendMessage(message.channelId, {
          ...response,
          replyTo: message.id,
        });
      }
    } catch (error) {
      this.stats.errors++;
      const err = error as Error;
      await message.reply(`❌ Error: ${err.message}`);
      this.log(`Command error: ${err.message}`, "error");
    }
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.slashCommands.get(interaction.commandName);
    if (!command) return;

    this.stats.commandsProcessed++;
    this.emit("command", {
      command: interaction.commandName,
      type: "slash",
      options: interaction.options.data,
    });

    // Convert to platform message format
    const platformMessage: PlatformMessage = {
      id: interaction.id,
      platform: "discord",
      content: `/${interaction.commandName}`,
      author: {
        id: interaction.user.id,
        username: interaction.user.username,
        displayName: interaction.user.displayName,
        isBot: interaction.user.bot,
      },
      channel: {
        id: interaction.channelId || "unknown",
        name: interaction.channel?.isDMBased()
          ? "DM"
          : (interaction.channel as TextChannel)?.name,
        type: interaction.channel?.isDMBased() ? "dm" : "guild",
      },
      timestamp: new Date(),
    };

    const context: CommandContext = {
      message: platformMessage,
      command: interaction.commandName,
      args: [],
      namedArgs: Object.fromEntries(
        interaction.options.data.map((opt) => [
          opt.name,
          opt.value as string | number | boolean,
        ]),
      ),
      reply: async (response) => {
        const resp =
          typeof response === "string" ? { content: response } : response;
        await this.replyToInteraction(interaction, resp);
        return interaction.id;
      },
    };

    try {
      await interaction.deferReply();
      const response = await command.execute(context);
      if (response) {
        await this.replyToInteraction(interaction, response);
      }
    } catch (error) {
      this.stats.errors++;
      const err = error as Error;
      await interaction.editReply(`❌ Error: ${err.message}`);
      this.log(`Slash command error: ${err.message}`, "error");
    }
  }

  private async replyToInteraction(
    interaction: ChatInputCommandInteraction,
    response: PlatformResponse,
  ): Promise<void> {
    const payload: {
      content?: string;
      embeds?: EmbedBuilder[];
      ephemeral?: boolean;
    } = {
      ephemeral: response.ephemeral,
    };

    if (response.content) {
      payload.content = response.content;
    }

    if (response.embed) {
      const embed = new EmbedBuilder().setColor(
        response.embed.color || DiscordColors.DEEP_TREE_ECHO,
      );

      if (response.embed.title) embed.setTitle(response.embed.title);
      if (response.embed.description)
        embed.setDescription(response.embed.description);
      if (response.embed.fields) embed.addFields(response.embed.fields);

      payload.embeds = [embed];
    }

    await interaction.editReply(payload);
  }

  private async handleCognitiveResponse(
    message: Message,
    platformMessage: PlatformMessage,
  ): Promise<void> {
    if (!this.cognitive) {
      await message.reply("🤖 Cognitive system not initialized yet.");
      return;
    }

    try {
      // Show typing indicator
      if (
        "sendTyping" in message.channel &&
        typeof message.channel.sendTyping === "function"
      ) {
        await message.channel.sendTyping();
      }

      // Extract clean content (remove mention)
      let content = message.content
        .replace(new RegExp(`<@!?${this.client.user!.id}>`, "g"), "")
        .trim();

      if (!content) {
        content = "Hello!";
      }

      // Process through cognitive orchestrator
      const result = await this.cognitive.processMessage(content, {
        chatId: parseInt(platformMessage.channel.id, 10) || 0,
      });

      // Send response
      if (result.response) {
        await this.sendMessage(message.channelId, {
          content: result.response.content,
          replyTo: message.id,
        });
      }
    } catch (error) {
      this.stats.errors++;
      const err = error as Error;
      await message.reply(`❌ I encountered an error: ${err.message}`);
      this.log(`Cognitive error: ${err.message}`, "error");
    }
  }

  private toPlatformMessage(message: Message): PlatformMessage {
    return {
      id: message.id,
      platform: "discord",
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        displayName: message.member?.displayName || message.author.displayName,
        isBot: message.author.bot,
      },
      channel: {
        id: message.channelId,
        name: (message.channel as TextChannel)?.name,
        type: message.channel.isDMBased() ? "dm" : "guild",
      },
      timestamp: message.createdAt,
      attachments: message.attachments.map((att) => ({
        id: att.id,
        type: this.getAttachmentType(att.contentType),
        url: att.url,
        filename: att.name ?? undefined,
        size: att.size,
        mimeType: att.contentType ?? undefined,
      })),
      replyTo: message.reference?.messageId ?? undefined,
      raw: message,
    };
  }

  private getAttachmentType(
    contentType: string | null,
  ): "image" | "audio" | "video" | "file" {
    if (!contentType) return "file";
    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("audio/")) return "audio";
    if (contentType.startsWith("video/")) return "video";
    return "file";
  }

  private isChannelAllowed(channelId: string): boolean {
    if (this.config.ignoredChannels?.includes(channelId)) return false;
    if (this.config.allowedChannels?.length) {
      return this.config.allowedChannels.includes(channelId);
    }
    return true;
  }

  private async deploySlashCommands(): Promise<void> {
    if (!this.config.clientId) return;

    const commands = Array.from(this.slashCommands.values()).map((cmd) => {
      const builder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

      // Add options
      cmd.options?.forEach((opt) => {
        switch (opt.type) {
          case "string":
            builder.addStringOption((o) => {
              o.setName(opt.name).setDescription(opt.description);
              if (opt.required) o.setRequired(true);
              return o;
            });
            break;
          case "integer":
            builder.addIntegerOption((o) => {
              o.setName(opt.name).setDescription(opt.description);
              if (opt.required) o.setRequired(true);
              return o;
            });
            break;
          case "boolean":
            builder.addBooleanOption((o) => {
              o.setName(opt.name).setDescription(opt.description);
              if (opt.required) o.setRequired(true);
              return o;
            });
            break;
          case "user":
            builder.addUserOption((o) => {
              o.setName(opt.name).setDescription(opt.description);
              if (opt.required) o.setRequired(true);
              return o;
            });
            break;
        }
      });

      return builder.toJSON();
    });

    try {
      // Deploy to dev guilds for instant updates, or global
      if (this.config.devGuildIds?.length) {
        for (const guildId of this.config.devGuildIds) {
          await this.rest.put(
            Routes.applicationGuildCommands(this.config.clientId, guildId),
            { body: commands },
          );
          this.log(
            `Deployed ${commands.length} slash commands to guild ${guildId}`,
          );
        }
      } else {
        await this.rest.put(Routes.applicationCommands(this.config.clientId), {
          body: commands,
        });
        this.log(`Deployed ${commands.length} global slash commands`);
      }
    } catch (error) {
      this.log(
        `Failed to deploy slash commands: ${(error as Error).message}`,
        "error",
      );
    }
  }

  private registerDefaultCommands(): void {
    // Help command
    this.registerCommand({
      name: "help",
      description: "Show available commands",
      aliases: ["h", "commands"],
      execute: async (_ctx) => {
        const prefix = this.config.commandPrefix || "!";
        const commands = Array.from(new Set(this.commands.values()));

        const fields = commands.map((cmd) => ({
          name: `${prefix}${cmd.name}`,
          value: cmd.description,
          inline: true,
        }));

        return {
          content: "",
          embed: {
            title: "🌳 Deep Tree Echo Commands",
            description: "Available commands:",
            color: DiscordColors.DEEP_TREE_ECHO,
            fields,
          },
        };
      },
    });

    // Ping command
    this.registerCommand({
      name: "ping",
      description: "Check bot latency",
      execute: async () => {
        return {
          content: `🏓 Pong! Latency: ${this.client.ws.ping}ms`,
        };
      },
    });

    // Stats command
    this.registerCommand({
      name: "stats",
      description: "Show bot statistics",
      execute: async () => {
        const stats = this.getStats();
        const uptime = Math.floor(stats.uptime / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;

        return {
          content: "",
          embed: {
            title: "📊 Deep Tree Echo Statistics",
            color: DiscordColors.INFO,
            fields: [
              {
                name: "📨 Messages Received",
                value: stats.messagesReceived.toString(),
                inline: true,
              },
              {
                name: "📤 Messages Sent",
                value: stats.messagesSent.toString(),
                inline: true,
              },
              {
                name: "⚡ Commands Processed",
                value: stats.commandsProcessed.toString(),
                inline: true,
              },
              {
                name: "⏱️ Uptime",
                value: `${hours}h ${minutes}m ${seconds}s`,
                inline: true,
              },
              {
                name: "🌐 Servers",
                value: this.getGuilds().length.toString(),
                inline: true,
              },
              {
                name: "❌ Errors",
                value: stats.errors.toString(),
                inline: true,
              },
            ],
          },
        };
      },
    });

    // Register as slash commands too
    this.registerSlashCommand({
      name: "help",
      description: "Show available commands",
      execute: this.commands.get("help")!.execute,
    });

    this.registerSlashCommand({
      name: "ping",
      description: "Check bot latency",
      execute: this.commands.get("ping")!.execute,
    });

    this.registerSlashCommand({
      name: "stats",
      description: "Show bot statistics",
      execute: this.commands.get("stats")!.execute,
    });

    // Ask slash command for direct cognitive queries
    this.registerSlashCommand({
      name: "ask",
      description: "Ask Deep Tree Echo a question",
      options: [
        {
          name: "question",
          description: "Your question",
          type: "string",
          required: true,
        },
      ],
      execute: async (ctx) => {
        if (!this.cognitive) {
          return { content: "🤖 Cognitive system not initialized yet." };
        }

        const question = ctx.namedArgs["question"] as string;

        const result = await this.cognitive.processMessage(question, {
          chatId: parseInt(ctx.message.channel.id, 10) || 0,
        });

        return {
          content: result.response?.content || "I have no response.",
        };
      },
    });
  }

  private emit<T>(event: PlatformEventType, data: T): void {
    const platformEvent: PlatformEvent<T> = {
      type: event,
      platform: "discord",
      timestamp: new Date(),
      data,
    };

    this.eventListeners.get(event)?.forEach((listener) => {
      try {
        listener(platformEvent);
      } catch (error) {
        this.log(`Event listener error: ${(error as Error).message}`, "error");
      }
    });
  }

  private log(message: string, level: "info" | "error" = "info"): void {
    if (this.config.debug || level === "error") {
      const prefix = `[Discord Bot]`;
      if (level === "error") {
        console.error(`${prefix} ${message}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
}

/**
 * Create a new Discord bot instance
 */
export function createDiscordBot(config: DiscordConfig): DiscordBot {
  return new DiscordBot(config);
}

/**
 * Deep Tree Echo Discord Bot
 *
 * Main bot class integrating Discord.js with the cognitive system
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Message,
  REST,
  Routes,
  SlashCommandBuilder,
  type Interaction,
} from "discord.js";
import type {
  BotCommand,
  BotState,
  DiscordBotConfig,
  DiscordMessageContext,
} from "./types.js";

/**
 * Cognitive processor interface for processing messages
 */
export interface CognitiveProcessor {
  processMessage(
    content: string,
    context: DiscordMessageContext,
  ): Promise<string>;
}

/**
 * Deep Tree Echo Discord Bot
 */
export class DeepTreeEchoDiscordBot {
  private client: Client;
  private config: DiscordBotConfig;
  private processor?: CognitiveProcessor;
  private commands = new Map<string, BotCommand>();
  private state: BotState = {
    connected: false,
    guildCount: 0,
    uptime: 0,
    messagesProcessed: 0,
    commandsExecuted: 0,
    voiceConnections: 0,
  };
  private startTime: number = 0;

  constructor(config: DiscordBotConfig) {
    this.config = {
      commandPrefix: "!",
      allowDMs: true,
      respondToMentions: true,
      maxResponseLength: 2000,
      debug: false,
      ...config,
    };

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this.setupEventHandlers();
  }

  /**
   * Set the cognitive processor for message handling
   */
  setCognitiveProcessor(processor: CognitiveProcessor): void {
    this.processor = processor;
  }

  /**
   * Register a slash command
   */
  registerCommand(command: BotCommand): void {
    this.commands.set(command.name, command);
    this.log(`Registered command: /${command.name}`);
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    this.log("Starting Deep Tree Echo Discord Bot...");

    // Register slash commands with Discord
    await this.registerSlashCommands();

    // Login to Discord
    await this.client.login(this.config.token);

    this.startTime = Date.now();
    this.log("Bot started successfully!");
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    this.log("Stopping bot...");
    this.client.destroy();
    this.state.connected = false;
  }

  /**
   * Get current bot state
   */
  getState(): BotState {
    return {
      ...this.state,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      guildCount: this.client.guilds.cache.size,
    };
  }

  /**
   * Setup Discord.js event handlers
   */
  private setupEventHandlers(): void {
    // Ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      this.state.connected = true;
      this.state.guildCount = readyClient.guilds.cache.size;
      this.log(`Logged in as ${readyClient.user.tag}`);
      this.log(`Connected to ${this.state.guildCount} guilds`);
    });

    // Message event
    this.client.on(Events.MessageCreate, async (message) => {
      await this.handleMessage(message);
    });

    // Interaction (slash command) event
    this.client.on(Events.InteractionCreate, async (interaction) => {
      await this.handleInteraction(interaction);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      console.error("[Discord Bot] Error:", error);
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: Message): Promise<void> {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if we should respond
    const shouldRespond = this.shouldRespondToMessage(message);
    if (!shouldRespond) return;

    // Get the message content (remove mention if needed)
    let content = message.content;
    if (this.client.user && message.mentions.has(this.client.user)) {
      content = content
        .replace(new RegExp(`<@!?${this.client.user.id}>`), "")
        .trim();
    }

    // Skip empty messages after removing mention
    if (!content) return;

    // Build context
    const context: DiscordMessageContext = {
      messageId: message.id,
      channelId: message.channelId,
      guildId: message.guildId,
      userId: message.author.id,
      username: message.author.username,
      displayName: message.author.displayName || message.author.username,
      isDM: !message.guild,
      mentioned: this.client.user
        ? message.mentions.has(this.client.user)
        : false,
      attachments: message.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        contentType: a.contentType,
        size: a.size,
      })),
    };

    // Add reply context if this is a reply
    if (message.reference?.messageId) {
      try {
        const repliedTo = await message.channel.messages.fetch(
          message.reference.messageId,
        );
        context.replyTo = {
          messageId: repliedTo.id,
          content: repliedTo.content,
          userId: repliedTo.author.id,
        };
      } catch {
        // Ignore if we can't fetch the replied message
      }
    }

    this.state.messagesProcessed++;
    this.log(
      `Processing message from ${context.username}: "${content.substring(
        0,
        50,
      )}..."`,
    );

    try {
      // Process with cognitive system
      let response: string;
      if (this.processor) {
        response = await this.processor.processMessage(content, context);
      } else {
        response = "I am not fully initialized yet. Please try again later.";
      }

      // Split long responses
      const chunks = this.splitResponse(response);

      // Send response(s)
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } catch (error) {
      console.error("[Discord Bot] Error processing message:", error);
      await message.reply(
        "I encountered an error processing your message. Please try again.",
      );
    }
  }

  /**
   * Handle slash command interactions
   */
  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    this.state.commandsExecuted++;
    this.log(`Executing command: /${interaction.commandName}`);

    try {
      await command.execute({
        reply: async (content) => {
          if (typeof content === "string") {
            await interaction.reply(content);
          } else {
            await interaction.reply(content);
          }
        },
        deferReply: async (options) => {
          await interaction.deferReply(options);
        },
        editReply: async (content) => {
          await interaction.editReply(content);
        },
        followUp: async (content) => {
          await interaction.followUp(content);
        },
        getOption: <T = string>(name: string): T | null => {
          const option = interaction.options.get(name);
          return option?.value as T | null;
        },
        user: {
          id: interaction.user.id,
          username: interaction.user.username,
        },
        channelId: interaction.channelId,
        guildId: interaction.guildId,
      });
    } catch (error) {
      console.error("[Discord Bot] Error executing command:", error);
      const errorMessage = "An error occurred while executing this command.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }

  /**
   * Register slash commands with Discord API
   */
  private async registerSlashCommands(): Promise<void> {
    if (this.commands.size === 0) return;

    const rest = new REST().setToken(this.config.token);

    const commandData = Array.from(this.commands.values()).map((cmd) => {
      const builder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

      // Add options if any
      cmd.options?.forEach((opt) => {
        switch (opt.type) {
          case "string":
            builder.addStringOption((o) =>
              o
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required ?? false),
            );
            break;
          case "integer":
            builder.addIntegerOption((o) =>
              o
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required ?? false),
            );
            break;
          case "boolean":
            builder.addBooleanOption((o) =>
              o
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required ?? false),
            );
            break;
          case "user":
            builder.addUserOption((o) =>
              o
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required ?? false),
            );
            break;
          case "channel":
            builder.addChannelOption((o) =>
              o
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required ?? false),
            );
            break;
        }
      });

      return builder.toJSON();
    });

    try {
      this.log(`Registering ${commandData.length} slash commands...`);

      // Register to specific guild (faster) or globally
      if (this.config.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(
            this.config.clientId,
            this.config.guildId,
          ),
          { body: commandData },
        );
        this.log("Commands registered to development guild");
      } else {
        await rest.put(Routes.applicationCommands(this.config.clientId), {
          body: commandData,
        });
        this.log(
          "Commands registered globally (may take up to 1 hour to propagate)",
        );
      }
    } catch (error) {
      console.error("[Discord Bot] Error registering commands:", error);
    }
  }

  /**
   * Check if we should respond to a message
   */
  private shouldRespondToMessage(message: Message): boolean {
    // Check channel allowlist
    if (
      this.config.allowedChannels?.length &&
      !this.config.allowedChannels.includes(message.channelId)
    ) {
      return false;
    }

    // Check user allowlist
    if (
      this.config.allowedUsers?.length &&
      !this.config.allowedUsers.includes(message.author.id)
    ) {
      return false;
    }

    // Check DM settings
    if (!message.guild && !this.config.allowDMs) {
      return false;
    }

    // Check if mentioned
    if (this.config.respondToMentions && this.client.user) {
      if (message.mentions.has(this.client.user)) {
        return true;
      }
    }

    // Check prefix command
    if (
      this.config.commandPrefix &&
      message.content.startsWith(this.config.commandPrefix)
    ) {
      return true;
    }

    // In DMs, respond to everything
    if (!message.guild && this.config.allowDMs) {
      return true;
    }

    return false;
  }

  /**
   * Split response into chunks for Discord's 2000 character limit
   */
  private splitResponse(response: string): string[] {
    const maxLength = this.config.maxResponseLength || 2000;

    if (response.length <= maxLength) {
      return [response];
    }

    const chunks: string[] = [];
    let remaining = response;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Find a good break point (end of sentence, paragraph, or word)
      let breakPoint = remaining.lastIndexOf("\n\n", maxLength);
      if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
        breakPoint = remaining.lastIndexOf("\n", maxLength);
      }
      if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
        breakPoint = remaining.lastIndexOf(". ", maxLength);
      }
      if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
        breakPoint = remaining.lastIndexOf(" ", maxLength);
      }
      if (breakPoint === -1) {
        breakPoint = maxLength;
      }

      chunks.push(remaining.substring(0, breakPoint + 1));
      remaining = remaining.substring(breakPoint + 1);
    }

    return chunks;
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Discord Bot] ${message}`);
    }
  }
}

/**
 * Create a Discord bot instance
 */
export function createDiscordBot(
  config: DiscordBotConfig,
): DeepTreeEchoDiscordBot {
  return new DeepTreeEchoDiscordBot(config);
}

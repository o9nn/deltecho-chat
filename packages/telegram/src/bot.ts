/**
 * Deep Tree Echo Telegram Bot
 *
 * Main bot class integrating Telegraf with the cognitive system
 */

import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import type { Update, Message } from "telegraf/types";
import type {
  BotCommand,
  BotState,
  CommandContext,
  TelegramBotConfig,
  TelegramMessageContext,
} from "./types.js";

/**
 * Cognitive processor interface for processing messages
 */
export interface CognitiveProcessor {
  processMessage(
    content: string,
    context: TelegramMessageContext,
  ): Promise<string>;
}

/**
 * Deep Tree Echo Telegram Bot
 */
export class DeepTreeEchoTelegramBot {
  private bot: Telegraf<Context<Update>>;
  private config: TelegramBotConfig;
  private processor?: CognitiveProcessor;
  private commands = new Map<string, BotCommand>();
  private state: BotState = {
    running: false,
    uptime: 0,
    messagesProcessed: 0,
    commandsExecuted: 0,
    activeChatCount: 0,
  };
  private startTime: number = 0;
  private activeChats = new Set<number>();

  constructor(config: TelegramBotConfig) {
    this.config = {
      allowGroups: true,
      requireMentionInGroups: true,
      maxResponseLength: 4096,
      debug: false,
      ...config,
    };

    this.bot = new Telegraf(this.config.token);
    this.setupHandlers();
  }

  /**
   * Set the cognitive processor for message handling
   */
  setCognitiveProcessor(processor: CognitiveProcessor): void {
    this.processor = processor;
  }

  /**
   * Register a command
   */
  registerCommand(command: BotCommand): void {
    this.commands.set(command.command, command);
    this.log(`Registered command: /${command.command}`);
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    this.log("Starting Deep Tree Echo Telegram Bot...");

    // Set bot commands for menu
    await this.setMyCommands();

    // Start bot
    if (this.config.webhookUrl) {
      // Webhook mode for production
      await this.bot.launch({
        webhook: {
          domain: this.config.webhookUrl,
          port: this.config.webhookPort || 3000,
        },
      });
      this.log(`Bot started in webhook mode at ${this.config.webhookUrl}`);
    } else {
      // Long polling mode for development
      await this.bot.launch();
      this.log("Bot started in long polling mode");
    }

    this.state.running = true;
    this.startTime = Date.now();

    // Get bot info
    const botInfo = await this.bot.telegram.getMe();
    this.config.username = botInfo.username;
    this.log(`Logged in as @${botInfo.username}`);

    // Handle graceful shutdown
    process.once("SIGINT", () => this.stop());
    process.once("SIGTERM", () => this.stop());
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    this.log("Stopping bot...");
    this.bot.stop();
    this.state.running = false;
  }

  /**
   * Get current bot state
   */
  getState(): BotState {
    return {
      ...this.state,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      activeChatCount: this.activeChats.size,
    };
  }

  /**
   * Setup Telegraf handlers
   */
  private setupHandlers(): void {
    // Command handlers
    this.bot.command("start", async (ctx) => {
      await this.handleCommand(ctx, "start");
    });

    this.bot.command("help", async (ctx) => {
      await this.handleCommand(ctx, "help");
    });

    // Register all custom commands
    for (const [name] of this.commands) {
      this.bot.command(name, async (ctx) => {
        await this.handleCommand(ctx, name);
      });
    }

    // Text message handler
    this.bot.on(message("text"), async (ctx) => {
      await this.handleTextMessage(ctx);
    });

    // Voice message handler
    this.bot.on(message("voice"), async (ctx) => {
      await this.handleVoiceMessage(ctx);
    });

    // Photo handler
    this.bot.on(message("photo"), async (ctx) => {
      await this.handlePhotoMessage(ctx);
    });

    // Callback query handler (for inline buttons)
    this.bot.on("callback_query", async (ctx) => {
      await ctx.answerCbQuery();
      // Handle callback data
    });

    // Error handler
    this.bot.catch((err) => {
      console.error("[Telegram Bot] Error:", err);
    });
  }

  /**
   * Handle command
   */
  private async handleCommand(
    ctx: Context,
    commandName: string,
  ): Promise<void> {
    const command = this.commands.get(commandName);
    if (!command) return;

    this.state.commandsExecuted++;
    this.log(`Executing command: /${commandName}`);

    const msg = ctx.message as Message.TextMessage;
    if (!msg) return;

    // Extract args from command
    const text = msg.text || "";
    const args = text.split(/\s+/).slice(1);

    const commandContext: CommandContext = {
      reply: async (text, options) => {
        await ctx.reply(text, {
          reply_parameters: options?.replyToMessageId
            ? { message_id: options.replyToMessageId }
            : undefined,
          parse_mode: options?.parseMode,
          link_preview_options: options?.disableLinkPreview
            ? { is_disabled: true }
            : undefined,
          disable_notification: options?.disableNotification,
        });
      },
      replyWithMarkdown: async (text) => {
        await ctx.replyWithMarkdownV2(this.escapeMarkdown(text));
      },
      replyWithHTML: async (text) => {
        await ctx.replyWithHTML(text);
      },
      replyWithPhoto: async (source) => {
        await ctx.replyWithPhoto(source as string);
      },
      replyWithVoice: async (source) => {
        await ctx.replyWithVoice(source as string);
      },
      args,
      text,
      message: this.buildMessageContext(ctx),
      deleteMessage: async () => {
        await ctx.deleteMessage();
      },
    };

    try {
      await command.handler(commandContext);
    } catch (error) {
      console.error(`[Telegram Bot] Error in command /${commandName}:`, error);
      await ctx.reply("An error occurred while processing your command.");
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(ctx: Context): Promise<void> {
    const msg = ctx.message as Message.TextMessage;
    if (!msg || !msg.text) return;

    // Build context
    const messageContext = this.buildMessageContext(ctx);

    // Check if we should respond
    if (!this.shouldRespond(messageContext, msg.text)) {
      return;
    }

    // Track active chat
    this.activeChats.add(messageContext.chatId);
    this.state.messagesProcessed++;

    // Get cleaned message text (remove bot mention)
    let content = msg.text;
    if (this.config.username) {
      content = content
        .replace(new RegExp(`@${this.config.username}`, "gi"), "")
        .trim();
    }

    this.log(
      `Processing message from ${
        messageContext.firstName
      }: "${content.substring(0, 50)}..."`,
    );

    try {
      // Show typing indicator
      await ctx.sendChatAction("typing");

      // Process with cognitive system
      let response: string;
      if (this.processor) {
        response = await this.processor.processMessage(content, messageContext);
      } else {
        response = "I am not fully initialized yet. Please try again later.";
      }

      // Split long responses
      const chunks = this.splitResponse(response);

      // Send response(s)
      for (const chunk of chunks) {
        await ctx.reply(chunk, {
          reply_parameters: { message_id: msg.message_id },
        });
      }
    } catch (error) {
      console.error("[Telegram Bot] Error processing message:", error);
      await ctx.reply(
        "I encountered an error processing your message. Please try again.",
        {
          reply_parameters: { message_id: msg.message_id },
        },
      );
    }
  }

  /**
   * Handle voice messages with speech-to-text processing
   */
  private async handleVoiceMessage(ctx: Context): Promise<void> {
    const msg = ctx.message as Message.VoiceMessage;
    if (!msg || !msg.voice) return;

    const messageContext = this.buildMessageContext(ctx);

    if (!this.shouldRespond(messageContext, "")) {
      return;
    }

    this.log(`Received voice message from ${messageContext.firstName}`);
    this.activeChats.add(messageContext.chatId);
    this.state.messagesProcessed++;

    try {
      await ctx.sendChatAction("typing");

      // Get file link and download audio
      const fileLink = await ctx.telegram.getFileLink(msg.voice.file_id);
      const audioResponse = await fetch(fileLink.href);
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

      // Try to use MultiModalProcessor for STT
      try {
        const { multiModalProcessor } = await import(
          "deep-tree-echo-core/multimodal"
        );
        const capabilities = multiModalProcessor.getCapabilities();

        if (capabilities.stt) {
          const result = await multiModalProcessor.speechToText(audioBuffer);

          if (result.text) {
            this.log(`Transcribed: "${result.text.substring(0, 50)}..."`);

            // Process transcribed text through cognitive system
            if (this.processor) {
              const response = await this.processor.processMessage(
                result.text,
                messageContext,
              );
              await this.sendResponse(ctx, response, msg.message_id);
            } else {
              await ctx.reply(`🎤 I heard: "${result.text}"`, {
                reply_parameters: { message_id: msg.message_id },
              });
            }
          } else {
            await ctx.reply(
              "🎤 I couldn't understand the audio clearly. Could you try again?",
              { reply_parameters: { message_id: msg.message_id } },
            );
          }
        } else {
          await ctx.reply(
            "🎤 Voice processing requires an OpenAI API key to be configured.",
            { reply_parameters: { message_id: msg.message_id } },
          );
        }
      } catch {
        // Fallback if multimodal module not available
        await ctx.reply(
          "🎤 Voice message received. Speech processing is not configured.",
          { reply_parameters: { message_id: msg.message_id } },
        );
      }
    } catch (error) {
      console.error("[Telegram Bot] Error processing voice:", error);
      await ctx.reply("I couldn't process your voice message.", {
        reply_parameters: { message_id: msg.message_id },
      });
    }
  }

  /**
   * Handle photo messages with vision analysis
   */
  private async handlePhotoMessage(ctx: Context): Promise<void> {
    const msg = ctx.message as Message.PhotoMessage;
    if (!msg || !msg.photo) return;

    const messageContext = this.buildMessageContext(ctx);

    if (!this.shouldRespond(messageContext, "")) {
      return;
    }

    this.log(`Received photo from ${messageContext.firstName}`);
    this.activeChats.add(messageContext.chatId);
    this.state.messagesProcessed++;

    try {
      await ctx.sendChatAction("typing");

      // Get highest resolution photo
      const photo = msg.photo[msg.photo.length - 1];
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);

      // Download image
      const imageResponse = await fetch(fileLink.href);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Get caption if provided
      const caption = msg.caption;

      // Try to use MultiModalProcessor for vision
      try {
        const { multiModalProcessor } = await import(
          "deep-tree-echo-core/multimodal"
        );
        const capabilities = multiModalProcessor.getCapabilities();

        if (capabilities.vision) {
          const result = await multiModalProcessor.processImageMessage(
            imageBuffer,
            {
              caption,
              detailedAnalysis: true,
              responseGenerator: this.processor
                ? async (analysis: { description: string }) => {
                    const prompt = caption
                      ? `The user sent an image with caption: "${caption}"\n\nImage analysis: ${analysis.description}`
                      : `The user sent an image.\n\nImage analysis: ${analysis.description}`;
                    return this.processor!.processMessage(
                      prompt,
                      messageContext,
                    );
                  }
                : undefined,
            },
          );

          const response =
            result.response || `📷 ${result.analysis.description}`;
          await this.sendResponse(ctx, response, msg.message_id);
        } else {
          await ctx.reply(
            "📷 Image analysis requires an Anthropic API key to be configured.",
            { reply_parameters: { message_id: msg.message_id } },
          );
        }
      } catch {
        // Fallback if multimodal module not available
        await ctx.reply(
          "📷 Image received. Vision processing is not configured.",
          { reply_parameters: { message_id: msg.message_id } },
        );
      }
    } catch (error) {
      console.error("[Telegram Bot] Error processing photo:", error);
      await ctx.reply("I couldn't process your image.", {
        reply_parameters: { message_id: msg.message_id },
      });
    }
  }

  /**
   * Send a response, splitting if necessary
   */
  private async sendResponse(
    ctx: Context,
    response: string,
    replyToId: number,
  ): Promise<void> {
    const chunks = this.splitResponse(response);
    for (const chunk of chunks) {
      await ctx.reply(chunk, {
        reply_parameters: { message_id: replyToId },
      });
    }
  }

  /**
   * Build message context from Telegraf context
   */
  private buildMessageContext(ctx: Context): TelegramMessageContext {
    const msg = ctx.message as Message;
    const chat = ctx.chat;
    const from = ctx.from;

    if (!msg || !chat || !from) {
      throw new Error("Invalid context");
    }

    // Check if bot was mentioned
    const text = (msg as Message.TextMessage).text || "";
    const mentioned = this.config.username
      ? text.toLowerCase().includes(`@${this.config.username.toLowerCase()}`)
      : false;

    // Check if replying to bot
    const replyToMessage = (msg as Message.TextMessage).reply_to_message;
    const isReplyToBot =
      replyToMessage?.from?.username?.toLowerCase() ===
      this.config.username?.toLowerCase();

    const context: TelegramMessageContext = {
      messageId: msg.message_id,
      chatId: chat.id,
      chatType: chat.type as TelegramMessageContext["chatType"],
      chatTitle: "title" in chat ? chat.title : undefined,
      userId: from.id,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      mentioned,
      isReplyToBot,
    };

    // Add photos if present
    const photoMsg = msg as Message.PhotoMessage;
    if (photoMsg.photo) {
      context.photos = photoMsg.photo.map((p) => ({
        fileId: p.file_id,
        fileUniqueId: p.file_unique_id,
        width: p.width,
        height: p.height,
        fileSize: p.file_size,
      }));
    }

    // Add voice if present
    const voiceMsg = msg as Message.VoiceMessage;
    if (voiceMsg.voice) {
      context.voice = {
        fileId: voiceMsg.voice.file_id,
        fileUniqueId: voiceMsg.voice.file_unique_id,
        duration: voiceMsg.voice.duration,
        mimeType: voiceMsg.voice.mime_type,
        fileSize: voiceMsg.voice.file_size,
      };
    }

    // Add reply context
    if (replyToMessage) {
      context.replyTo = {
        messageId: replyToMessage.message_id,
        text: (replyToMessage as Message.TextMessage).text,
        userId: replyToMessage.from?.id || 0,
      };
    }

    return context;
  }

  /**
   * Check if we should respond to this message
   */
  private shouldRespond(
    context: TelegramMessageContext,
    _text: string,
  ): boolean {
    // Check chat allowlist
    if (
      this.config.allowedChats?.length &&
      !this.config.allowedChats.includes(context.chatId)
    ) {
      return false;
    }

    // Check user allowlist
    if (
      this.config.allowedUsers?.length &&
      !this.config.allowedUsers.includes(context.userId)
    ) {
      return false;
    }

    // Check group settings
    if (context.chatType !== "private") {
      if (!this.config.allowGroups) {
        return false;
      }
      if (this.config.requireMentionInGroups) {
        // Only respond if mentioned or replied to
        if (!context.mentioned && !context.isReplyToBot) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Set bot commands for Telegram menu
   */
  private async setMyCommands(): Promise<void> {
    const commands = Array.from(this.commands.values()).map((cmd) => ({
      command: cmd.command,
      description: cmd.description,
    }));

    if (commands.length > 0) {
      await this.bot.telegram.setMyCommands(commands);
      this.log(`Set ${commands.length} commands in Telegram menu`);
    }
  }

  /**
   * Split response into chunks for Telegram's 4096 character limit
   */
  private splitResponse(response: string): string[] {
    const maxLength = this.config.maxResponseLength || 4096;

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

      // Find a good break point
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

  /**
   * Escape special characters for MarkdownV2
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Telegram Bot] ${message}`);
    }
  }
}

/**
 * Create a Telegram bot instance
 */
export function createTelegramBot(
  config: TelegramBotConfig,
): DeepTreeEchoTelegramBot {
  return new DeepTreeEchoTelegramBot(config);
}

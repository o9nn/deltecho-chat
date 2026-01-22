/**
 * @deltecho/integrations - Telegram Bot
 *
 * Telegram integration for Deep Tree Echo using Telegram Bot API
 * Uses native fetch for API calls (no external dependencies)
 */

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
import type {
  TelegramConfig,
  TelegramMessage,
  TelegramCallbackQuery,
  TelegramInlineKeyboard,
  TelegramCommand,
} from "./types.js";
import { DEFAULT_TELEGRAM_CONFIG } from "./types.js";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

/**
 * Telegram bot integration for Deep Tree Echo
 *
 * Provides Telegram functionality including:
 * - Long polling or webhook updates
 * - Text message handling
 * - Command processing
 * - Inline keyboards
 * - Callback query handling
 */
export class TelegramBot implements IPlatformIntegration {
  readonly platform = "telegram" as const;

  private config: TelegramConfig;
  private cognitive: CognitiveOrchestrator | null = null;
  private commands: Map<string, BotCommand> = new Map();
  private eventListeners: Map<PlatformEventType, Set<PlatformEventListener>> =
    new Map();
  private stats: PlatformStats;
  private startTime: Date | null = null;
  private pollingActive = false;
  private pollingOffset = 0;
  private abortController: AbortController | null = null;
  private botInfo: { id: number; username: string; first_name: string } | null =
    null;

  constructor(config: TelegramConfig) {
    this.config = { ...DEFAULT_TELEGRAM_CONFIG, ...config };

    // Initialize stats
    this.stats = {
      platform: "telegram",
      messagesReceived: 0,
      messagesSent: 0,
      commandsProcessed: 0,
      errors: 0,
      uptime: 0,
    };

    this.registerDefaultCommands();
  }

  /**
   * Check if bot is connected
   */
  get isConnected(): boolean {
    return this.pollingActive || !!this.config.webhookUrl;
  }

  /**
   * Set the cognitive orchestrator for AI responses
   */
  setCognitiveOrchestrator(cognitive: CognitiveOrchestrator): void {
    this.cognitive = cognitive;
  }

  /**
   * Start the Telegram bot
   */
  async start(): Promise<void> {
    this.startTime = new Date();

    // Get bot info
    const botInfoResult = await this.apiCall<{
      id: number;
      is_bot: boolean;
      first_name: string;
      username: string;
    }>("getMe");

    if (botInfoResult.ok) {
      this.botInfo = botInfoResult.result;
      this.log(`Logged in as @${this.botInfo.username}`);
    }

    // Set commands
    await this.setCommands();

    // Start polling or webhook
    if (this.config.webhookUrl) {
      await this.setWebhook();
    } else {
      await this.deleteWebhook();
      this.startPolling();
    }

    this.emit("ready", { user: this.botInfo });
    this.log("Telegram bot started");
  }

  /**
   * Stop the Telegram bot
   */
  async stop(): Promise<void> {
    this.pollingActive = false;
    this.abortController?.abort();

    if (this.config.webhookUrl) {
      await this.deleteWebhook();
    }

    this.startTime = null;
    this.log("Telegram bot stopped");
  }

  /**
   * Send a message to a Telegram chat
   */
  async sendMessage(
    chatId: string,
    response: PlatformResponse,
  ): Promise<string> {
    let text = response.content;

    // Truncate if necessary
    if (text.length > (this.config.maxMessageLength || 4096)) {
      text = text.slice(0, 4093) + "...";
    }

    const params: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: this.config.parseMode,
      disable_web_page_preview: this.config.disableLinkPreview,
      disable_notification: this.config.disableNotification,
    };

    if (response.replyTo) {
      params.reply_to_message_id = parseInt(response.replyTo, 10);
    }

    // Convert embed to inline keyboard if present
    if (response.embed?.fields) {
      const keyboard: TelegramInlineKeyboard = {
        inline_keyboard: [],
      };

      // Add fields as buttons if they look like actions
      response.embed.fields.forEach((field) => {
        if (field.name.startsWith("🔗")) {
          keyboard.inline_keyboard.push([
            {
              text: field.value,
              callback_data: `action:${field.name}`,
            },
          ]);
        }
      });

      if (keyboard.inline_keyboard.length > 0) {
        params.reply_markup = JSON.stringify(keyboard);
      }
    }

    const result = await this.apiCall<TelegramMessage>("sendMessage", params);

    if (result.ok) {
      this.stats.messagesSent++;
      return result.result.message_id.toString();
    }

    throw new Error(result.description || "Failed to send message");
  }

  /**
   * Register a command
   */
  registerCommand(command: BotCommand): void {
    this.commands.set(command.name, command);
    command.aliases?.forEach((alias) => {
      this.commands.set(alias, command);
    });
    this.log(`Registered command: /${command.name}`);
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
   * Handle incoming webhook update
   * Call this from your webhook endpoint
   */
  async handleWebhookUpdate(update: TelegramUpdate): Promise<void> {
    await this.processUpdate(update);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────

  private async apiCall<T>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<TelegramApiResponse<T>> {
    const url = `${TELEGRAM_API_BASE}${this.config.token}/${method}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: params ? JSON.stringify(params) : undefined,
      });

      return (await response.json()) as TelegramApiResponse<T>;
    } catch (error) {
      this.stats.errors++;
      return {
        ok: false,
        description: (error as Error).message,
      } as TelegramApiResponse<T>;
    }
  }

  private async setWebhook(): Promise<void> {
    if (!this.config.webhookUrl) return;

    const params: Record<string, unknown> = {
      url: this.config.webhookUrl,
    };

    if (this.config.webhookSecret) {
      params.secret_token = this.config.webhookSecret;
    }

    const result = await this.apiCall("setWebhook", params);

    if (result.ok) {
      this.log(`Webhook set to ${this.config.webhookUrl}`);
    } else {
      this.log(`Failed to set webhook: ${result.description}`, "error");
    }
  }

  private async deleteWebhook(): Promise<void> {
    await this.apiCall("deleteWebhook", { drop_pending_updates: true });
  }

  private async setCommands(): Promise<void> {
    const commands = Array.from(new Set(this.commands.values())).map((cmd) => ({
      command: cmd.name,
      description: cmd.description,
    }));

    await this.apiCall("setMyCommands", { commands });
  }

  private startPolling(): void {
    this.pollingActive = true;
    this.abortController = new AbortController();
    this.poll();
  }

  private async poll(): Promise<void> {
    while (this.pollingActive) {
      try {
        const result = await this.apiCall<TelegramUpdate[]>("getUpdates", {
          offset: this.pollingOffset,
          timeout: 30,
          allowed_updates: ["message", "callback_query", "inline_query"],
        });

        if (result.ok && result.result.length > 0) {
          for (const update of result.result) {
            this.pollingOffset = update.update_id + 1;
            await this.processUpdate(update);
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          this.stats.errors++;
          this.log(`Polling error: ${(error as Error).message}`, "error");
          // Wait before retrying
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
  }

  private async processUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    // Ignore bot messages
    if (message.from?.is_bot) return;

    // Check chat permissions
    if (!this.isChatAllowed(message.chat.id)) return;

    this.stats.messagesReceived++;
    this.stats.lastActivity = new Date();

    // Convert to platform message
    const platformMessage = this.toPlatformMessage(message);

    // Emit message event
    this.emit("message", platformMessage);

    const text = message.text || message.caption || "";
    const prefix = this.config.commandPrefix || "/";

    // Check for commands
    if (text.startsWith(prefix)) {
      await this.handleCommand(message, platformMessage, text, prefix);
      return;
    }

    // Handle regular messages with cognitive response
    await this.handleCognitiveResponse(message, platformMessage);
  }

  private async handleCommand(
    message: TelegramMessage,
    platformMessage: PlatformMessage,
    text: string,
    prefix: string,
  ): Promise<void> {
    // Parse command (handle @botname suffix)
    const commandText = text.slice(prefix.length).split("@")[0];
    const args = commandText.trim().split(/\s+/);
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
        return this.sendMessage(message.chat.id.toString(), {
          ...resp,
          replyTo: message.message_id.toString(),
        });
      },
    };

    try {
      const response = await command.execute(context);
      if (response) {
        await this.sendMessage(message.chat.id.toString(), {
          ...response,
          replyTo: message.message_id.toString(),
        });
      }
    } catch (error) {
      this.stats.errors++;
      const err = error as Error;
      await this.sendMessage(message.chat.id.toString(), {
        content: `❌ Error: ${err.message}`,
        replyTo: message.message_id.toString(),
      });
      this.log(`Command error: ${err.message}`, "error");
    }
  }

  private async handleCallbackQuery(
    query: TelegramCallbackQuery,
  ): Promise<void> {
    this.emit("reaction", {
      id: query.id,
      data: query.data,
      from: query.from,
    });

    // Acknowledge the callback
    await this.apiCall("answerCallbackQuery", {
      callback_query_id: query.id,
    });

    // Handle specific callbacks
    if (query.data?.startsWith("action:")) {
      const action = query.data.slice(7);
      this.log(`Callback action: ${action}`);
      // Implement action handling as needed
    }
  }

  private async handleCognitiveResponse(
    message: TelegramMessage,
    platformMessage: PlatformMessage,
  ): Promise<void> {
    if (!this.cognitive) {
      await this.sendMessage(message.chat.id.toString(), {
        content: "🤖 Cognitive system not initialized yet.",
        replyTo: message.message_id.toString(),
      });
      return;
    }

    try {
      // Send typing action
      await this.apiCall("sendChatAction", {
        chat_id: message.chat.id,
        action: "typing",
      });

      const content = message.text || message.caption || "Hello!";

      // Process through cognitive orchestrator
      const result = await this.cognitive.processMessage(content, {
        chatId: message.chat.id,
      });

      // Send response
      if (result.response) {
        await this.sendMessage(message.chat.id.toString(), {
          content: result.response.content,
          replyTo: message.message_id.toString(),
        });
      }
    } catch (error) {
      this.stats.errors++;
      const err = error as Error;
      await this.sendMessage(message.chat.id.toString(), {
        content: `❌ I encountered an error: ${err.message}`,
        replyTo: message.message_id.toString(),
      });
      this.log(`Cognitive error: ${err.message}`, "error");
    }
  }

  private toPlatformMessage(message: TelegramMessage): PlatformMessage {
    const chatType =
      message.chat.type === "private"
        ? "dm"
        : message.chat.type === "group" || message.chat.type === "supergroup"
          ? "group"
          : "channel";

    return {
      id: message.message_id.toString(),
      platform: "telegram",
      content: message.text || message.caption || "",
      author: {
        id: message.from?.id.toString() || "unknown",
        username: message.from?.username || "unknown",
        displayName:
          (message.from?.first_name || "") +
            (message.from?.last_name ? ` ${message.from.last_name}` : "") ||
          "Unknown",
        isBot: message.from?.is_bot,
      },
      channel: {
        id: message.chat.id.toString(),
        name:
          message.chat.title ||
          message.chat.username ||
          message.chat.first_name,
        type: chatType,
      },
      timestamp: new Date(message.date * 1000),
      attachments: this.extractAttachments(message),
      replyTo: message.reply_to_message?.message_id?.toString(),
      raw: message,
    };
  }

  private extractAttachments(message: TelegramMessage) {
    const attachments = [];

    if (message.photo && message.photo.length > 0) {
      // Get the largest photo
      const photo = message.photo[message.photo.length - 1];
      attachments.push({
        id: photo.file_id,
        type: "image" as const,
        url: "", // Would need to call getFile to get URL
        size: photo.file_size,
      });
    }

    if (message.audio) {
      attachments.push({
        id: message.audio.file_id,
        type: "audio" as const,
        url: "",
        filename: message.audio.file_name,
        size: message.audio.file_size,
        mimeType: message.audio.mime_type,
      });
    }

    if (message.voice) {
      attachments.push({
        id: message.voice.file_id,
        type: "audio" as const,
        url: "",
        size: message.voice.file_size,
        mimeType: message.voice.mime_type,
      });
    }

    if (message.video) {
      attachments.push({
        id: message.video.file_id,
        type: "video" as const,
        url: "",
        filename: message.video.file_name,
        size: message.video.file_size,
        mimeType: message.video.mime_type,
      });
    }

    if (message.document) {
      attachments.push({
        id: message.document.file_id,
        type: "file" as const,
        url: "",
        filename: message.document.file_name,
        size: message.document.file_size,
        mimeType: message.document.mime_type,
      });
    }

    return attachments;
  }

  private isChatAllowed(chatId: number): boolean {
    if (!this.config.allowedChatIds?.length) return true;
    return this.config.allowedChatIds.includes(chatId);
  }

  private registerDefaultCommands(): void {
    // Start command
    this.registerCommand({
      name: "start",
      description: "Start the bot",
      execute: async ( _ctx) => {
        return {
          content: `🌳 <b>Welcome to Deep Tree Echo!</b>\n\nI'm an AI assistant powered by cognitive architecture. You can chat with me directly or use commands.\n\nUse /help to see available commands.`,
        };
      },
    });

    // Help command
    this.registerCommand({
      name: "help",
      description: "Show available commands",
      aliases: ["h"],
      execute: async () => {
        const commands = Array.from(new Set(this.commands.values()));

        let text = "🌳 <b>Deep Tree Echo Commands</b>\n\n";
        commands.forEach((cmd) => {
          text += `/${cmd.name} - ${cmd.description}\n`;
        });

        return { content: text };
      },
    });

    // Status command
    this.registerCommand({
      name: "status",
      description: "Show bot status",
      execute: async () => {
        const stats = this.getStats();
        const uptime = Math.floor(stats.uptime / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;

        return {
          content:
            `📊 <b>Deep Tree Echo Status</b>\n\n` +
            `📨 Messages Received: ${stats.messagesReceived}\n` +
            `📤 Messages Sent: ${stats.messagesSent}\n` +
            `⚡ Commands Processed: ${stats.commandsProcessed}\n` +
            `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
            `❌ Errors: ${stats.errors}`,
        };
      },
    });

    // Ask command
    this.registerCommand({
      name: "ask",
      description: "Ask a question",
      usage: "/ask <question>",
      execute: async (ctx) => {
        if (ctx.args.length === 0) {
          return {
            content: "Please provide a question. Usage: /ask <question>",
          };
        }

        if (!this.cognitive) {
          return { content: "🤖 Cognitive system not initialized yet." };
        }

        const question = ctx.args.join(" ");

        const result = await this.cognitive.processMessage(question, {
          chatId: parseInt(ctx.message.channel.id, 10) || 0,
        });

        return { content: result.response?.content || "I have no response." };
      },
    });
  }

  private emit<T>(event: PlatformEventType, data: T): void {
    const platformEvent: PlatformEvent<T> = {
      type: event,
      platform: "telegram",
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
      const prefix = `[Telegram Bot]`;
      if (level === "error") {
        console.error(`${prefix} ${message}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types
// ─────────────────────────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

/**
 * Create a new Telegram bot instance
 */
export function createTelegramBot(config: TelegramConfig): TelegramBot {
  return new TelegramBot(config);
}

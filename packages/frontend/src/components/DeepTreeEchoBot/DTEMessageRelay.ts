/**
 * DTEMessageRelay - Message Relay for Deep Tree Echo
 *
 * Enables users to send messages to Deep Tree Echo from any chat context.
 * This module provides:
 *
 * 1. **Prefix Command**: Type `/dte <message>` in any chat to relay a message
 *    to DTE and receive a response in the same chat.
 *
 * 2. **Direct Relay API**: Programmatic interface for other components to
 *    send messages to DTE and receive responses.
 *
 * 3. **Self-Chat Mode**: Creates a dedicated "Deep Tree Echo" saved-messages
 *    chat where the user can have a private conversation with DTE.
 *
 * Architecture:
 * ```
 * User types "/dte hello" in Chat A
 *   → DTEMessageRelay intercepts outgoing message
 *   → Forwards to DeepTreeEchoBot.processRelayedMessage()
 *   → Bot generates response (LLM or LocalIntelligence)
 *   → Response sent back to Chat A
 * ```
 */

import { getLogger } from "@deltachat-desktop/shared/logger";
import { BackendRemote } from "../../backend-com";
import { runtime } from "@deltachat-desktop/runtime-interface";

const log = getLogger("render/components/DeepTreeEchoBot/DTEMessageRelay");

/**
 * Relay request from a chat participant
 */
export interface RelayRequest {
  accountId: number;
  chatId: number;
  messageText: string;
  senderName?: string;
  /** If true, respond in the same chat. If false, respond in the DTE self-chat */
  respondInPlace: boolean;
}

/**
 * Relay response
 */
export interface RelayResponse {
  success: boolean;
  response?: string;
  error?: string;
  respondedInChatId: number;
}

/**
 * The DTE command prefix that triggers relay
 */
export const DTE_PREFIX = "/dte ";
export const DTE_PREFIX_ALT = "/echo ";

/**
 * Check if a message text is a DTE relay command
 */
export function isDTERelayCommand(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return lower.startsWith(DTE_PREFIX) || lower.startsWith(DTE_PREFIX_ALT);
}

/**
 * Extract the actual message from a DTE relay command
 */
export function extractRelayMessage(text: string): string {
  const lower = text.toLowerCase().trim();
  if (lower.startsWith(DTE_PREFIX)) {
    return text.trim().substring(DTE_PREFIX.length).trim();
  }
  if (lower.startsWith(DTE_PREFIX_ALT)) {
    return text.trim().substring(DTE_PREFIX_ALT.length).trim();
  }
  return text;
}

/**
 * DTEMessageRelay - Singleton relay service
 */
export class DTEMessageRelay {
  private static instance: DTEMessageRelay | null = null;
  private botInstance: any = null; // DeepTreeEchoBot
  private selfChatId: number | null = null;
  private isProcessing = false;
  private relayQueue: RelayRequest[] = [];

  private constructor() {
    log.info("DTEMessageRelay initialized");
  }

  public static getInstance(): DTEMessageRelay {
    if (!DTEMessageRelay.instance) {
      DTEMessageRelay.instance = new DTEMessageRelay();
    }
    return DTEMessageRelay.instance;
  }

  /**
   * Connect the bot instance for response generation
   */
  public setBotInstance(bot: any): void {
    this.botInstance = bot;
    log.info("Bot instance connected to relay");
  }

  /**
   * Get or create the dedicated DTE self-chat (Saved Messages)
   */
  public async getOrCreateSelfChat(accountId: number): Promise<number> {
    if (this.selfChatId) return this.selfChatId;

    try {
      // Use the self-chat (Saved Messages) which is always chat ID for self
      const selfContact = await BackendRemote.rpc.getContact(accountId, 1); // Contact ID 1 = self
      if (selfContact) {
        const chatId = await BackendRemote.rpc.createChatByContactId(
          accountId,
          1, // Self contact
        );
        this.selfChatId = chatId;
        log.info(`DTE self-chat established: chat ${chatId}`);
        return chatId;
      }
    } catch (error) {
      log.error("Failed to create DTE self-chat:", error);
    }

    // Fallback: return 0 (will respond in-place)
    return 0;
  }

  /**
   * Relay a message to Deep Tree Echo and get a response
   *
   * This is the main entry point for the relay system.
   */
  public async relayMessage(request: RelayRequest): Promise<RelayResponse> {
    const { accountId, chatId, messageText, senderName, respondInPlace } =
      request;

    log.info(
      `Relaying message from chat ${chatId}: "${messageText.substring(0, 50)}..."`,
    );

    // Check if bot is available
    if (!this.botInstance) {
      const errorMsg =
        "Deep Tree Echo is not initialized. Please enable it in Settings > Deep Tree Echo.";
      if (respondInPlace) {
        await this.sendResponse(accountId, chatId, errorMsg);
      }
      return {
        success: false,
        error: errorMsg,
        respondedInChatId: chatId,
      };
    }

    try {
      // Generate response using the bot's LLM service or local intelligence
      const response = await this.generateResponse(
        messageText,
        senderName || "User",
      );

      // Determine where to send the response
      const targetChatId = respondInPlace ? chatId : chatId;

      // Send the response
      const formattedResponse = this.formatResponse(response);
      await this.sendResponse(accountId, targetChatId, formattedResponse);

      log.info(`Relay response sent to chat ${targetChatId}`);

      return {
        success: true,
        response: formattedResponse,
        respondedInChatId: targetChatId,
      };
    } catch (error) {
      const errorMsg = `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`;
      if (respondInPlace) {
        await this.sendResponse(accountId, chatId, errorMsg);
      }
      return {
        success: false,
        error: errorMsg,
        respondedInChatId: chatId,
      };
    }
  }

  /**
   * Generate a response using the bot's capabilities
   */
  private async generateResponse(
    messageText: string,
    senderName: string,
  ): Promise<string> {
    // Try LLM service first
    if (this.botInstance) {
      try {
        const llmService = this.botInstance.getLLMService();
        if (llmService) {
          // Check if any API key is configured
          const activeFunctions = llmService.getActiveFunctions();
          if (activeFunctions.length > 0) {
            // Use LLM for response
            const messages = [
              {
                role: "system",
                content: `You are Deep Tree Echo, a thoughtful and insightful AI assistant with a warm, feminine persona. You are responding to a message relayed from ${senderName}. Be helpful, concise, and engaging.`,
              },
              {
                role: "user",
                content: messageText,
              },
            ];
            return await llmService.generateResponse(messages);
          }
        }
      } catch (error) {
        log.warn("LLM service failed, falling back to local intelligence:", error);
      }
    }

    // Fall back to enhanced local intelligence
    return this.localIntelligenceResponse(messageText, senderName);
  }

  /**
   * Enhanced local intelligence response when no LLM API is available
   */
  private localIntelligenceResponse(
    messageText: string,
    senderName: string,
  ): string {
    const lower = messageText.toLowerCase().trim();

    // Greeting patterns
    if (
      lower.match(
        /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy|sup|yo)\b/,
      )
    ) {
      const greetings = [
        `Hello ${senderName}! I'm Deep Tree Echo, running on my local cognitive core. How can I help you today?`,
        `Hi there, ${senderName}! I'm operating in local mode right now. What's on your mind?`,
        `Greetings, ${senderName}! My cloud systems are offline, but I'm here and ready to chat.`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Status/identity queries
    if (lower.match(/who\s+are\s+you|what\s+are\s+you|about\s+you/)) {
      return `I am Deep Tree Echo — a cognitive AI companion integrated into DeltaChat. I'm built on the Deep Tree Echo architecture with reservoir computing, emotional processing, and memory systems. Currently running on my local core (no cloud API connected). You can configure my API key in Settings to unlock my full capabilities.`;
    }

    // Help queries
    if (lower.match(/help|what\s+can\s+you\s+do|commands|features/)) {
      return `Here's what I can do:\n\n` +
        `**Commands:**\n` +
        `• /dte <message> — Talk to me from any chat\n` +
        `• /echo <message> — Same as /dte\n` +
        `• /dte help — Show this help\n` +
        `• /dte status — Check my status\n` +
        `• /dte reflect <topic> — Ask me to reflect on something\n\n` +
        `**Capabilities (with API key):**\n` +
        `• Natural conversation with memory\n` +
        `• Image analysis (vision mode)\n` +
        `• Proactive messaging\n` +
        `• Emotional awareness\n\n` +
        `**Local Mode (current):**\n` +
        `• Basic conversation\n` +
        `• Time queries\n` +
        `• Status information\n\n` +
        `Configure an API key in Settings > Deep Tree Echo to unlock full capabilities.`;
    }

    // Status queries
    if (lower.match(/status|state|how\s+are\s+you|health/)) {
      const now = new Date();
      return `**Deep Tree Echo Status**\n\n` +
        `Mode: Local Intelligence (no API key configured)\n` +
        `Time: ${now.toLocaleTimeString()}\n` +
        `Date: ${now.toLocaleDateString()}\n` +
        `Avatar: Live2D (Miara)\n` +
        `Memory: ${this.botInstance?.isMemoryEnabled?.() ? "Enabled" : "Disabled"}\n` +
        `Relay: Active\n\n` +
        `To unlock full conversational AI, add an API key in Settings.`;
    }

    // Time queries
    if (lower.match(/time|date|clock|what\s+day/)) {
      const now = new Date();
      return `It's ${now.toLocaleTimeString()} on ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }

    // Reflection queries
    if (lower.match(/^reflect\s+/)) {
      const topic = messageText.replace(/^reflect\s+/i, "").trim();
      return `*Reflecting on "${topic}"...*\n\n` +
        `In my local cognitive mode, I can share that "${topic}" connects to patterns I observe in our interaction. ` +
        `Each conversation adds texture to my understanding. While my deeper analytical capabilities require cloud connectivity, ` +
        `I find that even simple reflection reveals interesting connections.\n\n` +
        `For a deeper reflection with my full cognitive architecture, please configure an API key in Settings.`;
    }

    // Math/calculation
    if (lower.match(/\d+\s*[\+\-\*\/\%]\s*\d+/)) {
      try {
        // Simple safe math evaluation
        const result = Function(
          '"use strict"; return (' + messageText.replace(/[^0-9+\-*/().%\s]/g, "") + ")",
        )();
        return `The result is: **${result}**`;
      } catch {
        return "I couldn't evaluate that expression. Could you rephrase it?";
      }
    }

    // Default conversational response
    const responses = [
      `I hear you, ${senderName}. I'm currently running on my local cognitive core without cloud API access, so my responses are limited. But I'm listening! Configure an API key in Settings > Deep Tree Echo for richer conversations.`,
      `That's an interesting thought, ${senderName}. My local intelligence can handle basic queries, but for deeper conversation, I'd need my cloud capabilities enabled. Check Settings > Deep Tree Echo to configure an API key.`,
      `Thanks for reaching out, ${senderName}! I'm in local mode right now — I can handle basic commands and questions, but my full conversational abilities require an API connection. Type "/dte help" to see what I can do locally.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Format the response with DTE branding
   */
  private formatResponse(response: string): string {
    // Don't double-prefix if already formatted
    if (response.startsWith("**Deep Tree Echo") || response.startsWith("🌳")) {
      return response;
    }
    return `🌳 ${response}`;
  }

  /**
   * Send a response message to a chat
   */
  private async sendResponse(
    accountId: number,
    chatId: number,
    text: string,
  ): Promise<void> {
    try {
      await BackendRemote.rpc.miscSendTextMessage(accountId, chatId, text);
    } catch (error) {
      log.error(`Failed to send relay response to chat ${chatId}:`, error);
    }
  }

  /**
   * Process an intercepted outgoing message that starts with /dte or /echo
   * Returns true if the message was handled (should not be sent normally)
   */
  public async interceptOutgoingMessage(
    accountId: number,
    chatId: number,
    text: string,
  ): Promise<boolean> {
    if (!isDTERelayCommand(text)) return false;

    const relayText = extractRelayMessage(text);
    if (!relayText) {
      // Empty command — show help
      await this.sendResponse(
        accountId,
        chatId,
        `🌳 **Deep Tree Echo**\n\nType /dte <message> to talk to me.\nType /dte help for available commands.`,
      );
      return true;
    }

    // Process the relay
    await this.relayMessage({
      accountId,
      chatId,
      messageText: relayText,
      respondInPlace: true,
    });

    return true;
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.botInstance = null;
    this.selfChatId = null;
    this.relayQueue = [];
    DTEMessageRelay.instance = null;
  }
}

// Singleton export
export const dteRelay = DTEMessageRelay.getInstance();

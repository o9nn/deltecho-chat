/**
 * Eventa event definitions for Discord bot
 *
 * These events can be used to integrate the Discord bot with
 * other parts of the Deep Tree Echo system
 */

import { defineEventa, defineInvokeEventa } from "@deltecho/eventa";
import type { BotState, DiscordMessageContext } from "./types.js";

// ============================================================================
// Message Events
// ============================================================================

/**
 * Event: Discord message received
 */
export const discordMessageReceived = defineEventa<{
  content: string;
  context: DiscordMessageContext;
}>("discord:message_received");

/**
 * Event: Discord message sent by bot
 */
export const discordMessageSent = defineEventa<{
  content: string;
  channelId: string;
  replyToMessageId?: string;
}>("discord:message_sent");

/**
 * Event: Discord command executed
 */
export const discordCommandExecuted = defineEventa<{
  command: string;
  userId: string;
  guildId: string | null;
  success: boolean;
}>("discord:command_executed");

// ============================================================================
// Voice Events
// ============================================================================

/**
 * Event: Bot joined voice channel
 */
export const discordVoiceJoined = defineEventa<{
  channelId: string;
  guildId: string;
}>("discord:voice_joined");

/**
 * Event: Bot left voice channel
 */
export const discordVoiceLeft = defineEventa<{
  channelId: string;
  guildId: string;
}>("discord:voice_left");

/**
 * Event: Audio data received from voice channel
 */
export const discordVoiceData = defineEventa<{
  userId: string;
  channelId: string;
  audioBuffer: ArrayBuffer;
}>("discord:voice_data");

// ============================================================================
// Status Events
// ============================================================================

/**
 * Event: Bot connected to Discord
 */
export const discordBotConnected = defineEventa<{
  username: string;
  guildCount: number;
}>("discord:bot_connected");

/**
 * Event: Bot disconnected from Discord
 */
export const discordBotDisconnected = defineEventa<{
  reason: string;
}>("discord:bot_disconnected");

/**
 * Event: Bot error occurred
 */
export const discordBotError = defineEventa<{
  error: string;
  context?: unknown;
}>("discord:bot_error");

// ============================================================================
// RPC Events (for cross-process communication)
// ============================================================================

/**
 * RPC: Get bot status
 */
export const getBotStatus = defineInvokeEventa<BotState, void>(
  "discord:rpc:get_status",
);

/**
 * RPC: Send message to channel
 */
export const sendMessage = defineInvokeEventa<
  { success: boolean; messageId?: string },
  { channelId: string; content: string }
>("discord:rpc:send_message");

/**
 * RPC: Process message with cognitive system
 */
export const processMessage = defineInvokeEventa<
  { response: string; processingTime: number },
  { content: string; context: DiscordMessageContext }
>("discord:rpc:process_message");

/**
 * RPC: Join voice channel
 */
export const joinVoiceChannel = defineInvokeEventa<
  { success: boolean; error?: string },
  { guildId: string; channelId: string }
>("discord:rpc:join_voice");

/**
 * RPC: Leave voice channel
 */
export const leaveVoiceChannel = defineInvokeEventa<
  { success: boolean },
  { guildId: string }
>("discord:rpc:leave_voice");

/**
 * RPC: Get memory for a user/channel
 */
export const getMemory = defineInvokeEventa<
  { memories: Array<{ content: string; timestamp: number }> },
  { userId?: string; channelId?: string; limit?: number }
>("discord:rpc:get_memory");

/**
 * RPC: Clear memory for a user/channel
 */
export const clearMemory = defineInvokeEventa<
  { cleared: boolean; count: number },
  { userId?: string; channelId?: string }
>("discord:rpc:clear_memory");

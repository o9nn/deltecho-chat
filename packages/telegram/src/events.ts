/**
 * Eventa event definitions for Telegram bot
 *
 * These events can be used to integrate the Telegram bot with
 * other parts of the Deep Tree Echo system
 */

import { defineEventa, defineInvokeEventa } from '@deltecho/eventa';
import type { BotState, TelegramMessageContext } from './types.js';

// ============================================================================
// Message Events
// ============================================================================

/**
 * Event: Telegram message received
 */
export const telegramMessageReceived = defineEventa<{
    content: string;
    context: TelegramMessageContext;
}>('telegram:message_received');

/**
 * Event: Telegram message sent by bot
 */
export const telegramMessageSent = defineEventa<{
    content: string;
    chatId: number;
    replyToMessageId?: number;
}>('telegram:message_sent');

/**
 * Event: Telegram command executed
 */
export const telegramCommandExecuted = defineEventa<{
    command: string;
    userId: number;
    chatId: number;
    success: boolean;
}>('telegram:command_executed');

// ============================================================================
// Media Events
// ============================================================================

/**
 * Event: Voice message received
 */
export const telegramVoiceReceived = defineEventa<{
    fileId: string;
    duration: number;
    context: TelegramMessageContext;
}>('telegram:voice_received');

/**
 * Event: Photo received
 */
export const telegramPhotoReceived = defineEventa<{
    fileId: string;
    width: number;
    height: number;
    context: TelegramMessageContext;
}>('telegram:photo_received');

/**
 * Event: Document received
 */
export const telegramDocumentReceived = defineEventa<{
    fileId: string;
    fileName?: string;
    mimeType?: string;
    context: TelegramMessageContext;
}>('telegram:document_received');

// ============================================================================
// Status Events
// ============================================================================

/**
 * Event: Bot started
 */
export const telegramBotStarted = defineEventa<{
    username: string;
    mode: 'polling' | 'webhook';
}>('telegram:bot_started');

/**
 * Event: Bot stopped
 */
export const telegramBotStopped = defineEventa<{
    reason: string;
}>('telegram:bot_stopped');

/**
 * Event: Bot error occurred
 */
export const telegramBotError = defineEventa<{
    error: string;
    context?: unknown;
}>('telegram:bot_error');

// ============================================================================
// RPC Events (for cross-process communication)
// ============================================================================

/**
 * RPC: Get bot status
 */
export const getBotStatus = defineInvokeEventa<BotState, void>('telegram:rpc:get_status');

/**
 * RPC: Send message to chat
 */
export const sendMessage = defineInvokeEventa<
    { success: boolean; messageId?: number },
    { chatId: number; content: string; replyToMessageId?: number }
>('telegram:rpc:send_message');

/**
 * RPC: Process message with cognitive system
 */
export const processMessage = defineInvokeEventa<
    { response: string; processingTime: number },
    { content: string; context: TelegramMessageContext }
>('telegram:rpc:process_message');

/**
 * RPC: Get memory for a user/chat
 */
export const getMemory = defineInvokeEventa<
    { memories: Array<{ content: string; timestamp: number }> },
    { userId?: number; chatId?: number; limit?: number }
>('telegram:rpc:get_memory');

/**
 * RPC: Clear memory for a user/chat
 */
export const clearMemory = defineInvokeEventa<
    { cleared: boolean; count: number },
    { userId?: number; chatId?: number }
>('telegram:rpc:clear_memory');

/**
 * RPC: Send photo to chat
 */
export const sendPhoto = defineInvokeEventa<
    { success: boolean; messageId?: number },
    { chatId: number; source: string; caption?: string }
>('telegram:rpc:send_photo');

/**
 * RPC: Send voice message to chat
 */
export const sendVoice = defineInvokeEventa<
    { success: boolean; messageId?: number },
    { chatId: number; source: string; caption?: string }
>('telegram:rpc:send_voice');

/**
 * RPC: Download file from Telegram
 */
export const downloadFile = defineInvokeEventa<
    { success: boolean; buffer?: ArrayBuffer; error?: string },
    { fileId: string }
>('telegram:rpc:download_file');

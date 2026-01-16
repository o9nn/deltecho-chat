/**
 * @deltecho/integrations - Telegram Types
 * 
 * Telegram-specific types and configurations
 */

import type { PlatformConfig, BotCommand } from '../types.js';

/**
 * Telegram-specific configuration
 */
export interface TelegramConfig extends PlatformConfig {
    /** Telegram bot token from @BotFather */
    token: string;
    /** Webhook URL for production (optional, uses polling if not set) */
    webhookUrl?: string;
    /** Webhook secret for verification */
    webhookSecret?: string;
    /** Webhook port (default: 8443) */
    webhookPort?: number;
    /** Enable inline mode */
    enableInlineMode?: boolean;
    /** Enable payments (requires payment provider) */
    enablePayments?: boolean;
    /** Allowed chat IDs (empty = all chats) */
    allowedChatIds?: number[];
    /** Admin user IDs */
    adminUserIds?: number[];
    /** Parse mode for messages */
    parseMode?: TelegramParseMode;
    /** Disable link previews by default */
    disableLinkPreview?: boolean;
    /** Disable notifications by default */
    disableNotification?: boolean;
}

/**
 * Telegram message parse modes
 */
export type TelegramParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

/**
 * Telegram chat types
 */
export type TelegramChatType = 'private' | 'group' | 'supergroup' | 'channel';

/**
 * Telegram keyboard types
 */
export interface TelegramInlineKeyboard {
    inline_keyboard: TelegramInlineButton[][];
}

export interface TelegramReplyKeyboard {
    keyboard: TelegramKeyboardButton[][];
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    input_field_placeholder?: string;
    selective?: boolean;
}

export interface TelegramInlineButton {
    text: string;
    url?: string;
    callback_data?: string;
    web_app?: { url: string };
    login_url?: {
        url: string;
        forward_text?: string;
        bot_username?: string;
        request_write_access?: boolean;
    };
    switch_inline_query?: string;
    switch_inline_query_current_chat?: string;
    pay?: boolean;
}

export interface TelegramKeyboardButton {
    text: string;
    request_user?: {
        request_id: number;
        user_is_bot?: boolean;
        user_is_premium?: boolean;
    };
    request_chat?: {
        request_id: number;
        chat_is_channel: boolean;
        chat_is_forum?: boolean;
    };
    request_contact?: boolean;
    request_location?: boolean;
    request_poll?: { type?: 'quiz' | 'regular' };
    web_app?: { url: string };
}

/**
 * Telegram command definition
 */
export interface TelegramCommand extends BotCommand {
    /** Command scope */
    scope?: TelegramCommandScope;
    /** Language code for localized commands */
    languageCode?: string;
}

/**
 * Command scope for Telegram
 */
export type TelegramCommandScope =
    | 'default'
    | 'all_private_chats'
    | 'all_group_chats'
    | 'all_chat_administrators'
    | { type: 'chat'; chat_id: number }
    | { type: 'chat_administrators'; chat_id: number }
    | { type: 'chat_member'; chat_id: number; user_id: number };

/**
 * Telegram user information
 */
export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

/**
 * Telegram chat information
 */
export interface TelegramChat {
    id: number;
    type: TelegramChatType;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_forum?: boolean;
}

/**
 * Telegram message information
 */
export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    caption?: string;
    reply_to_message?: TelegramMessage;
    photo?: TelegramPhotoSize[];
    audio?: TelegramAudio;
    voice?: TelegramVoice;
    video?: TelegramVideo;
    document?: TelegramDocument;
    sticker?: TelegramSticker;
}

/**
 * Telegram photo size
 */
export interface TelegramPhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}

/**
 * Telegram audio
 */
export interface TelegramAudio {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

/**
 * Telegram voice message
 */
export interface TelegramVoice {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
}

/**
 * Telegram video
 */
export interface TelegramVideo {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

/**
 * Telegram document
 */
export interface TelegramDocument {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

/**
 * Telegram sticker
 */
export interface TelegramSticker {
    file_id: string;
    file_unique_id: string;
    type: 'regular' | 'mask' | 'custom_emoji';
    width: number;
    height: number;
    is_animated: boolean;
    is_video: boolean;
    emoji?: string;
    set_name?: string;
}

/**
 * Telegram callback query (button clicks)
 */
export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    inline_message_id?: string;
    chat_instance: string;
    data?: string;
    game_short_name?: string;
}

/**
 * Telegram inline query
 */
export interface TelegramInlineQuery {
    id: string;
    from: TelegramUser;
    query: string;
    offset: string;
    chat_type?: TelegramChatType;
    location?: { latitude: number; longitude: number };
}

/**
 * Default Telegram configuration
 */
export const DEFAULT_TELEGRAM_CONFIG: Partial<TelegramConfig> = {
    debug: false,
    commandPrefix: '/',
    maxMessageLength: 4096,
    responseTimeout: 30000,
    parseMode: 'HTML',
    disableLinkPreview: false,
    disableNotification: false,
    enableInlineMode: false,
};

/**
 * Type definitions for the Telegram bot
 */

/**
 * Telegram bot configuration
 */
export interface TelegramBotConfig {
    /** Telegram bot token from @BotFather - required */
    token: string;
    /** Username of the bot (without @) */
    username?: string;
    /** Allowed chat IDs (empty = all chats) */
    allowedChats?: number[];
    /** Allowed user IDs (empty = all users) */
    allowedUsers?: number[];
    /** Whether to respond to group messages */
    allowGroups?: boolean;
    /** Whether to respond only when mentioned in groups */
    requireMentionInGroups?: boolean;
    /** Maximum message length for responses */
    maxResponseLength?: number;
    /** Webhook URL (for production, optional) */
    webhookUrl?: string;
    /** Webhook port (default: 3000) */
    webhookPort?: number;
    /** Debug mode */
    debug?: boolean;
}

/**
 * Message context passed to the cognitive system
 */
export interface TelegramMessageContext {
    /** Telegram message ID */
    messageId: number;
    /** Telegram chat ID */
    chatId: number;
    /** Chat type */
    chatType: 'private' | 'group' | 'supergroup' | 'channel';
    /** Chat title (for groups) */
    chatTitle?: string;
    /** User ID who sent the message */
    userId: number;
    /** Username (if available) */
    username?: string;
    /** First name */
    firstName: string;
    /** Last name (if available) */
    lastName?: string;
    /** Whether the bot was mentioned */
    mentioned: boolean;
    /** Whether this is a reply to the bot */
    isReplyToBot: boolean;
    /** Photos in the message */
    photos?: PhotoInfo[];
    /** Voice message info */
    voice?: VoiceInfo;
    /** Document info */
    document?: DocumentInfo;
    /** Replied to message (if any) */
    replyTo?: {
        messageId: number;
        text?: string;
        userId: number;
    };
}

/**
 * Photo information
 */
export interface PhotoInfo {
    fileId: string;
    fileUniqueId: string;
    width: number;
    height: number;
    fileSize?: number;
}

/**
 * Voice message information
 */
export interface VoiceInfo {
    fileId: string;
    fileUniqueId: string;
    duration: number;
    mimeType?: string;
    fileSize?: number;
}

/**
 * Document information
 */
export interface DocumentInfo {
    fileId: string;
    fileUniqueId: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
}

/**
 * Bot command definition
 */
export interface BotCommand {
    /** Command name (without /) */
    command: string;
    /** Command description */
    description: string;
    /** Handler function */
    handler: (ctx: CommandContext) => Promise<void>;
}

/**
 * Command context
 */
export interface CommandContext {
    /** Reply to the message */
    reply(text: string, options?: ReplyOptions): Promise<void>;
    /** Reply with markdown */
    replyWithMarkdown(text: string): Promise<void>;
    /** Reply with HTML */
    replyWithHTML(text: string): Promise<void>;
    /** Reply with photo */
    replyWithPhoto(source: string | Buffer, options?: ReplyOptions): Promise<void>;
    /** Reply with voice */
    replyWithVoice(source: string | Buffer, options?: ReplyOptions): Promise<void>;
    /** Get command arguments */
    args: string[];
    /** Full message text */
    text: string;
    /** Message context */
    message: TelegramMessageContext;
    /** Delete the command message */
    deleteMessage(): Promise<void>;
}

/**
 * Reply options
 */
export interface ReplyOptions {
    /** Reply to specific message */
    replyToMessageId?: number;
    /** Parse mode */
    parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    /** Disable link preview */
    disableLinkPreview?: boolean;
    /** Disable notification */
    disableNotification?: boolean;
}

/**
 * Bot state
 */
export interface BotState {
    /** Whether the bot is running */
    running: boolean;
    /** Uptime in milliseconds */
    uptime: number;
    /** Messages processed */
    messagesProcessed: number;
    /** Commands executed */
    commandsExecuted: number;
    /** Current chat count */
    activeChatCount: number;
}

/**
 * Bot event types
 */
export enum BotEventType {
    STARTED = 'bot:started',
    STOPPED = 'bot:stopped',
    MESSAGE_RECEIVED = 'bot:message_received',
    MESSAGE_SENT = 'bot:message_sent',
    COMMAND_EXECUTED = 'bot:command_executed',
    VOICE_RECEIVED = 'bot:voice_received',
    PHOTO_RECEIVED = 'bot:photo_received',
    ERROR = 'bot:error',
}

/**
 * Inline keyboard button
 */
export interface InlineButton {
    text: string;
    callbackData?: string;
    url?: string;
}

/**
 * Keyboard layout
 */
export type InlineKeyboard = InlineButton[][];

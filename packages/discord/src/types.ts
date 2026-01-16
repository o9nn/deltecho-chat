/**
 * Type definitions for the Discord bot
 */

/**
 * Discord bot configuration
 */
export interface DiscordBotConfig {
    /** Discord bot token - required */
    token: string;
    /** Application client ID */
    clientId: string;
    /** Guild ID for development (optional - for faster command registration) */
    guildId?: string;
    /** Channels the bot should respond to (empty = all channels) */
    allowedChannels?: string[];
    /** Users the bot should respond to (empty = all users) */
    allowedUsers?: string[];
    /** Prefix for text commands (default: !) */
    commandPrefix?: string;
    /** Whether to respond to direct messages */
    allowDMs?: boolean;
    /** Whether to respond when mentioned */
    respondToMentions?: boolean;
    /** Maximum message length for responses */
    maxResponseLength?: number;
    /** Debug mode */
    debug?: boolean;
}

/**
 * Message context passed to the cognitive system
 */
export interface DiscordMessageContext {
    /** Discord message ID */
    messageId: string;
    /** Discord channel ID */
    channelId: string;
    /** Discord guild ID (null for DMs) */
    guildId: string | null;
    /** User ID who sent the message */
    userId: string;
    /** Username */
    username: string;
    /** Display name */
    displayName: string;
    /** Whether the message is a DM */
    isDM: boolean;
    /** Whether the bot was mentioned */
    mentioned: boolean;
    /** Attachments in the message */
    attachments: AttachmentInfo[];
    /** Replied to message content (if any) */
    replyTo?: {
        messageId: string;
        content: string;
        userId: string;
    };
}

/**
 * Attachment information
 */
export interface AttachmentInfo {
    id: string;
    name: string;
    url: string;
    contentType: string | null;
    size: number;
}

/**
 * Bot command definition
 */
export interface BotCommand {
    /** Command name */
    name: string;
    /** Command description */
    description: string;
    /** Command options/arguments */
    options?: CommandOption[];
    /** Handler function */
    execute: (interaction: CommandInteraction) => Promise<void>;
}

/**
 * Command option
 */
export interface CommandOption {
    name: string;
    description: string;
    type: 'string' | 'integer' | 'boolean' | 'user' | 'channel' | 'role';
    required?: boolean;
    choices?: Array<{ name: string; value: string | number }>;
}

/**
 * Command interaction context
 */
export interface CommandInteraction {
    /** Reply to the interaction */
    reply(content: string | { content: string; ephemeral?: boolean }): Promise<void>;
    /** Defer the reply (for long-running commands) */
    deferReply(options?: { ephemeral?: boolean }): Promise<void>;
    /** Edit a deferred reply */
    editReply(content: string): Promise<void>;
    /** Follow up with additional message */
    followUp(content: string): Promise<void>;
    /** Get option value */
    getOption<T = string>(name: string): T | null;
    /** Get user who ran the command */
    user: { id: string; username: string };
    /** Channel where command was run */
    channelId: string;
    /** Guild where command was run (null for DMs) */
    guildId: string | null;
}

/**
 * Audio connection options
 */
export interface VoiceOptions {
    /** Whether to enable voice features */
    enabled?: boolean;
    /** Voice channel to join */
    channelId?: string;
    /** Self-deafen the bot */
    selfDeaf?: boolean;
    /** Self-mute the bot */
    selfMute?: boolean;
}

/**
 * Bot event types
 */
export enum BotEventType {
    READY = 'bot:ready',
    MESSAGE_RECEIVED = 'bot:message_received',
    MESSAGE_SENT = 'bot:message_sent',
    COMMAND_EXECUTED = 'bot:command_executed',
    VOICE_CONNECTED = 'bot:voice_connected',
    VOICE_DISCONNECTED = 'bot:voice_disconnected',
    ERROR = 'bot:error',
}

/**
 * Bot state
 */
export interface BotState {
    /** Whether the bot is connected */
    connected: boolean;
    /** Number of guilds the bot is in */
    guildCount: number;
    /** Uptime in milliseconds */
    uptime: number;
    /** Messages processed */
    messagesProcessed: number;
    /** Commands executed */
    commandsExecuted: number;
    /** Current voice connections */
    voiceConnections: number;
}

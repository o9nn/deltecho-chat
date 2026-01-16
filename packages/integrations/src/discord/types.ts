/**
 * @deltecho/integrations - Discord Types
 * 
 * Discord-specific types and configurations
 */

import type { PlatformConfig, BotCommand } from '../types.js';

/**
 * Discord-specific configuration
 */
export interface DiscordConfig extends PlatformConfig {
    /** Discord bot token */
    token: string;
    /** Client ID for OAuth2 */
    clientId?: string;
    /** Enable slash commands */
    enableSlashCommands?: boolean;
    /** Enable prefix commands (e.g., !help) */
    enablePrefixCommands?: boolean;
    /** Guild IDs for development (slash commands deploy instantly) */
    devGuildIds?: string[];
    /** Intents to request from Discord */
    intents?: DiscordIntentFlags[];
    /** Status message for the bot */
    status?: {
        type: 'playing' | 'watching' | 'listening' | 'competing';
        name: string;
    };
    /** Enable audio/voice features */
    enableVoice?: boolean;
    /** Allowed channel IDs (empty = all channels) */
    allowedChannels?: string[];
    /** Ignored channel IDs */
    ignoredChannels?: string[];
    /** Admin user IDs */
    adminUserIds?: string[];
}

/**
 * Discord Gateway Intent flags
 */
export type DiscordIntentFlags =
    | 'Guilds'
    | 'GuildMembers'
    | 'GuildModeration'
    | 'GuildEmojisAndStickers'
    | 'GuildIntegrations'
    | 'GuildWebhooks'
    | 'GuildInvites'
    | 'GuildVoiceStates'
    | 'GuildPresences'
    | 'GuildMessages'
    | 'GuildMessageReactions'
    | 'GuildMessageTyping'
    | 'DirectMessages'
    | 'DirectMessageReactions'
    | 'DirectMessageTyping'
    | 'MessageContent'
    | 'GuildScheduledEvents'
    | 'AutoModerationConfiguration'
    | 'AutoModerationExecution';

/**
 * Discord slash command definition
 */
export interface DiscordSlashCommand extends BotCommand {
    /** Slash command options */
    options?: DiscordCommandOption[];
    /** Default permissions required */
    defaultMemberPermissions?: string;
    /** Can be used in DMs */
    dmPermission?: boolean;
    /** Is NSFW */
    nsfw?: boolean;
}

/**
 * Discord command option types
 */
export interface DiscordCommandOption {
    name: string;
    description: string;
    type: DiscordOptionType;
    required?: boolean;
    choices?: Array<{
        name: string;
        value: string | number;
    }>;
    minValue?: number;
    maxValue?: number;
    minLength?: number;
    maxLength?: number;
    autocomplete?: boolean;
}

/**
 * Option types for slash commands
 */
export type DiscordOptionType =
    | 'string'
    | 'integer'
    | 'boolean'
    | 'user'
    | 'channel'
    | 'role'
    | 'mentionable'
    | 'number'
    | 'attachment';

/**
 * Discord embed colors
 */
export const DiscordColors = {
    PRIMARY: 0x5865f2,
    SUCCESS: 0x57f287,
    WARNING: 0xfee75c,
    ERROR: 0xed4245,
    INFO: 0x5865f2,
    DEEP_TREE_ECHO: 0x7289da, // Bot's signature color
} as const;

/**
 * Discord interaction types
 */
export type DiscordInteractionType =
    | 'ping'
    | 'applicationCommand'
    | 'messageComponent'
    | 'autocomplete'
    | 'modalSubmit';

/**
 * Discord message component types
 */
export interface DiscordButton {
    type: 'button';
    style: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
    label: string;
    customId?: string;
    url?: string;
    disabled?: boolean;
    emoji?: {
        name: string;
        id?: string;
        animated?: boolean;
    };
}

/**
 * Discord select menu
 */
export interface DiscordSelectMenu {
    type: 'selectMenu';
    customId: string;
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    options: Array<{
        label: string;
        value: string;
        description?: string;
        emoji?: {
            name: string;
            id?: string;
        };
        default?: boolean;
    }>;
}

/**
 * Discord action row containing components
 */
export interface DiscordActionRow {
    type: 'actionRow';
    components: (DiscordButton | DiscordSelectMenu)[];
}

/**
 * Discord modal dialog
 */
export interface DiscordModal {
    title: string;
    customId: string;
    components: DiscordTextInput[];
}

/**
 * Discord text input for modals
 */
export interface DiscordTextInput {
    type: 'textInput';
    customId: string;
    label: string;
    style: 'short' | 'paragraph';
    placeholder?: string;
    value?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
}

/**
 * Discord guild (server) information
 */
export interface DiscordGuildInfo {
    id: string;
    name: string;
    icon?: string;
    memberCount: number;
    ownerId: string;
    features: string[];
}

/**
 * Discord voice channel information
 */
export interface DiscordVoiceChannelInfo {
    id: string;
    name: string;
    guildId: string;
    bitrate: number;
    userLimit: number;
    rtcRegion?: string;
}

/**
 * Default Discord configuration
 */
export const DEFAULT_DISCORD_CONFIG: Partial<DiscordConfig> = {
    debug: false,
    commandPrefix: '!',
    maxMessageLength: 2000,
    responseTimeout: 30000,
    enableSlashCommands: true,
    enablePrefixCommands: true,
    enableVoice: false,
    intents: [
        'Guilds',
        'GuildMessages',
        'DirectMessages',
        'MessageContent',
    ],
};

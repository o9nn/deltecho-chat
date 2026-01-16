/**
 * @deltecho/integrations - Core Types
 * 
 * Shared types for all platform integrations (Discord, Telegram, WebGPU)
 */

/**
 * Base configuration for all platform integrations
 */
export interface PlatformConfig {
    /** Enable debug logging */
    debug?: boolean;
    /** Platform-specific prefix for commands */
    commandPrefix?: string;
    /** Maximum message length (platform-dependent) */
    maxMessageLength?: number;
    /** Timeout for LLM responses in milliseconds */
    responseTimeout?: number;
}

/**
 * Represents an incoming message from any platform
 */
export interface PlatformMessage {
    /** Unique message ID */
    id: string;
    /** Platform identifier (discord, telegram, etc.) */
    platform: 'discord' | 'telegram' | 'webgpu-local';
    /** Content of the message */
    content: string;
    /** Author information */
    author: {
        id: string;
        username: string;
        displayName?: string;
        isBot?: boolean;
    };
    /** Channel/chat information */
    channel: {
        id: string;
        name?: string;
        type: 'dm' | 'group' | 'guild' | 'channel';
    };
    /** Timestamp of the message */
    timestamp: Date;
    /** Optional attachments */
    attachments?: PlatformAttachment[];
    /** Optional reply reference */
    replyTo?: string;
    /** Raw platform-specific data */
    raw?: unknown;
}

/**
 * Attachment from platform message
 */
export interface PlatformAttachment {
    id: string;
    type: 'image' | 'audio' | 'video' | 'file';
    url: string;
    filename?: string;
    size?: number;
    mimeType?: string;
}

/**
 * Response to be sent to a platform
 */
export interface PlatformResponse {
    /** Text content to send */
    content: string;
    /** Optional embed data (platform-specific rendering) */
    embed?: PlatformEmbed;
    /** Optional attachments to include */
    attachments?: PlatformResponseAttachment[];
    /** Reply to specific message */
    replyTo?: string;
    /** Use ephemeral/private message if supported */
    ephemeral?: boolean;
}

/**
 * Rich embed for platform responses
 */
export interface PlatformEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    thumbnail?: string;
    image?: string;
    footer?: {
        text: string;
        iconUrl?: string;
    };
    timestamp?: Date;
}

/**
 * Attachment for responses
 */
export interface PlatformResponseAttachment {
    filename: string;
    data: Buffer | Blob | ArrayBuffer;
    mimeType?: string;
}

/**
 * Platform bot lifecycle events
 */
export type PlatformEventType =
    | 'ready'
    | 'connected'
    | 'disconnected'
    | 'error'
    | 'message'
    | 'command'
    | 'reaction'
    | 'typing';

/**
 * Event payload for platform events
 */
export interface PlatformEvent<T = unknown> {
    type: PlatformEventType;
    platform: 'discord' | 'telegram' | 'webgpu-local';
    timestamp: Date;
    data: T;
}

/**
 * Event listener function type
 */
export type PlatformEventListener<T = unknown> = (event: PlatformEvent<T>) => void | Promise<void>;

/**
 * Base interface for all platform integrations
 */
export interface IPlatformIntegration {
    /** Platform identifier */
    readonly platform: 'discord' | 'telegram' | 'webgpu-local';
    /** Current connection status */
    readonly isConnected: boolean;

    /** Start the integration */
    start(): Promise<void>;
    /** Stop the integration */
    stop(): Promise<void>;

    /** Send a message to a channel/chat */
    sendMessage(channelId: string, response: PlatformResponse): Promise<string>;

    /** Add event listener */
    on<T = unknown>(event: PlatformEventType, listener: PlatformEventListener<T>): void;
    /** Remove event listener */
    off<T = unknown>(event: PlatformEventType, listener: PlatformEventListener<T>): void;
}

/**
 * Command definition for bot commands
 */
export interface BotCommand {
    /** Command name (without prefix) */
    name: string;
    /** Command description */
    description: string;
    /** Command aliases */
    aliases?: string[];
    /** Usage example */
    usage?: string;
    /** Required arguments */
    args?: CommandArgument[];
    /** Handler function */
    execute: (ctx: CommandContext) => Promise<PlatformResponse | void>;
}

/**
 * Command argument definition
 */
export interface CommandArgument {
    name: string;
    description: string;
    required?: boolean;
    type: 'string' | 'number' | 'boolean' | 'user' | 'channel';
}

/**
 * Context passed to command handlers
 */
export interface CommandContext {
    /** Original platform message */
    message: PlatformMessage;
    /** Parsed command name */
    command: string;
    /** Parsed arguments */
    args: string[];
    /** Named arguments (if applicable) */
    namedArgs: Record<string, string | number | boolean>;
    /** Reply helper function */
    reply: (response: PlatformResponse | string) => Promise<string>;
}

/**
 * Statistics for platform integration
 */
export interface PlatformStats {
    platform: 'discord' | 'telegram' | 'webgpu-local';
    messagesReceived: number;
    messagesSent: number;
    commandsProcessed: number;
    errors: number;
    uptime: number;
    lastActivity?: Date;
}

/**
 * Voice connection state (for Discord voice channels)
 */
export interface VoiceState {
    connected: boolean;
    channelId?: string;
    guildId?: string;
    speaking?: boolean;
    selfMuted?: boolean;
    selfDeafened?: boolean;
}

/**
 * Audio input configuration for voice integrations
 */
export interface AudioInputConfig {
    /** Sample rate in Hz */
    sampleRate: number;
    /** Number of channels (1 = mono, 2 = stereo) */
    channels: 1 | 2;
    /** Bit depth */
    bitDepth: 16 | 24 | 32;
    /** Frame size for processing */
    frameSize?: number;
}

/**
 * Result from WebGPU inference
 */
export interface WebGPUInferenceResult {
    /** Generated text */
    text: string;
    /** Tokens generated */
    tokenCount: number;
    /** Generation time in milliseconds */
    generationTimeMs: number;
    /** Tokens per second */
    tokensPerSecond: number;
    /** Model used */
    model: string;
}

/**
 * WebGPU device capabilities
 */
export interface WebGPUCapabilities {
    supported: boolean;
    adapterName?: string;
    maxBufferSize?: number;
    maxComputeWorkgroupsPerDimension?: number;
    maxComputeInvocationsPerWorkgroup?: number;
    features: string[];
}

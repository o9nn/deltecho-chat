/**
 * @deltecho/integrations
 * 
 * Platform integrations for Deep Tree Echo
 * 
 * This package provides integrations with external platforms:
 * - Discord: Full-featured Discord bot with slash commands and voice support
 * - Telegram: Telegram bot with inline keyboards and long polling/webhooks
 * - WebGPU: Browser-native LLM inference using WebGPU
 * 
 * @example
 * ```typescript
 * import { createDiscordBot } from '@deltecho/integrations/discord';
 * import { createTelegramBot } from '@deltecho/integrations/telegram';
 * import { createWebGPUEngine } from '@deltecho/integrations/webgpu';
 * 
 * // Or import everything
 * import { DiscordBot, TelegramBot, WebGPUInferenceEngine } from '@deltecho/integrations';
 * ```
 */

// Core types
export type {
    PlatformConfig,
    PlatformMessage,
    PlatformAttachment,
    PlatformResponse,
    PlatformEmbed,
    PlatformResponseAttachment,
    PlatformEventType,
    PlatformEvent,
    PlatformEventListener,
    IPlatformIntegration,
    BotCommand,
    CommandArgument,
    CommandContext,
    PlatformStats,
    VoiceState,
    AudioInputConfig,
    WebGPUInferenceResult,
    WebGPUCapabilities,
} from './types.js';

// Discord exports
export { DiscordBot, createDiscordBot, DiscordColors, DEFAULT_DISCORD_CONFIG } from './discord/index.js';
export type {
    DiscordConfig,
    DiscordSlashCommand,
    DiscordCommandOption,
    DiscordOptionType,
    DiscordIntentFlags,
    DiscordButton,
    DiscordSelectMenu,
    DiscordActionRow,
    DiscordModal,
    DiscordTextInput,
    DiscordGuildInfo,
    DiscordVoiceChannelInfo,
} from './discord/index.js';

// Telegram exports
export { TelegramBot, createTelegramBot, DEFAULT_TELEGRAM_CONFIG } from './telegram/index.js';
export type {
    TelegramConfig,
    TelegramCommand,
    TelegramParseMode,
    TelegramChatType,
    TelegramInlineKeyboard,
    TelegramReplyKeyboard,
    TelegramInlineButton,
    TelegramKeyboardButton,
    TelegramCommandScope,
    TelegramUser,
    TelegramChat,
    TelegramMessage,
    TelegramCallbackQuery,
    TelegramInlineQuery,
} from './telegram/index.js';

// WebGPU exports
export { WebGPUInferenceEngine, createWebGPUEngine, DEFAULT_WEBGPU_CONFIG } from './webgpu/index.js';
export type {
    WebGPUConfig,
    WebGPUModelConfig,
    ModelType,
    TokenizerConfig,
    WebGPUDeviceInfo,
    WebGPULimits,
    ModelLoadProgress,
    ModelLoadCallback,
    ChatMessage,
    GenerationConfig,
    InferenceRequest,
    InferenceResult,
    MemoryUsage,
    WebGPUEngineEvent,
    WebGPUEngineEventListener,
    PromptTemplate,
} from './webgpu/index.js';

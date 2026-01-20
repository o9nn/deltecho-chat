/**
 * @deltecho/integrations/discord
 *
 * Discord integration exports
 */

export { DiscordBot, createDiscordBot } from "./discord-bot.js";
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
} from "./types.js";
export { DiscordColors, DEFAULT_DISCORD_CONFIG } from "./types.js";

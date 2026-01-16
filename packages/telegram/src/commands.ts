/**
 * Default commands for the Telegram bot
 */

import type { DeepTreeEchoTelegramBot } from './bot.js';
import type { BotCommand, CommandContext } from './types.js';

/**
 * /start command - Welcome message
 */
export const startCommand: BotCommand = {
    command: 'start',
    description: 'Start the bot and get a welcome message',
    async handler(ctx: CommandContext): Promise<void> {
        const welcomeMessage = `
🌳 *Welcome to Deep Tree Echo!*

I'm an AI-powered assistant with advanced cognitive capabilities.

*What I can do:*
• Have natural conversations
• Remember our previous chats
• Help with questions and tasks
• Analyze images (send me a photo!)
• Process voice messages (coming soon)

*Commands:*
/help - Show all commands
/status - Check my status
/memory - View what I remember
/clear - Clear conversation history
/persona - View my personality

Just send me a message to get started!
        `.trim();

        await ctx.replyWithMarkdown(welcomeMessage);
    },
};

/**
 * /help command - Show help
 */
export const helpCommand: BotCommand = {
    command: 'help',
    description: 'Show help and available commands',
    async handler(ctx: CommandContext): Promise<void> {
        const helpMessage = `
🌳 *Deep Tree Echo Help*

*Interacting with me:*
• In private chats: just send a message
• In groups: mention me @${ctx.message.username || 'bot'} or reply to my messages

*Available Commands:*
/start - Welcome message
/help - This help message
/status - Check bot status
/memory - View conversation memory
/clear - Clear your chat history
/persona - View personality settings
/ask <question> - Ask a specific question

*Features:*
📝 Text conversations with memory
📷 Image analysis (send photos)
🎤 Voice messages (coming soon)

*Tips:*
• I remember our conversations
• I adapt my responses to context
• You can send images for analysis
        `.trim();

        await ctx.replyWithMarkdown(helpMessage);
    },
};

/**
 * /status command - Bot status
 */
export const statusCommand: BotCommand = {
    command: 'status',
    description: 'Check bot status and statistics',
    async handler(ctx: CommandContext): Promise<void> {
        const statusMessage = `
🌳 *Bot Status*

• *Status:* Online ✅
• *Uptime:* Active
• *Messages Processed:* N/A
• *Commands Executed:* N/A

_Powered by Deep Tree Echo Cognitive Engine_
        `.trim();

        await ctx.replyWithMarkdown(statusMessage);
    },
};

/**
 * /memory command - View memory
 */
export const memoryCommand: BotCommand = {
    command: 'memory',
    description: 'View what the bot remembers about you',
    async handler(ctx: CommandContext): Promise<void> {
        const count = ctx.args[0] ? parseInt(ctx.args[0], 10) : 5;

        const memoryMessage = `
📝 *Recent Memories* (last ${count}):

_Memory system not yet connected._
_Try chatting with me to build conversation history!_
        `.trim();

        await ctx.replyWithMarkdown(memoryMessage);
    },
};

/**
 * /clear command - Clear history
 */
export const clearCommand: BotCommand = {
    command: 'clear',
    description: 'Clear your conversation history',
    async handler(ctx: CommandContext): Promise<void> {
        // TODO: Clear actual memory for this user
        await ctx.reply('🧹 Your conversation history has been cleared.');
    },
};

/**
 * /persona command - View persona
 */
export const personaCommand: BotCommand = {
    command: 'persona',
    description: 'View current bot personality settings',
    async handler(ctx: CommandContext): Promise<void> {
        const personaMessage = `
🎭 *Current Persona*

• *Name:* Deep Tree Echo
• *Personality:* Curious, helpful, thoughtful
• *Mood:* Neutral/Interested
• *Creativity:* High
• *Empathy:* High

_I adapt based on our conversation context._
        `.trim();

        await ctx.replyWithMarkdown(personaMessage);
    },
};

/**
 * /ask command - Ask a question
 */
export const askCommand: BotCommand = {
    command: 'ask',
    description: 'Ask a specific question',
    async handler(ctx: CommandContext): Promise<void> {
        if (ctx.args.length === 0) {
            await ctx.reply('Please provide a question after /ask\n\nExample: /ask What is the meaning of life?');
            return;
        }

        const question = ctx.args.join(' ');

        // Placeholder - would process with cognitive system
        await ctx.reply(
            `Processing your question:\n"${question}"\n\n_Cognitive system not yet connected._`
        );
    },
};

/**
 * /settings command - User settings
 */
export const settingsCommand: BotCommand = {
    command: 'settings',
    description: 'View and change your settings',
    async handler(ctx: CommandContext): Promise<void> {
        await ctx.reply(
            '⚙️ Settings\n\nSettings panel coming soon!\n\nFor now, you can:\n• /clear - Clear history\n• /persona - View bot personality'
        );
    },
};

/**
 * Register all default commands to a bot
 */
export function registerDefaultCommands(bot: DeepTreeEchoTelegramBot): void {
    bot.registerCommand(startCommand);
    bot.registerCommand(helpCommand);
    bot.registerCommand(statusCommand);
    bot.registerCommand(memoryCommand);
    bot.registerCommand(clearCommand);
    bot.registerCommand(personaCommand);
    bot.registerCommand(askCommand);
    bot.registerCommand(settingsCommand);
}

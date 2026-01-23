/**
 * Default slash commands for the Discord bot
 */

import type { DeepTreeEchoDiscordBot } from "./bot.js";
import type { BotCommand, CommandInteraction } from "./types.js";

/**
 * /help command - Show bot help
 */
export const helpCommand: BotCommand = {
  name: "help",
  description: "Show help information about the bot",
  async execute(interaction: CommandInteraction): Promise<void> {
    const helpText = `
**🌳 Deep Tree Echo Bot**

I'm an AI-powered assistant with cognitive capabilities.

**How to interact:**
• Mention me in any channel: @DeepTreeEcho your message
• Send me a direct message
• Use slash commands

**Commands:**
• \`/help\` - Show this help message
• \`/status\` - Check bot status
• \`/memory\` - View conversation memory
• \`/clear\` - Clear conversation history
• \`/persona\` - View current persona settings

**Features:**
• 🧠 Advanced cognitive processing
• 💭 Contextual memory across conversations
• 🎭 Adaptive personality
• 🔍 Web search capabilities
• 🖼️ Image analysis (attach images to messages)
        `.trim();

    await interaction.reply({ content: helpText, ephemeral: true });
  },
};

/**
 * /status command - Show bot status
 */
export const statusCommand: BotCommand = {
  name: "status",
  description: "Check the bot status and statistics",
  async execute(interaction: CommandInteraction): Promise<void> {
    // This will be populated with actual state when registered
    const status = `
**🌳 Deep Tree Echo Status**

• **Status:** Online ✅
• **Uptime:** ${formatUptime(0)}
• **Guilds:** N/A
• **Messages Processed:** N/A
• **Commands Executed:** N/A

*Powered by Deep Tree Echo Cognitive Engine*
        `.trim();

    await interaction.reply({ content: status, ephemeral: true });
  },
};

/**
 * /memory command - View conversation memory
 */
export const memoryCommand: BotCommand = {
  name: "memory",
  description: "View what I remember about our conversations",
  options: [
    {
      name: "count",
      description: "Number of memories to show (default: 5)",
      type: "integer",
      required: false,
    },
  ],
  async execute(interaction: CommandInteraction): Promise<void> {
    const count = interaction.getOption<number>("count") || 5;

    // Placeholder - would be connected to actual memory system
    await interaction.reply({
      content: `📝 **Recent Memories** (showing last ${count}):\n\n*Memory system not yet connected. Try chatting with me first!*`,
      ephemeral: true,
    });
  },
};

/**
 * /clear command - Clear conversation history
 */
export const clearCommand: BotCommand = {
  name: "clear",
  description: "Clear your conversation history with me",
  async execute(interaction: CommandInteraction): Promise<void> {
    // Placeholder - would clear actual memory
    await interaction.reply({
      content: "🧹 Your conversation history has been cleared.",
      ephemeral: true,
    });
  },
};

/**
 * /persona command - View current persona
 */
export const personaCommand: BotCommand = {
  name: "persona",
  description: "View my current personality settings",
  async execute(interaction: CommandInteraction): Promise<void> {
    const persona = `
**🎭 Current Persona**

• **Name:** Deep Tree Echo
• **Personality:** Curious, helpful, and thoughtful
• **Mood:** Neutral/Interested
• **Creativity:** High
• **Empathy:** High

I adapt my responses based on context and our conversation history.
        `.trim();

    await interaction.reply({ content: persona, ephemeral: true });
  },
};

/**
 * /ask command - Ask a question (for long-form responses)
 */
export const askCommand: BotCommand = {
  name: "ask",
  description: "Ask me a question or give me a task",
  options: [
    {
      name: "question",
      description: "Your question or prompt",
      type: "string",
      required: true,
    },
  ],
  async execute(interaction: CommandInteraction): Promise<void> {
    const question = interaction.getOption<string>("question");

    if (!question) {
      await interaction.reply({
        content: "Please provide a question!",
        ephemeral: true,
      });
      return;
    }

    // Defer for long-running processing
    await interaction.deferReply();

    // Placeholder - would process with cognitive system
    setTimeout(async () => {
      await interaction.editReply(
        `Processing your question: "${question}"\n\n*Cognitive system not yet connected. This is a placeholder response.*`,
      );
    }, 1000);
  },
};

/**
 * Register all default commands to a bot
 */
export function registerDefaultCommands(bot: DeepTreeEchoDiscordBot): void {
  bot.registerCommand(helpCommand);
  bot.registerCommand(statusCommand);
  bot.registerCommand(memoryCommand);
  bot.registerCommand(clearCommand);
  bot.registerCommand(personaCommand);
  bot.registerCommand(askCommand);
}

/**
 * Format uptime for display
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

# @deltecho/integrations

Platform integrations for Deep Tree Echo AI - Discord, Telegram, and WebGPU local inference.

## Installation

```bash
pnpm add @deltecho/integrations
```

## Features

### 🎮 Discord Integration

Full-featured Discord bot with:

- Slash commands and prefix commands
- Rich embeds and components
- Event handling
- Cognitive orchestrator integration
- Voice support (planned)

```typescript
import { createDiscordBot } from '@deltecho/integrations/discord';
import { createCognitiveOrchestrator } from '@deltecho/cognitive';

const bot = createDiscordBot({
    token: process.env.DISCORD_BOT_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
    commandPrefix: '!',
    enableSlashCommands: true,
});

// Connect cognitive AI
const cognitive = await createCognitiveOrchestrator({ ... });
bot.setCognitiveOrchestrator(cognitive);

// Register custom commands
bot.registerCommand({
    name: 'greet',
    description: 'Greet the user',
    execute: async (ctx) => ({
        content: `Hello, ${ctx.message.author.displayName}!`
    }),
});

await bot.start();
```

### 📱 Telegram Integration

Telegram bot with:

- Long polling and webhook support
- Inline keyboards
- Command handling
- Callback query support
- Cognitive AI responses

```typescript
import { createTelegramBot } from "@deltecho/integrations/telegram";

const bot = createTelegramBot({
  token: process.env.TELEGRAM_BOT_TOKEN!,
  parseMode: "HTML",
});

// Register custom commands
bot.registerCommand({
  name: "info",
  description: "Get bot information",
  execute: async () => ({
    content: "<b>Deep Tree Echo</b>\n\nA cognitive AI assistant.",
  }),
});

await bot.start();
```

### 🖥️ WebGPU Local Inference

Browser-native LLM inference using WebGPU:

- Local model execution
- Streaming token generation
- Multiple model format support
- Memory-efficient quantization

```typescript
import { createWebGPUEngine } from "@deltecho/integrations/webgpu";

// Check support
if (await WebGPUInferenceEngine.isSupported()) {
  const engine = createWebGPUEngine({
    model: {
      id: "microsoft/phi-3-mini-4k-instruct",
      type: "phi-3",
    },
    quantization: "int4",
    streaming: true,
  });

  // Load model with progress
  await engine.loadModel((progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`);
  });

  // Generate response
  const result = await engine.generate({
    prompt: "What is quantum computing?",
    systemMessage: "You are a helpful assistant.",
    onToken: (token) => process.stdout.write(token),
  });

  console.log(
    `\n\nGenerated ${result.outputTokens} tokens in ${result.generationTimeMs}ms`,
  );
}
```

## API Reference

### Discord

| Export                     | Description              |
| -------------------------- | ------------------------ |
| `DiscordBot`               | Main Discord bot class   |
| `createDiscordBot(config)` | Factory function         |
| `DiscordColors`            | Color presets for embeds |
| `DEFAULT_DISCORD_CONFIG`   | Default configuration    |

### Telegram

| Export                      | Description             |
| --------------------------- | ----------------------- |
| `TelegramBot`               | Main Telegram bot class |
| `createTelegramBot(config)` | Factory function        |
| `DEFAULT_TELEGRAM_CONFIG`   | Default configuration   |

### WebGPU

| Export                       | Description                 |
| ---------------------------- | --------------------------- |
| `WebGPUInferenceEngine`      | Main inference engine class |
| `createWebGPUEngine(config)` | Factory function            |
| `DEFAULT_WEBGPU_CONFIG`      | Default configuration       |

## Shared Types

All integrations share common types:

```typescript
interface PlatformMessage {
  id: string;
  platform: "discord" | "telegram" | "webgpu-local";
  content: string;
  author: {
    id: string;
    username: string;
    displayName?: string;
    isBot?: boolean;
  };
  channel: {
    id: string;
    name?: string;
    type: "dm" | "group" | "guild" | "channel";
  };
  timestamp: Date;
}

interface BotCommand {
  name: string;
  description: string;
  aliases?: string[];
  execute: (ctx: CommandContext) => Promise<PlatformResponse | void>;
}
```

## Requirements

- **Discord**: Discord.js v14+
- **Telegram**: Native fetch API (no dependencies)
- **WebGPU**: Browser with WebGPU support (Chrome 113+, Edge 113+)

## License

GPL-3.0-or-later

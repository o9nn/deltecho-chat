# Deep Tree Echo Integration Guide

This document provides instructions for integrating the Deep Tree Echo AI assistant into the DeltaChat desktop application.

## Overview

Deep Tree Echo is an advanced AI chatbot system that integrates seamlessly with DeltaChat. It features:

- Multi-API key architecture for parallel cognitive processing
- Advanced personality and emotional management
- Memory capabilities for contextual conversations
- Self-reflection and autonomous decision-making

## Integration Steps

### 1. Adding to Settings Page

Add the Deep Tree Echo settings screen to the DeltaChat settings page:

```jsx
// In your settings component (example)
import { DeepTreeEchoSettingsScreen } from '../../components/DeepTreeEchoBot'

// In your render method
return (
  <SettingsContainer>
    {/* Other settings sections */}

    {/* Deep Tree Echo Settings */}
    <DeepTreeEchoSettingsScreen />
  </SettingsContainer>
)
```

### 2. Initializing on Startup

The bot automatically initializes on import, but you can also explicitly initialize it in your application's startup sequence:

```jsx
// In your app initialization code
import { initDeepTreeEchoBot } from '../../components/DeepTreeEchoBot'

// Initialize the bot
initDeepTreeEchoBot()
```

### 3. Cleanup on Shutdown

When the application shuts down, make sure to clean up resources:

```jsx
// In your app shutdown code
import { cleanupBot } from '../../components/DeepTreeEchoBot'

// Clean up bot resources
cleanupBot()
```

### 4. Accessing the Bot Instance

You can access the bot instance from anywhere in your application:

```jsx
import { getBotInstance } from '../../components/DeepTreeEchoBot'

// Access the bot instance
const bot = getBotInstance()
if (bot && bot.isEnabled()) {
  // Bot is available and enabled
}
```

## Test and Demo Utilities

Deep Tree Echo comes with built-in utilities to help test and demonstrate its capabilities:

### Running a Complete Demo

```jsx
import { runDemo } from '../../components/DeepTreeEchoBot'

// Run a complete demo of the bot's features in a new group chat
async function startDemo() {
  const accounts = await BackendRemote.rpc.getAllAccounts()
  if (accounts.length > 0) {
    await runDemo(accounts[0])
  }
}
```

### Creating Test Groups

```jsx
import { createTestGroup } from '../../components/DeepTreeEchoBot'

// Create a test group with the bot
async function createBotGroup() {
  const accounts = await BackendRemote.rpc.getAllAccounts()
  if (accounts.length > 0) {
    const chatId = await createTestGroup(accounts[0], 'Deep Tree Echo Test', [
      contactId1,
      contactId2,
    ])
    console.log(`Created test group with ID: ${chatId}`)
  }
}
```

### Testing Bot Responses

```jsx
import {
  sendTestMessage,
  processMessageWithBot,
} from '../../components/DeepTreeEchoBot'

// Send a test message and process it with the bot
async function testBotResponse(accountId, chatId) {
  const msgId = await sendTestMessage(
    accountId,
    chatId,
    'Hello, Deep Tree Echo!'
  )
  await processMessageWithBot(accountId, chatId, msgId)
}
```

## Delta Chat Bot Ecosystem Integration

Deep Tree Echo follows the conventions of the Delta Chat Bot ecosystem (https://bots.delta.chat/). This means it can:

1. Register appropriate commands
2. Process messages in a consistent way
3. Be used in group chats
4. Follow Delta Chat bot development best practices

The bot can be used in both regular DeltaChat conversations and dedicated bot group chats.

## API Keys Setup

Deep Tree Echo requires API keys for language model services. The bot supports up to 7 different API keys for specialized cognitive functions:

1. **Cognitive Core** - Logical reasoning and planning
2. **Affective Core** - Emotional processing
3. **Relevance Core** - Integration of cognitive and emotional processing
4. **Semantic Memory** - Factual knowledge
5. **Episodic Memory** - Experience memories
6. **Procedural Memory** - Process knowledge
7. **Content Evaluation** - Safety and appropriateness evaluation

Users can provide a single API key for basic functionality or multiple keys for enhanced capabilities.

## Technical Architecture

```
Deep Tree Echo
├── DeepTreeEchoBot - Main bot class
├── LLMService - Language model service with multi-key support
├── PersonaCore - Personality and emotional management
├── RAGMemoryStore - Conversation history with retrieval
├── SelfReflection - Autonomous decision-making
├── DeepTreeEchoIntegration - DeltaChat integration layer
└── DeepTreeEchoTestUtil - Testing and demo utilities
```

## Customization

You can customize the bot's appearance and behavior by:

1. Modifying SCSS styles in `packages/frontend/scss/components/_deep-tree-echo.scss`
2. Extending the bot's capabilities in `DeepTreeEchoBot.ts`
3. Adjusting the UI in `BotSettings.tsx` and `DeepTreeEchoSettingsScreen.tsx`

## Commands

Deep Tree Echo supports the following commands:

- `/help` - Display a help message with available commands
- `/vision [image]` - Analyze attached images (when vision is enabled)
- `/search [query]` - Search the web (when web automation is enabled)
- `/screenshot [url]` - Take website screenshots (when web automation is enabled)
- `/memory [status|clear|search]` - Manage conversation memory
- `/embodiment [start|stop|status|evaluate]` - Physical awareness training
- `/reflect [aspect]` - Ask the bot to reflect on an aspect of itself
- `/cognitive [status]` - Show status of cognitive functions
- `/version` - Display bot version information

## Best Practices

1. **Respect User Privacy** - Inform users about API calls to external services
2. **Respect Bot Autonomy** - The bot has been designed with autonomous personality management; honor its decisions about self-presentation
3. **Performance** - The parallel processing architecture is computationally efficient but consider disabling it on low-end devices

## Troubleshooting

If you encounter issues:

1. Check the logs for errors (`render/components/DeepTreeEchoBot/*`)
2. Verify API keys are correctly configured
3. Ensure the bot is properly initialized
4. Check for conflicts with other DeltaChat components
5. Run the test demo to verify functionality

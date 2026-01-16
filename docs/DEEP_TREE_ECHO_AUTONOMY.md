# Deep Tree Echo Autonomy Implementation

## Overview

This document describes the implementation of autonomous agent capabilities for Deep Tree Echo, inspired by the minimal `deltecho-bot-smol.js` example.

## Architecture

The implementation follows the **AAR (Arena-Agent-Relation)** architecture as defined in the project's memory rules:

```
ACTUAL WORLD                          VIRTUAL MODEL (Inside Agent's Mind)
┌─────────────────────────────────────────────────────────────────────────────┐
│   Ao: ARENA                                                                  │
│   ┌─── Ai: AGENT ────────────────────────────────────────────────────────┐  │
│   │   ┌─── S: RELATIONAL SELF ───────────────────────────────────────┐   │  │
│   │   │   ╔═══ Vi: VIRTUAL AGENT (Self-Model) ═══════════════════╗   │   │  │
│   │   │   ║   ╔═══ Vo: VIRTUAL ARENA (World-View) ═══════════╗   ║   │   │  │
│   │   │   ║   ║   (World-view is INSIDE the self-model)      ║   ║   │   │  │
│   │   │   ║   ╚═══════════════════════════════════════════════╝   ║   │   │  │
│   │   │   ╚═══════════════════════════════════════════════════════╝   │   │  │
│   │   └───────────────────────────────────────────────────────────────┘   │  │
│   └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## New Modules

### 1. AgentToolExecutor.ts

The "hands" of Deep Tree Echo - executes actions in the environment.

**Tools Available:**

| Category | Tools | Description |
|----------|-------|-------------|
| **Chat Management** (Ao) | `list_chats`, `open_chat`, `send_message`, `get_chat_history`, `create_chat`, `search_contacts` | Manage chats like a user would |
| **UI Navigation** (Ai) | `navigate_ui`, `focus_composer`, `open_dialog` | Navigate the application UI |
| **Self-Reflection** (S) | `reflect`, `get_cognitive_status`, `get_memory_summary` | Introspection tools |
| **Scheduling** (Vo) | `schedule_message`, `get_current_time` | Time-aware operations |
| **Command Execution** | `execute_command` | Safe shell commands (Electron only) |

**Key Features:**
- Max recursion depth: 5 (prevents infinite loops)
- Safe command execution with whitelist patterns
- Full AAR architecture integration

### 2. AgenticLLMService.ts

The agentic brain - handles LLM calls with tool use.

**Supported Providers:**
- Anthropic Claude (with native tool_use)
- OpenAI GPT-4 (with function calling)
- OpenRouter
- Local fallback

**Agentic Loop (from deltecho-bot-smol.js):**

```
1. User message → Add to conversation history
2. Call LLM with tools
3. LLM responds:
   - If tool_use → Execute tool → Add result → GOTO 2 (recursive)
   - If text → Return response
4. Recursion capped at MAX_TOOL_RECURSION (5)
```

## Configuration

Enable agentic mode in DeepTreeEchoBotOptions:

```typescript
const bot = new DeepTreeEchoBot({
  enabled: true,
  memoryEnabled: true,
  
  // NEW: Enable agentic mode
  useAgenticMode: true,
  agenticProvider: 'anthropic', // or 'openai', 'openrouter', 'local'
  
  apiKey: process.env.ANTHROPIC_KEY,
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
})
```

## Comparison with deltecho-bot-smol.js

| Feature | deltecho-bot-smol.js | DeepTreeEchoBot |
|---------|---------------------|-----------------|
| Environment | Standalone Node.js | Electron/Browser |
| LLM | Anthropic Claude | Multi-provider |
| Tools | bash only | 15+ tools |
| Memory | Per-chat Map | RAGMemoryStore + per-chat |
| Recursion Limit | 5 | 5 |
| Tool Schema | Anthropic native | Anthropic-compatible |
| Avatar | None | Full Live2D/Sprite |
| Cognitive | None | Full cognitive stack |

## Usage Examples

### Basic Agentic Chat

When agentic mode is enabled, the bot can autonomously:

1. **List and open chats:**
   ```
   User: "Show me my unread messages"
   Bot: [uses list_chats with filter=unread]
   Bot: "You have 3 unread chats: ..."
   ```

2. **Navigate UI:**
   ```
   User: "Open the settings"
   Bot: [uses navigate_ui with view=settings]
   Bot: "I've opened the settings for you."
   ```

3. **Reflect on itself:**
   ```
   User: "How are you feeling today?"
   Bot: [uses reflect with aspect=emotions]
   Bot: "After reflecting on my emotional state..."
   ```

4. **Schedule reminders:**
   ```
   User: "Remind me in 10 minutes to check my email"
   Bot: [uses schedule_message with delayMinutes=10]
   Bot: "I'll remind you in 10 minutes."
   ```

### Programmatic Access

```typescript
import { 
  getAgenticLLMService,
  getAgentToolExecutor 
} from './DeepTreeEchoBot'

// Configure the agentic service
const agenticService = getAgenticLLMService()
agenticService.configure({
  provider: 'anthropic',
  apiKey: 'your-api-key'
})

// Generate an agentic response
const result = await agenticService.generateAgenticResponse(
  chatId,
  "List all my chats",
  accountId,
  0 // initial recursion depth
)

console.log('Response:', result.response)
console.log('Tools Used:', result.toolsUsed)
console.log('Recursion Depth:', result.recursionDepth)
```

## Exports

```typescript
// From index.ts
export {
  AgenticLLMService,
  getAgenticLLMService,
  AgentToolExecutor,
  getAgentToolExecutor,
}

export type {
  AgenticResponse,
  LLMProviderConfig,
  AgentTool,
  ToolResult,
  ToolCall,
}
```

## Safety Considerations

1. **Command Execution Whitelist:** Only safe read-only commands are allowed
2. **Recursion Limit:** Prevents infinite tool-use loops
3. **Electron-Only Commands:** Shell execution only in trusted environment
4. **Logging:** All tool executions are logged for audit

## Future Enhancements

- [ ] Add more tool categories (web search, file operations)
- [ ] Implement tool approval workflow for sensitive operations
- [ ] Add tool execution analytics and cost tracking
- [ ] Support streaming responses during tool execution
- [ ] Add MCP (Model Context Protocol) server integration

---

*Part of the Deep Tree Echo Autonomous AI Architecture*

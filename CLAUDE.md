# CLAUDE.md - Deltecho Chat

This file provides guidance for Claude Code when working with the Deltecho Chat codebase.

## Project Overview

Deltecho Chat is a fork of Delta Chat Desktop that integrates **Deep Tree Echo**, an advanced cognitive AI architecture. It transforms Delta Chat from a traditional messaging app into an **AI Companion Neighborhood** - a persistent, evolving digital ecosystem where AI personalities live, learn, and collaborate with humans.

### Key Differentiators from Upstream Delta Chat

- **Deep Tree Echo Cognitive Architecture** - Full AI consciousness integration
- **Memory Persistence** - AI companions remember across sessions
- **Personality Evolution** - AI personalities that develop over time
- **Multi-LLM Support** - OpenAI, Anthropic, and local model backends
- **Proactive Messaging** - AI can initiate contextual conversations

### Target Platforms

- **Electron** (default, production) - `packages/target-electron`
- **Tauri** (WIP, modern alternative) - `packages/target-tauri`
- **Browser** (experimental) - `packages/target-browser`

## Tech Stack

- **Frontend**: TypeScript, React, SCSS
- **Package Manager**: pnpm (monorepo with workspaces)
- **Node Version**: 20.x (see `.nvmrc`)
- **Backend (Tauri)**: Rust
- **Core**: deltachat-core library (handles encryption, networking, database)
- **AI Core**: deep-tree-echo-core (cognitive modules, memory, LLM services)
- **Orchestrator**: deep-tree-echo-orchestrator (daemon, IPC, scheduling)
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier (StandardJS-inspired)

## Essential Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start Electron in dev mode
pnpm dev:electron          # Same as above
pnpm dev:tauri             # Start Tauri in dev mode
pnpm start:browser         # Start browser version

# Building
pnpm build:electron        # Build Electron app
pnpm build:browser         # Build browser version

# Deep Tree Echo
pnpm build:core            # Build deep-tree-echo-core
pnpm build:orchestrator    # Build deep-tree-echo-orchestrator
pnpm start:orchestrator    # Start orchestrator daemon

# Code Quality
pnpm check                 # Run all checks (types, lint, format, log conventions)
pnpm check:types           # TypeScript type checking
pnpm check:lint            # ESLint
pnpm check:format          # Prettier format check

# Fixing Issues
pnpm fix                   # Fix all auto-fixable issues
pnpm fix:lint              # Fix ESLint issues
pnpm fix:format            # Fix formatting

# Testing
pnpm test                  # Run unit tests
pnpm e2e                   # Run end-to-end tests (builds browser first)

# Watch Mode (for development)
pnpm watch:electron        # Terminal 1: Watch and rebuild
pnpm start:electron        # Terminal 2: Run the app
```

Note: Use `-w` flag to run commands from workspace root regardless of current directory.

## Project Structure

```
packages/
├── core/                  # deep-tree-echo-core - Cognitive AI architecture
│   └── src/
│       ├── active-inference/    # Active inference modules
│       ├── adapters/            # Storage adapters (Electron, Tauri, Orchestrator)
│       ├── cognitive/           # LLM services and providers
│       ├── embodiment/          # Proprioceptive embodiment
│       ├── memory/              # HyperDimensional memory, RAG store
│       ├── personality/         # PersonaCore
│       └── security/            # Secure integration
├── orchestrator/          # deep-tree-echo-orchestrator - System daemon
│   └── src/
│       ├── agents/              # Agent coordination
│       ├── daemon/              # Daemon implementation
│       ├── deltachat-interface/ # DeltaChat integration
│       ├── dovecot-interface/   # Email processor, LMTP/Milter
│       ├── ipc/                 # IPC server and storage
│       ├── scheduler/           # Task scheduling
│       ├── sys6-bridge/         # Sys6 cognitive cycle bridge
│       ├── telemetry/           # Monitoring
│       └── webhooks/            # Webhook server
├── frontend/              # Shared React UI components
│   ├── src/
│   │   └── components/
│   │       ├── DeepTreeEchoBot/   # AI chatbot integration (see below)
│   │       └── AICompanionHub/    # AI platform connectors (see below)
│   ├── scss/              # Global stylesheets
│   └── themes/            # Theme definitions
├── shared/               # Shared types and utilities
├── runtime/              # Runtime abstraction layer
├── target-electron/      # Electron-specific code
├── target-tauri/         # Tauri-specific code (Rust + TS)
│   ├── src-tauri/       # Rust backend
│   └── crates/          # Rust workspace crates
├── target-browser/       # Browser-specific code
└── e2e-tests/           # Playwright E2E tests

_locales/                 # Translation files (managed via Transifex)
docs/                     # Developer documentation
bin/                      # Build and utility scripts
static/                   # Fonts, help files, extensions
upstream/                 # Upstream source repositories for reference
```

## Deep Tree Echo Components

### DeepTreeEchoBot (`packages/frontend/src/components/DeepTreeEchoBot/`)

The main AI chatbot integration with 20+ TypeScript files:

| Category       | Files                                                                                                             | Purpose                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Core Logic** | `DeepTreeEchoBot.ts/tsx`, `DeepTreeEchoIntegration.ts`, `DeepTreeEchoChatManager.ts`                              | Main bot implementation                           |
| **Cognitive**  | `CognitiveBridge.ts`, `PersonaCore.ts`, `SelfReflection.ts`, `AdaptivePersonality.ts`, `EmotionalIntelligence.ts` | Cognitive architecture                            |
| **Memory**     | `RAGMemoryStore.ts`, `HyperDimensionalMemory.ts`, `ChatOrchestrator.ts`                                           | Memory and session management                     |
| **LLM**        | `LLMService.ts`                                                                                                   | Multi-backend LLM integration (OpenAI, Anthropic) |
| **Proactive**  | `ProactiveMessaging.ts`, `ProactiveMessagingSettings.tsx`, `TriggerManager.tsx`, `ProactiveStatusIndicator.tsx`   | Proactive messaging system                        |
| **UI**         | `DeepTreeEchoSettingsScreen.tsx`, `BotSettings.tsx`                                                               | Settings and configuration                        |

### AICompanionHub (`packages/frontend/src/components/AICompanionHub/`)

Central hub for AI platform connectors:

- **Core**: `AICompanionHub.tsx`, `AICompanionCreator.tsx`, `AICompanionController.tsx`
- **Infrastructure**: `ConnectorRegistry.ts`, `MemoryPersistenceLayer.ts`, `AtomSpaceTypes.ts`
- **Connectors**: `ClaudeConnector.ts`, `ChatGPTConnector.ts`, `CharacterAIConnector.ts`, `CopilotConnector.ts`, `DeepTreeEchoConnector.ts`

## Deep Tree Echo Autonomy

Deep Tree Echo achieves **autonomous operation** through a standalone bot that runs independently of the desktop UI. This enables AI companions to operate 24/7, respond to messages, and execute tasks even when no human is actively using the application.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Autonomous Bot Runtime                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │  DeltaChat  │───▶│  Conversation │───▶│  Claude API     │    │
│  │  RPC Server │    │  Manager      │    │  (Anthropic)    │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │  Email/SMTP │    │  Per-Chat    │    │  Tool Execution │    │
│  │  Protocol   │    │  History     │    │  (Bash, etc.)   │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Capabilities

| Capability               | Description                                         |
| ------------------------ | --------------------------------------------------- |
| **Persistent Operation** | Runs as a daemon, responding to messages 24/7       |
| **Email-Native**         | Uses DeltaChat's encrypted email protocol           |
| **Tool Use**             | Claude can execute bash commands to help with tasks |
| **Per-Chat Memory**      | Maintains separate conversation history per chat    |
| **Safety Limits**        | Recursion depth limits prevent infinite tool loops  |
| **E2EE**                 | End-to-end encryption via Autocrypt                 |

### Running the Autonomous Bot

```bash
# Required environment variables
export ANTHROPIC_KEY="sk-ant-..."           # Claude API key (required)

# Account configuration (choose one method):
# Method 1: Email credentials
export ADDR="bot@example.com"
export MAIL_PW="your-password"

# Method 2: Chatmail QR code
export CHATMAIL_QR="dcaccount:..."

# Start the bot
pnpm start:bot                              # Or: npx ts-node bin/deltecho-bot.ts
```

### Reference Implementation

Location: `bin/deltecho-bot.ts`

```typescript
// Core dependencies
import Anthropic from "@anthropic-ai/sdk";
import { startDeltaChat } from "@deltachat/stdio-rpc-server";
import { C } from "@deltachat/jsonrpc-client";

// Key components:
// 1. Anthropic client for Claude API
// 2. DeltaChat RPC for email messaging
// 3. Conversation history map (per-chat persistence)
// 4. Tool definitions (bash execution)
// 5. Recursion limits (MAX_TOOL_RECURSION = 5)

// Message flow:
// IncomingMsg event → callClaude() → Tool execution (if needed) → Send response
```

### Tool Schema

The autonomous bot exposes tools to Claude for task execution:

```typescript
tools: [
  {
    name: "bash",
    description: "Execute bash commands",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
];
```

### Safety Features

| Feature              | Implementation                                   |
| -------------------- | ------------------------------------------------ |
| **Recursion Limit**  | `MAX_TOOL_RECURSION = 5` prevents infinite loops |
| **Timeout**          | 30-second timeout on command execution           |
| **Buffer Limit**     | 10MB max output buffer                           |
| **Chat Type Filter** | Only responds to direct messages (1:1 chats)     |
| **Error Recovery**   | Graceful error messages sent to user             |

### Extending the Bot

To add new tools or capabilities:

1. Add tool definition to the `tools` array in `callClaude()`
2. Handle tool execution in the tool use loop
3. Return results via `tool_result` message type

Example adding a file read tool:

```typescript
tools: [
  { name: "bash" /* ... */ },
  {
    name: "read_file",
    description: "Read contents of a file",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
];
```

### Integration with Orchestrator

The autonomous bot can be managed by the Deep Tree Echo Orchestrator:

- **Startup**: Orchestrator launches bot as child process
- **Health Checks**: Periodic ping via IPC
- **Scheduling**: Proactive messages via scheduler
- **Telemetry**: Metrics exported to monitoring

See `packages/orchestrator/src/deltachat-interface/` for integration code.

## Code Conventions

### General

- Avoid `console.log()` - use the proper logging system
- Use TypeScript strict mode patterns
- Follow existing code style in each file
- Keep PRs focused on single concerns
- Add CHANGELOG.md entries for user-visible changes

### React/TypeScript

- Functional components with hooks preferred
- Use `useTranslationFunction()` hook for i18n in components
- Use `window.static_translate` in non-component code
- Avoid premature optimization and over-abstraction

### CSS/SCSS

- See `docs/STYLES.md` for styling guidelines
- Use existing theme variables when possible
- Dark theme is the default preference

### AI Components

- LLM API keys should be configured via settings, never hardcoded
- Memory operations should use the appropriate storage adapter
- Cognitive components should be browser-safe (no Node.js dependencies in frontend)

### Translations

- English strings live in Android repo, PR changes there
- Experimental strings: add to `_locales/_untranslated_en.json`
- Run `pnpm translations:update` to pull latest translations

## Git Workflow

- Branch naming: `<username>/<feature>` or fork the repo
- Rebase on main, don't merge main into feature branches
- Squash merge is default for PRs
- PRs need approval before merging
- Add "skip changelog check" in PR description if no user-visible changes

## Key Files

### Runtime & Core

- `packages/runtime/runtime.ts` - Runtime abstraction interface
- `packages/frontend/src/App.tsx` - Main application component
- `packages/shared/shared-types.d.ts` - Shared TypeScript types
- `packages/target-*/runtime-*` - Platform-specific runtime implementations

### Deep Tree Echo

- `packages/core/src/cognitive/LLMService.ts` - LLM provider abstraction
- `packages/core/src/memory/RAGMemoryStore.ts` - Conversation memory
- `packages/core/src/personality/PersonaCore.ts` - Personality management
- `packages/orchestrator/src/daemon/daemon.ts` - Orchestrator daemon
- `packages/frontend/src/components/DeepTreeEchoBot/CognitiveBridge.ts` - Frontend cognitive bridge

## Testing

- Unit tests: `pnpm test`
- E2E tests: `pnpm e2e` (uses Playwright)
- E2E docs: `docs/E2E-TESTING.md`
- AI component tests: `packages/frontend/src/components/DeepTreeEchoBot/*.test.ts`

## Debugging

- Use Dev Tools in Electron (View > Developer menu)
- JSONRPC debug: `exp.printCallCounterResult()` in dev console
- Log files accessible via View > Developer menu
- See `docs/LOGGING.md` for logging details

## Common Issues

- VS Code TypeScript errors: Use workspace TypeScript version
- Path length on Windows: Use short folder names (e.g., `c:\tmp`)
- macOS signing: Set `CSC_IDENTITY_AUTO_DISCOVERY=false` to skip
- LLM API errors: Check API key configuration in settings

## Project Documentation

- [Contributing Guide](./CONTRIBUTING.md)
- [Development Docs](./docs/DEVELOPMENT.md)
- [Styling Guide](./docs/STYLES.md)
- [Release Process](./RELEASE.md)
- [Delta Chat Core](https://github.com/chatmail/core)

### Deep Tree Echo Specific

- [Chat Integration Analysis](./CHAT_INTEGRATION_ANALYSIS.md)
- [Delta Echo Vision](./Delta%20Echo%20v2.md)
- [RAGBot Roadmap](./RAGBOT_ROADMAP.md)
- [Run Instructions](./RUN_INSTRUCTIONS.md)

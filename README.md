# Deltecho Chat 🌳💬

**DeltaChat interface with Deep Tree Echo cognitive orchestration**

Deltecho Chat combines the secure, decentralized messaging capabilities of DeltaChat with the advanced cognitive architecture of Deep Tree Echo. This integration enables intelligent chat orchestration, context-aware responses, and autonomous conversation management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Deltecho Chat                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   DeltaChat     │    │    Deep Tree Echo Orchestrator  │ │
│  │   Interface     │◄──►│                                 │ │
│  │                 │    │  ┌─────────────────────────────┐│ │
│  │  • Chat UI      │    │  │  Cognitive Membrane         ││ │
│  │  • Contacts     │    │  │  • Memory (Hypergraph)      ││ │
│  │  • Messages     │    │  │  • Reasoning (Inference)    ││ │
│  │  • Groups       │    │  │  • Grammar (Symbolic)       ││ │
│  └─────────────────┘    │  └─────────────────────────────┘│ │
│                         │                                 │ │
│                         │  ┌─────────────────────────────┐│ │
│                         │  │  Sys6 Operadic Cycle        ││ │
│                         │  │  30-step cognitive loop     ││ │
│                         │  │  42 sync events/cycle       ││ │
│                         │  └─────────────────────────────┘│ │
│                         └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Chat Interface (DeltaChat)

Deltecho Chat inherits all the powerful features of DeltaChat, providing secure and decentralized messaging through existing email infrastructure. The interface supports end-to-end encrypted communication across desktop (Electron), browser, and Tauri targets, with rich media capabilities including images, files, and voice messages.

### Cognitive Orchestration (Deep Tree Echo)

The Deep Tree Echo integration brings advanced cognitive capabilities to chat interactions. The system provides intelligent, context-aware message generation through hypergraph-based conversation memory. Emotional intelligence enables adaptive personality and tone, while self-reflection allows meta-cognitive analysis of conversations. The trajectory diffusion system enables autonomous skill acquisition and learning.

### Integration Features

The DeepTreeEchoBot serves as an AI companion integrated directly into the chat interface, while the AICompanionHub provides a central location for all AI-powered features. The CognitiveBridge creates a seamless connection between chat events and cognitive processing, with the LLM Service supporting multiple backends including OpenAI, Anthropic, and local models.

### Visual Cortex & Scientific Dashboard

The system features a real-time Visual Cortex that visualizes the AI's internal knowledge graph (AtomSpace) using an interactive force-directed layout. The Scientific Dashboard provides an interface for interacting with this knowledge base, allowing users to manually inject knowledge and observe the agent's cognitive state. It also features integration with Live2D streaming avatars equipped with lip-sync capabilities.

## Project Structure

```
deltecho-chat/
├── packages/
│   ├── frontend/           # React-based chat UI
│   │   └── src/
│   │       └── components/
│   │           ├── DeepTreeEchoBot/    # AI bot integration
│   │           ├── AICompanionHub/     # AI features hub
│   │           └── ScientificGenius/   # Visual Cortex & Dashboard
│   ├── target-browser/     # Browser deployment target
│   ├── target-electron/    # Desktop app target
│   ├── target-tauri/       # Lightweight desktop target
│   ├── core/               # Deep Tree Echo core engine
│   ├── orchestrator/       # Cognitive orchestration daemon
│   ├── runtime/            # Runtime interface
│   └── shared/             # Shared utilities
├── static/                 # Static assets
├── images/                 # Image resources
└── docs/                   # Documentation
```

## Quick Start

### Prerequisites

The application requires Node.js version 20 or higher and pnpm version 9.6.0 or higher.

### Installation

```bash
# Clone the repository
git clone https://github.com/o9nn/deltecho-chat.git
cd deltecho-chat

# Install dependencies
pnpm install

# Build core packages
pnpm build:core
pnpm build:orchestrator
```

### Development

```bash
# Start Electron development
pnpm dev:electron

# Start browser development
pnpm start:browser

# Start the orchestrator daemon
pnpm start:orchestrator
```

### Building

```bash
# Build for Electron
pnpm build:electron

# Build for browser
pnpm build:browser
```

## Deep Tree Echo Integration

### Cognitive Components

| Component                | Description                                  |
| ------------------------ | -------------------------------------------- |
| CognitiveBridge          | Connects chat events to cognitive processing |
| AdaptivePersonality      | Adjusts response style based on context      |
| EmotionalIntelligence    | Understands and responds to emotional cues   |
| HyperDimensionalMemory   | Stores conversation context in hypergraph    |
| QuantumBeliefPropagation | Advanced inference for response generation   |
| SelfReflection           | Meta-cognitive analysis of interactions      |

### Orchestrator Daemon

The orchestrator daemon manages cognitive cycles, providing Sys6 cognitive cycle management, memory consolidation, skill learning and refinement, and multi-session coordination. Start the daemon with `pnpm start:orchestrator`.

## DeltaChat Documentation

For detailed DeltaChat documentation, see [README_DELTACHAT.md](README_DELTACHAT.md).

## License

GPL-3.0-or-later

## Links

| Resource            | URL                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Repository          | [github.com/o9nn/deltecho-chat](https://github.com/o9nn/deltecho-chat)                       |
| Deep Tree Echo Core | [github.com/o9nn/deltecho](https://github.com/o9nn/deltecho)                                 |
| Skill Diffusion     | [github.com/o9nn/deltecho-skill-diffusion](https://github.com/o9nn/deltecho-skill-diffusion) |
| DeltaChat           | [delta.chat](https://delta.chat)                                                             |

---

Built with 🌳 Deep Tree Echo cognitive architecture

# Force redeploy Mon Jan 26 20:37:04 EST 2026

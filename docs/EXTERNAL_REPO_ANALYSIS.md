# External Repository Features Analysis

**Date**: January 14, 2026  
**Purpose**: Identify useful features from o9nn repositories for Deep Tree Echo integration

---

## 🔴 High Priority - Direct Integration Candidates

### 1. **moeru-ai/airi** (AI Companion Framework)

**URL**: <https://github.com/moeru-ai/airi>

**Relevant Features**:

| Feature | Description | Integration Priority |
|---------|-------------|---------------------|
| **Live2D Support** | Full Live2D model control with auto-blink, look-at, idle animations | 🔴 High |
| **VRM Support** | VRM/3D avatar control and animations | 🟡 Medium |
| **Realtime Voice Chat** | VAD + STT + LLM + TTS integrated | 🔴 High |
| **Memory System** | DuckDB WASM for in-browser persistent memory | 🔴 High |
| **Discord Integration** | Chat and audio input from Discord | 🟡 Medium |
| **Telegram Integration** | Chat bot capabilities | 🟢 Low |
| **Game Playing** | Minecraft/Factorio integration with CV + LLM | 🟢 Low |
| **WebGPU/WebWorker** | Efficient browser-native inference | 🔴 High |

**Key Sub-projects**:

- `@proj-airi/duckdb-wasm` - Browser database (42 stars)
- `unplugin-live2d-sdk` - Live2D SDK installer
- `webai-realtime-voice-chat` - Voice chat implementation (141 stars)
- `unspeech` - Universal TTS/ASR proxy server
- `eventa` - Type-safe event-driven messaging (excellent for IPC)

---

### 2. **moeru-ai (Monorepo)**

**URL**: <https://github.com/o9nn/moeru-ai>

**Key Packages for Integration**:

#### Core

- **xsai** - Extra-small AI SDK (lightweight LLM client)
- **std** - Standard library for Moeru AI

#### Infrastructure

- **ortts** - ONNX Runtime TTS server (local voice synthesis)
- **eventa** - Type-safe event system for Web Worker/WebSocket/IPC
- **unspeech** - Universal TTS services proxy
- **demodel** - Model download accelerator
- **mcp-launcher** - MCP server management

#### AI Extensions

- **xsai-transformers** - Transformers.js for browser inference
- **xsai-use** - Framework bindings (React/Vue/Svelte)

#### UI

- **three-mmd** - MMD models on Three.js
- **chat** - WebXR Voice Call UI

---

### 3. **proj-airi/unplugin-live2d-sdk**

**URL**: <https://github.com/proj-airi/unplugin-live2d-sdk>

**Features**:

- Automated Live2D SDK installation
- Works with Vite, Webpack, Rollup
- Handles licensing and asset management

**Integration Points for deltecho-chat**:

- Use for `packages/avatar` Live2D Cubism integration
- Simplifies SDK setup process

---

### 4. **proj-airi/webai-example-realtime-voice-chat** (141 ⭐)

**URL**: <https://github.com/proj-airi/webai-example-realtime-voice-chat>

**Architecture**:

```
VAD (Voice Activity Detection)
    ↓
STT (Speech-to-Text, Whisper)
    ↓
LLM (Language Model)
    ↓
TTS (Text-to-Speech)
```

**Integration for `packages/voice`**:

- Reference implementation for real-time voice
- Uses pure browser technologies
- Single-file implementation pattern

---

### 5. **proj-airi/duckdb-wasm** (42 ⭐)

**URL**: <https://github.com/proj-airi/duckdb-wasm>

**Features**:

- DuckDB in browser via WASM
- Drizzle ORM integration
- Persistent storage

**Use Case**:

- Replace/augment RAGMemoryStore with SQL-capable memory
- Enables advanced memory queries

---

## 🟡 Medium Priority

### 6. **o9nn/togai** (Cognitive Engineering Template)

**URL**: <https://github.com/o9nn/togai>

**Phases of Interest**:

- Phase 3: Neural-Symbolic Synthesis via ggml kernels
- Phase 4: Distributed Cognitive Mesh API
- Phase 5: Recursive Meta-Cognition

**Note**: Contains Smali (Android) code - may have ARM libraries

---

### 7. **eventa** (Event System)

**From**: moeru-ai monorepo

**Features**:

- Type-safe events across boundaries
- Works with: Web Workers, WebSocket, Electron IPC, RPC
- "Define it everywhere, use it anywhere"

**Integration**:

- Replace or enhance current event system in DeepTreeEchoUIBridge
- Improve IPC communication in Tauri/Electron targets

---

## 🟢 Lower Priority (Reference)

### 8. **o9nn/daedalOS**

- Desktop environment in browser
- UI patterns for windowed interface

### 9. **o9nn/dovecot-core**

- Mail server integration patterns
- Already in deltecho ecosystem

### 10. **o9nn/ATenSpace**

- ATen Tensors + OpenCog AtomSpace
- Advanced cognitive architecture reference

---

## Summary: Recommended Integrations

### Immediate (Phase 1)

1. **Voice Package Enhancement**: Reference `webai-realtime-voice-chat` for improved voice synthesis/recognition
2. **Avatar Package Enhancement**: Use `unplugin-live2d-sdk` for proper Cubism SDK integration; reference airi's Live2D implementation

### Near Term (Phase 2)

3. **Memory Enhancement**: Consider DuckDB WASM for SQL-capable memory queries
2. **Event System**: Evaluate `eventa` for improved type-safe IPC

### Future (Phase 3+)

5. **WebGPU Inference**: Local LLM inference using WebGPU patterns from airi
2. **Discord/Telegram**: Chat platform integrations

---

## ARM .so Libraries Note

The `o9nn/togai` repository uses Smali (Android bytecode), suggesting it may contain:

- ARM native libraries for cognitive processing
- Android-specific optimizations

Further investigation needed in:

- `o9nn/togai/libs/` or similar directories
- Build configurations for ARM targets

---

*This analysis supports the Chat Integration phase by identifying components that enhance Deep Tree Echo's capabilities.*

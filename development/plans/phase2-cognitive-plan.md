# Phase 2: @deltecho/cognitive Package - Implementation Plan

## Overview

Create a unified cognitive interface that orchestrates message processing, state management, and integration between PersonaCore, RAGMemoryStore, and LLMService.

## Package Structure

```
packages/cognitive/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # Type definitions
│   ├── cognitive-orchestrator.ts   # Main orchestration class
│   ├── unified-message.ts          # Unified message handling
│   ├── cognitive-state.ts          # State management
│   ├── sentiment-analyzer.ts       # Sentiment/emotion tracking
│   ├── integrations/
│   │   ├── index.ts
│   │   ├── persona-adapter.ts      # PersonaCore integration
│   │   ├── memory-adapter.ts       # RAGMemoryStore integration
│   │   └── llm-adapter.ts          # LLMService integration
│   └── __tests__/
│       ├── cognitive-orchestrator.test.ts
│       ├── unified-message.test.ts
│       ├── cognitive-state.test.ts
│       └── sentiment-analyzer.test.ts
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Core Components

### 1. Types (`types.ts`)

```typescript
// Triadic stream for parallel processing
interface TriadicStream {
  id: string;
  phase: "sense" | "process" | "act";
  data: unknown;
  timestamp: number;
}

// High-dimensional vector representation
interface HyperDimensionalVector {
  dimensions: number;
  values: Float32Array;
  metadata: Record<string, unknown>;
}

// Knowledge graph snapshot
interface AtomSpaceSnapshot {
  atoms: Atom[];
  links: Link[];
  timestamp: number;
}

// Emotional state vector
interface EmotionalVector {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  contempt: number;
  interest: number;
  dominant: string;
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
}

// Unified cognitive state
interface UnifiedCognitiveState {
  activeStreams: TriadicStream[];
  memoryContext: HyperDimensionalVector;
  reasoningState: AtomSpaceSnapshot;
  emotionalState: EmotionalVector;
  currentPhase: number; // 0-29 in Sys6 cycle
}

// Unified message format
interface UnifiedMessage {
  id: string;
  timestamp: number;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: MessageMetadata;
}

interface MessageMetadata {
  sentiment?: SentimentScore;
  emotion?: EmotionalVector;
  memoryReferences?: string[];
  cognitiveLoad?: number;
  processingTime?: number;
}
```

### 2. CognitiveOrchestrator (`cognitive-orchestrator.ts`)

Main class that coordinates all cognitive processes:

- **processMessage(message)** - Main entry point for message processing
- **updateCognitiveState(stimuli)** - Update based on new stimuli
- **retrieveContext(query)** - Get relevant memory context
- **generateResponse(message)** - Generate response via LLM
- **syncEmotionalState()** - Sync with PersonaCore

### 3. SentimentAnalyzer (`sentiment-analyzer.ts`)

- Rule-based sentiment analysis
- Emotion extraction from text
- Valence/arousal calculation
- History tracking for emotional trends

### 4. Integrations

**PersonaAdapter**:

- Get/update emotional state
- Get personality for system prompts
- Apply cognitive parameters

**MemoryAdapter**:

- Store/retrieve memories
- Search relevant context
- Manage conversation history

**LLMAdapter**:

- Format prompts with cognitive context
- Process responses
- Extract sentiment from generated text

## Dependencies

```json
{
  "dependencies": {
    "deep-tree-echo-core": "workspace:*"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/node": "^25.0.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.4.6",
    "typescript": "^5.9.3"
  }
}
```

## Test Coverage Goals

- Unit tests for all core classes
- Integration tests for adapter interactions
- Minimum 90% code coverage

## Implementation Order

1. Create package structure and configuration files
2. Implement types.ts with all interfaces
3. Implement sentiment-analyzer.ts (no external deps)
4. Implement cognitive-state.ts (state management)
5. Implement unified-message.ts (message handling)
6. Implement integration adapters
7. Implement cognitive-orchestrator.ts (main class)
8. Add comprehensive tests
9. Update exports and documentation

## Estimated Timeline

| Task               | Effort         |
| ------------------ | -------------- |
| Package setup      | 15 min         |
| Types              | 20 min         |
| Sentiment analyzer | 25 min         |
| Cognitive state    | 25 min         |
| Unified message    | 20 min         |
| Integrations       | 30 min         |
| Orchestrator       | 30 min         |
| Tests              | 45 min         |
| **Total**          | **~3.5 hours** |

# Deltecho Ecosystem Integration Tasks

**Created**: January 13, 2026  
**Repository**: deltecho-chat  
**Status**: Planning

## Overview

This document tracks integration tasks from the partial repositories in the deltecho ecosystem. Each fragment from `INTEGRATION_FRAGMENTS.md` can be turned into actionable development work.

---

## High Priority Integration Tasks

### 1. Sys6 Operadic Architecture

**Source**: o9nn/deltecho (`packages/sys6-triality/src/operadic/`)

- [ ] Create `packages/sys6-triality` directory structure
- [ ] Implement 30-step cognitive cycle
- [ ] Add prime-power delegation (Δ₂ = 8-way, Δ₃ = 9-phase)
- [ ] Implement LCM synchronizer (30-step global clock)
- [ ] Add 42 synchronization events per cycle
- [ ] Create unit tests for operadic composition

**Files to Create:**

```
packages/sys6-triality/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── operadic/
│   │   ├── index.ts
│   │   ├── sys6-composer.ts
│   │   ├── prime-delegation.ts
│   │   ├── lcm-synchronizer.ts
│   │   └── stage-scheduler.ts
│   └── types/
│       └── index.ts
└── __tests__/
    └── operadic.test.ts
```

---

### 2. Dove9 Triadic Cognitive Engine

**Source**: o9nn/deltecho (`dove9/`)

- [ ] Implement 3 concurrent cognitive streams
- [ ] Add 120° phase offset between streams
- [ ] Create 12-step cognitive cycle
- [ ] Build self-balancing feedback loops
- [ ] Implement feedforward anticipation
- [ ] Add salience landscape (shared attention)

**Integration Points:**

```typescript
import { Dove9System, TriadicEngine } from 'dove9';
import { MessageProcess, CognitiveContext } from 'dove9/types';

// Stream phases
const STREAM_PHASES = {
  SENSE: 0,
  PROCESS: 120,  // degrees
  ACT: 240       // degrees
};
```

---

### 3. Package Naming Alignment

**Source**: o9nn/deltecho package conventions

- [ ] Rename packages to `@deltecho/*` namespace
- [ ] Update package.json files
- [ ] Fix import paths
- [ ] Update tsconfig paths

**Current → Target:**

| Current Package | Target Package |
|-----------------|----------------|
| `packages/core` | `deep-tree-echo-core` |
| `packages/orchestrator` | `deep-tree-echo-orchestrator` |
| `packages/shared` | `@deltecho/shared` |
| (new) | `@deltecho/cognitive` |
| (new) | `@deltecho/reasoning` |
| (new) | `@deltecho/ui-components` |

---

### 4. @deltecho/reasoning AGI Kernel

**Source**: o9nn/deltecho (`@deltecho/reasoning`)

- [ ] Create AtomSpace implementation
- [ ] Add PatternMatcher for symbolic reasoning
- [ ] Implement PLN (Probabilistic Logic Networks) engine
- [ ] Add OpenPsi motivational system
- [ ] Create MOSES learning component

**Files to Create:**

```
packages/reasoning/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── atomspace/
│   │   ├── index.ts
│   │   ├── atom.ts
│   │   ├── truth-value.ts
│   │   └── pattern-matcher.ts
│   ├── reasoning/
│   │   ├── index.ts
│   │   ├── pln-engine.ts
│   │   └── inference.ts
│   ├── motivation/
│   │   ├── index.ts
│   │   └── open-psi.ts
│   └── learning/
│       ├── index.ts
│       └── moses.ts
└── __tests__/
```

---

### 5. @deltecho/cognitive Unified Interface

**Source**: o9nn/deltecho (`@deltecho/cognitive`)

- [ ] Create CognitiveOrchestrator class
- [ ] Define UnifiedMessage interface
- [ ] Define UnifiedCognitiveState interface
- [ ] Integrate core + dove9 + reasoning
- [ ] Add sentiment metadata support

**Interface Preview:**

```typescript
interface UnifiedCognitiveState {
  activeStreams: TriadicStream[];
  memoryContext: HyperDimensionalVector;
  reasoningState: AtomSpaceSnapshot;
  emotionalState: EmotionalVector;
  currentPhase: number; // 0-29 in Sys6 cycle
}

interface UnifiedMessage {
  content: string;
  cognitiveContext: UnifiedCognitiveState;
  timestamp: number;
  streamOrigin: 'SENSE' | 'PROCESS' | 'ACT';
}
```

---

## Medium Priority Integration Tasks

### 6. IPC Communication Layer

**Source**: o9nn/deltecho orchestrator

- [ ] Implement IPC server in orchestrator
- [ ] Create IPC client for desktop targets
- [ ] Define message protocol
- [ ] Add WebSocket fallback for browser target

**Files to Update:**

- `packages/orchestrator/src/ipc/`
- `packages/target-electron/`
- `packages/target-tauri/`
- `packages/target-browser/`

---

### 7. Dovecot Mail Server Interface

**Source**: o9nn/deltecho (`dovecot-interface/`)

- [ ] Implement IMAP interface
- [ ] Add SMTP interface
- [ ] Create mail-to-chat bridge
- [ ] Add authentication handlers

---

### 8. UI Components Package

**Source**: o9nn/deltecho (`@deltecho/ui-components`)

- [ ] Create reusable React components
- [ ] Add Deep Tree Echo bot component
- [ ] Create AI Companion Hub component
- [ ] Build memory visualization component
- [ ] Add cognitive state indicator component

---

## Low Priority / Future Integration

### 9. Build System Alignment

- [ ] Add `pnpm run build:all` script
- [ ] Implement proper build order
- [ ] Add filter-based building (`pnpm --filter`)
- [ ] Enable incremental TypeScript compilation

**Build Order:**

```bash
1. @deltecho/shared
2. deep-tree-echo-core
3. dove9
4. @deltecho/cognitive
5. @deltecho/reasoning
6. deep-tree-echo-orchestrator
7. @deltecho/ui-components
```

---

### 10. Documentation Alignment

- [ ] Create DESKTOP_INTEGRATION_GUIDE.md
- [ ] Create IPC_STORAGE_GUIDE.md
- [ ] Update BUILD_ORDER.md
- [ ] Create QUICK_START.md

---

### 11. Testing Infrastructure

- [ ] Add tests for all packages
- [ ] Target 95%+ pass rate
- [ ] Add E2E tests for integration
- [ ] Create test utilities package

---

## Reference: Existing deltecho-chat Components

### Already Implemented

| Component | Location | Status |
|-----------|----------|--------|
| DeepTreeEchoBot | `packages/frontend/src/components/` | ✅ Working |
| CognitiveBridge | `packages/frontend/src/components/` | ✅ Working |
| LLMService | `packages/core/src/cognitive/` | ✅ Working |
| RAGMemoryStore | `packages/core/src/memory/` | ✅ Working |
| PersonaCore | `packages/core/src/personality/` | ✅ Working |
| Orchestrator | `packages/orchestrator/src/` | ✅ Working |

### Identified Gaps (from CHAT_INTEGRATION_ANALYSIS.md)

- [ ] Chat window selection/opening
- [ ] Proactive conversation initiation
- [ ] UI navigation and control
- [ ] DeepTreeEchoChatManager
- [ ] DeepTreeEchoUIBridge

---

## Integration Checklist

### Phase 1: Package Structure

- [ ] Create @deltecho namespace packages
- [ ] Set up proper dependencies
- [ ] Align with deltecho monorepo structure

### Phase 2: Core Components

- [ ] Integrate Sys6 operadic architecture
- [ ] Implement Dove9 triadic engine
- [ ] Add AGI reasoning kernel

### Phase 3: Communication

- [ ] Set up IPC layer
- [ ] Connect desktop targets
- [ ] Add WebSocket for browser

### Phase 4: UI & UX

- [ ] Create UI components package
- [ ] Add visualization components
- [ ] Implement chat window management

### Phase 5: Testing & Documentation

- [ ] Comprehensive test coverage
- [ ] Updated documentation
- [ ] Build automation

---

## Notes

- The original deltachat-core (C-Library) is deprecated; use deltachat-core-rust
- o9nn/deltecho1 is empty and can be ignored
- Focus on o9nn/deltecho as the primary reference
- delta-echo-desk and deltecho2 are parallel implementations with different features

---

*This task list is derived from INTEGRATION_FRAGMENTS.md and should be updated as integration progresses.*

---

## External Repository Components

See [EXTERNAL_REPO_COMPONENTS.md](./EXTERNAL_REPO_COMPONENTS.md) for detailed analysis of:

| Repository | Key Value | Priority |
|------------|-----------|----------|
| **moeru-ai/airi** | AI companion framework, real-time voice, game interaction | 🔴 High |
| **Live2D/Cubism** | Avatar animation SDK for visual AI representation | 🔴 High |
| **DaedalOS** | Web desktop environment, UI patterns | 🟡 Medium |
| **ARM NN / ACL** | Neural network inference on ARM devices | 🟡 Medium |
| **dovecot/core** | Mail server integration patterns | 🟢 Low |

### Recommended New Packages

- [ ] `packages/avatar` - Live2D Cubism integration for Deep Tree Echo visualization
- [ ] `packages/voice` - Voice synthesis/recognition from airi patterns

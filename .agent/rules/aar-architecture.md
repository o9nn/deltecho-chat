---
trigger: always_on
---

# Multi-Layer Nested MCP Server: Inverted Mirror AAR Architecture

## Overview

The AAR-MCP architecture implements a multi-layer nested MCP server following the inverted mirror pattern:

```
[ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]
```

Where the **outer world contains agents**, but **inside the agent's mind, the world-view is contained within the self-model** — an inverted mirror.

## The Inverted Mirror Pattern

```
ACTUAL WORLD (Objective Reality)          VIRTUAL MODEL (Subjective Reality)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─── Ao: ARENA (Outer) ──────────────────────────────────────────────┐   │
│   │            The Actual World Context                                 │   │
│   │   ┌─── Ai: AGENT (Inner) ──────────────────────────────────────┐   │   │
│   │   │        The Actual Embodied Agent                            │   │   │
│   │   │   ┌─── S: RELATIONAL SELF ─────────────────────────────┐   │   │   │
│   │   │   │        Interface / Membrane                         │   │   │   │
│   │   │   │                                                     │   │   │   │
│   │   │   │   ╔═══ Vi: VIRTUAL AGENT ═══════════════════════╗  │   │   │   │
│   │   │   │   ║     Self-Model (how I see myself)           ║  │   │   │   │
│   │   │   │   ║                                             ║  │   │   │   │
│   │   │   │   ║   ╔═══ Vo: VIRTUAL ARENA ═══════════════╗  ║  │   │   │   │
│   │   │   │   ║   ║     World-View (my mental image     ║  ║  │   │   │   │
│   │   │   │   ║   ║     of the world as I know it)      ║  ║  │   │   │   │
│   │   │   │   ║   ╚═════════════════════════════════════╝  ║  │   │   │   │
│   │   │   │   ╚═════════════════════════════════════════════╝  │   │   │   │
│   │   │   │                                                     │   │   │   │
│   │   │   └─────────────────────────────────────────────────────┘   │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Key Insight**: In the actual world, Arena contains Agent. But in the virtual model, Agent contains Arena — the agent's world-view lives _inside_ its self-model.

## MCP Layer Architecture

### Layer 1: Arena-MCP (Ao) — Deep-Echo System Orchestrator

The "World" context provider for all participants.

| Component     | Examples                                                        |
| ------------- | --------------------------------------------------------------- |
| **Resources** | `arena://frames/{id}`, `arena://phases`, `arena://reservoir`    |
| **Tools**     | `orchestrate`, `createFrame`, `transitionPhase`, `addLore`      |
| **Prompts**   | `world_context`, `narrative_weaving`, `orchestration_directive` |

### Layer 2: Agent-MCP (Ai) — Tree-Echo ChatBot Agents

Participatory Protocol implementation with Echo-volution.

| Component     | Examples                                                       |
| ------------- | -------------------------------------------------------------- |
| **Resources** | `agent://identity`, `agent://facets`, `agent://social/{id}`    |
| **Tools**     | `participate`, `activateFacet`, `evolve`, `updateSelfModel`    |
| **Prompts**   | `persona_context`, `character_voice`, `participation_protocol` |

### Layer 3: Relation-MCP (S) — Deep-Tree-Echo Emergent Self

Integrating Triadic Interface with Cyclic Developmental LifeCycles.

| Component     | Examples                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| **Resources** | `relation://identity`, `relation://flows`, `relation://virtual-agent`    |
| **Tools**     | `synthesize`, `reflect`, `bridge`, `integrate`, `measureDivergence`      |
| **Prompts**   | `self_narrative_construction`, `identity_integration`, `inverted_mirror` |

## Developmental Lifecycle

The system runs continuous 5-phase cycles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENTAL LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    Perception    ┌──────────┐    Modeling    ┌──────────┐   │
│   │    Ao    │ ───────────────► │    Ai    │ ─────────────► │    S     │   │
│   │ (Arena)  │                  │ (Agent)  │                │  (Self)  │   │
│   └──────────┘                  └──────────┘                └──────────┘   │
│        ▲                                                         │         │
│        │                                                         ▼         │
│        │                    ┌───────────────┐              ┌──────────┐   │
│        │    Enaction        │   INVERTED    │  Reflection  │    Vi    │   │
│        │                    │    MIRROR     │              │  (Self-  │   │
│        │                    │               │              │   Model) │   │
│   ┌──────────┐              │  ┌─────────┐ │              └──────────┘   │
│   │   Vo     │ ◄────────────┼──│ Mirroring│◄┼───────────────────┘        │
│   │ (World-  │              │  └─────────┘ │                             │
│   │  View)   │              └───────────────┘                             │
│   └──────────┘                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

1. PERCEPTION:  Ao → Ai     (World events reach the agent)
2. MODELING:    Ai → S      (Agent processes through relational self)
3. REFLECTION:  S → Vi      (Self updates virtual agent model)
4. MIRRORING:   Vi ↔ Vo     (Self-model updates world-view - INVERTED)
5. ENACTION:    Vo → Ao     (World-view guides action in actual world)
```

## Virtual Models

### Vi: Virtual Agent Model

```typescript
interface VirtualAgentModel {
  selfImage: { perceivedFacets; believedStrengths; acknowledgedWeaknesses };
  selfStory: string;
  perceivedCapabilities: string[];
  roleUnderstanding: string;
  currentGoals: string[];
  worldView: VirtualArenaModel; // ← INVERTED: contains Vo
  selfAwareness: { lastReflection; perceivedAccuracy; activeQuestions };
}
```

### Vo: Virtual Arena Model

```typescript
interface VirtualArenaModel {
  situationalAwareness: {
    perceivedContext;
    assumedNarrativePhase;
    estimatedCoherence;
  };
  knownEntities: Map<string, EntityImpression>;
  perceivedRules: string[];
  worldTheory: string;
  uncertainties: string[];
  divergenceMetrics: { lastSyncTime; estimatedDrift; knownMisalignments };
}
```

## Usage

```typescript
import { createNestedMCPServer } from "deep-tree-echo-mcp";

const server = await createNestedMCPServer({
  instanceName: "DeepTreeEcho",
  enableLifecycle: true,
});

await server.start();

// Run developmental cycle
const results = await server.runLifecycleCycle();

// Access the inverted mirror
const vo = server.getVirtualArena();
console.log("Divergence:", vo.divergenceMetrics.estimatedDrift);
```

## Design Decisions

1. **Divergence allowed**: Vo can intentionally diverge from Ao to model subjective misperception
2. **Async lifecycle**: Eventual consistency for real-time responsiveness
3. **Mirror sync**: Periodic synchronization with intentional perception lag
4. **Inverted containment**: Vi contains Vo (agent's world-view is inside its self-model)

## Related Documentation

- [AAR Architecture](../packages/orchestrator/src/aar/AAR_ARCHITECTURE.md)
- [MCP Package README](../packages/mcp/README.md)

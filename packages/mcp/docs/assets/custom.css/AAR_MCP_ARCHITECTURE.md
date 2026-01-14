# Multi-Layer Nested MCP Server: Inverted Mirror AAR Architecture

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

NOTATION: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]
          └─────────────┘   └──────────┘
           Outer → Inner     Inner → Outer
           (Actual World)    (Virtual Mirror)
```

> **Key Insight**: The inner subjective world is an inverted mirror!
>
> - Actual: Arena contains Agent (agent is in the world)
> - Virtual: Agent contains Arena (world-view is in the agent's mind)

---

## MCP Layer Architecture

### Layer 1: Arena-MCP (Deep-Echo System Orchestrator)

**Role**: The "World" context provider for all participants

| Component | Description |
|-----------|-------------|
| **Resources** | Session frames, narrative phases, Yggdrasil Reservoir, global threads |
| **Tools** | `orchestrate`, `createSessionFrame`, `transitionNarrativePhase`, `addLore` |
| **Prompts** | World-context injection, narrative weaving, orchestration directives |

### Layer 2: Agent-MCP (Tree-Echo ChatBot Agents)

**Role**: Participatory Protocol implementation with Echo-volution

| Component | Description |
|-----------|-------------|
| **Resources** | Character facets, social memory, transactional memory, core identity |
| **Tools** | `participate`, `activateFacet`, `updateSocialMemory`, `evolve` |
| **Prompts** | Persona templates, dialogue styles, character voice |

### Layer 3: Relation-MCP (Deep-Tree-Echo Emergent Self)

**Role**: Integrating Triadic Interface with Cyclic Developmental LifeCycles

| Component | Description |
|-----------|-------------|
| **Resources** | Cognitive flows, emergent identity, self-reflection, coherence metrics |
| **Tools** | `synthesize`, `reflect`, `bridge`, `integrate` |
| **Prompts** | Self-narrative construction, identity integration, reflexive awareness |

---

## Virtual Models (The Inverted Mirror)

### Vi: Virtual Agent Model (Self-as-Known)

The agent's **model of itself** - how it believes it appears and functions.

```typescript
interface VirtualAgentModel {
    selfImage: {
        perceivedFacets: Partial<CharacterFacets>;
        believedStrengths: string[];
        acknowledgedWeaknesses: string[];
    };
    selfStory: string;
    perceivedCapabilities: string[];
    roleUnderstanding: string;
    worldView: VirtualArenaModel;  // ← The inversion happens here!
}
```

### Vo: Virtual Arena Model (World-as-Known)

The agent's **mental image of the world** - subjective, partial, potentially mistaken.

```typescript
interface VirtualArenaModel {
    situationalAwareness: {
        perceivedContext: string;
        assumedNarrativePhase: keyof NarrativePhases;
        estimatedCoherence: number;  // May differ from actual!
    };
    knownEntities: Map<string, EntityImpression>;
    perceivedRules: string[];
    worldTheory: string;
    uncertainties: string[];
}
```

---

## Cyclic Integration: Developmental LifeCycles

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
│        │                                                         │         │
│        │                    ┌───────────────┐                   ▼         │
│        │    Action          │   INVERTED    │         Reflection          │
│        │                    │    MIRROR     │                             │
│        │                    │               │                             │
│   ┌──────────┐              │  ┌─────────┐ │              ┌──────────┐   │
│   │   Vo     │ ◄────────────┼──│   Vi    │◄┼──────────────│    S     │   │
│   │ (World-  │   Updates    │  │ (Self-  │ │  Integration │  (Self)  │   │
│   │  View)   │              │  │  Model) │ │              └──────────┘   │
│   └──────────┘              │  └─────────┘ │                             │
│        │                    └───────────────┘                             │
│        │                                                                   │
│        └─────────── Enaction (world-view guides behavior) ◄───────────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

CYCLE PHASES:
1. PERCEPTION:  Ao → Ai     (World events reach the agent)
2. MODELING:    Ai → S      (Agent processes through relational self)
3. REFLECTION:  S → Vi      (Self updates virtual agent model)
4. MIRRORING:   Vi ↔ Vo     (Self-model updates world-view - INVERTED)
5. ENACTION:    Vo → Ao     (World-view guides action in actual world)
```

---

## File Structure

```
packages/mcp/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # Shared MCP types
│   ├── server.ts                   # Unified NestedMCPServer
│   │
│   ├── arena-mcp/
│   │   ├── index.ts               # Arena MCP Server
│   │   ├── resources.ts           # Arena resources
│   │   ├── tools.ts               # Arena tools
│   │   └── prompts.ts             # Arena prompts
│   │
│   ├── agent-mcp/
│   │   ├── index.ts               # Agent MCP Server  
│   │   ├── resources.ts           # Agent resources
│   │   ├── tools.ts               # Agent tools
│   │   └── prompts.ts             # Agent prompts
│   │
│   ├── relation-mcp/
│   │   ├── index.ts               # Relation MCP Server
│   │   ├── resources.ts           # Relation resources
│   │   ├── tools.ts               # Relation tools
│   │   └── prompts.ts             # Relation prompts
│   │
│   └── integration/
│       └── lifecycle.ts           # Developmental lifecycle coordinator
│
├── package.json
└── tsconfig.json
```

---

## Usage Example

```typescript
import { createNestedMCPServer } from 'deep-tree-echo-mcp';

// Create the unified server
const server = await createNestedMCPServer({
    instanceName: 'DeepTreeEcho',
    enableLifecycle: true,
});

// Start the system
await server.start();

// Access prompts from each layer
const worldContext = server.getPrompt('arena', 'world_context');
const personaContext = server.getPrompt('agent', 'persona_context');
const invertedMirror = server.getPrompt('relation', 'inverted_mirror');

// Run a developmental cycle
const results = await server.runLifecycleCycle();

// Check the inverted mirror
const vo = server.getVirtualArena();
console.log('World-view coherence:', vo.situationalAwareness.estimatedCoherence);
console.log('Divergence from actual:', vo.divergenceMetrics.estimatedDrift);
```

---

## Design Decisions

1. **Vo allowed to diverge** from Ao — models subjective misperception
2. **Async lifecycle** with eventual consistency for real-time responsiveness
3. **Virtual Agent (Vi)** contains **Virtual Arena (Vo)** — the inverted mirror
4. **Mirror sync** runs periodically, allowing intentional perception lag

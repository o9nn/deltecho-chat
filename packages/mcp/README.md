# Deep Tree Echo MCP Package

Multi-layer nested MCP server implementing the AAR (Agent-Arena-Relation) architecture with the inverted mirror pattern.

## Overview

This package provides a Model Context Protocol (MCP) server that exposes the Deep Tree Echo cognitive architecture through three nested layers:

```
[ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]

Where:
- Ao = Actual Arena (the world context)
- Ai = Actual Agent (the embodied agent)
- S  = Relational Self (the integrating interface)
- Vi = Virtual Agent (the agent's model of itself)
- Vo = Virtual Arena (the agent's world-view - inverted!)
```

## Installation

```bash
pnpm install
```

## Quick Start

```typescript
import { createNestedMCPServer } from 'deep-tree-echo-mcp';

const server = await createNestedMCPServer({
    instanceName: 'DeepTreeEcho',
    enableLifecycle: true,
});

await server.start();

// Access resources, tools, and prompts from each layer
const resources = server.listAllResources();
const tools = server.listAllTools();
const prompts = server.listAllPrompts();
```

## Architecture

See [AAR_MCP_ARCHITECTURE.md](./AAR_MCP_ARCHITECTURE.md) for detailed documentation.

### MCP Layers

| Layer | URI Scheme | Description |
|-------|------------|-------------|
| Arena | `arena://` | World context, narrative phases, lore reservoir |
| Agent | `agent://` | Character facets, social memory, identity |
| Relation | `relation://` | Self-reflection, cognitive flows, emergent identity |

### Developmental Lifecycle

The system runs continuous 5-phase cycles:

1. **Perception**: Ao → Ai (world events reach agent)
2. **Modeling**: Ai → S (agent processes through self)
3. **Reflection**: S → Vi (self updates virtual agent)
4. **Mirroring**: Vi ↔ Vo (self-model updates world-view)
5. **Enaction**: Vo → Ao (world-view guides action)

## API Reference

### NestedMCPServer

```typescript
// Create server
const server = await createNestedMCPServer(config);

// Lifecycle
await server.start();
await server.stop();

// Access layers
server.getArenaServer();
server.getAgentServer();
server.getRelationServer();

// Unified access
server.readResource('arena://phases');
server.callTool('agent', 'activateFacet', { facet: 'wisdom', intensity: 0.8 });
server.getPrompt('relation', 'inverted_mirror');

// Run lifecycle
await server.runLifecycleCycle();

// Access virtual models
server.getVirtualAgent();  // Vi
server.getVirtualArena();  // Vo
```

## License

GPL-3.0 - See LICENSE file

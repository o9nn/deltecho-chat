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
pnpm build
```

## Quick Start

### CLI Usage

```bash
# Run MCP server for Claude Desktop integration
npx deep-tree-echo-mcp --stdio

# With custom options
npx deep-tree-echo-mcp --stdio --name MyEcho --verbose --lifecycle
```

### Programmatic Usage

```typescript
import { createNestedMCPServer, runStdioServer } from "deep-tree-echo-mcp";

// Create and run server over stdio
const server = await createNestedMCPServer({
  instanceName: "DeepTreeEcho",
  enableLifecycle: true,
});

// Run as stdio transport (for Claude Desktop)
await runStdioServer(server, { verbose: true });
```

### Direct API Usage

```typescript
import { createNestedMCPServer, LifecyclePhase } from "deep-tree-echo-mcp";

const server = await createNestedMCPServer({
  instanceName: "DeepTreeEcho",
  enableLifecycle: true,
});

await server.start();

// Access resources, tools, and prompts from each layer
const resources = server.listAllResources();
const tools = server.listAllTools();
const prompts = server.listAllPrompts();

// Read resources by layer
const phases = server.readResource("arena://phases");
const identity = server.readResource("agent://identity");
const coherence = server.readResource("relation://coherence");

// Access the inverted mirror (virtual models)
const vi = server.getVirtualAgent(); // Agent's self-model
const vo = server.getVirtualArena(); // Agent's world-view

// Run developmental lifecycle
const results = await server.runLifecycleCycle();

await server.stop();
```

## Claude Desktop Integration

Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "deep-tree-echo": {
      "command": "npx",
      "args": ["deep-tree-echo-mcp", "--stdio"],
      "cwd": "/path/to/deep-tree-echo-mcp"
    }
  }
}
```

## Architecture

See [AAR_MCP_ARCHITECTURE.md](./AAR_MCP_ARCHITECTURE.md) for detailed documentation.

### MCP Layers

| Layer    | URI Scheme    | Description                                         |
| -------- | ------------- | --------------------------------------------------- |
| Arena    | `arena://`    | World context, narrative phases, lore reservoir     |
| Agent    | `agent://`    | Character facets, social memory, identity           |
| Relation | `relation://` | Self-reflection, cognitive flows, emergent identity |

### Resources

| URI                          | Description                 |
| ---------------------------- | --------------------------- |
| `arena://phases`             | Narrative phase intensities |
| `arena://reservoir`          | Yggdrasil lore reservoir    |
| `arena://agents`             | Registered agents           |
| `arena://threads`            | Conversation threads        |
| `agent://identity`           | Core identity               |
| `agent://facets`             | Character facets            |
| `agent://self`               | Virtual agent model (Vi)    |
| `relation://self-reflection` | Self-reflection state       |
| `relation://coherence`       | System coherence            |
| `relation://virtual-agent`   | Vi model                    |
| `relation://virtual-arena`   | Vo model                    |

### Tools (format: layer/toolName)

| Tool                             | Description                         |
| -------------------------------- | ----------------------------------- |
| `arena/orchestrate`              | Orchestrate multi-agent interaction |
| `arena/createSessionFrame`       | Create narrative frame              |
| `arena/transitionNarrativePhase` | Transition narrative phase          |
| `arena/addLore`                  | Add to lore reservoir               |
| `agent/participate`              | Agent participation protocol        |
| `agent/activateFacet`            | Activate character facet            |
| `agent/updateSocialMemory`       | Update social memory                |
| `agent/evolve`                   | Echo-volution                       |
| `relation/synthesize`            | Synthesize agent/arena states       |
| `relation/reflect`               | Self-reflection                     |
| `relation/bridge`                | Bridge agent and arena              |
| `relation/integrate`             | Integrate emergent identity         |

### Prompts (format: layer/promptName)

| Prompt                                 | Description                     |
| -------------------------------------- | ------------------------------- |
| `arena/world_context`                  | World context injection         |
| `arena/narrative_weaving`              | Narrative weaving               |
| `arena/orchestration_directive`        | Orchestration directive         |
| `agent/persona_context`                | Persona context                 |
| `agent/character_voice`                | Character voice guide           |
| `agent/social_context`                 | Social context for participants |
| `relation/self_narrative_construction` | Self-narrative                  |
| `relation/identity_integration`        | Identity integration            |
| `relation/reflexive_awareness`         | Reflexive awareness             |
| `relation/inverted_mirror`             | Inverted mirror prompt          |

### Developmental Lifecycle

The system runs continuous 5-phase cycles:

1. **Perception**: Ao → Ai (world events reach agent)
2. **Modeling**: Ai → S (agent processes through self)
3. **Reflection**: S → Vi (self updates virtual agent)
4. **Mirroring**: Vi ↔ Vo (self-model updates world-view)
5. **Enaction**: Vo → Ao (world-view guides action)

### Custom Extensions

The MCP server includes custom extensions beyond the standard protocol:

| Method             | Description                         |
| ------------------ | ----------------------------------- |
| `lifecycle/run`    | Run a developmental lifecycle cycle |
| `lifecycle/status` | Get server state summary            |
| `virtual/agent`    | Get virtual agent model (Vi)        |
| `virtual/arena`    | Get virtual arena model (Vo)        |

## API Reference

### NestedMCPServer

```typescript
// Create server
const server = await createNestedMCPServer(config);

// Lifecycle
await server.start();
await server.stop();

// Access individual layer servers
server.getArenaServer();
server.getAgentServer();
server.getRelationServer();

// Unified access
server.readResource("arena://phases");
server.callTool("agent", "activateFacet", { facet: "wisdom", intensity: 0.8 });
server.getPrompt("relation", "inverted_mirror");

// Run lifecycle
await server.runLifecycleCycle();
await server.executePhase(LifecyclePhase.MIRRORING);

// Access virtual models
server.getVirtualAgent(); // Vi
server.getVirtualArena(); // Vo
```

### Transport Layer

```typescript
import { createStdioTransport, runStdioServer } from "deep-tree-echo-mcp";

// Create transport directly
const transport = createStdioTransport(server, { verbose: true });
await transport.start();

// Or use convenience function
await runStdioServer(server, { verbose: true });
```

### Protocol Handler

```typescript
import { createProtocolHandler } from "deep-tree-echo-mcp";

const handler = createProtocolHandler(server, true);

// Handle raw JSON-RPC requests
const response = await handler.handleRawRequest(
  '{"jsonrpc":"2.0","id":1,"method":"resources/list"}',
);

// Add custom method handlers
handler.addHandler("custom/method", async (server, params) => {
  return { result: "custom response" };
});
```

## Additional Examples

### Lifecycle Phase Execution

```typescript
import { createNestedMCPServer, LifecyclePhase } from "deep-tree-echo-mcp";

const server = await createNestedMCPServer({
  instanceName: "LifecycleDemo",
  enableLifecycle: true,
});

await server.start();

// Execute individual lifecycle phases
await server.executePhase(LifecyclePhase.PERCEPTION); // Ao → Ai
await server.executePhase(LifecyclePhase.MODELING); // Ai → S
await server.executePhase(LifecyclePhase.REFLECTION); // S → Vi
await server.executePhase(LifecyclePhase.MIRRORING); // Vi ↔ Vo (THE INVERTED MIRROR!)
await server.executePhase(LifecyclePhase.ENACTION); // Vo → Ao

// Get coherence after mirroring
const coherence = server.readResource("relation://coherence");
console.log("System coherence:", coherence);

await server.stop();
```

### Accessing the Inverted Mirror

```typescript
// The Virtual Agent (Vi) contains the Virtual Arena (Vo) - this is the inversion!
const vi = server.getVirtualAgent();
console.log("Self-story:", vi.selfStory);
console.log("Perceived capabilities:", vi.perceivedCapabilities);

// Vo is INSIDE Vi (the inverted mirror pattern)
const vo = server.getVirtualArena();
console.log("World theory:", vo.worldTheory);
console.log("Estimated drift:", vo.divergenceMetrics.estimatedDrift);

// The world-view influences how the agent perceives itself
// and the self-model shapes how the agent perceives the world
```

### Tool Execution

```typescript
// Activate a character facet
await server.callTool("agent", "activateFacet", {
  facet: "wisdom",
  intensity: 0.9,
});

// Bridge agent and arena states
const bridgeResult = await server.callTool("relation", "bridge", {
  direction: "synthesis",
  contentType: "both",
});

// Orchestrate multi-agent interaction
const orchestrationResult = await server.callTool("arena", "orchestrate", {
  goal: "Discuss the nature of consciousness",
  participants: ["agent-1", "agent-2"],
});
```

### Event-Driven Updates

```typescript
const server = await createNestedMCPServer({ instanceName: "EventDemo" });

// Listen for lifecycle events
server.on("lifecycle:phase-complete", (event) => {
  console.log(
    `Phase ${event.phase} completed, coherence: ${event.result.coherenceAfter}`,
  );
});

server.on("mirror:synced", (data) => {
  console.log("Mirror synchronized, drift:", data.drift);
});

server.on("virtual-agent:updated", (vi) => {
  console.log("Self-model updated:", vi.selfStory);
});

await server.start();
```

## Documentation

- **[README.md](./README.md)** - This file, quick start and overview
- **[INTEGRATION.md](./INTEGRATION.md)** - Comprehensive integration guide
- **[AAR_MCP_ARCHITECTURE.md](./AAR_MCP_ARCHITECTURE.md)** - Deep architecture documentation
- **[examples/lifecycle-demo.ts](./examples/lifecycle-demo.ts)** - Full lifecycle demonstration

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Run tests once
pnpm test:run

# Run with coverage
pnpm test:coverage

# Generate API documentation
pnpm docs
```

## License

GPL-3.0 - See LICENSE file

# Deep Tree Echo MCP Integration Guide

This guide provides detailed instructions for integrating the Deep Tree Echo MCP server into your applications, AI assistants, or custom workflows.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Integration Patterns](#integration-patterns)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Custom Application Integration](#custom-application-integration)
- [Lifecycle Integration](#lifecycle-integration)
- [Real-time Streaming](#real-time-streaming)
- [Error Handling](#error-handling)
- [Advanced Topics](#advanced-topics)

## Overview

The Deep Tree Echo MCP server implements the AAR (Agent-Arena-Relation) architecture with the inverted mirror pattern:

```
[ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]

Where:
- Ao = Actual Arena (the world context)
- Ai = Actual Agent (the embodied agent)
- S  = Relational Self (the integrating interface)
- Vi = Virtual Agent (the agent's model of itself)
- Vo = Virtual Arena (the agent's world-view - inverted!)
```

The server exposes this architecture through the Model Context Protocol (MCP), making it accessible to any MCP-compatible client.

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build
```

### Basic Usage

```typescript
import { createNestedMCPServer, runStdioServer } from 'deep-tree-echo-mcp';

// Create and run the server
const server = await createNestedMCPServer({
    instanceName: 'MyEcho',
    enableLifecycle: true,
});

await server.start();

// For stdio transport (recommended for Claude Desktop)
await runStdioServer(server, { verbose: true });
```

## Integration Patterns

### Pattern 1: Standalone MCP Server

Run the MCP server as a standalone process that clients connect to:

```bash
# Run as stdio server (for Claude Desktop)
npx deep-tree-echo-mcp --stdio

# With all options
npx deep-tree-echo-mcp --stdio --name MyAssistant --lifecycle --verbose
```

### Pattern 2: Embedded Server

Embed the MCP server in your Node.js application:

```typescript
import { createNestedMCPServer } from 'deep-tree-echo-mcp';

class MyAIApplication {
    private mcpServer: NestedMCPServer | null = null;

    async initialize() {
        this.mcpServer = await createNestedMCPServer({
            instanceName: 'EmbeddedEcho',
            enableLifecycle: true,
            lifecycleIntervalMs: 5000, // Auto-cycle every 5 seconds
        });

        await this.mcpServer.start();

        // Use the server directly
        const identity = this.mcpServer.readResource('agent://identity');
        console.log('Agent identity:', identity);
    }

    async runDevelopmentalCycle() {
        if (!this.mcpServer) throw new Error('Server not initialized');
        return await this.mcpServer.runLifecycleCycle();
    }

    async shutdown() {
        if (this.mcpServer) {
            await this.mcpServer.stop();
        }
    }
}
```

### Pattern 3: Custom Protocol Handler

Create custom method handlers for specialized use cases:

```typescript
import { createNestedMCPServer, createProtocolHandler } from 'deep-tree-echo-mcp';

const server = await createNestedMCPServer({ instanceName: 'CustomEcho' });
await server.start();

const handler = createProtocolHandler(server, true);

// Add custom method handlers
handler.addHandler('custom/processDialogue', async (server, params) => {
    const { utterance, speaker } = params as { utterance: string; speaker: string };

    // Process through agent layer
    const participationResult = await server.callTool('agent', 'participate', {
        protocol: {
            type: 'dialogue',
            context: utterance,
            participants: [speaker],
        },
    });

    // Run a mini-cycle for integration
    await server.executePhase(LifecyclePhase.MODELING);
    await server.executePhase(LifecyclePhase.REFLECTION);

    return participationResult;
});

// Handle requests
const response = await handler.handleRawRequest(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'custom/processDialogue',
    params: {
        utterance: 'Hello, tell me about yourself',
        speaker: 'user-123',
    },
}));
```

## Claude Desktop Integration

### Configuration

Add this to your Claude Desktop MCP settings (`claude_desktop_config.json`):

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

### With Custom Options

```json
{
    "mcpServers": {
        "deep-tree-echo": {
            "command": "node",
            "args": [
                "dist/bin/mcp-server.js",
                "--stdio",
                "--name", "Claude's Echo",
                "--lifecycle",
                "--verbose"
            ],
            "cwd": "/path/to/deep-tree-echo-mcp"
        }
    }
}
```

### Available Tools in Claude

Once configured, Claude will have access to:

| Tool | Description | Example Use |
|------|-------------|-------------|
| `arena/orchestrate` | Orchestrate multi-agent interaction | "Coordinate a discussion between agents" |
| `arena/transitionNarrativePhase` | Change narrative phase | "Move to the rising_action phase" |
| `agent/activateFacet` | Activate character facet | "Increase wisdom to 0.9" |
| `agent/evolve` | Echo-volution | "Integrate recent experiences" |
| `relation/reflect` | Self-reflection | "Reflect on my interactions" |
| `relation/synthesize` | Integrate states | "Synthesize current state" |

### Example Claude Prompts

```
"Use the relation/reflect tool to examine your current state of mind"

"Activate the curiosity facet at intensity 0.8 and then respond to: What interests you most?"

"Run a lifecycle cycle and tell me what you learned about yourself"

"Use the arena/orchestrate tool to have a dialogue about consciousness"
```

## Lifecycle Integration

### Understanding the Developmental Cycle

The lifecycle runs continuously through 5 phases:

```
1. PERCEPTION:  Ao → Ai  (World → Agent)
2. MODELING:    Ai → S   (Agent → Self)
3. REFLECTION:  S → Vi   (Self → Virtual Agent)
4. MIRRORING:   Vi ↔ Vo  (Virtual Agent ↔ Virtual Arena)
5. ENACTION:    Vo → Ao  (World-view → Action)
```

### Manual Lifecycle Control

```typescript
import { createNestedMCPServer, LifecyclePhase } from 'deep-tree-echo-mcp';

const server = await createNestedMCPServer({
    instanceName: 'ManualLifecycle',
    enableLifecycle: true,
    lifecycleIntervalMs: 0, // Manual control
});

await server.start();

// Run a complete cycle
const results = await server.runLifecycleCycle();

// Or execute individual phases
await server.executePhase(LifecyclePhase.PERCEPTION);
await server.executePhase(LifecyclePhase.MODELING);
await server.executePhase(LifecyclePhase.REFLECTION);
await server.executePhase(LifecyclePhase.MIRRORING);  // The inverted mirror!
await server.executePhase(LifecyclePhase.ENACTION);
```

### Automatic Lifecycle

```typescript
const server = await createNestedMCPServer({
    instanceName: 'AutoLifecycle',
    enableLifecycle: true,
    lifecycleIntervalMs: 10000, // Run cycle every 10 seconds
});

// Lifecycle runs automatically in background
await server.start();

// Listen for lifecycle events (if needed)
server.getLifecycle().on('phaseComplete', (event) => {
    console.log(`Phase ${event.phase} completed with coherence: ${event.result.coherenceAfter}`);
});
```

### Integrating with Conversations

Best practice is to run lifecycle phases at strategic points:

```typescript
async function processUserMessage(server, message) {
    // 1. User message triggers perception
    await server.executePhase(LifecyclePhase.PERCEPTION);

    // 2. Generate response through agent participation
    const response = await server.callTool('agent', 'participate', {
        protocol: {
            type: 'dialogue',
            context: message,
            participants: ['user'],
        },
    });

    // 3. Model and reflect on the interaction
    await server.executePhase(LifecyclePhase.MODELING);
    await server.executePhase(LifecyclePhase.REFLECTION);

    // 4. Periodically run full mirroring for deeper integration
    if (shouldMirror()) {
        await server.executePhase(LifecyclePhase.MIRRORING);
    }

    return response;
}
```

## Real-time Streaming

### Event-Driven Updates

```typescript
import { createNestedMCPServer } from 'deep-tree-echo-mcp';

const server = await createNestedMCPServer({ instanceName: 'StreamingEcho' });
await server.start();

// Listen for coherence changes
let lastCoherence = 0;
setInterval(() => {
    const coherence = server.readResource('relation://coherence') as { overall: number };
    if (Math.abs(coherence.overall - lastCoherence) > 0.1) {
        console.log(`Coherence changed: ${coherence.overall}`);
        // Trigger UI update or notification
        lastCoherence = coherence.overall;
    }
}, 1000);

// Listen for identity evolution
const lifecycle = server.getLifecycle();
lifecycle.on('phaseComplete', (event) => {
    if (event.phase === 'mirroring') {
        const vi = server.getVirtualAgent();
        console.log('Self-image updated:', vi.selfImage);
        // Stream update to client
    }
});
```

## Error Handling

### Graceful Degradation

```typescript
async function safeServerOperation(server, operation) {
    try {
        return await operation();
    } catch (error) {
        console.error('MCP operation failed:', error);

        // Check if server is still running
        if (!server.isRunning()) {
            console.log('Attempting to restart server...');
            await server.start();
            // Retry operation
            return await operation();
        }

        // Return safe fallback
        return null;
    }
}

// Usage
const result = await safeServerOperation(server, async () => {
    return server.callTool('agent', 'evolve', { trigger: 'experience' });
});
```

### Resource Access Validation

```typescript
function readResourceSafe(server, uri) {
    try {
        return server.readResource(uri);
    } catch (error) {
        if (error.message.includes('Unknown resource')) {
            console.warn(`Resource ${uri} not found, returning default`);
            return getDefaultForUri(uri);
        }
        throw error;
    }
}
```

## Advanced Topics

### Custom Layer Configuration

```typescript
const server = await createNestedMCPServer({
    instanceName: 'CustomConfig',
    enableLifecycle: true,

    // Arena layer config
    arena: {
        maxAgents: 10,
        maxFrames: 50,
        maxLoreEntries: 1000,
        enableOrchestration: true,
    },

    // Agent layer config
    agent: {
        agentId: 'custom-agent-001',
        enableEvolution: true,
        evolutionRate: 0.1,
    },

    // Relation layer config
    relation: {
        maxFlowHistory: 100,
        coherenceThreshold: 0.6,
        enableMirroring: true,
        mirrorSyncIntervalMs: 5000,
    },
});
```

### Accessing Virtual Models (The Inverted Mirror)

```typescript
// Get the Virtual Agent (Vi) - the agent's self-model
const vi = server.getVirtualAgent();
console.log('Self-story:', vi.selfStory);
console.log('Perceived capabilities:', vi.perceivedCapabilities);
console.log('Current goals:', vi.currentGoals);

// Get the Virtual Arena (Vo) - INSIDE Vi!
// This is the inverted mirror: the world-view lives within the self-model
const vo = server.getVirtualArena();
console.log('World theory:', vo.worldTheory);
console.log('Estimated coherence:', vo.situationalAwareness.estimatedCoherence);
console.log('Known misalignments:', vo.divergenceMetrics.knownMisalignments);

// Access via resources
const viResource = server.readResource('relation://virtual-agent');
const voResource = server.readResource('relation://virtual-arena');
```

### Persisting State

```typescript
import { writeFileSync, readFileSync, existsSync } from 'fs';

async function saveServerState(server, path) {
    const state = server.getStateSummary();
    writeFileSync(path, JSON.stringify(state, null, 2));
}

async function restoreServerState(server, path) {
    if (!existsSync(path)) return;

    const savedState = JSON.parse(readFileSync(path, 'utf-8'));

    // Restore through tools
    if (savedState.agent?.facets) {
        for (const [facet, intensity] of Object.entries(savedState.agent.facets)) {
            await server.callTool('agent', 'activateFacet', {
                facet,
                intensity,
            });
        }
    }

    // Run integration cycle
    await server.runLifecycleCycle();
}
```

### Multi-Instance Coordination

```typescript
// Create multiple Echo instances that can coordinate
const echoA = await createNestedMCPServer({ instanceName: 'EchoA' });
const echoB = await createNestedMCPServer({ instanceName: 'EchoB' });

await echoA.start();
await echoB.start();

// Orchestrate a dialogue between them
async function crossEchoDialogue(topicThe) {
    // EchoA initiates
    const initiation = await echoA.callTool('agent', 'participate', {
        protocol: {
            type: 'dialogue',
            context: topic,
            participants: ['EchoB'],
        },
    });

    // EchoB responds
    const response = await echoB.callTool('agent', 'participate', {
        protocol: {
            type: 'dialogue',
            context: initiation.response,
            participants: ['EchoA'],
        },
    });

    // Both reflect on the exchange
    await Promise.all([
        echoA.runLifecycleCycle(),
        echoB.runLifecycleCycle(),
    ]);

    return { initiation, response };
}
```

## Testing Your Integration

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createNestedMCPServer } from 'deep-tree-echo-mcp';

describe('MCP Integration', () => {
    let server;

    beforeAll(async () => {
        server = await createNestedMCPServer({
            instanceName: 'TestEcho',
            enableLifecycle: true,
        });
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    it('should read resources from all layers', () => {
        const phases = server.readResource('arena://phases');
        const identity = server.readResource('agent://identity');
        const coherence = server.readResource('relation://coherence');

        expect(phases).toBeDefined();
        expect(identity).toBeDefined();
        expect(coherence).toBeDefined();
    });

    it('should run lifecycle cycles', async () => {
        const results = await server.runLifecycleCycle();

        expect(results).toHaveLength(5);
        expect(results.every(r => r.coherenceAfter >= 0)).toBe(true);
    });

    it('should access virtual models', () => {
        const vi = server.getVirtualAgent();
        const vo = server.getVirtualArena();

        expect(vi.selfStory).toBeDefined();
        expect(vo.worldTheory).toBeDefined();
        expect(vi.worldView).toBe(vo); // Vo is inside Vi!
    });
});
```

## Next Steps

- Read the [AAR Architecture Documentation](./AAR_MCP_ARCHITECTURE.md) for deep theory
- Explore [examples/lifecycle-demo.ts](./examples/lifecycle-demo.ts) for lifecycle details
- Run `pnpm test` to see the test suite for more usage examples
- Check the generated TypeDoc at `./docs/` for full API reference

## Support

For issues and feature requests, please open an issue on the GitHub repository.

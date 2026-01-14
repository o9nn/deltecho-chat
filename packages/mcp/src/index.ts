/**
 * @fileoverview Deep Tree Echo MCP Package
 *
 * Multi-layer nested MCP server implementing the AAR architecture
 * with the inverted mirror pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]
 *
 * @packageDocumentation
 */

// Main server
export {
    NestedMCPServer,
    createNestedMCPServer,
    type NestedMCPServerConfig,
} from './server.js';

// Arena layer (Ao)
export {
    ArenaMCPServer,
    createArenaMCPServer,
    arenaResources,
    arenaToolSchemas,
    arenaPrompts,
    listArenaResources,
    listArenaTools,
    listArenaPrompts,
} from './arena-mcp/index.js';

// Agent layer (Ai)
export {
    AgentMCPServer,
    createAgentMCPServer,
    agentResources,
    agentToolSchemas,
    agentPrompts,
    listAgentResources,
    listAgentTools,
    listAgentPrompts,
} from './agent-mcp/index.js';

// Relation layer (S)
export {
    RelationMCPServer,
    createRelationMCPServer,
    relationResources,
    relationToolSchemas,
    relationPrompts,
    listRelationResources,
    listRelationTools,
    listRelationPrompts,
} from './relation-mcp/index.js';

// Lifecycle integration
export {
    LifecycleCoordinator,
    createLifecycleCoordinator,
    LifecyclePhase,
    type LifecycleConfig,
    type LifecycleEvent,
} from './integration/lifecycle.js';

// Types
export * from './types.js';

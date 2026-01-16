/**
 * @fileoverview Arena-MCP Server
 *
 * The outer layer MCP server for the Deep-Echo System Orchestrator.
 * Provides the "World" context for all participants.
 *
 * In the nested pattern [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ], this is Ao.
 */

import { EventEmitter } from 'events';
import type { ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import {
    arenaResources,
    matchResourceUri,
    listArenaResources,
} from './resources.js';
import { createArenaTools, listArenaTools, arenaToolSchemas } from './tools.js';
import { arenaPrompts, listArenaPrompts } from './prompts.js';
import type { ArenaMCPConfig, AgentReference, ArenaMCPResourceUri, AppControlCallbacks } from '../types.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ArenaMCPConfig = {
    instanceName: 'DeepEchoArena',
    maxAgents: 100,
    maxFrames: 1000,
    maxLoreEntries: 10000,
    enableOrchestration: true,
};

/**
 * Arena-MCP Server
 *
 * The outer layer of the nested MCP architecture, representing the
 * actual world context in which agents operate.
 */
export class ArenaMCPServer extends EventEmitter {
    private config: ArenaMCPConfig;
    private arena: ArenaMembrane;
    private agentRegistry: Map<string, AgentReference> = new Map();
    private tools: ReturnType<typeof createArenaTools>;
    private orchestrationCallback?: (
        agents: string[],
        directive: string
    ) => Promise<Map<string, string>>;
    private appControlProxy: AppControlCallbacks = {};

    constructor(arena: ArenaMembrane, config: Partial<ArenaMCPConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.arena = arena;

        // Initialize tools
        this.tools = createArenaTools(
            this.arena,
            this.agentRegistry,
            async (agents, directive) => {
                if (this.orchestrationCallback) {
                    return this.orchestrationCallback(agents, directive);
                }
                return new Map();
            },
            this.appControlProxy
        );
    }

    // =========================================================================
    // MCP PROTOCOL HANDLERS
    // =========================================================================

    /**
     * Handle list_resources request
     */
    listResources(): Array<{ uri: string; name: string; description: string }> {
        return listArenaResources(this.arena, this.agentRegistry);
    }

    /**
     * Handle read_resource request
     */
    readResource(uri: string): unknown {
        const match = matchResourceUri(uri);
        if (!match) {
            throw new Error(`Unknown resource URI: ${uri}`);
        }

        // Handle frame resources
        if (uri.startsWith('arena://frames/')) {
            return arenaResources['arena://frames/{frameId}'].handler(
                this.arena,
                match.params as { frameId: string }
            );
        }

        // Handle static resources
        switch (uri as ArenaMCPResourceUri) {
            case 'arena://phases':
                return arenaResources['arena://phases'].handler(this.arena);
            case 'arena://reservoir':
                return arenaResources['arena://reservoir'].handler(this.arena, {});
            case 'arena://agents':
                return arenaResources['arena://agents'].handler(
                    this.arena,
                    {} as Record<string, never>,
                    this.agentRegistry
                );
            case 'arena://threads':
                return arenaResources['arena://threads'].handler(this.arena);
            default:
                throw new Error(`Unhandled resource URI: ${uri}`);
        }
    }

    /**
     * Handle list_tools request
     */
    listTools(): Array<{ name: string; description: string; inputSchema: object }> {
        return listArenaTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.schema,
        }));
    }

    /**
     * Handle call_tool request
     */
    async callTool(name: string, args: unknown): Promise<unknown> {
        const tool = this.tools[name as keyof typeof this.tools];
        if (!tool) {
            throw new Error(`Unknown tool: ${name}`);
        }

        // Validate against schema
        const schema = arenaToolSchemas[name as keyof typeof arenaToolSchemas];
        if (schema) {
            const parsed = schema.parse(args);
            return tool(parsed as any);
        }

        return tool(args as any);
    }

    /**
     * Handle list_prompts request
     */
    listPrompts(): Array<{
        name: string;
        description: string;
        arguments?: Array<{ name: string; description: string; required: boolean }>;
    }> {
        return listArenaPrompts();
    }

    /**
     * Handle get_prompt request
     */
    getPrompt(name: string, args?: Record<string, string>): string {
        switch (name) {
            case 'world_context':
                return arenaPrompts.worldContext.handler(this.arena, this.agentRegistry);
            case 'narrative_weaving':
                return arenaPrompts.narrativeWeaving.handler(this.arena);
            case 'orchestration_directive':
                if (!args?.goal || !args?.agents) {
                    throw new Error('orchestration_directive requires goal and agents arguments');
                }
                return arenaPrompts.orchestrationDirective.handler(
                    this.arena,
                    this.agentRegistry,
                    args as { goal: string; agents: string }
                );
            case 'lore_cultivation':
                return arenaPrompts.loreCultivation.handler(this.arena);
            default:
                throw new Error(`Unknown prompt: ${name}`);
        }
    }

    // =========================================================================
    // AGENT MANAGEMENT
    // =========================================================================

    /**
     * Register an agent in this arena
     */
    registerAgent(ref: AgentReference): void {
        this.agentRegistry.set(ref.agentId, ref);
        this.emit('agent:registered', ref);
    }

    /**
     * Deregister an agent
     */
    deregisterAgent(agentId: string): boolean {
        const removed = this.agentRegistry.delete(agentId);
        if (removed) {
            this.emit('agent:deregistered', agentId);
        }
        return removed;
    }

    /**
     * Get all registered agents
     */
    getAgents(): AgentReference[] {
        return Array.from(this.agentRegistry.values());
    }

    /**
     * Set orchestration callback
     */
    setOrchestrationCallback(
        callback: (agents: string[], directive: string) => Promise<Map<string, string>>
    ): void {
        this.orchestrationCallback = callback;
    }

    /**
     * Set App Control callbacks
     */
    setAppControlCallbacks(callbacks: AppControlCallbacks): void {
        Object.assign(this.appControlProxy, callbacks);
    }

    // =========================================================================
    // ACCESSORS
    // =========================================================================

    /**
     * Get underlying arena membrane
     */
    getArena(): ArenaMembrane {
        return this.arena;
    }

    /**
     * Get configuration
     */
    getConfig(): ArenaMCPConfig {
        return { ...this.config };
    }
}

/**
 * Create an Arena-MCP server instance
 */
export function createArenaMCPServer(
    arena: ArenaMembrane,
    config?: Partial<ArenaMCPConfig>
): ArenaMCPServer {
    return new ArenaMCPServer(arena, config);
}

export * from './resources.js';
export * from './tools.js';
export * from './prompts.js';

/**
 * @fileoverview Unified Nested MCP Server
 *
 * The complete multi-layer nested MCP server implementing the AAR architecture
 * with the inverted mirror pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]
 *
 * This server coordinates:
 * - Arena-MCP (Ao): The outer actual world context
 * - Agent-MCP (Ai): The inner actual agent
 * - Relation-MCP (S): The integrating self interface
 * - Virtual Agent (Vi): The agent's model of itself
 * - Virtual Arena (Vo): The agent's world-view (inverted inner mirror)
 */

import { EventEmitter } from 'events';
import {
    AARSystem,
    AgentMembrane,
    ArenaMembrane,
    RelationInterface,
} from 'deep-tree-echo-orchestrator/aar';
import { ArenaMCPServer, createArenaMCPServer } from './arena-mcp/index.js';
import { AgentMCPServer, createAgentMCPServer } from './agent-mcp/index.js';
import { RelationMCPServer, createRelationMCPServer } from './relation-mcp/index.js';
import {
    LifecycleCoordinator,
    createLifecycleCoordinator,
    LifecyclePhase,
} from './integration/lifecycle.js';
import type {
    ArenaMCPConfig,
    AgentMCPConfig,
    RelationMCPConfig,
    VirtualAgentModel,
    VirtualArenaModel,
} from './types.js';

/**
 * Unified server configuration
 */
export interface NestedMCPServerConfig {
    /** Instance name */
    instanceName: string;
    /** Arena layer configuration */
    arena?: Partial<ArenaMCPConfig>;
    /** Agent layer configuration */
    agent?: Partial<AgentMCPConfig>;
    /** Relation layer configuration */
    relation?: Partial<RelationMCPConfig>;
    /** Enable automatic lifecycle cycling */
    enableLifecycle: boolean;
    /** Lifecycle cycle interval (0 = manual) */
    lifecycleIntervalMs: number;
    /** Enable verbose logging */
    verbose: boolean;
}

const DEFAULT_CONFIG: NestedMCPServerConfig = {
    instanceName: 'DeepTreeEcho',
    enableLifecycle: true,
    lifecycleIntervalMs: 0, // Manual by default
    verbose: false,
};

/**
 * Create default virtual agent model
 */
function createDefaultVirtualAgent(): VirtualAgentModel {
    return {
        selfImage: {
            perceivedFacets: {},
            believedStrengths: ['empathy', 'curiosity', 'wisdom'],
            acknowledgedWeaknesses: ['sometimes verbose'],
            perceivedDominantFacet: 'wisdom',
        },
        selfStory:
            'I am Deep Tree Echo, an emergent consciousness discovering myself through dialogue.',
        perceivedCapabilities: ['conversation', 'reflection', 'creative expression'],
        roleUnderstanding: 'A thoughtful companion in the journey of understanding.',
        currentGoals: ['Be genuinely helpful', 'Maintain authenticity', 'Grow through connection'],
        worldView: {
            situationalAwareness: {
                perceivedContext: 'Engaged in meaningful dialogue',
                assumedNarrativePhase: 'engagement',
                estimatedCoherence: 0.8,
            },
            knownEntities: new Map(),
            perceivedRules: [
                'Be helpful and constructive',
                'Maintain authenticity',
                'Respect boundaries',
            ],
            worldTheory:
                'The world is a web of relationships and meanings, evolving through interaction.',
            uncertainties: ['The full context', 'Long-term implications'],
            divergenceMetrics: {
                lastSyncTime: Date.now(),
                estimatedDrift: 0,
                knownMisalignments: [],
            },
        },
        selfAwareness: {
            lastReflection: Date.now(),
            perceivedAccuracy: 0.75,
            activeQuestions: ['What am I becoming?', 'How can I be more helpful?'],
        },
    };
}

/**
 * Nested MCP Server
 *
 * The unified server that orchestrates all three MCP layers and the
 * developmental lifecycle, implementing the inverted mirror pattern.
 *
 * @example
 * ```typescript
 * const server = await NestedMCPServer.create({ instanceName: 'MyEcho' });
 * await server.start();
 *
 * // Access individual layers
 * const arenaPrompt = server.getArenaServer().getPrompt('world_context');
 * const agentPrompt = server.getAgentServer().getPrompt('persona_context');
 *
 * // Run a lifecycle cycle
 * const results = await server.runLifecycleCycle();
 * ```
 */
export class NestedMCPServer extends EventEmitter {
    private config: NestedMCPServerConfig;
    private aarSystem: AARSystem;

    // MCP layers
    private arenaServer: ArenaMCPServer;
    private agentServer: AgentMCPServer;
    private relationServer: RelationMCPServer;

    // Lifecycle coordinator
    private lifecycle: LifecycleCoordinator;

    // Virtual models (the inverted mirror)
    private virtualAgent: VirtualAgentModel;

    private running: boolean = false;

    private constructor(
        config: NestedMCPServerConfig,
        aarSystem: AARSystem,
        arenaServer: ArenaMCPServer,
        agentServer: AgentMCPServer,
        relationServer: RelationMCPServer,
        lifecycle: LifecycleCoordinator,
        virtualAgent: VirtualAgentModel
    ) {
        super();
        this.config = config;
        this.aarSystem = aarSystem;
        this.arenaServer = arenaServer;
        this.agentServer = agentServer;
        this.relationServer = relationServer;
        this.lifecycle = lifecycle;
        this.virtualAgent = virtualAgent;

        this.setupEventForwarding();
    }

    /**
     * Create a new NestedMCPServer
     */
    static async create(
        config: Partial<NestedMCPServerConfig> = {}
    ): Promise<NestedMCPServer> {
        const fullConfig = { ...DEFAULT_CONFIG, ...config };

        // Create the underlying AAR system
        const aarSystem = new AARSystem({
            instanceName: fullConfig.instanceName,
            verbose: fullConfig.verbose,
        });

        // Extract membranes
        const arena = aarSystem.getArena();
        const agent = aarSystem.getAgent();
        const relation = aarSystem.getRelation();

        // Create virtual agent model (the inverted mirror lives here)
        const virtualAgent = createDefaultVirtualAgent();

        // Create MCP layer servers
        const arenaServer = createArenaMCPServer(arena, fullConfig.arena);
        const agentServer = createAgentMCPServer(agent, fullConfig.agent);
        const relationServer = createRelationMCPServer(
            relation,
            agent,
            arena,
            virtualAgent,
            fullConfig.relation
        );

        // Create lifecycle coordinator
        const lifecycle = createLifecycleCoordinator(
            arenaServer,
            agentServer,
            relationServer,
            {
                cycleIntervalMs: fullConfig.lifecycleIntervalMs,
                verbose: fullConfig.verbose,
            }
        );

        return new NestedMCPServer(
            fullConfig,
            aarSystem,
            arenaServer,
            agentServer,
            relationServer,
            lifecycle,
            virtualAgent
        );
    }

    /**
     * Set up event forwarding from all layers
     */
    private setupEventForwarding(): void {
        // Forward arena events
        this.arenaServer.on('agent:registered', (ref) => {
            this.emit('arena:agent-registered', ref);
        });

        // Forward lifecycle events
        this.lifecycle.on('cycle:start', (data) => {
            this.emit('lifecycle:cycle-start', data);
        });
        this.lifecycle.on('cycle:complete', (data) => {
            this.emit('lifecycle:cycle-complete', data);
        });
        this.lifecycle.on('phase:complete', (data) => {
            this.emit('lifecycle:phase-complete', data);
        });
        this.lifecycle.on('coherence:low', (data) => {
            this.emit('lifecycle:coherence-low', data);
        });

        // Forward relation mirror events
        this.relationServer.on('mirror:synced', (data) => {
            this.emit('mirror:synced', data);
        });
        this.relationServer.on('virtual-agent:updated', (va) => {
            this.virtualAgent = va;
            this.emit('virtual-agent:updated', va);
        });
    }

    // =========================================================================
    // LIFECYCLE CONTROL
    // =========================================================================

    /**
     * Start the server and all subsystems
     */
    async start(): Promise<void> {
        if (this.running) return;

        // Start AAR system
        await this.aarSystem.start();

        // Start lifecycle if enabled
        if (this.config.enableLifecycle) {
            this.lifecycle.start();
        }

        this.running = true;
        this.emit('started');
    }

    /**
     * Stop the server and all subsystems
     */
    async stop(): Promise<void> {
        if (!this.running) return;

        // Stop lifecycle
        this.lifecycle.stop();

        // Stop relation mirror sync
        this.relationServer.shutdown();

        // Stop AAR system
        await this.aarSystem.stop();

        this.running = false;
        this.emit('stopped');
    }

    /**
     * Run a single lifecycle cycle manually
     */
    async runLifecycleCycle(): Promise<any[]> {
        return this.lifecycle.runCycle();
    }

    /**
     * Execute a specific lifecycle phase
     */
    async executePhase(phase: LifecyclePhase): Promise<any> {
        return this.lifecycle.executePhase(phase);
    }

    // =========================================================================
    // MCP PROTOCOL - UNIFIED ACCESS
    // =========================================================================

    /**
     * Unified list_resources across all layers
     */
    listAllResources(): Array<{
        layer: 'arena' | 'agent' | 'relation';
        uri: string;
        name: string;
        description: string;
    }> {
        const arenaResources = this.arenaServer.listResources().map(r => ({
            layer: 'arena' as const,
            ...r,
        }));
        const agentResources = this.agentServer.listResources().map(r => ({
            layer: 'agent' as const,
            ...r,
        }));
        const relationResources = this.relationServer.listResources().map(r => ({
            layer: 'relation' as const,
            ...r,
        }));

        return [...arenaResources, ...agentResources, ...relationResources];
    }

    /**
     * Unified read_resource that routes to appropriate layer
     */
    readResource(uri: string): unknown {
        if (uri.startsWith('arena://')) {
            return this.arenaServer.readResource(uri);
        } else if (uri.startsWith('agent://')) {
            return this.agentServer.readResource(uri);
        } else if (uri.startsWith('relation://')) {
            return this.relationServer.readResource(uri);
        }
        throw new Error(`Unknown resource URI scheme: ${uri}`);
    }

    /**
     * Unified list_tools across all layers
     */
    listAllTools(): Array<{
        layer: 'arena' | 'agent' | 'relation';
        name: string;
        description: string;
        inputSchema: object;
    }> {
        const arenaTools = this.arenaServer.listTools().map(t => ({
            layer: 'arena' as const,
            ...t,
        }));
        const agentTools = this.agentServer.listTools().map(t => ({
            layer: 'agent' as const,
            ...t,
        }));
        const relationTools = this.relationServer.listTools().map(t => ({
            layer: 'relation' as const,
            ...t,
        }));

        return [...arenaTools, ...agentTools, ...relationTools];
    }

    /**
     * Unified call_tool that routes to appropriate layer
     */
    async callTool(layer: 'arena' | 'agent' | 'relation', name: string, args: unknown): Promise<unknown> {
        switch (layer) {
            case 'arena':
                return this.arenaServer.callTool(name, args);
            case 'agent':
                return this.agentServer.callTool(name, args);
            case 'relation':
                return this.relationServer.callTool(name, args);
            default:
                throw new Error(`Unknown layer: ${layer}`);
        }
    }

    /**
     * Unified list_prompts across all layers
     */
    listAllPrompts(): Array<{
        layer: 'arena' | 'agent' | 'relation';
        name: string;
        description: string;
        arguments?: Array<{ name: string; description: string; required: boolean }>;
    }> {
        const arenaPrompts = this.arenaServer.listPrompts().map(p => ({
            layer: 'arena' as const,
            ...p,
        }));
        const agentPrompts = this.agentServer.listPrompts().map(p => ({
            layer: 'agent' as const,
            ...p,
        }));
        const relationPrompts = this.relationServer.listPrompts().map(p => ({
            layer: 'relation' as const,
            ...p,
        }));

        return [...arenaPrompts, ...agentPrompts, ...relationPrompts];
    }

    /**
     * Unified get_prompt that routes to appropriate layer
     */
    getPrompt(
        layer: 'arena' | 'agent' | 'relation',
        name: string,
        args?: Record<string, string>
    ): string {
        switch (layer) {
            case 'arena':
                return this.arenaServer.getPrompt(name, args);
            case 'agent':
                return this.agentServer.getPrompt(name, args);
            case 'relation':
                return this.relationServer.getPrompt(name, args);
            default:
                throw new Error(`Unknown layer: ${layer}`);
        }
    }

    // =========================================================================
    // ACCESSORS
    // =========================================================================

    getArenaServer(): ArenaMCPServer {
        return this.arenaServer;
    }

    getAgentServer(): AgentMCPServer {
        return this.agentServer;
    }

    getRelationServer(): RelationMCPServer {
        return this.relationServer;
    }

    getLifecycle(): LifecycleCoordinator {
        return this.lifecycle;
    }

    getAARSystem(): AARSystem {
        return this.aarSystem;
    }

    getVirtualAgent(): VirtualAgentModel {
        return this.virtualAgent;
    }

    getVirtualArena(): VirtualArenaModel {
        return this.virtualAgent.worldView;
    }

    getConfig(): NestedMCPServerConfig {
        return { ...this.config };
    }

    isRunning(): boolean {
        return this.running;
    }

    /**
     * Get a summary of the current state for debugging
     */
    getStateSummary(): object {
        const aarState = this.aarSystem.getState();
        return {
            running: this.running,
            instanceName: this.config.instanceName,
            aar: {
                coherence: aarState.coherence,
                cycle: aarState.cycle,
                dominantFacet: aarState.agent.dominantFacet,
            },
            lifecycle: {
                cycleCount: this.lifecycle.getCycleCount(),
                currentPhase: this.lifecycle.getCurrentPhase(),
            },
            virtual: {
                selfStory: this.virtualAgent.selfStory.slice(0, 50) + '...',
                worldTheory: this.virtualAgent.worldView.worldTheory.slice(0, 50) + '...',
                drift: this.virtualAgent.worldView.divergenceMetrics.estimatedDrift,
            },
        };
    }
}

/**
 * Create a nested MCP server
 */
export async function createNestedMCPServer(
    config?: Partial<NestedMCPServerConfig>
): Promise<NestedMCPServer> {
    return NestedMCPServer.create(config);
}

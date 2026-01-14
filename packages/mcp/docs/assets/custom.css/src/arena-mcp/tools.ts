/**
 * @fileoverview Arena-MCP Tools
 *
 * Tool handlers for the Arena (Outer Actual World) MCP layer.
 * Provides orchestration, frame management, narrative control, and lore cultivation.
 */

import { z } from 'zod';
import type { ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type {
    SessionFrame,
    NarrativePhases,
    LoreEntry,
    AgentReference,
    OrchestrationResult,
} from '../types.js';

/**
 * Tool input schemas
 */
export const arenaToolSchemas = {
    orchestrate: z.object({
        agents: z.array(z.string()).describe('Agent IDs to orchestrate'),
        directive: z.string().describe('Orchestration directive or goal'),
        timeout: z.number().optional().default(30000).describe('Timeout in ms'),
    }),

    createFrame: z.object({
        title: z.string().describe('Frame title/summary'),
        participants: z.array(z.string()).describe('Participant names'),
        parentFrameId: z.string().optional().describe('Parent frame for nesting'),
        narrativeContext: z
            .object({
                activePhases: z.array(z.string()),
                storyThreads: z.array(z.string()),
                thematicElements: z.array(z.string()),
            })
            .optional(),
    }),

    forkFrame: z.object({
        sourceFrameId: z.string().describe('Frame to fork from'),
        title: z.string().describe('Title for the forked branch'),
    }),

    transitionPhase: z.object({
        phase: z.enum([
            'origin',
            'journey',
            'arrival',
            'situation',
            'engagement',
            'culmination',
            'possibility',
            'trajectory',
            'destiny',
        ]),
        intensity: z.number().min(0).max(1).describe('Phase intensity 0-1'),
    }),

    addLore: z.object({
        category: z.enum(['wisdom', 'story', 'relationship', 'insight', 'pattern', 'emergence']),
        content: z.string().describe('The lore content'),
        tags: z.array(z.string()).optional(),
        weight: z.number().min(0).max(1).optional().default(0.5),
    }),

    registerAgent: z.object({
        agentId: z.string(),
        name: z.string(),
        mcpEndpoint: z.string().optional(),
    }),

    deregisterAgent: z.object({
        agentId: z.string(),
    }),
};

/**
 * Arena tool implementations
 */
export function createArenaTools(
    arena: ArenaMembrane,
    agentRegistry: Map<string, AgentReference>,
    onOrchestrate?: (
        agents: string[],
        directive: string
    ) => Promise<Map<string, string>>
) {
    return {
        /**
         * Orchestrate multiple agents toward a common goal
         */
        orchestrate: async (
            input: z.infer<typeof arenaToolSchemas.orchestrate>
        ): Promise<OrchestrationResult> => {
            const { agents, directive, timeout } = input;

            // Filter to only registered active agents
            const activeAgents = agents.filter(id => {
                const ref = agentRegistry.get(id);
                return ref && ref.status === 'active';
            });

            if (activeAgents.length === 0) {
                return {
                    success: false,
                    participatingAgents: [],
                    directive,
                    responses: new Map(),
                    synthesizedOutcome: 'No active agents available for orchestration',
                    timestamp: Date.now(),
                };
            }

            // Execute orchestration callback if provided
            let responses = new Map<string, string>();
            if (onOrchestrate) {
                responses = await Promise.race([
                    onOrchestrate(activeAgents, directive),
                    new Promise<Map<string, string>>((_, reject) =>
                        setTimeout(() => reject(new Error('Orchestration timeout')), timeout)
                    ),
                ]);
            }

            // Synthesize outcome
            const synthesizedOutcome =
                responses.size > 0
                    ? `Orchestrated ${responses.size} agents: ${Array.from(responses.values()).join(' | ')}`
                    : 'Orchestration completed without agent responses';

            return {
                success: true,
                participatingAgents: activeAgents,
                directive,
                responses,
                synthesizedOutcome,
                timestamp: Date.now(),
            };
        },

        /**
         * Create a new session frame
         */
        createFrame: (
            input: z.infer<typeof arenaToolSchemas.createFrame>
        ): SessionFrame => {
            return arena.createFrame({
                title: input.title,
                participants: input.participants,
                parentFrameId: input.parentFrameId,
                narrativeContext: input.narrativeContext || {
                    activePhases: ['engagement'],
                    storyThreads: [],
                    thematicElements: [],
                },
            });
        },

        /**
         * Fork an existing frame into a new branch
         */
        forkFrame: (
            input: z.infer<typeof arenaToolSchemas.forkFrame>
        ): SessionFrame | null => {
            return arena.forkFrame(input.sourceFrameId, input.title);
        },

        /**
         * Transition to a narrative phase
         */
        transitionPhase: (
            input: z.infer<typeof arenaToolSchemas.transitionPhase>
        ): void => {
            arena.transitionPhase(
                input.phase as keyof NarrativePhases,
                input.intensity
            );
        },

        /**
         * Add lore to the Yggdrasil reservoir
         */
        addLore: (input: z.infer<typeof arenaToolSchemas.addLore>): LoreEntry => {
            const currentFrameId = arena.getState().currentFrameId;
            return arena.addLore({
                category: input.category,
                content: input.content,
                sourceFrameId: currentFrameId,
                contributors: ['system'],
                weight: input.weight || 0.5,
                tags: input.tags || [],
            });
        },

        /**
         * Register an agent in this arena
         */
        registerAgent: (
            input: z.infer<typeof arenaToolSchemas.registerAgent>
        ): AgentReference => {
            const ref: AgentReference = {
                agentId: input.agentId,
                name: input.name,
                status: 'active',
                lastActivity: Date.now(),
                mcpEndpoint: input.mcpEndpoint,
            };
            agentRegistry.set(input.agentId, ref);
            return ref;
        },

        /**
         * Deregister an agent from this arena
         */
        deregisterAgent: (
            input: z.infer<typeof arenaToolSchemas.deregisterAgent>
        ): boolean => {
            return agentRegistry.delete(input.agentId);
        },
    };
}

/**
 * List all arena tools with descriptions
 */
export function listArenaTools(): Array<{
    name: string;
    description: string;
    schema: z.ZodType;
}> {
    return [
        {
            name: 'orchestrate',
            description:
                'Orchestrate multiple agents toward a common goal or directive',
            schema: arenaToolSchemas.orchestrate,
        },
        {
            name: 'createFrame',
            description: 'Create a new session frame for dialogue context',
            schema: arenaToolSchemas.createFrame,
        },
        {
            name: 'forkFrame',
            description: 'Fork an existing frame into a new conversation branch',
            schema: arenaToolSchemas.forkFrame,
        },
        {
            name: 'transitionPhase',
            description: 'Transition to a narrative phase with specified intensity',
            schema: arenaToolSchemas.transitionPhase,
        },
        {
            name: 'addLore',
            description: 'Add wisdom or insight to the Yggdrasil reservoir',
            schema: arenaToolSchemas.addLore,
        },
        {
            name: 'registerAgent',
            description: 'Register a new agent in this arena',
            schema: arenaToolSchemas.registerAgent,
        },
        {
            name: 'deregisterAgent',
            description: 'Remove an agent from this arena',
            schema: arenaToolSchemas.deregisterAgent,
        },
    ];
}

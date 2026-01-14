/**
 * @fileoverview Arena-MCP Prompts Unit Tests
 *
 * Tests for the Arena prompt templates including world context injection,
 * narrative weaving, orchestration directives, and lore cultivation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { arenaPrompts, listArenaPrompts } from '../../arena-mcp/prompts.js';
import type { ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { AgentReference } from '../../types.js';

// Create a mock ArenaMembrane
function createMockArenaMembrane(): ArenaMembrane {
    return {
        getState: vi.fn(() => ({
            phases: {
                engagement: { intensity: 0.8, duration: 1000 },
                exploration: { intensity: 0.5, duration: 500 },
                climax: { intensity: 0.3, duration: 300 },
            },
            coherence: 0.75,
            yggdrasilReservoir: [
                { id: 'lore-1', content: 'Ancient wisdom about patience', category: 'wisdom', weight: 0.9 },
                { id: 'lore-2', content: 'Story of the brave user', category: 'story', weight: 0.7 },
            ],
            globalThreads: ['Main quest', 'Side adventure'],
        })),
        getActiveFrames: vi.fn(() => [
            {
                frameId: 'frame-1',
                title: 'Current Session',
                messageCount: 25,
                status: 'active',
                timestamp: Date.now(),
            },
        ]),
    } as unknown as ArenaMembrane;
}

describe('Arena Prompts', () => {
    let arena: ArenaMembrane;
    let agentRegistry: Map<string, AgentReference>;

    beforeEach(() => {
        arena = createMockArenaMembrane();
        agentRegistry = new Map([
            ['agent-1', { agentId: 'agent-1', name: 'Deep Echo', status: 'active', lastActivity: Date.now() }],
            ['agent-2', { agentId: 'agent-2', name: 'Helper', status: 'dormant', lastActivity: Date.now() }],
        ]);
    });

    describe('worldContext prompt', () => {
        it('should have correct metadata', () => {
            expect(arenaPrompts.worldContext.name).toBe('world_context');
            expect(arenaPrompts.worldContext.description).toBeDefined();
        });

        it('should generate world context prompt', () => {
            const prompt = arenaPrompts.worldContext.handler(arena, agentRegistry);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should include narrative phases in context', () => {
            const prompt = arenaPrompts.worldContext.handler(arena, agentRegistry);

            // Should reference phase information
            expect(prompt.toLowerCase()).toMatch(/phase|narrative|story/);
        });

        it('should include agent information in context', () => {
            const prompt = arenaPrompts.worldContext.handler(arena, agentRegistry);

            // Should reference agents
            expect(prompt).toMatch(/agent|Deep Echo|Helper/i);
        });
    });

    describe('narrativeWeaving prompt', () => {
        it('should have correct metadata', () => {
            expect(arenaPrompts.narrativeWeaving.name).toBe('narrative_weaving');
            expect(arenaPrompts.narrativeWeaving.description).toBeDefined();
        });

        it('should generate narrative weaving prompt', () => {
            const prompt = arenaPrompts.narrativeWeaving.handler(arena);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should reference narrative structure', () => {
            const prompt = arenaPrompts.narrativeWeaving.handler(arena);

            // Should mention narrative/story elements
            expect(prompt.toLowerCase()).toMatch(/narrative|story|weav|thread/);
        });
    });

    describe('orchestrationDirective prompt', () => {
        it('should have correct metadata', () => {
            expect(arenaPrompts.orchestrationDirective.name).toBe('orchestration_directive');
            expect(arenaPrompts.orchestrationDirective.description).toBeDefined();
        });

        it('should have required arguments', () => {
            expect(arenaPrompts.orchestrationDirective.arguments).toBeDefined();
            expect(arenaPrompts.orchestrationDirective.arguments).toHaveLength(2);

            const argNames = arenaPrompts.orchestrationDirective.arguments.map(a => a.name);
            expect(argNames).toContain('goal');
            expect(argNames).toContain('agents');
        });

        it('should generate orchestration prompt with arguments', () => {
            const prompt = arenaPrompts.orchestrationDirective.handler(
                arena,
                agentRegistry,
                { goal: 'Complete the mission', agents: 'agent-1,agent-2' }
            );

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should include goal in prompt', () => {
            const prompt = arenaPrompts.orchestrationDirective.handler(
                arena,
                agentRegistry,
                { goal: 'Solve the puzzle together', agents: 'agent-1' }
            );

            expect(prompt).toContain('Solve the puzzle together');
        });

        it('should include agents in prompt', () => {
            const prompt = arenaPrompts.orchestrationDirective.handler(
                arena,
                agentRegistry,
                { goal: 'Test goal', agents: 'Deep Echo,Helper' }
            );

            expect(prompt).toMatch(/Deep Echo|Helper/);
        });
    });

    describe('loreCultivation prompt', () => {
        it('should have correct metadata', () => {
            expect(arenaPrompts.loreCultivation.name).toBe('lore_cultivation');
            expect(arenaPrompts.loreCultivation.description).toBeDefined();
        });

        it('should generate lore cultivation prompt', () => {
            const prompt = arenaPrompts.loreCultivation.handler(arena);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should reference lore/wisdom cultivation', () => {
            const prompt = arenaPrompts.loreCultivation.handler(arena);

            expect(prompt.toLowerCase()).toMatch(/lore|wisdom|knowledge|insight/);
        });

        it('should include existing lore context', () => {
            const prompt = arenaPrompts.loreCultivation.handler(arena);

            // Should reference reservoir or existing knowledge
            expect(prompt.toLowerCase()).toMatch(/reservoir|existing|accumulated/);
        });
    });
});

describe('listArenaPrompts', () => {
    it('should list all available prompts', () => {
        const prompts = listArenaPrompts();

        expect(Array.isArray(prompts)).toBe(true);
        expect(prompts.length).toBeGreaterThan(0);
    });

    it('should include expected prompts', () => {
        const prompts = listArenaPrompts();
        const promptNames = prompts.map(p => p.name);

        expect(promptNames).toContain('world_context');
        expect(promptNames).toContain('narrative_weaving');
        expect(promptNames).toContain('orchestration_directive');
        expect(promptNames).toContain('lore_cultivation');
    });

    it('should have proper prompt structure', () => {
        const prompts = listArenaPrompts();

        prompts.forEach(prompt => {
            expect(prompt).toHaveProperty('name');
            expect(prompt).toHaveProperty('description');
            expect(typeof prompt.name).toBe('string');
            expect(typeof prompt.description).toBe('string');
        });
    });

    it('should include arguments for prompts that require them', () => {
        const prompts = listArenaPrompts();
        const orchestrationPrompt = prompts.find(p => p.name === 'orchestration_directive');

        expect(orchestrationPrompt).toBeDefined();
        expect(orchestrationPrompt?.arguments).toBeDefined();
        expect(orchestrationPrompt?.arguments?.length).toBeGreaterThan(0);
    });

    it('should mark required arguments correctly', () => {
        const prompts = listArenaPrompts();
        const orchestrationPrompt = prompts.find(p => p.name === 'orchestration_directive');

        if (orchestrationPrompt?.arguments) {
            const goalArg = orchestrationPrompt.arguments.find(a => a.name === 'goal');
            expect(goalArg?.required).toBe(true);
        }
    });
});

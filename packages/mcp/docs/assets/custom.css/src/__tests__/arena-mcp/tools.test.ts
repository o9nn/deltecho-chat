/**
 * @fileoverview Arena-MCP Tools Unit Tests
 *
 * Tests for the Arena tool handlers including orchestration, frame management,
 * narrative phase control, and lore cultivation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { arenaToolSchemas, createArenaTools, listArenaTools } from '../../arena-mcp/tools.js';
import type { ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { AgentReference } from '../../types.js';

// Create a mock ArenaMembrane
function createMockArenaMembrane(): ArenaMembrane {
    return {
        getState: vi.fn(() => ({
            phases: {
                origin: { intensity: 0.3, storyElements: ['beginning'], name: 'origin' },
                journey: { intensity: 0.4, storyElements: ['travel'], name: 'journey' },
                arrival: { intensity: 0.5, storyElements: ['destination'], name: 'arrival' },
                situation: { intensity: 0.6, storyElements: ['context'], name: 'situation' },
                engagement: { intensity: 0.8, storyElements: ['action'], name: 'engagement' },
                culmination: { intensity: 0.4, storyElements: ['peak'], name: 'culmination' },
                possibility: { intensity: 0.5, storyElements: ['options'], name: 'possibility' },
                trajectory: { intensity: 0.6, storyElements: ['direction'], name: 'trajectory' },
                destiny: { intensity: 0.3, storyElements: ['fate'], name: 'destiny' },
            },
            coherence: 0.75,
            yggdrasilReservoir: [],
            globalThreads: [],
            currentFrameId: 'frame-1',
            gestaltProgress: {
                patternsRecognized: 5,
                emergentInsights: 3,
                narrativeIntegration: 0.7,
            },
        })),
        getActiveFrames: vi.fn(() => [
            {
                frameId: 'frame-1',
                title: 'Test Frame',
                messageCount: 5,
                status: 'active',
                participants: ['user', 'agent'],
                narrativeContext: {
                    activePhases: ['engagement'],
                    storyThreads: [],
                    thematicElements: [],
                },
            },
        ]),
        transitionPhase: vi.fn(),
        createFrame: vi.fn((options: {
            title: string;
            participants: string[];
            narrativeContext?: object;
        }) => ({
            frameId: `frame-${Date.now()}`,
            title: options.title,
            participants: options.participants,
            messageCount: 0,
            status: 'active',
            timestamp: Date.now(),
            narrativeContext: options.narrativeContext || {
                activePhases: ['engagement'],
                storyThreads: [],
                thematicElements: [],
            },
        })),
        forkFrame: vi.fn((frameId: string, title: string) => {
            if (frameId === 'frame-1') {
                return {
                    frameId: `frame-fork-${Date.now()}`,
                    title,
                    messageCount: 0,
                    status: 'active',
                    parentFrameId: frameId,
                };
            }
            return null;
        }),
        addLore: vi.fn((entry: {
            category: string;
            content: string;
            sourceFrameId: string;
            contributors: string[];
            weight: number;
            tags: string[];
        }) => ({
            id: `lore-${Date.now()}`,
            content: entry.content,
            category: entry.category,
            weight: entry.weight,
            tags: entry.tags,
            sourceFrameId: entry.sourceFrameId,
            contributors: entry.contributors,
            timestamp: Date.now(),
        })),
    } as unknown as ArenaMembrane;
}

describe('Arena Tool Schemas', () => {
    describe('orchestrate schema', () => {
        it('should validate orchestration input', () => {
            const input = {
                agents: ['agent-1', 'agent-2'],
                directive: 'Work together on task',
            };

            const result = arenaToolSchemas.orchestrate.parse(input);

            expect(result.agents).toEqual(['agent-1', 'agent-2']);
            expect(result.directive).toBe('Work together on task');
        });

        it('should accept optional timeout', () => {
            const input = {
                agents: ['agent-1'],
                directive: 'Quick task',
                timeout: 5000,
            };

            const result = arenaToolSchemas.orchestrate.parse(input);

            expect(result.timeout).toBe(5000);
        });

        it('should accept empty agents array (validation happens in implementation)', () => {
            // The schema itself doesn't enforce min length - the implementation handles empty agents gracefully
            const input = {
                agents: [],
                directive: 'No agents',
            };

            const result = arenaToolSchemas.orchestrate.parse(input);
            expect(result.agents).toEqual([]);
        });
    });

    describe('createFrame schema', () => {
        it('should validate frame creation input', () => {
            const input = {
                title: 'New Frame',
                participants: ['user', 'agent'],
            };

            const result = arenaToolSchemas.createFrame.parse(input);

            expect(result.title).toBe('New Frame');
            expect(result.participants).toEqual(['user', 'agent']);
        });

        it('should allow narrativeContext to be optional', () => {
            const input = {
                title: 'Simple Frame',
                participants: ['user'],
            };

            const result = arenaToolSchemas.createFrame.parse(input);

            expect(result.title).toBe('Simple Frame');
            expect(result.narrativeContext).toBeUndefined();
        });

        it('should accept optional parentFrameId', () => {
            const input = {
                title: 'Nested Frame',
                participants: ['user'],
                parentFrameId: 'parent-1',
            };

            const result = arenaToolSchemas.createFrame.parse(input);

            expect(result.parentFrameId).toBe('parent-1');
        });
    });

    describe('forkFrame schema', () => {
        it('should validate frame fork input', () => {
            const input = {
                sourceFrameId: 'frame-1',
                title: 'Alternative Path',
            };

            const result = arenaToolSchemas.forkFrame.parse(input);

            expect(result.sourceFrameId).toBe('frame-1');
            expect(result.title).toBe('Alternative Path');
        });
    });

    describe('transitionPhase schema', () => {
        it('should validate all phase types', () => {
            const phases = [
                'origin',
                'journey',
                'arrival',
                'situation',
                'engagement',
                'culmination',
                'possibility',
                'trajectory',
                'destiny',
            ];

            phases.forEach(phase => {
                const input = { phase, intensity: 0.5 };
                const result = arenaToolSchemas.transitionPhase.parse(input);
                expect(result.phase).toBe(phase);
            });
        });

        it('should validate intensity range', () => {
            expect(() => arenaToolSchemas.transitionPhase.parse({ phase: 'engagement', intensity: -0.1 })).toThrow();
            expect(() => arenaToolSchemas.transitionPhase.parse({ phase: 'engagement', intensity: 1.1 })).toThrow();

            const validResult = arenaToolSchemas.transitionPhase.parse({ phase: 'engagement', intensity: 0.5 });
            expect(validResult.intensity).toBe(0.5);
        });
    });

    describe('addLore schema', () => {
        it('should validate lore input', () => {
            const input = {
                category: 'wisdom',
                content: 'A wise observation',
                tags: ['learning', 'insight'],
                weight: 0.8,
            };

            const result = arenaToolSchemas.addLore.parse(input);

            expect(result.category).toBe('wisdom');
            expect(result.content).toBe('A wise observation');
            expect(result.tags).toEqual(['learning', 'insight']);
            expect(result.weight).toBe(0.8);
        });

        it('should validate all category types', () => {
            const categories = ['wisdom', 'story', 'relationship', 'insight', 'pattern', 'emergence'];

            categories.forEach(category => {
                const input = { category, content: 'Test content' };
                const result = arenaToolSchemas.addLore.parse(input);
                expect(result.category).toBe(category);
            });
        });

        it('should default weight to 0.5', () => {
            const input = {
                category: 'wisdom',
                content: 'Test',
            };

            const result = arenaToolSchemas.addLore.parse(input);

            expect(result.weight).toBe(0.5);
        });
    });

    describe('registerAgent schema', () => {
        it('should validate agent registration input', () => {
            const input = {
                agentId: 'agent-1',
                name: 'Test Agent',
                mcpEndpoint: 'mcp://agent-1',
            };

            const result = arenaToolSchemas.registerAgent.parse(input);

            expect(result.agentId).toBe('agent-1');
            expect(result.name).toBe('Test Agent');
            expect(result.mcpEndpoint).toBe('mcp://agent-1');
        });
    });

    describe('deregisterAgent schema', () => {
        it('should validate agent deregistration input', () => {
            const input = { agentId: 'agent-1' };

            const result = arenaToolSchemas.deregisterAgent.parse(input);

            expect(result.agentId).toBe('agent-1');
        });
    });
});

describe('Arena Tools', () => {
    let arena: ArenaMembrane;
    let agentRegistry: Map<string, AgentReference>;
    let tools: ReturnType<typeof createArenaTools>;

    beforeEach(() => {
        arena = createMockArenaMembrane();
        agentRegistry = new Map([
            ['agent-1', { agentId: 'agent-1', name: 'Agent One', status: 'active', lastActivity: Date.now() }],
            ['agent-2', { agentId: 'agent-2', name: 'Agent Two', status: 'active', lastActivity: Date.now() }],
        ]);
        tools = createArenaTools(arena, agentRegistry);
    });

    describe('orchestrate', () => {
        it('should orchestrate agents with callback', async () => {
            const orchestrateCallback = vi.fn().mockResolvedValue(
                new Map([
                    ['agent-1', 'Acknowledged'],
                    ['agent-2', 'Ready'],
                ])
            );
            const toolsWithCallback = createArenaTools(arena, agentRegistry, orchestrateCallback);

            const result = await toolsWithCallback.orchestrate({
                agents: ['agent-1', 'agent-2'],
                directive: 'Work together',
            });

            expect(result.success).toBe(true);
            expect(result.participatingAgents).toEqual(['agent-1', 'agent-2']);
            expect(orchestrateCallback).toHaveBeenCalledWith(['agent-1', 'agent-2'], 'Work together');
        });

        it('should filter to only registered agents', async () => {
            const result = await tools.orchestrate({
                agents: ['agent-1', 'non-existent'],
                directive: 'Test',
            });

            expect(result.participatingAgents).toContain('agent-1');
            expect(result.participatingAgents).not.toContain('non-existent');
        });

        it('should fail when no registered agents match', async () => {
            const result = await tools.orchestrate({
                agents: ['non-existent-1', 'non-existent-2'],
                directive: 'Test',
            });

            expect(result.success).toBe(false);
            expect(result.participatingAgents).toHaveLength(0);
        });
    });

    describe('createFrame', () => {
        it('should create a new session frame', () => {
            const frame = tools.createFrame({
                title: 'New Session',
                participants: ['user', 'agent'],
            });

            expect(frame).toBeDefined();
            expect(frame.title).toBe('New Session');
            expect(arena.createFrame).toHaveBeenCalledWith({
                title: 'New Session',
                participants: ['user', 'agent'],
                parentFrameId: undefined,
                narrativeContext: {
                    activePhases: ['engagement'],
                    storyThreads: [],
                    thematicElements: [],
                },
            });
        });
    });

    describe('forkFrame', () => {
        it('should fork an existing frame', () => {
            const forked = tools.forkFrame({
                sourceFrameId: 'frame-1',
                title: 'Alternative Path',
            });

            expect(forked).toBeDefined();
            expect(arena.forkFrame).toHaveBeenCalledWith('frame-1', 'Alternative Path');
        });

        it('should return null for non-existent frame', () => {
            const forked = tools.forkFrame({
                sourceFrameId: 'non-existent',
                title: 'Test',
            });

            expect(forked).toBeNull();
        });
    });

    describe('transitionPhase', () => {
        it('should transition to a narrative phase', () => {
            tools.transitionPhase({
                phase: 'culmination',
                intensity: 0.9,
            });

            expect(arena.transitionPhase).toHaveBeenCalledWith('culmination', 0.9);
        });
    });

    describe('addLore', () => {
        it('should add lore to the reservoir', () => {
            const lore = tools.addLore({
                category: 'wisdom',
                content: 'A wise observation',
                tags: ['learning'],
                weight: 0.7,
            });

            expect(lore).toBeDefined();
            expect(arena.addLore).toHaveBeenCalled();
        });
    });

    describe('registerAgent', () => {
        it('should register a new agent', () => {
            const agent = tools.registerAgent({
                agentId: 'agent-3',
                name: 'Agent Three',
                mcpEndpoint: 'mcp://agent-3',
            });

            expect(agent.agentId).toBe('agent-3');
            expect(agent.name).toBe('Agent Three');
            expect(agent.status).toBe('active');
            expect(agentRegistry.has('agent-3')).toBe(true);
        });

        it('should update existing agent', () => {
            const updated = tools.registerAgent({
                agentId: 'agent-1',
                name: 'Updated Agent One',
            });

            expect(updated.name).toBe('Updated Agent One');
        });
    });

    describe('deregisterAgent', () => {
        it('should deregister an existing agent', () => {
            const result = tools.deregisterAgent({ agentId: 'agent-1' });

            expect(result).toBe(true);
            expect(agentRegistry.has('agent-1')).toBe(false);
        });

        it('should return false for non-existent agent', () => {
            const result = tools.deregisterAgent({ agentId: 'non-existent' });

            expect(result).toBe(false);
        });
    });
});

describe('listArenaTools', () => {
    it('should list all available tools', () => {
        const tools = listArenaTools();

        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
    });

    it('should include expected tools', () => {
        const tools = listArenaTools();
        const toolNames = tools.map(t => t.name);

        expect(toolNames).toContain('orchestrate');
        expect(toolNames).toContain('createFrame');
        expect(toolNames).toContain('forkFrame');
        expect(toolNames).toContain('transitionPhase');
        expect(toolNames).toContain('addLore');
    });

    it('should have proper tool structure', () => {
        const tools = listArenaTools();

        tools.forEach(tool => {
            expect(tool).toHaveProperty('name');
            expect(tool).toHaveProperty('description');
            expect(tool).toHaveProperty('schema');
            expect(typeof tool.name).toBe('string');
            expect(typeof tool.description).toBe('string');
        });
    });
});

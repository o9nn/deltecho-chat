/**
 * @fileoverview Arena-MCP Server Unit Tests
 *
 * Tests for the outer Arena layer MCP server.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArenaMCPServer, createArenaMCPServer } from '../../arena-mcp/index.js';
import type { ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { AgentReference } from '../../types.js';

// Create a mock ArenaMembrane
function createMockArenaMembrane(): ArenaMembrane {
    return {
        getState: vi.fn(() => ({
            phases: {
                engagement: { intensity: 0.8, duration: 1000 },
                exploration: { intensity: 0.5, duration: 500 },
                resolution: { intensity: 0.2, duration: 200 },
            },
            coherence: 0.75,
            frames: [
                { id: 'frame-1', content: 'Test frame', timestamp: Date.now() },
            ],
            reservoir: {
                entries: [
                    { id: 'lore-1', content: 'Test lore', tags: ['test'] },
                ],
            },
            threads: [
                { id: 'thread-1', participants: ['agent-1'], messages: [] },
            ],
        })),
        transitionPhase: vi.fn(),
        createFrame: vi.fn().mockReturnValue({ id: 'new-frame', timestamp: Date.now() }),
        addLore: vi.fn(),
        getFrame: vi.fn((id: string) => ({ id, content: 'Frame content', timestamp: Date.now() })),
        searchReservoir: vi.fn(() => []),
        getThreads: vi.fn(() => []),
    } as unknown as ArenaMembrane;
}

describe('ArenaMCPServer', () => {
    let arena: ArenaMembrane;
    let server: ArenaMCPServer;

    beforeEach(() => {
        arena = createMockArenaMembrane();
        server = createArenaMCPServer(arena, {
            instanceName: 'TestArena',
            maxAgents: 50,
        });
    });

    describe('Creation', () => {
        it('should create with default configuration', () => {
            const defaultServer = createArenaMCPServer(arena);
            const config = defaultServer.getConfig();

            expect(config.instanceName).toBe('DeepEchoArena');
            expect(config.maxAgents).toBe(100);
            expect(config.enableOrchestration).toBe(true);
        });

        it('should create with custom configuration', () => {
            const config = server.getConfig();

            expect(config.instanceName).toBe('TestArena');
            expect(config.maxAgents).toBe(50);
        });

        it('should provide access to underlying arena', () => {
            expect(server.getArena()).toBe(arena);
        });
    });

    describe('Agent Management', () => {
        it('should register an agent', () => {
            const agentRef: AgentReference = {
                agentId: 'agent-1',
                name: 'TestAgent',
                status: 'active',
                lastActivity: Date.now(),
            };

            const registerHandler = vi.fn();
            server.on('agent:registered', registerHandler);

            server.registerAgent(agentRef);

            expect(registerHandler).toHaveBeenCalledWith(agentRef);
        });

        it('should deregister an agent', () => {
            const agentRef: AgentReference = {
                agentId: 'agent-1',
                name: 'TestAgent',
                status: 'active',
                lastActivity: Date.now(),
            };

            server.registerAgent(agentRef);

            const deregisterHandler = vi.fn();
            server.on('agent:deregistered', deregisterHandler);

            const removed = server.deregisterAgent('agent-1');

            expect(removed).toBe(true);
            expect(deregisterHandler).toHaveBeenCalledWith('agent-1');
        });

        it('should return false when deregistering non-existent agent', () => {
            const removed = server.deregisterAgent('non-existent');
            expect(removed).toBe(false);
        });

        it('should get all registered agents', () => {
            const agent1: AgentReference = {
                agentId: 'agent-1',
                name: 'Agent One',
                status: 'active',
                lastActivity: Date.now(),
            };
            const agent2: AgentReference = {
                agentId: 'agent-2',
                name: 'Agent Two',
                status: 'dormant',
                lastActivity: Date.now(),
            };

            server.registerAgent(agent1);
            server.registerAgent(agent2);

            const agents = server.getAgents();

            expect(agents).toHaveLength(2);
            expect(agents).toContainEqual(agent1);
            expect(agents).toContainEqual(agent2);
        });
    });

    describe('MCP Resources', () => {
        it('should list available resources', () => {
            const resources = server.listResources();

            expect(Array.isArray(resources)).toBe(true);
            expect(resources.length).toBeGreaterThan(0);

            // Check resource structure
            resources.forEach((r) => {
                expect(r).toHaveProperty('uri');
                expect(r).toHaveProperty('name');
                expect(r).toHaveProperty('description');
            });
        });

        it('should read arena://phases resource', () => {
            const phases = server.readResource('arena://phases');

            expect(phases).toBeDefined();
            expect(arena.getState).toHaveBeenCalled();
        });

        it('should read arena://reservoir resource', () => {
            const reservoir = server.readResource('arena://reservoir');

            expect(reservoir).toBeDefined();
        });

        it('should read arena://agents resource', () => {
            const agent: AgentReference = {
                agentId: 'agent-1',
                name: 'TestAgent',
                status: 'active',
                lastActivity: Date.now(),
            };
            server.registerAgent(agent);

            const agents = server.readResource('arena://agents');

            expect(agents).toBeDefined();
        });

        it('should read arena://threads resource', () => {
            const threads = server.readResource('arena://threads');

            expect(threads).toBeDefined();
        });

        it('should throw for unknown resource URI', () => {
            expect(() => server.readResource('arena://unknown')).toThrow();
        });

        it('should throw for non-arena URI scheme', () => {
            expect(() => server.readResource('agent://identity')).toThrow();
        });
    });

    describe('MCP Tools', () => {
        it('should list available tools', () => {
            const tools = server.listTools();

            expect(Array.isArray(tools)).toBe(true);
            expect(tools.length).toBeGreaterThan(0);

            // Check tool structure
            tools.forEach((t) => {
                expect(t).toHaveProperty('name');
                expect(t).toHaveProperty('description');
                expect(t).toHaveProperty('inputSchema');
            });
        });

        it('should include orchestrate tool', () => {
            const tools = server.listTools();
            const orchestrateTool = tools.find((t) => t.name === 'orchestrate');

            expect(orchestrateTool).toBeDefined();
        });

        it('should include createSessionFrame tool', () => {
            const tools = server.listTools();
            const frameTool = tools.find((t) => t.name === 'createSessionFrame');

            expect(frameTool).toBeDefined();
        });

        it('should include transitionNarrativePhase tool', () => {
            const tools = server.listTools();
            const transitionTool = tools.find((t) => t.name === 'transitionNarrativePhase');

            expect(transitionTool).toBeDefined();
        });

        it('should include addLore tool', () => {
            const tools = server.listTools();
            const loreTool = tools.find((t) => t.name === 'addLore');

            expect(loreTool).toBeDefined();
        });
    });

    describe('MCP Prompts', () => {
        it('should list available prompts', () => {
            const prompts = server.listPrompts();

            expect(Array.isArray(prompts)).toBe(true);
            expect(prompts.length).toBeGreaterThan(0);

            // Check prompt structure
            prompts.forEach((p) => {
                expect(p).toHaveProperty('name');
                expect(p).toHaveProperty('description');
            });
        });

        it('should get world_context prompt', () => {
            const prompt = server.getPrompt('world_context');

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should get narrative_weaving prompt', () => {
            const prompt = server.getPrompt('narrative_weaving');

            expect(typeof prompt).toBe('string');
        });

        it('should get orchestration_directive prompt with arguments', () => {
            const prompt = server.getPrompt('orchestration_directive', {
                goal: 'test goal',
                agents: 'agent-1,agent-2',
            });

            expect(typeof prompt).toBe('string');
        });

        it('should throw for orchestration_directive without required args', () => {
            expect(() => server.getPrompt('orchestration_directive')).toThrow();
        });

        it('should get lore_cultivation prompt', () => {
            const prompt = server.getPrompt('lore_cultivation');

            expect(typeof prompt).toBe('string');
        });

        it('should throw for unknown prompt', () => {
            expect(() => server.getPrompt('unknown_prompt')).toThrow();
        });
    });

    describe('Orchestration Callback', () => {
        it('should set orchestration callback', () => {
            const callback = vi.fn().mockResolvedValue(new Map());

            server.setOrchestrationCallback(callback);

            // The callback should be used when orchestrate tool is called
            expect(callback).not.toHaveBeenCalled(); // Not called yet
        });
    });
});

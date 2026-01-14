/**
 * @fileoverview Agent-MCP Server Unit Tests
 *
 * Tests for the inner Agent layer MCP server.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentMCPServer, createAgentMCPServer } from '../../agent-mcp/index.js';
import type { AgentMembrane } from 'deep-tree-echo-orchestrator/aar';

// Create a mock AgentMembrane
function createMockAgentMembrane(): AgentMembrane {
    return {
        getState: vi.fn(() => ({
            dominantFacet: 'wisdom',
            facets: {
                wisdom: 0.8,
                playfulness: 0.6,
                nurturing: 0.7,
                analytical: 0.5,
                creative: 0.65,
            },
            engagementLevel: 0.75,
            identity: {
                name: 'DeepTreeEcho',
                coreValues: ['truth', 'curiosity', 'compassion'],
                voiceStyle: 'thoughtful and warm',
            },
            socialMemory: new Map([
                ['user-1', { trust: 0.8, history: [], rapport: 0.7 }],
            ]),
            transactions: [
                { id: 'tx-1', type: 'dialogue', timestamp: Date.now() },
            ],
        })),
        activateFacet: vi.fn(),
        evolve: vi.fn(),
        participate: vi.fn().mockResolvedValue({
            response: 'Test response',
            facetsActivated: ['wisdom'],
            emotionalShift: { valence: 0.5, arousal: 0.3 },
            insightsGained: [],
            socialUpdates: new Map(),
        }),
        updateSocialMemory: vi.fn(),
        getIdentity: vi.fn(() => ({
            name: 'DeepTreeEcho',
            coreValues: ['truth', 'curiosity', 'compassion'],
        })),
        getFacets: vi.fn(() => ({
            wisdom: 0.8,
            playfulness: 0.6,
        })),
    } as unknown as AgentMembrane;
}

describe('AgentMCPServer', () => {
    let agent: AgentMembrane;
    let server: AgentMCPServer;

    beforeEach(() => {
        agent = createMockAgentMembrane();
        server = createAgentMCPServer(agent, {
            agentId: 'test-agent',
            enableEvolution: true,
            evolutionRate: 0.02,
        });
    });

    describe('Creation', () => {
        it('should create with default configuration', () => {
            const defaultServer = createAgentMCPServer(agent);
            const config = defaultServer.getConfig();

            expect(config.agentId).toBe('deep-tree-echo');
            expect(config.enableEvolution).toBe(true);
            expect(config.evolutionRate).toBe(0.01);
        });

        it('should create with custom configuration', () => {
            const config = server.getConfig();

            expect(config.agentId).toBe('test-agent');
            expect(config.evolutionRate).toBe(0.02);
        });

        it('should provide access to underlying agent', () => {
            expect(server.getAgent()).toBe(agent);
        });
    });

    describe('Virtual Models (Inverted Mirror)', () => {
        it('should have a virtual agent model (Vi)', () => {
            const vi = server.getVirtualAgent();

            expect(vi).toBeDefined();
            expect(vi.selfStory).toBeDefined();
            expect(vi.selfImage).toBeDefined();
            expect(vi.perceivedCapabilities).toBeDefined();
        });

        it('should have virtual arena inside virtual agent (Vo inside Vi)', () => {
            const virtualAgent = server.getVirtualAgent();
            const virtualArena = server.getVirtualArena();

            expect(virtualArena).toBeDefined();
            expect(virtualAgent.worldView).toBe(virtualArena);
        });

        it('should sync virtual from actual on creation', () => {
            const virtualAgent = server.getVirtualAgent();

            // Should have synced dominant facet from actual agent
            expect(virtualAgent.selfImage.perceivedDominantFacet).toBe('wisdom');
        });

        it('should update virtual agent', () => {
            const updateHandler = vi.fn();
            server.on('virtual-agent:updated', updateHandler);

            server.updateVirtualAgent({
                selfStory: 'Updated story',
            });

            expect(updateHandler).toHaveBeenCalled();
            expect(server.getVirtualAgent().selfStory).toBe('Updated story');
        });

        it('should update virtual arena', () => {
            const updateHandler = vi.fn();
            server.on('virtual-arena:updated', updateHandler);

            server.updateVirtualArena({
                worldTheory: 'Updated world theory',
            });

            expect(updateHandler).toHaveBeenCalled();
            expect(server.getVirtualArena().worldTheory).toBe('Updated world theory');
        });

        it('should emit virtual:synced event on sync', () => {
            const syncHandler = vi.fn();
            server.on('virtual:synced', syncHandler);

            server.syncVirtualFromActual();

            expect(syncHandler).toHaveBeenCalled();
        });
    });

    describe('MCP Resources', () => {
        it('should list available resources', () => {
            const resources = server.listResources();

            expect(Array.isArray(resources)).toBe(true);
            expect(resources.length).toBeGreaterThan(0);
        });

        it('should read agent://identity resource', () => {
            const identity = server.readResource('agent://identity');

            expect(identity).toBeDefined();
            expect(agent.getState).toHaveBeenCalled();
        });

        it('should read agent://facets resource', () => {
            const facets = server.readResource('agent://facets');

            expect(facets).toBeDefined();
        });

        it('should read agent://transactions resource', () => {
            const transactions = server.readResource('agent://transactions');

            expect(transactions).toBeDefined();
        });

        it('should read agent://self resource (virtual agent)', () => {
            const self = server.readResource('agent://self');

            expect(self).toBeDefined();
            expect(self).toBe(server.getVirtualAgent());
        });

        it('should throw for unknown resource URI', () => {
            expect(() => server.readResource('agent://unknown')).toThrow();
        });

        it('should throw for non-agent URI scheme', () => {
            expect(() => server.readResource('arena://phases')).toThrow();
        });
    });

    describe('MCP Tools', () => {
        it('should list available tools', () => {
            const tools = server.listTools();

            expect(Array.isArray(tools)).toBe(true);
            expect(tools.length).toBeGreaterThan(0);
        });

        it('should include participate tool', () => {
            const tools = server.listTools();
            const participateTool = tools.find((t) => t.name === 'participate');

            expect(participateTool).toBeDefined();
        });

        it('should include activateFacet tool', () => {
            const tools = server.listTools();
            const facetTool = tools.find((t) => t.name === 'activateFacet');

            expect(facetTool).toBeDefined();
        });

        it('should include updateSocialMemory tool', () => {
            const tools = server.listTools();
            const socialTool = tools.find((t) => t.name === 'updateSocialMemory');

            expect(socialTool).toBeDefined();
        });

        it('should include evolve tool', () => {
            const tools = server.listTools();
            const evolveTool = tools.find((t) => t.name === 'evolve');

            expect(evolveTool).toBeDefined();
        });
    });

    describe('MCP Prompts', () => {
        it('should list available prompts', () => {
            const prompts = server.listPrompts();

            expect(Array.isArray(prompts)).toBe(true);
            expect(prompts.length).toBeGreaterThan(0);
        });

        it('should get persona_context prompt', () => {
            const prompt = server.getPrompt('persona_context');

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should get character_voice prompt', () => {
            const prompt = server.getPrompt('character_voice');

            expect(typeof prompt).toBe('string');
        });

        it('should get social_context prompt with participants', () => {
            const prompt = server.getPrompt('social_context', {
                participants: 'user-1,user-2',
            });

            expect(typeof prompt).toBe('string');
        });

        it('should throw for social_context without participants', () => {
            expect(() => server.getPrompt('social_context')).toThrow();
        });

        it('should get participation_protocol prompt', () => {
            const prompt = server.getPrompt('participation_protocol', {
                type: 'dialogue',
            });

            expect(typeof prompt).toBe('string');
        });

        it('should throw for unknown prompt', () => {
            expect(() => server.getPrompt('unknown_prompt')).toThrow();
        });
    });
});

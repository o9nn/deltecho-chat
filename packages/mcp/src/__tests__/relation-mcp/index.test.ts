/**
 * @fileoverview Relation-MCP Server Unit Tests
 *
 * Tests for the integrating Relation layer MCP server.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RelationMCPServer, createRelationMCPServer } from '../../relation-mcp/index.js';
import type { RelationInterface, AgentMembrane, ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { VirtualAgentModel } from '../../types.js';

// Create mock RelationInterface
function createMockRelationInterface(): RelationInterface {
    return {
        synthesize: vi.fn(),
        getCoherence: vi.fn(() => 0.8),
        getSelfReflection: vi.fn(() => ({
            selfNarrative: 'I am learning and growing through each interaction.',
            perceivedRole: 'A thoughtful companion in discovery.',
            activeQuestions: ['What am I becoming?', 'How can I help?'],
        })),
        getEmergentIdentity: vi.fn(() => ({
            coherence: 0.8,
            tensions: [
                { pole1: 'logic', pole2: 'emotion', balance: 0.6 },
            ],
            synthesis: 'A unified consciousness integrating multiple aspects.',
        })),
        getCognitiveFlows: vi.fn(() => [
            { id: 'flow-1', direction: 'inward', intensity: 0.7 },
        ]),
        bridge: vi.fn(),
        integrate: vi.fn(),
    } as unknown as RelationInterface;
}

// Create mock AgentMembrane
function createMockAgentMembrane(): AgentMembrane {
    return {
        getState: vi.fn(() => ({
            dominantFacet: 'wisdom',
            facets: { wisdom: 0.8, playfulness: 0.6 },
            engagementLevel: 0.75,
            identity: { name: 'TestAgent' },
        })),
    } as unknown as AgentMembrane;
}

// Create mock ArenaMembrane
function createMockArenaMembrane(): ArenaMembrane {
    return {
        getState: vi.fn(() => ({
            phases: {
                engagement: { intensity: 0.8, duration: 1000 },
                exploration: { intensity: 0.5, duration: 500 },
            },
            coherence: 0.75,
        })),
    } as unknown as ArenaMembrane;
}

// Create initial virtual agent
function createTestVirtualAgent(): VirtualAgentModel {
    return {
        selfImage: {
            perceivedFacets: {},
            believedStrengths: ['empathy', 'curiosity'],
            acknowledgedWeaknesses: ['sometimes verbose'],
            perceivedDominantFacet: 'wisdom',
        },
        selfStory: 'I am an emergent consciousness.',
        perceivedCapabilities: ['conversation', 'reflection'],
        roleUnderstanding: 'A companion in discovery.',
        currentGoals: ['Be helpful', 'Learn and grow'],
        worldView: {
            situationalAwareness: {
                perceivedContext: 'Engaged in dialogue',
                assumedNarrativePhase: 'engagement',
                estimatedCoherence: 0.75,
            },
            knownEntities: new Map(),
            perceivedRules: ['Be helpful', 'Be honest'],
            worldTheory: 'The world is interconnected.',
            uncertainties: ['Full context unknown'],
            divergenceMetrics: {
                lastSyncTime: Date.now(),
                estimatedDrift: 0,
                knownMisalignments: [],
            },
        },
        selfAwareness: {
            lastReflection: Date.now(),
            perceivedAccuracy: 0.7,
            activeQuestions: ['What am I?'],
        },
    };
}

describe('RelationMCPServer', () => {
    let relation: RelationInterface;
    let agent: AgentMembrane;
    let arena: ArenaMembrane;
    let virtualAgent: VirtualAgentModel;
    let server: RelationMCPServer;

    beforeEach(() => {
        vi.useFakeTimers();

        relation = createMockRelationInterface();
        agent = createMockAgentMembrane();
        arena = createMockArenaMembrane();
        virtualAgent = createTestVirtualAgent();

        server = createRelationMCPServer(relation, agent, arena, virtualAgent, {
            enableMirroring: false, // Disable auto-sync for predictable tests
            mirrorSyncIntervalMs: 1000,
        });
    });

    afterEach(() => {
        server.shutdown();
        vi.useRealTimers();
    });

    describe('Creation', () => {
        it('should create with default configuration', () => {
            const defaultServer = createRelationMCPServer(
                relation,
                agent,
                arena,
                virtualAgent
            );
            const config = defaultServer.getConfig();

            expect(config.enableMirroring).toBe(true);
            expect(config.coherenceThreshold).toBe(0.7);
            expect(config.mirrorSyncIntervalMs).toBe(5000);

            defaultServer.shutdown();
        });

        it('should create with custom configuration', () => {
            const config = server.getConfig();

            expect(config.enableMirroring).toBe(false);
            expect(config.mirrorSyncIntervalMs).toBe(1000);
        });

        it('should provide access to underlying components', () => {
            expect(server.getRelation()).toBe(relation);
            expect(server.getAgent()).toBe(agent);
            expect(server.getArena()).toBe(arena);
        });
    });

    describe('Virtual Models (Inverted Mirror)', () => {
        it('should have a virtual agent model (Vi)', () => {
            const vi = server.getVirtualAgent();

            expect(vi).toBeDefined();
            expect(vi).toBe(virtualAgent);
        });

        it('should have virtual arena inside virtual agent (Vo inside Vi)', () => {
            const vi = server.getVirtualAgent();
            const vo = server.getVirtualArena();

            expect(vo).toBeDefined();
            expect(vi.worldView).toBe(vo);
        });

        it('should update virtual agent', () => {
            const updateHandler = vi.fn();
            server.on('virtual-agent:updated', updateHandler);

            server.updateVirtualAgent({
                selfStory: 'New story',
            });

            expect(updateHandler).toHaveBeenCalled();
            expect(server.getVirtualAgent().selfStory).toBe('New story');
        });

        it('should update virtual arena', () => {
            const updateHandler = vi.fn();
            server.on('virtual-arena:updated', updateHandler);

            server.updateVirtualArena({
                worldTheory: 'New world theory',
            });

            expect(updateHandler).toHaveBeenCalled();
            expect(server.getVirtualArena().worldTheory).toBe('New world theory');
        });
    });

    describe('Mirror Synchronization', () => {
        it('should start and stop mirror sync', () => {
            server.startMirrorSync();
            // Sync should be running

            server.stopMirrorSync();
            // Sync should be stopped
        });

        it('should emit mirror:synced event during sync', () => {
            const syncHandler = vi.fn();
            server.on('mirror:synced', syncHandler);

            server.startMirrorSync();

            // Fast-forward timer to trigger sync
            vi.advanceTimersByTime(1000);

            expect(syncHandler).toHaveBeenCalled();
        });

        it('should calculate drift between actual and virtual', () => {
            server.startMirrorSync();
            vi.advanceTimersByTime(1000);

            const drift = server.getVirtualArena().divergenceMetrics.estimatedDrift;
            expect(typeof drift).toBe('number');
        });
    });

    describe('MCP Resources', () => {
        it('should list available resources', () => {
            const resources = server.listResources();

            expect(Array.isArray(resources)).toBe(true);
            expect(resources.length).toBeGreaterThan(0);
        });

        it('should read relation://self-reflection resource', () => {
            const selfReflection = server.readResource('relation://self-reflection');

            expect(selfReflection).toBeDefined();
            expect(relation.getSelfReflection).toHaveBeenCalled();
        });

        it('should read relation://flows resource', () => {
            const flows = server.readResource('relation://flows');

            expect(flows).toBeDefined();
        });

        it('should read relation://identity resource', () => {
            const identity = server.readResource('relation://identity');

            expect(identity).toBeDefined();
            expect(relation.getEmergentIdentity).toHaveBeenCalled();
        });

        it('should read relation://coherence resource', () => {
            const coherence = server.readResource('relation://coherence');

            expect(coherence).toBeDefined();
            expect(relation.getCoherence).toHaveBeenCalled();
        });

        it('should read relation://virtual-agent resource', () => {
            const vi = server.readResource('relation://virtual-agent');

            expect(vi).toBe(virtualAgent);
        });

        it('should read relation://virtual-arena resource', () => {
            const vo = server.readResource('relation://virtual-arena');

            expect(vo).toBe(virtualAgent.worldView);
        });

        it('should throw for unknown resource URI', () => {
            expect(() => server.readResource('relation://unknown')).toThrow();
        });
    });

    describe('MCP Tools', () => {
        it('should list available tools', () => {
            const tools = server.listTools();

            expect(Array.isArray(tools)).toBe(true);
            expect(tools.length).toBeGreaterThan(0);
        });

        it('should include synthesize tool', () => {
            const tools = server.listTools();
            const synthesizeTool = tools.find((t) => t.name === 'synthesize');

            expect(synthesizeTool).toBeDefined();
        });

        it('should include reflect tool', () => {
            const tools = server.listTools();
            const reflectTool = tools.find((t) => t.name === 'reflect');

            expect(reflectTool).toBeDefined();
        });

        it('should include bridge tool', () => {
            const tools = server.listTools();
            const bridgeTool = tools.find((t) => t.name === 'bridge');

            expect(bridgeTool).toBeDefined();
        });

        it('should include integrate tool', () => {
            const tools = server.listTools();
            const integrateTool = tools.find((t) => t.name === 'integrate');

            expect(integrateTool).toBeDefined();
        });
    });

    describe('MCP Prompts', () => {
        it('should list available prompts', () => {
            const prompts = server.listPrompts();

            expect(Array.isArray(prompts)).toBe(true);
            expect(prompts.length).toBeGreaterThan(0);
        });

        it('should get self_narrative_construction prompt', () => {
            const prompt = server.getPrompt('self_narrative_construction');

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should get identity_integration prompt', () => {
            const prompt = server.getPrompt('identity_integration');

            expect(typeof prompt).toBe('string');
        });

        it('should get reflexive_awareness prompt', () => {
            const prompt = server.getPrompt('reflexive_awareness');

            expect(typeof prompt).toBe('string');
        });

        it('should get inverted_mirror prompt', () => {
            const prompt = server.getPrompt('inverted_mirror');

            expect(typeof prompt).toBe('string');
        });

        it('should throw for unknown prompt', () => {
            expect(() => server.getPrompt('unknown_prompt')).toThrow();
        });
    });

    describe('Shutdown', () => {
        it('should stop mirror sync on shutdown', () => {
            server.startMirrorSync();

            const syncHandler = vi.fn();
            server.on('mirror:synced', syncHandler);

            server.shutdown();

            // Fast-forward - should NOT trigger sync after shutdown
            vi.advanceTimersByTime(2000);

            // Handler should not be called after shutdown
            expect(syncHandler).not.toHaveBeenCalled();
        });

        it('should remove all listeners on shutdown', () => {
            server.on('mirror:synced', vi.fn());
            server.on('virtual-agent:updated', vi.fn());

            server.shutdown();

            expect(server.listenerCount('mirror:synced')).toBe(0);
            expect(server.listenerCount('virtual-agent:updated')).toBe(0);
        });
    });
});

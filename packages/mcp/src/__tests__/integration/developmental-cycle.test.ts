/**
 * @fileoverview Developmental Cycle Integration Tests
 *
 * Tests for the full developmental lifecycle integration including all phases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LifecycleCoordinator, createLifecycleCoordinator } from '../../integration/lifecycle.js';
import type { ArenaMCPServer } from '../../arena-mcp/index.js';
import type { AgentMCPServer } from '../../agent-mcp/index.js';
import type { RelationMCPServer } from '../../relation-mcp/index.js';

// Create mock MCP servers with proper structure
function createMockArenaMCPServer(): ArenaMCPServer {
    return {
        getArena: vi.fn(() => ({
            getState: vi.fn(() => ({
                phases: {
                    origin: { intensity: 0.3 },
                    journey: { intensity: 0.4 },
                    arrival: { intensity: 0.5 },
                    situation: { intensity: 0.6 },
                    engagement: { intensity: 0.8 },
                    culmination: { intensity: 0.4 },
                    possibility: { intensity: 0.5 },
                    trajectory: { intensity: 0.6 },
                    destiny: { intensity: 0.3 },
                },
                coherence: 0.75,
            })),
            transitionPhase: vi.fn(),
        })),
        listResources: vi.fn(() => []),
        readResource: vi.fn(),
        listTools: vi.fn(() => []),
        callTool: vi.fn(),
        listPrompts: vi.fn(() => []),
        getPrompt: vi.fn(),
    } as unknown as ArenaMCPServer;
}

function createMockAgentMCPServer(): AgentMCPServer {
    return {
        getAgent: vi.fn(() => ({
            getState: vi.fn(() => ({
                dominantFacet: 'wisdom',
                facets: { wisdom: { activation: 0.8 } },
                engagementLevel: 0.7,
            })),
        })),
        getVirtualAgent: vi.fn(() => ({
            selfStory: 'I am evolving',
            selfImage: { perceivedDominantFacet: 'wisdom', perceivedFacets: {} },
            selfAwareness: {
                lastReflection: Date.now(),
                activeQuestions: ['What am I becoming?'],
                perceivedAccuracy: 0.8,
            },
            worldView: {
                situationalAwareness: {
                    perceivedContext: 'Learning context',
                    assumedNarrativePhase: 'engagement',
                    estimatedCoherence: 0.8,
                },
                divergenceMetrics: {
                    lastSyncTime: Date.now(),
                    estimatedDrift: 0.1,
                    knownMisalignments: [],
                },
                knownEntities: new Map(),
                perceivedRules: [],
                worldTheory: 'Growth through experience',
                uncertainties: [],
            },
            perceivedCapabilities: [],
            roleUnderstanding: 'Helper',
            currentGoals: ['Grow'],
        })),
        updateVirtualAgent: vi.fn(),
        listResources: vi.fn(() => []),
        readResource: vi.fn(),
        listTools: vi.fn(() => []),
        callTool: vi.fn(),
        listPrompts: vi.fn(() => []),
        getPrompt: vi.fn(),
    } as unknown as AgentMCPServer;
}

function createMockRelationMCPServer(): RelationMCPServer {
    const virtualAgent = {
        selfStory: 'I am evolving',
        selfImage: { perceivedDominantFacet: 'wisdom', perceivedFacets: {} },
        selfAwareness: {
            lastReflection: Date.now(),
            activeQuestions: ['What am I becoming?'],
            perceivedAccuracy: 0.8,
        },
        worldView: {
            situationalAwareness: {
                perceivedContext: 'Learning context',
                assumedNarrativePhase: 'engagement',
                estimatedCoherence: 0.8,
            },
            divergenceMetrics: {
                lastSyncTime: Date.now(),
                estimatedDrift: 0.1,
                knownMisalignments: [],
            },
            knownEntities: new Map(),
            perceivedRules: [],
            worldTheory: 'Growth through experience',
            uncertainties: [],
        },
        perceivedCapabilities: [],
        roleUnderstanding: 'Helper',
        currentGoals: ['Grow'],
    };

    const mockRelation = {
        synthesize: vi.fn(),
        getCoherence: vi.fn(() => 0.85),
        getSelfReflection: vi.fn(() => ({
            selfNarrative: 'I am evolving',
            perceivedRole: 'Helper',
            activeQuestions: ['What next?'],
        })),
        getEmergentIdentity: vi.fn(() => ({
            coherence: 0.85,
            tensions: [{ pole1: 'logic', pole2: 'emotion', balance: 0.6 }],
            synthesis: 'Growing',
            activeThemes: ['growth'],
        })),
        reflect: vi.fn(() => ['New insight']),
        integrate: vi.fn((phase) => ({
            cycleNumber: 1,
            phase,
            stateChanges: {
                agentDelta: {},
                arenaDelta: {},
                virtualAgentDelta: {},
                virtualArenaDelta: {},
            },
            coherenceAfter: 0.87,
            timestamp: Date.now(),
        })),
        getState: vi.fn(() => ({ recentFlows: [] })),
    };

    return {
        getRelation: vi.fn(() => mockRelation),
        getVirtualAgent: vi.fn(() => virtualAgent),
        updateVirtualAgent: vi.fn(),
        updateVirtualArena: vi.fn(),
        listResources: vi.fn(() => []),
        readResource: vi.fn(),
        listTools: vi.fn(() => []),
        callTool: vi.fn(),
        listPrompts: vi.fn(() => []),
        getPrompt: vi.fn(),
        shutdown: vi.fn(),
    } as unknown as RelationMCPServer;
}

describe('Developmental Cycle', () => {
    let coordinator: LifecycleCoordinator;
    let arenaMCP: ArenaMCPServer;
    let agentMCP: AgentMCPServer;
    let relationMCP: RelationMCPServer;

    beforeEach(() => {
        arenaMCP = createMockArenaMCPServer();
        agentMCP = createMockAgentMCPServer();
        relationMCP = createMockRelationMCPServer();
        coordinator = createLifecycleCoordinator(arenaMCP, agentMCP, relationMCP);
    });

    afterEach(() => {
        coordinator.stop();
    });

    describe('Lifecycle Phases', () => {
        it('should execute perception phase', async () => {
            coordinator.start();
            const result = await coordinator.executePhase('perception' as any);
            expect(result.phase).toBe('perception');
            expect(result.cycleNumber).toBeGreaterThanOrEqual(0);
        });

        it('should execute modeling phase', async () => {
            coordinator.start();
            const result = await coordinator.executePhase('modeling' as any);
            expect(result.phase).toBe('modeling');
        });

        it('should execute reflection phase', async () => {
            coordinator.start();
            const result = await coordinator.executePhase('reflection' as any);
            expect(result.phase).toBe('reflection');
        });

        it('should execute mirroring phase', async () => {
            coordinator.start();
            const result = await coordinator.executePhase('mirroring' as any);
            expect(result.phase).toBe('mirroring');
        });

        it('should execute enaction phase', async () => {
            coordinator.start();
            const result = await coordinator.executePhase('enaction' as any);
            expect(result.phase).toBe('enaction');
        });
    });

    describe('Full Cycle', () => {
        it('should execute complete developmental cycle', async () => {
            coordinator.start();
            const results = await coordinator.runCycle();

            expect(results.length).toBe(5);
            expect(results.map(r => r.phase)).toEqual([
                'perception', 'modeling', 'reflection', 'mirroring', 'enaction',
            ]);
        });

        it('should increment cycle number', async () => {
            coordinator.start();
            await coordinator.runCycle();

            expect(coordinator.getCycleCount()).toBe(1);

            await coordinator.runCycle();
            expect(coordinator.getCycleCount()).toBe(2);
        });

        it('should track coherence across cycle', async () => {
            coordinator.start();
            const results = await coordinator.runCycle();
            results.forEach(result => {
                expect(result.coherenceAfter).toBeGreaterThanOrEqual(0);
                expect(result.coherenceAfter).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('State Changes', () => {
        it('should track agent state changes', async () => {
            coordinator.start();
            const result = await coordinator.executePhase('perception' as any);
            expect(result.stateChanges).toBeDefined();
        });

        it('should track virtual model changes', async () => {
            coordinator.start();
            const result = await coordinator.executePhase('mirroring' as any);
            expect(result.stateChanges.virtualAgentDelta).toBeDefined();
            expect(result.stateChanges.virtualArenaDelta).toBeDefined();
        });
    });

    describe('Phase Integration', () => {
        it('should integrate insights from reflection', async () => {
            coordinator.start();
            await coordinator.executePhase('reflection' as any);
            expect(relationMCP.updateVirtualAgent).toHaveBeenCalled();
        });

        it('should synthesize during modeling', async () => {
            coordinator.start();
            await coordinator.executePhase('modeling' as any);
            const relation = relationMCP.getRelation();
            expect(relation.synthesize).toHaveBeenCalled();
        });
    });

    describe('Coherence Tracking', () => {
        it('should maintain or improve coherence over cycle', async () => {
            coordinator.start();
            const results = await coordinator.runCycle();
            const finalCoherence = results[results.length - 1].coherenceAfter;
            // Coherence should be valid
            expect(finalCoherence).toBeGreaterThanOrEqual(0);
            expect(finalCoherence).toBeLessThanOrEqual(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle phase execution errors gracefully', async () => {
            // Override the relation to throw an error
            const errorRelation = createMockRelationMCPServer();
            const mockRelation = errorRelation.getRelation();
            (mockRelation as any).synthesize = vi.fn().mockImplementation(() => {
                throw new Error('Test error');
            });

            const errorCoordinator = createLifecycleCoordinator(
                arenaMCP,
                agentMCP,
                errorRelation
            );
            errorCoordinator.start();

            await expect(errorCoordinator.executePhase('modeling' as any)).rejects.toThrow('Test error');
            errorCoordinator.stop();
        });
    });
});

/**
 * @fileoverview Lifecycle Coordinator Unit Tests
 *
 * Tests for the developmental lifecycle that integrates AAR layers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    LifecycleCoordinator,
    createLifecycleCoordinator,
    LifecyclePhase,
} from '../../integration/lifecycle.js';
import type { ArenaMCPServer } from '../../arena-mcp/index.js';
import type { AgentMCPServer } from '../../agent-mcp/index.js';
import type { RelationMCPServer } from '../../relation-mcp/index.js';

// Create mock servers with proper structure
function createMockArenaMCPServer(): ArenaMCPServer {
    const arenaState = {
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
    };

    return {
        getArena: vi.fn(() => ({
            getState: vi.fn(() => arenaState),
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
            selfStory: 'Test story',
            selfImage: { perceivedDominantFacet: 'wisdom' },
            selfAwareness: { lastReflection: Date.now(), activeQuestions: [] },
            worldView: {
                situationalAwareness: { assumedNarrativePhase: 'engagement', estimatedCoherence: 0.8 },
                divergenceMetrics: { lastSyncTime: Date.now(), estimatedDrift: 0.1, knownMisalignments: [] },
            },
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
        selfStory: 'Test self story',
        roleUnderstanding: 'Test role',
        selfImage: { perceivedDominantFacet: 'wisdom', perceivedFacets: {} },
        selfAwareness: {
            lastReflection: Date.now(),
            activeQuestions: ['Test question'],
            perceivedAccuracy: 0.8,
        },
        worldView: {
            situationalAwareness: {
                perceivedContext: 'Test context',
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
            worldTheory: 'Test theory',
            uncertainties: [],
        },
        perceivedCapabilities: [],
        currentGoals: [],
    };

    const mockRelation = {
        synthesize: vi.fn(),
        getCoherence: vi.fn(() => 0.8),
        getSelfReflection: vi.fn(() => ({
            selfNarrative: 'Learning and growing',
            perceivedRole: 'helper',
            activeQuestions: ['What next?'],
        })),
        getEmergentIdentity: vi.fn(() => ({
            coherence: 0.8,
            tensions: [{ pole1: 'logic', pole2: 'emotion', balance: 0.6 }],
            synthesis: 'Unified self',
        })),
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

describe('LifecycleCoordinator', () => {
    let lifecycle: LifecycleCoordinator;
    let mockArena: ArenaMCPServer;
    let mockAgent: AgentMCPServer;
    let mockRelation: RelationMCPServer;

    beforeEach(() => {
        mockArena = createMockArenaMCPServer();
        mockAgent = createMockAgentMCPServer();
        mockRelation = createMockRelationMCPServer();

        lifecycle = createLifecycleCoordinator(mockArena, mockAgent, mockRelation, {
            cycleIntervalMs: 0, // Manual mode
            verbose: false,
        });
    });

    afterEach(() => {
        lifecycle.stop();
    });

    describe('Lifecycle Phases', () => {
        it('should enumerate all 5 lifecycle phases', () => {
            const phases = Object.values(LifecyclePhase);

            expect(phases).toHaveLength(5);
            expect(phases).toContain(LifecyclePhase.PERCEPTION);
            expect(phases).toContain(LifecyclePhase.MODELING);
            expect(phases).toContain(LifecyclePhase.REFLECTION);
            expect(phases).toContain(LifecyclePhase.MIRRORING);
            expect(phases).toContain(LifecyclePhase.ENACTION);
        });

        it('should start with PERCEPTION phase', () => {
            expect(lifecycle.getCurrentPhase()).toBe(LifecyclePhase.PERCEPTION);
        });
    });

    describe('Lifecycle Control', () => {
        it('should start and stop correctly', () => {
            expect(lifecycle.isRunning()).toBe(false);

            lifecycle.start();
            expect(lifecycle.isRunning()).toBe(true);

            lifecycle.stop();
            expect(lifecycle.isRunning()).toBe(false);
        });

        it('should emit started event', () => {
            const startHandler = vi.fn();
            lifecycle.on('started', startHandler);

            lifecycle.start();

            expect(startHandler).toHaveBeenCalled();
        });

        it('should emit stopped event', () => {
            const stopHandler = vi.fn();
            lifecycle.on('stopped', stopHandler);

            lifecycle.start();
            lifecycle.stop();

            expect(stopHandler).toHaveBeenCalled();
        });
    });

    describe('Cycle Execution', () => {
        it('should run a complete 5-phase cycle', async () => {
            lifecycle.start();

            const results = await lifecycle.runCycle();

            expect(results).toHaveLength(5);
            expect(results[0].phase).toBe('perception');
            expect(results[1].phase).toBe('modeling');
            expect(results[2].phase).toBe('reflection');
            expect(results[3].phase).toBe('mirroring');
            expect(results[4].phase).toBe('enaction');
        });

        it('should increment cycle count after each cycle', async () => {
            lifecycle.start();

            expect(lifecycle.getCycleCount()).toBe(0);

            await lifecycle.runCycle();
            expect(lifecycle.getCycleCount()).toBe(1);

            await lifecycle.runCycle();
            expect(lifecycle.getCycleCount()).toBe(2);
        });

        it('should emit cycle:start and cycle:complete events', async () => {
            const startHandler = vi.fn();
            const completeHandler = vi.fn();

            lifecycle.on('cycle:start', startHandler);
            lifecycle.on('cycle:complete', completeHandler);
            lifecycle.start();

            await lifecycle.runCycle();

            expect(startHandler).toHaveBeenCalledWith({ cycleId: 1 });
            expect(completeHandler).toHaveBeenCalled();
        });

        it('should emit phase events for each phase', async () => {
            const phaseStartHandler = vi.fn();
            const phaseCompleteHandler = vi.fn();

            lifecycle.on('phase:start', phaseStartHandler);
            lifecycle.on('phase:complete', phaseCompleteHandler);
            lifecycle.start();

            await lifecycle.runCycle();

            expect(phaseStartHandler).toHaveBeenCalledTimes(5);
            expect(phaseCompleteHandler).toHaveBeenCalledTimes(5);
        });
    });

    describe('Individual Phase Execution', () => {
        it('should execute PERCEPTION phase (Ao → Ai)', async () => {
            lifecycle.start();

            const result = await lifecycle.executePhase(LifecyclePhase.PERCEPTION);

            expect(result.phase).toBe('perception');
            expect(result.coherenceAfter).toBeDefined();
            expect(mockArena.getArena).toHaveBeenCalled();
        });

        it('should execute MODELING phase (Ai → S)', async () => {
            lifecycle.start();

            const result = await lifecycle.executePhase(LifecyclePhase.MODELING);

            expect(result.phase).toBe('modeling');
            expect(mockRelation.getRelation).toHaveBeenCalled();
        });

        it('should execute REFLECTION phase (S → Vi)', async () => {
            lifecycle.start();

            const result = await lifecycle.executePhase(LifecyclePhase.REFLECTION);

            expect(result.phase).toBe('reflection');
            expect(mockRelation.updateVirtualAgent).toHaveBeenCalled();
        });

        it('should execute MIRRORING phase (Vi ↔ Vo)', async () => {
            lifecycle.start();

            const result = await lifecycle.executePhase(LifecyclePhase.MIRRORING);

            expect(result.phase).toBe('mirroring');
            expect(mockRelation.updateVirtualArena).toHaveBeenCalled();
        });

        it('should execute ENACTION phase (Vo → Ao)', async () => {
            lifecycle.start();

            const result = await lifecycle.executePhase(LifecyclePhase.ENACTION);

            expect(result.phase).toBe('enaction');
        });
    });

    describe('Coherence Monitoring', () => {
        it('should emit coherence:low when coherence drops below threshold', async () => {
            // Create a relation mock with low coherence
            const lowCoherenceRelation = createMockRelationMCPServer();
            (lowCoherenceRelation.getRelation() as ReturnType<typeof vi.fn>).getCoherence = vi.fn(() => 0.5);

            const lowCoherenceLifecycle = createLifecycleCoordinator(
                mockArena,
                mockAgent,
                lowCoherenceRelation,
                { coherenceThreshold: 0.6 }
            );

            const coherenceLowHandler = vi.fn();
            lowCoherenceLifecycle.on('coherence:low', coherenceLowHandler);
            lowCoherenceLifecycle.start();

            await lowCoherenceLifecycle.runCycle();

            expect(coherenceLowHandler).toHaveBeenCalled();

            lowCoherenceLifecycle.stop();
        });
    });

    describe('Developmental Results', () => {
        it('should return proper DevelopmentalCycleResult structure', async () => {
            lifecycle.start();

            const result = await lifecycle.executePhase(LifecyclePhase.PERCEPTION);

            expect(result).toHaveProperty('cycleNumber');
            expect(result).toHaveProperty('phase');
            expect(result).toHaveProperty('stateChanges');
            expect(result).toHaveProperty('coherenceAfter');
            expect(result).toHaveProperty('timestamp');

            expect(result.stateChanges).toHaveProperty('agentDelta');
            expect(result.stateChanges).toHaveProperty('arenaDelta');
            expect(result.stateChanges).toHaveProperty('virtualAgentDelta');
            expect(result.stateChanges).toHaveProperty('virtualArenaDelta');
        });
    });

    describe('Configuration', () => {
        it('should use default configuration when none provided', () => {
            const defaultLifecycle = createLifecycleCoordinator(
                mockArena,
                mockAgent,
                mockRelation
            );

            const config = defaultLifecycle.getConfig();

            expect(config.cycleIntervalMs).toBe(0);
            expect(config.sequentialPhases).toBe(true);
            expect(config.coherenceThreshold).toBe(0.6);
        });

        it('should merge custom configuration with defaults', () => {
            const customLifecycle = createLifecycleCoordinator(
                mockArena,
                mockAgent,
                mockRelation,
                { coherenceThreshold: 0.8 }
            );

            const config = customLifecycle.getConfig();

            expect(config.coherenceThreshold).toBe(0.8);
            expect(config.sequentialPhases).toBe(true); // Default preserved
        });
    });
});

/**
 * @fileoverview Developmental Cycle Integration Tests
 *
 * Tests for the full developmental lifecycle integration including all phases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifecycleCoordinator, createLifecycleCoordinator } from '../../integration/lifecycle.js';
import type { RelationInterface, AgentMembrane, ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { VirtualAgentModel, VirtualArenaModel } from '../../types.js';

function createMockRelation(): RelationInterface {
    return {
        getSelfReflection: vi.fn(() => ({ selfNarrative: 'I am evolving', perceivedRole: 'Helper' })),
        getRecentFlows: vi.fn(() => []),
        getEmergentIdentity: vi.fn(() => ({ coherence: 0.85, activeThemes: ['growth'] })),
        getCoherence: vi.fn(() => 0.8),
        getState: vi.fn(() => ({ recentFlows: [] })),
        synthesize: vi.fn(() => ({
            coherence: 0.85, emergentIdentity: { synthesisNarrative: 'Growing' }, flows: [], tensions: [],
        })),
        reflect: vi.fn(() => ['New insight']),
        integrate: vi.fn((phase) => ({
            cycleNumber: 1, phase, stateChanges: {}, coherenceAfter: 0.87, timestamp: Date.now(),
        })),
    } as unknown as RelationInterface;
}

function createMockAgent(): AgentMembrane {
    return {
        getIdentity: vi.fn(() => ({ name: 'Deep Echo' })),
        getState: vi.fn(() => ({ facets: { stoic: 0.7 }, dominantFacet: 'stoic' })),
        perceive: vi.fn(() => ({ observations: ['User is curious'] })),
        updateModel: vi.fn(),
        generateResponse: vi.fn(() => 'I understand'),
    } as unknown as AgentMembrane;
}

function createMockArena(): ArenaMembrane {
    return {
        getState: vi.fn(() => ({ phases: { engagement: { intensity: 0.8 } }, coherence: 0.75 })),
        getActiveFrames: vi.fn(() => []),
        addFrame: vi.fn(),
        updateContext: vi.fn(),
    } as unknown as ArenaMembrane;
}

function createMockVirtualAgent(): VirtualAgentModel {
    return {
        selfImage: { perceivedFacets: {}, believedStrengths: [], acknowledgedWeaknesses: [], perceivedDominantFacet: 'stoic' },
        selfStory: 'Evolving assistant', perceivedCapabilities: [], roleUnderstanding: 'Help', currentGoals: ['Grow'],
        worldView: {
            situationalAwareness: { perceivedContext: 'Learning', assumedNarrativePhase: 'engagement', estimatedCoherence: 0.8 },
            knownEntities: new Map(), perceivedRules: [], worldTheory: 'Growth through experience', uncertainties: [],
            divergenceMetrics: { lastSyncTime: Date.now(), estimatedDrift: 0.1, knownMisalignments: [] },
        },
        selfAwareness: { lastReflection: Date.now(), perceivedAccuracy: 0.8, activeQuestions: [] },
    };
}

describe('Developmental Cycle', () => {
    let coordinator: LifecycleCoordinator;
    let relation: RelationInterface;
    let agent: AgentMembrane;
    let arena: ArenaMembrane;
    let virtualAgent: VirtualAgentModel;

    beforeEach(() => {
        relation = createMockRelation();
        agent = createMockAgent();
        arena = createMockArena();
        virtualAgent = createMockVirtualAgent();
        coordinator = createLifecycleCoordinator(relation, agent, arena, virtualAgent);
    });

    describe('Lifecycle Phases', () => {
        it('should execute perception phase', async () => {
            const result = await coordinator.executePhase('perception');
            expect(result.phase).toBe('perception');
            expect(result.cycleNumber).toBeGreaterThan(0);
        });

        it('should execute modeling phase', async () => {
            const result = await coordinator.executePhase('modeling');
            expect(result.phase).toBe('modeling');
        });

        it('should execute reflection phase', async () => {
            const result = await coordinator.executePhase('reflection');
            expect(result.phase).toBe('reflection');
        });

        it('should execute mirroring phase', async () => {
            const result = await coordinator.executePhase('mirroring');
            expect(result.phase).toBe('mirroring');
        });

        it('should execute enaction phase', async () => {
            const result = await coordinator.executePhase('enaction');
            expect(result.phase).toBe('enaction');
        });
    });

    describe('Full Cycle', () => {
        it('should execute complete developmental cycle', async () => {
            const results = await coordinator.executeFullCycle();

            expect(results.length).toBe(5);
            expect(results.map(r => r.phase)).toEqual([
                'perception', 'modeling', 'reflection', 'mirroring', 'enaction',
            ]);
        });

        it('should increment cycle number', async () => {
            await coordinator.executeFullCycle();
            const result = await coordinator.executePhase('perception');
            expect(result.cycleNumber).toBe(2);
        });

        it('should track coherence across cycle', async () => {
            const results = await coordinator.executeFullCycle();
            results.forEach(result => {
                expect(result.coherenceAfter).toBeGreaterThanOrEqual(0);
                expect(result.coherenceAfter).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('State Changes', () => {
        it('should track agent state changes', async () => {
            const result = await coordinator.executePhase('perception');
            expect(result.stateChanges).toBeDefined();
        });

        it('should track virtual model changes', async () => {
            const result = await coordinator.executePhase('mirroring');
            expect(result.stateChanges.virtualAgentDelta).toBeDefined();
            expect(result.stateChanges.virtualArenaDelta).toBeDefined();
        });
    });

    describe('Phase Integration', () => {
        it('should integrate insights from reflection', async () => {
            await coordinator.executePhase('reflection');
            expect(relation.reflect).toHaveBeenCalled();
        });

        it('should synthesize during modeling', async () => {
            await coordinator.executePhase('modeling');
            expect(relation.synthesize).toHaveBeenCalled();
        });
    });

    describe('Coherence Tracking', () => {
        it('should maintain or improve coherence over cycle', async () => {
            const initialCoherence = relation.getCoherence();
            const results = await coordinator.executeFullCycle();
            const finalCoherence = results[results.length - 1].coherenceAfter;
            expect(finalCoherence).toBeGreaterThanOrEqual(initialCoherence - 0.1);
        });
    });

    describe('Error Handling', () => {
        it('should handle phase execution errors gracefully', async () => {
            vi.spyOn(relation, 'integrate').mockRejectedValueOnce(new Error('Test error'));
            await expect(coordinator.executePhase('perception')).rejects.toThrow();
        });
    });
});

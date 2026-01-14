/**
 * @fileoverview Mirror Synchronization Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRelationMCPServer } from '../../relation-mcp/index.js';
import type { RelationInterface, AgentMembrane, ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { VirtualAgentModel } from '../../types.js';

function createMockRelation(): RelationInterface {
    return {
        getSelfReflection: vi.fn(() => ({ selfNarrative: 'Test', perceivedRole: 'Helper' })),
        getRecentFlows: vi.fn(() => []),
        getEmergentIdentity: vi.fn(() => ({ coherence: 0.85, activeThemes: [] })),
        getCoherence: vi.fn(() => 0.82),
        getState: vi.fn(() => ({ recentFlows: [] })),
    } as unknown as RelationInterface;
}

function createMockAgent(): AgentMembrane {
    return {
        getIdentity: vi.fn(() => ({ name: 'Deep Echo' })),
        getState: vi.fn(() => ({
            facets: { stoic: 0.7, analytical: 0.8 },
            dominantFacet: 'analytical',
            socialMemory: new Map(),
            transactionalMemory: [],
        })),
    } as unknown as AgentMembrane;
}

function createMockArena(): ArenaMembrane {
    return {
        getState: vi.fn(() => ({ phases: { engagement: { intensity: 0.8 } }, coherence: 0.75 })),
        getActiveFrames: vi.fn(() => []),
    } as unknown as ArenaMembrane;
}

function createMockVirtualAgent(): VirtualAgentModel {
    return {
        selfImage: { perceivedFacets: { stoic: 0.6 }, believedStrengths: [], acknowledgedWeaknesses: [], perceivedDominantFacet: 'analytical' },
        selfStory: 'I am helpful', perceivedCapabilities: [], roleUnderstanding: 'Assist', currentGoals: [],
        worldView: {
            situationalAwareness: { perceivedContext: 'Test', assumedNarrativePhase: 'engagement', estimatedCoherence: 0.7 },
            knownEntities: new Map(), perceivedRules: [], worldTheory: 'Test theory', uncertainties: [],
            divergenceMetrics: { lastSyncTime: Date.now() - 10000, estimatedDrift: 0.15, knownMisalignments: [] },
        },
        selfAwareness: { lastReflection: Date.now(), perceivedAccuracy: 0.8, activeQuestions: [] },
    };
}

describe('Mirror Synchronization', () => {
    let server: ReturnType<typeof createRelationMCPServer>;

    beforeEach(() => {
        server = createRelationMCPServer(createMockRelation(), createMockAgent(), createMockArena(), createMockVirtualAgent(), { enableMirroring: true, mirrorSyncIntervalMs: 100 });
    });

    afterEach(() => { server.shutdown(); });

    describe('Virtual Model Access', () => {
        it('should access Vi and Vo', () => {
            expect(server.getVirtualAgent().selfStory).toBe('I am helpful');
            expect(server.getVirtualArena().worldTheory).toBe('Test theory');
        });

        it('should show Vo is inside Vi (inverted mirror)', () => {
            expect(server.getVirtualArena()).toBe(server.getVirtualAgent().worldView);
        });
    });

    describe('Virtual Model Updates', () => {
        it('should update Vi', () => {
            server.updateVirtualAgent({ selfStory: 'Updated' });
            expect(server.getVirtualAgent().selfStory).toBe('Updated');
        });

        it('should update Vo', () => {
            server.updateVirtualArena({ worldTheory: 'New theory' });
            expect(server.getVirtualArena().worldTheory).toBe('New theory');
        });
    });

    describe('Drift and Sync', () => {
        it('should calculate drift', () => {
            const drift = server.calculateDrift();
            expect(drift).toBeGreaterThanOrEqual(0);
            expect(drift).toBeLessThanOrEqual(1);
        });

        it('should identify misalignments', () => {
            expect(Array.isArray(server.identifyMisalignments())).toBe(true);
        });

        it('should sync mirror', () => {
            server.syncMirror();
            expect(server.getVirtualArena().divergenceMetrics.lastSyncTime).toBeGreaterThan(0);
        });
    });

    describe('Mirror Pattern', () => {
        it('should maintain Ao[Ai[S(Vi(Vo))]] structure', () => {
            const vi = server.getVirtualAgent();
            expect(vi.worldView).toBe(server.getVirtualArena());
            expect(vi.selfAwareness).toBeDefined();
        });
    });
});

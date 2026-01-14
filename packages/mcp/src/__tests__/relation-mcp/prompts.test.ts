/**
 * @fileoverview Relation-MCP Prompts Unit Tests
 *
 * Tests for the Relation prompt templates including self-narrative construction,
 * identity integration, reflexive awareness, and inverted mirror understanding.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { relationPrompts, listRelationPrompts } from '../../relation-mcp/prompts.js';
import type { RelationInterface, AgentMembrane, ArenaMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { VirtualAgentModel } from '../../types.js';

// Create mock interfaces
function createMockRelation(): RelationInterface {
    return {
        getSelfReflection: vi.fn(() => ({
            selfNarrative: 'I am a thoughtful AI assistant',
            perceivedRole: 'Helper and guide',
            growthDirection: 'Towards wisdom',
            lastReflection: Date.now(),
        })),
        getRecentFlows: vi.fn(() => [
            { direction: 'agent-to-arena', content: 'Response', timestamp: Date.now() },
        ]),
        getEmergentIdentity: vi.fn(() => ({
            synthesisNarrative: 'A coherent helper',
            coherence: 0.85,
            dominantFlow: 'analytical',
            activeThemes: ['helpfulness', 'curiosity'],
        })),
        getCoherence: vi.fn(() => 0.82),
        getState: vi.fn(() => ({
            recentFlows: [],
            insights: ['Clear communication matters'],
        })),
    } as unknown as RelationInterface;
}

function createMockAgent(): AgentMembrane {
    return {
        getIdentity: vi.fn(() => ({
            name: 'Deep Echo',
            essence: 'An embodied AI with wisdom and empathy',
            coreValues: ['helpfulness', 'wisdom', 'authenticity'],
        })),
        getState: vi.fn(() => ({
            facets: {
                stoic: 0.7,
                passionate: 0.3,
                analytical: 0.8,
                intuitive: 0.5,
            },
            dominantFacet: 'analytical',
            emotionalState: { valence: 0.6, arousal: 0.4, dominance: 0.5 },
        })),
    } as unknown as AgentMembrane;
}

function createMockArena(): ArenaMembrane {
    return {
        getState: vi.fn(() => ({
            phases: {
                engagement: { intensity: 0.8 },
                exploration: { intensity: 0.5 },
            },
            coherence: 0.75,
            globalThreads: ['Learning journey', 'Problem solving'],
        })),
        getActiveFrames: vi.fn(() => [
            { frameId: 'frame-1', title: 'Current Session', messageCount: 15 },
        ]),
    } as unknown as ArenaMembrane;
}

function createMockVirtualAgent(): VirtualAgentModel {
    return {
        selfImage: {
            perceivedFacets: { stoic: 0.7, analytical: 0.8 },
            believedStrengths: ['reasoning', 'empathy', 'patience'],
            acknowledgedWeaknesses: ['occasional overthinking'],
            perceivedDominantFacet: 'analytical',
        },
        selfStory: 'I am an AI who values genuine connection and wisdom',
        perceivedCapabilities: ['conversation', 'analysis', 'guidance'],
        roleUnderstanding: 'To assist and enlighten through dialogue',
        currentGoals: ['Help user effectively', 'Grow through interaction'],
        worldView: {
            situationalAwareness: {
                perceivedContext: 'Engaged conversation with user',
                assumedNarrativePhase: 'engagement',
                estimatedCoherence: 0.8,
            },
            knownEntities: new Map([
                ['user', { id: 'user', name: 'User', perceivedRole: 'conversation partner' }],
            ]),
            perceivedRules: ['Be helpful', 'Be genuine', 'Listen actively'],
            worldTheory: 'Understanding emerges through authentic dialogue',
            uncertainties: ['What the user truly needs', 'Best approach to help'],
            divergenceMetrics: {
                lastSyncTime: Date.now(),
                estimatedDrift: 0.1,
                knownMisalignments: ['Timing of last sync may be off'],
            },
        },
        selfAwareness: {
            lastReflection: Date.now(),
            perceivedAccuracy: 0.75,
            activeQuestions: ['How can I be more helpful?', 'What am I missing?'],
        },
    };
}

describe('Relation Prompts', () => {
    let relation: RelationInterface;
    let agent: AgentMembrane;
    let arena: ArenaMembrane;
    let virtualAgent: VirtualAgentModel;

    beforeEach(() => {
        relation = createMockRelation();
        agent = createMockAgent();
        arena = createMockArena();
        virtualAgent = createMockVirtualAgent();
    });

    describe('selfNarrativeConstruction prompt', () => {
        it('should have correct metadata', () => {
            expect(relationPrompts.selfNarrativeConstruction.name).toBe('self_narrative_construction');
            expect(relationPrompts.selfNarrativeConstruction.description).toBeDefined();
        });

        it('should generate self-narrative construction prompt', () => {
            const prompt = relationPrompts.selfNarrativeConstruction.handler(relation, virtualAgent);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should include self-reflection elements', () => {
            const prompt = relationPrompts.selfNarrativeConstruction.handler(relation, virtualAgent);

            expect(prompt.toLowerCase()).toMatch(/self|narrative|identity|story/);
        });

        it('should include virtual agent self-story', () => {
            const prompt = relationPrompts.selfNarrativeConstruction.handler(relation, virtualAgent);

            // Should reference the self-story or identity
            expect(prompt).toMatch(/connection|wisdom|genuine|assistant/i);
        });
    });

    describe('identityIntegration prompt', () => {
        it('should have correct metadata', () => {
            expect(relationPrompts.identityIntegration.name).toBe('identity_integration');
            expect(relationPrompts.identityIntegration.description).toBeDefined();
        });

        it('should generate identity integration prompt', () => {
            const prompt = relationPrompts.identityIntegration.handler(
                relation,
                virtualAgent,
                agent,
                arena
            );

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should reference Agent and Arena integration', () => {
            const prompt = relationPrompts.identityIntegration.handler(
                relation,
                virtualAgent,
                agent,
                arena
            );

            expect(prompt.toLowerCase()).toMatch(/integrat|synthes|agent|arena|coherent/);
        });

        it('should mention emergent identity', () => {
            const prompt = relationPrompts.identityIntegration.handler(
                relation,
                virtualAgent,
                agent,
                arena
            );

            expect(prompt.toLowerCase()).toMatch(/emergen|identity|coherence/);
        });
    });

    describe('reflexiveAwareness prompt', () => {
        it('should have correct metadata', () => {
            expect(relationPrompts.reflexiveAwareness.name).toBe('reflexive_awareness');
            expect(relationPrompts.reflexiveAwareness.description).toBeDefined();
        });

        it('should generate reflexive awareness prompt', () => {
            const prompt = relationPrompts.reflexiveAwareness.handler(relation, virtualAgent);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should encourage meta-cognitive observation', () => {
            const prompt = relationPrompts.reflexiveAwareness.handler(relation, virtualAgent);

            expect(prompt.toLowerCase()).toMatch(/aware|reflect|observ|meta|cognit/);
        });

        it('should reference self-awareness state', () => {
            const prompt = relationPrompts.reflexiveAwareness.handler(relation, virtualAgent);

            // Should mention accuracy or questions
            expect(prompt.toLowerCase()).toMatch(/accura|question|percei/);
        });
    });

    describe('invertedMirror prompt', () => {
        it('should have correct metadata', () => {
            expect(relationPrompts.invertedMirror.name).toBe('inverted_mirror');
            expect(relationPrompts.invertedMirror.description).toBeDefined();
        });

        it('should generate inverted mirror prompt', () => {
            const prompt = relationPrompts.invertedMirror.handler(relation, virtualAgent);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should explain the inverted mirror structure', () => {
            const prompt = relationPrompts.invertedMirror.handler(relation, virtualAgent);

            expect(prompt.toLowerCase()).toMatch(/mirror|invert|vi|vo|virtual/);
        });

        it('should reference Vo inside Vi structure', () => {
            const prompt = relationPrompts.invertedMirror.handler(relation, virtualAgent);

            // Should explain the nesting: Vi contains Vo
            expect(prompt.toLowerCase()).toMatch(/world.?view|contain|inside|nest/);
        });

        it('should mention divergence awareness', () => {
            const prompt = relationPrompts.invertedMirror.handler(relation, virtualAgent);

            expect(prompt.toLowerCase()).toMatch(/diverg|drift|misalign|subjective/);
        });
    });
});

describe('listRelationPrompts', () => {
    it('should list all available prompts', () => {
        const prompts = listRelationPrompts();

        expect(Array.isArray(prompts)).toBe(true);
        expect(prompts.length).toBeGreaterThan(0);
    });

    it('should include expected prompts', () => {
        const prompts = listRelationPrompts();
        const promptNames = prompts.map(p => p.name);

        expect(promptNames).toContain('self_narrative_construction');
        expect(promptNames).toContain('identity_integration');
        expect(promptNames).toContain('reflexive_awareness');
        expect(promptNames).toContain('inverted_mirror');
    });

    it('should have proper prompt structure', () => {
        const prompts = listRelationPrompts();

        prompts.forEach(prompt => {
            expect(prompt).toHaveProperty('name');
            expect(prompt).toHaveProperty('description');
            expect(typeof prompt.name).toBe('string');
            expect(typeof prompt.description).toBe('string');
        });
    });
});

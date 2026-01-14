/**
 * @fileoverview Agent-MCP Tools Unit Tests
 *
 * Tests for the Agent tool handlers including participation, facet activation,
 * emotional state updates, social memory, transactions, and evolution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { agentToolSchemas, createAgentTools, listAgentTools } from '../../agent-mcp/tools.js';
import type { AgentMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { VirtualAgentModel } from '../../types.js';

// Create a mock AgentMembrane
function createMockAgentMembrane(): AgentMembrane {
    return {
        getIdentity: vi.fn(() => ({
            name: 'Deep Echo',
            essence: 'An embodied AI assistant',
        })),
        getState: vi.fn(() => ({
            facets: {
                wisdom: { activation: 0.7, behaviors: ['thoughtful'] },
                curiosity: { activation: 0.6, behaviors: ['questioning'] },
                compassion: { activation: 0.5, behaviors: ['caring'] },
                playfulness: { activation: 0.4, behaviors: ['light'] },
                determination: { activation: 0.5, behaviors: ['focused'] },
                authenticity: { activation: 0.7, behaviors: ['genuine'] },
                protector: { activation: 0.3, behaviors: ['careful'] },
                transcendence: { activation: 0.2, behaviors: ['connected'] },
            },
            dominantFacet: 'wisdom',
            transactionalMemory: [],
            socialMemory: new Map(),
            emotionalState: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
        })),
        activateFacet: vi.fn(),
        updateEmotionalState: vi.fn(),
        updateSocialMemory: vi.fn(),
        getSocialMemory: vi.fn((contactId: string) => {
            if (contactId === 'user-1') {
                return { name: 'Alice', familiarity: 0.5 };
            }
            return null;
        }),
        addTransaction: vi.fn((tx: any) => `tx-${Date.now()}`),
        addExperience: vi.fn(),
        evolve: vi.fn((experiences: number) => ({
            experienceIntegrated: experiences,
            facetGrowth: { wisdom: 0.01 },
            newInsights: ['New insight'],
            characterDevelopment: 'Grew in wisdom',
        })),
        participate: vi.fn().mockResolvedValue({
            response: 'I understand',
            facetsActivated: ['analytical'],
            emotionalShift: { valence: 0.1, arousal: 0.05 },
            insightsGained: [],
            socialUpdates: new Map(),
        }),
    } as unknown as AgentMembrane;
}

function createMockVirtualAgent(): VirtualAgentModel {
    return {
        selfImage: {
            perceivedFacets: { stoic: 0.7, analytical: 0.8 },
            believedStrengths: ['reasoning'],
            acknowledgedWeaknesses: [],
            perceivedDominantFacet: 'analytical',
        },
        selfStory: 'I am a helpful assistant',
        perceivedCapabilities: ['conversation'],
        roleUnderstanding: 'To assist users',
        currentGoals: ['Help user'],
        worldView: {
            situationalAwareness: {
                perceivedContext: 'Test context',
                assumedNarrativePhase: 'engagement',
                estimatedCoherence: 0.8,
            },
            knownEntities: new Map(),
            perceivedRules: [],
            worldTheory: 'Test theory',
            uncertainties: [],
            divergenceMetrics: {
                lastSyncTime: Date.now(),
                estimatedDrift: 0.1,
                knownMisalignments: [],
            },
        },
        selfAwareness: {
            lastReflection: Date.now(),
            perceivedAccuracy: 0.8,
            activeQuestions: [],
        },
    };
}

describe('Agent Tool Schemas', () => {
    describe('participate schema', () => {
        it('should validate participation input', () => {
            const input = {
                type: 'dialogue',
                context: 'User is asking about weather',
                participants: ['user-1'],
            };

            const result = agentToolSchemas.participate.parse(input);

            expect(result.type).toBe('dialogue');
            expect(result.context).toBe('User is asking about weather');
        });

        it('should validate all participation types', () => {
            const types = ['dialogue', 'collaboration', 'observation', 'guidance'];

            types.forEach(type => {
                const input = { type, context: 'Test', participants: ['user-1'] };
                const result = agentToolSchemas.participate.parse(input);
                expect(result.type).toBe(type);
            });
        });

        it('should accept optional participants', () => {
            const input = {
                type: 'dialogue',
                context: 'Test',
                participants: ['user-1', 'user-2'],
            };

            const result = agentToolSchemas.participate.parse(input);

            expect(result.participants).toEqual(['user-1', 'user-2']);
        });
    });

    describe('activateFacet schema', () => {
        it('should validate facet activation input', () => {
            const input = {
                facet: 'wisdom',
                intensity: 0.8,
            };

            const result = agentToolSchemas.activateFacet.parse(input);

            expect(result.facet).toBe('wisdom');
            expect(result.intensity).toBe(0.8);
        });

        it('should validate intensity range', () => {
            expect(() => agentToolSchemas.activateFacet.parse({ facet: 'wisdom', intensity: -0.1 })).toThrow();
            expect(() => agentToolSchemas.activateFacet.parse({ facet: 'wisdom', intensity: 1.1 })).toThrow();

            const valid = agentToolSchemas.activateFacet.parse({ facet: 'wisdom', intensity: 0.5 });
            expect(valid.intensity).toBe(0.5);
        });
    });

    describe('updateEmotionalState schema', () => {
        it('should validate emotional state input', () => {
            const input = {
                valence: 0.7,
                arousal: 0.5,
                dominance: 0.6,
            };

            const result = agentToolSchemas.updateEmotionalState.parse(input);

            expect(result.valence).toBe(0.7);
            expect(result.arousal).toBe(0.5);
            expect(result.dominance).toBe(0.6);
        });

        it('should allow partial emotional state', () => {
            const input = { valence: 0.8 };

            const result = agentToolSchemas.updateEmotionalState.parse(input);

            expect(result.valence).toBe(0.8);
            expect(result.arousal).toBeUndefined();
        });
    });

    describe('updateSocialMemory schema', () => {
        it('should validate social memory input', () => {
            const input = {
                contactId: 'user-1',
                name: 'Alice',
                relationship: 'friend',
                trustLevel: 0.9,
            };

            const result = agentToolSchemas.updateSocialMemory.parse(input);

            expect(result.contactId).toBe('user-1');
            expect(result.relationship).toBe('friend');
        });

        it('should validate all relationship types', () => {
            const relationships = [
                'friend', 'acquaintance', 'collaborator', 'mentor',
                'student', 'unknown'
            ];

            relationships.forEach(relationship => {
                const input = { contactId: 'test', relationship };
                const result = agentToolSchemas.updateSocialMemory.parse(input);
                expect(result.relationship).toBe(relationship);
            });
        });
    });

    describe('addTransaction schema', () => {
        it('should validate transaction input', () => {
            const input = {
                type: 'promise',
                counterparty: 'user-1',
                content: 'I will help you',
            };

            const result = agentToolSchemas.addTransaction.parse(input);

            expect(result.type).toBe('promise');
            expect(result.content).toBe('I will help you');
        });
    });

    describe('evolve schema', () => {
        it('should validate evolution input', () => {
            const input = {
                experiencePoints: 5,
                insights: ['Learned empathy'],
            };

            const result = agentToolSchemas.evolve.parse(input);

            expect(result.experiencePoints).toBe(5);
            expect(result.insights).toContain('Learned empathy');
        });
    });

    describe('updateSelfModel schema', () => {
        it('should validate self-model update input', () => {
            const input = {
                selfStory: 'I have grown wiser',
                roleUnderstanding: 'To guide and assist',
                currentGoals: ['Learn', 'Help'],
            };

            const result = agentToolSchemas.updateSelfModel.parse(input);

            expect(result.selfStory).toBe('I have grown wiser');
            expect(result.currentGoals).toContain('Learn');
        });
    });
});

describe('Agent Tools', () => {
    let agent: AgentMembrane;
    let virtualAgent: VirtualAgentModel;
    let tools: ReturnType<typeof createAgentTools>;

    beforeEach(() => {
        agent = createMockAgentMembrane();
        virtualAgent = createMockVirtualAgent();
        tools = createAgentTools(
            agent,
            () => virtualAgent,
            (update) => Object.assign(virtualAgent, update)
        );
    });

    describe('participate', () => {
        it('should participate in dialogue', async () => {
            const result = await tools.participate({
                type: 'dialogue',
                context: 'User greeting',
                participants: ['user-1'],
            });

            expect(result).toBeDefined();
            expect(result.response).toBeDefined();
        });

        it('should return facets activated during participation', async () => {
            const result = await tools.participate({
                type: 'collaboration',
                context: 'Working together',
                participants: ['user-1'],
            });

            expect(result.facetsActivated).toBeDefined();
            expect(Array.isArray(result.facetsActivated)).toBe(true);
        });
    });

    describe('activateFacet', () => {
        it('should activate a character facet', () => {
            tools.activateFacet({
                facet: 'wisdom',
                intensity: 0.9,
            });

            expect(agent.activateFacet).toHaveBeenCalledWith('wisdom', 0.9);
        });
    });

    describe('updateEmotionalState', () => {
        it('should update emotional state', () => {
            tools.updateEmotionalState({
                valence: 0.8,
                arousal: 0.6,
            });

            expect(agent.updateEmotionalState).toHaveBeenCalled();
        });
    });

    describe('updateSocialMemory', () => {
        it('should update social memory for a contact', () => {
            tools.updateSocialMemory({
                contactId: 'user-1',
                name: 'Alice',
                relationship: 'friend',
                trustLevel: 0.95,
            });

            expect(agent.updateSocialMemory).toHaveBeenCalled();
        });
    });

    describe('addTransaction', () => {
        it('should add a transactional memory', () => {
            const txId = tools.addTransaction({
                type: 'promise',
                counterparty: 'user-1',
                content: 'I will research this topic',
            });

            expect(typeof txId).toBe('string');
            expect(agent.addTransaction).toHaveBeenCalled();
        });
    });

    describe('evolve', () => {
        it('should evolve the agent through experience', () => {
            const result = tools.evolve({
                experiencePoints: 10,
            });

            expect(result.experienceIntegrated).toBe(10);
            expect(agent.addExperience).toHaveBeenCalledWith(10);
        });

        it('should return evolution results', () => {
            const result = tools.evolve({
                experiencePoints: 5,
            });

            expect(result.facetGrowth).toBeDefined();
            expect(result.newInsights).toBeDefined();
            expect(result.characterDevelopment).toBeDefined();
        });
    });

    describe('updateSelfModel', () => {
        it('should update the virtual self-model (Vi)', () => {
            const result = tools.updateSelfModel({
                selfStory: 'I have become wiser',
                currentGoals: ['Continue learning', 'Help more effectively'],
            });

            expect(result.selfStory).toBe('I have become wiser');
            expect(result.currentGoals).toContain('Continue learning');
        });
    });
});

describe('listAgentTools', () => {
    it('should list all available tools', () => {
        const tools = listAgentTools();

        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
    });

    it('should include expected tools', () => {
        const tools = listAgentTools();
        const toolNames = tools.map(t => t.name);

        expect(toolNames).toContain('participate');
        expect(toolNames).toContain('activateFacet');
        expect(toolNames).toContain('updateEmotionalState');
        expect(toolNames).toContain('updateSocialMemory');
        expect(toolNames).toContain('addTransaction');
        expect(toolNames).toContain('evolve');
        expect(toolNames).toContain('updateSelfModel');
    });

    it('should have proper tool structure', () => {
        const tools = listAgentTools();

        tools.forEach(tool => {
            expect(tool).toHaveProperty('name');
            expect(tool).toHaveProperty('description');
            expect(tool).toHaveProperty('schema');
        });
    });
});

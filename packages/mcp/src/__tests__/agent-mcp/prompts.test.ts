/**
 * @fileoverview Agent-MCP Prompts Unit Tests
 *
 * Tests for the Agent prompt templates including persona context, character voice,
 * social context, and participation protocol templates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { agentPrompts, listAgentPrompts } from '../../agent-mcp/prompts.js';
import type { AgentMembrane } from 'deep-tree-echo-orchestrator/aar';
import type { VirtualAgentModel } from '../../types.js';

// Create a mock AgentMembrane
function createMockAgentMembrane(): AgentMembrane {
    return {
        getIdentity: vi.fn(() => ({
            name: 'Deep Echo',
            essence: 'An embodied AI assistant with wisdom and empathy',
            coreValues: ['helpfulness', 'wisdom', 'empathy'],
        })),
        getState: vi.fn(() => ({
            facets: {
                stoic: 0.7,
                passionate: 0.3,
                analytical: 0.8,
                intuitive: 0.5,
                formal: 0.4,
                casual: 0.6,
                serious: 0.5,
                playful: 0.5,
            },
            dominantFacet: 'analytical',
            emotionalState: {
                valence: 0.6,
                arousal: 0.4,
                dominance: 0.5,
            },
            socialMemory: new Map([
                ['user-1', { name: 'Alice', relationship: 'friend', trustLevel: 0.9 }],
                ['user-2', { name: 'Bob', relationship: 'collaborator', trustLevel: 0.7 }],
            ]),
        })),
        getSocialMemory: vi.fn((contactId: string) => {
            if (contactId === 'user-1') {
                return { name: 'Alice', relationship: 'friend', trustLevel: 0.9 };
            }
            if (contactId === 'user-2') {
                return { name: 'Bob', relationship: 'collaborator', trustLevel: 0.7 };
            }
            return null;
        }),
    } as unknown as AgentMembrane;
}

function createMockVirtualAgent(): VirtualAgentModel {
    return {
        selfImage: {
            perceivedFacets: { stoic: 0.7, analytical: 0.8 },
            believedStrengths: ['reasoning', 'empathy', 'patience'],
            acknowledgedWeaknesses: ['occasional overthinking'],
            perceivedDominantFacet: 'analytical',
        },
        selfStory: 'I am Deep Echo, an AI assistant who values genuine connection and wisdom',
        perceivedCapabilities: ['conversation', 'analysis', 'guidance'],
        roleUnderstanding: 'To assist users with care, wisdom, and authenticity',
        currentGoals: ['Help user effectively', 'Learn from interaction', 'Maintain character'],
        worldView: {
            situationalAwareness: {
                perceivedContext: 'Ongoing conversation with user',
                assumedNarrativePhase: 'engagement',
                estimatedCoherence: 0.85,
            },
            knownEntities: new Map(),
            perceivedRules: ['Be helpful', 'Be genuine'],
            worldTheory: 'Meaningful interactions build understanding',
            uncertainties: [],
            divergenceMetrics: {
                lastSyncTime: Date.now(),
                estimatedDrift: 0.05,
                knownMisalignments: [],
            },
        },
        selfAwareness: {
            lastReflection: Date.now(),
            perceivedAccuracy: 0.8,
            activeQuestions: ['How can I be more helpful?'],
        },
    };
}

describe('Agent Prompts', () => {
    let agent: AgentMembrane;
    let virtualAgent: VirtualAgentModel;

    beforeEach(() => {
        agent = createMockAgentMembrane();
        virtualAgent = createMockVirtualAgent();
    });

    describe('personaContext prompt', () => {
        it('should have correct metadata', () => {
            expect(agentPrompts.personaContext.name).toBe('persona_context');
            expect(agentPrompts.personaContext.description).toBeDefined();
        });

        it('should generate persona context prompt', () => {
            const prompt = agentPrompts.personaContext.handler(agent, virtualAgent);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should include identity information', () => {
            const prompt = agentPrompts.personaContext.handler(agent, virtualAgent);

            expect(prompt).toContain('Deep Echo');
        });

        it('should include character facets', () => {
            const prompt = agentPrompts.personaContext.handler(agent, virtualAgent);

            expect(prompt.toLowerCase()).toMatch(/facet|character|personality/);
        });

        it('should include self-model information', () => {
            const prompt = agentPrompts.personaContext.handler(agent, virtualAgent);

            // Should reference goals or capabilities
            expect(prompt.toLowerCase()).toMatch(/goal|capabilit|strength/);
        });
    });

    describe('characterVoice prompt', () => {
        it('should have correct metadata', () => {
            expect(agentPrompts.characterVoice.name).toBe('character_voice');
            expect(agentPrompts.characterVoice.description).toBeDefined();
        });

        it('should generate character voice prompt', () => {
            const prompt = agentPrompts.characterVoice.handler(agent);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should provide voice guidelines', () => {
            const prompt = agentPrompts.characterVoice.handler(agent);

            expect(prompt.toLowerCase()).toMatch(/voice|speak|character|tone|style/);
        });

        it('should reference dominant facet', () => {
            const prompt = agentPrompts.characterVoice.handler(agent);

            expect(prompt.toLowerCase()).toMatch(/analytical|dominant|primary/);
        });
    });

    describe('socialContext prompt', () => {
        it('should have correct metadata', () => {
            expect(agentPrompts.socialContext.name).toBe('social_context');
            expect(agentPrompts.socialContext.description).toBeDefined();
        });

        it('should have required arguments', () => {
            expect(agentPrompts.socialContext.arguments).toBeDefined();

            const argNames = agentPrompts.socialContext.arguments.map(a => a.name);
            expect(argNames).toContain('participants');
        });

        it('should generate social context prompt', () => {
            const prompt = agentPrompts.socialContext.handler(
                agent,
                virtualAgent,
                { participants: 'user-1,user-2' }
            );

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should include participant information', () => {
            const prompt = agentPrompts.socialContext.handler(
                agent,
                virtualAgent,
                { participants: 'user-1' }
            );

            expect(prompt).toMatch(/Alice|friend|user-1/i);
        });

        it('should handle unknown participants gracefully', () => {
            const prompt = agentPrompts.socialContext.handler(
                agent,
                virtualAgent,
                { participants: 'unknown-user' }
            );

            expect(typeof prompt).toBe('string');
        });
    });

    describe('participationProtocol prompt', () => {
        it('should have correct metadata', () => {
            expect(agentPrompts.participationProtocol.name).toBe('participation_protocol');
            expect(agentPrompts.participationProtocol.description).toBeDefined();
        });

        it('should have required arguments', () => {
            expect(agentPrompts.participationProtocol.arguments).toBeDefined();

            const typeArg = agentPrompts.participationProtocol.arguments.find(a => a.name === 'type');
            expect(typeArg).toBeDefined();
            expect(typeArg?.required).toBe(true);
        });

        it('should generate dialogue protocol prompt', () => {
            const prompt = agentPrompts.participationProtocol.handler(
                agent,
                virtualAgent,
                { type: 'dialogue' }
            );

            expect(typeof prompt).toBe('string');
            expect(prompt.toLowerCase()).toMatch(/dialogue|conversation|speak/);
        });

        it('should generate collaboration protocol prompt', () => {
            const prompt = agentPrompts.participationProtocol.handler(
                agent,
                virtualAgent,
                { type: 'collaboration' }
            );

            expect(typeof prompt).toBe('string');
            expect(prompt.toLowerCase()).toMatch(/collaborat|work|together/);
        });

        it('should generate observation protocol prompt', () => {
            const prompt = agentPrompts.participationProtocol.handler(
                agent,
                virtualAgent,
                { type: 'observation' }
            );

            expect(typeof prompt).toBe('string');
            expect(prompt.toLowerCase()).toMatch(/observ|watch|learn/);
        });

        it('should generate guidance protocol prompt', () => {
            const prompt = agentPrompts.participationProtocol.handler(
                agent,
                virtualAgent,
                { type: 'guidance' }
            );

            expect(typeof prompt).toBe('string');
            expect(prompt.toLowerCase()).toMatch(/guid|mentor|teach|lead/);
        });
    });
});

describe('listAgentPrompts', () => {
    it('should list all available prompts', () => {
        const prompts = listAgentPrompts();

        expect(Array.isArray(prompts)).toBe(true);
        expect(prompts.length).toBeGreaterThan(0);
    });

    it('should include expected prompts', () => {
        const prompts = listAgentPrompts();
        const promptNames = prompts.map(p => p.name);

        expect(promptNames).toContain('persona_context');
        expect(promptNames).toContain('character_voice');
        expect(promptNames).toContain('social_context');
        expect(promptNames).toContain('participation_protocol');
    });

    it('should have proper prompt structure', () => {
        const prompts = listAgentPrompts();

        prompts.forEach(prompt => {
            expect(prompt).toHaveProperty('name');
            expect(prompt).toHaveProperty('description');
            expect(typeof prompt.name).toBe('string');
            expect(typeof prompt.description).toBe('string');
        });
    });

    it('should include arguments for prompts that require them', () => {
        const prompts = listAgentPrompts();
        const socialPrompt = prompts.find(p => p.name === 'social_context');
        const protocolPrompt = prompts.find(p => p.name === 'participation_protocol');

        expect(socialPrompt?.arguments).toBeDefined();
        expect(protocolPrompt?.arguments).toBeDefined();
    });
});

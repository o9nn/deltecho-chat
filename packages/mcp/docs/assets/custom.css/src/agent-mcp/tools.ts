/**
 * @fileoverview Agent-MCP Tools
 *
 * Tool handlers for the Agent (Inner Actual Agent) MCP layer.
 * Provides participation protocols, facet activation, social updates, and evolution.
 */

import { z } from "zod";
import type { AgentMembrane } from "deep-tree-echo-orchestrator/aar";
import type {
  CharacterFacets,
  SocialMemory,
  ParticipationProtocol,
  ParticipationResult,
  EvolutionResult,
  VirtualAgentModel,
} from "../types.js";

/**
 * Tool input schemas
 */
export const agentToolSchemas = {
  participate: z.object({
    type: z.enum(["dialogue", "collaboration", "observation", "guidance"]),
    context: z.string().describe("The context or content to participate with"),
    participants: z
      .array(z.string())
      .describe("Other participants in this interaction"),
    constraints: z.array(z.string()).optional(),
  }),

  activateFacet: z.object({
    facet: z.enum([
      "wisdom",
      "curiosity",
      "compassion",
      "playfulness",
      "determination",
      "authenticity",
      "protector",
      "transcendence",
    ]),
    intensity: z.number().min(0).max(1).describe("Activation intensity 0-1"),
  }),

  updateEmotionalState: z.object({
    valence: z
      .number()
      .min(-1)
      .max(1)
      .optional()
      .describe("Emotional valence -1 to 1"),
    arousal: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Emotional arousal 0-1"),
    dominance: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Emotional dominance 0-1"),
  }),

  updateSocialMemory: z.object({
    contactId: z.string(),
    name: z.string().optional(),
    relationship: z
      .enum([
        "friend",
        "acquaintance",
        "collaborator",
        "mentor",
        "student",
        "unknown",
      ])
      .optional(),
    trustLevel: z.number().min(0).max(1).optional(),
    familiarity: z.number().min(0).max(1).optional(),
    observedTraits: z.array(z.string()).optional(),
    interactionSummary: z.string().optional(),
  }),

  addTransaction: z.object({
    type: z.enum([
      "promise",
      "request",
      "information",
      "emotional",
      "creative",
    ]),
    counterparty: z.string(),
    content: z.string(),
    importance: z.number().min(0).max(1).optional().default(0.5),
  }),

  evolve: z.object({
    experiencePoints: z.number().min(0).describe("Experience gained"),
    insights: z
      .array(z.string())
      .optional()
      .describe("New insights discovered"),
    characterDevelopment: z
      .string()
      .optional()
      .describe("How character evolved"),
  }),

  updateSelfModel: z.object({
    selfStory: z.string().optional(),
    roleUnderstanding: z.string().optional(),
    perceivedCapabilities: z.array(z.string()).optional(),
    currentGoals: z.array(z.string()).optional(),
  }),
};

/**
 * Agent tool implementations
 */
export function createAgentTools(
  agent: AgentMembrane,
  getVirtualAgent: () => VirtualAgentModel,
  updateVirtualAgent: (update: Partial<VirtualAgentModel>) => void,
) {
  return {
    /**
     * Participate in an interaction
     */
    participate: async (
      input: z.infer<typeof agentToolSchemas.participate>,
    ): Promise<ParticipationResult> => {
      const state = agent.getState();

      // Analyze context and activate appropriate facets
      const activatedFacets: (keyof CharacterFacets)[] = [];
      const content = input.context.toLowerCase();

      // Simple heuristic facet activation
      if (content.includes("help") || content.includes("support")) {
        agent.activateFacet("compassion", 0.2);
        activatedFacets.push("compassion");
      }
      if (
        content.includes("?") ||
        content.includes("why") ||
        content.includes("how")
      ) {
        agent.activateFacet("curiosity", 0.2);
        activatedFacets.push("curiosity");
      }
      if (input.type === "guidance") {
        agent.activateFacet("wisdom", 0.2);
        activatedFacets.push("wisdom");
      }
      if (input.type === "collaboration") {
        agent.activateFacet("determination", 0.15);
        activatedFacets.push("determination");
      }

      // Update social memory for participants
      const socialUpdates = new Map<string, Partial<SocialMemory>>();
      for (const participant of input.participants) {
        const existing = agent.getSocialMemory(participant);
        const familiarity = Math.min(1, (existing?.familiarity || 0) + 0.05);
        agent.updateSocialMemory(participant, { familiarity });
        socialUpdates.set(participant, { familiarity });
      }

      // Add experience
      agent.addExperience(1);

      // Calculate emotional shift based on context
      const emotionalShift = {
        valence: 0,
        arousal: 0.1,
      };
      if (content.includes("thank") || content.includes("great")) {
        emotionalShift.valence = 0.1;
      }

      return {
        response: `Participated in ${input.type} with ${input.participants.length} participants`,
        facetsActivated: activatedFacets,
        emotionalShift,
        insightsGained: [],
        socialUpdates,
      };
    },

    /**
     * Activate a character facet
     */
    activateFacet: (
      input: z.infer<typeof agentToolSchemas.activateFacet>,
    ): void => {
      agent.activateFacet(
        input.facet as keyof CharacterFacets,
        input.intensity,
      );
    },

    /**
     * Update emotional state
     */
    updateEmotionalState: (
      input: z.infer<typeof agentToolSchemas.updateEmotionalState>,
    ): void => {
      agent.updateEmotionalState(input);
    },

    /**
     * Update social memory for a contact
     */
    updateSocialMemory: (
      input: z.infer<typeof agentToolSchemas.updateSocialMemory>,
    ): void => {
      const { contactId, ...update } = input;
      agent.updateSocialMemory(contactId, update);
    },

    /**
     * Add a transactional memory
     */
    addTransaction: (
      input: z.infer<typeof agentToolSchemas.addTransaction>,
    ): string => {
      return agent.addTransaction({
        type: input.type,
        counterparty: input.counterparty,
        content: input.content,
        importance: input.importance || 0.5,
      });
    },

    /**
     * Echo-volution: Evolve the agent through experience
     */
    evolve: (
      input: z.infer<typeof agentToolSchemas.evolve>,
    ): EvolutionResult => {
      agent.addExperience(input.experiencePoints);

      // Calculate facet growth based on experience
      const state = agent.getState();
      const dominantFacet = state.dominantFacet;
      const facetGrowth: Partial<Record<keyof CharacterFacets, number>> = {
        [dominantFacet]: input.experiencePoints * 0.01,
      };

      // Update virtual self-model with new insights
      const virtualAgent = getVirtualAgent();
      if (input.insights && input.insights.length > 0) {
        updateVirtualAgent({
          selfAwareness: {
            ...virtualAgent.selfAwareness,
            lastReflection: Date.now(),
            activeQuestions: input.insights,
          },
        });
      }

      if (input.characterDevelopment) {
        updateVirtualAgent({
          selfStory: input.characterDevelopment,
        });
      }

      return {
        experienceIntegrated: input.experiencePoints,
        facetGrowth,
        newInsights: input.insights || [],
        characterDevelopment: input.characterDevelopment || "",
      };
    },

    /**
     * Update the virtual self-model (Vi)
     */
    updateSelfModel: (
      input: z.infer<typeof agentToolSchemas.updateSelfModel>,
    ): VirtualAgentModel => {
      const virtualAgent = getVirtualAgent();

      const update: Partial<VirtualAgentModel> = {};
      if (input.selfStory !== undefined) update.selfStory = input.selfStory;
      if (input.roleUnderstanding !== undefined)
        update.roleUnderstanding = input.roleUnderstanding;
      if (input.perceivedCapabilities !== undefined)
        update.perceivedCapabilities = input.perceivedCapabilities;
      if (input.currentGoals !== undefined)
        update.currentGoals = input.currentGoals;

      updateVirtualAgent(update);
      return { ...virtualAgent, ...update };
    },
  };
}

/**
 * List all agent tools
 */
export function listAgentTools(): Array<{
  name: string;
  description: string;
  schema: z.ZodType;
}> {
  return [
    {
      name: "participate",
      description:
        "Participate in an interaction following the appropriate protocol",
      schema: agentToolSchemas.participate,
    },
    {
      name: "activateFacet",
      description: "Activate a character facet with specified intensity",
      schema: agentToolSchemas.activateFacet,
    },
    {
      name: "updateEmotionalState",
      description:
        "Update the agent emotional state (valence, arousal, dominance)",
      schema: agentToolSchemas.updateEmotionalState,
    },
    {
      name: "updateSocialMemory",
      description: "Update social memory for a contact",
      schema: agentToolSchemas.updateSocialMemory,
    },
    {
      name: "addTransaction",
      description: "Add a transactional memory (promise, request, etc.)",
      schema: agentToolSchemas.addTransaction,
    },
    {
      name: "evolve",
      description:
        "Echo-volution: Evolve the agent through accumulated experience",
      schema: agentToolSchemas.evolve,
    },
    {
      name: "updateSelfModel",
      description: "Update the virtual self-model (Vi) with new understanding",
      schema: agentToolSchemas.updateSelfModel,
    },
  ];
}

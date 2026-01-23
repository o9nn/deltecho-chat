/**
 * @fileoverview Relation-MCP Tools
 *
 * Tool handlers for the Relation (Self Interface) MCP layer.
 * Provides synthesis, reflection, bridging, and developmental integration.
 */

import { z } from "zod";
import type {
  RelationInterface,
  AgentMembrane,
  ArenaMembrane,
} from "deep-tree-echo-orchestrator/aar";
import type {
  SynthesisResult,
  DevelopmentalCycleResult,
  CognitiveFlow,
  VirtualAgentModel,
  VirtualArenaModel,
} from "../types.js";

/**
 * Tool input schemas
 */
export const relationToolSchemas = {
  synthesize: z.object({
    force: z
      .boolean()
      .optional()
      .default(false)
      .describe("Force synthesis even if recent"),
  }),

  reflect: z.object({
    interactions: z
      .array(
        z.object({
          role: z.string(),
          content: z.string(),
        }),
      )
      .describe("Recent interactions to reflect upon"),
    depth: z.enum(["shallow", "medium", "deep"]).optional().default("medium"),
  }),

  bridge: z.object({
    direction: z.enum(["agent-to-arena", "arena-to-agent", "bidirectional"]),
    contentType: z.enum([
      "experience",
      "insight",
      "emotion",
      "narrative",
      "decision",
      "reflection",
    ]),
    content: z.any().describe("The content to flow between membranes"),
    intensity: z.number().min(0).max(1).optional().default(0.5),
  }),

  integrate: z.object({
    phase: z
      .enum(["perception", "modeling", "reflection", "mirroring", "enaction"])
      .optional()
      .describe("Specific phase to execute, or all if omitted"),
  }),

  updateSelfNarrative: z.object({
    narrative: z.string().describe("New self-narrative"),
    perceivedRole: z.string().optional(),
    growthDirection: z.string().optional(),
  }),

  addInsight: z.object({
    insight: z.string().describe("The insight discovered"),
    source: z.enum(["reflection", "interaction", "synthesis", "external"]),
  }),

  updateVirtualArena: z.object({
    perceivedContext: z.string().optional(),
    assumedNarrativePhase: z.string().optional(),
    worldTheory: z.string().optional(),
    uncertainties: z.array(z.string()).optional(),
  }),

  measureDivergence: z.object({}),

  getRecentFlows: z.object({
    limit: z.number().optional().default(10),
  }),

  createFlow: z.object({
    type: z.enum(["agent-to-arena", "arena-to-agent", "bidirectional"]),
    content: z.any(),
    intensity: z.number().optional().default(0.5),
  }),
};

/**
 * Relation tool implementations
 */
export function createRelationTools(
  relation: RelationInterface,
  getAgent: () => AgentMembrane,
  getArena: () => ArenaMembrane,
  getVirtualAgent: () => VirtualAgentModel,
  updateVirtualAgent: (update: Partial<VirtualAgentModel>) => void,
) {
  return {
    /**
     * Synthesize Agent and Arena states through Relation
     */
    synthesize: (
      _input: z.infer<typeof relationToolSchemas.synthesize>,
    ): SynthesisResult => {
      const agent = getAgent();
      const arena = getArena();

      relation.synthesize(agent.getState(), arena.getState());

      const emergentIdentity = relation.getEmergentIdentity();
      const flows = relation.getState().recentFlows.slice(-10);

      return {
        coherence: relation.getCoherence(),
        emergentIdentity,
        flows,
        tensions: emergentIdentity.tensions,
      };
    },

    /**
     * Get recent cognitive flows
     */
    getRecentFlows: (
      input: z.infer<typeof relationToolSchemas.getRecentFlows>,
    ): any[] => {
      const flows = relation.getState().recentFlows;
      return flows.slice(-(input.limit || 10));
    },

    /**
     * Reflect on interactions to generate insights
     */
    reflect: (input: z.infer<typeof relationToolSchemas.reflect>): string[] => {
      relation.reflectOnInteractions(input.interactions);
      const insights = relation.getSelfReflection().recentInsights || [];

      // Depth affects how many insights we generate/return
      const depthMultiplier = { shallow: 1, medium: 2, deep: 3 };
      const maxInsights = depthMultiplier[input.depth || "medium"];

      return insights.slice(0, maxInsights);
    },

    /**
     * Create a new cognitive flow
     */
    createFlow: (
      input: z.infer<typeof relationToolSchemas.createFlow>,
    ): string => {
      return relation.recordFlow({
        direction: input.type as any,
        contentType: "reflection", // Default content type as it is generic
        content: input.content,
        intensity: input.intensity,
      }).id;
    },

    /**
     * Bridge content between Agent and Arena membranes
     */
    bridge: (
      input: z.infer<typeof relationToolSchemas.bridge>,
    ): CognitiveFlow => {
      return relation.recordFlow({
        direction: input.direction,
        contentType: input.contentType,
        content: input.content,
        intensity: input.intensity,
      });
    },

    /**
     * Execute developmental lifecycle integration
     */
    integrate: (
      input: z.infer<typeof relationToolSchemas.integrate>,
    ): DevelopmentalCycleResult => {
      const agent = getAgent();
      const arena = getArena();
      const virtualAgent = getVirtualAgent();

      // Track state before
      const agentStateBefore = agent.getState();
      const arenaStateBefore = arena.getState();

      // Execute integration based on phase
      const phase = input.phase || "reflection"; // Default to reflection

      switch (phase) {
        case "perception":
          // Ao → Ai: World events reach the agent
          // This is typically triggered by external input
          break;

        case "modeling":
          // Ai → S: Agent processes through relational self
          relation.synthesize(agent.getState(), arena.getState());
          break;

        case "reflection": {
          // S → Vi: Self updates virtual agent model
          const selfReflection = relation.getSelfReflection();
          updateVirtualAgent({
            selfStory: selfReflection.selfNarrative,
            roleUnderstanding: selfReflection.perceivedRole,
            selfAwareness: {
              ...virtualAgent.selfAwareness,
              lastReflection: Date.now(),
              activeQuestions: selfReflection.activeQuestions,
            },
          });
          break;
        }

        case "mirroring": {
          // Vi ↔ Vo: Self-model updates world-view (INVERTED)
          // This is where the inverted mirror magic happens
          const emergent = relation.getEmergentIdentity();
          updateVirtualAgent({
            worldView: {
              ...virtualAgent.worldView,
              situationalAwareness: {
                ...virtualAgent.worldView.situationalAwareness,
                estimatedCoherence: emergent.coherence,
              },
              divergenceMetrics: {
                lastSyncTime: Date.now(),
                estimatedDrift: 1 - emergent.coherence,
                knownMisalignments: emergent.tensions.map(
                  (t) => `${t.pole1} vs ${t.pole2}`,
                ),
              },
            },
          });
          break;
        }

        case "enaction":
          // Vo → Ao: World-view guides action in actual world
          // This typically manifests as response generation
          break;
      }

      // Calculate deltas
      const agentStateAfter = agent.getState();
      const arenaStateAfter = arena.getState();

      return {
        cycleNumber: Date.now(), // Use timestamp as cycle ID
        phase,
        stateChanges: {
          agentDelta: computeStateDelta(agentStateBefore, agentStateAfter),
          arenaDelta: computeStateDelta(arenaStateBefore, arenaStateAfter),
          virtualAgentDelta: {},
          virtualArenaDelta: {},
        },
        coherenceAfter: relation.getCoherence(),
        timestamp: Date.now(),
      };
    },

    /**
     * Update the self-narrative
     */
    updateSelfNarrative: (
      input: z.infer<typeof relationToolSchemas.updateSelfNarrative>,
    ): void => {
      if (input.narrative) relation.updateSelfNarrative(input.narrative);
      if (input.perceivedRole)
        relation.updatePerceivedRole(input.perceivedRole);
      if (input.growthDirection)
        relation.updateGrowthDirection(input.growthDirection);
    },

    /**
     * Add a new insight
     */
    addInsight: (
      input: z.infer<typeof relationToolSchemas.addInsight>,
    ): void => {
      relation.addInsight(input.insight);
    },

    /**
     * Update the virtual arena (Vo) - the agent's world-view
     */
    updateVirtualArena: (
      input: z.infer<typeof relationToolSchemas.updateVirtualArena>,
    ): VirtualArenaModel => {
      const virtualAgent = getVirtualAgent();
      const currentVo = virtualAgent.worldView;

      const updatedVo: VirtualArenaModel = {
        ...currentVo,
        situationalAwareness: {
          ...currentVo.situationalAwareness,
          perceivedContext:
            input.perceivedContext ||
            currentVo.situationalAwareness.perceivedContext,
          assumedNarrativePhase:
            (input.assumedNarrativePhase as any) ||
            currentVo.situationalAwareness.assumedNarrativePhase,
        },
        worldTheory: input.worldTheory || currentVo.worldTheory,
        uncertainties: input.uncertainties || currentVo.uncertainties,
      };

      updateVirtualAgent({
        worldView: updatedVo,
      });

      return updatedVo;
    },

    /**
     * Measure divergence between Actual and Virtual models
     */
    measureDivergence: (
      _input: z.infer<typeof relationToolSchemas.measureDivergence>,
    ): {
      agentDivergence: number;
      arenaDivergence: number;
      overallDivergence: number;
      misalignments: string[];
    } => {
      const virtualAgent = getVirtualAgent();
      const agent = getAgent();
      const arena = getArena();

      // Compare Vi to Ai (virtual agent to actual agent)
      const actualDominant = agent.getState().dominantFacet;
      const virtualDominant = virtualAgent.selfImage.perceivedDominantFacet;
      const agentDivergence = actualDominant === virtualDominant ? 0 : 0.3;

      // Compare Vo to Ao (virtual arena to actual arena)
      const actualPhase = Object.entries(arena.getState().phases).sort(
        ([, a], [, b]) => b.intensity - a.intensity,
      )[0]?.[0];
      const virtualPhase =
        virtualAgent.worldView.situationalAwareness.assumedNarrativePhase;
      const arenaDivergence = actualPhase === virtualPhase ? 0 : 0.3;

      // Coherence divergence
      const actualCoherence = arena.getState().coherence;
      const virtualCoherence =
        virtualAgent.worldView.situationalAwareness.estimatedCoherence;
      const coherenceDivergence = Math.abs(actualCoherence - virtualCoherence);

      const overallDivergence =
        (agentDivergence + arenaDivergence + coherenceDivergence) / 3;

      const misalignments: string[] = [];
      if (actualDominant !== virtualDominant) {
        misalignments.push(
          `Facet: actual=${actualDominant}, perceived=${virtualDominant}`,
        );
      }
      if (actualPhase !== virtualPhase) {
        misalignments.push(
          `Phase: actual=${actualPhase}, perceived=${virtualPhase}`,
        );
      }
      if (coherenceDivergence > 0.1) {
        misalignments.push(
          `Coherence: actual=${actualCoherence.toFixed(
            2,
          )}, perceived=${virtualCoherence.toFixed(2)}`,
        );
      }

      return {
        agentDivergence,
        arenaDivergence,
        overallDivergence,
        misalignments,
      };
    },
  };
}

/**
 * Helper to compute state delta
 */
function computeStateDelta(before: any, after: any): any {
  // Simple delta - in production this would be more sophisticated
  return {
    changed: JSON.stringify(before) !== JSON.stringify(after),
  };
}

/**
 * List all relation tools
 */
export function listRelationTools(): Array<{
  name: string;
  description: string;
  schema: z.ZodType;
}> {
  return [
    {
      name: "synthesize",
      description:
        "Synthesize Agent and Arena states through the Relation interface",
      schema: relationToolSchemas.synthesize,
    },
    {
      name: "reflect",
      description: "Reflect on interactions to generate insights",
      schema: relationToolSchemas.reflect,
    },
    {
      name: "bridge",
      description: "Bridge cognitive content between Agent and Arena membranes",
      schema: relationToolSchemas.bridge,
    },
    {
      name: "integrate",
      description: "Execute a developmental lifecycle phase",
      schema: relationToolSchemas.integrate,
    },
    {
      name: "updateSelfNarrative",
      description: "Update the self-narrative and perceived role",
      schema: relationToolSchemas.updateSelfNarrative,
    },
    {
      name: "addInsight",
      description: "Add a new insight discovered through reflection",
      schema: relationToolSchemas.addInsight,
    },
    {
      name: "updateVirtualArena",
      description:
        "Update the virtual world-view (Vo) - the agent's mental image of the world",
      schema: relationToolSchemas.updateVirtualArena,
    },
    {
      name: "measureDivergence",
      description: "Measure divergence between Actual and Virtual models",
      schema: relationToolSchemas.measureDivergence,
    },
    {
      name: "getRecentFlows",
      description: "Get recent cognitive flows",
      schema: relationToolSchemas.getRecentFlows,
    },
    {
      name: "createFlow",
      description: "Create a new cognitive flow",
      schema: relationToolSchemas.createFlow,
    },
  ];
}

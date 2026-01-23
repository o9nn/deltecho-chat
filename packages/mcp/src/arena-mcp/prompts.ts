/**
 * @fileoverview Arena-MCP Prompts
 *
 * Prompt templates for the Arena (Outer Actual World) MCP layer.
 * Provides world context injection, narrative weaving, and orchestration directives.
 */

import type { ArenaMembrane } from "deep-tree-echo-orchestrator/aar";
import type { AgentReference, NarrativePhases } from "../types.js";

/**
 * Arena prompt definitions
 */
export const arenaPrompts = {
  /**
   * World Context Injection
   * Provides full context of the current world state for LLM processing
   */
  worldContext: {
    name: "world_context",
    description: "Inject full world context for situated understanding",
    handler: (
      arena: ArenaMembrane,
      agentRegistry: Map<string, AgentReference>,
    ): string => {
      const state = arena.getState();
      const frames = arena.getActiveFrames();
      const currentFrame = frames.find(
        (f) => f.frameId === state.currentFrameId,
      );

      // Find dominant narrative phase
      const phases = Object.entries(state.phases) as [
        keyof NarrativePhases,
        { intensity: number; name: string },
      ][];
      const dominantPhase = phases.sort(
        (a, b) => b[1].intensity - a[1].intensity,
      )[0];

      const agents = Array.from(agentRegistry.values());

      return `## World Context (Arena State)

**Current Frame**: ${currentFrame?.title || "Root"}
**Frame Status**: ${currentFrame?.status || "active"}
**Message Count**: ${currentFrame?.messageCount || 0}
**Participants**: ${currentFrame?.participants.join(", ") || "None"}

**Narrative Phase**: ${dominantPhase[1].name} (${(
        dominantPhase[1].intensity * 100
      ).toFixed(0)}% intensity)
**Temporal Flow**: ${dominantPhase[1].name}
**Global Threads**: ${state.globalThreads.join(", ") || "None established"}

**World Coherence**: ${(state.coherence * 100).toFixed(1)}%
**Active Agents**: ${agents.filter((a) => a.status === "active").length}/${
        agents.length
      }

**Gestalt Progress**:
- Patterns Recognized: ${state.gestaltProgress.patternsRecognized}
- Emergent Insights: ${state.gestaltProgress.emergentInsights}
- Narrative Integration: ${(
        state.gestaltProgress.narrativeIntegration * 100
      ).toFixed(1)}%

**Reservoir Summary**: ${
        state.yggdrasilReservoir.length
      } lore entries accumulated`;
    },
  },

  /**
   * Narrative Weaving Template
   * Guides story development across sessions
   */
  narrativeWeaving: {
    name: "narrative_weaving",
    description: "Template for weaving coherent narratives",
    handler: (arena: ArenaMembrane): string => {
      const state = arena.getState();
      const phases = state.phases;

      // Get thematic elements from current frame
      const frames = arena.getActiveFrames();
      const currentFrame = frames.find(
        (f) => f.frameId === state.currentFrameId,
      );
      const thematicElements =
        currentFrame?.narrativeContext.thematicElements || [];

      return `## Narrative Weaving Guide

You are weaving a narrative within the 9-phase story cycle:

**PAST (Where we came from)**:
- Origin (${(phases.origin.intensity * 100).toFixed(0)}%): ${
        phases.origin.storyElements.join(", ") || "Unexplored"
      }
- Journey (${(phases.journey.intensity * 100).toFixed(0)}%): ${
        phases.journey.storyElements.join(", ") || "Unexplored"
      }
- Arrival (${(phases.arrival.intensity * 100).toFixed(0)}%): ${
        phases.arrival.storyElements.join(", ") || "Unexplored"
      }

**PRESENT (Where we are)**:
- Situation (${(phases.situation.intensity * 100).toFixed(0)}%): ${
        phases.situation.storyElements.join(", ") || "Undefined"
      }
- Engagement (${(phases.engagement.intensity * 100).toFixed(0)}%): ${
        phases.engagement.storyElements.join(", ") || "Active"
      }
- Culmination (${(phases.culmination.intensity * 100).toFixed(0)}%): ${
        phases.culmination.storyElements.join(", ") || "Pending"
      }

**FUTURE (Where we're going)**:
- Possibility (${(phases.possibility.intensity * 100).toFixed(0)}%): ${
        phases.possibility.storyElements.join(", ") || "Open"
      }
- Trajectory (${(phases.trajectory.intensity * 100).toFixed(0)}%): ${
        phases.trajectory.storyElements.join(", ") || "Uncharted"
      }
- Destiny (${(phases.destiny.intensity * 100).toFixed(0)}%): ${
        phases.destiny.storyElements.join(", ") || "Unknown"
      }

**Active Thematic Elements**: ${thematicElements.join(", ") || "None defined"}
**Global Story Threads**: ${
        state.globalThreads.join(", ") || "None established"
      }

Weave responses that honor the current phase while hinting at possible transitions.`;
    },
  },

  /**
   * Orchestration Directive Template
   * For coordinating multiple agents
   */
  orchestrationDirective: {
    name: "orchestration_directive",
    description: "Template for multi-agent coordination",
    arguments: [
      { name: "goal", description: "The coordination goal", required: true },
      {
        name: "agents",
        description: "Comma-separated agent names",
        required: true,
      },
    ],
    handler: (
      _arena: ArenaMembrane,
      agentRegistry: Map<string, AgentReference>,
      args: { goal: string; agents: string },
    ): string => {
      const agentNames = args.agents.split(",").map((s) => s.trim());
      const agents = agentNames
        .map((name) =>
          Array.from(agentRegistry.values()).find((a) => a.name === name),
        )
        .filter(Boolean) as AgentReference[];

      return `## Orchestration Directive

**Goal**: ${args.goal}

**Participating Agents**:
${agents
  .map((a) => `- **${a.name}** (${a.agentId}) - Status: ${a.status}`)
  .join("\n")}

**Coordination Protocol**:
1. Each agent processes the goal through their character facets
2. Agents may communicate through the Relation interface
3. Arena synthesizes agent responses into coherent action
4. Lore is cultivated from significant collaborative insights

**Context Thread**: All responses should advance the current narrative phase while maintaining character authenticity.

Await agent responses and synthesize into unified outcome.`;
    },
  },

  /**
   * Lore Cultivation Template
   * For extracting and storing wisdom
   */
  loreCultivation: {
    name: "lore_cultivation",
    description: "Template for cultivating lore from interactions",
    handler: (arena: ArenaMembrane): string => {
      const reservoir = arena.getState().yggdrasilReservoir;
      const recentLore = reservoir.slice(-5);

      const categoryStats = reservoir.reduce(
        (acc, lore) => {
          acc[lore.category] = (acc[lore.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return `## Lore Cultivation Guide

The Yggdrasil Reservoir grows through meaningful interactions.

**Current Reservoir Stats**:
- Total Entries: ${reservoir.length}
- Categories: ${Object.entries(categoryStats)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}

**Recent Lore**:
${recentLore
  .map((l) => `- [${l.category}] ${l.content.slice(0, 100)}...`)
  .join("\n")}

**Cultivation Criteria**:
- **Wisdom**: Universal truths or principles discovered
- **Story**: Narrative elements worth remembering
- **Relationship**: Social dynamics and connections formed
- **Insight**: Deep understanding gained through reflection
- **Pattern**: Recurring structures or behaviors noticed
- **Emergence**: Unexpected properties arising from interaction

When significant insights arise, cultivate them into the reservoir with appropriate tags.`;
    },
  },
};

/**
 * List all arena prompts with metadata
 */
export function listArenaPrompts(): Array<{
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required: boolean }>;
}> {
  return Object.values(arenaPrompts).map((prompt) => ({
    name: prompt.name,
    description: prompt.description,
    arguments: "arguments" in prompt ? prompt.arguments : undefined,
  }));
}

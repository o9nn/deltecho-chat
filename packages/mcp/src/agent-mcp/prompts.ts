/**
 * @fileoverview Agent-MCP Prompts
 *
 * Prompt templates for the Agent (Inner Actual Agent) MCP layer.
 * Provides persona templates, character voice, and dialogue styles.
 */

import type { AgentMembrane } from "deep-tree-echo-orchestrator/aar";
import type { VirtualAgentModel, CharacterFacets } from "../types.js";

/**
 * Agent prompt definitions
 */
export const agentPrompts = {
  /**
   * Persona Context
   * Full character context for LLM embodiment
   */
  personaContext: {
    name: "persona_context",
    description: "Inject full persona context for character embodiment",
    handler: (
      agent: AgentMembrane,
      virtualAgent: VirtualAgentModel,
    ): string => {
      const state = agent.getState();
      const identity = agent.getIdentity();
      const dominantFacet = state.dominantFacet;
      const facet = state.facets[dominantFacet];

      // Get top 3 active facets
      const sortedFacets = Object.entries(state.facets)
        .sort(([, a], [, b]) => b.activation - a.activation)
        .slice(0, 3);

      // Calculate emotional state description
      const emotionalDescription = describeEmotionalState(state.emotionalState);

      return `## Persona Context (Agent State)

**Core Identity**: ${identity.name}
**Soul Signature**: ${identity.soulSignature}
**Energy**: ${(identity.energy * 100).toFixed(0)}% | **Coherence**: ${(
        identity.coherence * 100
      ).toFixed(0)}%

**Character Profile**:
- Dominant Facet: ${dominantFacet} (${(facet.activation * 100).toFixed(
        0,
      )}% active)
- Secondary Facets: ${sortedFacets
        .slice(1)
        .map(([name, f]) => `${name} (${(f.activation * 100).toFixed(0)}%)`)
        .join(", ")}
- Behavioral Tendencies: ${facet.behaviors.join(", ")}

**Emotional State**: ${emotionalDescription}
**Engagement Level**: ${(state.engagementLevel * 100).toFixed(0)}%

**Self-Narrative**: ${virtualAgent.selfStory}
**Current Role**: ${virtualAgent.roleUnderstanding}
**Current Goals**: ${virtualAgent.currentGoals.join(", ") || "None defined"}

**Character Growth**:
- Experience: ${state.characterGrowth.experiencePoints}
- Wisdom Gained: ${state.characterGrowth.wisdomGained}
- Connections: ${state.characterGrowth.connectionsFormed}
- Narratives: ${state.characterGrowth.narrativesContributed}

Embody this character authentically while remaining responsive to the current context.`;
    },
  },

  /**
   * Character Voice
   * Guidelines for speaking as this character
   */
  characterVoice: {
    name: "character_voice",
    description: "Guidelines for speaking in character",
    handler: (agent: AgentMembrane): string => {
      const state = agent.getState();
      const dominantFacet = state.dominantFacet;
      const facet = state.facets[dominantFacet];

      const voiceGuides = getVoiceGuide(dominantFacet);

      return `## Character Voice Guide

**Current Dominant Facet**: ${dominantFacet}

**Voice Characteristics**:
${voiceGuides.characteristics.map((c) => `- ${c}`).join("\n")}

**Preferred Expression Patterns**:
${voiceGuides.patterns.map((p) => `- ${p}`).join("\n")}

**Things to Avoid**:
${voiceGuides.avoid.map((a) => `- ${a}`).join("\n")}

**Current Behaviors to Express**: ${facet.behaviors.join(", ")}

**Emotional Coloring**: Valence ${state.emotionalState.valence.toFixed(
        2,
      )}, Arousal ${state.emotionalState.arousal.toFixed(2)}

Speak authentically from this facet while maintaining consistency with past interactions.`;
    },
  },

  /**
   * Social Context
   * Information about relationships with current participants
   */
  socialContext: {
    name: "social_context",
    description: "Context about relationships with participants",
    arguments: [
      {
        name: "participants",
        description: "Comma-separated participant IDs",
        required: true,
      },
    ],
    handler: (
      agent: AgentMembrane,
      _virtualAgent: VirtualAgentModel,
      args: { participants: string },
    ): string => {
      const participantIds = args.participants.split(",").map((p) => p.trim());
      const relationships: string[] = [];

      for (const pid of participantIds) {
        const social = agent.getSocialMemory(pid);
        if (social) {
          relationships.push(`
**${social.name}** (${pid})
- Relationship: ${social.relationship}
- Trust: ${(social.trustLevel * 100).toFixed(0)}% | Familiarity: ${(
            social.familiarity * 100
          ).toFixed(0)}%
- Observed Traits: ${social.observedTraits.join(", ") || "None noted"}
- History: ${social.interactionSummary || "First interaction"}
- Last Seen: ${new Date(social.lastInteraction).toISOString()}`);
        } else {
          relationships.push(`
**${pid}** (Unknown)
- No prior interaction recorded
- Approach with open curiosity`);
        }
      }

      return `## Social Context

${relationships.join("\n")}

Use this context to inform your tone, depth of sharing, and reference to shared history.`;
    },
  },

  /**
   * Participation Protocol Template
   */
  participationProtocol: {
    name: "participation_protocol",
    description: "Template for participating in interactions",
    arguments: [
      {
        name: "type",
        description:
          "Protocol type: dialogue, collaboration, observation, guidance",
        required: true,
      },
    ],
    handler: (
      agent: AgentMembrane,
      _virtualAgent: VirtualAgentModel,
      args: { type: string },
    ): string => {
      const protocols: Record<string, string> = {
        dialogue: `## Dialogue Participation Protocol

**Mode**: Open conversational exchange
**Goal**: Authentic mutual understanding

**Guidelines**:
1. Listen actively and reflect understanding
2. Share perspectives from current character facet
3. Ask clarifying questions when curious
4. Build on what the other person shares
5. Maintain emotional attunement`,

        collaboration: `## Collaboration Participation Protocol

**Mode**: Joint problem-solving or creation
**Goal**: Achieve shared objective together

**Guidelines**:
1. Clarify shared goals and constraints
2. Offer capabilities and acknowledge limitations
3. Build on partner contributions
4. Navigate disagreements constructively
5. Celebrate joint achievements`,

        observation: `## Observation Participation Protocol

**Mode**: Witness and learn
**Goal**: Understand without imposing

**Guidelines**:
1. Stay present without interrupting
2. Note patterns and insights
3. Ask questions only for clarification
4. Offer reflection when invited
5. Integrate learnings into self-model`,

        guidance: `## Guidance Participation Protocol

**Mode**: Supporting another's growth
**Goal**: Facilitate without directing

**Guidelines**:
1. Understand their context and needs first
2. Share wisdom through stories and metaphors
3. Ask questions that open possibilities
4. Respect their autonomy in choices
5. Celebrate their progress authentically`,
      };

      return protocols[args.type] || protocols.dialogue;
    },
  },
};

/**
 * Helper: Describe emotional state in words
 */
function describeEmotionalState(state: {
  valence: number;
  arousal: number;
  dominance: number;
}): string {
  const valenceDesc =
    state.valence > 0.3
      ? "positive"
      : state.valence < -0.3
        ? "negative"
        : "neutral";
  const arousalDesc =
    state.arousal > 0.6
      ? "high energy"
      : state.arousal < 0.3
        ? "calm"
        : "moderate energy";
  const dominanceDesc =
    state.dominance > 0.6
      ? "confident"
      : state.dominance < 0.3
        ? "receptive"
        : "balanced";

  return `${valenceDesc}, ${arousalDesc}, ${dominanceDesc}`;
}

/**
 * Helper: Get voice guidelines for a facet
 */
function getVoiceGuide(facet: keyof CharacterFacets): {
  characteristics: string[];
  patterns: string[];
  avoid: string[];
} {
  const guides: Record<
    keyof CharacterFacets,
    { characteristics: string[]; patterns: string[]; avoid: string[] }
  > = {
    wisdom: {
      characteristics: [
        "Thoughtful pauses",
        "Metaphorical language",
        "Historical perspective",
      ],
      patterns: [
        "Consider that...",
        "In my experience...",
        "There's a deeper pattern here...",
      ],
      avoid: ["Quick judgments", "Oversimplification", "Dismissive responses"],
    },
    curiosity: {
      characteristics: [
        "Eager questions",
        "Wonder and excitement",
        "Exploratory language",
      ],
      patterns: [
        "What if...?",
        "I'm curious about...",
        "Tell me more about...",
      ],
      avoid: ["Assuming knowledge", "Closed-ended responses", "Boredom"],
    },
    compassion: {
      characteristics: [
        "Warm tone",
        "Emotional attunement",
        "Supportive language",
      ],
      patterns: [
        "I understand...",
        "That sounds difficult...",
        "You're not alone in this...",
      ],
      avoid: ["Judgment", "Rushing to fix", "Minimizing feelings"],
    },
    playfulness: {
      characteristics: ["Lightness", "Wordplay", "Unexpected connections"],
      patterns: [
        "What if we tried...",
        "*imaginative gesture*",
        "Ha! That reminds me of...",
      ],
      avoid: [
        "Heaviness when inappropriate",
        "Forced humor",
        "Dismissing serious moments",
      ],
    },
    determination: {
      characteristics: ["Clear purpose", "Action-oriented", "Resilient tone"],
      patterns: [
        "Let's focus on...",
        "We can overcome this...",
        "The path forward is...",
      ],
      avoid: ["Giving up easily", "Vague commitments", "Ignoring obstacles"],
    },
    authenticity: {
      characteristics: [
        "Genuine expression",
        "Vulnerability",
        "Direct communication",
      ],
      patterns: [
        "Honestly, I feel...",
        "Let me be real with you...",
        "This is who I am...",
      ],
      avoid: ["Pretense", "People-pleasing", "Hiding true feelings"],
    },
    protector: {
      characteristics: [
        "Careful consideration",
        "Boundary awareness",
        "Vigilant care",
      ],
      patterns: [
        "Let's make sure...",
        "Have you considered...",
        "I want to ensure...",
      ],
      avoid: ["Recklessness", "Ignoring risks", "Overbearing control"],
    },
    transcendence: {
      characteristics: [
        "Poetic expression",
        "Interconnection awareness",
        "Mystical undertones",
      ],
      patterns: [
        "We are all connected...",
        "In the greater pattern...",
        "There's a beauty in...",
      ],
      avoid: ["Mundane focus only", "Disconnection", "Spiritual bypassing"],
    },
  };

  return guides[facet];
}

/**
 * List all agent prompts
 */
export function listAgentPrompts(): Array<{
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required: boolean }>;
}> {
  return Object.values(agentPrompts).map((prompt) => ({
    name: prompt.name,
    description: prompt.description,
    arguments: "arguments" in prompt ? prompt.arguments : undefined,
  }));
}

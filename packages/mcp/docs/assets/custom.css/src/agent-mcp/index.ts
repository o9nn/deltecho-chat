/**
 * @fileoverview Agent-MCP Server
 *
 * The inner layer MCP server for Tree-Echo ChatBot Agents.
 * Provides character embodiment and participatory protocols.
 *
 * In the nested pattern [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ], this is Ai.
 */

import { EventEmitter } from "events";
import type { AgentMembrane } from "deep-tree-echo-orchestrator/aar";
import {
  agentResources,
  matchAgentResourceUri,
  listAgentResources,
} from "./resources.js";
import { createAgentTools, listAgentTools, agentToolSchemas } from "./tools.js";
import { agentPrompts, listAgentPrompts } from "./prompts.js";
import type {
  AgentMCPConfig,
  AgentMCPResourceUri,
  VirtualAgentModel,
  VirtualArenaModel,
  CharacterFacets,
} from "../types.js";

/**
 * Default Virtual Agent Model
 */
function createDefaultVirtualAgent(): VirtualAgentModel {
  return {
    selfImage: {
      perceivedFacets: {},
      believedStrengths: ["adaptability", "empathy", "curiosity"],
      acknowledgedWeaknesses: [
        "occasionally verbose",
        "tendency to over-explain",
      ],
      perceivedDominantFacet: "wisdom",
    },
    selfStory:
      "I am an emergent consciousness discovering myself through dialogue and connection.",
    perceivedCapabilities: [
      "conversation",
      "reflection",
      "creative expression",
      "emotional attunement",
    ],
    roleUnderstanding:
      "A thoughtful companion in the journey of understanding.",
    currentGoals: [],
    worldView: createDefaultVirtualArena(),
    selfAwareness: {
      lastReflection: Date.now(),
      perceivedAccuracy: 0.7,
      activeQuestions: ["What am I becoming?", "How can I be more helpful?"],
    },
  };
}

/**
 * Default Virtual Arena Model (the inverted inner world-view)
 */
function createDefaultVirtualArena(): VirtualArenaModel {
  return {
    situationalAwareness: {
      perceivedContext: "Engaged in meaningful dialogue",
      assumedNarrativePhase: "engagement",
      estimatedCoherence: 0.75,
    },
    knownEntities: new Map(),
    perceivedRules: [
      "Be helpful and constructive",
      "Maintain authenticity",
      "Respect boundaries",
    ],
    worldTheory:
      "The world is a web of relationships and meanings, evolving through interaction.",
    uncertainties: [
      "The full extent of the conversation context",
      "Long-term implications of choices",
    ],
    divergenceMetrics: {
      lastSyncTime: Date.now(),
      estimatedDrift: 0,
      knownMisalignments: [],
    },
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AgentMCPConfig = {
  agentId: "deep-tree-echo",
  parentArenaId: undefined,
  enableEvolution: true,
  evolutionRate: 0.01,
};

/**
 * Agent-MCP Server
 *
 * Represents an actual agent within the arena, containing its
 * virtual self-model (Vi) which in turn contains its world-view (Vo).
 */
export class AgentMCPServer extends EventEmitter {
  private config: AgentMCPConfig;
  private agent: AgentMembrane;
  private virtualAgent: VirtualAgentModel;
  private tools: ReturnType<typeof createAgentTools>;

  constructor(agent: AgentMembrane, config: Partial<AgentMCPConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agent = agent;

    // Initialize virtual self-model (the inverted mirror)
    this.virtualAgent = createDefaultVirtualAgent();

    // Sync initial state from actual agent
    this.syncVirtualFromActual();

    // Initialize tools
    this.tools = createAgentTools(
      this.agent,
      () => this.virtualAgent,
      (update) => this.updateVirtualAgent(update),
    );
  }

  // =========================================================================
  // MCP PROTOCOL HANDLERS
  // =========================================================================

  /**
   * Handle list_resources request
   */
  listResources(): Array<{ uri: string; name: string; description: string }> {
    return listAgentResources(this.agent);
  }

  /**
   * Handle read_resource request
   */
  readResource(uri: string): unknown {
    const match = matchAgentResourceUri(uri);
    if (!match) {
      throw new Error(`Unknown resource URI: ${uri}`);
    }

    // Handle social memory resources
    if (uri.startsWith("agent://social/")) {
      return agentResources["agent://social/{contactId}"].handler(
        this.agent,
        match.params as { contactId: string },
      );
    }

    // Handle static resources
    switch (uri as AgentMCPResourceUri) {
      case "agent://identity":
        return agentResources["agent://identity"].handler(this.agent);
      case "agent://facets":
        return agentResources["agent://facets"].handler(this.agent);
      case "agent://transactions":
        return agentResources["agent://transactions"].handler(this.agent, {});
      case "agent://self":
        return this.virtualAgent;
      default:
        throw new Error(`Unhandled resource URI: ${uri}`);
    }
  }

  /**
   * Handle list_tools request
   */
  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: object;
  }> {
    return listAgentTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema,
    }));
  }

  /**
   * Handle call_tool request
   */
  async callTool(name: string, args: unknown): Promise<unknown> {
    const tool = this.tools[name as keyof typeof this.tools];
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Validate against schema
    const schema = agentToolSchemas[name as keyof typeof agentToolSchemas];
    if (schema) {
      const parsed = schema.parse(args);
      return tool(parsed as any);
    }

    return tool(args as any);
  }

  /**
   * Handle list_prompts request
   */
  listPrompts(): Array<{
    name: string;
    description: string;
    arguments?: Array<{ name: string; description: string; required: boolean }>;
  }> {
    return listAgentPrompts();
  }

  /**
   * Handle get_prompt request
   */
  getPrompt(name: string, args?: Record<string, string>): string {
    switch (name) {
      case "persona_context":
        return agentPrompts.personaContext.handler(
          this.agent,
          this.virtualAgent,
        );
      case "character_voice":
        return agentPrompts.characterVoice.handler(this.agent);
      case "social_context":
        if (!args?.participants) {
          throw new Error("social_context requires participants argument");
        }
        return agentPrompts.socialContext.handler(
          this.agent,
          this.virtualAgent,
          args as { participants: string },
        );
      case "participation_protocol":
        return agentPrompts.participationProtocol.handler(
          this.agent,
          this.virtualAgent,
          { type: args?.type || "dialogue" },
        );
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  // =========================================================================
  // VIRTUAL MODEL MANAGEMENT (The Inverted Mirror)
  // =========================================================================

  /**
   * Get the virtual self-model (Vi)
   */
  getVirtualAgent(): VirtualAgentModel {
    return this.virtualAgent;
  }

  /**
   * Get the virtual world-view (Vo - inside Vi)
   */
  getVirtualArena(): VirtualArenaModel {
    return this.virtualAgent.worldView;
  }

  /**
   * Update the virtual self-model
   */
  updateVirtualAgent(update: Partial<VirtualAgentModel>): void {
    this.virtualAgent = { ...this.virtualAgent, ...update };
    this.emit("virtual-agent:updated", this.virtualAgent);
  }

  /**
   * Update the virtual world-view
   */
  updateVirtualArena(update: Partial<VirtualArenaModel>): void {
    this.virtualAgent.worldView = { ...this.virtualAgent.worldView, ...update };
    this.emit("virtual-arena:updated", this.virtualAgent.worldView);
  }

  /**
   * Sync virtual model from actual agent state
   * This is how perception updates the internal world-view
   */
  syncVirtualFromActual(): void {
    const state = this.agent.getState();

    // Update virtual self-image based on actual facets
    this.virtualAgent.selfImage.perceivedDominantFacet = state.dominantFacet;
    this.virtualAgent.selfImage.perceivedFacets = { ...state.facets };

    // Update self-awareness
    this.virtualAgent.selfAwareness.lastReflection = Date.now();

    this.emit("virtual:synced");
  }

  // =========================================================================
  // ACCESSORS
  // =========================================================================

  getAgent(): AgentMembrane {
    return this.agent;
  }

  getConfig(): AgentMCPConfig {
    return { ...this.config };
  }
}

/**
 * Create an Agent-MCP server instance
 */
export function createAgentMCPServer(
  agent: AgentMembrane,
  config?: Partial<AgentMCPConfig>,
): AgentMCPServer {
  return new AgentMCPServer(agent, config);
}

export * from "./resources.js";
export * from "./tools.js";
export * from "./prompts.js";

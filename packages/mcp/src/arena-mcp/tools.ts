/**
 * @fileoverview Arena-MCP Tools
 *
 * Tool handlers for the Arena (Outer Actual World) MCP layer.
 * Provides orchestration, frame management, narrative control, and lore cultivation.
 */

import { z } from "zod";
import type { ArenaMembrane } from "deep-tree-echo-orchestrator/aar";
import type {
  SessionFrame,
  NarrativePhases,
  LoreEntry,
  AgentReference,
  OrchestrationResult,
  AppControlCallbacks,
} from "../types.js";

/**
 * Tool input schemas
 */
export const arenaToolSchemas = {
  orchestrate: z.object({
    agents: z.array(z.string()).describe("Agent IDs to orchestrate"),
    directive: z.string().describe("Orchestration directive or goal"),
    timeout: z.number().optional().default(30000).describe("Timeout in ms"),
  }),

  createFrame: z.object({
    title: z.string().describe("Frame title/summary"),
    participants: z.array(z.string()).describe("Participant names"),
    parentFrameId: z.string().optional().describe("Parent frame for nesting"),
    narrativeContext: z
      .object({
        activePhases: z.array(z.string()),
        storyThreads: z.array(z.string()),
        thematicElements: z.array(z.string()),
      })
      .optional(),
  }),

  forkFrame: z.object({
    sourceFrameId: z.string().describe("Frame to fork from"),
    title: z.string().describe("Title for the forked branch"),
  }),

  transitionPhase: z.object({
    phase: z.enum([
      "origin",
      "journey",
      "arrival",
      "situation",
      "engagement",
      "culmination",
      "possibility",
      "trajectory",
      "destiny",
    ]),
    intensity: z.number().min(0).max(1).describe("Phase intensity 0-1"),
  }),

  addLore: z.object({
    category: z.enum([
      "wisdom",
      "story",
      "relationship",
      "insight",
      "pattern",
      "emergence",
    ]),
    content: z.string().describe("The lore content"),
    tags: z.array(z.string()).optional(),
    weight: z.number().min(0).max(1).optional().default(0.5),
  }),

  registerAgent: z.object({
    agentId: z.string(),
    name: z.string(),
    mcpEndpoint: z.string().optional(),
  }),

  deregisterAgent: z.object({
    agentId: z.string(),
  }),

  /**
   * App Admin / Scope Window Control Tools
   */
  selectHome: z.object({
    homeId: z.string().describe("ID of the home (account) to select"),
  }),

  getHomes: z.object({
    /* No input needed */
  }),

  createHome: z.object({
    name: z.string().optional(),
  }),

  openSettings: z.object({
    /* No input needed */
  }),

  navigate: z.object({
    view: z.enum(["main", "neighborhood"]).describe("View to navigate to"),
  }),
};

/**
 * Arena tool implementations
 */
export function createArenaTools(
  arena: ArenaMembrane,
  agentRegistry: Map<string, AgentReference>,
  onOrchestrate?: (
    agents: string[],
    directive: string,
  ) => Promise<Map<string, string>>,
  appControl?: AppControlCallbacks,
) {
  return {
    /**
     * Orchestrate multiple agents toward a common goal
     */
    orchestrate: async (
      input: z.infer<typeof arenaToolSchemas.orchestrate>,
    ): Promise<OrchestrationResult> => {
      const { agents, directive, timeout } = input;

      // Filter to only registered active agents
      const activeAgents = agents.filter((id) => {
        const ref = agentRegistry.get(id);
        return ref && ref.status === "active";
      });

      if (activeAgents.length === 0) {
        return {
          success: false,
          participatingAgents: [],
          directive,
          responses: new Map(),
          synthesizedOutcome: "No active agents available for orchestration",
          timestamp: Date.now(),
        };
      }

      // Execute orchestration callback if provided
      let responses = new Map<string, string>();
      if (onOrchestrate) {
        responses = await Promise.race([
          onOrchestrate(activeAgents, directive),
          new Promise<Map<string, string>>((_, reject) =>
            setTimeout(
              () => reject(new Error("Orchestration timeout")),
              timeout,
            ),
          ),
        ]);
      }

      // Synthesize outcome
      const synthesizedOutcome =
        responses.size > 0
          ? `Orchestrated ${responses.size} agents: ${Array.from(
              responses.values(),
            ).join(" | ")}`
          : "Orchestration completed without agent responses";

      return {
        success: true,
        participatingAgents: activeAgents,
        directive,
        responses,
        synthesizedOutcome,
        timestamp: Date.now(),
      };
    },

    /**
     * Create a new session frame
     */
    createFrame: (
      input: z.infer<typeof arenaToolSchemas.createFrame>,
    ): SessionFrame => {
      return arena.createFrame({
        title: input.title,
        participants: input.participants,
        parentFrameId: input.parentFrameId,
        narrativeContext: (input.narrativeContext
          ? {
              ...input.narrativeContext,
              activePhases: input.narrativeContext.activePhases as any, // Cast for now to satisfy keyof NarrativePhases
            }
          : undefined) || {
          activePhases: ["engagement"],
          storyThreads: [],
          thematicElements: [],
        },
      });
    },

    /**
     * Fork an existing frame into a new branch
     */
    forkFrame: (
      input: z.infer<typeof arenaToolSchemas.forkFrame>,
    ): SessionFrame | null => {
      const result = arena.forkFrame(input.sourceFrameId, {
        title: input.title,
        reason: "fork",
      });
      return result === undefined ? null : result;
    },

    /**
     * Transition to a narrative phase
     */
    transitionPhase: (
      input: z.infer<typeof arenaToolSchemas.transitionPhase>,
    ): void => {
      arena.transitionPhase(
        input.phase as keyof NarrativePhases,
        input.intensity,
      );
    },

    /**
     * Add lore to the Yggdrasil reservoir
     */
    addLore: (input: z.infer<typeof arenaToolSchemas.addLore>): LoreEntry => {
      const currentFrameId = arena.getState().currentFrameId;
      return arena.addLore({
        category: input.category,
        content: input.content,
        sourceFrameId: currentFrameId,
        contributors: ["system"],
        weight: input.weight || 0.5,
        tags: input.tags || [],
        connections: [],
      });
    },

    /**
     * Register an agent in this arena
     */
    registerAgent: (
      input: z.infer<typeof arenaToolSchemas.registerAgent>,
    ): AgentReference => {
      const ref: AgentReference = {
        agentId: input.agentId,
        name: input.name,
        status: "active",
        lastActivity: Date.now(),
        mcpEndpoint: input.mcpEndpoint,
      };
      agentRegistry.set(input.agentId, ref);
      return ref;
    },

    /**
     * Deregister an agent from this arena
     */
    deregisterAgent: (
      input: z.infer<typeof arenaToolSchemas.deregisterAgent>,
    ): boolean => {
      return agentRegistry.delete(input.agentId);
    },

    // ============================================
    // App Control (Scope Window) Tools
    // ============================================

    selectHome: async (
      input: z.infer<typeof arenaToolSchemas.selectHome>,
    ): Promise<string> => {
      if (appControl && appControl.selectHome) {
        await appControl.selectHome(input.homeId);
        return `Selected home: ${input.homeId}`;
      }
      return "App control (selectHome) not available in this context";
    },

    getHomes: async (): Promise<string[]> => {
      if (appControl && appControl.getHomes) {
        return await appControl.getHomes();
      }
      return [];
    },

    createHome: async (
      input: z.infer<typeof arenaToolSchemas.createHome>,
    ): Promise<string> => {
      if (appControl && appControl.createHome) {
        await appControl.createHome(input.name);
        return `Created home: ${input.name || "unnamed"}`;
      }
      return "App control (createHome) not available";
    },

    openSettings: async (): Promise<string> => {
      if (appControl && appControl.openSettings) {
        await appControl.openSettings();
        return "Settings opened";
      }
      return "App control (openSettings) not available";
    },

    navigate: async (
      input: z.infer<typeof arenaToolSchemas.navigate>,
    ): Promise<string> => {
      if (appControl && appControl.navigate) {
        await appControl.navigate(input.view as "main" | "neighborhood");
        return `Navigated to ${input.view}`;
      }
      return "App control (navigate) not available";
    },
  };
}

/**
 * List all arena tools with descriptions
 */
export function listArenaTools(): Array<{
  name: string;
  description: string;
  schema: z.ZodType;
}> {
  return [
    {
      name: "orchestrate",
      description:
        "Orchestrate multiple agents toward a common goal or directive",
      schema: arenaToolSchemas.orchestrate,
    },
    {
      name: "createFrame",
      description: "Create a new session frame for dialogue context",
      schema: arenaToolSchemas.createFrame,
    },
    {
      name: "forkFrame",
      description: "Fork an existing frame into a new conversation branch",
      schema: arenaToolSchemas.forkFrame,
    },
    {
      name: "transitionPhase",
      description: "Transition to a narrative phase with specified intensity",
      schema: arenaToolSchemas.transitionPhase,
    },
    {
      name: "addLore",
      description: "Add wisdom or insight to the Yggdrasil reservoir",
      schema: arenaToolSchemas.addLore,
    },
    {
      name: "registerAgent",
      description: "Register a new agent in this arena",
      schema: arenaToolSchemas.registerAgent,
    },
    {
      name: "deregisterAgent",
      description: "Remove an agent from this arena",
      schema: arenaToolSchemas.deregisterAgent,
    },
    {
      name: "selectHome",
      description: "Select a specific Home/Account (Scope Window)",
      schema: arenaToolSchemas.selectHome,
    },
    {
      name: "getHomes",
      description: "Get list of available Homes/Accounts",
      schema: arenaToolSchemas.getHomes,
    },
    {
      name: "createHome",
      description: "Create a new Home/Account",
      schema: arenaToolSchemas.createHome,
    },
    {
      name: "openSettings",
      description: "Open the App Settings dialog",
      schema: arenaToolSchemas.openSettings,
    },
    {
      name: "navigate",
      description: "Navigate to a top-level view (Main or Neighborhood)",
      schema: arenaToolSchemas.navigate,
    },
  ];
}

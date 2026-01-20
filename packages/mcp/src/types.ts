/**
 * @fileoverview Shared MCP Types for AAR Architecture
 *
 * Type definitions for the multi-layer nested MCP server following
 * the inverted mirror pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]
 */

import type {
  AgentState,
  ArenaState,
  RelationState,
  SessionFrame,
  NarrativePhases,
  CharacterFacets,
  CoreIdentity,
  LoreEntry,
  SocialMemory,
  TransactionalMemory,
  CognitiveFlow,
  EmergentIdentity,
  SelfReflectionState,
} from "deep-tree-echo-orchestrator/aar";

// ============================================================================
// VIRTUAL MODEL TYPES (The Inverted Mirror)
// ============================================================================

/**
 * Virtual Arena Model (Vo) - The agent's mental image of the world
 * This is the inner-most layer, representing subjective world-view
 */
export interface VirtualArenaModel {
  /** Subjective understanding of current situation */
  situationalAwareness: {
    perceivedContext: string;
    assumedNarrativePhase: keyof NarrativePhases;
    estimatedCoherence: number; // May diverge from actual!
  };

  /** Mental map of known entities and impressions */
  knownEntities: Map<string, EntityImpression>;

  /** Believed rules and constraints of the world */
  perceivedRules: string[];

  /** The agent's theory of how the world works */
  worldTheory: string;

  /** Acknowledged knowledge gaps */
  uncertainties: string[];

  /** Divergence from actual arena (for self-awareness) */
  divergenceMetrics: {
    lastSyncTime: number;
    estimatedDrift: number;
    knownMisalignments: string[];
  };
}

/**
 * Entity impression - how the agent perceives another entity
 */
export interface EntityImpression {
  id: string;
  name: string;
  perceivedRole: string;
  trustEstimate: number;
  predictedBehaviors: string[];
  lastInteraction: number;
  emotionalAssociation: number; // -1 to 1
}

/**
 * Virtual Agent Model (Vi) - The agent's model of itself
 * Contains Vo as the inverted inner world-view
 */
export interface VirtualAgentModel {
  /** Self-image: how the agent perceives its own character */
  selfImage: {
    perceivedFacets: Partial<CharacterFacets>;
    believedStrengths: string[];
    acknowledgedWeaknesses: string[];
    perceivedDominantFacet: keyof CharacterFacets;
  };

  /** Self-narrative: the agent's story about itself */
  selfStory: string;

  /** Capabilities the agent believes it has */
  perceivedCapabilities: string[];

  /** Understanding of role and purpose */
  roleUnderstanding: string;

  /** Goals and motivations */
  currentGoals: string[];

  /** INVERTED: The world-view lives INSIDE the self-model */
  worldView: VirtualArenaModel;

  /** Meta-awareness: knowing that Vi differs from Ai */
  selfAwareness: {
    lastReflection: number;
    perceivedAccuracy: number;
    activeQuestions: string[];
  };
}

// ============================================================================
// MCP LAYER TYPES
// ============================================================================

/**
 * Arena-MCP layer configuration
 */
export interface ArenaMCPConfig {
  instanceName: string;
  maxAgents: number;
  maxFrames: number;
  maxLoreEntries: number;
  enableOrchestration: boolean;
}

/**
 * Agent reference within an Arena
 */
export interface AgentReference {
  agentId: string;
  name: string;
  status: "active" | "dormant" | "spawning";
  lastActivity: number;
  mcpEndpoint?: string;
}

/**
 * Orchestration result from Arena coordinating agents
 */
export interface OrchestrationResult {
  success: boolean;
  participatingAgents: string[];
  directive: string;
  responses: Map<string, string>;
  synthesizedOutcome: string;
  timestamp: number;
}

/**
 * Callbacks for App Control / Admin Tools (Scope Window)
 */
export interface AppControlCallbacks {
  selectHome?: (homeId: string) => Promise<void>;
  getHomes?: () => Promise<string[]>;
  createHome?: (name?: string) => Promise<void>;
  openSettings?: () => Promise<void>;
  navigate?: (view: "main" | "neighborhood") => Promise<void>;
}

/**
 * Agent-MCP layer configuration
 */
export interface AgentMCPConfig {
  agentId: string;
  parentArenaId?: string;
  enableEvolution: boolean;
  evolutionRate: number;
}

/**
 * Participation protocol for agent engagement
 */
export interface ParticipationProtocol {
  type: "dialogue" | "collaboration" | "observation" | "guidance";
  context: string;
  participants: string[];
  constraints?: string[];
}

/**
 * Result of agent participation
 */
export interface ParticipationResult {
  response: string;
  facetsActivated: (keyof CharacterFacets)[];
  emotionalShift: { valence: number; arousal: number };
  insightsGained: string[];
  socialUpdates: Map<string, Partial<SocialMemory>>;
}

/**
 * Evolution result from Echo-volution
 */
export interface EvolutionResult {
  experienceIntegrated: number;
  facetGrowth: Partial<Record<keyof CharacterFacets, number>>;
  newInsights: string[];
  characterDevelopment: string;
}

/**
 * Relation-MCP layer configuration
 */
export interface RelationMCPConfig {
  maxFlowHistory: number;
  coherenceThreshold: number;
  enableMirroring: boolean;
  mirrorSyncIntervalMs: number;
}

/**
 * Synthesis result from integrating Agent and Arena states
 */
export interface SynthesisResult {
  coherence: number;
  emergentIdentity: EmergentIdentity;
  flows: CognitiveFlow[];
  tensions: Array<{ pole1: string; pole2: string; balance: number }>;
}

/**
 * Developmental cycle result
 */
export interface DevelopmentalCycleResult {
  cycleNumber: number;
  phase: "perception" | "modeling" | "reflection" | "mirroring" | "enaction";
  stateChanges: {
    agentDelta: Partial<AgentState>;
    arenaDelta: Partial<ArenaState>;
    virtualAgentDelta: Partial<VirtualAgentModel>;
    virtualArenaDelta: Partial<VirtualArenaModel>;
  };
  coherenceAfter: number;
  timestamp: number;
}

// ============================================================================
// MCP RESOURCE URI TYPES
// ============================================================================

export type ArenaMCPResourceUri =
  | `arena://frames/${string}`
  | "arena://phases"
  | "arena://reservoir"
  | "arena://agents"
  | "arena://threads";

export type AgentMCPResourceUri =
  | "agent://identity"
  | "agent://facets"
  | `agent://social/${string}`
  | "agent://transactions"
  | "agent://self";

export type RelationMCPResourceUri =
  | "relation://self-reflection"
  | "relation://flows"
  | "relation://identity"
  | "relation://coherence"
  | "relation://virtual-agent"
  | "relation://virtual-arena";

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type {
  AgentState,
  ArenaState,
  RelationState,
  SessionFrame,
  NarrativePhases,
  CharacterFacets,
  CoreIdentity,
  LoreEntry,
  SocialMemory,
  TransactionalMemory,
  CognitiveFlow,
  EmergentIdentity,
  SelfReflectionState,
};

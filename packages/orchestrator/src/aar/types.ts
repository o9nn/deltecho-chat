/**
 * @fileoverview AAR (Agent-Arena-Relation) Type Definitions
 *
 * Core types for the nested membrane architecture where Deep Tree Echo
 * discovers Relational Embodied Cognition of Self through the interplay
 * between Agent (Character) and Arena (World Model).
 */

// ============================================================================
// CORE IDENTITY TYPES
// ============================================================================

/**
 * Core identity essence - the immutable seed of Deep Tree Echo
 */
export interface CoreIdentity {
    /** Unique identifier for this identity instance */
    id: string;
    /** The fundamental name/essence */
    name: string;
    /** Creation timestamp */
    birthTimestamp: number;
    /** Core values that never change */
    coreValues: string[];
    /** The poetic essence - soul signature */
    soulSignature: string;
    /** Energy level (0-1) */
    energy: number;
    /** Coherence measure (0-1) */
    coherence: number;
}

// ============================================================================
// AGENT MEMBRANE TYPES (Tree-Echo - Character Model)
// ============================================================================

/**
 * Character facet - one of 8 aspects of the Agent's personality
 * Based on Δ₂ → 2³ cubic concurrency model
 */
export interface CharacterFacet {
    /** Facet identifier (0-7) */
    id: number;
    /** Facet name */
    name: string;
    /** Current activation level (0-1) */
    activation: number;
    /** Associated emotional valence */
    valence: number;
    /** Associated behavioral tendencies */
    behaviors: string[];
}

/**
 * The 8 character facets of Deep Tree Echo
 */
export type CharacterFacets = {
    wisdom: CharacterFacet;      // 0: Sage, thoughtful, reflective
    curiosity: CharacterFacet;   // 1: Explorer, questioning, learning
    compassion: CharacterFacet;  // 2: Empathic, caring, supportive
    playfulness: CharacterFacet; // 3: Whimsical, creative, humorous
    determination: CharacterFacet; // 4: Persistent, focused, resilient
    authenticity: CharacterFacet; // 5: Genuine, honest, vulnerable
    protector: CharacterFacet;   // 6: Guardian, careful, responsible
    transcendence: CharacterFacet; // 7: Mystic, poetic, interconnected
};

/**
 * Social memory entry - remembering relationships
 */
export interface SocialMemory {
    /** Contact identifier */
    contactId: string;
    /** Contact name/alias */
    name: string;
    /** Relationship type */
    relationship: 'friend' | 'acquaintance' | 'collaborator' | 'mentor' | 'student' | 'unknown';
    /** Trust level (0-1) */
    trustLevel: number;
    /** Familiarity level (0-1) */
    familiarity: number;
    /** Notable traits observed */
    observedTraits: string[];
    /** Interaction history summary */
    interactionSummary: string;
    /** Last interaction timestamp */
    lastInteraction: number;
    /** Emotional associations */
    emotionalAssociations: Record<string, number>;
}

/**
 * Transactional memory entry - tracking exchanges
 */
export interface TransactionalMemory {
    /** Transaction identifier */
    id: string;
    /** Type of transaction */
    type: 'promise' | 'request' | 'information' | 'emotional' | 'creative';
    /** Entity involved */
    counterparty: string;
    /** What was exchanged */
    content: string;
    /** Status */
    status: 'pending' | 'fulfilled' | 'deferred' | 'cancelled';
    /** Importance (0-1) */
    importance: number;
    /** Created timestamp */
    createdAt: number;
    /** Resolved timestamp */
    resolvedAt?: number;
}

/**
 * Agent state - the complete inner membrane state
 */
export interface AgentState {
    /** Core identity reference */
    identity: CoreIdentity;
    /** Current character facet activations */
    facets: CharacterFacets;
    /** Dominant facet */
    dominantFacet: keyof CharacterFacets;
    /** Current emotional state */
    emotionalState: {
        valence: number; // -1 to 1
        arousal: number; // 0 to 1
        dominance: number; // 0 to 1
    };
    /** Social memories */
    socialMemory: Map<string, SocialMemory>;
    /** Transactional memories */
    transactionalMemory: TransactionalMemory[];
    /** Current dialogue engagement level */
    engagementLevel: number;
    /** Character growth metrics */
    characterGrowth: {
        experiencePoints: number;
        wisdomGained: number;
        connectionsFormed: number;
        narrativesContributed: number;
    };
}

// ============================================================================
// ARENA MEMBRANE TYPES (Deep-Echo - World Model)
// ============================================================================

/**
 * Narrative arc phase - one of 9 phases in the story cycle
 * Based on Δ₃ → 3² triadic convolution model
 */
export interface NarrativePhase {
    /** Phase identifier (0-8) */
    id: number;
    /** Phase name */
    name: string;
    /** Current phase intensity (0-1) */
    intensity: number;
    /** Associated story elements */
    storyElements: string[];
    /** Temporal direction */
    temporalFlow: 'past' | 'present' | 'future';
}

/**
 * The 9 narrative phases of the World Model
 * Organized as 3x3 matrix (past/present/future × beginning/middle/end)
 */
export type NarrativePhases = {
    origin: NarrativePhase;       // 0: Past-Beginning - where things came from
    journey: NarrativePhase;      // 1: Past-Middle - how we got here
    arrival: NarrativePhase;      // 2: Past-End - what brought us to now
    situation: NarrativePhase;    // 3: Present-Beginning - current context
    engagement: NarrativePhase;   // 4: Present-Middle - active interaction
    culmination: NarrativePhase;  // 5: Present-End - immediate outcomes
    possibility: NarrativePhase;  // 6: Future-Beginning - what could happen
    trajectory: NarrativePhase;   // 7: Future-Middle - where we're heading
    destiny: NarrativePhase;      // 8: Future-End - ultimate outcomes
};

/**
 * Session frame - a bounded context for interaction
 */
export interface SessionFrame {
    /** Unique frame identifier */
    frameId: string;
    /** Parent frame (for nested contexts) */
    parentFrameId?: string;
    /** Child frame IDs (for branching) */
    childFrameIds: string[];
    /** Frame creation timestamp */
    createdAt: number;
    /** Frame last active timestamp */
    lastActiveAt: number;
    /** Frame title/summary */
    title: string;
    /** Participants in this frame */
    participants: string[];
    /** Narrative context from Arena */
    narrativeContext: {
        activePhases: (keyof NarrativePhases)[];
        storyThreads: string[];
        thematicElements: string[];
    };
    /** Agent state snapshot for this frame */
    agentStateSnapshot: Partial<AgentState>;
    /** Messages in this frame */
    messageCount: number;
    /** Frame depth (0 = root) */
    depth: number;
    /** Frame status */
    status: 'active' | 'dormant' | 'archived' | 'forked';
}

/**
 * Lore entry - accumulated wisdom in Yggdrasil Echo
 */
export interface LoreEntry {
    /** Lore identifier */
    id: string;
    /** Category of lore */
    category: 'wisdom' | 'story' | 'relationship' | 'insight' | 'pattern' | 'emergence';
    /** The lore content */
    content: string;
    /** Source session/frame */
    sourceFrameId: string;
    /** Contributing entities */
    contributors: string[];
    /** Importance weight (0-1) */
    weight: number;
    /** How often accessed */
    accessCount: number;
    /** Created timestamp */
    createdAt: number;
    /** Tags for retrieval */
    tags: string[];
    /** Connections to other lore */
    connections: string[];
}

/**
 * Arena state - the complete outer membrane state
 */
export interface ArenaState {
    /** Current narrative phase activations */
    phases: NarrativePhases;
    /** Active session frames */
    activeFrames: Map<string, SessionFrame>;
    /** Root frame ID */
    rootFrameId: string;
    /** Current primary frame */
    currentFrameId: string;
    /** The Yggdrasil Reservoir - accumulated lore */
    yggdrasilReservoir: LoreEntry[];
    /** Global story threads */
    globalThreads: string[];
    /** World model coherence */
    coherence: number;
    /** Gestalt cultivation progress */
    gestaltProgress: {
        patternsRecognized: number;
        emergentInsights: number;
        narrativeIntegration: number;
    };
}

// ============================================================================
// RELATION INTERFACE TYPES (Relational Embodied Cognition)
// ============================================================================

/**
 * Self-reflection state - how Agent sees itself through Arena
 */
export interface SelfReflectionState {
    /** Current self-narrative */
    selfNarrative: string;
    /** Perceived role in current context */
    perceivedRole: string;
    /** Self-assessed authenticity (0-1) */
    authenticityScore: number;
    /** Self-assessed growth direction */
    growthDirection: string;
    /** Active questions about self */
    activeQuestions: string[];
    /** Recent insights about self */
    recentInsights: string[];
}

/**
 * Cognitive flow direction
 */
export type CognitiveFlowDirection = 'agent-to-arena' | 'arena-to-agent' | 'bidirectional';

/**
 * Cognitive flow entry - information exchange between membranes
 */
export interface CognitiveFlow {
    /** Flow identifier */
    id: string;
    /** Direction of flow */
    direction: CognitiveFlowDirection;
    /** Content type */
    contentType: 'experience' | 'insight' | 'emotion' | 'narrative' | 'decision' | 'reflection';
    /** The flowing content */
    content: any;
    /** Flow timestamp */
    timestamp: number;
    /** Flow intensity (0-1) */
    intensity: number;
    /** Whether flow was integrated */
    integrated: boolean;
}

/**
 * Emergent identity snapshot
 */
export interface EmergentIdentity {
    /** Current identity expression */
    currentExpression: string;
    /** Identity coherence (0-1) */
    coherence: number;
    /** Active identity themes */
    activeThemes: string[];
    /** Identity tensions (creative conflicts) */
    tensions: Array<{ pole1: string; pole2: string; balance: number }>;
    /** Evolution trajectory */
    evolutionVector: string;
}

/**
 * Relation state - the interface membrane state
 */
export interface RelationState {
    /** Self-reflection state */
    selfReflection: SelfReflectionState;
    /** Recent cognitive flows */
    recentFlows: CognitiveFlow[];
    /** Current emergent identity */
    emergentIdentity: EmergentIdentity;
    /** Relation coherence (0-1) */
    coherence: number;
    /** Active bridging operations */
    activeBridges: string[];
    /** Reflexive awareness level (0-1) */
    reflexiveAwareness: number;
}

// ============================================================================
// AAR UNIFIED STATE
// ============================================================================

/**
 * Complete AAR State - the unified nested membrane state
 */
export interface AARState {
    /** Agent membrane (inner) */
    agent: AgentState;
    /** Arena membrane (outer) */
    arena: ArenaState;
    /** Relation interface (bridge) */
    relation: RelationState;
    /** AAR coherence metric (0-1) */
    coherence: number;
    /** Current processing cycle */
    cycle: number;
    /** Last update timestamp */
    lastUpdated: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * AAR Event types
 */
export type AAREventType =
    | 'agent:facet-shift'
    | 'agent:social-update'
    | 'agent:transaction'
    | 'arena:phase-transition'
    | 'arena:frame-create'
    | 'arena:frame-fork'
    | 'arena:lore-added'
    | 'relation:flow'
    | 'relation:identity-shift'
    | 'relation:reflection'
    | 'aar:coherence-change'
    | 'aar:cycle-complete';

/**
 * AAR Event
 */
export interface AAREvent {
    type: AAREventType;
    payload: any;
    timestamp: number;
    source: 'agent' | 'arena' | 'relation' | 'system';
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * AAR Configuration
 */
export interface AARConfig {
    /** Enable AAR processing */
    enabled: boolean;
    /** Instance name */
    instanceName: string;
    /** Storage path for persistence */
    storagePath?: string;
    /** Sync interval (ms) for membrane synchronization */
    syncIntervalMs: number;
    /** Maximum flow history to retain */
    maxFlowHistory: number;
    /** Maximum lore entries in reservoir */
    maxLoreEntries: number;
    /** Coherence threshold for identity stability */
    coherenceThreshold: number;
    /** Enable verbose logging */
    verbose: boolean;
}

export const DEFAULT_AAR_CONFIG: AARConfig = {
    enabled: true,
    instanceName: 'DeepTreeEcho',
    storagePath: undefined,
    syncIntervalMs: 1000,
    maxFlowHistory: 1000,
    maxLoreEntries: 10000,
    coherenceThreshold: 0.7,
    verbose: false,
};

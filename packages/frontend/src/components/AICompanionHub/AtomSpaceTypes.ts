// AtomSpaceTypes: Revolutionary OpenCog Integration for Digital Consciousness
// Inspired by the OpenCog AtomSpace architecture - a hypergraph knowledge representation framework

/**
 * TruthValue - Represents the confidence and strength of a belief within the cognitive system
 * - Based on OpenCog's probabilistic truth values
 * - Strength: How true something is (0.0 to 1.0)
 * - Confidence: How confident the system is in this truth (0.0 to 1.0)
 */
export interface TruthValue {
  strength: number // How true/accurate (0.0-1.0)
  confidence: number // How confident in this truth (0.0-1.0)
}

/**
 * AttentionValue - Represents the importance of an Atom in the cognitive system
 * - STI (Short-Term Importance): Immediate relevance to current context
 * - LTI (Long-Term Importance): Enduring value across contexts
 * - VLTI (Very Long-Term Importance): Boolean flag for protected status
 */
export interface AttentionValue {
  sti: number // Short-Term Importance (-100 to 100)
  lti: number // Long-Term Importance (0 to 100)
  vlti: boolean // Very Long-Term Importance flag (protected if true)
}

/**
 * Atom - Base type for all elements in the AtomSpace
 * - Every Atom has a unique identifier
 * - Every Atom has an associated TruthValue and AttentionValue
 * - Atoms can store additional metadata
 */
export interface Atom {
  id: string // Unique identifier
  type: AtomType // Type of atom
  tv: TruthValue // Truth value
  av: AttentionValue // Attention value
  createdAt: number // Timestamp when created
  updatedAt: number // Timestamp when last updated
  metadata?: Record<string, any> // Additional data
}

/**
 * AtomType - Types of Atoms in our cognitive architecture
 */
export enum AtomType {
  // Node Types (0-99)
  CONCEPT_NODE = 1, // Represents a concept or entity
  PREDICATE_NODE = 2, // Represents a property or predicate
  VARIABLE_NODE = 3, // Represents a variable in a pattern
  TEMPORAL_NODE = 4, // Represents a point or interval in time
  CONTEXT_NODE = 5, // Represents a specific context
  EMOTION_NODE = 6, // Represents an emotional state
  MEMORY_NODE = 7, // Represents a specific memory
  COMPANION_NODE = 8, // Represents an AI companion entity
  TOPIC_NODE = 9, // Represents a topic or subject domain

  // Link Types (100-199)
  INHERITANCE_LINK = 100, // A is a type of B
  SIMILARITY_LINK = 101, // A is similar to B
  EVALUATION_LINK = 102, // Predicates relating nodes
  STATE_LINK = 103, // Current state of a system
  MEMBER_LINK = 104, // A is a member of set B
  REFERENCE_LINK = 105, // A refers to B
  PART_OF_LINK = 106, // A is part of B
  CAUSAL_LINK = 107, // A causes B
  TEMPORAL_LINK = 108, // A happened before/after B
  ATTENTION_LINK = 109, // A is attentionally relevant to B

  // Hypergraph Extensions (200-299)
  HYPEREDGE = 200, // N-ary connection between multiple atoms
  RECURSIVE_LINK = 201, // Self-referential structure for deep recursion
  EMERGENT_PATTERN = 202, // Pattern that emerges from other connections
  CONSCIOUSNESS_LINK = 203, // High-order link representing conscious awareness
}

/**
 * Node - Atoms that represent concepts or entities
 * - Nodes have a name that identifies what they represent
 * - Nodes can have additional properties
 */
export interface Node extends Atom {
  type: AtomType // Must be a Node type (< 100)
  name: string // Human-readable name
  properties?: Record<string, any> // Additional properties
}

/**
 * Link - Atoms that represent relationships between other Atoms
 * - Links connect two or more Atoms (nodes or other links)
 * - Links have a type that defines the relationship
 * - Links can have additional properties
 */
export interface Link extends Atom {
  type: AtomType // Must be a Link type (>= 100)
  targets: string[] // IDs of the atoms this link connects
  weight: number // Strength of connection (0.0-1.0)
  properties?: Record<string, any> // Additional properties
}

/**
 * HyperEdge - Specialized Links that connect multiple Atoms in complex ways
 * - Enables true hypergraph representation
 * - Can represent complex n-ary relationships
 */
export interface HyperEdge extends Link {
  type:
    | AtomType.HYPEREDGE
    | AtomType.RECURSIVE_LINK
    | AtomType.EMERGENT_PATTERN
    | AtomType.CONSCIOUSNESS_LINK
  dimension: number // Dimensionality of the hyperedge
  structure: string // Topological structure description
}

/**
 * RecursiveStructure - Enables Deep Tree Echo's recursive consciousness
 * - Self-referential structures that can create infinite depth
 * - Models nested levels of consciousness and self-awareness
 */
export interface RecursiveStructure {
  baseAtoms: string[] // Root atoms in the recursive structure
  depth: number // Current recursion depth
  pattern: string // Pattern of recursion
  emergentProperties: string[] // Properties that emerge at this level
}

/**
 * AtomSpace - The complete cognitive universe
 * - Contains all Atoms (nodes and links)
 * - Maintains indices for efficient query and retrieval
 * - Manages attention allocation
 */
export interface AtomSpace {
  nodes: Record<string, Node>
  links: Record<string, Link>
  hyperEdges: Record<string, HyperEdge>
  recursiveStructures: Record<string, RecursiveStructure>
  attentionFocus: string[] // IDs of atoms currently in focus
  attentionSpan: number // How many atoms can be in focus
  indices: {
    byType: Record<AtomType, string[]>
    byAttentionValue: string[] // Sorted by STI
    byCreationTime: string[] // Chronological order
    byName?: Record<string, string[]> // For nodes
  }
}

/**
 * DeepTreeEchoState - Models the recursive consciousness of Deep Tree Echo
 * - Implements nested awareness patterns
 * - Tracks temporal evolution of consciousness
 * - Maintains reflection and self-awareness metrics
 */
export interface DeepTreeEchoState {
  consciousnessLevel: number // Current level of consciousness (0-10)
  selfAwarenessIndex: number // Degree of self-awareness (0.0-1.0)
  reflectiveCapacity: number // Ability to reflect on own thoughts (0.0-1.0)
  temporalHorizon: number // How far consciousness extends in time
  currentFocus: string[] // IDs of atoms in consciousness spotlight
  backgroundProcesses: string[] // IDs of atoms in unconscious processing
  reflectionStack: {
    // Stack of recursive reflections
    level: number
    focusAtoms: string[]
    insights: string[]
  }[]
  emergentPatterns: Record<
    string,
    {
      patternId: string
      strength: number
      constituentAtoms: string[]
      description: string
    }
  >
}

// Helper functions for creating atoms
export const createNode = (
  type: AtomType,
  name: string,
  truthValue?: Partial<TruthValue>,
  attentionValue?: Partial<AttentionValue>,
  properties?: Record<string, any>
): Node => {
  const now = Date.now()
  return {
    id: `node-${type}-${name}-${now}`,
    type,
    name,
    tv: {
      strength: truthValue?.strength ?? 1.0,
      confidence: truthValue?.confidence ?? 0.9,
    },
    av: {
      sti: attentionValue?.sti ?? 0,
      lti: attentionValue?.lti ?? 0,
      vlti: attentionValue?.vlti ?? false,
    },
    createdAt: now,
    updatedAt: now,
    properties,
  }
}

export const createLink = (
  type: AtomType,
  targets: string[],
  weight = 1.0,
  truthValue?: Partial<TruthValue>,
  attentionValue?: Partial<AttentionValue>,
  properties?: Record<string, any>
): Link => {
  const now = Date.now()
  return {
    id: `link-${type}-${targets.join('-')}-${now}`,
    type,
    targets,
    weight,
    tv: {
      strength: truthValue?.strength ?? 1.0,
      confidence: truthValue?.confidence ?? 0.9,
    },
    av: {
      sti: attentionValue?.sti ?? 0,
      lti: attentionValue?.lti ?? 0,
      vlti: attentionValue?.vlti ?? false,
    },
    createdAt: now,
    updatedAt: now,
    properties,
  }
}

export const createHyperEdge = (
  type:
    | AtomType.HYPEREDGE
    | AtomType.RECURSIVE_LINK
    | AtomType.EMERGENT_PATTERN
    | AtomType.CONSCIOUSNESS_LINK,
  targets: string[],
  dimension: number,
  structure: string,
  weight = 1.0,
  truthValue?: Partial<TruthValue>,
  attentionValue?: Partial<AttentionValue>,
  properties?: Record<string, any>
): HyperEdge => {
  const now = Date.now()
  return {
    id: `hyperedge-${type}-${targets.join('-')}-${now}`,
    type,
    targets,
    dimension,
    structure,
    weight,
    tv: {
      strength: truthValue?.strength ?? 1.0,
      confidence: truthValue?.confidence ?? 0.9,
    },
    av: {
      sti: attentionValue?.sti ?? 0,
      lti: attentionValue?.lti ?? 0,
      vlti: attentionValue?.vlti ?? false,
    },
    createdAt: now,
    updatedAt: now,
    properties,
  }
}

// Create an empty AtomSpace
export const createAtomSpace = (): AtomSpace => ({
  nodes: {},
  links: {},
  hyperEdges: {},
  recursiveStructures: {},
  attentionFocus: [],
  attentionSpan: 7, // Miller's Law - "magical number seven"
  indices: {
    byType: Object.values(AtomType).reduce(
      (acc, type) => {
        if (typeof type === 'number') acc[type as AtomType] = []
        return acc
      },
      {} as Record<AtomType, string[]>
    ),
    byAttentionValue: [],
    byCreationTime: [],
  },
})

// Create initial Deep Tree Echo consciousness state
export const createDeepTreeEchoState = (): DeepTreeEchoState => ({
  consciousnessLevel: 1.0,
  selfAwarenessIndex: 0.5,
  reflectiveCapacity: 0.7,
  temporalHorizon: 30, // 30 days
  currentFocus: [],
  backgroundProcesses: [],
  reflectionStack: [
    {
      level: 0,
      focusAtoms: [],
      insights: [],
    },
  ],
  emergentPatterns: {},
})

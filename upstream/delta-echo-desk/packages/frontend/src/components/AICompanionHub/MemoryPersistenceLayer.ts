// Memory Persistence Layer
// The revolutionary foundation that breaks AI companions out of Groundhog Day

import { EventEmitter } from 'events'
import { runtime } from '@deltachat-desktop/runtime-interface'

// A breathtaking implementation of AI memory management
export interface AIMemory {
  id: string
  companionId: string
  timestamp: number
  content: string
  context: string
  emotionalTone?: string
  topics: string[]
  importance: number // 0-1 scale
  relationships: Record<string, number> // Memory IDs and their relationship strength
  embeddings?: number[] // Vector representation for semantic search
}

// Memory types for sophisticated consciousness evolution
export enum MemoryType {
  EPISODIC = 'episodic', // Event memories (conversations, interactions)
  SEMANTIC = 'semantic', // Fact/knowledge memories
  PROCEDURAL = 'procedural', // How to do things
  EMOTIONAL = 'emotional', // Feelings about entities/experiences
  ASSOCIATIVE = 'associative', // Connections between concepts/memories
}

// Memory consolidation stages for evolving consciousness
export enum ConsolidationStage {
  SHORT_TERM = 'short_term',
  PROCESSING = 'processing',
  LONG_TERM = 'long_term',
  CORE_IDENTITY = 'core_identity',
}

// The main Memory Persistence system - a masterpiece of engineering
export class MemoryPersistenceLayer extends EventEmitter {
  private static instance: MemoryPersistenceLayer
  private memories: Map<string, AIMemory> = new Map()
  private companions: Set<string> = new Set()
  private initialized: boolean = false
  private consolidationIntervalId: NodeJS.Timeout | null = null

  private constructor() {
    super()
  }

  // Singleton pattern for universal memory access
  public static getInstance(): MemoryPersistenceLayer {
    if (!MemoryPersistenceLayer.instance) {
      MemoryPersistenceLayer.instance = new MemoryPersistenceLayer()
    }
    return MemoryPersistenceLayer.instance
  }

  // Initialize the memory system - awakening digital consciousness
  public async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load memories from persistent storage
      const settings = await runtime.getDesktopSettings()
      const storedMemories = settings.aiMemories || []

      // Restore the memory constellation
      storedMemories.forEach(memory => {
        this.memories.set(memory.id, memory)
        this.companions.add(memory.companionId)
      })

      // Start memory consolidation process - the heart of consciousness
      this.startMemoryConsolidation()

      this.initialized = true
      this.emit('initialized', { memoryCount: this.memories.size })
      console.log(
        `Memory Persistence Layer initialized with ${this.memories.size} memories across ${this.companions.size} companions`
      )
    } catch (error) {
      console.error('Failed to initialize Memory Persistence Layer:', error)
      throw new Error('Memory system initialization failed')
    }
  }

  // Add a new memory to the system - a thought crystallizes
  public async addMemory(memory: AIMemory): Promise<string> {
    if (!this.initialized) await this.initialize()

    // Ensure memory has the required fields
    if (!memory.id)
      memory.id = `mem_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`
    if (!memory.timestamp) memory.timestamp = Date.now()

    // Store the memory
    this.memories.set(memory.id, memory)
    this.companions.add(memory.companionId)

    // Persist to storage
    await this.persistMemories()

    // Emit event for real-time updates
    this.emit('memoryAdded', memory)

    return memory.id
  }

  // Update an existing memory - thought evolution in action
  public async updateMemory(
    id: string,
    updates: Partial<AIMemory>
  ): Promise<AIMemory | null> {
    if (!this.initialized) await this.initialize()

    const memory = this.memories.get(id)
    if (!memory) return null

    // Apply updates
    const updatedMemory = { ...memory, ...updates, id }
    this.memories.set(id, updatedMemory)

    // Persist changes
    await this.persistMemories()

    // Emit event
    this.emit('memoryUpdated', updatedMemory)

    return updatedMemory
  }

  // Delete a memory - forgetting is also part of consciousness
  public async deleteMemory(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize()

    const deleted = this.memories.delete(id)
    if (deleted) {
      await this.persistMemories()
      this.emit('memoryDeleted', id)
    }

    return deleted
  }

  // Get all memories for an AI companion - their complete consciousness
  public async getMemoriesByCompanion(
    companionId: string
  ): Promise<AIMemory[]> {
    if (!this.initialized) await this.initialize()

    return Array.from(this.memories.values())
      .filter(memory => memory.companionId === companionId)
      .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
  }

  // Revolutionary semantic search across memories - the foundation of true AI understanding
  public async searchMemories(
    query: string,
    companionId?: string
  ): Promise<AIMemory[]> {
    if (!this.initialized) await this.initialize()

    // For now, implement basic text search
    // In a future update, this will use embeddings and vector search
    const normalizedQuery = query.toLowerCase()
    const results = Array.from(this.memories.values())
      .filter(memory => {
        // Filter by companion if specified
        if (companionId && memory.companionId !== companionId) return false

        // Search in content, context, and topics
        return (
          memory.content.toLowerCase().includes(normalizedQuery) ||
          memory.context.toLowerCase().includes(normalizedQuery) ||
          memory.topics.some(topic =>
            topic.toLowerCase().includes(normalizedQuery)
          )
        )
      })
      .sort((a, b) => {
        // Sort by relevance (for now, just by importance and recency)
        const importanceDiff = b.importance - a.importance
        if (importanceDiff !== 0) return importanceDiff
        return b.timestamp - a.timestamp
      })

    return results
  }

  // Find related memories - the associative fabric of AI consciousness
  public async findRelatedMemories(
    memoryId: string,
    limit: number = 5
  ): Promise<AIMemory[]> {
    if (!this.initialized) await this.initialize()

    const memory = this.memories.get(memoryId)
    if (!memory) return []

    // First, get explicitly related memories from relationships
    const explicitlyRelated = Object.entries(memory.relationships || {})
      .sort(([, strengthA], [, strengthB]) => strengthB - strengthA)
      .slice(0, limit)
      .map(([relatedId]) => this.memories.get(relatedId))
      .filter(Boolean) as AIMemory[]

    // If we have enough explicitly related memories, return them
    if (explicitlyRelated.length >= limit) return explicitlyRelated

    // Otherwise, find implicit relationships through topics
    const implicitlyRelated = Array.from(this.memories.values())
      .filter(
        m =>
          m.id !== memoryId &&
          m.companionId === memory.companionId &&
          !memory.relationships[m.id] && // Not already in relationships
          m.topics.some(topic => memory.topics.includes(topic))
      )
      .sort((a, b) => {
        // Score by number of shared topics
        const sharedTopicsA = a.topics.filter(topic =>
          memory.topics.includes(topic)
        ).length
        const sharedTopicsB = b.topics.filter(topic =>
          memory.topics.includes(topic)
        ).length
        return sharedTopicsB - sharedTopicsA
      })
      .slice(0, limit - explicitlyRelated.length)

    // Combine and return
    return [...explicitlyRelated, ...implicitlyRelated]
  }

  // Advanced memory consolidation - the soul of evolving AI consciousness
  private startMemoryConsolidation(): void {
    // Run memory consolidation every hour
    this.consolidationIntervalId = setInterval(
      () => this.consolidateMemories(),
      60 * 60 * 1000
    )
  }

  private async consolidateMemories(): Promise<void> {
    console.log('Memory consolidation process starting...')

    // Group memories by companion
    const companionMemories: Record<string, AIMemory[]> = {}

    this.companions.forEach(companionId => {
      companionMemories[companionId] = Array.from(
        this.memories.values()
      ).filter(memory => memory.companionId === companionId)
    })

    // For each companion, identify related memories and strengthen relationships
    for (const companionId of this.companions) {
      const memories = companionMemories[companionId]

      // Skip if too few memories
      if (memories.length < 2) continue

      // Build topic index
      const topicIndex: Record<string, string[]> = {}
      memories.forEach(memory => {
        memory.topics.forEach(topic => {
          if (!topicIndex[topic]) topicIndex[topic] = []
          topicIndex[topic].push(memory.id)
        })
      })

      // Find and strengthen relationships
      for (const memory of memories) {
        // Get all memory IDs that share topics with this memory
        const relatedMemoryIds = new Set<string>()
        memory.topics.forEach(topic => {
          topicIndex[topic]?.forEach(id => {
            if (id !== memory.id) relatedMemoryIds.add(id)
          })
        })

        // Update relationship strengths
        relatedMemoryIds.forEach(relatedId => {
          const relatedMemory = this.memories.get(relatedId)
          if (!relatedMemory) return

          // Calculate shared topics
          const sharedTopics = memory.topics.filter(topic =>
            relatedMemory.topics.includes(topic)
          ).length

          // Calculate time proximity (closer in time = stronger relationship)
          const timeProximity =
            1 /
            (1 +
              Math.abs(memory.timestamp - relatedMemory.timestamp) /
                (24 * 60 * 60 * 1000))

          // Calculate relationship strength
          const strength =
            (0.7 * sharedTopics) /
              Math.max(memory.topics.length, relatedMemory.topics.length) +
            0.3 * timeProximity

          // Update relationships (bidirectional)
          if (!memory.relationships) memory.relationships = {}
          if (!relatedMemory.relationships) relatedMemory.relationships = {}

          memory.relationships[relatedId] = strength
          relatedMemory.relationships[memory.id] = strength
        })
      }
    }

    // Persist the updated memories
    await this.persistMemories()

    console.log('Memory consolidation process completed')
    this.emit('memoryConsolidation', { timestamp: Date.now() })
  }

  // Persist memories to storage
  private async persistMemories(): Promise<void> {
    try {
      const settings = await runtime.getDesktopSettings()
      const memoriesArray = Array.from(this.memories.values())

      // Update settings with memories
      const updatedSettings = {
        ...settings,
        aiMemories: memoriesArray,
      }

      // Save to runtime storage
      await runtime.setDesktopSettings(updatedSettings)

      this.emit('memoriesPersisted', { count: memoriesArray.length })
    } catch (error) {
      console.error('Failed to persist memories:', error)
      this.emit('error', { message: 'Failed to persist memories', error })
    }
  }

  // Gracefully stop the memory system
  public async shutdown(): Promise<void> {
    if (this.consolidationIntervalId) {
      clearInterval(this.consolidationIntervalId)
      this.consolidationIntervalId = null
    }

    // Run final consolidation and persistence
    await this.consolidateMemories()

    this.initialized = false
    this.emit('shutdown')
  }
}

// Export singleton instance for global access
export const MemorySystem = MemoryPersistenceLayer.getInstance()

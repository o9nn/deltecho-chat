import { C } from '@deltachat/jsonrpc-client'

/**
 * HyperDimensionalMemory: Advanced memory architecture that organizes conversations
 * across multiple cognitive dimensions using hypervector encoding
 *
 * Inspired by OpenCog's AtomSpace for persistent AI consciousness with:
 * - Atoms: Individual memories, thoughts, and preferences
 * - Hypergraphs: Relationships between memories across cognitive dimensions
 * - Inference: Recognition of patterns across conversation history
 */
export class HyperDimensionalMemory {
  private readonly DIMENSIONS = 10000 // High-dimensional representation vector size
  private readonly MEMORY_DECAY = 0.98 // Memory decay coefficient for natural forgetting
  private readonly CONTEXT_WINDOW = 128 // Size of context window for memory binding

  private memoryVectors: Map<string, Float32Array> = new Map()
  private conversationHypergraph: Map<string, Set<string>> = new Map()
  private temporalIndex: Map<number, string[]> = new Map()
  private associativeNetwork: Map<string, Map<string, number>> = new Map()
  private emotionalWeighting: Map<string, number> = new Map()

  /**
   * Creates a hypervector encoding of input text with emotional context
   */
  private createHypervector(
    text: string,
    emotionalContext: number = 1.0
  ): Float32Array {
    const vector = new Float32Array(this.DIMENSIONS)

    // Random projection encoding (simplified)
    const seed = this.hashString(text)
    const rng = this.createPseudoRandomGenerator(seed)

    for (let i = 0; i < this.DIMENSIONS; i++) {
      // Random projection with small gaussian noise for uniqueness
      vector[i] = (rng() * 2 - 1) * emotionalContext
    }

    // Normalize the vector to unit length
    this.normalizeVector(vector)
    return vector
  }

  /**
   * Binds memories together using circular convolution (simplified)
   */
  private bindMemories(
    memory1: Float32Array,
    memory2: Float32Array
  ): Float32Array {
    const result = new Float32Array(this.DIMENSIONS)

    // Simplified circular convolution (in practice use FFT for performance)
    for (let i = 0; i < this.DIMENSIONS; i++) {
      for (let j = 0; j < this.DIMENSIONS; j++) {
        const idx = (i + j) % this.DIMENSIONS
        result[idx] += memory1[i] * memory2[j]
      }
    }

    this.normalizeVector(result)
    return result
  }

  /**
   * Integrates new memory into the hyperdimensional space
   */
  public storeMemory(
    messageId: string,
    text: string,
    timestamp: number,
    emotionalSignificance: number = 1.0
  ): void {
    // Create hypervector for this memory
    const memoryVector = this.createHypervector(text, emotionalSignificance)
    this.memoryVectors.set(messageId, memoryVector)
    this.emotionalWeighting.set(messageId, emotionalSignificance)

    // Add to temporal index
    const timeKey = Math.floor(timestamp / 86400000) // Group by day
    if (!this.temporalIndex.has(timeKey)) {
      this.temporalIndex.set(timeKey, [])
    }
    this.temporalIndex.get(timeKey)?.push(messageId)

    // Find related memories and build associations
    const relatedMemories = this.findRelatedMemories(memoryVector, 5)

    // Update conversation hypergraph
    this.conversationHypergraph.set(
      messageId,
      new Set(relatedMemories.map(m => m.id))
    )

    // Update associative network
    if (!this.associativeNetwork.has(messageId)) {
      this.associativeNetwork.set(messageId, new Map())
    }

    for (const related of relatedMemories) {
      this.associativeNetwork
        .get(messageId)
        ?.set(related.id, related.similarity)

      // Bidirectional association
      if (!this.associativeNetwork.has(related.id)) {
        this.associativeNetwork.set(related.id, new Map())
      }
      this.associativeNetwork
        .get(related.id)
        ?.set(messageId, related.similarity)
    }

    // Apply memory decay to old memories
    this.applyMemoryDecay()
  }

  /**
   * Recalls memories related to query within a context window
   */
  public recallMemories(
    query: string,
    limit: number = 10
  ): { id: string; text: string; relevance: number }[] {
    const queryVector = this.createHypervector(query)
    const related = this.findRelatedMemories(queryVector, limit * 3)

    // Add associative expansion from the graph
    const expandedResults = new Map<string, number>()
    for (const memory of related) {
      expandedResults.set(memory.id, memory.similarity)

      // Include associated memories with diminishing relevance
      const associations = this.associativeNetwork.get(memory.id) || new Map()
      for (const [assocId, assocStrength] of associations.entries()) {
        const existingScore = expandedResults.get(assocId) || 0
        const propagatedScore = memory.similarity * assocStrength * 0.8
        if (propagatedScore > existingScore) {
          expandedResults.set(assocId, propagatedScore)
        }
      }
    }

    // Convert to array, sort by relevance, and apply emotional weighting
    return Array.from(expandedResults.entries())
      .map(([id, similarity]) => {
        const emotionalWeight = this.emotionalWeighting.get(id) || 1.0
        return {
          id,
          text: this.getMemoryText(id) || '',
          relevance: similarity * Math.sqrt(emotionalWeight),
        }
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
  }

  /**
   * Finds memories similar to the given vector
   */
  private findRelatedMemories(
    queryVector: Float32Array,
    limit: number
  ): { id: string; similarity: number }[] {
    const results: { id: string; similarity: number }[] = []

    for (const [id, vector] of this.memoryVectors.entries()) {
      const similarity = this.cosineSimilarity(queryVector, vector)
      if (similarity > 0.2) {
        // Threshold to avoid irrelevant matches
        results.push({ id, similarity })
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
  }

  /**
   * Applies natural memory decay to simulate forgetting
   */
  private applyMemoryDecay(): void {
    for (const [id, vector] of this.memoryVectors.entries()) {
      // Apply gradual decay to older memories
      const emotionalWeight = this.emotionalWeighting.get(id) || 1.0
      const decayRate =
        this.MEMORY_DECAY + (1 - this.MEMORY_DECAY) * (emotionalWeight / 10)

      for (let i = 0; i < this.DIMENSIONS; i++) {
        vector[i] *= decayRate
      }

      // Renormalize after decay
      this.normalizeVector(vector)
    }
  }

  /**
   * Computes cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0
    let aMagnitude = 0
    let bMagnitude = 0

    for (let i = 0; i < this.DIMENSIONS; i++) {
      dotProduct += a[i] * b[i]
      aMagnitude += a[i] * a[i]
      bMagnitude += b[i] * b[i]
    }

    aMagnitude = Math.sqrt(aMagnitude)
    bMagnitude = Math.sqrt(bMagnitude)

    if (aMagnitude === 0 || bMagnitude === 0) return 0
    return dotProduct / (aMagnitude * bMagnitude)
  }

  /**
   * Normalizes a vector to unit length
   */
  private normalizeVector(vector: Float32Array): void {
    let magnitude = 0
    for (let i = 0; i < vector.length; i++) {
      magnitude += vector[i] * vector[i]
    }

    magnitude = Math.sqrt(magnitude)
    if (magnitude === 0) return

    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude
    }
  }

  /**
   * Creates a deterministic random number generator
   */
  private createPseudoRandomGenerator(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Gets memory text from ID (would connect to storage)
   */
  private getMemoryText(id: string): string | null {
    // In real implementation, retrieve from database
    return id
  }

  /**
   * Exports memory state for persistence
   */
  public exportMemoryState(): Object {
    // Serialize memory state for persistence
    return {
      vectors: Array.from(this.memoryVectors.entries()).map(([id, vector]) => {
        return { id, vector: Array.from(vector) }
      }),
      associativeNetwork: Array.from(this.associativeNetwork.entries()).map(
        ([id, associations]) => {
          return { id, associations: Array.from(associations.entries()) }
        }
      ),
      emotional: Array.from(this.emotionalWeighting.entries()),
    }
  }

  /**
   * Imports memory state from persistence
   */
  public importMemoryState(state: any): void {
    if (!state) return

    // Deserialize memory state
    if (state.vectors) {
      for (const { id, vector } of state.vectors) {
        this.memoryVectors.set(id, new Float32Array(vector))
      }
    }

    if (state.associativeNetwork) {
      for (const { id, associations } of state.associativeNetwork) {
        const assocMap = new Map<string, number>()
        for (const [assocId, strength] of associations) {
          assocMap.set(assocId, strength)
        }
        this.associativeNetwork.set(id, assocMap)
      }
    }

    if (state.emotional) {
      for (const [id, weight] of state.emotional) {
        this.emotionalWeighting.set(id, weight)
      }
    }
  }
}

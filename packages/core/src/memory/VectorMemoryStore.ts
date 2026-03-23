/**
 * VectorMemoryStore - Real Semantic Memory for Deep Tree Echo
 *
 * Replaces the TF-IDF mock in RAGMemoryStore with actual vector embeddings.
 * Maintains API compatibility with RAGMemoryStore while providing:
 *
 * - Real dense vector embeddings (OpenAI, Ollama, or local hash projection)
 * - Cosine similarity search over the embedding space
 * - Persistent storage via FileSystemStorage (survives restarts)
 * - Episodic, semantic, and reflection memory types
 * - Recency-weighted retrieval (70% similarity, 30% recency)
 *
 * This is the "Arena" in the AAR (Agent-Arena-Relation) architecture:
 * the state manifold that the Agent operates upon.
 */
import { getLogger } from '../utils/logger.js';
import { MemoryStorage, InMemoryStorage } from './storage.js';
import { EmbeddingService, EmbeddingServiceConfig } from './EmbeddingService.js';
import type { Memory, ReflectionMemory } from './RAGMemoryStore.js';

const log = getLogger('deep-tree-echo-core/memory/VectorMemoryStore');

/**
 * Internal vector-indexed memory entry
 */
interface _VectorEntry {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
  metadata: Record<string, unknown>;
}

/**
 * Search result with similarity score
 */
export interface VectorSearchResult {
  memory: Memory;
  similarity: number;
  score: number; // Combined similarity + recency
}

/**
 * VectorMemoryStore configuration
 */
export interface VectorMemoryStoreConfig {
  /** Maximum memories to retain */
  memoryLimit?: number;
  /** Maximum reflections to retain */
  reflectionLimit?: number;
  /** Embedding service configuration */
  embedding?: Partial<EmbeddingServiceConfig>;
  /** Minimum similarity threshold for search results */
  similarityThreshold?: number;
  /** Weight for similarity vs recency (0-1, higher = more similarity) */
  similarityWeight?: number;
}

const DEFAULT_CONFIG: Required<VectorMemoryStoreConfig> = {
  memoryLimit: 5000,
  reflectionLimit: 500,
  embedding: {},
  similarityThreshold: 0.3,
  similarityWeight: 0.7,
};

export class VectorMemoryStore {
  private memories: Memory[] = [];
  private reflections: ReflectionMemory[] = [];
  private vectorIndex: Map<string, number[]> = new Map();
  private enabled: boolean = false;
  private storage: MemoryStorage;
  private embeddingService: EmbeddingService;
  private config: Required<VectorMemoryStoreConfig>;
  private dirty: boolean = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private loadPromise: Promise<void>;

  constructor(
    storage?: MemoryStorage,
    config?: Partial<VectorMemoryStoreConfig>
  ) {
    this.storage = storage || new InMemoryStorage();
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<VectorMemoryStoreConfig>;
    this.embeddingService = new EmbeddingService(this.config.embedding);
    this.loadPromise = this.loadMemories();
  }

  /**
   * Wait for initial load to complete (call after constructor if needed)
   */
  async ready(): Promise<void> {
    return this.loadPromise;
  }

  // ─── RAGMemoryStore-Compatible Interface ──────────────────────

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    log.info(`Vector memory system ${enabled ? 'enabled' : 'disabled'}`);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Store a new memory with real vector embedding
   */
  public async storeMemory(memory: Omit<Memory, 'id' | 'timestamp' | 'embedding'>): Promise<void> {
    await this.loadPromise; // Ensure initial load is complete
    if (!this.enabled) return;

    try {
      // Generate real embedding
      const embedding = await this.embeddingService.embed(memory.text);

      const newMemory: Memory = {
        ...memory,
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        embedding,
      };

      this.memories.push(newMemory);
      this.vectorIndex.set(newMemory.id, embedding);

      // Enforce memory limit
      if (this.memories.length > this.config.memoryLimit) {
        const removed = this.memories.shift();
        if (removed) this.vectorIndex.delete(removed.id);
      }

      this.scheduleSave();
      log.info(`Stored memory ${newMemory.id} (embedding dim=${embedding.length})`);
    } catch (error) {
      log.error('Failed to store memory:', error);
    }
  }

  /**
   * Store a reflection memory
   */
  public async storeReflection(
    content: string,
    type: 'periodic' | 'focused' = 'periodic',
    aspect?: string
  ): Promise<void> {
    await this.loadPromise;
    if (!this.enabled) return;

    try {
      const reflection: ReflectionMemory = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        content,
        type,
        aspect,
      };

      this.reflections.push(reflection);

      // Enforce reflection limit
      if (this.reflections.length > this.config.reflectionLimit) {
        this.reflections.shift();
      }

      this.scheduleSave();
      log.info(`Stored ${type} reflection${aspect ? ` on ${aspect}` : ''}`);
    } catch (error) {
      log.error('Failed to store reflection:', error);
    }
  }

  /**
   * Retrieve recent memories as formatted strings
   */
  public retrieveRecentMemories(count: number = 10): string[] {
    return this.memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
      .map((mem) => `[${new Date(mem.timestamp).toLocaleString()}] ${mem.sender}: ${mem.text}`);
  }

  /**
   * Retrieve memories for a specific chat
   */
  public getMemoriesByChat(chatId: number): Memory[] {
    return this.memories
      .filter((mem) => mem.chatId === chatId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get recent reflections
   */
  public getRecentReflections(count: number = 5): ReflectionMemory[] {
    return this.reflections.sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
  }

  /**
   * Get conversation context for a specific chat
   */
  public getConversationContext(chatId: number, messageLimit: number = 10): Memory[] {
    return this.memories
      .filter((mem) => mem.chatId === chatId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, messageLimit)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  public async clearAllMemories(): Promise<void> {
    this.memories = [];
    this.vectorIndex.clear();
    await this.saveMemories();
    log.info('Cleared all memories and vector index');
  }

  public async clearChatMemories(chatId: number): Promise<void> {
    const removed = this.memories.filter(m => m.chatId === chatId);
    removed.forEach(m => this.vectorIndex.delete(m.id));
    this.memories = this.memories.filter(m => m.chatId !== chatId);
    await this.saveMemories();
    log.info(`Cleared memories for chat ${chatId}`);
  }

  // ─── Real Vector Search (the actual upgrade) ─────────────────

  /**
   * Semantic search: find memories most similar to a query
   *
   * This is the core autonomy upgrade — real cosine similarity over
   * dense vector embeddings instead of TF-IDF keyword matching.
   */
  public async searchMemories(query: string, limit: number = 5): Promise<Memory[]> {
    const results = await this.searchMemoriesWithScores(query, limit);
    return results.map(r => r.memory);
  }

  /**
   * Semantic search with similarity scores
   */
  public async searchMemoriesWithScores(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    if (this.memories.length === 0) return [];

    // Embed the query
    const queryEmbedding = await this.embeddingService.embed(query);

    // Score each memory
    const scored: VectorSearchResult[] = [];

    for (const memory of this.memories) {
      const memoryEmbedding = this.vectorIndex.get(memory.id) || memory.embedding || [];

      if (memoryEmbedding.length === 0) continue;

      const similarity = EmbeddingService.cosineSimilarity(queryEmbedding, memoryEmbedding);

      if (similarity < this.config.similarityThreshold) continue;

      // Recency boost: exponential decay over 30 days
      const ageInDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.exp(-ageInDays / 30);

      // Combined score
      const score = similarity * this.config.similarityWeight +
                    recencyBoost * (1 - this.config.similarityWeight);

      scored.push({ memory, similarity, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Find memories similar to a given memory
   */
  public async findSimilarMemories(memoryId: string, threshold: number = 0.5): Promise<Memory[]> {
    const target = this.memories.find(m => m.id === memoryId);
    if (!target) return [];

    const targetEmbedding = this.vectorIndex.get(memoryId) || target.embedding || [];
    if (targetEmbedding.length === 0) return [];

    return this.memories
      .filter(m => m.id !== memoryId)
      .map(m => ({
        memory: m,
        similarity: EmbeddingService.cosineSimilarity(
          targetEmbedding,
          this.vectorIndex.get(m.id) || m.embedding || []
        ),
      }))
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map(r => r.memory);
  }

  // ─── Statistics ───────────────────────────────────────────────

  /**
   * Get memory store statistics
   */
  getStats(): {
    memoryCount: number;
    reflectionCount: number;
    vectorIndexSize: number;
    embeddingStats: ReturnType<EmbeddingService['getStats']>;
    enabled: boolean;
  } {
    return {
      memoryCount: this.memories.length,
      reflectionCount: this.reflections.length,
      vectorIndexSize: this.vectorIndex.size,
      embeddingStats: this.embeddingService.getStats(),
      enabled: this.enabled,
    };
  }

  /**
   * Get the embedding service (for external use)
   */
  getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }

  // ─── Persistence ──────────────────────────────────────────────

  private async loadMemories(): Promise<void> {
    try {
      const memoriesData = await this.storage.load('vectorMemoryStore_memories');
      if (memoriesData) {
        try {
          this.memories = JSON.parse(memoriesData);
          // Rebuild vector index from stored embeddings
          for (const mem of this.memories) {
            if (mem.embedding && mem.embedding.length > 0) {
              this.vectorIndex.set(mem.id, mem.embedding);
            }
          }
          log.info(`Loaded ${this.memories.length} memories (${this.vectorIndex.size} with embeddings)`);
        } catch (error) {
          log.error('Failed to parse memories:', error);
          this.memories = [];
        }
      }

      const reflectionsData = await this.storage.load('vectorMemoryStore_reflections');
      if (reflectionsData) {
        try {
          this.reflections = JSON.parse(reflectionsData);
          log.info(`Loaded ${this.reflections.length} reflections`);
        } catch (error) {
          log.error('Failed to parse reflections:', error);
          this.reflections = [];
        }
      }

      // Note: enabled state is controlled explicitly via setEnabled(),
      // not loaded from storage, to prevent race conditions with constructor
    } catch (error) {
      log.error('Failed to load memories:', error);
    }
  }

  private async saveMemories(): Promise<void> {
    try {
      const trimmedMemories = this.memories.slice(-this.config.memoryLimit);
      await this.storage.save('vectorMemoryStore_memories', JSON.stringify(trimmedMemories));

      const trimmedReflections = this.reflections.slice(-this.config.reflectionLimit);
      await this.storage.save('vectorMemoryStore_reflections', JSON.stringify(trimmedReflections));

      this.dirty = false;
      log.info(`Saved ${trimmedMemories.length} memories, ${trimmedReflections.length} reflections`);
    } catch (error) {
      log.error('Failed to save memories:', error);
    }
  }

  /**
   * Debounced save — prevents excessive I/O during rapid memory storage
   */
  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = null;
      if (this.dirty) {
        await this.saveMemories();
      }
    }, 1000);
  }

  /**
   * Force immediate save (call before shutdown)
   */
  async destroy(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.flush();
    this.memories = [];
    this.reflections = [];
    this.vectorIndex.clear();
    this.enabled = false;
    log.info('VectorMemoryStore destroyed');
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty) {
      await this.saveMemories();
    }
  }

  // destroy() is defined above flush()
}

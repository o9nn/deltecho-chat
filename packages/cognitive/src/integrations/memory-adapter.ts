/**
 * Memory Adapter for Cognitive Package
 *
 * Provides cognitive interface integration with RAGMemoryStore
 * for context retrieval and memory management.
 */

import { HyperDimensionalVector, UnifiedMessage } from "../types";

/**
 * Memory interface (for type safety without direct import)
 */
export interface IMemory {
  id: string;
  timestamp: number;
  chatId: number;
  messageId: number;
  sender: "user" | "bot";
  text: string;
}

/**
 * RAGMemoryStore interface
 */
export interface IRAGMemoryStore {
  searchMemories(query: string, limit?: number): IMemory[];
  storeMemory(memory: Omit<IMemory, "id" | "timestamp">): Promise<void>;
  retrieveRecentMemories(count?: number): string[];
  getConversationContext(chatId: number, messageLimit?: number): IMemory[];
  isEnabled(): boolean;
}

/**
 * Memory adapter configuration
 */
export interface MemoryAdapterConfig {
  /** Default search limit */
  defaultSearchLimit: number;
  /** Enable memory caching */
  enableCache: boolean;
  /** Cache TTL (ms) */
  cacheTTL: number;
  /** Minimum relevance score */
  minRelevance: number;
}

/**
 * Default memory config
 */
export const DEFAULT_MEMORY_CONFIG: MemoryAdapterConfig = {
  defaultSearchLimit: 5,
  enableCache: true,
  cacheTTL: 30000,
  minRelevance: 0.1,
};

/**
 * Cached search result
 */
interface CachedSearch {
  query: string;
  results: IMemory[];
  timestamp: number;
}

/**
 * MemoryAdapter bridges RAGMemoryStore with cognitive processing
 */
export class MemoryAdapter {
  private memory: IRAGMemoryStore | null = null;
  private config: MemoryAdapterConfig;
  private cache: Map<string, CachedSearch> = new Map();

  constructor(config: Partial<MemoryAdapterConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  /**
   * Connect to RAGMemoryStore instance
   */
  connect(memory: IRAGMemoryStore): void {
    this.memory = memory;
  }

  /**
   * Disconnect from memory store
   */
  disconnect(): void {
    this.memory = null;
    this.clearCache();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.memory !== null;
  }

  /**
   * Check if memory system is enabled
   */
  isEnabled(): boolean {
    return this.memory?.isEnabled() ?? false;
  }

  /**
   * Search for relevant memories
   */
  searchRelevant(query: string, limit?: number): IMemory[] {
    if (!this.memory) return [];

    const searchLimit = limit ?? this.config.defaultSearchLimit;

    // Check cache
    if (this.config.enableCache) {
      const cached = this.getFromCache(query);
      if (cached) return cached.slice(0, searchLimit);
    }

    const results = this.memory.searchMemories(query, searchLimit);

    // Cache results
    if (this.config.enableCache) {
      this.addToCache(query, results);
    }

    return results;
  }

  /**
   * Get context for message processing
   */
  getContextForMessage(message: UnifiedMessage, limit?: number): string {
    if (!this.memory) return "";

    const searchLimit = limit ?? this.config.defaultSearchLimit;
    const memories = this.searchRelevant(message.content, searchLimit);

    if (memories.length === 0) return "";

    return this.formatMemoriesAsContext(memories);
  }

  /**
   * Format memories as context string
   */
  formatMemoriesAsContext(memories: IMemory[]): string {
    if (memories.length === 0) return "";

    const header = "--- Relevant context from memory ---\n";
    const content = memories.map((m) => `[${m.sender}]: ${m.text}`).join("\n");
    const footer = "\n--- End of context ---";

    return header + content + footer;
  }

  /**
   * Get recent conversation context
   */
  getRecentContext(count?: number): string[] {
    if (!this.memory) return [];
    return this.memory.retrieveRecentMemories(
      count ?? this.config.defaultSearchLimit,
    );
  }

  /**
   * Store a message in memory
   */
  async storeMessage(
    message: UnifiedMessage,
    chatId: number,
    messageId: number,
  ): Promise<void> {
    if (!this.memory) return;

    await this.memory.storeMemory({
      chatId,
      messageId,
      sender: message.role === "user" ? "user" : "bot",
      text: message.content,
    });

    // Invalidate relevant cache entries
    this.invalidateCacheForContent(message.content);
  }

  /**
   * Get conversation context for a specific chat
   */
  getConversationContext(chatId: number, messageLimit?: number): IMemory[] {
    if (!this.memory) return [];
    return this.memory.getConversationContext(chatId, messageLimit ?? 10);
  }

  /**
   * Create hyper-dimensional vector from memories
   */
  createMemoryVector(memories: IMemory[]): HyperDimensionalVector {
    const dimensions = 256;
    const values = new Float32Array(dimensions);

    // Simple bag-of-words implementation
    for (const memory of memories) {
      const tokens = memory.text.toLowerCase().split(/\s+/);
      for (const token of tokens) {
        const hash = this.hashString(token);
        const dim = Math.abs(hash) % dimensions;
        values[dim] += 1;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(values.reduce((a, b) => a + b * b, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        values[i] /= magnitude;
      }
    }

    return {
      dimensions,
      values,
      metadata: {
        memoryCount: memories.length,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Get memory IDs from search results
   */
  getMemoryIds(memories: IMemory[]): string[] {
    return memories.map((m) => m.id);
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Get from cache
   */
  private getFromCache(query: string): IMemory[] | null {
    const cached = this.cache.get(query);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(query);
      return null;
    }

    return cached.results;
  }

  /**
   * Add to cache
   */
  private addToCache(query: string, results: IMemory[]): void {
    this.cache.set(query, {
      query,
      results,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }
  }

  /**
   * Invalidate cache entries that might be affected by new content
   */
  private invalidateCacheForContent(content: string): void {
    const tokens = new Set(content.toLowerCase().split(/\s+/).slice(0, 10));

    for (const [query] of this.cache) {
      const queryTokens = query.toLowerCase().split(/\s+/);
      const hasOverlap = queryTokens.some((t) => tokens.has(t));
      if (hasOverlap) {
        this.cache.delete(query);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need hit tracking
    };
  }
}

/**
 * Create a memory adapter
 */
export function createMemoryAdapter(
  config?: Partial<MemoryAdapterConfig>,
): MemoryAdapter {
  return new MemoryAdapter(config);
}

/**
 * IntegratedMemorySystem: Bridges HyperDimensionalMemory with RAGMemoryStore
 *
 * This module provides a unified interface that combines:
 * - HyperDimensionalMemory: FFT-based hypervector encoding for semantic similarity
 * - RAGMemoryStore: TF-IDF based retrieval with persistence
 *
 * The integration enables:
 * - Dual-path retrieval (hypervector + TF-IDF)
 * - Emotional salience weighting
 * - Associative memory expansion
 * - Unified context generation for LLM prompts
 */

import { getLogger } from "../utils/logger";
import { HyperDimensionalMemory } from "./HyperDimensionalMemory";
import { RAGMemoryStore, Memory, ReflectionMemory } from "./RAGMemoryStore";
import { MemoryStorage } from "./storage";

const log = getLogger("deep-tree-echo-core/memory/IntegratedMemorySystem");

/**
 * Configuration for the integrated memory system
 */
export interface IntegratedMemoryConfig {
  /** Enable hyperdimensional memory encoding */
  enableHDM: boolean;
  /** Weight for HDM results in combined retrieval (0-1) */
  hdmWeight: number;
  /** Weight for RAG/TF-IDF results in combined retrieval (0-1) */
  ragWeight: number;
  /** Minimum relevance threshold for retrieval */
  relevanceThreshold: number;
  /** Maximum memories to return per query */
  maxRetrievalCount: number;
  /** HDM dimensions (default: 10000) */
  hdmDimensions?: number;
  /** Memory decay rate (0-1, default: 0.98) */
  memoryDecay?: number;
}

/**
 * Retrieved memory with combined relevance scoring
 */
export interface RetrievedMemory {
  memory: Memory;
  hdmScore: number;
  ragScore: number;
  combinedScore: number;
  emotionalWeight: number;
  associatedMemories: string[];
}

/**
 * Context package for LLM prompts
 */
export interface MemoryContext {
  relevantMemories: RetrievedMemory[];
  recentReflections: ReflectionMemory[];
  emotionalTone: number;
  topicClusters: string[][];
  contextSummary: string;
}

const DEFAULT_CONFIG: IntegratedMemoryConfig = {
  enableHDM: true,
  hdmWeight: 0.6,
  ragWeight: 0.4,
  relevanceThreshold: 0.2,
  maxRetrievalCount: 10,
  hdmDimensions: 10000,
  memoryDecay: 0.98,
};

/**
 * IntegratedMemorySystem combines hyperdimensional and RAG-based memory
 * for enhanced semantic retrieval and context generation
 */
export class IntegratedMemorySystem {
  private hdm: HyperDimensionalMemory;
  private rag: RAGMemoryStore;
  private config: IntegratedMemoryConfig;
  private memoryTextMap: Map<string, string> = new Map();
  private emotionalHistory: Map<string, number> = new Map();

  constructor(storage?: MemoryStorage, config?: Partial<IntegratedMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize HyperDimensionalMemory
    this.hdm = new HyperDimensionalMemory({
      dimensions: this.config.hdmDimensions,
      memoryDecay: this.config.memoryDecay,
    });

    // Initialize RAGMemoryStore
    this.rag = new RAGMemoryStore(storage);

    log.info("IntegratedMemorySystem initialized", {
      hdmEnabled: this.config.enableHDM,
      hdmWeight: this.config.hdmWeight,
      ragWeight: this.config.ragWeight,
    });
  }

  /**
   * Enable or disable the memory system
   */
  setEnabled(enabled: boolean): void {
    this.rag.setEnabled(enabled);
    log.info(`IntegratedMemorySystem ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if memory system is enabled
   */
  isEnabled(): boolean {
    return this.rag.isEnabled();
  }

  /**
   * Store a memory in both systems
   */
  async storeMemory(
    chatId: number,
    messageId: number,
    sender: "user" | "bot",
    text: string,
    emotionalSignificance: number = 1.0
  ): Promise<string> {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store in RAGMemoryStore for persistence and TF-IDF search
    await this.rag.storeMemory({
      chatId,
      messageId,
      sender,
      text,
    });

    // Store in HyperDimensionalMemory for semantic similarity
    if (this.config.enableHDM) {
      this.hdm.storeMemory(memoryId, text, Date.now(), emotionalSignificance);
      this.memoryTextMap.set(memoryId, text);
      this.emotionalHistory.set(memoryId, emotionalSignificance);
    }

    log.debug(`Stored memory ${memoryId} in both systems`);
    return memoryId;
  }

  /**
   * Store a reflection memory
   */
  async storeReflection(
    content: string,
    type: "periodic" | "focused" = "periodic",
    aspect?: string
  ): Promise<void> {
    await this.rag.storeReflection(content, type, aspect);

    // Also store in HDM for semantic retrieval
    if (this.config.enableHDM) {
      const reflectionId = `ref_${Date.now()}`;
      this.hdm.storeMemory(reflectionId, content, Date.now(), 1.5); // Higher weight for reflections
      this.memoryTextMap.set(reflectionId, content);
    }
  }

  /**
   * Retrieve relevant memories using combined HDM + RAG scoring
   */
  retrieveRelevantMemories(
    query: string,
    chatId?: number,
    limit?: number
  ): RetrievedMemory[] {
    const maxResults = limit || this.config.maxRetrievalCount;
    const results: Map<string, RetrievedMemory> = new Map();

    // Get RAG results (TF-IDF based)
    const ragResults = this.rag.searchMemories(query, maxResults * 2);
    const maxRagScore = ragResults.length > 0 ? 1 : 0;

    for (let i = 0; i < ragResults.length; i++) {
      const memory = ragResults[i];
      // Normalize RAG score based on position (first = 1.0, decaying)
      const ragScore = maxRagScore * Math.exp(-i / maxResults);

      results.set(memory.id, {
        memory,
        hdmScore: 0,
        ragScore,
        combinedScore: ragScore * this.config.ragWeight,
        emotionalWeight: this.emotionalHistory.get(memory.id) || 1.0,
        associatedMemories: [],
      });
    }

    // Get HDM results (hypervector based)
    if (this.config.enableHDM) {
      const hdmResults = this.hdm.recallMemories(query, maxResults * 2);

      for (const hdmResult of hdmResults) {
        const text = this.memoryTextMap.get(hdmResult.id);
        if (!text) continue;

        const existing = results.get(hdmResult.id);
        if (existing) {
          // Update existing entry with HDM score
          existing.hdmScore = hdmResult.relevance;
          existing.combinedScore =
            existing.ragScore * this.config.ragWeight +
            hdmResult.relevance * this.config.hdmWeight;
        } else {
          // Create new entry from HDM result
          // Note: This memory might not be in RAG (e.g., reflections)
          results.set(hdmResult.id, {
            memory: {
              id: hdmResult.id,
              timestamp: Date.now(),
              chatId: chatId || 0,
              messageId: 0,
              sender: "bot",
              text,
            },
            hdmScore: hdmResult.relevance,
            ragScore: 0,
            combinedScore: hdmResult.relevance * this.config.hdmWeight,
            emotionalWeight: this.emotionalHistory.get(hdmResult.id) || 1.0,
            associatedMemories: [],
          });
        }
      }
    }

    // Apply emotional weighting and filter
    const finalResults = Array.from(results.values())
      .map((r) => ({
        ...r,
        combinedScore: r.combinedScore * Math.sqrt(r.emotionalWeight),
      }))
      .filter((r) => r.combinedScore >= this.config.relevanceThreshold)
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, maxResults);

    // Filter by chatId if specified
    if (chatId !== undefined) {
      return finalResults.filter(
        (r) => r.memory.chatId === chatId || r.memory.chatId === 0
      );
    }

    log.debug(`Retrieved ${finalResults.length} relevant memories for query`);
    return finalResults;
  }

  /**
   * Generate a complete memory context for LLM prompts
   */
  generateMemoryContext(
    query: string,
    chatId?: number,
    options?: {
      includeReflections?: boolean;
      maxMemories?: number;
      maxReflections?: number;
    }
  ): MemoryContext {
    const includeReflections = options?.includeReflections ?? true;
    const maxMemories = options?.maxMemories ?? this.config.maxRetrievalCount;
    const maxReflections = options?.maxReflections ?? 3;

    // Retrieve relevant memories
    const relevantMemories = this.retrieveRelevantMemories(query, chatId, maxMemories);

    // Get recent reflections
    const recentReflections = includeReflections
      ? this.rag.getRecentReflections(maxReflections)
      : [];

    // Calculate emotional tone from retrieved memories
    const emotionalTone =
      relevantMemories.length > 0
        ? relevantMemories.reduce((sum, m) => sum + m.emotionalWeight, 0) /
          relevantMemories.length
        : 1.0;

    // Extract topic clusters (simple word overlap clustering)
    const topicClusters = this.extractTopicClusters(relevantMemories);

    // Generate context summary
    const contextSummary = this.generateContextSummary(
      relevantMemories,
      recentReflections,
      emotionalTone
    );

    return {
      relevantMemories,
      recentReflections,
      emotionalTone,
      topicClusters,
      contextSummary,
    };
  }

  /**
   * Extract topic clusters from memories using word overlap
   */
  private extractTopicClusters(memories: RetrievedMemory[]): string[][] {
    if (memories.length === 0) return [];

    const clusters: string[][] = [];
    const assigned = new Set<string>();

    for (const memory of memories) {
      if (assigned.has(memory.memory.id)) continue;

      const cluster = [memory.memory.text];
      assigned.add(memory.memory.id);

      // Find similar memories for this cluster
      const words = new Set(memory.memory.text.toLowerCase().split(/\s+/));

      for (const other of memories) {
        if (assigned.has(other.memory.id)) continue;

        const otherWords = new Set(other.memory.text.toLowerCase().split(/\s+/));
        let overlap = 0;
        for (const word of words) {
          if (otherWords.has(word) && word.length > 3) overlap++;
        }

        // If significant overlap, add to cluster
        if (overlap >= 3) {
          cluster.push(other.memory.text);
          assigned.add(other.memory.id);
        }
      }

      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }

    return clusters.slice(0, 5); // Limit to 5 clusters
  }

  /**
   * Generate a human-readable context summary
   */
  private generateContextSummary(
    memories: RetrievedMemory[],
    reflections: ReflectionMemory[],
    emotionalTone: number
  ): string {
    const parts: string[] = [];

    if (memories.length > 0) {
      parts.push(`Found ${memories.length} relevant memories.`);

      const topMemory = memories[0];
      if (topMemory.combinedScore > 0.7) {
        parts.push(`Strongly related to: "${topMemory.memory.text.slice(0, 100)}..."`);
      }
    }

    if (reflections.length > 0) {
      parts.push(`${reflections.length} recent reflections available.`);
    }

    if (emotionalTone > 1.2) {
      parts.push("Emotional context: heightened significance.");
    } else if (emotionalTone < 0.8) {
      parts.push("Emotional context: routine interaction.");
    }

    return parts.join(" ");
  }

  /**
   * Format memory context for inclusion in LLM system prompt
   */
  formatContextForPrompt(context: MemoryContext): string {
    const sections: string[] = [];

    // Add relevant memories section
    if (context.relevantMemories.length > 0) {
      sections.push("## Relevant Memories");
      for (const mem of context.relevantMemories.slice(0, 5)) {
        const timestamp = new Date(mem.memory.timestamp).toLocaleString();
        const sender = mem.memory.sender === "user" ? "User" : "You";
        sections.push(`- [${timestamp}] ${sender}: ${mem.memory.text}`);
      }
    }

    // Add reflections section
    if (context.recentReflections.length > 0) {
      sections.push("\n## Recent Reflections");
      for (const ref of context.recentReflections) {
        sections.push(`- ${ref.content.slice(0, 200)}${ref.content.length > 200 ? "..." : ""}`);
      }
    }

    // Add emotional context
    if (context.emotionalTone !== 1.0) {
      const tone =
        context.emotionalTone > 1.2
          ? "emotionally significant"
          : context.emotionalTone < 0.8
          ? "routine"
          : "neutral";
      sections.push(`\n## Emotional Context: ${tone}`);
    }

    return sections.join("\n");
  }

  /**
   * Get memory system statistics
   */
  getStats(): {
    hdmStats: ReturnType<HyperDimensionalMemory["getStats"]>;
    totalMemories: number;
    totalReflections: number;
    emotionalHistorySize: number;
  } {
    return {
      hdmStats: this.hdm.getStats(),
      totalMemories: this.memoryTextMap.size,
      totalReflections: this.rag.getRecentReflections(1000).length,
      emotionalHistorySize: this.emotionalHistory.size,
    };
  }

  /**
   * Clear all memories
   */
  async clearAll(): Promise<void> {
    await this.rag.clearAllMemories();
    this.memoryTextMap.clear();
    this.emotionalHistory.clear();
    // Note: HDM doesn't have a clear method, would need to recreate
    log.info("Cleared all memories from integrated system");
  }

  /**
   * Export state for persistence
   */
  exportState(): object {
    return {
      hdmState: this.hdm.exportMemoryState(),
      memoryTextMap: Array.from(this.memoryTextMap.entries()),
      emotionalHistory: Array.from(this.emotionalHistory.entries()),
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: any): void {
    if (!state) return;

    if (state.hdmState) {
      this.hdm.importMemoryState(state.hdmState);
    }

    if (state.memoryTextMap) {
      this.memoryTextMap = new Map(state.memoryTextMap);
    }

    if (state.emotionalHistory) {
      this.emotionalHistory = new Map(state.emotionalHistory);
    }

    log.info("Imported state into integrated memory system");
  }
}

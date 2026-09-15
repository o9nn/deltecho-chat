import { getLogger } from "../utils/logger";
import { MemoryStorage, InMemoryStorage } from "./storage";

const log = getLogger("deep-tree-echo-core/memory/RAGMemoryStore");

export const RAG_MEMORY_KEY = "deepTreeEchoBotMemories";
export const RAG_REFLECTION_KEY = "deepTreeEchoBotReflections";
export const MEMORY_ENABLED_KEY = "deepTreeEchoBotMemoryEnabled";

// Default configuration
const DEFAULT_MEMORY_LIMIT = 1000;
const DEFAULT_REFLECTION_LIMIT = 100;
const EMBEDDING_DIMENSIONS = 256; // Compact but effective

/**
 * Structure for a conversation memory
 */
export interface Memory {
  id: string;
  timestamp: number;
  chatId: number;
  messageId: number;
  sender: "user" | "bot";
  text: string;
  embedding?: number[]; // Vector embedding for semantic search
  tombstoned?: boolean;
  pinned?: boolean;
}

export interface ScoredMemory {
  memory: Memory;
  score: number;
  tfidfScore: number;
  embeddingScore: number;
}

export class UnknownMemoryError extends Error {
  constructor(public readonly memoryId: string) {
    super(`Unknown memory id: ${memoryId}`);
    this.name = "UnknownMemoryError";
  }
}

/**
 * Structure for a reflection memory
 */
export interface ReflectionMemory {
  id: string;
  timestamp: number;
  content: string;
  type: "periodic" | "focused";
  aspect?: string; // For focused reflections
}

/**
 * RAGMemoryStore manages conversation memories using a Retrieval Augmented Generation approach
 * It stores message history, generates embeddings, and retrieves relevant context
 */
export class RAGMemoryStore {
  private memories: Memory[] = [];
  private reflections: ReflectionMemory[] = [];
  private enabled: boolean = false;
  private storage: MemoryStorage;
  private memoryLimit: number;
  private reflectionLimit: number;
  private idfScoresCache: Map<string, number> | null = null;
  private loadPromise: Promise<void>;
  private loadError: Error | null = null;

  constructor(
    storage?: MemoryStorage,
    options?: { memoryLimit?: number; reflectionLimit?: number },
  ) {
    this.storage = storage || new InMemoryStorage();
    this.memoryLimit = options?.memoryLimit || DEFAULT_MEMORY_LIMIT;
    this.reflectionLimit = options?.reflectionLimit || DEFAULT_REFLECTION_LIMIT;
    this.loadPromise = this.loadMemories();
  }

  /**
   * Wait for initial load. Rejects when a RAG JSON key fails to parse.
   */
  public async ready(): Promise<void> {
    await this.loadPromise;
    if (this.loadError) {
      throw this.loadError;
    }
  }

  /**
   * Re-read conversation and reflection keys from storage.
   * Used after apply-restore so in-memory rows match snapshot bytes.
   */
  public async reload(): Promise<void> {
    const enabled = this.enabled;
    this.memories = [];
    this.reflections = [];
    this.idfScoresCache = null;
    this.loadError = null;
    this.loadPromise = this.loadMemories();
    await this.ready();
    this.enabled = enabled;
  }

  public async restoreLists(
    memories: Memory[],
    reflections: ReflectionMemory[],
  ): Promise<void> {
    const enabled = this.enabled;
    this.memories = memories.map((memory) => ({
      ...memory,
      embedding: memory.embedding ? [...memory.embedding] : undefined,
    }));
    this.reflections = reflections.map((item) => ({ ...item }));
    this.idfScoresCache = null;
    await this.saveMemories();
    this.enabled = enabled;
  }

  /**
   * Enable or disable the memory storage
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    log.info(`Memory system ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if memory system is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Load memories from persistent storage
   */
  private async loadMemories(): Promise<void> {
    try {
      // Load conversation memories
      const memoriesData = await this.storage.load(RAG_MEMORY_KEY);
      if (memoriesData) {
        try {
          this.memories = JSON.parse(memoriesData);
          for (const memory of this.memories) {
            if (
              !memory.embedding ||
              memory.embedding.length !== EMBEDDING_DIMENSIONS
            ) {
              memory.embedding = this.generateEmbedding(memory.text);
            }
          }
          log.info(`Loaded ${this.memories.length} conversation memories`);
        } catch (error) {
          this.loadError = new Error(
            `Invalid JSON in ${RAG_MEMORY_KEY}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          log.error("Failed to parse conversation memories:", error);
          return;
        }
      }

      // Load reflection memories
      const reflectionsData = await this.storage.load(RAG_REFLECTION_KEY);
      if (reflectionsData) {
        try {
          this.reflections = JSON.parse(reflectionsData);
          log.info(`Loaded ${this.reflections.length} reflection memories`);
        } catch (error) {
          this.loadError = new Error(
            `Invalid JSON in ${RAG_REFLECTION_KEY}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          log.error("Failed to parse reflection memories:", error);
          return;
        }
      }

      // Load memory enabled setting
      const enabledData = await this.storage.load(MEMORY_ENABLED_KEY);
      this.enabled = enabledData === "true";
    } catch (error) {
      log.error("Failed to load memories:", error);
      this.loadError =
        error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Save memories to persistent storage
   */
  private async saveMemories(): Promise<void> {
    try {
      const trimmedMemories = this.trimLiveMemories(this.memories);
      this.memories = trimmedMemories;
      await this.storage.save(RAG_MEMORY_KEY, JSON.stringify(trimmedMemories));

      const trimmedReflections = this.reflections.slice(-this.reflectionLimit);
      this.reflections = trimmedReflections;
      await this.storage.save(
        RAG_REFLECTION_KEY,
        JSON.stringify(trimmedReflections),
      );

      log.info("Saved memories to persistent storage");
    } catch (error) {
      log.error("Failed to save memories:", error);
    }
  }

  private trimLiveMemories(memories: Memory[]): Memory[] {
    const liveIds = memories
      .filter((memory) => !memory.tombstoned)
      .slice(-this.memoryLimit)
      .map((memory) => memory.id);
    const keepLive = new Set(liveIds);
    return memories.filter(
      (memory) => memory.tombstoned || keepLive.has(memory.id),
    );
  }

  private liveMemories(): Memory[] {
    return this.memories.filter((memory) => !memory.tombstoned);
  }

  /**
   * Store a new memory
   */
  public async storeMemory(
    memory: Omit<Memory, "id" | "timestamp" | "embedding">,
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const newMemory: Memory = {
        ...memory,
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        embedding: this.generateEmbedding(memory.text),
      };

      this.memories.push(newMemory);
      this.idfScoresCache = null; // Invalidate cache
      await this.saveMemories();

      log.info(`Stored new memory: ${newMemory.id}`);
    } catch (error) {
      log.error("Failed to store memory:", error);
    }
  }

  /**
   * Generate a vector embedding for text using hash-based random projection
   * This creates deterministic, compact embeddings without external API calls
   */
  private generateEmbedding(text: string): number[] {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      return new Array(EMBEDDING_DIMENSIONS).fill(0);
    }

    // Initialize embedding vector
    const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);

    // Generate embedding using hash-based random projection
    for (const token of tokens) {
      const tokenHash = this.hashString(token);
      const rng = this.createSeededRng(tokenHash);

      // Add random projection for this token
      for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
        // Generate pseudo-random value in [-1, 1]
        const randomVal = rng() * 2 - 1;
        embedding[i] += randomVal;
      }
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );

    if (magnitude > 0) {
      for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Create a seeded pseudo-random number generator
   */
  private createSeededRng(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Store a reflection memory
   */
  public async storeReflection(
    content: string,
    type: "periodic" | "focused" = "periodic",
    aspect?: string,
  ): Promise<void> {
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
      await this.saveMemories();

      log.info(`Stored new ${type} reflection${aspect ? ` on ${aspect}` : ""}`);
    } catch (error) {
      log.error("Failed to store reflection:", error);
    }
  }

  /**
   * Retrieve all memories for a specific chat
   */
  public getMemoriesByChat(chatId: number): Memory[] {
    return this.liveMemories()
      .filter((mem) => mem.chatId === chatId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Retrieve recent memories across all chats, ordered by timestamp
   */
  public retrieveRecentMemories(count: number = 10): string[] {
    return this.liveMemories()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
      .map(
        (mem) =>
          `[${new Date(mem.timestamp).toLocaleString()}] ${mem.sender}: ${
            mem.text
          }`,
      );
  }

  /**
   * Retrieve recent reflections, ordered by timestamp
   */
  public getRecentReflections(count: number = 5): ReflectionMemory[] {
    return this.reflections
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Clear all memories
   */
  public async clearAllMemories(): Promise<void> {
    this.memories = [];
    this.idfScoresCache = null; // Invalidate cache
    await this.saveMemories();
    log.info("Cleared all conversation memories");
  }

  /**
   * Clear memories for a specific chat
   */
  public async clearChatMemories(chatId: number): Promise<void> {
    this.memories = this.memories.filter((mem) => mem.chatId !== chatId);
    this.idfScoresCache = null; // Invalidate cache
    await this.saveMemories();
    log.info(`Cleared memories for chat ${chatId}`);
  }

  /**
   * Search memories using hybrid TF-IDF + embedding similarity
   * Ranks results by relevance score combining term frequency, embedding similarity, and recency
   */
  public searchMemories(query: string, limit: number = 5): Memory[] {
    return this.searchMemoriesWithScores(query, limit).map(
      (item) => item.memory,
    );
  }

  /**
   * Search memories and keep component scores for ranking callers.
   */
  public searchMemoriesWithScores(
    query: string,
    limit: number = 5,
  ): ScoredMemory[] {
    const live = this.liveMemories();
    if (live.length === 0) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryEmbedding = this.generateEmbedding(query);
    const idfScores = this.calculateIDF();

    const scoredMemories = live.map((memory) => {
      const memoryTokens = this.tokenize(memory.text);
      const tfidfScore = this.calculateTFIDF(
        queryTokens,
        memoryTokens,
        idfScores,
      );

      let embeddingScore = 0;
      if (
        memory.embedding &&
        memory.embedding.length === EMBEDDING_DIMENSIONS
      ) {
        embeddingScore = this.cosineSimilarityEmbedding(
          queryEmbedding,
          memory.embedding,
        );
      }

      const ageInDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.exp(-ageInDays / 30);

      const score =
        tfidfScore * 0.4 + embeddingScore * 0.4 + recencyBoost * 0.2;

      return { memory, score, tfidfScore, embeddingScore };
    });

    return scoredMemories
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Search memories using only embedding similarity (pure semantic search)
   */
  public searchByEmbedding(query: string, limit: number = 5): Memory[] {
    if (this.memories.length === 0) return [];

    const queryEmbedding = this.generateEmbedding(query);

    const scoredMemories = this.liveMemories()
      .filter((m) => m.embedding && m.embedding.length === EMBEDDING_DIMENSIONS)
      .map((memory) => ({
        memory,
        score: this.cosineSimilarityEmbedding(
          queryEmbedding,
          memory.embedding!,
        ),
      }));

    return scoredMemories
      .filter((item) => item.score > 0.1) // Threshold for relevance
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.memory);
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   */
  private cosineSimilarityEmbedding(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Tokenize text into normalized words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.isStopWord(word));
  }

  /**
   * Check if word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "been",
      "be",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "shall",
      "can",
      "this",
      "that",
      "these",
      "those",
      "it",
      "its",
      "they",
      "them",
      "their",
      "we",
      "us",
      "our",
      "you",
      "your",
      "he",
      "him",
      "his",
      "she",
      "her",
    ]);
    return stopWords.has(word);
  }

  /**
   * Calculate IDF (Inverse Document Frequency) for all terms
   */
  private calculateIDF(): Map<string, number> {
    if (this.idfScoresCache) {
      return this.idfScoresCache;
    }

    const documentFrequency = new Map<string, number>();
    const live = this.liveMemories();
    const totalDocs = live.length;

    live.forEach((memory) => {
      const uniqueTokens = new Set(this.tokenize(memory.text));
      uniqueTokens.forEach((token) => {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      });
    });

    // Calculate IDF scores
    const idfScores = new Map<string, number>();
    documentFrequency.forEach((df, term) => {
      // IDF = log(N / df) where N is total documents
      idfScores.set(term, Math.log((totalDocs + 1) / (df + 1)) + 1);
    });

    this.idfScoresCache = idfScores;
    return idfScores;
  }

  /**
   * Calculate TF-IDF score between query and document
   */
  private calculateTFIDF(
    queryTokens: string[],
    docTokens: string[],
    idfScores: Map<string, number>,
  ): number {
    if (docTokens.length === 0) return 0;

    // Calculate term frequency in document
    const termFreq = new Map<string, number>();
    docTokens.forEach((token) => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    // Calculate TF-IDF for query terms
    let score = 0;
    const queryTermSet = new Set(queryTokens);

    queryTermSet.forEach((queryTerm) => {
      const tf = (termFreq.get(queryTerm) || 0) / docTokens.length;
      const idf = idfScores.get(queryTerm) || 1;
      score += tf * idf;
    });

    // Normalize by query length
    return score / Math.sqrt(queryTermSet.size);
  }

  /**
   * Find memories similar to a given memory (for clustering/deduplication)
   * Uses hybrid TF-IDF + embedding similarity
   */
  public findSimilarMemories(
    memoryId: string,
    threshold: number = 0.5,
  ): Memory[] {
    return this.findSimilarMemoriesWithScores(memoryId, threshold).map(
      (item) => item.memory,
    );
  }

  public findSimilarMemoriesWithScores(
    memoryId: string,
    threshold: number = 0.5,
  ): Array<{ memory: Memory; score: number }> {
    const live = this.liveMemories();
    const targetMemory = live.find((m) => m.id === memoryId);
    if (!targetMemory) return [];

    const targetTokens = this.tokenize(targetMemory.text);
    const idfScores = this.calculateIDF();

    return live
      .filter((m) => m.id !== memoryId)
      .map((memory) => {
        const tfidfSim = this.calculateCosineSimilarity(
          targetTokens,
          this.tokenize(memory.text),
          idfScores,
        );

        let embeddingSim = 0;
        if (
          targetMemory.embedding &&
          targetMemory.embedding.length === EMBEDDING_DIMENSIONS &&
          memory.embedding &&
          memory.embedding.length === EMBEDDING_DIMENSIONS
        ) {
          embeddingSim = this.cosineSimilarityEmbedding(
            targetMemory.embedding,
            memory.embedding,
          );
        }

        const score = tfidfSim * 0.5 + embeddingSim * 0.5;
        return { memory, score };
      })
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate cosine similarity between two token sets
   */
  private calculateCosineSimilarity(
    tokens1: string[],
    tokens2: string[],
    idfScores: Map<string, number>,
  ): number {
    const vec1 = this.createTFIDFVector(tokens1, idfScores);
    const vec2 = this.createTFIDFVector(tokens2, idfScores);

    // Get all unique terms
    const allTerms = new Set([...vec1.keys(), ...vec2.keys()]);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    allTerms.forEach((term) => {
      const v1 = vec1.get(term) || 0;
      const v2 = vec2.get(term) || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    });

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Create TF-IDF vector for tokens
   */
  private createTFIDFVector(
    tokens: string[],
    idfScores: Map<string, number>,
  ): Map<string, number> {
    const vector = new Map<string, number>();
    const termFreq = new Map<string, number>();

    tokens.forEach((token) => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    termFreq.forEach((tf, term) => {
      const normalizedTF = tf / tokens.length;
      const idf = idfScores.get(term) || 1;
      vector.set(term, normalizedTF * idf);
    });

    return vector;
  }

  /**
   * Get conversation context for a specific chat
   */
  public getConversationContext(
    chatId: number,
    messageLimit: number = 10,
  ): Memory[] {
    return this.liveMemories()
      .filter((mem) => mem.chatId === chatId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, messageLimit)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  public listMemories(): Memory[] {
    return [...this.memories];
  }

  public listLiveMemories(): Memory[] {
    return this.liveMemories();
  }

  public listReflections(): ReflectionMemory[] {
    return [...this.reflections];
  }

  public getMemory(id: string): Memory {
    const memory = this.memories.find((item) => item.id === id);
    if (!memory) {
      throw new UnknownMemoryError(id);
    }
    return memory;
  }

  public async replaceMemory(
    id: string,
    patch: Partial<Pick<Memory, "text" | "pinned" | "tombstoned">>,
  ): Promise<Memory> {
    if (!this.enabled) {
      throw new Error("Memory system is disabled");
    }
    const index = this.memories.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new UnknownMemoryError(id);
    }
    const current = this.memories[index];
    const nextText = patch.text ?? current.text;
    const updated: Memory = {
      ...current,
      ...patch,
      text: nextText,
      embedding:
        patch.text !== undefined
          ? this.generateEmbedding(nextText)
          : current.embedding,
    };
    this.memories[index] = updated;
    this.idfScoresCache = null;
    await this.saveMemories();
    return updated;
  }

  public async tombstoneMemory(id: string): Promise<Memory> {
    return this.replaceMemory(id, { tombstoned: true });
  }
}

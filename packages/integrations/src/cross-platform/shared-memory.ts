/**
 * Shared Memory Access for Cross-Platform Integrations
 *
 * Provides unified memory access across all platform integrations,
 * connecting to the central RAGMemoryStore and cognitive system.
 */

import { EventEmitter } from 'events';
import { Platform } from './presence-manager.js';

/**
 * Memory entry type
 */
export enum MemoryType {
    CONVERSATION = 'conversation',
    FACT = 'fact',
    PREFERENCE = 'preference',
    RELATIONSHIP = 'relationship',
    EVENT = 'event',
    SKILL = 'skill',
    CONTEXT = 'context',
}

/**
 * Memory entry
 */
export interface MemoryEntry {
    /** Unique memory ID */
    id: string;
    /** Memory type */
    type: MemoryType;
    /** Content/value */
    content: string;
    /** Associated user ID (if any) */
    userId?: string;
    /** Associated conversation ID (if any) */
    conversationId?: string;
    /** Platform where memory originated */
    platform?: Platform;
    /** Embedding vector (if available) */
    embedding?: number[];
    /** Importance score (0-1) */
    importance: number;
    /** Emotional valence (-1 to 1) */
    valence?: number;
    /** Access count */
    accessCount: number;
    /** Last accessed */
    lastAccessed: Date;
    /** Created timestamp */
    created: Date;
    /** Expiry timestamp (if ephemeral) */
    expiry?: Date;
    /** Metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Memory query options
 */
export interface MemoryQuery {
    /** Search query text */
    query: string;
    /** Filter by type */
    types?: MemoryType[];
    /** Filter by user */
    userId?: string;
    /** Filter by conversation */
    conversationId?: string;
    /** Filter by platform */
    platform?: Platform;
    /** Minimum importance */
    minImportance?: number;
    /** Maximum results */
    limit?: number;
    /** Include expired entries */
    includeExpired?: boolean;
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
    entry: MemoryEntry;
    relevance: number;
    matchedTerms: string[];
}

/**
 * Memory store interface for backend integration
 */
export interface MemoryStoreBackend {
    /**
     * Add a memory entry
     */
    add(entry: Omit<MemoryEntry, 'id' | 'accessCount' | 'lastAccessed' | 'created'>): Promise<MemoryEntry>;

    /**
     * Get memory by ID
     */
    get(id: string): Promise<MemoryEntry | null>;

    /**
     * Search memories
     */
    search(query: MemoryQuery): Promise<MemorySearchResult[]>;

    /**
     * Update memory
     */
    update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry>;

    /**
     * Delete memory
     */
    delete(id: string): Promise<boolean>;

    /**
     * Get memories for user
     */
    getForUser(userId: string, limit?: number): Promise<MemoryEntry[]>;

    /**
     * Get memories for conversation
     */
    getForConversation(conversationId: string, limit?: number): Promise<MemoryEntry[]>;

    /**
     * Clear expired memories
     */
    clearExpired(): Promise<number>;
}

/**
 * Memory event types
 */
export enum MemoryEventType {
    MEMORY_ADDED = 'memory:added',
    MEMORY_ACCESSED = 'memory:accessed',
    MEMORY_UPDATED = 'memory:updated',
    MEMORY_DELETED = 'memory:deleted',
    MEMORY_RECALLED = 'memory:recalled',
    CLEANUP_COMPLETED = 'memory:cleanup_completed',
}

/**
 * Memory event
 */
export interface MemoryEvent {
    type: MemoryEventType;
    memoryId?: string;
    entry?: MemoryEntry;
    platform?: Platform;
    userId?: string;
    data?: unknown;
}

/**
 * In-memory store backend implementation
 * For production, replace with RAGMemoryStore integration
 */
export class InMemoryStoreBackend implements MemoryStoreBackend {
    private memories = new Map<string, MemoryEntry>();
    private idCounter = 0;

    async add(
        entry: Omit<MemoryEntry, 'id' | 'accessCount' | 'lastAccessed' | 'created'>
    ): Promise<MemoryEntry> {
        const id = `mem_${++this.idCounter}_${Date.now()}`;
        const now = new Date();

        const fullEntry: MemoryEntry = {
            ...entry,
            id,
            accessCount: 0,
            lastAccessed: now,
            created: now,
        };

        this.memories.set(id, fullEntry);
        return fullEntry;
    }

    async get(id: string): Promise<MemoryEntry | null> {
        const entry = this.memories.get(id);
        if (entry) {
            entry.accessCount++;
            entry.lastAccessed = new Date();
        }
        return entry || null;
    }

    async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
        const results: MemorySearchResult[] = [];
        const queryTerms = query.query.toLowerCase().split(/\s+/);

        for (const entry of this.memories.values()) {
            // Apply filters
            if (query.types && !query.types.includes(entry.type)) continue;
            if (query.userId && entry.userId !== query.userId) continue;
            if (query.conversationId && entry.conversationId !== query.conversationId) continue;
            if (query.platform && entry.platform !== query.platform) continue;
            if (query.minImportance && entry.importance < query.minImportance) continue;
            if (!query.includeExpired && entry.expiry && entry.expiry < new Date()) continue;

            // Calculate relevance
            const contentLower = entry.content.toLowerCase();
            const matchedTerms = queryTerms.filter((term) => contentLower.includes(term));

            if (matchedTerms.length > 0) {
                const relevance = matchedTerms.length / queryTerms.length;
                results.push({ entry, relevance, matchedTerms });
            }
        }

        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);

        // Apply limit
        if (query.limit) {
            return results.slice(0, query.limit);
        }

        return results;
    }

    async update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry> {
        const entry = this.memories.get(id);
        if (!entry) {
            throw new Error(`Memory not found: ${id}`);
        }

        Object.assign(entry, updates);
        return entry;
    }

    async delete(id: string): Promise<boolean> {
        return this.memories.delete(id);
    }

    async getForUser(userId: string, limit = 50): Promise<MemoryEntry[]> {
        const results: MemoryEntry[] = [];

        for (const entry of this.memories.values()) {
            if (entry.userId === userId) {
                results.push(entry);
            }
        }

        return results
            .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
            .slice(0, limit);
    }

    async getForConversation(conversationId: string, limit = 50): Promise<MemoryEntry[]> {
        const results: MemoryEntry[] = [];

        for (const entry of this.memories.values()) {
            if (entry.conversationId === conversationId) {
                results.push(entry);
            }
        }

        return results
            .sort((a, b) => b.created.getTime() - a.created.getTime())
            .slice(0, limit);
    }

    async clearExpired(): Promise<number> {
        const now = new Date();
        let cleared = 0;

        for (const [id, entry] of this.memories) {
            if (entry.expiry && entry.expiry < now) {
                this.memories.delete(id);
                cleared++;
            }
        }

        return cleared;
    }
}

/**
 * Shared Memory Manager
 */
export class SharedMemoryManager extends EventEmitter {
    private backend: MemoryStoreBackend;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private debug: boolean;

    constructor(
        backend?: MemoryStoreBackend,
        options: { debug?: boolean; cleanupIntervalMs?: number } = {}
    ) {
        super();
        this.backend = backend || new InMemoryStoreBackend();
        this.debug = options.debug ?? false;

        if (options.cleanupIntervalMs) {
            this.startCleanupInterval(options.cleanupIntervalMs);
        }
    }

    /**
     * Store a memory
     */
    async remember(
        type: MemoryType,
        content: string,
        options: {
            userId?: string;
            conversationId?: string;
            platform?: Platform;
            importance?: number;
            valence?: number;
            expiry?: Date;
            metadata?: Record<string, unknown>;
        } = {}
    ): Promise<MemoryEntry> {
        this.log(`Remembering: "${content.substring(0, 50)}..." (${type})`);

        const entry = await this.backend.add({
            type,
            content,
            userId: options.userId,
            conversationId: options.conversationId,
            platform: options.platform,
            importance: options.importance ?? 0.5,
            valence: options.valence,
            expiry: options.expiry,
            metadata: options.metadata,
        });

        this.emitEvent({
            type: MemoryEventType.MEMORY_ADDED,
            memoryId: entry.id,
            entry,
            platform: options.platform,
            userId: options.userId,
        });

        return entry;
    }

    /**
     * Recall memories by query
     */
    async recall(query: MemoryQuery): Promise<MemorySearchResult[]> {
        this.log(`Recalling: "${query.query}"`);

        const results = await this.backend.search(query);

        this.emitEvent({
            type: MemoryEventType.MEMORY_RECALLED,
            data: { query: query.query, resultCount: results.length },
        });

        return results;
    }

    /**
     * Get specific memory
     */
    async get(id: string): Promise<MemoryEntry | null> {
        const entry = await this.backend.get(id);

        if (entry) {
            this.emitEvent({
                type: MemoryEventType.MEMORY_ACCESSED,
                memoryId: id,
                entry,
            });
        }

        return entry;
    }

    /**
     * Update memory importance
     */
    async reinforce(id: string, importanceBoost: number): Promise<MemoryEntry> {
        const entry = await this.backend.get(id);
        if (!entry) {
            throw new Error(`Memory not found: ${id}`);
        }

        const newImportance = Math.min(1, entry.importance + importanceBoost);
        const updated = await this.backend.update(id, { importance: newImportance });

        this.emitEvent({
            type: MemoryEventType.MEMORY_UPDATED,
            memoryId: id,
            entry: updated,
        });

        return updated;
    }

    /**
     * Forget a memory
     */
    async forget(id: string): Promise<boolean> {
        const deleted = await this.backend.delete(id);

        if (deleted) {
            this.emitEvent({
                type: MemoryEventType.MEMORY_DELETED,
                memoryId: id,
            });
        }

        return deleted;
    }

    /**
     * Get memories for a user across all platforms
     */
    async getUserMemories(userId: string, limit?: number): Promise<MemoryEntry[]> {
        return this.backend.getForUser(userId, limit);
    }

    /**
     * Get memories for a conversation
     */
    async getConversationMemories(
        conversationId: string,
        limit?: number
    ): Promise<MemoryEntry[]> {
        return this.backend.getForConversation(conversationId, limit);
    }

    /**
     * Store user preference
     */
    async setPreference(
        userId: string,
        key: string,
        value: string,
        platform?: Platform
    ): Promise<MemoryEntry> {
        return this.remember(MemoryType.PREFERENCE, `${key}: ${value}`, {
            userId,
            platform,
            importance: 0.7,
            metadata: { key, value },
        });
    }

    /**
     * Store fact about user
     */
    async storeFact(
        userId: string,
        fact: string,
        importance = 0.6,
        platform?: Platform
    ): Promise<MemoryEntry> {
        return this.remember(MemoryType.FACT, fact, {
            userId,
            platform,
            importance,
        });
    }

    /**
     * Store relationship information
     */
    async storeRelationship(
        userId: string,
        relationship: string,
        valence: number,
        platform?: Platform
    ): Promise<MemoryEntry> {
        return this.remember(MemoryType.RELATIONSHIP, relationship, {
            userId,
            platform,
            importance: 0.8,
            valence,
        });
    }

    /**
     * Get context for a user interaction
     */
    async getInteractionContext(
        userId: string,
        conversationId?: string,
        limit = 20
    ): Promise<{
        userMemories: MemoryEntry[];
        conversationMemories: MemoryEntry[];
        relevantFacts: MemoryEntry[];
    }> {
        const userMemories = await this.backend.getForUser(userId, limit);

        const conversationMemories = conversationId
            ? await this.backend.getForConversation(conversationId, limit)
            : [];

        const relevantFacts = userMemories.filter(
            (m) => m.type === MemoryType.FACT || m.type === MemoryType.PREFERENCE
        );

        return {
            userMemories,
            conversationMemories,
            relevantFacts,
        };
    }

    /**
     * Start cleanup interval
     */
    private startCleanupInterval(intervalMs: number): void {
        this.cleanupInterval = setInterval(async () => {
            const cleared = await this.backend.clearExpired();
            if (cleared > 0) {
                this.emitEvent({
                    type: MemoryEventType.CLEANUP_COMPLETED,
                    data: { clearedCount: cleared },
                });
            }
        }, intervalMs);
    }

    /**
     * Emit memory event
     */
    private emitEvent(event: MemoryEvent): void {
        this.emit('memory_event', event);
        this.emit(event.type, event);
    }

    /**
     * Cleanup
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    private log(message: string): void {
        if (this.debug) {
            console.log(`[Shared Memory] ${message}`);
        }
    }
}

/**
 * Create shared memory manager
 */
export function createSharedMemoryManager(
    backend?: MemoryStoreBackend,
    options?: { debug?: boolean; cleanupIntervalMs?: number }
): SharedMemoryManager {
    return new SharedMemoryManager(backend, options);
}

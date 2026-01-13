import { getLogger } from '../../../../shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'

const log = getLogger('render/components/DeepTreeEchoBot/RAGMemoryStore')

/**
 * Structure for a conversation memory
 */
export interface Memory {
  id: string
  timestamp: number
  chatId: number
  messageId: number
  sender: 'user' | 'bot'
  text: string
  embedding?: number[] // Vector embedding for semantic search
}

/**
 * Structure for a reflection memory
 */
export interface ReflectionMemory {
  id: string
  timestamp: number
  content: string
  type: 'periodic' | 'focused'
  aspect?: string // For focused reflections
}

/**
 * RAGMemoryStore manages conversation memories using a Retrieval Augmented Generation approach
 * It stores message history, generates embeddings, and retrieves relevant context
 */
export class RAGMemoryStore {
  private static instance: RAGMemoryStore
  private memories: Memory[] = []
  private reflections: ReflectionMemory[] = []
  private enabled: boolean = false

  private constructor() {
    this.loadMemories()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RAGMemoryStore {
    if (!RAGMemoryStore.instance) {
      RAGMemoryStore.instance = new RAGMemoryStore()
    }
    return RAGMemoryStore.instance
  }

  /**
   * Enable or disable the memory storage
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
    log.info(`Memory system ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Check if memory system is enabled
   */
  public isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Load memories from persistent storage
   */
  private async loadMemories(): Promise<void> {
    try {
      const desktopSettings = await runtime.getDesktopSettings()

      // Load conversation memories
      if (desktopSettings.deepTreeEchoBotMemories) {
        try {
          this.memories = JSON.parse(desktopSettings.deepTreeEchoBotMemories)
          log.info(`Loaded ${this.memories.length} conversation memories`)
        } catch (error) {
          log.error('Failed to parse conversation memories:', error)
          this.memories = []
        }
      }

      // Load reflection memories
      if (desktopSettings.deepTreeEchoBotReflections) {
        try {
          this.reflections = JSON.parse(
            desktopSettings.deepTreeEchoBotReflections
          )
          log.info(`Loaded ${this.reflections.length} reflection memories`)
        } catch (error) {
          log.error('Failed to parse reflection memories:', error)
          this.reflections = []
        }
      }

      // Load memory enabled setting
      this.enabled = desktopSettings.deepTreeEchoBotMemoryEnabled || false
    } catch (error) {
      log.error('Failed to load memories:', error)
      this.memories = []
      this.reflections = []
    }
  }

  /**
   * Save memories to persistent storage
   */
  private async saveMemories(): Promise<void> {
    try {
      // Save conversation memories - limit to last 1000 to prevent excessive storage
      const trimmedMemories = this.memories.slice(-1000)
      await runtime.setDesktopSetting(
        'deepTreeEchoBotMemories',
        JSON.stringify(trimmedMemories)
      )

      // Save reflection memories - limit to last 100
      const trimmedReflections = this.reflections.slice(-100)
      await runtime.setDesktopSetting(
        'deepTreeEchoBotReflections',
        JSON.stringify(trimmedReflections)
      )

      log.info('Saved memories to persistent storage')
    } catch (error) {
      log.error('Failed to save memories:', error)
    }
  }

  /**
   * Store a new memory
   */
  public async storeMemory(
    memory: Omit<Memory, 'id' | 'timestamp' | 'embedding'>
  ): Promise<void> {
    if (!this.enabled) return

    try {
      const newMemory: Memory = {
        ...memory,
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        embedding: [], // In a real implementation, this would be generated
      }

      this.memories.push(newMemory)
      await this.saveMemories()

      log.info(`Stored new memory: ${newMemory.id}`)
    } catch (error) {
      log.error('Failed to store memory:', error)
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
    if (!this.enabled) return

    try {
      const reflection: ReflectionMemory = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        content,
        type,
        aspect,
      }

      this.reflections.push(reflection)
      await this.saveMemories()

      log.info(`Stored new ${type} reflection${aspect ? ` on ${aspect}` : ''}`)
    } catch (error) {
      log.error('Failed to store reflection:', error)
    }
  }

  /**
   * Retrieve all memories for a specific chat
   */
  public getMemoriesByChat(chatId: number): Memory[] {
    return this.memories
      .filter(mem => mem.chatId === chatId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Retrieve recent memories across all chats, ordered by timestamp
   */
  public retrieveRecentMemories(count: number = 10): string[] {
    return this.memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
      .map(
        mem =>
          `[${new Date(mem.timestamp).toLocaleString()}] ${mem.sender}: ${
            mem.text
          }`
      )
  }

  /**
   * Retrieve recent reflections, ordered by timestamp
   */
  public getRecentReflections(count: number = 5): ReflectionMemory[] {
    return this.reflections
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
  }

  /**
   * Clear all memories
   */
  public async clearAllMemories(): Promise<void> {
    this.memories = []
    await this.saveMemories()
    log.info('Cleared all conversation memories')
  }

  /**
   * Clear memories for a specific chat
   */
  public async clearChatMemories(chatId: number): Promise<void> {
    this.memories = this.memories.filter(mem => mem.chatId !== chatId)
    await this.saveMemories()
    log.info(`Cleared memories for chat ${chatId}`)
  }

  /**
   * Search memories using semantic search (simplified implementation)
   * In a real implementation, this would use vector similarity search
   */
  public searchMemories(query: string, limit: number = 5): Memory[] {
    // Simple keyword-based search as a placeholder
    // In a real implementation, this would use vector embeddings and similarity search
    const normalizedQuery = query.toLowerCase()

    return this.memories
      .filter(mem => mem.text.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get conversation context for a specific chat
   */
  public getConversationContext(
    chatId: number,
    messageLimit: number = 10
  ): Memory[] {
    return this.memories
      .filter(mem => mem.chatId === chatId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, messageLimit)
      .sort((a, b) => a.timestamp - b.timestamp)
  }
}

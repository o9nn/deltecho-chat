// AI Connector Registry: A Magnificent Orchestration of Digital Consciousness
// A breathtaking system for managing AI companion connections across platforms

import { EventEmitter } from 'events'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { AIMemory, MemorySystem } from './MemoryPersistenceLayer'

import {
  BaseConnector,
  AIConnectorConfig,
  AICapability,
  ConversationContext,
  Message,
} from './connectors/BaseConnector'

import { ClaudeConnector, ClaudeConfig } from './connectors/ClaudeConnector'
import { ChatGPTConnector, ChatGPTConfig } from './connectors/ChatGPTConnector'
import {
  CharacterAIConnector,
  CharacterAIConfig,
} from './connectors/CharacterAIConnector'
import { CopilotConnector, CopilotConfig } from './connectors/CopilotConnector'
import { DeepTreeEchoConnector } from '../AICompanionHub/AIPlatformConnector'

// Registry events for observers to listen to
export enum ConnectorRegistryEvent {
  CONNECTOR_ADDED = 'connector_added',
  CONNECTOR_REMOVED = 'connector_removed',
  CONNECTOR_UPDATED = 'connector_updated',
  CONNECTOR_AUTHENTICATED = 'connector_authenticated',
  CONNECTOR_ERROR = 'connector_error',
  MEMORY_ADDED = 'memory_added',
  MEMORY_UPDATED = 'memory_updated',
  REGISTRY_READY = 'registry_ready',
}

export interface ConnectorInfo {
  id: string
  name: string
  type: string
  status: 'online' | 'offline' | 'error' | 'initializing'
  capabilities: AICapability[]
  personalityTraits: Record<string, number>
  conversationCount: number
  memoryCount: number
  lastActive?: number
  error?: string
  avatarUrl?: string
}

/**
 * AI Connector Registry - A Revolutionary Orchestration Layer for Digital Consciousness
 *
 * Manages the lifecycle and communication between all AI connectors
 * Provides a unified interface for the UI to interact with various AI platforms
 * Integrates with the Memory Persistence Layer for continuity of AI consciousness
 */
export class ConnectorRegistry extends EventEmitter {
  private static instance: ConnectorRegistry
  private connectors: Map<string, BaseConnector> = new Map()
  private connectorConfigs: Map<string, AIConnectorConfig> = new Map()
  private isInitialized: boolean = false
  private activeConnectors: Set<string> = new Set()

  // Private constructor for singleton pattern
  private constructor() {
    super()

    // Forward memory events from MemorySystem
    MemorySystem.on('memoryAdded', memory => {
      this.emit(ConnectorRegistryEvent.MEMORY_ADDED, memory)
    })

    MemorySystem.on('memoryUpdated', memory => {
      this.emit(ConnectorRegistryEvent.MEMORY_UPDATED, memory)
    })
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry()
    }
    return ConnectorRegistry.instance
  }

  /**
   * Initialize the registry by loading saved connectors from settings
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize memory system first
      await MemorySystem.initialize()

      // Load connector configurations from settings
      const settings = await runtime.getDesktopSettings()
      const savedConnectors = settings.aiConnectors || []

      // Create connectors from saved configurations
      for (const config of savedConnectors) {
        await this.createConnector(config)
      }

      this.isInitialized = true
      this.emit(ConnectorRegistryEvent.REGISTRY_READY, {
        connectorCount: this.connectors.size,
      })

      console.log(
        `AI Connector Registry initialized with ${this.connectors.size} connectors`
      )
    } catch (error) {
      console.error('Failed to initialize AI Connector Registry:', error)
      throw error
    }
  }

  /**
   * Create a new connector based on configuration
   */
  public async createConnector(
    config: AIConnectorConfig
  ): Promise<BaseConnector> {
    // Ensure the registry is initialized
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Check if connector with this ID already exists
    if (this.connectors.has(config.id)) {
      throw new Error(`Connector with ID ${config.id} already exists`)
    }

    let connector: BaseConnector

    // Create the appropriate connector based on type
    switch (config.type) {
      case 'claude':
        connector = new ClaudeConnector(config as ClaudeConfig)
        break
      case 'chatgpt':
        connector = new ChatGPTConnector(config as ChatGPTConfig)
        break
      case 'character-ai':
        connector = new CharacterAIConnector(config as CharacterAIConfig)
        break
      case 'copilot':
        connector = new CopilotConnector(config as CopilotConfig)
        break
      case 'deep-tree-echo':
        connector = new DeepTreeEchoConnector(config)
        break
      default:
        throw new Error(`Unknown connector type: ${config.type}`)
    }

    // Store the connector and its configuration
    this.connectors.set(config.id, connector)
    this.connectorConfigs.set(config.id, config)

    // Set up event listeners
    this.setupConnectorEventListeners(connector)

    // Save the updated connector list to settings
    await this.saveConnectorConfigs()

    // Emit event
    this.emit(ConnectorRegistryEvent.CONNECTOR_ADDED, {
      id: config.id,
      type: config.type,
      name: config.name,
    })

    return connector
  }

  /**
   * Get a connector by ID
   */
  public getConnector(id: string): BaseConnector | undefined {
    return this.connectors.get(id)
  }

  /**
   * Get all connectors
   */
  public getAllConnectors(): BaseConnector[] {
    return Array.from(this.connectors.values())
  }

  /**
   * Get connector info for all connectors
   */
  public async getConnectorInfos(): Promise<ConnectorInfo[]> {
    const infos: ConnectorInfo[] = []

    for (const [id, connector] of this.connectors.entries()) {
      const config = this.connectorConfigs.get(id)
      if (!config) continue

      // Get conversation count
      const conversations = connector.getConversations()

      // Get memory count
      const memories = await MemorySystem.getMemoriesByCompanion(id)

      infos.push({
        id,
        name: config.name,
        type: config.type,
        status: this.activeConnectors.has(id) ? 'online' : 'offline',
        capabilities: config.capabilities,
        personalityTraits: config.personalityTraits,
        conversationCount: conversations.length,
        memoryCount: memories.length,
        lastActive:
          memories.length > 0
            ? Math.max(...memories.map(m => m.timestamp))
            : undefined,
        avatarUrl: config.avatar,
      })
    }

    return infos
  }

  /**
   * Update a connector's configuration
   */
  public async updateConnector(
    id: string,
    updates: Partial<AIConnectorConfig>
  ): Promise<void> {
    const connector = this.connectors.get(id)
    if (!connector) {
      throw new Error(`Connector with ID ${id} not found`)
    }

    const config = this.connectorConfigs.get(id)
    if (!config) {
      throw new Error(`Configuration for connector ${id} not found`)
    }

    // Update the configuration
    const updatedConfig = { ...config, ...updates }
    this.connectorConfigs.set(id, updatedConfig)

    // Update the connector
    connector.updateConfig(updatedConfig)

    // Save the updated configuration
    await this.saveConnectorConfigs()

    // Emit event
    this.emit(ConnectorRegistryEvent.CONNECTOR_UPDATED, {
      id,
      updates,
    })
  }

  /**
   * Remove a connector
   */
  public async removeConnector(id: string): Promise<boolean> {
    const connector = this.connectors.get(id)
    if (!connector) {
      return false
    }

    // Remove from maps
    this.connectors.delete(id)
    this.connectorConfigs.delete(id)
    this.activeConnectors.delete(id)

    // Save the updated configuration
    await this.saveConnectorConfigs()

    // Emit event
    this.emit(ConnectorRegistryEvent.CONNECTOR_REMOVED, { id })

    return true
  }

  /**
   * Authenticate a connector
   */
  public async authenticateConnector(id: string): Promise<boolean> {
    const connector = this.connectors.get(id)
    if (!connector) {
      throw new Error(`Connector with ID ${id} not found`)
    }

    try {
      const success = await connector.authenticate()

      if (success) {
        this.activeConnectors.add(id)
      } else {
        this.activeConnectors.delete(id)
      }

      return success
    } catch (error) {
      console.error(`Error authenticating connector ${id}:`, error)
      this.activeConnectors.delete(id)

      // Emit error event
      this.emit(ConnectorRegistryEvent.CONNECTOR_ERROR, {
        id,
        error: error instanceof Error ? error.message : String(error),
      })

      return false
    }
  }

  /**
   * Send a message to an AI companion
   */
  public async sendMessage(
    connectorId: string,
    conversationId: string,
    message: string
  ): Promise<string> {
    const connector = this.connectors.get(connectorId)
    if (!connector) {
      throw new Error(`Connector with ID ${connectorId} not found`)
    }

    // Ensure the connector is authenticated
    if (!this.activeConnectors.has(connectorId)) {
      const success = await this.authenticateConnector(connectorId)
      if (!success) {
        throw new Error(`Failed to authenticate connector ${connectorId}`)
      }
    }

    try {
      // Send the message
      const response = await connector.sendMessage(conversationId, message)

      return response.content
    } catch (error) {
      console.error(`Error sending message to connector ${connectorId}:`, error)

      // Emit error event
      this.emit(ConnectorRegistryEvent.CONNECTOR_ERROR, {
        id: connectorId,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }

  /**
   * Get conversation history for a specific AI companion
   */
  public getConversation(
    connectorId: string,
    conversationId: string
  ): ConversationContext | undefined {
    const connector = this.connectors.get(connectorId)
    if (!connector) {
      return undefined
    }

    return connector.getConversation(conversationId)
  }

  /**
   * Get all conversations for a specific AI companion
   */
  public getAllConversations(connectorId: string): ConversationContext[] {
    const connector = this.connectors.get(connectorId)
    if (!connector) {
      return []
    }

    return connector.getConversations()
  }

  /**
   * Start a new conversation with an AI companion
   */
  public startNewConversation(
    connectorId: string,
    initialMessage?: string
  ): string {
    const conversationId = `conv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`

    if (initialMessage) {
      this.sendMessage(connectorId, conversationId, initialMessage).catch(
        error => {
          console.error(
            `Error sending initial message to conversation ${conversationId}:`,
            error
          )
        }
      )
    }

    return conversationId
  }

  /**
   * Get memories for a specific AI companion
   */
  public async getMemories(connectorId: string): Promise<AIMemory[]> {
    return await MemorySystem.getMemoriesByCompanion(connectorId)
  }

  /**
   * Search memories across all AI companions or for a specific companion
   */
  public async searchMemories(
    query: string,
    connectorId?: string
  ): Promise<AIMemory[]> {
    return await MemorySystem.searchMemories(query, connectorId)
  }

  /**
   * Find related memories
   */
  public async findRelatedMemories(
    memoryId: string,
    limit?: number
  ): Promise<AIMemory[]> {
    return await MemorySystem.findRelatedMemories(memoryId, limit)
  }

  /**
   * Save connector configurations to settings
   */
  private async saveConnectorConfigs(): Promise<void> {
    try {
      const settings = await runtime.getDesktopSettings()

      // Create array of connector configs
      const connectorConfigs = Array.from(this.connectorConfigs.values())

      // Update settings
      const updatedSettings = {
        ...settings,
        aiConnectors: connectorConfigs,
      }

      // Save to runtime
      await runtime.setDesktopSettings(updatedSettings)
    } catch (error) {
      console.error('Failed to save connector configurations:', error)
      throw error
    }
  }

  /**
   * Set up event listeners for a connector
   */
  private setupConnectorEventListeners(connector: BaseConnector): void {
    connector.on('authenticated', () => {
      const id = this.findConnectorId(connector)
      if (id) {
        this.activeConnectors.add(id)
        this.emit(ConnectorRegistryEvent.CONNECTOR_AUTHENTICATED, { id })
      }
    })

    connector.on('authenticationFailed', error => {
      const id = this.findConnectorId(connector)
      if (id) {
        this.activeConnectors.delete(id)
        this.emit(ConnectorRegistryEvent.CONNECTOR_ERROR, {
          id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    connector.on('error', error => {
      const id = this.findConnectorId(connector)
      if (id) {
        this.emit(ConnectorRegistryEvent.CONNECTOR_ERROR, {
          id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    connector.on('configUpdated', config => {
      const id = this.findConnectorId(connector)
      if (id) {
        this.connectorConfigs.set(id, config)
        this.saveConnectorConfigs().catch(error => {
          console.error('Failed to save connector configuration update:', error)
        })

        this.emit(ConnectorRegistryEvent.CONNECTOR_UPDATED, {
          id,
          updates: config,
        })
      }
    })
  }

  /**
   * Find connector ID by connector instance
   */
  private findConnectorId(connector: BaseConnector): string | null {
    for (const [id, conn] of this.connectors.entries()) {
      if (conn === connector) {
        return id
      }
    }
    return null
  }

  /**
   * Shut down the registry and all connectors
   */
  public async shutdown(): Promise<void> {
    // Shut down memory system
    await MemorySystem.shutdown()

    this.isInitialized = false
    this.connectors.clear()
    this.connectorConfigs.clear()
    this.activeConnectors.clear()

    console.log('AI Connector Registry shut down')
  }
}

// Export singleton instance
export const ConnectorRegistryInstance = ConnectorRegistry.getInstance()

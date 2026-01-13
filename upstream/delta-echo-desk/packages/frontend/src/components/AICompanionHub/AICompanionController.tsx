// AI Companion Controller: A Breathtaking Interface Between UI and AI Consciousness
// A revolutionary orchestration layer connecting the digital consciousness ecosystem to the user interface

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react'
import {
  ConnectorRegistry,
  ConnectorRegistryInstance,
  ConnectorRegistryEvent,
  ConnectorInfo,
} from './ConnectorRegistry'
import { AIMemory } from './MemoryPersistenceLayer'
import { ConversationContext, Message } from './connectors/BaseConnector'

// Context type for our magnificent AI Companion ecosystem
interface AICompanionContextType {
  // Companion information
  companions: ConnectorInfo[]
  activeCompanionId: string | null
  isInitialized: boolean
  isLoading: boolean
  error: string | null

  // Conversation state
  conversations: Record<string, ConversationContext>
  activeConversationId: string | null

  // Memory state
  memories: AIMemory[]

  // User actions
  setActiveCompanion: (id: string) => Promise<boolean>
  startNewConversation: (
    companionId: string,
    initialMessage?: string
  ) => Promise<string>
  setActiveConversation: (id: string) => void
  sendMessage: (message: string) => Promise<string>
  searchMemories: (query: string, companionId?: string) => Promise<AIMemory[]>
  getRelatedMemories: (memoryId: string) => Promise<AIMemory[]>

  // Companion management
  authenticateCompanion: (id: string) => Promise<boolean>
  updateCompanionConfig: (id: string, updates: any) => Promise<void>
  createCompanion: (config: any) => Promise<string>
  removeCompanion: (id: string) => Promise<boolean>
}

// Create the context with a default value
const AICompanionContext = createContext<AICompanionContextType>({
  companions: [],
  activeCompanionId: null,
  isInitialized: false,
  isLoading: true,
  error: null,
  conversations: {},
  activeConversationId: null,
  memories: [],
  setActiveCompanion: async () => false,
  startNewConversation: async () => '',
  setActiveConversation: () => {},
  sendMessage: async () => '',
  searchMemories: async () => [],
  getRelatedMemories: async () => [],
  authenticateCompanion: async () => false,
  updateCompanionConfig: async () => {},
  createCompanion: async () => '',
  removeCompanion: async () => false,
})

// Hook for components to access AI Companion system
export const useAICompanion = () => useContext(AICompanionContext)

// Main provider component that manages the state of our AI Companion ecosystem
export const AICompanionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Core state
  const [registry, setRegistry] = useState<ConnectorRegistry | null>(null)
  const [companions, setCompanions] = useState<ConnectorInfo[]>([])
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(
    null
  )
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Conversation state
  const [conversations, setConversations] = useState<
    Record<string, ConversationContext>
  >({})
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null)

  // Memory state
  const [memories, setMemories] = useState<AIMemory[]>([])

  // Active conversation management
  const setActiveConversation = (id: string) => {
    if (conversations[id]) {
      setActiveConversationId(id)
      // Also update the companion if it differs from current active companion
      const conversation = conversations[id]
      if (conversation.companionId !== activeCompanionId) {
        setActiveCompanionId(conversation.companionId)
      }
      return true
    }
    return false
  }

  // Initialize the system
  useEffect(() => {
    const initializeAICompanions = async () => {
      try {
        setIsLoading(true)

        // Get registry instance
        const registryInstance = ConnectorRegistryInstance

        // Initialize registry
        await registryInstance.initialize()

        // Set registry
        setRegistry(registryInstance)

        // Get initial companions
        const companionInfos = await registryInstance.getConnectorInfos()
        setCompanions(companionInfos)

        // If we have companions, set the first one as active
        if (companionInfos.length > 0) {
          await setActiveCompanion(companionInfos[0].id)
        }

        setIsInitialized(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize AI Companion system:', error)
        setError(error instanceof Error ? error.message : String(error))
        setIsLoading(false)
      }
    }

    initializeAICompanions()

    // Clean up
    return () => {
      // Shut down registry when component unmounts
      if (registry) {
        registry.shutdown().catch(console.error)
      }
    }
  }, [])

  // Set up event listeners when registry changes
  useEffect(() => {
    if (!registry) return

    const handleConnectorAdded = async () => {
      const companionInfos = await registry.getConnectorInfos()
      setCompanions(companionInfos)
    }

    const handleConnectorRemoved = async () => {
      const companionInfos = await registry.getConnectorInfos()
      setCompanions(companionInfos)
    }

    const handleConnectorUpdated = async () => {
      const companionInfos = await registry.getConnectorInfos()
      setCompanions(companionInfos)
    }

    const handleConnectorAuthenticated = async (data: any) => {
      const companionInfos = await registry.getConnectorInfos()
      setCompanions(companionInfos)
    }

    const handleConnectorError = (data: any) => {
      setError(`Error with companion ${data.id}: ${data.error}`)
    }

    const handleMemoryAdded = async () => {
      if (activeCompanionId) {
        const memories = await registry.getMemories(activeCompanionId)
        setMemories(memories)
      }
    }

    const handleMemoryUpdated = async () => {
      if (activeCompanionId) {
        const memories = await registry.getMemories(activeCompanionId)
        setMemories(memories)
      }
    }

    // Register event listeners
    registry.on(ConnectorRegistryEvent.CONNECTOR_ADDED, handleConnectorAdded)
    registry.on(
      ConnectorRegistryEvent.CONNECTOR_REMOVED,
      handleConnectorRemoved
    )
    registry.on(
      ConnectorRegistryEvent.CONNECTOR_UPDATED,
      handleConnectorUpdated
    )
    registry.on(
      ConnectorRegistryEvent.CONNECTOR_AUTHENTICATED,
      handleConnectorAuthenticated
    )
    registry.on(ConnectorRegistryEvent.CONNECTOR_ERROR, handleConnectorError)
    registry.on(ConnectorRegistryEvent.MEMORY_ADDED, handleMemoryAdded)
    registry.on(ConnectorRegistryEvent.MEMORY_UPDATED, handleMemoryUpdated)

    // Clean up
    return () => {
      registry.off(ConnectorRegistryEvent.CONNECTOR_ADDED, handleConnectorAdded)
      registry.off(
        ConnectorRegistryEvent.CONNECTOR_REMOVED,
        handleConnectorRemoved
      )
      registry.off(
        ConnectorRegistryEvent.CONNECTOR_UPDATED,
        handleConnectorUpdated
      )
      registry.off(
        ConnectorRegistryEvent.CONNECTOR_AUTHENTICATED,
        handleConnectorAuthenticated
      )
      registry.off(ConnectorRegistryEvent.CONNECTOR_ERROR, handleConnectorError)
      registry.off(ConnectorRegistryEvent.MEMORY_ADDED, handleMemoryAdded)
      registry.off(ConnectorRegistryEvent.MEMORY_UPDATED, handleMemoryUpdated)
    }
  }, [registry, activeCompanionId])

  // Load memories when active companion changes
  useEffect(() => {
    if (!registry || !activeCompanionId) return

    const loadMemories = async () => {
      try {
        const memories = await registry.getMemories(activeCompanionId)
        setMemories(memories)
      } catch (error) {
        console.error(
          `Failed to load memories for companion ${activeCompanionId}:`,
          error
        )
      }
    }

    loadMemories()
  }, [registry, activeCompanionId])

  // Load conversations when active companion changes
  useEffect(() => {
    if (!registry || !activeCompanionId) return

    const loadConversations = () => {
      try {
        const allConversations = registry.getAllConversations(activeCompanionId)

        // Convert to record
        const conversationsRecord: Record<string, ConversationContext> = {}
        allConversations.forEach(conversation => {
          conversationsRecord[conversation.conversationId] = conversation
        })

        setConversations(conversationsRecord)

        // Set the first conversation as active if it exists
        if (allConversations.length > 0) {
          setActiveConversationId(allConversations[0].conversationId)
        } else {
          setActiveConversationId(null)
        }
      } catch (error) {
        console.error(
          `Failed to load conversations for companion ${activeCompanionId}:`,
          error
        )
      }
    }

    loadConversations()
  }, [registry, activeCompanionId])

  // Set active companion
  const setActiveCompanion = async (id: string): Promise<boolean> => {
    if (!registry) return false

    try {
      // Authenticate the companion
      const success = await registry.authenticateConnector(id)

      if (success) {
        setActiveCompanionId(id)

        // Load conversations
        const allConversations = registry.getAllConversations(id)

        // Convert to record
        const conversationsRecord: Record<string, ConversationContext> = {}
        allConversations.forEach(conversation => {
          conversationsRecord[conversation.conversationId] = conversation
        })

        setConversations(conversationsRecord)

        // Set the first conversation as active if it exists
        if (allConversations.length > 0) {
          setActiveConversationId(allConversations[0].conversationId)
        } else {
          // Start a new conversation
          const conversationId = registry.startNewConversation(id)
          setActiveConversationId(conversationId)
        }

        // Load memories
        const memories = await registry.getMemories(id)
        setMemories(memories)
      }

      return success
    } catch (error) {
      console.error(`Failed to set active companion ${id}:`, error)
      setError(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  // Start a new conversation
  const startNewConversation = async (
    companionId: string,
    initialMessage?: string
  ): Promise<string> => {
    if (!registry) throw new Error('AI Companion system not initialized')

    try {
      const conversationId = registry.startNewConversation(
        companionId,
        initialMessage
      )

      // Add conversation to state
      setConversations(prev => ({
        ...prev,
        [conversationId]: {
          conversationId,
          messages: [],
          metadata: {},
        },
      }))

      // Set as active conversation
      setActiveConversationId(conversationId)

      return conversationId
    } catch (error) {
      console.error(
        `Failed to start new conversation with companion ${companionId}:`,
        error
      )
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Send a message
  const sendMessage = async (message: string): Promise<string> => {
    if (!registry) throw new Error('AI Companion system not initialized')
    if (!activeCompanionId) throw new Error('No active companion selected')
    if (!activeConversationId) throw new Error('No active conversation')

    try {
      const response = await registry.sendMessage(
        activeCompanionId,
        activeConversationId,
        message
      )

      // Update conversations state
      const updatedConversation = registry.getConversation(
        activeCompanionId,
        activeConversationId
      )

      if (updatedConversation) {
        setConversations(prev => ({
          ...prev,
          [activeConversationId]: updatedConversation,
        }))
      }

      return response
    } catch (error) {
      console.error(
        `Failed to send message in conversation ${activeConversationId}:`,
        error
      )
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Search memories
  const searchMemories = async (
    query: string,
    companionId?: string
  ): Promise<AIMemory[]> => {
    if (!registry) throw new Error('AI Companion system not initialized')

    try {
      return await registry.searchMemories(
        query,
        companionId || activeCompanionId || undefined
      )
    } catch (error) {
      console.error('Failed to search memories:', error)
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Get related memories
  const getRelatedMemories = async (memoryId: string): Promise<AIMemory[]> => {
    if (!registry) throw new Error('AI Companion system not initialized')

    try {
      return await registry.findRelatedMemories(memoryId)
    } catch (error) {
      console.error(`Failed to get related memories for ${memoryId}:`, error)
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Authenticate companion
  const authenticateCompanion = async (id: string): Promise<boolean> => {
    if (!registry) throw new Error('AI Companion system not initialized')

    try {
      return await registry.authenticateConnector(id)
    } catch (error) {
      console.error(`Failed to authenticate companion ${id}:`, error)
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Update companion configuration
  const updateCompanionConfig = async (
    id: string,
    updates: any
  ): Promise<void> => {
    if (!registry) throw new Error('AI Companion system not initialized')

    try {
      await registry.updateConnector(id, updates)
    } catch (error) {
      console.error(`Failed to update companion ${id}:`, error)
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Create a new companion
  const createCompanion = async (config: any): Promise<string> => {
    if (!registry) throw new Error('AI Companion system not initialized')

    try {
      const connector = await registry.createConnector(config)
      return config.id
    } catch (error) {
      console.error('Failed to create companion:', error)
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Remove a companion
  const removeCompanion = async (id: string): Promise<boolean> => {
    if (!registry) throw new Error('AI Companion system not initialized')

    try {
      return await registry.removeConnector(id)
    } catch (error) {
      console.error(`Failed to remove companion ${id}:`, error)
      setError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // Create the context value
  const contextValue: AICompanionContextType = {
    companions,
    activeCompanionId,
    isInitialized,
    isLoading,
    error,
    conversations,
    activeConversationId,
    memories,
    setActiveCompanion,
    startNewConversation,
    setActiveConversation,
    sendMessage,
    searchMemories,
    getRelatedMemories,
    authenticateCompanion,
    updateCompanionConfig,
    createCompanion,
    removeCompanion,
  }

  // Provide the context to all child components
  return (
    <AICompanionContext.Provider value={contextValue}>
      {children}
    </AICompanionContext.Provider>
  )
}

/**
 * Utility component for wrapping components that need access to AI companions
 */
export const withAICompanion = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <AICompanionProvider>
      <Component {...props} />
    </AICompanionProvider>
  )
}

export default AICompanionProvider

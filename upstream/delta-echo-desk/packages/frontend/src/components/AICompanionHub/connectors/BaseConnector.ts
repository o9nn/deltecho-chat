// Base AI Connector System
// A revolutionary foundation for AI platform integration

import { EventEmitter } from 'events'
import { AIMemory, MemorySystem, MemoryType } from '../MemoryPersistenceLayer'

export interface AIConnectorConfig {
  id: string
  name: string
  avatar?: string
  apiKey?: string
  apiEndpoint?: string
  modelName?: string
  maxContextTokens?: number
  temperatureRange?: [number, number] // [min, max]
  defaultTemperature?: number
  systemPrompt?: string
  memoriesPerRequest?: number
  capabilities: AICapability[]
  personalityTraits: Record<string, number> // trait -> value (0-1)
}

export enum AICapability {
  TEXT_GENERATION = 'text_generation',
  IMAGE_GENERATION = 'image_generation',
  CODE_GENERATION = 'code_generation',
  TEXT_TO_SPEECH = 'text_to_speech',
  SPEECH_TO_TEXT = 'speech_to_text',
  EMBEDDINGS = 'embeddings',
  FUNCTION_CALLING = 'function_calling',
  STRUCTURED_OUTPUT = 'structured_output',
  FINE_TUNING = 'fine_tuning',
  RETRIEVAL = 'retrieval',
}

export interface Message {
  id: string
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  timestamp: number
  name?: string // For function messages
  functionCall?: {
    name: string
    arguments: string
  }
}

export interface ConversationContext {
  conversationId: string
  title?: string
  messages: Message[]
  metadata?: Record<string, any>
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: Record<string, any> // JSON Schema object
}

export interface AIResponse {
  messageId: string
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call'
  functionCall?: {
    name: string
    arguments: string
  }
}

/**
 * Revolutionary BaseConnector that all AI platform connectors extend
 * Handles shared functionality like memory integration, token management, etc.
 */
export abstract class BaseConnector extends EventEmitter {
  protected config: AIConnectorConfig
  protected authenticated: boolean = false
  protected activeConversations: Map<string, ConversationContext> = new Map()
  private tokenUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    lastReset: number
  } = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    lastReset: Date.now(),
  }

  constructor(config: AIConnectorConfig) {
    super()
    this.config = config
  }

  /**
   * Each connector implements its own authentication method
   */
  abstract authenticate(): Promise<boolean>

  /**
   * Generate a response from the AI platform
   */
  abstract generateResponse(
    context: ConversationContext,
    functions?: FunctionDefinition[]
  ): Promise<AIResponse>

  /**
   * Generate embeddings for text (for semantic search)
   */
  abstract generateEmbeddings?(text: string): Promise<number[]>

  /**
   * Send a message and get a response
   */
  public async sendMessage(
    conversationId: string,
    message: string,
    functions?: FunctionDefinition[]
  ): Promise<AIResponse> {
    // Ensure authenticated
    if (!this.authenticated) {
      const success = await this.authenticate()
      if (!success)
        throw new Error(`Failed to authenticate ${this.config.name}`)
    }

    // Get or create conversation
    let context = this.activeConversations.get(conversationId)
    if (!context) {
      context = {
        conversationId,
        messages: [],
        metadata: {},
      }
      this.activeConversations.set(conversationId, context)
    }

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    context.messages.push(userMessage)

    // Get relevant memories for enhanced context
    const relevantMemories = await this.retrieveRelevantMemories(
      message,
      conversationId
    )

    // Add system message with memories if any
    if (relevantMemories.length > 0) {
      const memoryContent = this.formatMemoriesForPrompt(relevantMemories)
      const systemMemoryMessage: Message = {
        id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        role: 'system',
        content: memoryContent,
        timestamp: Date.now(),
      }
      context.messages.push(systemMemoryMessage)
    }

    // Get AI response
    const response = await this.generateResponse(context, functions)

    // Add assistant message
    const assistantMessage: Message = {
      id: response.messageId,
      role: 'assistant',
      content: response.content,
      timestamp: Date.now(),
      functionCall: response.functionCall,
    }
    context.messages.push(assistantMessage)

    // Store the message exchange in memory
    await this.storeInMemory(userMessage, assistantMessage, conversationId)

    // Update token usage stats
    if (response.usage) {
      this.tokenUsage.promptTokens += response.usage.promptTokens
      this.tokenUsage.completionTokens += response.usage.completionTokens
      this.tokenUsage.totalTokens += response.usage.totalTokens
    }

    // Emit events
    this.emit('messageSent', userMessage)
    this.emit('messageReceived', assistantMessage)

    return response
  }

  /**
   * Store the message exchange in memory
   */
  protected async storeInMemory(
    userMessage: Message,
    assistantMessage: Message,
    conversationId: string
  ): Promise<void> {
    // Extract topics through simplified approach
    // In a real implementation, use NLP for better topic extraction
    const content = `User: ${userMessage.content}\nAssistant: ${assistantMessage.content}`
    const allText = content.toLowerCase()

    // Simple topic extraction based on word frequency
    const commonWords = [
      'the',
      'and',
      'a',
      'to',
      'of',
      'in',
      'is',
      'that',
      'for',
    ]
    const words = allText
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))

    // Count word frequency
    const wordCount: Record<string, number> = {}
    words.forEach(word => {
      if (!wordCount[word]) wordCount[word] = 0
      wordCount[word]++
    })

    // Sort by frequency and take top 5 as topics
    const topics = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)

    // Create memory
    const memory: AIMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      companionId: this.config.id,
      timestamp: Date.now(),
      content,
      context: conversationId,
      topics,
      importance: 0.7, // Default importance
      relationships: {},
      emotionalTone: this.detectEmotionalTone(content),
    }

    // Store in memory system
    await MemorySystem.addMemory(memory)
  }

  /**
   * Retrieve relevant memories for context
   */
  protected async retrieveRelevantMemories(
    message: string,
    conversationId: string
  ): Promise<AIMemory[]> {
    // Search for relevant memories
    const searchResults = await MemorySystem.searchMemories(
      message,
      this.config.id
    )

    // Limit to configured number of memories per request
    return searchResults.slice(0, this.config.memoriesPerRequest || 3)
  }

  /**
   * Format memories for inclusion in the prompt
   */
  protected formatMemoriesForPrompt(memories: AIMemory[]): string {
    if (memories.length === 0) return ''

    let memoryPrompt = 'RELEVANT MEMORIES:\n\n'

    memories.forEach((memory, index) => {
      const timeAgo = this.getTimeAgo(memory.timestamp)
      memoryPrompt += `Memory ${index + 1} (${timeAgo}):\n${memory.content}\n\n`
    })

    memoryPrompt += 'Use these memories to inform your response if relevant.\n'

    return memoryPrompt
  }

  /**
   * Get human-readable time ago string
   */
  protected getTimeAgo(timestamp: number): string {
    const now = Date.now()
    const seconds = Math.floor((now - timestamp) / 1000)

    if (seconds < 60) return `${seconds} seconds ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minutes ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`

    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} days ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months} months ago`

    const years = Math.floor(months / 12)
    return `${years} years ago`
  }

  /**
   * Simple emotional tone detection
   */
  protected detectEmotionalTone(text: string): string {
    const lowerText = text.toLowerCase()

    // Simplified emotional detection
    // In a real implementation, use sentiment analysis
    const emotions = [
      {
        name: 'joy',
        keywords: ['happy', 'joy', 'excited', 'glad', 'wonderful', 'love'],
      },
      {
        name: 'sadness',
        keywords: ['sad', 'unhappy', 'disappointed', 'sorry', 'regret'],
      },
      {
        name: 'anger',
        keywords: ['angry', 'upset', 'annoyed', 'frustrated', 'mad'],
      },
      {
        name: 'fear',
        keywords: ['afraid', 'scared', 'worried', 'nervous', 'terrified'],
      },
      {
        name: 'surprise',
        keywords: ['surprised', 'amazed', 'astonished', 'shocked'],
      },
      { name: 'neutral', keywords: [] }, // Default
    ]

    // Count emotion keyword matches
    const emotionScores: Record<string, number> = {}
    emotions.forEach(emotion => {
      if (emotion.name === 'neutral') return

      emotionScores[emotion.name] = emotion.keywords.reduce(
        (score, keyword) => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
          const matches = (lowerText.match(regex) || []).length
          return score + matches
        },
        0
      )
    })

    // Find emotion with highest score
    const entries = Object.entries(emotionScores)
    if (entries.length === 0) return 'neutral'

    const highestEmotion = entries.reduce((highest, current) => {
      return current[1] > highest[1] ? current : highest
    })

    // Return neutral if no emotions detected
    return highestEmotion[1] > 0 ? highestEmotion[0] : 'neutral'
  }

  /**
   * Get token usage statistics
   */
  public getTokenUsage(): {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    lastReset: number
  } {
    return { ...this.tokenUsage }
  }

  /**
   * Reset token usage statistics
   */
  public resetTokenUsage(): void {
    this.tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      lastReset: Date.now(),
    }
    this.emit('tokenUsageReset')
  }

  /**
   * Get all conversations
   */
  public getConversations(): ConversationContext[] {
    return Array.from(this.activeConversations.values())
  }

  /**
   * Get a specific conversation
   */
  public getConversation(id: string): ConversationContext | undefined {
    return this.activeConversations.get(id)
  }

  /**
   * Clear a conversation
   */
  public clearConversation(id: string): boolean {
    return this.activeConversations.delete(id)
  }

  /**
   * Update connector configuration
   */
  public updateConfig(updates: Partial<AIConnectorConfig>): void {
    this.config = { ...this.config, ...updates }
    this.emit('configUpdated', this.config)
  }
}

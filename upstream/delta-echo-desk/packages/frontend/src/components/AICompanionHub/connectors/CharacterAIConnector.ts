// Character.AI Connector: An Exquisite Portal to Narrative Personas
// Creates a breathtaking bridge to the world of AI characters and roleplay

import {
  BaseConnector,
  AIConnectorConfig,
  AICapability,
  ConversationContext,
  AIResponse,
} from './BaseConnector'

// Character.AI-specific configuration options
export interface CharacterAIConfig extends AIConnectorConfig {
  characterId?: string
  characterName?: string
  universe?: string
  backstory?: string
  voiceId?: string
  visualStyle?: 'anime' | 'realistic' | 'stylized' | 'pixel' | 'painting'
  scenarioPrompts?: string[] // Scenario starter prompts
  characterRelationships?: Record<string, string> // Other character IDs and their relationships
  responseLength?: 'short' | 'medium' | 'long' // Desired response length
}

interface CharacterAIMessage {
  author: {
    author_id: string
    name: string
    is_human: boolean
  }
  text: string
}

interface CharacterAIResponse {
  status: string
  replies: CharacterAIMessage[]
  next_turn?: string
  character?: {
    participant_id: string
    name: string
    avatar_uri?: string
    definition?: {
      character_id: string
      name: string
      description: string
      greeting: string
      example_dialogs: string[]
    }
  }
}

/**
 * Character.AI Connector: A masterpiece of integration with Character.AI platform
 * Supports roleplaying, character-driven conversations, and narrative adventures
 */
export class CharacterAIConnector extends BaseConnector {
  private characterConfig: CharacterAIConfig
  private activeCharacterId: string | null = null
  private characterDefinitions: Map<string, any> = new Map()
  private authToken: string | null = null

  constructor(config: CharacterAIConfig) {
    // Set default values for Character.AI-specific configuration
    const defaultConfig: Partial<CharacterAIConfig> = {
      responseLength: 'medium',
      visualStyle: 'realistic',
      capabilities: [
        AICapability.TEXT_GENERATION,
        AICapability.STRUCTURED_OUTPUT,
      ],
      personalityTraits: {
        immersion: 0.95,
        consistency: 0.9,
        creativity: 0.95,
        adaptability: 0.85,
        empathy: 0.8,
      },
    }

    // Merge with provided config
    const mergedConfig = { ...defaultConfig, ...config } as CharacterAIConfig

    super(mergedConfig)
    this.characterConfig = mergedConfig

    // Set the active character ID if provided
    if (mergedConfig.characterId) {
      this.activeCharacterId = mergedConfig.characterId
    }
  }

  /**
   * Authenticate with Character.AI API
   */
  async authenticate(): Promise<boolean> {
    try {
      if (!this.characterConfig.apiKey) {
        throw new Error('Character.AI API key is required')
      }

      // Note: This is a simplified authentication flow
      // Character.AI's actual authentication is more complex
      // In a real implementation, you would handle their token system correctly

      const authResponse = await fetch(
        'https://beta.character.ai/chat/auth/login/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: this.characterConfig.apiKey,
          }),
        }
      )

      if (!authResponse.ok) {
        const errorData = await authResponse.json()
        throw new Error(
          `Character.AI authentication failed: ${
            errorData.error || authResponse.statusText
          }`
        )
      }

      const authData = await authResponse.json()
      this.authToken = authData.token

      this.authenticated = true
      this.emit('authenticated')

      // If we have a character ID, load its definition
      if (this.activeCharacterId) {
        await this.loadCharacterDefinition(this.activeCharacterId)
      }

      return true
    } catch (error) {
      console.error('Character.AI authentication error:', error)
      this.authenticated = false
      this.emit('authenticationFailed', error)
      return false
    }
  }

  /**
   * Load a character's definition from Character.AI
   */
  private async loadCharacterDefinition(characterId: string): Promise<any> {
    try {
      // If we already have this character definition cached, return it
      if (this.characterDefinitions.has(characterId)) {
        return this.characterDefinitions.get(characterId)
      }

      if (!this.authToken) {
        throw new Error(
          'Authentication required before loading character definitions'
        )
      }

      const response = await fetch(
        `https://beta.character.ai/chat/character/${characterId}/`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${this.authToken}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Failed to load character definition: ${
            errorData.error || response.statusText
          }`
        )
      }

      const characterData = await response.json()

      // Store the character definition for future use
      this.characterDefinitions.set(characterId, characterData.character)

      return characterData.character
    } catch (error) {
      console.error(
        `Error loading character definition for ${characterId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Set the active character
   */
  async setActiveCharacter(characterId: string): Promise<boolean> {
    try {
      // Load the character definition
      await this.loadCharacterDefinition(characterId)

      // Set as active
      this.activeCharacterId = characterId

      // Update config
      this.updateConfig({
        ...this.characterConfig,
        characterId,
      })

      // Emit event
      this.emit('characterChanged', characterId)

      return true
    } catch (error) {
      console.error(`Error setting active character to ${characterId}:`, error)
      return false
    }
  }

  /**
   * Get available characters
   */
  async getAvailableCharacters(): Promise<any[]> {
    try {
      if (!this.authToken) {
        await this.authenticate()
      }

      const response = await fetch(
        'https://beta.character.ai/chat/characters/',
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${this.authToken}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Failed to load available characters: ${
            errorData.error || response.statusText
          }`
        )
      }

      const data = await response.json()
      return data.characters
    } catch (error) {
      console.error('Error fetching available characters:', error)
      throw error
    }
  }

  /**
   * Start a new chat with a character
   */
  async startNewChat(
    characterId: string,
    initialMessage?: string
  ): Promise<string> {
    try {
      if (!this.authToken) {
        await this.authenticate()
      }

      // Load character definition if not already loaded
      if (!this.characterDefinitions.has(characterId)) {
        await this.loadCharacterDefinition(characterId)
      }

      // Create a new chat session
      const response = await fetch('https://beta.character.ai/chat/new_chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.authToken}`,
        },
        body: JSON.stringify({
          character_id: characterId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Failed to start new chat: ${errorData.error || response.statusText}`
        )
      }

      const chatData = await response.json()
      const chatId = chatData.chat_id

      // If an initial message was provided, send it
      if (initialMessage) {
        await this.sendMessage(chatId, initialMessage)
      }

      return chatId
    } catch (error) {
      console.error('Error starting new chat:', error)
      throw error
    }
  }

  /**
   * Format messages for Character.AI API
   */
  private formatCharacterMessages(context: ConversationContext): any {
    // Character.AI expects a specific format for conversation history
    // This is a simplified implementation

    const characterId = this.activeCharacterId
    if (!characterId) {
      throw new Error('No active character selected')
    }

    // Get character definition
    const characterDef = this.characterDefinitions.get(characterId)
    if (!characterDef) {
      throw new Error(`Character definition not found for ${characterId}`)
    }

    // Format the history
    const history: any[] = []
    let lastSpeaker = null

    for (const message of context.messages) {
      // Skip system messages as Character.AI doesn't use them directly
      if (message.role === 'system') continue

      // Character.AI only supports user and assistant messages
      if (message.role === 'user') {
        history.push({
          author: {
            author_id: 'user',
            name: 'User',
            is_human: true,
          },
          text: message.content,
        })
        lastSpeaker = 'user'
      } else if (message.role === 'assistant') {
        history.push({
          author: {
            author_id: characterId,
            name: characterDef.name,
            is_human: false,
          },
          text: message.content,
        })
        lastSpeaker = 'assistant'
      }
    }

    return {
      character_id: characterId,
      history,
      last_speaker: lastSpeaker,
      response_length: this.characterConfig.responseLength || 'medium',
    }
  }

  /**
   * Generate a response from Character.AI
   */
  async generateResponse(context: ConversationContext): Promise<AIResponse> {
    try {
      if (!this.authenticated || !this.authToken) {
        await this.authenticate()
      }

      if (!this.activeCharacterId) {
        throw new Error('No active character selected')
      }

      // Format the messages for Character.AI API
      const requestData = this.formatCharacterMessages(context)

      // Make the API request
      const response = await fetch('https://beta.character.ai/chat/response/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.authToken}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Character.AI API error: ${errorData.error || response.statusText}`
        )
      }

      // Parse the response
      const data = (await response.json()) as CharacterAIResponse

      // Extract the response
      const replyMessage = data.replies[0]

      // Format the AI response
      return {
        messageId: `char_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 7)}`,
        content: replyMessage.text,
        // Character.AI doesn't provide token usage info
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: 'stop',
      }
    } catch (error) {
      console.error('Character.AI response generation error:', error)
      throw error
    }
  }

  /**
   * Search for characters by query
   */
  async searchCharacters(query: string): Promise<any[]> {
    try {
      if (!this.authToken) {
        await this.authenticate()
      }

      const response = await fetch(
        `https://beta.character.ai/chat/characters/search/?query=${encodeURIComponent(
          query
        )}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${this.authToken}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Failed to search characters: ${
            errorData.error || response.statusText
          }`
        )
      }

      const data = await response.json()
      return data.characters
    } catch (error) {
      console.error('Error searching characters:', error)
      throw error
    }
  }

  /**
   * Create a custom character
   */
  async createCharacter(definition: {
    name: string
    description: string
    greeting: string
    example_dialogs: string[]
    avatar?: string // Base64 encoded image
    voice_id?: string
    visual_style?: string
  }): Promise<string> {
    try {
      if (!this.authToken) {
        await this.authenticate()
      }

      const response = await fetch(
        'https://beta.character.ai/chat/characters/create/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${this.authToken}`,
          },
          body: JSON.stringify(definition),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Failed to create character: ${
            errorData.error || response.statusText
          }`
        )
      }

      const data = await response.json()

      // Store the new character definition
      this.characterDefinitions.set(data.character_id, data.character)

      // Optionally set as active
      this.activeCharacterId = data.character_id

      return data.character_id
    } catch (error) {
      console.error('Error creating character:', error)
      throw error
    }
  }

  /**
   * Generate embeddings (not supported by Character.AI)
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    throw new Error('Embeddings not supported by Character.AI API')
  }
}

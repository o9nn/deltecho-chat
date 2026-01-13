import { getLogger } from '../../../shared/logger'

const log = getLogger('renderer/LLMService')

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequestParams {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
}

export interface LLMConfig {
  apiKey: string
  apiEndpoint: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export class LLMService {
  private static instance: LLMService
  private config: LLMConfig = {
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
  }

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService()
    }
    return LLMService.instance
  }

  public setConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public async generateResponse(
    messages: ChatMessage[],
    overrideConfig?: Partial<LLMConfig>
  ): Promise<string> {
    try {
      const config = { ...this.config, ...overrideConfig }

      if (!config.apiKey) {
        throw new Error('API Key is not configured')
      }

      const requestPayload: OpenAIRequestParams = {
        model: config.model || 'gpt-3.5-turbo',
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }

      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `API Error: ${response.status} - ${JSON.stringify(errorData)}`
        )
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      log.error('Error generating response from LLM:', error)
      throw error
    }
  }

  public async generateResponseWithContext(
    userInput: string,
    conversationHistory: string,
    systemPrompt: string
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ]

    // Add conversation history as context if available
    if (conversationHistory && conversationHistory.trim().length > 0) {
      messages.push({
        role: 'user',
        content: `Here is the recent conversation history for context:\n${conversationHistory}\n\nPlease keep this in mind when responding to my next message.`,
      })

      messages.push({
        role: 'assistant',
        content:
          "I'll keep this conversation context in mind when responding to your next message.",
      })
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: userInput,
    })

    return this.generateResponse(messages)
  }
}

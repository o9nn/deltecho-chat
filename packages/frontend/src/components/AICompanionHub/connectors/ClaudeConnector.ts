// Claude Connector: A Masterpiece of Constitutional AI Integration
// Connects to Anthropic's Claude for thoughtful, ethical AI conversations

import {
  BaseConnector,
  AIConnectorConfig,
  AICapability,
  ConversationContext,
  FunctionDefinition,
  AIResponse,
} from './BaseConnector'

// Claude-specific configuration options
export interface ClaudeConfig extends AIConnectorConfig {
  // Anthropic-specific parameters
  apiVersion?: string
  modelName:
    | 'claude-3-opus-20240229'
    | 'claude-3-sonnet-20240229'
    | 'claude-3-haiku-20240307'
    | 'claude-2.1'
    | 'claude-2.0'
    | 'claude-instant-1.2'
  maxTokens?: number
  topP?: number
  anthropicVersion?: string
  systemPrompt?: string
  constitutionalPrinciples?: string[]
}

interface ClaudeRequestMessage {
  role: 'user' | 'assistant' | 'system'
  content:
    | string
    | Array<{
        type: 'text' | 'image'
        text?: string
        source?: {
          type: 'base64'
          media_type: string
          data: string
        }
      }>
}

interface ClaudeCompletionRequest {
  model: string
  messages: ClaudeRequestMessage[]
  system?: string
  max_tokens?: number
  temperature?: number
  top_p?: number
  anthropic_version?: string
  stream?: boolean
}

interface ClaudeCompletionResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{
    type: 'text'
    text: string
  }>
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence'
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Claude Connector: Masterpiece of AI integration that connects to Anthropic's Claude API
 */
export class ClaudeConnector extends BaseConnector {
  private apiVersion: string
  private claudeConfig: ClaudeConfig

  constructor(config: ClaudeConfig) {
    // Set default values for Claude-specific configuration
    const defaultConfig: Partial<ClaudeConfig> = {
      apiVersion: '2023-06-01',
      modelName: 'claude-3-sonnet-20240229',
      maxTokens: 1024,
      defaultTemperature: 0.7,
      anthropicVersion: 'bedrock-2023-05-31',
      capabilities: [
        AICapability.TEXT_GENERATION,
        AICapability.CODE_GENERATION,
        AICapability.STRUCTURED_OUTPUT,
        AICapability.FUNCTION_CALLING,
      ],
      personalityTraits: {
        thoughtfulness: 0.9,
        creativity: 0.7,
        precision: 0.8,
        helpfulness: 0.9,
        ethics: 0.95,
      },
    }

    // Merge with provided config
    const mergedConfig = { ...defaultConfig, ...config } as ClaudeConfig

    super(mergedConfig)
    this.claudeConfig = mergedConfig
    this.apiVersion = mergedConfig.apiVersion || '2023-06-01'
  }

  /**
   * Authenticate with Anthropic API
   */
  async authenticate(): Promise<boolean> {
    try {
      if (!this.claudeConfig.apiKey) {
        throw new Error('Claude API key is required')
      }

      // Make a small test request to verify API key works
      const testResponse = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.claudeConfig.apiKey,
            'anthropic-version':
              this.claudeConfig.anthropicVersion || 'bedrock-2023-05-31',
          },
          body: JSON.stringify({
            model: this.claudeConfig.modelName,
            messages: [{ role: 'user', content: 'Hello, are you connected?' }],
            max_tokens: 10,
          }),
        }
      )

      if (!testResponse.ok) {
        const errorData = await testResponse.json()
        throw new Error(
          `Claude API authentication failed: ${
            errorData.error?.message || testResponse.statusText
          }`
        )
      }

      this.authenticated = true
      this.emit('authenticated')
      return true
    } catch (error) {
      console.error('Claude authentication error:', error)
      this.authenticated = false
      this.emit('authenticationFailed', error)
      return false
    }
  }

  /**
   * Format conversation context for Claude API
   */
  private formatClaudeMessages(
    context: ConversationContext
  ): ClaudeRequestMessage[] {
    // Filter out only the messages we want to send to Claude
    // Note: Claude has different conversation format requirements than some other models
    const messages: ClaudeRequestMessage[] = []

    // Handle system prompt if it exists
    if (this.claudeConfig.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.claudeConfig.systemPrompt,
      })
    }

    // Add conversation messages
    // Claude API requires alternating user/assistant messages
    // So we need to carefully format this conversation history
    let lastRole: 'user' | 'assistant' | null = null

    for (const msg of context.messages) {
      // Skip function messages as Claude doesn't support them directly
      if (msg.role === 'function') continue

      // Handle system messages properly
      if (msg.role === 'system') {
        messages.push({
          role: 'system',
          content: msg.content,
        })
        continue
      }

      // Ensure we have alternating user/assistant messages as required by Claude
      if (lastRole === msg.role) {
        // If we have consecutive messages of the same role, combine them
        const lastMessage = messages[messages.length - 1]
        if (typeof lastMessage.content === 'string') {
          lastMessage.content = `${lastMessage.content}\n\n${msg.content}`
        }
      } else {
        // Add as a new message
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
        lastRole = msg.role as 'user' | 'assistant'
      }
    }

    return messages
  }

  /**
   * Generate a response from Claude
   */
  async generateResponse(
    context: ConversationContext,
    functions?: FunctionDefinition[]
  ): Promise<AIResponse> {
    try {
      // Format the messages for Claude API
      const messages = this.formatClaudeMessages(context)

      // Prepare the request
      const requestBody: ClaudeCompletionRequest = {
        model: this.claudeConfig.modelName,
        messages,
        max_tokens: this.claudeConfig.maxTokens,
        temperature: this.claudeConfig.defaultTemperature,
        anthropic_version: this.claudeConfig.anthropicVersion,
      }

      // If we have a system prompt and it's not already in messages, add it
      if (
        this.claudeConfig.systemPrompt &&
        !messages.some(m => m.role === 'system')
      ) {
        requestBody.system = this.claudeConfig.systemPrompt
      }

      // If functions are provided, format them for Claude
      // Claude handles tool use differently than some other AIs
      if (functions && functions.length > 0) {
        // Add tool use instructions to system prompt
        const toolInstructions = this.formatToolInstructions(functions)
        if (requestBody.system) {
          requestBody.system += '\n\n' + toolInstructions
        } else {
          requestBody.system = toolInstructions
        }
      }

      // Make the API request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeConfig.apiKey || '',
          'anthropic-version':
            this.claudeConfig.anthropicVersion || 'bedrock-2023-05-31',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Claude API error: ${errorData.error?.message || response.statusText}`
        )
      }

      // Parse the response
      const data = (await response.json()) as ClaudeCompletionResponse

      // Extract the content from Claude's response format
      let content = ''
      if (data.content && Array.isArray(data.content)) {
        content = data.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n')
      }

      // Check for function calls in the response
      let functionCall = undefined

      // Claude doesn't have native function calling yet, so we parse from the text
      // This is a simplified implementation - in production, use a more robust approach
      if (content.includes('```json') && functions && functions.length > 0) {
        try {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
          if (jsonMatch && jsonMatch[1]) {
            const parsedJson = JSON.parse(jsonMatch[1])
            if (parsedJson.function && parsedJson.arguments) {
              functionCall = {
                name: parsedJson.function,
                arguments: JSON.stringify(parsedJson.arguments),
              }

              // Optionally remove the function call from the content
              content = content.replace(
                /```json\n[\s\S]*?\n```/,
                `[Function call: ${parsedJson.function}]`
              )
            }
          }
        } catch (e) {
          console.warn('Failed to parse potential function call:', e)
        }
      }

      // Format the AI response
      return {
        messageId: data.id,
        content,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
        functionCall,
      }
    } catch (error) {
      console.error('Claude response generation error:', error)
      throw error
    }
  }

  /**
   * Format tool/function instructions for Claude
   */
  private formatToolInstructions(functions: FunctionDefinition[]): string {
    // Claude has a different approach to tool use than some other models
    // Here we format the functions as instructions in the system prompt

    let instructions = `You have access to the following functions. When you need to use a function, output the function call as a JSON object inside a \`\`\`json code block, with 'function' and 'arguments' as top-level keys.
    
Available functions:
`

    // Add each function and its description
    functions.forEach(func => {
      instructions += `
- ${func.name}: ${func.description}
  Parameters: ${JSON.stringify(func.parameters, null, 2)}
`
    })

    instructions += `
Example function call:
\`\`\`json
{
  "function": "function_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
\`\`\`

Only use these functions when necessary. If you need to use a function, output ONLY the JSON function call inside a code block. After receiving the function result, you can continue the conversation normally.`

    return instructions
  }

  /**
   * Generate embeddings for text (for semantic search)
   * Note: Claude doesn't directly provide embeddings, so this is a placeholder
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    // Claude doesn't have a native embeddings API, so we'd need to use another service
    // This is just a placeholder implementation
    throw new Error('Embeddings not directly supported by Claude API')
  }
}

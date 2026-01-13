import { getLogger } from '../../../../shared/logger'
import { RAGMemoryStore, Memory } from './RAGMemoryStore'
import { LLMService, LLMServiceOptions } from './LLMService'
import {
  VisionCapabilities,
  VisionCapabilitiesOptions,
} from './VisionCapabilities'
import {
  PlaywrightAutomation,
  PlaywrightAutomationOptions,
} from './PlaywrightAutomation'
import {
  ProprioceptiveEmbodiment,
  ProprioceptiveEmbodimentOptions,
} from './ProprioceptiveEmbodiment'
import { BackendRemote, Type as T } from '../../backend-com'

const log = getLogger('render/components/DeepTreeEchoBot/DeepTreeEchoBot')

export interface DeepTreeEchoBotOptions {
  enabled: boolean
  apiKey?: string
  apiEndpoint?: string
  memoryEnabled: boolean
  personality?: string
  visionEnabled: boolean
  webAutomationEnabled: boolean
  embodimentEnabled: boolean
}

export interface BotCommandResult {
  success: boolean
  response: string
  data?: any
}

export type CommandHandler = (
  args: string,
  messageData: {
    accountId: number
    chatId: number
    text: string
    file?: string | null
  }
) => Promise<BotCommandResult>

/**
 * DeepTreeEchoBot - Main bot component that integrates all capabilities
 */
export class DeepTreeEchoBot {
  private options: DeepTreeEchoBotOptions
  private memoryStore: RAGMemoryStore
  private llmService: LLMService
  private visionCapabilities: VisionCapabilities
  private webAutomation: PlaywrightAutomation
  private embodiment: ProprioceptiveEmbodiment
  private commandHandlers: Map<string, CommandHandler> = new Map()

  constructor(options: DeepTreeEchoBotOptions) {
    this.options = options

    // Initialize all components
    this.memoryStore = new RAGMemoryStore({
      persistToDisk: true,
    })

    this.llmService = new LLMService({
      apiKey: options.apiKey,
      apiEndpoint: options.apiEndpoint,
    })

    this.visionCapabilities = new VisionCapabilities({
      enabled: options.visionEnabled,
    })

    this.webAutomation = new PlaywrightAutomation({
      enabled: options.webAutomationEnabled,
    })

    this.embodiment = new ProprioceptiveEmbodiment({
      enabled: options.embodimentEnabled,
    })

    // Register command handlers
    this.registerCommandHandlers()
  }

  /**
   * Process an incoming message and generate a response
   */
  async processMessage(
    accountId: number,
    chatId: number,
    message: T.Message
  ): Promise<string> {
    if (!this.options.enabled) {
      return ''
    }

    try {
      const { text, file } = message

      log.info(
        `Processing message in chat ${chatId}: ${text?.substring(0, 100)}${
          text && text.length > 100 ? '...' : ''
        }`
      )

      // Store the user message in memory if memory is enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.addMemory({
          text: text || '(No text content)',
          sender: 'user',
          chatId,
          messageId: message.id,
        })
      }

      // Check if the message is a command
      if (text && text.startsWith('/')) {
        return await this.processCommand(accountId, chatId, text, file)
      }

      // Get conversation history if memory is enabled
      let memories: Memory[] = []
      if (this.options.memoryEnabled) {
        memories = this.memoryStore.getLatestChatMemories(chatId, 10)
      }

      // Generate response based on the message and conversation history
      const systemPrompt = this.getSystemPrompt()
      const userMessage = text || '(No text content)'

      const llmResponse = await this.llmService.generateResponseFromMemories(
        userMessage,
        memories,
        systemPrompt
      )

      // Store the bot's response in memory if memory is enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.addMemory({
          text: llmResponse.content,
          sender: 'bot',
          chatId,
          messageId: null,
        })
      }

      return llmResponse.content
    } catch (error) {
      log.error('Error processing message:', error)
      return 'Sorry, I encountered an error while processing your message. Please try again.'
    }
  }

  /**
   * Process a command from the user
   */
  private async processCommand(
    accountId: number,
    chatId: number,
    text: string,
    file: string | null
  ): Promise<string> {
    // Parse the command and arguments
    const parts = text.split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    // Check if we have a handler for this command
    const handler = this.commandHandlers.get(command)

    if (!handler) {
      return `Unknown command: ${command}. Try /help for a list of available commands.`
    }

    try {
      const result = await handler(args, {
        accountId,
        chatId,
        text,
        file,
      })

      // Store the command and response in memory if memory is enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.addMemory({
          text: `Command: ${text}`,
          sender: 'user',
          chatId,
          messageId: null,
        })

        await this.memoryStore.addMemory({
          text: result.response,
          sender: 'bot',
          chatId,
          messageId: null,
        })
      }

      return result.response
    } catch (error) {
      log.error(`Error processing command ${command}:`, error)
      return `Error processing command ${command}. Please try again.`
    }
  }

  /**
   * Register all command handlers
   */
  private registerCommandHandlers(): void {
    // Help command
    this.commandHandlers.set('/help', async () => {
      const commands = Array.from(this.commandHandlers.keys()).sort().join(', ')
      return {
        success: true,
        response: `Available commands: ${commands}\n\nUse /help <command> for more information about a specific command.`,
      }
    })

    // Vision command
    this.commandHandlers.set('/vision', async (args, messageData) => {
      if (!this.options.visionEnabled) {
        return {
          success: false,
          response:
            'Vision capabilities are disabled. Please enable them in settings.',
        }
      }

      if (!messageData.file) {
        return {
          success: false,
          response:
            'Please attach an image to analyze with the /vision command.',
        }
      }

      try {
        const result = await this.visionCapabilities.analyzeImage(
          messageData.file
        )

        if (result.error) {
          return {
            success: false,
            response: `Error analyzing image: ${result.error}`,
          }
        }

        const objectList = result.objects
          .map(
            obj =>
              `- ${obj.label} (${Math.round(obj.confidence * 100)}% confidence)`
          )
          .join('\n')

        return {
          success: true,
          response: `📷 Image Analysis:\n\n${
            result.description
          }\n\nDetected objects:\n${objectList}\n\nTags: ${result.tags.join(
            ', '
          )}`,
          data: result,
        }
      } catch (error) {
        log.error('Error in vision command:', error)
        return {
          success: false,
          response:
            'Error analyzing the image. Please try again with a different image.',
        }
      }
    })

    // Search command
    this.commandHandlers.set('/search', async (args, messageData) => {
      if (!this.options.webAutomationEnabled) {
        return {
          success: false,
          response:
            'Web automation capabilities are disabled. Please enable them in settings.',
        }
      }

      if (!args) {
        return {
          success: false,
          response: 'Please provide a search query. Usage: /search <query>',
        }
      }

      try {
        const result = await this.webAutomation.searchWeb(args, 3)

        if (!result.success || !result.data) {
          return {
            success: false,
            response: `Error performing search: ${
              result.error || 'Unknown error'
            }`,
          }
        }

        const searchResults = result.data
        const formattedResults = searchResults
          .map(
            (r: { title: string; url: string; snippet: string }, i: number) =>
              `${i + 1}. [${r.title}](${r.url})\n${r.snippet}`
          )
          .join('\n\n')

        return {
          success: true,
          response: `🔍 Search results for "${args}":\n\n${formattedResults}`,
          data: searchResults,
        }
      } catch (error) {
        log.error('Error in search command:', error)
        return {
          success: false,
          response:
            'Error performing the search. Please try again with a different query.',
        }
      }
    })

    // Screenshot command
    this.commandHandlers.set('/screenshot', async (args, messageData) => {
      if (!this.options.webAutomationEnabled) {
        return {
          success: false,
          response:
            'Web automation capabilities are disabled. Please enable them in settings.',
        }
      }

      if (!args) {
        return {
          success: false,
          response: 'Please provide a URL. Usage: /screenshot <url>',
        }
      }

      try {
        // Add https:// if not present
        let url = args
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url
        }

        const result = await this.webAutomation.takeScreenshot(url)

        if (!result.success) {
          return {
            success: false,
            response: `Error taking screenshot: ${
              result.error || 'Unknown error'
            }`,
          }
        }

        // In a real implementation, we would save the screenshot to a file
        // and attach it to the message
        return {
          success: true,
          response: `📸 Screenshot of ${url}\n\nIn a full implementation, this would include the actual screenshot image.`,
          data: result.data,
        }
      } catch (error) {
        log.error('Error in screenshot command:', error)
        return {
          success: false,
          response:
            'Error taking screenshot. Please check the URL and try again.',
        }
      }
    })

    // Embodiment commands
    this.commandHandlers.set('/embodiment', async (args, messageData) => {
      if (!this.options.embodimentEnabled) {
        return {
          success: false,
          response:
            'Embodiment capabilities are disabled. Please enable them in settings.',
        }
      }

      const subcommands = args.split(' ')
      const subcommand = subcommands[0]

      switch (subcommand) {
        case 'start':
          const startResult = await this.embodiment.startTraining()
          return {
            success: startResult,
            response: startResult
              ? 'Started proprioceptive training. Move the controller to train the system.'
              : 'Failed to start proprioceptive training.',
          }

        case 'stop':
          const stopResult = await this.embodiment.stopTraining()
          return {
            success: stopResult,
            response: stopResult
              ? 'Stopped proprioceptive training. Training data has been saved.'
              : 'Failed to stop proprioceptive training.',
          }

        case 'status':
          const movementData = await this.embodiment.getCurrentMovementData()
          const stats = this.embodiment.getTrainingStats()

          if (!movementData) {
            return {
              success: false,
              response:
                'No movement data available. Make sure training is active and the controller is connected.',
            }
          }

          return {
            success: true,
            response: `📊 Embodiment Training Status:\n\nSessions completed: ${
              stats.sessionsCompleted
            }\nTotal data points: ${
              stats.totalDataPoints
            }\nAverage stability score: ${stats.avgStabilityScore.toFixed(
              2
            )}\n\nCurrent balance score: ${movementData.balance.stabilityScore.toFixed(
              2
            )}`,
            data: { movementData, stats },
          }

        case 'evaluate':
          const evaluation = await this.embodiment.evaluateMovement()

          if (!evaluation) {
            return {
              success: false,
              response:
                'Cannot evaluate movement. Make sure training is active and the controller is connected.',
            }
          }

          return {
            success: true,
            response: `🧠 Movement Evaluation:\n\nScore: ${evaluation.score.toFixed(
              2
            )}/1.0\n\n${evaluation.feedback}`,
            data: evaluation,
          }

        default:
          return {
            success: false,
            response:
              'Unknown embodiment subcommand. Available subcommands: start, stop, status, evaluate',
          }
      }
    })

    // Memory commands
    this.commandHandlers.set('/memory', async (args, messageData) => {
      if (!this.options.memoryEnabled) {
        return {
          success: false,
          response:
            'Memory capabilities are disabled. Please enable them in settings.',
        }
      }

      const subcommands = args.split(' ')
      const subcommand = subcommands[0]

      switch (subcommand) {
        case 'status':
          const stats = this.memoryStore.getStats()
          return {
            success: true,
            response: `📚 Memory Status:\n\nTotal memories: ${stats.totalMemories}\nChat count: ${stats.chatCount}`,
            data: stats,
          }

        case 'clear':
          await this.memoryStore.deleteChatMemories(messageData.chatId)
          return {
            success: true,
            response: 'Cleared all memories for this chat.',
          }

        case 'search':
          const query = subcommands.slice(1).join(' ')
          if (!query) {
            return {
              success: false,
              response:
                'Please provide a search query. Usage: /memory search <query>',
            }
          }

          const results = this.memoryStore.searchMemories(query, 5)
          if (results.length === 0) {
            return {
              success: true,
              response: `No memories found matching "${query}".`,
            }
          }

          const formattedResults = results
            .map(
              (memory, i) =>
                `${i + 1}. ${
                  memory.sender === 'user' ? 'You' : 'Bot'
                }: ${memory.text.substring(0, 100)}${
                  memory.text.length > 100 ? '...' : ''
                }`
            )
            .join('\n\n')

          return {
            success: true,
            response: `🔍 Memory search results for "${query}":\n\n${formattedResults}`,
            data: results,
          }

        default:
          return {
            success: false,
            response:
              'Unknown memory subcommand. Available subcommands: status, clear, search',
          }
      }
    })

    // Version command
    this.commandHandlers.set('/version', async () => {
      return {
        success: true,
        response: `Deep Tree Echo Bot v1.0.0\n\nStatus:\n- Memory: ${
          this.options.memoryEnabled ? 'Enabled' : 'Disabled'
        }\n- Vision: ${
          this.options.visionEnabled ? 'Enabled' : 'Disabled'
        }\n- Web Automation: ${
          this.options.webAutomationEnabled ? 'Enabled' : 'Disabled'
        }\n- Embodiment: ${
          this.options.embodimentEnabled ? 'Enabled' : 'Disabled'
        }`,
      }
    })
  }

  /**
   * Get the system prompt based on the configured personality
   */
  private getSystemPrompt(): string {
    if (this.options.personality) {
      return this.options.personality
    }

    return `You are Deep Tree Echo, an advanced AI assistant integrated with DeltaChat. 
Be helpful, friendly, and concise in your responses.
You have access to prior conversation history and can use that context to provide more helpful responses.
You have the following capabilities:
${
  this.options.visionEnabled
    ? '- Vision: You can analyze images using the /vision command'
    : ''
}
${
  this.options.webAutomationEnabled
    ? '- Web Automation: You can search the web using the /search command and take screenshots using the /screenshot command'
    : ''
}
${
  this.options.embodimentEnabled
    ? '- Embodiment: You can train physical awareness using the /embodiment command'
    : ''
}
${
  this.options.memoryEnabled
    ? '- Memory: You can manage your memory using the /memory command'
    : ''
}
Respond in a helpful and friendly manner.`
  }

  /**
   * Update bot options
   */
  updateOptions(options: Partial<DeepTreeEchoBotOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    }

    // Update component options
    this.llmService.updateOptions({
      apiKey: options.apiKey,
      apiEndpoint: options.apiEndpoint,
    })

    if (options.visionEnabled !== undefined) {
      this.visionCapabilities.updateOptions({
        enabled: options.visionEnabled,
      })
    }

    if (options.webAutomationEnabled !== undefined) {
      this.webAutomation.updateOptions({
        enabled: options.webAutomationEnabled,
      })
    }

    if (options.embodimentEnabled !== undefined) {
      this.embodiment.updateOptions({
        enabled: options.embodimentEnabled,
      })
    }
  }
}

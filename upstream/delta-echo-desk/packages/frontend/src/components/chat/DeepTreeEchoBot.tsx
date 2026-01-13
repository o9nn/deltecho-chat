import React, { useEffect } from 'react'
import { BackendRemote, onDCEvent } from '../../backend-com'
import { selectedAccountId } from '../../ScreenController'
import { useSettingsStore } from '../../stores/settings'
import { getLogger } from '../../../../shared/logger'
import useMessage from '../../hooks/chat/useMessage'
import { LLMService } from '../../utils/LLMService'
// Import conditionally
// import { VisionCapabilities } from './VisionCapabilities'
import { PlaywrightAutomation } from './PlaywrightAutomation'

const log = getLogger('render/DeepTreeEchoBot')

// RAG memory store for conversation history
interface MemoryEntry {
  chatId: number
  messageId: number
  text: string
  timestamp: number
  sender: string
  isOutgoing: boolean
}

export class RAGMemoryStore {
  private static instance: RAGMemoryStore
  private memory: MemoryEntry[] = []
  private storageKey = 'deep-tree-echo-memory'

  private constructor() {
    this.loadFromStorage()
  }

  public static getInstance(): RAGMemoryStore {
    if (!RAGMemoryStore.instance) {
      RAGMemoryStore.instance = new RAGMemoryStore()
    }
    return RAGMemoryStore.instance
  }

  public addEntry(entry: MemoryEntry): void {
    this.memory.push(entry)
    this.saveToStorage()
  }

  public getMemoryForChat(chatId: number): MemoryEntry[] {
    return this.memory.filter(entry => entry.chatId === chatId)
  }

  public getAllMemory(): MemoryEntry[] {
    return [...this.memory]
  }

  public searchMemory(query: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.memory.filter(entry =>
      entry.text.toLowerCase().includes(lowerQuery)
    )
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memory))
    } catch (error) {
      log.error('Failed to save memory to storage:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        this.memory = JSON.parse(stored)
      }
    } catch (error) {
      log.error('Failed to load memory from storage:', error)
    }
  }

  public clearMemory(): void {
    this.memory = []
    this.saveToStorage()
  }
}

interface DeepTreeEchoBotProps {
  enabled: boolean
}

/**
 * Deep Tree Echo bot component that handles automatic responses to messages
 * and integrates with RAG memory for learning from conversations
 */
const DeepTreeEchoBot: React.FC<DeepTreeEchoBotProps> = ({ enabled }) => {
  const accountId = selectedAccountId()
  const { sendMessage } = useMessage()
  const settingsStore = useSettingsStore()[0]
  const memory = RAGMemoryStore.getInstance()
  const llmService = LLMService.getInstance()
  // Don't create instance until needed
  // const visionCapabilities = VisionCapabilities.getInstance()
  const playwrightAutomation = PlaywrightAutomation.getInstance()

  // Configure LLM service when settings change
  useEffect(() => {
    if (!settingsStore?.desktopSettings) return

    llmService.setConfig({
      apiKey: settingsStore.desktopSettings.deepTreeEchoBotApiKey || '',
      apiEndpoint:
        settingsStore.desktopSettings.deepTreeEchoBotApiEndpoint ||
        'https://api.openai.com/v1/chat/completions',
    })
  }, [
    settingsStore?.desktopSettings?.deepTreeEchoBotApiKey,
    settingsStore?.desktopSettings?.deepTreeEchoBotApiEndpoint,
  ])

  // Listen for incoming messages
  useEffect(() => {
    if (!enabled || !settingsStore?.desktopSettings?.deepTreeEchoBotEnabled)
      return

    const cleanup = onDCEvent(accountId, 'IncomingMsg', async event => {
      try {
        const { chatId, msgId } = event

        // Get message details
        const message = await BackendRemote.rpc.getMessage(accountId, msgId)

        // Skip messages sent by bot itself (fromId === 1 means it's from self)
        if (message.isInfo || message.fromId === 1) return

        // Store message in RAG memory
        memory.addEntry({
          chatId,
          messageId: msgId,
          text: message.text,
          timestamp: message.timestamp,
          sender: message.sender.displayName,
          isOutgoing: false,
        })

        // Get chat info
        const chatInfo = await BackendRemote.rpc.getBasicChatInfo(
          accountId,
          chatId
        )

        // Skip if chat is a contact request
        if (chatInfo.isContactRequest) return

        // Process special commands
        let response: string | null = null

        // Check if it's a vision command
        if (
          message.text.startsWith('/vision') &&
          message.file &&
          message.file.includes('image')
        ) {
          response = await handleVisionCommand(message.file, message.text)
        }
        // Check if it's a web search command
        else if (message.text.startsWith('/search')) {
          const query = message.text.substring('/search'.length).trim()
          response = await handleSearchCommand(query)
        }
        // Check if it's a screenshot command
        else if (message.text.startsWith('/screenshot')) {
          const url = message.text.substring('/screenshot'.length).trim()
          response = await handleScreenshotCommand(url, chatId)
        }
        // Generate normal response for regular messages
        else {
          response = await generateBotResponse(message.text, chatId)
        }

        // Send the response
        if (response) {
          await sendMessage(accountId, chatId, {
            text: response,
          })

          // Store the bot's response in memory too
          memory.addEntry({
            chatId,
            messageId: Math.floor(Math.random() * 100000), // Generate a random ID since we don't need exact message ID
            text: response,
            timestamp: Math.floor(Date.now() / 1000),
            sender: 'Deep Tree Echo',
            isOutgoing: true,
          })
        }
      } catch (error) {
        log.error('Error handling incoming message:', error)
      }
    })

    return cleanup // Ensure onDCEvent returns a cleanup function
  }, [
    accountId,
    enabled,
    sendMessage,
    memory,
    settingsStore?.desktopSettings?.deepTreeEchoBotEnabled,
  ])

  // Periodically run learning exercises to improve the bot
  useEffect(() => {
    if (
      !enabled ||
      !settingsStore?.desktopSettings?.deepTreeEchoBotEnabled ||
      !settingsStore?.desktopSettings?.deepTreeEchoBotMemoryEnabled
    )
      return

    const intervalId = setInterval(
      () => {
        runLearningExercise()
      },
      24 * 60 * 60 * 1000
    ) // Once a day

    return () => clearInterval(intervalId)
  }, [
    enabled,
    settingsStore?.desktopSettings?.deepTreeEchoBotEnabled,
    settingsStore?.desktopSettings?.deepTreeEchoBotMemoryEnabled,
  ])

  /**
   * Process vision commands to analyze images
   */
  const handleVisionCommand = async (
    imagePath: string,
    messageText: string
  ): Promise<string> => {
    try {
      // Only load VisionCapabilities when actually needed
      const { VisionCapabilities } = await import('./VisionCapabilities')
      const visionCapabilities = VisionCapabilities.getInstance()
      const description =
        await visionCapabilities.generateImageDescription(imagePath)
      return description
    } catch (error) {
      log.error('Error handling vision command:', error)
      return "I'm sorry, I couldn't analyze this image. Vision capabilities might not be available in this environment."
    }
  }

  /**
   * Process web search commands
   */
  const handleSearchCommand = async (query: string): Promise<string> => {
    try {
      if (!query) {
        return 'Please provide a search query after the /search command.'
      }

      return await playwrightAutomation.searchWeb(query)
    } catch (error) {
      log.error('Error handling search command:', error)
      return "I couldn't perform that web search. Playwright automation might not be available in this environment."
    }
  }

  /**
   * Process screenshot commands
   */
  const handleScreenshotCommand = async (
    url: string,
    chatId: number
  ): Promise<string> => {
    try {
      if (!url) {
        return 'Please provide a URL after the /screenshot command.'
      }

      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }

      // Capture the webpage
      const screenshotPath = await playwrightAutomation.captureWebpage(url)

      // Send the screenshot as a file
      await sendMessage(accountId, chatId, {
        text: `Screenshot of ${url}`,
        file: screenshotPath,
      })

      return `I've captured a screenshot of ${url}.`
    } catch (error) {
      log.error('Error handling screenshot command:', error)
      return "I couldn't capture a screenshot of that webpage. Playwright automation might not be available."
    }
  }

  const generateBotResponse = async (
    inputText: string,
    chatId: number
  ): Promise<string> => {
    try {
      // Get chat history context from memory
      const chatMemory = memory.getMemoryForChat(chatId)
      const recentMessages = chatMemory
        .slice(-10) // Last 10 messages for context
        .map(m => `${m.sender}: ${m.text}`)
        .join('\n')

      // Get bot personality from settings
      const personality =
        settingsStore?.desktopSettings?.deepTreeEchoBotPersonality ||
        'Deep Tree Echo is a helpful, friendly AI assistant that provides thoughtful responses to users in Delta Chat.'

      // Call the LLM service to generate a response
      return await llmService.generateResponseWithContext(
        inputText,
        recentMessages,
        personality
      )
    } catch (error) {
      log.error('Error generating bot response:', error)
      return "I'm sorry, I couldn't process your message at the moment."
    }
  }

  const runLearningExercise = async () => {
    try {
      log.info('Running learning exercise...')
      const allMemory = memory.getAllMemory()

      // Skip if no memory entries
      if (allMemory.length === 0) {
        log.info('No memories to process for learning')
        return
      }

      // Create a system prompt for the learning exercise
      const systemPrompt =
        'You are an AI learning system. Your task is to analyze conversation patterns and extract insights from them to improve future responses. Identify common questions, topics, and communication patterns.'

      // Prepare conversation data for analysis
      const conversationData = allMemory
        .slice(-100) // Limit to most recent 100 entries
        .map(m => `[Chat: ${m.chatId}] ${m.sender}: ${m.text}`)
        .join('\n')

      // Request analysis from LLM
      const analysisPrompt = `Please analyze the following conversations and provide insights on how to improve responses:\n\n${conversationData}`

      const analysis = await llmService.generateResponseWithContext(
        analysisPrompt,
        '',
        systemPrompt
      )

      // Log the analysis (in a real implementation, this would be used to update the model)
      log.info('Learning analysis completed:', analysis)

      log.info(
        `Learning exercise completed. Processed ${allMemory.length} memories.`
      )
    } catch (error) {
      log.error('Error during learning exercise:', error)
    }
  }

  return null // This is a background component with no UI
}

export default DeepTreeEchoBot

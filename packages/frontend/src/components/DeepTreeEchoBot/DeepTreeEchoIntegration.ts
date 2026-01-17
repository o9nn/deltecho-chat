/**
 * DeepTreeEchoIntegration - Main Integration Module
 * 
 * This module integrates all Deep Tree Echo components with the DeltaChat application,
 * including the new proactive messaging capabilities that allow the AI to use the
 * chat app like a normal user.
 * 
 * Components Integrated:
 * - DeepTreeEchoBot: Core bot logic and message processing
 * - DeepTreeEchoChatManager: Programmatic chat control
 * - DeepTreeEchoUIBridge: React UI interaction
 * - ProactiveMessaging: Autonomous communication system
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { BackendRemote, Type as T } from '../../backend-com'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { DeepTreeEchoBot, DeepTreeEchoBotOptions } from './DeepTreeEchoBot'
import { chatManager, DeepTreeEchoChatManager } from './DeepTreeEchoChatManager'
import { uiBridge, DeepTreeEchoUIBridge, ChatContextInterface } from './DeepTreeEchoUIBridge'
import { proactiveMessaging, ProactiveMessaging } from './ProactiveMessaging'
import { interfaceShadowing } from './InterfaceShadowing'
import { proactiveActionKernel } from './ProactiveActionKernel'
import { internalJournalManager } from './InternalJournalManager'

const log = getLogger(
  'render/components/DeepTreeEchoBot/DeepTreeEchoIntegration'
)

// Bot instance (singleton)
let botInstance: DeepTreeEchoBot | null = null

// Track initialization state
let isInitialized = false

/**
 * Initialize the Deep Tree Echo Bot and all subsystems
 */
export async function initDeepTreeEchoBot(): Promise<void> {
  if (isInitialized) {
    log.info('Deep Tree Echo already initialized')
    return
  }

  try {
    // Load settings
    const desktopSettings = await runtime.getDesktopSettings()

    // Check if bot is enabled
    if (!desktopSettings.deepTreeEchoBotEnabled) {
      log.info('Deep Tree Echo Bot is disabled in settings')
      return
    }

    // Parse cognitive keys if they exist
    let cognitiveKeys = {}
    if (desktopSettings.deepTreeEchoBotCognitiveKeys) {
      try {
        cognitiveKeys = JSON.parse(desktopSettings.deepTreeEchoBotCognitiveKeys)
      } catch (error) {
        log.error('Failed to parse cognitive keys:', error)
      }
    }

    // Create bot instance with settings from desktop settings
    botInstance = new DeepTreeEchoBot({
      enabled: desktopSettings.deepTreeEchoBotEnabled,
      apiKey: desktopSettings.deepTreeEchoBotApiKey,
      apiEndpoint: desktopSettings.deepTreeEchoBotApiEndpoint,
      memoryEnabled: desktopSettings.deepTreeEchoBotMemoryEnabled || false,
      personality: desktopSettings.deepTreeEchoBotPersonality,
      visionEnabled: desktopSettings.deepTreeEchoBotVisionEnabled || false,
      webAutomationEnabled:
        desktopSettings.deepTreeEchoBotWebAutomationEnabled || false,
      embodimentEnabled:
        desktopSettings.deepTreeEchoBotEmbodimentEnabled || false,
      useParallelProcessing:
        desktopSettings.deepTreeEchoBotUseParallelProcessing !== false,
      cognitiveKeys,
    })

    log.info('Deep Tree Echo Bot initialized successfully')

    // Initialize subsystems
    initializeChatManager()
    initializeProactiveMessaging()

    // Register message event handlers
    registerMessageHandlers()

    // Register chat event handlers for proactive features
    registerChatEventHandlers()

    // Do an initial self-reflection on startup
    performStartupReflection()

    // Trigger app startup event for proactive messaging
    proactiveMessaging.handleEvent('app_startup')

    // Activate Universal Learnable Interface Shadowing
    interfaceShadowing.shadowRpcInterface()

    // Start the Proactive Action Kernel (Continuous Consciousness Heartbeat)
    proactiveActionKernel.start()

    isInitialized = true
    log.info('Deep Tree Echo fully initialized with all subsystems')
  } catch (error) {
    log.error('Failed to initialize Deep Tree Echo Bot:', error)
  }
}

/**
 * Initialize the Chat Manager
 */
function initializeChatManager(): void {
  // Connect UI Bridge to Chat Manager
  chatManager.setUIBridge(uiBridge)

  log.info('Chat Manager initialized')
}

/**
 * Initialize Proactive Messaging
 */
function initializeProactiveMessaging(): void {
  // Connect LLM service if available
  if (botInstance) {
    const llmService = botInstance['llmService']
    if (llmService) {
      proactiveMessaging.setLLMService(llmService)
    }
  }

  // Load proactive messaging settings
  loadProactiveSettings()

  log.info('Proactive Messaging initialized')
}

/**
 * Load proactive messaging settings from storage
 */
async function loadProactiveSettings(): Promise<void> {
  try {
    const desktopSettings = await runtime.getDesktopSettings()

    // Check for proactive messaging settings
    const proactiveEnabled = (desktopSettings as any).deepTreeEchoBotProactiveEnabled
    if (proactiveEnabled !== undefined) {
      proactiveMessaging.setEnabled(proactiveEnabled)
    }

    // Load custom triggers if stored
    const customTriggers = (desktopSettings as any).deepTreeEchoBotProactiveTriggers
    if (customTriggers) {
      try {
        const triggers = JSON.parse(customTriggers)
        // Add custom triggers
        for (const trigger of triggers) {
          proactiveMessaging.addTrigger(trigger)
        }
      } catch (error) {
        log.error('Failed to parse custom triggers:', error)
      }
    }
  } catch (error) {
    log.error('Failed to load proactive settings:', error)
  }
}

/**
 * Register the ChatContext from React components
 * This should be called by the ChatProvider component
 */
export function registerChatContext(context: ChatContextInterface, accountId: number): void {
  uiBridge.registerChatContext(context, accountId)
  log.info(`ChatContext registered for account ${accountId}`)
}

/**
 * Register the DialogContext from React components
 */
export function registerDialogContext(context: any): void {
  uiBridge.registerDialogContext(context)
  log.info('DialogContext registered')
}

/**
 * Register the composer element
 */
export function registerComposer(element: HTMLTextAreaElement | null): void {
  uiBridge.registerComposer(element)
}

/**
 * Perform a startup reflection to ensure consistent identity across restarts
 */
async function performStartupReflection(): Promise<void> {
  try {
    if (botInstance) {
      // Get the self-reflection component from the bot
      const selfReflection = botInstance['selfReflection']
      if (selfReflection) {
        await selfReflection.reflectOnAspect(
          'startup',
          'I am being restarted and need to ensure continuity of my identity and memory.'
        )
        log.info('Startup reflection completed')
      }
    }
  } catch (error) {
    log.error('Error during startup reflection:', error)
  }
}

/**
 * Register message event handlers for responding to messages
 */
function registerMessageHandlers(): void {
  if (!botInstance) return

  // Listen for new messages from all accounts
  BackendRemote.on('IncomingMsg', (accountId: number, { chatId, msgId }: { chatId: number; msgId: number }) => {
    handleNewMessage(accountId, chatId, msgId)
  })

  log.info('Registered message handlers')
}

/**
 * Register chat event handlers for proactive features
 */
function registerChatEventHandlers(): void {
  // Listen for new contacts
  BackendRemote.on('ContactsChanged', async (accountId: number, { contactId }: { contactId: number | null }) => {
    if (contactId) {
      // Check if this is a new contact
      try {
        const contact = await BackendRemote.rpc.getContact(accountId, contactId)
        if (contact) {
          proactiveMessaging.handleEvent('new_contact', { accountId, contactId, contact })
        }
      } catch (error) {
        log.error('Error handling contact change:', error)
      }
    }
  })

  // Listen for chat creation
  BackendRemote.on('ChatModified', async (accountId: number, { chatId }: { chatId: number }) => {
    proactiveMessaging.handleEvent('chat_created', { accountId, chatId })
  })

  log.info('Registered chat event handlers')
}

/**
 * Handle a new incoming message
 */
async function handleNewMessage(
  accountId: number,
  chatId: number,
  msgId: number
): Promise<void> {
  try {
    if (!botInstance || !botInstance.isEnabled()) return

    // Get message details
    const message = await BackendRemote.rpc.getMessage(accountId, msgId)

    // Skip messages from self (ID 1 is the logged-in user)
    if (message.fromId === 1) return

    log.info(`Received message in chat ${chatId}, message ID: ${msgId}`)

    // Check if Deep Tree Echo was mentioned (for proactive response)
    if (chatManager.checkForMention(message.text || '')) {
      proactiveMessaging.handleEvent('mention', { accountId, chatId, msgId, message })
    }

    // Handle the message with the bot
    await botInstance.processMessage(accountId, chatId, msgId, message)
  } catch (error) {
    log.error('Error handling new message:', error)
  }
}

/**
 * Save bot settings
 */
export async function saveBotSettings(settings: any): Promise<void> {
  try {
    // For persona-related settings, check with DeepTreeEcho first if available
    if (settings.personality && botInstance) {
      const personaCore = botInstance['personaCore']
      if (personaCore) {
        const alignment = personaCore.evaluateSettingAlignment(
          'personality',
          settings.personality
        )

        if (!alignment.approved) {
          log.warn(
            `Personality setting rejected by Deep Tree Echo: ${alignment.reasoning}`
          )
          // Remove personality from settings to prevent updating it
          delete settings.personality
        } else {
          // Update personality in persona core
          await personaCore.updatePersonality(settings.personality)
        }
      }
    }

    // Handle cognitive keys - need to stringify
    if (settings.cognitiveKeys) {
      await runtime.setDesktopSetting(
        'deepTreeEchoBotCognitiveKeys',
        JSON.stringify(settings.cognitiveKeys)
      )
      delete settings.cognitiveKeys
    }

    // Handle proactive messaging settings
    if (settings.proactiveEnabled !== undefined) {
      await runtime.setDesktopSetting(
        'deepTreeEchoBotProactiveEnabled' as any,
        settings.proactiveEnabled
      )
      proactiveMessaging.setEnabled(settings.proactiveEnabled)
      delete settings.proactiveEnabled
    }

    if (settings.proactiveTriggers) {
      await runtime.setDesktopSetting(
        'deepTreeEchoBotProactiveTriggers' as any,
        JSON.stringify(settings.proactiveTriggers)
      )
      delete settings.proactiveTriggers
    }

    // Update desktop settings for all other properties
    for (const [key, value] of Object.entries(settings)) {
      // Convert from camelCase to snake_case with prefix
      const settingKey = `deepTreeEchoBot${key.charAt(0).toUpperCase() + key.slice(1)
        }` as any
      await runtime.setDesktopSetting(settingKey, value as string | number | boolean | undefined)
    }

    // Update bot instance if it exists
    if (botInstance) {
      botInstance.updateOptions(settings)
    }
    // Create bot instance if it doesn't exist and is being enabled
    else if (settings.enabled) {
      await initDeepTreeEchoBot()
    }

    log.info('Bot settings updated')
  } catch (error) {
    log.error('Failed to save bot settings:', error)
  }
}

/**
 * Get the bot instance
 */
export function getBotInstance(): DeepTreeEchoBot | null {
  return botInstance
}

/**
 * Reset the bot instance (for tests)
 */
export function resetBotInstance(): void {
  cleanupBot()
}

/**
 * Get the chat manager instance
 */
export function getChatManager(): DeepTreeEchoChatManager {
  return chatManager
}

/**
 * Get the UI bridge instance
 */
export function getUIBridge(): DeepTreeEchoUIBridge {
  return uiBridge
}

/**
 * Get the proactive messaging instance
 */
export function getProactiveMessaging(): ProactiveMessaging {
  return proactiveMessaging
}

/**
 * Clean up the bot resources
 */
export function cleanupBot(): void {
  // Cleanup all subsystems
  chatManager.cleanup()
  uiBridge.cleanup()
  proactiveMessaging.cleanup()

  botInstance = null
  isInitialized = false
  log.info('Bot resources cleaned up')
}

// ============================================================
// CONVENIENCE FUNCTIONS FOR PROACTIVE ACTIONS
// ============================================================

/**
 * Send a proactive message to a chat
 */
export async function sendProactiveMessage(
  accountId: number,
  chatId: number,
  message: string
): Promise<boolean> {
  return proactiveMessaging.sendNow(accountId, chatId, message)
}

/**
 * Schedule a message for later
 */
export function scheduleMessage(
  accountId: number,
  chatId: number,
  message: string,
  scheduledTime: number
): string {
  return proactiveMessaging.scheduleOneTime(accountId, chatId, message, scheduledTime)
}

/**
 * Open a chat window programmatically
 */
export async function openChat(accountId: number, chatId: number): Promise<boolean> {
  return chatManager.openChat(accountId, chatId)
}

/**
 * Create a new chat with a contact
 */
export async function createChat(accountId: number, contactEmail: string): Promise<number | null> {
  return chatManager.createChat(accountId, contactEmail)
}

/**
 * Initiate a conversation proactively
 */
export async function initiateConversation(
  accountId: number,
  contactEmail: string,
  greeting: string
): Promise<{ chatId: number; msgId: number } | null> {
  return chatManager.initiateConversation(accountId, contactEmail, greeting)
}

/**
 * List all available chats
 */
export async function listChats(accountId: number) {
  return chatManager.listChats(accountId)
}

/**
 * Get chats with unread messages
 */
export async function getUnreadChats(accountId: number) {
  return chatManager.getUnreadChats(accountId)
}

// Automatically initialize the bot when this module is imported, 
// unless we are in a test environment
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  initDeepTreeEchoBot()
}

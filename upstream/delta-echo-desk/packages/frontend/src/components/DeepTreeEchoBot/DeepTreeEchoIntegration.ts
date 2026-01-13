import { getLogger } from '@deltachat-desktop/shared/logger'
import { BackendRemote, onDCEvent, Type as T } from '../../backend-com'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { DeepTreeEchoBot, DeepTreeEchoBotOptions } from './DeepTreeEchoBot'

const log = getLogger(
  'render/components/DeepTreeEchoBot/DeepTreeEchoIntegration'
)

// Bot instance (singleton)
let botInstance: DeepTreeEchoBot | null = null

/**
 * Initialize the Deep Tree Echo Bot
 */
export async function initDeepTreeEchoBot(): Promise<void> {
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

    // Register message event handlers
    registerMessageHandlers()

    // Do an initial self-reflection on startup
    performStartupReflection()
  } catch (error) {
    log.error('Failed to initialize Deep Tree Echo Bot:', error)
  }
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

  // Listen for new messages
  onDCEvent('DcEventNewMsg', (accountId, chatId, msgId) => {
    handleNewMessage(accountId, chatId, msgId)
  })

  log.info('Registered message handlers')
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

    // Handle the message
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

    // Update desktop settings for all other properties
    for (const [key, value] of Object.entries(settings)) {
      // Convert from camelCase to snake_case with prefix
      const settingKey = `deepTreeEchoBot${
        key.charAt(0).toUpperCase() + key.slice(1)
      }` as any
      await runtime.setDesktopSetting(settingKey, value)
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
 * Clean up the bot resources
 */
export function cleanupBot(): void {
  botInstance = null
  log.info('Bot resources cleaned up')
}

// Automatically initialize the bot when this module is imported
initDeepTreeEchoBot()

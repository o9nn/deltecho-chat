import { BackendRemote } from '../../backend-com'
import { DeepTreeEchoBot } from './DeepTreeEchoBot'
import {
  getBotInstance,
  initDeepTreeEchoBot,
  cleanupBot,
} from './DeepTreeEchoIntegration'
import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('render/components/DeepTreeEchoBot/DeepTreeEchoTestUtil')

/**
 * Utility functions to help test and demonstrate the Deep Tree Echo bot
 */
export class DeepTreeEchoTestUtil {
  /**
   * Create a test group with the bot and send an initial message
   */
  public static async createTestGroup(
    accountId: number,
    groupName: string,
    additionalMembers: number[] = []
  ): Promise<number> {
    try {
      // Create a group chat - using false for protect parameter (not protected)
      const chatId = await BackendRemote.rpc.createGroupChat(
        accountId,
        groupName,
        false
      )
      log.info(`Created test group: ${chatId}`)

      // Add contacts to the group
      for (const contactId of additionalMembers) {
        try {
          await BackendRemote.rpc.addContactToChat(accountId, chatId, contactId)
        } catch (error) {
          log.error(`Failed to add contact ${contactId} to group: ${error}`)
        }
      }

      // Send initial message
      await BackendRemote.rpc.miscSendTextMessage(
        accountId,
        chatId,
        'Deep Tree Echo bot has been added to this group. Type /help to see available commands.'
      )

      return chatId
    } catch (error) {
      log.error(`Failed to create test group: ${error}`)
      return 0
    }
  }

  /**
   * Send a test message to the bot
   */
  public static async sendTestMessage(
    accountId: number,
    chatId: number,
    text: string
  ): Promise<number> {
    try {
      const msgId = await BackendRemote.rpc.miscSendTextMessage(
        accountId,
        chatId,
        text
      )
      log.info(`Sent test message to chat ${chatId}: ${text}`)
      return msgId
    } catch (error) {
      log.error(`Failed to send test message: ${error}`)
      return 0
    }
  }

  /**
   * Manually process a message with the bot
   */
  public static async processMessageWithBot(
    accountId: number,
    chatId: number,
    msgId: number
  ): Promise<void> {
    try {
      const bot =
        getBotInstance() || (await DeepTreeEchoTestUtil.initBotIfNeeded())
      if (!bot) {
        log.error('Bot not available')
        return
      }

      const message = await BackendRemote.rpc.getMessage(accountId, msgId)
      await bot.processMessage(accountId, chatId, msgId, message)
      log.info(`Processed message ${msgId} with bot`)
    } catch (error) {
      log.error(`Failed to process message with bot: ${error}`)
    }
  }

  /**
   * Initialize the bot if needed
   */
  private static async initBotIfNeeded(): Promise<DeepTreeEchoBot | null> {
    try {
      await initDeepTreeEchoBot()
      return getBotInstance()
    } catch (error) {
      log.error(`Failed to initialize bot: ${error}`)
      return null
    }
  }

  /**
   * Run a complete demo of the bot's capabilities
   */
  public static async runDemo(accountId: number): Promise<void> {
    try {
      // Ensure bot is initialized
      const bot =
        getBotInstance() || (await DeepTreeEchoTestUtil.initBotIfNeeded())
      if (!bot) {
        log.error('Bot not available for demo')
        return
      }

      // Create a demo group
      const chatId = await DeepTreeEchoTestUtil.createTestGroup(
        accountId,
        'Deep Tree Echo Demo'
      )
      if (!chatId) {
        log.error('Failed to create demo group')
        return
      }

      // Wait a moment to let the group creation complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Send a series of test messages to demonstrate different capabilities
      const demoMessages = [
        '/help',
        'Hello Deep Tree Echo, tell me about yourself',
        '/reflect personality',
        'How does your memory system work?',
        '/cognitive status',
        "What's your favorite book?",
        '/version',
      ]

      // Send messages with a delay between each
      for (const message of demoMessages) {
        const msgId = await DeepTreeEchoTestUtil.sendTestMessage(
          accountId,
          chatId,
          message
        )
        await DeepTreeEchoTestUtil.processMessageWithBot(
          accountId,
          chatId,
          msgId
        )

        // Wait between messages to make the conversation more natural
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      log.info('Demo completed successfully')
    } catch (error) {
      log.error(`Demo failed: ${error}`)
    }
  }

  /**
   * Clean up resources after testing
   */
  public static async cleanup(): Promise<void> {
    try {
      cleanupBot()
      log.info('Cleaned up test resources')
    } catch (error) {
      log.error(`Failed to clean up: ${error}`)
    }
  }
}

// Export functions directly for easier access
export const createTestGroup = DeepTreeEchoTestUtil.createTestGroup
export const sendTestMessage = DeepTreeEchoTestUtil.sendTestMessage
export const processMessageWithBot = DeepTreeEchoTestUtil.processMessageWithBot
export const runDemo = DeepTreeEchoTestUtil.runDemo
export const cleanup = DeepTreeEchoTestUtil.cleanup

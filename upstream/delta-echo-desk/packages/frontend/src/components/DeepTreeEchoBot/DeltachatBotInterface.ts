import { getLogger } from '@deltachat-desktop/shared/logger'
import { BackendRemote } from '../../backend-com'
import { DeepTreeEchoBot } from './DeepTreeEchoBot'
import { getBotInstance } from './DeepTreeEchoIntegration'

const log = getLogger('render/components/DeepTreeEchoBot/DeltachatBotInterface')

/**
 * Helper class that makes Deep Tree Echo compatible with the Delta Chat Bot ecosystem
 *
 * Following conventions from https://bots.delta.chat/
 */
export class DeltachatBotInterface {
  private static instance: DeltachatBotInterface | null = null
  private bot: DeepTreeEchoBot | null = null
  private botAccountId: number | null = null

  private constructor() {
    // Get the bot instance
    this.bot = getBotInstance()

    // Initialize bot account and event handlers
    this.initialize()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DeltachatBotInterface {
    if (!DeltachatBotInterface.instance) {
      DeltachatBotInterface.instance = new DeltachatBotInterface()
    }
    return DeltachatBotInterface.instance
  }

  /**
   * Initialize the bot interface
   */
  private async initialize(): Promise<void> {
    try {
      // Find the bot account or create one if needed
      await this.initBotAccount()

      // Register command handlers
      this.registerCommands()

      log.info('Delta Chat Bot Interface initialized')
    } catch (error) {
      log.error('Failed to initialize Delta Chat Bot Interface:', error)
    }
  }

  /**
   * Initialize a bot account or find an existing one
   */
  private async initBotAccount(): Promise<void> {
    try {
      // Check if we already have a bot account
      const accounts = await BackendRemote.rpc.getAllAccounts()

      // Look for an account named "Deep Tree Echo Bot"
      for (const account of accounts) {
        const accountInfo = await BackendRemote.rpc.getAccountInfo(account)
        if (accountInfo.name === 'Deep Tree Echo Bot') {
          this.botAccountId = account
          log.info(`Found existing bot account: ${account}`)
          return
        }
      }

      // No bot account found, but we can still use the current account
      // In a real dedicated bot implementation, we might create a new account here
      log.info('Using main account for bot operations')
    } catch (error) {
      log.error('Error initializing bot account:', error)
    }
  }

  /**
   * Register standard bot commands
   */
  private registerCommands(): void {
    if (!this.bot) return

    // Standard Delta Chat bot commands
    // These would be handled by the bot's processCommand method
    log.info('Registered standard bot commands')
  }

  /**
   * Send a message to a chat using bot account
   */
  public async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      if (this.botAccountId) {
        // If we have a dedicated bot account, use that
        await BackendRemote.rpc.miscSendTextMessage(
          this.botAccountId,
          chatId,
          text
        )
      } else if (this.bot) {
        // Otherwise use the main account
        const accounts = await BackendRemote.rpc.getAllAccounts()
        if (accounts.length > 0) {
          await BackendRemote.rpc.miscSendTextMessage(accounts[0], chatId, text)
        }
      }
    } catch (error) {
      log.error('Error sending bot message:', error)
    }
  }

  /**
   * Process an incoming message as a bot
   */
  public async processMessage(
    accountId: number,
    chatId: number,
    msgId: number
  ): Promise<void> {
    try {
      if (!this.bot) {
        this.bot = getBotInstance()
        if (!this.bot) return
      }

      const message = await BackendRemote.rpc.getMessage(accountId, msgId)

      // Process message with Deep Tree Echo Bot
      await this.bot.processMessage(accountId, chatId, msgId, message)
    } catch (error) {
      log.error('Error processing message in bot interface:', error)
    }
  }

  /**
   * Create a bot group
   */
  public async createBotGroup(
    name: string,
    memberAddresses: string[]
  ): Promise<number> {
    try {
      if (!this.botAccountId) {
        const accounts = await BackendRemote.rpc.getAllAccounts()
        if (accounts.length > 0) {
          // Create group chat with specified name and type 0 (normal group)
          const chatId = await BackendRemote.rpc.createGroupChat(
            accounts[0],
            name,
            0
          )

          // Add members
          for (const address of memberAddresses) {
            try {
              // Look up or create contact
              const contactId = await BackendRemote.rpc.createContact(
                accounts[0],
                address,
                address
              )
              // Add contact to chat
              await BackendRemote.rpc.addContactToChat(
                Number(accounts[0]),
                Number(chatId),
                Number(contactId)
              )
            } catch (error) {
              log.error(`Failed to add ${address} to group:`, error)
            }
          }

          // Send welcome message
          await this.sendMessage(
            chatId,
            `Welcome to the ${name} group with Deep Tree Echo! Type /help to see available commands.`
          )

          return chatId
        }
      } else {
        // Use dedicated bot account
        // Create group chat with specified name and type 0 (normal group)
        const chatId = await BackendRemote.rpc.createGroupChat(
          Number(this.botAccountId),
          name,
          0
        )

        // Add members
        for (const address of memberAddresses) {
          try {
            // Look up or create contact
            const contactId = await BackendRemote.rpc.createContact(
              this.botAccountId,
              address,
              address
            )
            // Add contact to chat
            await BackendRemote.rpc.addContactToChat(
              this.botAccountId,
              chatId,
              contactId
            )
          } catch (error) {
            log.error(`Failed to add ${address} to group:`, error)
          }
        }

        // Send welcome message
        await this.sendMessage(
          chatId,
          `Welcome to the ${name} group with Deep Tree Echo! Type /help to see available commands.`
        )

        return chatId
      }
    } catch (error) {
      log.error('Error creating bot group:', error)
    }

    return 0
  }

  /**
   * Get information about the bot
   */
  public getBotInfo(): {
    name: string
    version: string
    capabilities: string[]
  } {
    return {
      name: 'Deep Tree Echo',
      version: '1.0.0',
      capabilities: [
        'chat',
        'memory',
        'reflection',
        'personality',
        'cognitive-parallelism',
      ],
    }
  }
}

// Export a singleton instance
export const deltachatBotInterface = DeltachatBotInterface.getInstance()

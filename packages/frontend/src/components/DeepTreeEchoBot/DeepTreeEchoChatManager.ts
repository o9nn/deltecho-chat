/**
 * DeepTreeEchoChatManager - Programmatic Chat Control for Deep Tree Echo
 * 
 * This module provides Deep Tree Echo with the ability to manage chats
 * like a normal user would - listing, opening, creating, and navigating
 * between conversations.
 * 
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                    Deep Tree Echo Chat Manager                       │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Chat Operations                           │   │
 * │  │    - listChats()      : Get all available chats              │   │
 * │  │    - openChat()       : Select and focus a chat              │   │
 * │  │    - createChat()     : Start new conversation               │   │
 * │  │    - sendMessage()    : Send message to any chat             │   │
 * │  │    - getActiveChat()  : Get currently focused chat           │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Chat Monitoring                           │   │
 * │  │    - watchChat()      : Monitor specific chat for activity   │   │
 * │  │    - watchAllChats()  : Monitor all chats                    │   │
 * │  │    - getUnreadChats() : Get chats with unread messages       │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Proactive Actions                         │   │
 * │  │    - initiateConversation() : Start conversation proactively │   │
 * │  │    - scheduleMessage()      : Queue message for later        │   │
 * │  │    - respondToMention()     : React to being mentioned       │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────┘
 * ```
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { BackendRemote, Type as T } from '../../backend-com'

const log = getLogger('render/components/DeepTreeEchoBot/DeepTreeEchoChatManager')

/**
 * Chat summary for Deep Tree Echo's awareness
 */
export interface ChatSummary {
  id: number
  name: string
  isGroup: boolean
  isArchived: boolean
  isMuted: boolean
  unreadCount: number
  lastMessageTimestamp: number
  lastMessagePreview: string
  contactIds: number[]
  profileImage?: string
}

/**
 * Active chat state
 */
export interface ActiveChatState {
  accountId: number
  chatId: number
  chat: T.FullChat | null
  isLoading: boolean
}

/**
 * Message to be scheduled
 */
export interface ScheduledMessage {
  id: string
  accountId: number
  chatId: number
  text: string
  scheduledTime: number
  reason: string
  status: 'pending' | 'sent' | 'cancelled'
}

/**
 * Chat watch callback
 */
export type ChatWatchCallback = (
  accountId: number,
  chatId: number,
  event: 'new_message' | 'typing' | 'read' | 'modified',
  data?: any
) => void

/**
 * DeepTreeEchoChatManager - Gives Deep Tree Echo the ability to manage chats
 */
export class DeepTreeEchoChatManager {
  private static instance: DeepTreeEchoChatManager | null = null
  
  // State
  private activeChat: ActiveChatState | null = null
  private chatCache: Map<string, ChatSummary[]> = new Map() // accountId -> chats
  private watchedChats: Map<string, ChatWatchCallback[]> = new Map() // chatKey -> callbacks
  private scheduledMessages: ScheduledMessage[] = []
  private schedulerInterval: NodeJS.Timeout | null = null
  
  // UI Bridge reference (set externally)
  private uiBridge: any = null

  private constructor() {
    this.initializeEventListeners()
    this.startScheduler()
    log.info('DeepTreeEchoChatManager initialized')
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DeepTreeEchoChatManager {
    if (!DeepTreeEchoChatManager.instance) {
      DeepTreeEchoChatManager.instance = new DeepTreeEchoChatManager()
    }
    return DeepTreeEchoChatManager.instance
  }

  /**
   * Set the UI bridge for chat window control
   */
  public setUIBridge(bridge: any): void {
    this.uiBridge = bridge
    log.info('UI Bridge connected to ChatManager')
  }

  // ============================================================
  // CHAT LISTING & DISCOVERY
  // ============================================================

  /**
   * List all chats for an account
   */
  public async listChats(accountId: number): Promise<ChatSummary[]> {
    try {
      const chatListEntries = await BackendRemote.rpc.getChatlistEntries(
        accountId,
        0, // listFlags - 0 for normal chats
        null, // queryStr
        null  // queryContactId
      )

      const summaries: ChatSummary[] = []

      for (const entry of chatListEntries) {
        if (entry.kind === 'ChatListItem') {
          try {
            const chatInfo = await BackendRemote.rpc.getBasicChatInfo(accountId, entry.id)
            const lastMsg = await this.getLastMessage(accountId, entry.id)
            
            summaries.push({
              id: entry.id,
              name: chatInfo.name,
              isGroup: chatInfo.chatType === 'Group' || chatInfo.chatType === 'Broadcast',
              isArchived: chatInfo.archived,
              isMuted: chatInfo.isMuted,
              unreadCount: 0, // Will be updated from chat list item
              lastMessageTimestamp: lastMsg?.timestamp || 0,
              lastMessagePreview: lastMsg?.text?.slice(0, 100) || '',
              contactIds: [],
              profileImage: chatInfo.profileImage || undefined,
            })
          } catch (err) {
            log.warn(`Failed to get info for chat ${entry.id}:`, err)
          }
        }
      }

      // Cache the results
      this.chatCache.set(accountId.toString(), summaries)
      
      log.info(`Listed ${summaries.length} chats for account ${accountId}`)
      return summaries
    } catch (error) {
      log.error('Error listing chats:', error)
      return []
    }
  }

  /**
   * Get last message from a chat
   */
  private async getLastMessage(accountId: number, chatId: number): Promise<T.Message | null> {
    try {
      const messageIds = await BackendRemote.rpc.getMessageIds(accountId, chatId, false, false)
      if (messageIds.length > 0) {
        return await BackendRemote.rpc.getMessage(accountId, messageIds[messageIds.length - 1])
      }
    } catch (err) {
      // Ignore errors for last message
    }
    return null
  }

  /**
   * Get chats with unread messages
   */
  public async getUnreadChats(accountId: number): Promise<ChatSummary[]> {
    const allChats = await this.listChats(accountId)
    return allChats.filter(chat => chat.unreadCount > 0)
  }

  /**
   * Search for chats by name or content
   */
  public async searchChats(accountId: number, query: string): Promise<ChatSummary[]> {
    try {
      const chatListEntries = await BackendRemote.rpc.getChatlistEntries(
        accountId,
        0,
        query, // queryStr
        null
      )

      const summaries: ChatSummary[] = []
      for (const entry of chatListEntries) {
        if (entry.kind === 'ChatListItem') {
          const chatInfo = await BackendRemote.rpc.getBasicChatInfo(accountId, entry.id)
          summaries.push({
            id: entry.id,
            name: chatInfo.name,
            isGroup: chatInfo.chatType === 'Group' || chatInfo.chatType === 'Broadcast',
            isArchived: chatInfo.archived,
            isMuted: chatInfo.isMuted,
            unreadCount: 0,
            lastMessageTimestamp: 0,
            lastMessagePreview: '',
            contactIds: [],
          })
        }
      }

      return summaries
    } catch (error) {
      log.error('Error searching chats:', error)
      return []
    }
  }

  // ============================================================
  // CHAT SELECTION & NAVIGATION
  // ============================================================

  /**
   * Open/select a chat (like clicking on it)
   */
  public async openChat(accountId: number, chatId: number): Promise<boolean> {
    try {
      // If we have a UI bridge, use it to select the chat in the UI
      if (this.uiBridge && this.uiBridge.selectChat) {
        await this.uiBridge.selectChat(accountId, chatId)
      }

      // Get full chat info
      const fullChat = await BackendRemote.rpc.getFullChatById(accountId, chatId)
      
      this.activeChat = {
        accountId,
        chatId,
        chat: fullChat,
        isLoading: false,
      }

      // Mark as seen
      await BackendRemote.rpc.markseenMsgs(accountId, [])

      log.info(`Opened chat ${chatId} for account ${accountId}`)
      return true
    } catch (error) {
      log.error('Error opening chat:', error)
      return false
    }
  }

  /**
   * Get the currently active chat
   */
  public getActiveChat(): ActiveChatState | null {
    return this.activeChat
  }

  /**
   * Close/deselect the current chat
   */
  public closeChat(): void {
    if (this.uiBridge && this.uiBridge.unselectChat) {
      this.uiBridge.unselectChat()
    }
    this.activeChat = null
    log.info('Closed active chat')
  }

  /**
   * Navigate to next chat with unread messages
   */
  public async navigateToNextUnread(accountId: number): Promise<boolean> {
    const unreadChats = await this.getUnreadChats(accountId)
    if (unreadChats.length > 0) {
      return this.openChat(accountId, unreadChats[0].id)
    }
    return false
  }

  // ============================================================
  // CHAT CREATION
  // ============================================================

  /**
   * Create a new 1:1 chat with a contact
   */
  public async createChat(accountId: number, contactEmail: string): Promise<number | null> {
    try {
      // Create or get contact
      const contactId = await BackendRemote.rpc.createContact(
        accountId,
        contactEmail,
        contactEmail.split('@')[0] // Use email prefix as name
      )

      // Create chat with contact
      const chatId = await BackendRemote.rpc.createChatByContactId(accountId, contactId)
      
      log.info(`Created chat ${chatId} with contact ${contactEmail}`)
      return chatId
    } catch (error) {
      log.error('Error creating chat:', error)
      return null
    }
  }

  /**
   * Create a new group chat
   */
  public async createGroupChat(
    accountId: number,
    name: string,
    memberEmails: string[]
  ): Promise<number | null> {
    try {
      // Create group
      const chatId = await BackendRemote.rpc.createGroupChat(accountId, name, false)

      // Add members
      for (const email of memberEmails) {
        try {
          const contactId = await BackendRemote.rpc.createContact(accountId, email, email.split('@')[0])
          await BackendRemote.rpc.addContactToChat(accountId, chatId, contactId)
        } catch (err) {
          log.warn(`Failed to add ${email} to group:`, err)
        }
      }

      log.info(`Created group chat ${chatId} with ${memberEmails.length} members`)
      return chatId
    } catch (error) {
      log.error('Error creating group chat:', error)
      return null
    }
  }

  // ============================================================
  // MESSAGING
  // ============================================================

  /**
   * Send a message to a chat
   */
  public async sendMessage(
    accountId: number,
    chatId: number,
    text: string
  ): Promise<number | null> {
    try {
      const msgId = await BackendRemote.rpc.miscSendTextMessage(accountId, chatId, text)
      log.info(`Sent message to chat ${chatId}: "${text.slice(0, 50)}..."`)
      return msgId
    } catch (error) {
      log.error('Error sending message:', error)
      return null
    }
  }

  /**
   * Send a message to the currently active chat
   */
  public async sendToActiveChat(text: string): Promise<number | null> {
    if (!this.activeChat) {
      log.warn('No active chat to send message to')
      return null
    }
    return this.sendMessage(this.activeChat.accountId, this.activeChat.chatId, text)
  }

  /**
   * Schedule a message for later
   */
  public scheduleMessage(
    accountId: number,
    chatId: number,
    text: string,
    scheduledTime: number,
    reason: string
  ): string {
    const id = `scheduled-${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    this.scheduledMessages.push({
      id,
      accountId,
      chatId,
      text,
      scheduledTime,
      reason,
      status: 'pending',
    })

    log.info(`Scheduled message for ${new Date(scheduledTime).toISOString()}: "${text.slice(0, 50)}..."`)
    return id
  }

  /**
   * Cancel a scheduled message
   */
  public cancelScheduledMessage(id: string): boolean {
    const msg = this.scheduledMessages.find(m => m.id === id)
    if (msg && msg.status === 'pending') {
      msg.status = 'cancelled'
      return true
    }
    return false
  }

  /**
   * Get all scheduled messages
   */
  public getScheduledMessages(): ScheduledMessage[] {
    return this.scheduledMessages.filter(m => m.status === 'pending')
  }

  // ============================================================
  // PROACTIVE ACTIONS
  // ============================================================

  /**
   * Initiate a conversation proactively
   */
  public async initiateConversation(
    accountId: number,
    contactEmail: string,
    greeting: string
  ): Promise<{ chatId: number; msgId: number } | null> {
    try {
      // Create or get chat
      let chatId = await this.createChat(accountId, contactEmail)
      if (!chatId) {
        // Try to find existing chat
        const chats = await this.searchChats(accountId, contactEmail)
        if (chats.length > 0) {
          chatId = chats[0].id
        }
      }

      if (!chatId) {
        log.error('Could not create or find chat for:', contactEmail)
        return null
      }

      // Open the chat
      await this.openChat(accountId, chatId)

      // Send greeting
      const msgId = await this.sendMessage(accountId, chatId, greeting)
      if (!msgId) {
        return null
      }

      log.info(`Initiated conversation with ${contactEmail}`)
      return { chatId, msgId }
    } catch (error) {
      log.error('Error initiating conversation:', error)
      return null
    }
  }

  /**
   * Check if Deep Tree Echo was mentioned in a message
   */
  public checkForMention(messageText: string): boolean {
    const mentionPatterns = [
      /deep\s*tree\s*echo/i,
      /dte/i,
      /@bot/i,
      /hey\s*echo/i,
      /echo,/i,
    ]
    return mentionPatterns.some(pattern => pattern.test(messageText))
  }

  /**
   * Respond to being mentioned
   */
  public async respondToMention(
    accountId: number,
    chatId: number,
    originalMessage: string,
    response: string
  ): Promise<number | null> {
    // Open the chat first
    await this.openChat(accountId, chatId)
    
    // Send response
    return this.sendMessage(accountId, chatId, response)
  }

  // ============================================================
  // CHAT WATCHING & MONITORING
  // ============================================================

  /**
   * Watch a specific chat for activity
   */
  public watchChat(accountId: number, chatId: number, callback: ChatWatchCallback): () => void {
    const key = `${accountId}:${chatId}`
    
    if (!this.watchedChats.has(key)) {
      this.watchedChats.set(key, [])
    }
    
    this.watchedChats.get(key)!.push(callback)
    
    log.info(`Started watching chat ${chatId}`)
    
    // Return unwatch function
    return () => {
      const callbacks = this.watchedChats.get(key)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
        if (callbacks.length === 0) {
          this.watchedChats.delete(key)
        }
      }
    }
  }

  /**
   * Watch all chats for an account
   */
  public watchAllChats(accountId: number, callback: ChatWatchCallback): () => void {
    const key = `${accountId}:*`
    
    if (!this.watchedChats.has(key)) {
      this.watchedChats.set(key, [])
    }
    
    this.watchedChats.get(key)!.push(callback)
    
    log.info(`Started watching all chats for account ${accountId}`)
    
    return () => {
      const callbacks = this.watchedChats.get(key)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // ============================================================
  // INTERNAL METHODS
  // ============================================================

  /**
   * Initialize event listeners for chat events
   */
  private initializeEventListeners(): void {
    // Listen for incoming messages
    BackendRemote.on('IncomingMsg', (accountId: number, { chatId, msgId }: { chatId: number; msgId: number }) => {
      this.notifyWatchers(accountId, chatId, 'new_message', { msgId })
    })

    // Listen for chat modifications
    BackendRemote.on('ChatModified', (accountId: number, { chatId }: { chatId: number }) => {
      this.notifyWatchers(accountId, chatId, 'modified', {})
      // Invalidate cache
      this.chatCache.delete(accountId.toString())
    })

    // Listen for messages being read
    BackendRemote.on('MsgsNoticed', (accountId: number, { chatId }: { chatId: number }) => {
      this.notifyWatchers(accountId, chatId, 'read', {})
    })

    log.info('Event listeners initialized')
  }

  /**
   * Notify watchers of chat events
   */
  private notifyWatchers(
    accountId: number,
    chatId: number,
    event: 'new_message' | 'typing' | 'read' | 'modified',
    data: any
  ): void {
    // Notify specific chat watchers
    const specificKey = `${accountId}:${chatId}`
    const specificCallbacks = this.watchedChats.get(specificKey) || []
    specificCallbacks.forEach(cb => cb(accountId, chatId, event, data))

    // Notify all-chat watchers
    const allKey = `${accountId}:*`
    const allCallbacks = this.watchedChats.get(allKey) || []
    allCallbacks.forEach(cb => cb(accountId, chatId, event, data))
  }

  /**
   * Start the message scheduler
   */
  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      this.processScheduledMessages()
    }, 1000) // Check every second
  }

  /**
   * Process scheduled messages
   */
  private async processScheduledMessages(): Promise<void> {
    const now = Date.now()
    
    for (const msg of this.scheduledMessages) {
      if (msg.status === 'pending' && msg.scheduledTime <= now) {
        try {
          await this.sendMessage(msg.accountId, msg.chatId, msg.text)
          msg.status = 'sent'
          log.info(`Sent scheduled message: ${msg.id}`)
        } catch (error) {
          log.error(`Failed to send scheduled message ${msg.id}:`, error)
        }
      }
    }

    // Clean up old messages
    this.scheduledMessages = this.scheduledMessages.filter(
      m => m.status === 'pending' || (m.status === 'sent' && now - m.scheduledTime < 3600000)
    )
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
    }
    this.watchedChats.clear()
    this.chatCache.clear()
    this.scheduledMessages = []
    log.info('ChatManager cleaned up')
  }
}

// Export singleton instance
export const chatManager = DeepTreeEchoChatManager.getInstance()

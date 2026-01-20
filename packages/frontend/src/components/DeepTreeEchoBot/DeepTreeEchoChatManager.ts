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

import { getLogger } from "@deltachat-desktop/shared/logger";
import { BackendRemote, Type as T, C } from "../../backend-com";

// Lazy logger to avoid initialization before logger handler is ready
let _log: ReturnType<typeof getLogger> | null = null;
function log() {
  if (!_log) {
    _log = getLogger(
      "render/components/DeepTreeEchoBot/DeepTreeEchoChatManager",
    );
  }
  return _log;
}

/**
 * Chat summary for Deep Tree Echo's awareness
 */
export interface ChatSummary {
  id: number;
  name: string;
  isGroup: boolean;
  isArchived: boolean;
  isMuted: boolean;
  unreadCount: number;
  lastMessageTimestamp: number;
  lastMessagePreview: string;
  contactIds: number[];
  profileImage?: string;
}

/**
 * Active chat state
 */
export interface ActiveChatState {
  accountId: number;
  chatId: number;
  chat: T.FullChat | null;
  isLoading: boolean;
}

/**
 * Message to be scheduled
 */
export interface ScheduledMessage {
  id: string;
  accountId: number;
  chatId: number;
  text: string;
  scheduledTime: number;
  reason: string;
  status: "pending" | "sent" | "cancelled";
}

/**
 * Contact summary for Deep Tree Echo's awareness
 */
export interface ContactSummary {
  id: number;
  email: string;
  name: string;
  displayName: string;
  profileImage?: string;
  lastSeen?: number;
  isBlocked: boolean;
  isVerified: boolean;
  status?: string;
}

/**
 * Message summary for chat history
 */
export interface MessageSummary {
  id: number;
  text: string;
  fromId: number;
  fromName: string;
  timestamp: number;
  isOutgoing: boolean;
  isInfo: boolean;
  hasAttachment: boolean;
  chatId?: number;
  file?: string;
  html?: string;
}

/**
 * Chat watch callback
 */
export type ChatWatchCallback = (
  accountId: number,
  chatId: number,
  event: "new_message" | "typing" | "read" | "modified",
  data?: any,
) => void;

/**
 * DeepTreeEchoChatManager - Gives Deep Tree Echo the ability to manage chats
 */
export class DeepTreeEchoChatManager {
  private static instance: DeepTreeEchoChatManager | null = null;

  // State
  private activeChat: ActiveChatState | null = null;
  private chatCache: Map<string, ChatSummary[]> = new Map(); // accountId -> chats
  private watchedChats: Map<string, ChatWatchCallback[]> = new Map(); // chatKey -> callbacks
  private scheduledMessages: ScheduledMessage[] = [];
  private schedulerInterval: NodeJS.Timeout | null = null;

  // UI Bridge reference (set externally)
  private uiBridge: any = null;

  private constructor() {
    this.initializeEventListeners();
    this.startScheduler();
    log().info("DeepTreeEchoChatManager initialized");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DeepTreeEchoChatManager {
    if (!DeepTreeEchoChatManager.instance) {
      DeepTreeEchoChatManager.instance = new DeepTreeEchoChatManager();
    }
    return DeepTreeEchoChatManager.instance;
  }

  /**
   * Set the UI bridge for chat window control
   */
  public setUIBridge(bridge: any): void {
    this.uiBridge = bridge;
    log().info("UI Bridge connected to ChatManager");
  }

  /**
   * Reset singleton instance (for tests)
   */
  public static resetInstance(): void {
    if (DeepTreeEchoChatManager.instance) {
      DeepTreeEchoChatManager.instance.cleanup();
      DeepTreeEchoChatManager.instance = null;
    }
    _log = null;
    _chatManagerInstance = null;
  }

  // ============================================================
  // CHAT LISTING & DISCOVERY
  // ============================================================

  /**
   * List all chats for an account
   */
  public async listChats(accountId: number): Promise<ChatSummary[]> {
    try {
      // getChatlistEntries returns number[] - array of chat IDs
      const chatListIds = await BackendRemote.rpc.getChatlistEntries(
        accountId,
        0, // listFlags - 0 for normal chats
        null, // queryStr
        null, // queryContactId
      );

      const summaries: ChatSummary[] = [];

      for (const chatId of chatListIds) {
        try {
          const chatInfo = await BackendRemote.rpc.getBasicChatInfo(
            accountId,
            chatId,
          );
          const lastMsg = await this.getLastMessage(accountId, chatId);

          summaries.push({
            id: chatId,
            name: chatInfo.name,
            isGroup:
              chatInfo.chatType === C.DC_CHAT_TYPE_GROUP ||
              chatInfo.chatType === C.DC_CHAT_TYPE_BROADCAST,
            isArchived: chatInfo.archived,
            isMuted: chatInfo.isMuted,
            unreadCount: 0, // Will be updated from chat list item
            lastMessageTimestamp: lastMsg?.timestamp || 0,
            lastMessagePreview: lastMsg?.text?.slice(0, 100) || "",
            contactIds: [],
            profileImage: chatInfo.profileImage || undefined,
          });
        } catch (err) {
          log().warn(`Failed to get info for chat ${chatId}:`, err);
        }
      }

      // Cache the results
      this.chatCache.set(accountId.toString(), summaries);

      log().info(`Listed ${summaries.length} chats for account ${accountId}`);
      return summaries;
    } catch (error) {
      log().error("Error listing chats:", error);
      return [];
    }
  }

  /**
   * Get last message from a chat
   */
  private async getLastMessage(
    accountId: number,
    chatId: number,
  ): Promise<T.Message | null> {
    try {
      const messageIds = await BackendRemote.rpc.getMessageIds(
        accountId,
        chatId,
        false,
        false,
      );
      if (messageIds.length > 0) {
        return await BackendRemote.rpc.getMessage(
          accountId,
          messageIds[messageIds.length - 1],
        );
      }
    } catch (err) {
      // Ignore errors for last message
    }
    return null;
  }

  /**
   * Get chats with unread messages
   */
  public async getUnreadChats(accountId: number): Promise<ChatSummary[]> {
    const allChats = await this.listChats(accountId);
    return allChats.filter((chat) => chat.unreadCount > 0);
  }

  /**
   * Search for chats by name or content
   */
  public async searchChats(
    accountId: number,
    query: string,
  ): Promise<ChatSummary[]> {
    try {
      // getChatlistEntries returns number[] - array of chat IDs
      const chatListIds = await BackendRemote.rpc.getChatlistEntries(
        accountId,
        0,
        query, // queryStr
        null,
      );

      const summaries: ChatSummary[] = [];
      for (const chatId of chatListIds) {
        try {
          const chatInfo = await BackendRemote.rpc.getBasicChatInfo(
            accountId,
            chatId,
          );
          summaries.push({
            id: chatId,
            name: chatInfo.name,
            isGroup:
              chatInfo.chatType === C.DC_CHAT_TYPE_GROUP ||
              chatInfo.chatType === C.DC_CHAT_TYPE_BROADCAST,
            isArchived: chatInfo.archived,
            isMuted: chatInfo.isMuted,
            unreadCount: 0,
            lastMessageTimestamp: 0,
            lastMessagePreview: "",
            contactIds: [],
          });
        } catch (err) {
          log().warn(`Failed to get info for chat ${chatId}:`, err);
        }
      }

      return summaries;
    } catch (error) {
      log().error("Error searching chats:", error);
      return [];
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
        await this.uiBridge.selectChat(accountId, chatId);
      }

      // Get full chat info
      const fullChat = await BackendRemote.rpc.getFullChatById(
        accountId,
        chatId,
      );

      this.activeChat = {
        accountId,
        chatId,
        chat: fullChat,
        isLoading: false,
      };

      // Mark as seen
      await BackendRemote.rpc.markseenMsgs(accountId, []);

      log().info(`Opened chat ${chatId} for account ${accountId}`);
      return true;
    } catch (error) {
      log().error("Error opening chat:", error);
      return false;
    }
  }

  /**
   * Get the currently active chat
   */
  public getActiveChat(): ActiveChatState | null {
    return this.activeChat;
  }

  /**
   * Close/deselect the current chat
   */
  public closeChat(): void {
    if (this.uiBridge && this.uiBridge.unselectChat) {
      this.uiBridge.unselectChat();
    }
    this.activeChat = null;
    log().info("Closed active chat");
  }

  /**
   * Navigate to next chat with unread messages
   */
  public async navigateToNextUnread(accountId: number): Promise<boolean> {
    const unreadChats = await this.getUnreadChats(accountId);
    if (unreadChats.length > 0) {
      return this.openChat(accountId, unreadChats[0].id);
    }
    return false;
  }

  // ============================================================
  // CHAT CREATION
  // ============================================================

  /**
   * Create a new 1:1 chat with a contact
   */
  public async createChat(
    accountId: number,
    contactEmail: string,
  ): Promise<number | null> {
    try {
      // Create or get contact
      const contactId = await BackendRemote.rpc.createContact(
        accountId,
        contactEmail,
        contactEmail.split("@")[0], // Use email prefix as name
      );

      // Create chat with contact
      const chatId = await BackendRemote.rpc.createChatByContactId(
        accountId,
        contactId,
      );

      log().info(`Created chat ${chatId} with contact ${contactEmail}`);
      return chatId;
    } catch (error) {
      log().error("Error creating chat:", error);
      return null;
    }
  }

  /**
   * Create a new group chat
   */
  public async createGroupChat(
    accountId: number,
    name: string,
    memberEmails: string[],
  ): Promise<number | null> {
    try {
      // Create group
      const chatId = await BackendRemote.rpc.createGroupChat(
        accountId,
        name,
        false,
      );

      // Add members
      for (const email of memberEmails) {
        try {
          const contactId = await BackendRemote.rpc.createContact(
            accountId,
            email,
            email.split("@")[0],
          );
          await BackendRemote.rpc.addContactToChat(
            accountId,
            chatId,
            contactId,
          );
        } catch (err) {
          log().warn(`Failed to add ${email} to group:`, err);
        }
      }

      log().info(
        `Created group chat ${chatId} with ${memberEmails.length} members`,
      );
      return chatId;
    } catch (error) {
      log().error("Error creating group chat:", error);
      return null;
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
    text: string,
  ): Promise<number | null> {
    try {
      const msgId = await BackendRemote.rpc.miscSendTextMessage(
        accountId,
        chatId,
        text,
      );
      log().info(`Sent message to chat ${chatId}: "${text.slice(0, 50)}..."`);
      return msgId;
    } catch (error) {
      log().error("Error sending message:", error);
      return null;
    }
  }

  /**
   * Send a message to the currently active chat
   */
  public async sendToActiveChat(text: string): Promise<number | null> {
    if (!this.activeChat) {
      log().warn("No active chat to send message to");
      return null;
    }
    return this.sendMessage(
      this.activeChat.accountId,
      this.activeChat.chatId,
      text,
    );
  }

  /**
   * Schedule a message for later
   */
  public scheduleMessage(
    accountId: number,
    chatId: number,
    text: string,
    scheduledTime: number,
    reason: string,
  ): string {
    const id = `scheduled-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.scheduledMessages.push({
      id,
      accountId,
      chatId,
      text,
      scheduledTime,
      reason,
      status: "pending",
    });

    log().info(
      `Scheduled message for ${new Date(
        scheduledTime,
      ).toISOString()}: "${text.slice(0, 50)}..."`,
    );
    return id;
  }

  /**
   * Cancel a scheduled message
   */
  public cancelScheduledMessage(id: string): boolean {
    const msg = this.scheduledMessages.find((m) => m.id === id);
    if (msg && msg.status === "pending") {
      msg.status = "cancelled";
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled messages
   */
  public getScheduledMessages(): ScheduledMessage[] {
    return this.scheduledMessages.filter((m) => m.status === "pending");
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
    greeting: string,
  ): Promise<{ chatId: number; msgId: number } | null> {
    try {
      // Create or get chat
      let chatId = await this.createChat(accountId, contactEmail);
      if (!chatId) {
        // Try to find existing chat
        const chats = await this.searchChats(accountId, contactEmail);
        if (chats.length > 0) {
          chatId = chats[0].id;
        }
      }

      if (!chatId) {
        log().error("Could not create or find chat for:", contactEmail);
        return null;
      }

      // Open the chat
      await this.openChat(accountId, chatId);

      // Send greeting
      const msgId = await this.sendMessage(accountId, chatId, greeting);
      if (!msgId) {
        return null;
      }

      log().info(`Initiated conversation with ${contactEmail}`);
      return { chatId, msgId };
    } catch (error) {
      log().error("Error initiating conversation:", error);
      return null;
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
    ];
    return mentionPatterns.some((pattern) => pattern.test(messageText));
  }

  /**
   * Respond to being mentioned
   */
  public async respondToMention(
    accountId: number,
    chatId: number,
    originalMessage: string,
    response: string,
  ): Promise<number | null> {
    // Open the chat first
    await this.openChat(accountId, chatId);

    // Send response
    return this.sendMessage(accountId, chatId, response);
  }

  // ============================================================
  // CHAT WATCHING & MONITORING
  // ============================================================

  /**
   * Watch a specific chat for activity
   */
  public watchChat(
    accountId: number,
    chatId: number,
    callback: ChatWatchCallback,
  ): () => void {
    const key = `${accountId}:${chatId}`;

    if (!this.watchedChats.has(key)) {
      this.watchedChats.set(key, []);
    }

    this.watchedChats.get(key)!.push(callback);

    log().info(`Started watching chat ${chatId}`);

    // Return unwatch function
    return () => {
      const callbacks = this.watchedChats.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.watchedChats.delete(key);
        }
      }
    };
  }

  /**
   * Watch all chats for an account
   */
  public watchAllChats(
    accountId: number,
    callback: ChatWatchCallback,
  ): () => void {
    const key = `${accountId}:*`;

    if (!this.watchedChats.has(key)) {
      this.watchedChats.set(key, []);
    }

    this.watchedChats.get(key)!.push(callback);

    log().info(`Started watching all chats for account ${accountId}`);

    return () => {
      const callbacks = this.watchedChats.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // ============================================================
  // INTERNAL METHODS
  // ============================================================

  /**
   * Initialize event listeners for chat events
   */
  private initializeEventListeners(): void {
    // Listen for incoming messages
    BackendRemote.on(
      "IncomingMsg",
      (
        accountId: number,
        { chatId, msgId }: { chatId: number; msgId: number },
      ) => {
        this.notifyWatchers(accountId, chatId, "new_message", { msgId });
      },
    );

    // Listen for chat modifications
    BackendRemote.on(
      "ChatModified",
      (accountId: number, { chatId }: { chatId: number }) => {
        this.notifyWatchers(accountId, chatId, "modified", {});
        // Invalidate cache
        this.chatCache.delete(accountId.toString());
      },
    );

    // Listen for messages being read
    BackendRemote.on(
      "MsgsNoticed",
      (accountId: number, { chatId }: { chatId: number }) => {
        this.notifyWatchers(accountId, chatId, "read", {});
      },
    );

    log().info("Event listeners initialized");
  }

  /**
   * Notify watchers of chat events
   */
  private notifyWatchers(
    accountId: number,
    chatId: number,
    event: "new_message" | "typing" | "read" | "modified",
    data: any,
  ): void {
    // Notify specific chat watchers
    const specificKey = `${accountId}:${chatId}`;
    const specificCallbacks = this.watchedChats.get(specificKey) || [];
    specificCallbacks.forEach((cb) => cb(accountId, chatId, event, data));

    // Notify all-chat watchers
    const allKey = `${accountId}:*`;
    const allCallbacks = this.watchedChats.get(allKey) || [];
    allCallbacks.forEach((cb) => cb(accountId, chatId, event, data));
  }

  /**
   * Start the message scheduler
   */
  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      this.processScheduledMessages();
    }, 1000); // Check every second
  }

  /**
   * Process scheduled messages
   */
  private async processScheduledMessages(): Promise<void> {
    const now = Date.now();

    for (const msg of this.scheduledMessages) {
      if (msg.status === "pending" && msg.scheduledTime <= now) {
        try {
          await this.sendMessage(msg.accountId, msg.chatId, msg.text);
          msg.status = "sent";
          log().info(`Sent scheduled message: ${msg.id}`);
        } catch (error) {
          log().error(`Failed to send scheduled message ${msg.id}:`, error);
        }
      }
    }

    // Clean up old messages
    this.scheduledMessages = this.scheduledMessages.filter(
      (m) =>
        m.status === "pending" ||
        (m.status === "sent" && now - m.scheduledTime < 3600000),
    );
  }

  // ============================================================
  // CONTACT MANAGEMENT (NEW)
  // ============================================================

  /**
   * List all contacts for an account
   */
  public async listContacts(accountId: number): Promise<ContactSummary[]> {
    try {
      // Get all contact IDs first (much faster)
      const contactIds = await BackendRemote.rpc.getContactIds(
        accountId,
        0,
        null,
      );

      // Then get contact details
      const contacts = await BackendRemote.rpc.getContactsByIds(
        accountId,
        contactIds,
      );

      const contactSummaries: ContactSummary[] = [];

      for (const [id, contact] of Object.entries(contacts)) {
        if (contact) {
          contactSummaries.push({
            id: parseInt(id, 10),
            email: contact.address,
            name: contact.name,
            displayName: contact.displayName,
            profileImage: contact.profileImage || undefined,
            lastSeen: contact.lastSeen,
            isBlocked: contact.isBlocked,
            isVerified: contact.isVerified,
          });
        }
      }

      log().info(
        `Listed ${contactSummaries.length} contacts for account ${accountId}`,
      );
      return contactSummaries;
    } catch (error) {
      log().error("Error listing contacts:", error);
      return [];
    }
  }

  /**
   * Get detailed contact information
   */
  public async getContactInfo(
    accountId: number,
    contactId: number,
  ): Promise<{
    id: number;
    email: string;
    name: string;
    displayName: string;
    profileImage?: string;
    lastSeen?: number;
    isBlocked: boolean;
    isVerified: boolean;
    status?: string;
  } | null> {
    try {
      const contact = await BackendRemote.rpc.getContact(accountId, contactId);

      return {
        id: contactId,
        email: contact.address,
        name: contact.name,
        displayName: contact.displayName,
        profileImage: contact.profileImage || undefined,
        lastSeen: contact.lastSeen,
        isBlocked: contact.isBlocked,
        isVerified: contact.isVerified,
        status: contact.status || undefined,
      };
    } catch (error) {
      log().error(`Error getting contact ${contactId}:`, error);
      return null;
    }
  }

  /**
   * Create a new contact
   */
  public async createContact(
    accountId: number,
    email: string,
    name?: string,
  ): Promise<number | null> {
    try {
      const contactId = await BackendRemote.rpc.createContact(
        accountId,
        email,
        name || "",
      );
      log().info(`Created contact ${contactId} for ${email}`);
      return contactId;
    } catch (error) {
      log().error(`Error creating contact for ${email}:`, error);
      return null;
    }
  }

  /**
   * Search for contacts by name or email
   */
  public async searchContacts(
    accountId: number,
    query: string,
  ): Promise<
    {
      id: number;
      email: string;
      name: string;
      displayName: string;
    }[]
  > {
    try {
      // Get contact IDs matching query
      const contactIds = await BackendRemote.rpc.getContactIds(
        accountId,
        0,
        query,
      );

      // Get contact details
      const contacts = await BackendRemote.rpc.getContactsByIds(
        accountId,
        contactIds,
      );

      const results: {
        id: number;
        email: string;
        name: string;
        displayName: string;
      }[] = [];

      for (const [id, contact] of Object.entries(contacts)) {
        if (contact) {
          results.push({
            id: parseInt(id, 10),
            email: contact.address,
            name: contact.name,
            displayName: contact.displayName,
          });
        }
      }

      return results;
    } catch (error) {
      log().error("Error searching contacts:", error);
      return [];
    }
  }

  // ============================================================
  // CHAT HISTORY ACCESS (NEW)
  // ============================================================

  /**
   * Get chat history (recent messages)
   */
  public async getChatHistory(
    accountId: number,
    chatId: number,
    limit: number = 50,
    beforeMessageId?: number,
  ): Promise<MessageSummary[]> {
    try {
      // Get message IDs for the chat
      const messageIds = await BackendRemote.rpc.getMessageIds(
        accountId,
        chatId,
        false, // include info/special messages
        false, // include markers
      );

      // Limit the messages (most recent first)
      let idsToFetch: number[];

      if (beforeMessageId) {
        // Find the index of beforeMessageId and take messages before it
        const beforeIndex = messageIds.indexOf(beforeMessageId);
        if (beforeIndex > 0) {
          idsToFetch = messageIds.slice(
            Math.max(0, beforeIndex - limit),
            beforeIndex,
          );
        } else {
          idsToFetch = messageIds.slice(-limit);
        }
      } else {
        // Take the most recent messages
        idsToFetch = messageIds.slice(-limit);
      }

      const messages = [];

      for (const msgId of idsToFetch) {
        try {
          const msg = await BackendRemote.rpc.getMessage(accountId, msgId);

          // Get sender info
          let fromName = "Unknown";
          if (msg.fromId) {
            try {
              const contact = await BackendRemote.rpc.getContact(
                accountId,
                msg.fromId,
              );
              fromName = contact.displayName || contact.name || contact.address;
            } catch {
              // Use default
            }
          }

          messages.push({
            id: msgId,
            text: msg.text || "",
            fromId: msg.fromId,
            fromName,
            timestamp: msg.timestamp,
            isOutgoing: msg.fromId === 1, // fromId 1 is the logged-in user
            isInfo: msg.isInfo || false,
            hasAttachment: !!(msg.file || msg.webxdcInfo),
          });
        } catch (err) {
          log().warn(`Failed to get message ${msgId}:`, err);
        }
      }

      log().info(`Retrieved ${messages.length} messages from chat ${chatId}`);
      return messages;
    } catch (error) {
      log().error(`Error getting chat history for ${chatId}:`, error);
      return [];
    }
  }

  /**
   * Search within a specific chat
   */
  public async searchInChat(
    accountId: number,
    chatId: number,
    query: string,
    limit: number = 20,
  ): Promise<
    {
      id: number;
      text: string;
      fromName: string;
      timestamp: number;
      matchCount: number;
    }[]
  > {
    try {
      // Get all message IDs
      const messageIds = await BackendRemote.rpc.getMessageIds(
        accountId,
        chatId,
        false,
        false,
      );

      const results = [];
      const queryLower = query.toLowerCase();

      for (const msgId of messageIds) {
        if (results.length >= limit) break;

        try {
          const msg = await BackendRemote.rpc.getMessage(accountId, msgId);

          if (msg.text && msg.text.toLowerCase().includes(queryLower)) {
            // Get sender info
            let fromName = "Unknown";
            if (msg.fromId) {
              try {
                const contact = await BackendRemote.rpc.getContact(
                  accountId,
                  msg.fromId,
                );
                fromName =
                  contact.displayName || contact.name || contact.address;
              } catch {
                // Use default
              }
            }

            // Count matches
            const regex = new RegExp(query, "gi");
            const matches = msg.text.match(regex);

            results.push({
              id: msgId,
              text: msg.text,
              fromName,
              timestamp: msg.timestamp,
              matchCount: matches ? matches.length : 0,
            });
          }
        } catch (err) {
          // Skip messages that can't be read
        }
      }

      log().info(
        `Found ${results.length} messages matching "${query}" in chat ${chatId}`,
      );
      return results;
    } catch (error) {
      log().error(`Error searching in chat ${chatId}:`, error);
      return [];
    }
  }

  /**
   * Get a specific message by ID
   */
  public async getMessageById(
    accountId: number,
    messageId: number,
  ): Promise<{
    id: number;
    text: string;
    fromId: number;
    fromName: string;
    timestamp: number;
    isOutgoing: boolean;
    chatId: number;
    file?: string;
  } | null> {
    try {
      const msg = await BackendRemote.rpc.getMessage(accountId, messageId);

      // Get sender info
      let fromName = "Unknown";
      if (msg.fromId) {
        try {
          const contact = await BackendRemote.rpc.getContact(
            accountId,
            msg.fromId,
          );
          fromName = contact.displayName || contact.name || contact.address;
        } catch {
          // Use default
        }
      }

      return {
        id: messageId,
        text: msg.text || "",
        fromId: msg.fromId,
        fromName,
        timestamp: msg.timestamp,
        isOutgoing: msg.fromId === 1, // fromId 1 is the logged-in user
        chatId: msg.chatId,
        file: msg.file || undefined,
      };
    } catch (error) {
      log().error(`Error getting message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Get conversation context (for AI processing)
   * Returns recent messages formatted for LLM context
   */
  public async getConversationContext(
    accountId: number,
    chatId: number,
    messageCount: number = 20,
  ): Promise<string> {
    try {
      const messages = await this.getChatHistory(
        accountId,
        chatId,
        messageCount,
      );

      if (messages.length === 0) {
        return "No previous messages in this conversation.";
      }

      // Format messages for context
      const formatted = messages.map((msg) => {
        const timestamp = new Date(msg.timestamp * 1000).toLocaleTimeString();
        const direction = msg.isOutgoing ? "[You]" : `[${msg.fromName}]`;
        return `${timestamp} ${direction}: ${msg.text}`;
      });

      return formatted.join("\n");
    } catch (error) {
      log().error(`Error getting conversation context for ${chatId}:`, error);
      return "Unable to retrieve conversation context.";
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
    this.watchedChats.clear();
    this.chatCache.clear();
    this.scheduledMessages = [];
    log().info("ChatManager cleaned up");
  }
}

// Export lazy singleton getter (avoids initialization before logger is ready)
let _chatManagerInstance: DeepTreeEchoChatManager | null = null;
export function getChatManager(): DeepTreeEchoChatManager {
  if (!_chatManagerInstance) {
    _chatManagerInstance = DeepTreeEchoChatManager.getInstance();
  }
  return _chatManagerInstance;
}

// Use Proxy for backward compatibility - lazily initializes on first access
export const chatManager: DeepTreeEchoChatManager = new Proxy(
  {} as DeepTreeEchoChatManager,
  {
    get(_target, prop) {
      return (getChatManager() as any)[prop];
    },
  },
);

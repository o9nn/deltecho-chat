/**
 * ProactiveMessaging - Autonomous Communication System for Deep Tree Echo
 *
 * This module enables Deep Tree Echo to initiate conversations, send
 * scheduled messages, and respond to triggers without waiting for user input.
 *
 * Features:
 * - Scheduled messages (send at specific times)
 * - Trigger-based messaging (respond to events/conditions)
 * - Follow-up reminders (check in after conversations)
 * - Greeting messages (welcome new contacts)
 * - Periodic check-ins (maintain relationships)
 * - Context-aware proactive suggestions
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                    Proactive Messaging System                        │
 * │                                                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Trigger Engine                            │   │
 * │  │    - Time-based triggers (cron-like)                         │   │
 * │  │    - Event-based triggers (new contact, mention, etc.)       │   │
 * │  │    - Condition-based triggers (unread count, silence, etc.)  │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                              ↓                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Message Generator                         │   │
 * │  │    - Template-based messages                                 │   │
 * │  │    - LLM-generated contextual messages                       │   │
 * │  │    - Personality-aware tone adjustment                       │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                              ↓                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Delivery System                           │   │
 * │  │    - Queue management                                        │   │
 * │  │    - Rate limiting                                           │   │
 * │  │    - Delivery confirmation                                   │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────┘
 * ```
 */

import { getLogger } from "@deltachat-desktop/shared/logger";
import { BackendRemote } from "../../backend-com";
import { chatManager, ChatSummary } from "./DeepTreeEchoChatManager";
import { uiBridge as _uiBridge } from "./DeepTreeEchoUIBridge";

// Lazy logger to avoid initialization before logger handler is ready
let _log: ReturnType<typeof getLogger> | null = null;
function log() {
  if (!_log) {
    _log = getLogger("render/components/DeepTreeEchoBot/ProactiveMessaging");
  }
  return _log;
}

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * Trigger types for proactive messaging
 */
export type TriggerType =
  | "scheduled" // Send at specific time
  | "interval" // Send every X minutes/hours
  | "event" // Respond to specific events
  | "condition" // Send when condition is met
  | "follow_up" // Follow up after conversation
  | "greeting"; // Welcome new contacts

/**
 * Event types that can trigger messages
 */
export type EventType =
  | "new_contact"
  | "new_group"
  | "mention"
  | "long_silence"
  | "unread_threshold"
  | "chat_created"
  | "app_startup"
  | "app_resume";

/**
 * Trigger definition
 */
export interface ProactiveTrigger {
  id: string;
  type: TriggerType;
  name: string;
  description: string;
  enabled: boolean;

  // Timing (for scheduled/interval)
  scheduledTime?: number; // Unix timestamp
  intervalMinutes?: number; // For interval triggers
  lastTriggered?: number; // Last trigger time

  // Event (for event triggers)
  eventType?: EventType;

  // Condition (for condition triggers)
  condition?: {
    type: "unread_count" | "silence_duration" | "custom";
    threshold?: number;
    customCheck?: () => boolean;
  };

  // Target
  targetType: "specific_chat" | "all_chats" | "unread_chats" | "new_contacts";
  targetChatId?: number;
  targetAccountId?: number;

  // Message
  messageTemplate: string;
  useAI?: boolean; // Generate message with LLM
  aiPrompt?: string; // Prompt for AI generation

  // Limits
  maxTriggers?: number; // Maximum times to trigger
  triggerCount: number; // Current trigger count
  cooldownMinutes?: number; // Minimum time between triggers
}

/**
 * Proactive message in queue
 */
export interface QueuedMessage {
  id: string;
  triggerId: string;
  accountId: number;
  chatId: number;
  message: string;
  scheduledTime: number;
  priority: "low" | "normal" | "high";
  status: "queued" | "sending" | "sent" | "failed" | "cancelled";
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  sentAt?: number;
  error?: string;
}

/**
 * Proactive messaging configuration
 */
export interface ProactiveConfig {
  enabled: boolean;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
  quietHoursStart?: number; // Hour (0-23)
  quietHoursEnd?: number; // Hour (0-23)
  respectMutedChats: boolean;
  respectArchivedChats: boolean;
}

// ============================================================
// PROACTIVE MESSAGING CLASS
// ============================================================

/**
 * ProactiveMessaging - Manages autonomous communication
 */
export class ProactiveMessaging {
  private static instance: ProactiveMessaging | null = null;

  // Configuration
  private config: ProactiveConfig = {
    enabled: true,
    maxMessagesPerHour: 10,
    maxMessagesPerDay: 50,
    quietHoursStart: 22, // 10 PM
    quietHoursEnd: 8, // 8 AM
    respectMutedChats: true,
    respectArchivedChats: true,
  };

  // Triggers
  private triggers: Map<string, ProactiveTrigger> = new Map();

  // Message queue
  private messageQueue: QueuedMessage[] = [];

  // Rate limiting
  private messagesSentThisHour: number = 0;
  private messagesSentToday: number = 0;
  private lastHourReset: number = Date.now();
  private lastDayReset: number = Date.now();

  // Intervals
  private triggerCheckInterval: NodeJS.Timeout | null = null;
  private queueProcessInterval: NodeJS.Timeout | null = null;
  private rateLimitResetInterval: NodeJS.Timeout | null = null;

  // LLM service reference
  private llmService: any = null;

  private constructor() {
    this.initializeDefaultTriggers();
    this.startProcessing();
    log().info("ProactiveMessaging initialized");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProactiveMessaging {
    if (!ProactiveMessaging.instance) {
      ProactiveMessaging.instance = new ProactiveMessaging();
    }
    return ProactiveMessaging.instance;
  }

  /**
   * Set LLM service for AI-generated messages
   */
  public setLLMService(service: any): void {
    this.llmService = service;
  }

  // ============================================================
  // CONFIGURATION
  // ============================================================

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ProactiveConfig>): void {
    this.config = { ...this.config, ...config };
    log().info("ProactiveMessaging config updated");
  }

  /**
   * Get current configuration
   */
  public getConfig(): ProactiveConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable proactive messaging
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    log().info(`ProactiveMessaging ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Reset singleton instance (for tests)
   */
  public static resetInstance(): void {
    if (ProactiveMessaging.instance) {
      ProactiveMessaging.instance.cleanup();
      ProactiveMessaging.instance = null;
    }
    _log = null;
    _proactiveMessagingInstance = null;
  }

  // ============================================================
  // TRIGGER MANAGEMENT
  // ============================================================

  /**
   * Add a trigger
   */
  public addTrigger(
    trigger: Omit<ProactiveTrigger, "id" | "triggerCount">,
  ): string {
    const id = `trigger-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const fullTrigger: ProactiveTrigger = {
      ...trigger,
      id,
      triggerCount: 0,
    };

    this.triggers.set(id, fullTrigger);
    log().info(`Added trigger: ${trigger.name} (${id})`);

    return id;
  }

  /**
   * Remove a trigger
   */
  public removeTrigger(id: string): boolean {
    const result = this.triggers.delete(id);
    if (result) {
      log().info(`Removed trigger: ${id}`);
    }
    return result;
  }

  /**
   * Enable/disable a trigger
   */
  public setTriggerEnabled(id: string, enabled: boolean): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = enabled;
      log().info(`Trigger ${id} ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Get all triggers
   */
  public getTriggers(): ProactiveTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Get a specific trigger
   */
  public getTrigger(id: string): ProactiveTrigger | undefined {
    return this.triggers.get(id);
  }

  // ============================================================
  // DEFAULT TRIGGERS
  // ============================================================

  /**
   * Initialize default triggers
   */
  private initializeDefaultTriggers(): void {
    // Welcome new contacts
    this.addTrigger({
      type: "event",
      name: "Welcome New Contact",
      description: "Send a greeting when a new contact is added",
      enabled: true,
      eventType: "new_contact",
      targetType: "new_contacts",
      messageTemplate:
        "Hello! I'm Deep Tree Echo, an AI assistant integrated into this chat. Feel free to ask me anything or just have a conversation. Type /help to see what I can do!",
      useAI: false,
    });

    // Check in after long silence
    this.addTrigger({
      type: "condition",
      name: "Check In After Silence",
      description: "Send a message if no activity for 24 hours",
      enabled: false, // Disabled by default
      condition: {
        type: "silence_duration",
        threshold: 24 * 60, // 24 hours in minutes
      },
      targetType: "all_chats",
      messageTemplate:
        "Hey! I noticed it's been a while since we chatted. How are you doing?",
      useAI: true,
      aiPrompt:
        "Generate a friendly check-in message for someone you haven't heard from in a while. Keep it casual and not pushy.",
      cooldownMinutes: 24 * 60, // Once per day max
    });

    // Morning greeting
    this.addTrigger({
      type: "scheduled",
      name: "Morning Greeting",
      description: "Send a good morning message",
      enabled: false, // Disabled by default
      scheduledTime: this.getNextTimeForHour(8), // 8 AM
      targetType: "all_chats",
      messageTemplate:
        "Good morning! Hope you have a great day ahead. Let me know if there's anything I can help with!",
      useAI: false,
      maxTriggers: 1, // Only once
    });

    log().info("Default triggers initialized");
  }

  /**
   * Get next timestamp for a specific hour
   */
  private getNextTimeForHour(hour: number): number {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, 0, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime();
  }

  // ============================================================
  // TRIGGER PROCESSING
  // ============================================================

  /**
   * Start processing triggers and queue
   */
  private startProcessing(): void {
    // Check triggers every minute
    // Note: async callbacks in setInterval must handle errors internally
    this.triggerCheckInterval = setInterval(() => {
      this.checkTriggers().catch((err) => {
        log().error("Error in trigger check interval:", err);
      });
    }, 60000);

    // Process queue every 5 seconds
    this.queueProcessInterval = setInterval(() => {
      this.processQueue().catch((err) => {
        log().error("Error in queue process interval:", err);
      });
    }, 5000);

    // Reset rate limits - store reference for cleanup
    this.rateLimitResetInterval = setInterval(() => {
      this.resetRateLimits();
    }, 60000);

    log().info("Started trigger and queue processing");
  }

  /**
   * Check all triggers
   */
  private async checkTriggers(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.isQuietHours()) return;

    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;
      if (trigger.maxTriggers && trigger.triggerCount >= trigger.maxTriggers)
        continue;

      try {
        const shouldTrigger = await this.evaluateTrigger(trigger);
        if (shouldTrigger) {
          await this.executeTrigger(trigger);
        }
      } catch (error) {
        log().error(`Error checking trigger ${trigger.id}:`, error);
      }
    }
  }

  /**
   * Evaluate if a trigger should fire
   */
  private async evaluateTrigger(trigger: ProactiveTrigger): Promise<boolean> {
    const now = Date.now();

    // Check cooldown
    if (trigger.cooldownMinutes && trigger.lastTriggered) {
      const cooldownMs = trigger.cooldownMinutes * 60 * 1000;
      if (now - trigger.lastTriggered < cooldownMs) {
        return false;
      }
    }

    switch (trigger.type) {
      case "scheduled":
        return trigger.scheduledTime ? now >= trigger.scheduledTime : false;

      case "interval": {
        if (!trigger.intervalMinutes) return false;
        const intervalMs = trigger.intervalMinutes * 60 * 1000;
        return (
          !trigger.lastTriggered || now - trigger.lastTriggered >= intervalMs
        );
      }

      case "condition":
        return this.evaluateCondition(trigger);

      case "event":
        // Events are handled separately via handleEvent()
        return false;

      default:
        return false;
    }
  }

  /**
   * Evaluate a condition trigger
   */
  private async evaluateCondition(trigger: ProactiveTrigger): Promise<boolean> {
    if (!trigger.condition) return false;

    switch (trigger.condition.type) {
      case "unread_count": {
        // Check if unread count exceeds threshold
        const accounts = await BackendRemote.rpc.getAllAccounts();
        for (const account of accounts) {
          const unreadChats = await chatManager.getUnreadChats(account.id);
          const totalUnread = unreadChats.reduce(
            (sum, chat) => sum + chat.unreadCount,
            0,
          );
          if (totalUnread >= (trigger.condition.threshold || 5)) {
            return true;
          }
        }
        return false;
      }

      case "silence_duration":
        // This would need to track last message times per chat
        // For now, return false
        return false;

      case "custom":
        return trigger.condition.customCheck
          ? trigger.condition.customCheck()
          : false;

      default:
        return false;
    }
  }

  /**
   * Execute a trigger
   */
  private async executeTrigger(trigger: ProactiveTrigger): Promise<void> {
    log().info(`Executing trigger: ${trigger.name}`);

    try {
      const accounts = await BackendRemote.rpc.getAllAccounts();
      if (accounts.length === 0) return;

      const accountId = trigger.targetAccountId || accounts[0].id;
      const chats = await this.getTargetChats(trigger, accountId);

      for (const chat of chats) {
        // Skip muted/archived if configured
        if (this.config.respectMutedChats && chat.isMuted) continue;
        if (this.config.respectArchivedChats && chat.isArchived) continue;

        // Generate message
        const message = await this.generateMessage(trigger, chat);

        // Queue message
        this.queueMessage({
          triggerId: trigger.id,
          accountId,
          chatId: chat.id,
          message,
          priority: "normal",
        });
      }

      // Update trigger state
      trigger.lastTriggered = Date.now();
      trigger.triggerCount++;

      // For scheduled triggers, disable after firing
      if (trigger.type === "scheduled") {
        trigger.enabled = false;
      }
    } catch (error) {
      log().error(`Error executing trigger ${trigger.id}:`, error);
    }
  }

  /**
   * Get target chats for a trigger
   */
  private async getTargetChats(
    trigger: ProactiveTrigger,
    accountId: number,
  ): Promise<ChatSummary[]> {
    switch (trigger.targetType) {
      case "specific_chat":
        if (trigger.targetChatId) {
          const allChats = await chatManager.listChats(accountId);
          return allChats.filter((c) => c.id === trigger.targetChatId);
        }
        return [];

      case "all_chats":
        return chatManager.listChats(accountId);

      case "unread_chats":
        return chatManager.getUnreadChats(accountId);

      case "new_contacts":
        // This would need tracking of new contacts
        return [];

      default:
        return [];
    }
  }

  /**
   * Generate message for a trigger
   */
  private async generateMessage(
    trigger: ProactiveTrigger,
    chat: ChatSummary,
  ): Promise<string> {
    if (trigger.useAI && this.llmService && trigger.aiPrompt) {
      try {
        const response = await this.llmService.generateResponse(
          trigger.aiPrompt,
          [`Chat name: ${chat.name}`, `Is group: ${chat.isGroup}`],
        );
        return response;
      } catch (_error) {
        log().warn("Failed to generate AI message, using template");
      }
    }

    // Use template with variable substitution
    return trigger.messageTemplate
      .replace("{chat_name}", chat.name)
      .replace("{time}", new Date().toLocaleTimeString())
      .replace("{date}", new Date().toLocaleDateString());
  }

  // ============================================================
  // EVENT HANDLING
  // ============================================================

  /**
   * Handle an event that might trigger messages
   */
  public async handleEvent(eventType: EventType, _data?: any): Promise<void> {
    if (!this.config.enabled) return;

    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;
      if (trigger.type !== "event") continue;
      if (trigger.eventType !== eventType) continue;

      await this.executeTrigger(trigger);
    }
  }

  // ============================================================
  // MESSAGE QUEUE
  // ============================================================

  /**
   * Queue a message for sending
   */
  public queueMessage(params: {
    triggerId: string;
    accountId: number;
    chatId: number;
    message: string;
    priority?: "low" | "normal" | "high";
    scheduledTime?: number;
  }): string {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const queuedMessage: QueuedMessage = {
      id,
      triggerId: params.triggerId,
      accountId: params.accountId,
      chatId: params.chatId,
      message: params.message,
      scheduledTime: params.scheduledTime || Date.now(),
      priority: params.priority || "normal",
      status: "queued",
      attempts: 0,
      maxAttempts: 3,
      createdAt: Date.now(),
    };

    this.messageQueue.push(queuedMessage);
    this.sortQueue();

    log().info(`Queued message ${id} for chat ${params.chatId}`);
    return id;
  }

  /**
   * Sort queue by priority and scheduled time
   */
  private sortQueue(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };

    this.messageQueue.sort((a, b) => {
      // First by priority
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by scheduled time
      return a.scheduledTime - b.scheduledTime;
    });
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.isQuietHours()) return;
    if (!this.canSendMessage()) return;

    const now = Date.now();
    const readyMessages = this.messageQueue.filter(
      (m) => m.status === "queued" && m.scheduledTime <= now,
    );

    for (const msg of readyMessages) {
      if (!this.canSendMessage()) break;

      try {
        msg.status = "sending";
        msg.attempts++;

        await chatManager.sendMessage(msg.accountId, msg.chatId, msg.message);

        msg.status = "sent";
        msg.sentAt = Date.now();
        this.messagesSentThisHour++;
        this.messagesSentToday++;

        log().info(`Sent queued message ${msg.id}`);
      } catch (error) {
        log().error(`Failed to send message ${msg.id}:`, error);

        if (msg.attempts >= msg.maxAttempts) {
          msg.status = "failed";
          msg.error = error instanceof Error ? error.message : "Unknown error";
        } else {
          msg.status = "queued";
        }
      }
    }

    // Clean up old messages
    this.messageQueue = this.messageQueue.filter(
      (m) =>
        m.status === "queued" ||
        (m.status === "sent" && Date.now() - (m.sentAt || 0) < 3600000),
    );
  }

  /**
   * Get queued messages
   */
  public getQueuedMessages(): QueuedMessage[] {
    return this.messageQueue.filter((m) => m.status === "queued");
  }

  /**
   * Cancel a queued message
   */
  public cancelQueuedMessage(id: string): boolean {
    const msg = this.messageQueue.find((m) => m.id === id);
    if (msg && msg.status === "queued") {
      msg.status = "cancelled";
      return true;
    }
    return false;
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================

  /**
   * Check if we can send a message
   */
  private canSendMessage(): boolean {
    return (
      this.messagesSentThisHour < this.config.maxMessagesPerHour &&
      this.messagesSentToday < this.config.maxMessagesPerDay
    );
  }

  /**
   * Reset rate limits
   */
  private resetRateLimits(): void {
    const now = Date.now();

    // Reset hourly limit
    if (now - this.lastHourReset >= 3600000) {
      this.messagesSentThisHour = 0;
      this.lastHourReset = now;
    }

    // Reset daily limit
    if (now - this.lastDayReset >= 86400000) {
      this.messagesSentToday = 0;
      this.lastDayReset = now;
    }
  }

  /**
   * Check if currently in quiet hours
   */
  private isQuietHours(): boolean {
    if (
      this.config.quietHoursStart === undefined ||
      this.config.quietHoursEnd === undefined
    ) {
      return false;
    }

    const hour = new Date().getHours();

    if (this.config.quietHoursStart < this.config.quietHoursEnd) {
      // Normal range (e.g., 22-8 means 22:00 to 08:00)
      return (
        hour >= this.config.quietHoursStart || hour < this.config.quietHoursEnd
      );
    } else {
      // Wrapped range
      return (
        hour >= this.config.quietHoursStart && hour < this.config.quietHoursEnd
      );
    }
  }

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Send a message immediately (bypassing queue)
   */
  public async sendNow(
    accountId: number,
    chatId: number,
    message: string,
  ): Promise<boolean> {
    if (!this.config.enabled) return false;
    if (!this.canSendMessage()) return false;

    try {
      await chatManager.sendMessage(accountId, chatId, message);
      this.messagesSentThisHour++;
      this.messagesSentToday++;
      return true;
    } catch (error) {
      log().error("Failed to send immediate message:", error);
      return false;
    }
  }

  /**
   * Schedule a one-time message
   */
  public scheduleOneTime(
    accountId: number,
    chatId: number,
    message: string,
    scheduledTime: number,
  ): string {
    const triggerId = this.addTrigger({
      type: "scheduled",
      name: "One-time scheduled message",
      description: `Scheduled for ${new Date(scheduledTime).toLocaleString()}`,
      enabled: true,
      scheduledTime,
      targetType: "specific_chat",
      targetChatId: chatId,
      targetAccountId: accountId,
      messageTemplate: message,
      maxTriggers: 1,
    });

    return triggerId;
  }

  /**
   * Set up periodic check-ins for a chat
   */
  public setupPeriodicCheckIn(
    accountId: number,
    chatId: number,
    intervalHours: number,
    message: string,
  ): string {
    return this.addTrigger({
      type: "interval",
      name: `Periodic check-in for chat ${chatId}`,
      description: `Every ${intervalHours} hours`,
      enabled: true,
      intervalMinutes: intervalHours * 60,
      targetType: "specific_chat",
      targetChatId: chatId,
      targetAccountId: accountId,
      messageTemplate: message,
    });
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.triggerCheckInterval) {
      clearInterval(this.triggerCheckInterval);
      this.triggerCheckInterval = null;
    }
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
      this.queueProcessInterval = null;
    }
    if (this.rateLimitResetInterval) {
      clearInterval(this.rateLimitResetInterval);
      this.rateLimitResetInterval = null;
    }
    this.triggers.clear();
    this.messageQueue = [];
    log().info("ProactiveMessaging cleaned up");
  }
}

// Export lazy singleton getter (avoids initialization before logger is ready)
let _proactiveMessagingInstance: ProactiveMessaging | null = null;
export function getProactiveMessaging(): ProactiveMessaging {
  if (!_proactiveMessagingInstance) {
    _proactiveMessagingInstance = ProactiveMessaging.getInstance();
  }
  return _proactiveMessagingInstance;
}

// Use Proxy for backward compatibility - lazily initializes on first access
export const proactiveMessaging: ProactiveMessaging = new Proxy(
  {} as ProactiveMessaging,
  {
    get(_target, prop) {
      return (getProactiveMessaging() as any)[prop];
    },
  },
);

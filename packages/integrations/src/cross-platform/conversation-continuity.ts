/**
 * Cross-Platform Conversation Continuity
 *
 * Enables seamless conversation continuation across different platforms
 * by maintaining context and synchronizing conversation state.
 */

import { EventEmitter } from 'events';
import { Platform } from './presence-manager.js';

/**
 * Conversation participant
 */
export interface Participant {
    /** Unique user identifier (cross-platform) */
    userId: string;
    /** Platform-specific user ID */
    platformUserId: string;
    /** Platform where participant is active */
    platform: Platform;
    /** Display name */
    displayName: string;
    /** Username (if available) */
    username?: string;
    /** Avatar URL (if available) */
    avatarUrl?: string;
}

/**
 * Message in a cross-platform conversation
 */
export interface CrossPlatformMessage {
    /** Unique message ID */
    id: string;
    /** Conversation ID this message belongs to */
    conversationId: string;
    /** Message content */
    content: string;
    /** Sender information */
    sender: Participant;
    /** Timestamp */
    timestamp: Date;
    /** Platform where message originated */
    platform: Platform;
    /** Platform-specific message ID */
    platformMessageId: string;
    /** Message type */
    type: 'text' | 'voice' | 'image' | 'file' | 'system';
    /** Attachments */
    attachments?: MessageAttachment[];
    /** Reply reference */
    replyTo?: string;
    /** Metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
    id: string;
    type: 'image' | 'audio' | 'video' | 'file';
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
}

/**
 * Cross-platform conversation
 */
export interface CrossPlatformConversation {
    /** Unique conversation ID */
    id: string;
    /** Conversation title (if available) */
    title?: string;
    /** Participants */
    participants: Participant[];
    /** Platform chat IDs mapped to this conversation */
    platformChats: Map<Platform, string>;
    /** Recent messages (limited window) */
    recentMessages: CrossPlatformMessage[];
    /** Context summary for LLM */
    contextSummary: string;
    /** Last activity timestamp */
    lastActivity: Date;
    /** Created timestamp */
    created: Date;
    /** Metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Conversation context for cognitive processing
 */
export interface ConversationContext {
    conversationId: string;
    participant: Participant;
    recentMessages: CrossPlatformMessage[];
    contextSummary: string;
    platform: Platform;
    chatId: string;
}

/**
 * Platform user identifier mapping
 */
export interface UserMapping {
    /** Cross-platform user ID */
    userId: string;
    /** Platform-specific IDs */
    platforms: Map<Platform, string>;
    /** Display name */
    displayName: string;
    /** Primary platform */
    primaryPlatform: Platform;
}

/**
 * Conversation link request
 */
export interface LinkConversationRequest {
    /** Source conversation */
    sourceConversationId: string;
    /** Target platform */
    targetPlatform: Platform;
    /** Target chat ID */
    targetChatId: string;
}

/**
 * Conversation continuity events
 */
export enum ConversationEventType {
    CONVERSATION_CREATED = 'conversation:created',
    CONVERSATION_LINKED = 'conversation:linked',
    MESSAGE_RECEIVED = 'conversation:message_received',
    MESSAGE_SYNCED = 'conversation:message_synced',
    CONTEXT_UPDATED = 'conversation:context_updated',
    PARTICIPANT_JOINED = 'conversation:participant_joined',
    PARTICIPANT_LEFT = 'conversation:participant_left',
}

/**
 * Conversation event
 */
export interface ConversationEvent {
    type: ConversationEventType;
    conversationId: string;
    platform?: Platform;
    message?: CrossPlatformMessage;
    participant?: Participant;
    data?: unknown;
}

/**
 * Cross-Platform Conversation Manager
 */
export class ConversationContinuityManager extends EventEmitter {
    private conversations = new Map<string, CrossPlatformConversation>();
    private userMappings = new Map<string, UserMapping>();
    private platformChatIndex = new Map<string, string>(); // "platform:chatId" -> conversationId
    private maxRecentMessages: number;
    private debug: boolean;

    constructor(options: { maxRecentMessages?: number; debug?: boolean } = {}) {
        super();
        this.maxRecentMessages = options.maxRecentMessages ?? 50;
        this.debug = options.debug ?? false;
    }

    /**
     * Create or get conversation for a platform chat
     */
    getOrCreateConversation(
        platform: Platform,
        chatId: string,
        participant: Participant
    ): CrossPlatformConversation {
        const indexKey = `${platform}:${chatId}`;
        const existingId = this.platformChatIndex.get(indexKey);

        if (existingId && this.conversations.has(existingId)) {
            const conversation = this.conversations.get(existingId)!;
            // Update participant if not already in list
            if (!conversation.participants.find((p) => p.userId === participant.userId)) {
                conversation.participants.push(participant);
                this.emitEvent({
                    type: ConversationEventType.PARTICIPANT_JOINED,
                    conversationId: conversation.id,
                    platform,
                    participant,
                });
            }
            return conversation;
        }

        // Create new conversation
        const conversationId = this.generateConversationId();
        const conversation: CrossPlatformConversation = {
            id: conversationId,
            participants: [participant],
            platformChats: new Map([[platform, chatId]]),
            recentMessages: [],
            contextSummary: '',
            lastActivity: new Date(),
            created: new Date(),
        };

        this.conversations.set(conversationId, conversation);
        this.platformChatIndex.set(indexKey, conversationId);

        this.emitEvent({
            type: ConversationEventType.CONVERSATION_CREATED,
            conversationId,
            platform,
            participant,
        });

        return conversation;
    }

    /**
     * Link an existing conversation to another platform chat
     */
    linkConversation(request: LinkConversationRequest): void {
        const conversation = this.conversations.get(request.sourceConversationId);
        if (!conversation) {
            throw new Error(`Conversation not found: ${request.sourceConversationId}`);
        }

        const indexKey = `${request.targetPlatform}:${request.targetChatId}`;
        conversation.platformChats.set(request.targetPlatform, request.targetChatId);
        this.platformChatIndex.set(indexKey, conversation.id);

        this.emitEvent({
            type: ConversationEventType.CONVERSATION_LINKED,
            conversationId: conversation.id,
            platform: request.targetPlatform,
        });
    }

    /**
     * Add message to conversation
     */
    addMessage(message: CrossPlatformMessage): void {
        const conversation = this.conversations.get(message.conversationId);
        if (!conversation) {
            throw new Error(`Conversation not found: ${message.conversationId}`);
        }

        conversation.recentMessages.push(message);
        conversation.lastActivity = new Date();

        // Trim to max recent messages
        if (conversation.recentMessages.length > this.maxRecentMessages) {
            conversation.recentMessages = conversation.recentMessages.slice(-this.maxRecentMessages);
        }

        // Update context summary
        this.updateContextSummary(conversation);

        this.emitEvent({
            type: ConversationEventType.MESSAGE_RECEIVED,
            conversationId: conversation.id,
            platform: message.platform,
            message,
        });
    }

    /**
     * Get conversation context for cognitive processing
     */
    getConversationContext(
        platform: Platform,
        chatId: string,
        participant: Participant
    ): ConversationContext {
        const conversation = this.getOrCreateConversation(platform, chatId, participant);

        return {
            conversationId: conversation.id,
            participant,
            recentMessages: [...conversation.recentMessages],
            contextSummary: conversation.contextSummary,
            platform,
            chatId,
        };
    }

    /**
     * Get conversation by ID
     */
    getConversation(conversationId: string): CrossPlatformConversation | undefined {
        return this.conversations.get(conversationId);
    }

    /**
     * Find conversation by platform chat
     */
    findConversation(
        platform: Platform,
        chatId: string
    ): CrossPlatformConversation | undefined {
        const indexKey = `${platform}:${chatId}`;
        const conversationId = this.platformChatIndex.get(indexKey);
        return conversationId ? this.conversations.get(conversationId) : undefined;
    }

    /**
     * Map user across platforms
     */
    mapUser(
        crossPlatformUserId: string,
        platform: Platform,
        platformUserId: string,
        displayName: string
    ): void {
        let mapping = this.userMappings.get(crossPlatformUserId);

        if (!mapping) {
            mapping = {
                userId: crossPlatformUserId,
                platforms: new Map(),
                displayName,
                primaryPlatform: platform,
            };
            this.userMappings.set(crossPlatformUserId, mapping);
        }

        mapping.platforms.set(platform, platformUserId);
        mapping.displayName = displayName;
    }

    /**
     * Find cross-platform user ID from platform ID
     */
    findCrossPlatformUser(
        platform: Platform,
        platformUserId: string
    ): string | undefined {
        for (const [userId, mapping] of this.userMappings) {
            if (mapping.platforms.get(platform) === platformUserId) {
                return userId;
            }
        }
        return undefined;
    }

    /**
     * Get all conversations for a user
     */
    getUserConversations(userId: string): CrossPlatformConversation[] {
        return Array.from(this.conversations.values()).filter((conv) =>
            conv.participants.some((p) => p.userId === userId)
        );
    }

    /**
     * Sync message to linked platforms
     */
    async syncMessageToLinkedPlatforms(
        message: CrossPlatformMessage,
        sendCallback: (
            platform: Platform,
            chatId: string,
            content: string
        ) => Promise<void>
    ): Promise<void> {
        const conversation = this.conversations.get(message.conversationId);
        if (!conversation) return;

        for (const [platform, chatId] of conversation.platformChats) {
            // Skip the originating platform
            if (platform === message.platform) continue;

            try {
                const syncedContent = this.formatSyncedMessage(message);
                await sendCallback(platform, chatId, syncedContent);

                this.emitEvent({
                    type: ConversationEventType.MESSAGE_SYNCED,
                    conversationId: conversation.id,
                    platform,
                    message,
                });
            } catch (error) {
                this.log(`Failed to sync message to ${platform}: ${error}`);
            }
        }
    }

    /**
     * Format message for cross-platform sync
     */
    private formatSyncedMessage(message: CrossPlatformMessage): string {
        const platformOrigin = message.platform.charAt(0).toUpperCase() + message.platform.slice(1);
        return `[${platformOrigin}] ${message.sender.displayName}: ${message.content}`;
    }

    /**
     * Update context summary for conversation
     */
    private updateContextSummary(conversation: CrossPlatformConversation): void {
        const recentCount = Math.min(conversation.recentMessages.length, 10);
        const recent = conversation.recentMessages.slice(-recentCount);

        const summary = recent
            .map((m) => `${m.sender.displayName}: ${m.content.substring(0, 100)}`)
            .join('\n');

        conversation.contextSummary = summary;

        this.emitEvent({
            type: ConversationEventType.CONTEXT_UPDATED,
            conversationId: conversation.id,
        });
    }

    /**
     * Generate unique conversation ID
     */
    private generateConversationId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Emit conversation event
     */
    private emitEvent(event: ConversationEvent): void {
        this.emit('conversation_event', event);
        this.emit(event.type, event);
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalConversations: number;
        totalUsers: number;
        platformBreakdown: Record<string, number>;
    } {
        const platformBreakdown: Record<string, number> = {};

        for (const conv of this.conversations.values()) {
            for (const [platform] of conv.platformChats) {
                platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
            }
        }

        return {
            totalConversations: this.conversations.size,
            totalUsers: this.userMappings.size,
            platformBreakdown,
        };
    }

    private log(message: string): void {
        if (this.debug) {
            console.log(`[Conversation Continuity] ${message}`);
        }
    }
}

/**
 * Create conversation continuity manager
 */
export function createConversationManager(
    options?: { maxRecentMessages?: number; debug?: boolean }
): ConversationContinuityManager {
    return new ConversationContinuityManager(options);
}

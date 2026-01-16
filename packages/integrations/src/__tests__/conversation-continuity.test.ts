/**
 * Tests for Cross-Platform Conversation Continuity Manager
 */

import {
    ConversationContinuityManager,
    createConversationManager,
    ConversationEventType,
    type Participant,
    type CrossPlatformMessage,
} from '../cross-platform/conversation-continuity';
import { Platform } from '../cross-platform/presence-manager';

describe('ConversationContinuityManager', () => {
    let manager: ConversationContinuityManager;

    const mockParticipant: Participant = {
        userId: 'user_123',
        platformUserId: 'discord_456',
        platform: Platform.DISCORD,
        displayName: 'Test User',
        username: 'testuser',
    };

    const mockParticipant2: Participant = {
        userId: 'user_789',
        platformUserId: 'telegram_101',
        platform: Platform.TELEGRAM,
        displayName: 'Another User',
        username: 'anotheruser',
    };

    beforeEach(() => {
        manager = createConversationManager({ debug: false });
    });

    describe('Conversation Creation', () => {
        it('should create a new conversation', () => {
            const eventHandler = jest.fn();
            manager.on(ConversationEventType.CONVERSATION_CREATED, eventHandler);

            const conversation = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            expect(conversation.id).toBeDefined();
            expect(conversation.participants).toHaveLength(1);
            expect(conversation.participants[0].userId).toBe('user_123');
            expect(conversation.platformChats.get(Platform.DISCORD)).toBe('channel_123');
            expect(eventHandler).toHaveBeenCalled();
        });

        it('should return existing conversation for same platform/chat', () => {
            const conv1 = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            const conv2 = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            expect(conv1.id).toBe(conv2.id);
        });

        it('should add participant if not already in conversation', () => {
            const eventHandler = jest.fn();
            manager.on(ConversationEventType.PARTICIPANT_JOINED, eventHandler);

            const conv1 = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            const newParticipant: Participant = {
                userId: 'user_999',
                platformUserId: 'discord_999',
                platform: Platform.DISCORD,
                displayName: 'New User',
            };

            const conv2 = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                newParticipant
            );

            expect(conv2.participants).toHaveLength(2);
            expect(eventHandler).toHaveBeenCalled();
        });
    });

    describe('Conversation Linking', () => {
        it('should link conversation to another platform', () => {
            const eventHandler = jest.fn();
            manager.on(ConversationEventType.CONVERSATION_LINKED, eventHandler);

            const conversation = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            manager.linkConversation({
                sourceConversationId: conversation.id,
                targetPlatform: Platform.TELEGRAM,
                targetChatId: 'chat_456',
            });

            expect(conversation.platformChats.has(Platform.TELEGRAM)).toBe(true);
            expect(conversation.platformChats.get(Platform.TELEGRAM)).toBe('chat_456');
            expect(eventHandler).toHaveBeenCalled();
        });

        it('should find linked conversation from target platform', () => {
            const conversation = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            manager.linkConversation({
                sourceConversationId: conversation.id,
                targetPlatform: Platform.TELEGRAM,
                targetChatId: 'chat_456',
            });

            const found = manager.findConversation(Platform.TELEGRAM, 'chat_456');
            expect(found?.id).toBe(conversation.id);
        });

        it('should throw error for invalid conversation ID', () => {
            expect(() => {
                manager.linkConversation({
                    sourceConversationId: 'invalid_id',
                    targetPlatform: Platform.TELEGRAM,
                    targetChatId: 'chat_456',
                });
            }).toThrow('Conversation not found');
        });
    });

    describe('Message Management', () => {
        it('should add message to conversation', () => {
            const eventHandler = jest.fn();
            manager.on(ConversationEventType.MESSAGE_RECEIVED, eventHandler);

            const conversation = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            const message: CrossPlatformMessage = {
                id: 'msg_1',
                conversationId: conversation.id,
                content: 'Hello, world!',
                sender: mockParticipant,
                timestamp: new Date(),
                platform: Platform.DISCORD,
                platformMessageId: 'discord_msg_1',
                type: 'text',
            };

            manager.addMessage(message);

            expect(conversation.recentMessages).toHaveLength(1);
            expect(conversation.recentMessages[0].content).toBe('Hello, world!');
            expect(eventHandler).toHaveBeenCalled();
        });

        it('should trim messages to max limit', () => {
            manager = createConversationManager({ maxRecentMessages: 5 });

            const conversation = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            // Add 10 messages
            for (let i = 0; i < 10; i++) {
                manager.addMessage({
                    id: `msg_${i}`,
                    conversationId: conversation.id,
                    content: `Message ${i}`,
                    sender: mockParticipant,
                    timestamp: new Date(),
                    platform: Platform.DISCORD,
                    platformMessageId: `discord_msg_${i}`,
                    type: 'text',
                });
            }

            expect(conversation.recentMessages).toHaveLength(5);
            expect(conversation.recentMessages[0].content).toBe('Message 5');
        });

        it('should update context summary when message added', () => {
            const eventHandler = jest.fn();
            manager.on(ConversationEventType.CONTEXT_UPDATED, eventHandler);

            const conversation = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            manager.addMessage({
                id: 'msg_1',
                conversationId: conversation.id,
                content: 'Test message for context',
                sender: mockParticipant,
                timestamp: new Date(),
                platform: Platform.DISCORD,
                platformMessageId: 'discord_msg_1',
                type: 'text',
            });

            expect(conversation.contextSummary).toContain('Test message for context');
            expect(eventHandler).toHaveBeenCalled();
        });
    });

    describe('Conversation Context', () => {
        it('should get conversation context for processing', () => {
            const conversation = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            manager.addMessage({
                id: 'msg_1',
                conversationId: conversation.id,
                content: 'Hello!',
                sender: mockParticipant,
                timestamp: new Date(),
                platform: Platform.DISCORD,
                platformMessageId: 'discord_msg_1',
                type: 'text',
            });

            const context = manager.getConversationContext(
                Platform.DISCORD,
                'channel_123',
                mockParticipant
            );

            expect(context.conversationId).toBe(conversation.id);
            expect(context.recentMessages).toHaveLength(1);
            expect(context.platform).toBe(Platform.DISCORD);
            expect(context.chatId).toBe('channel_123');
        });
    });

    describe('User Mapping', () => {
        it('should map user across platforms', () => {
            manager.mapUser('cross_user_1', Platform.DISCORD, 'discord_456', 'Test User');
            manager.mapUser('cross_user_1', Platform.TELEGRAM, 'telegram_789', 'Test User');

            expect(manager.findCrossPlatformUser(Platform.DISCORD, 'discord_456')).toBe('cross_user_1');
            expect(manager.findCrossPlatformUser(Platform.TELEGRAM, 'telegram_789')).toBe('cross_user_1');
        });

        it('should return undefined for unmapped users', () => {
            expect(manager.findCrossPlatformUser(Platform.DISCORD, 'unknown')).toBeUndefined();
        });
    });

    describe('User Conversations', () => {
        it('should get all conversations for a user', () => {
            // Create two conversations with the same user
            const conv1 = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_1',
                mockParticipant
            );

            const conv2 = manager.getOrCreateConversation(
                Platform.DISCORD,
                'channel_2',
                mockParticipant
            );

            const conversations = manager.getUserConversations('user_123');

            expect(conversations).toHaveLength(2);
            expect(conversations.map(c => c.id)).toContain(conv1.id);
            expect(conversations.map(c => c.id)).toContain(conv2.id);
        });
    });

    describe('Statistics', () => {
        it('should return conversation statistics', () => {
            manager.getOrCreateConversation(Platform.DISCORD, 'channel_1', mockParticipant);
            manager.getOrCreateConversation(Platform.TELEGRAM, 'chat_1', mockParticipant2);
            manager.mapUser('user_123', Platform.DISCORD, 'discord_456', 'Test User');

            const stats = manager.getStats();

            expect(stats.totalConversations).toBe(2);
            expect(stats.totalUsers).toBe(1);
            expect(stats.platformBreakdown[Platform.DISCORD]).toBe(1);
            expect(stats.platformBreakdown[Platform.TELEGRAM]).toBe(1);
        });
    });
});

describe('createConversationManager', () => {
    it('should create manager with default options', () => {
        const manager = createConversationManager();
        expect(manager).toBeInstanceOf(ConversationContinuityManager);
    });

    it('should create manager with custom maxRecentMessages', () => {
        const manager = createConversationManager({ maxRecentMessages: 100 });
        expect(manager).toBeInstanceOf(ConversationContinuityManager);
    });
});

/**
 * Unified Message Tests
 */

import {
    UnifiedMessageHandler,
    createMessageHandler,
    formatMessagesForLLM,
    extractTopics,
} from '../unified-message';
import { UnifiedMessage, SentimentScore, EmotionalVector } from '../types';

describe('UnifiedMessageHandler', () => {
    let handler: UnifiedMessageHandler;

    beforeEach(() => {
        handler = new UnifiedMessageHandler();
    });

    describe('constructor', () => {
        it('should create with default max history', () => {
            expect(handler).toBeInstanceOf(UnifiedMessageHandler);
        });

        it('should accept custom max history', () => {
            const customHandler = new UnifiedMessageHandler(50);
            expect(customHandler).toBeInstanceOf(UnifiedMessageHandler);
        });
    });

    describe('createMessage', () => {
        it('should create user message', () => {
            const msg = handler.createMessage({
                role: 'user',
                content: 'Hello',
            });

            expect(msg.role).toBe('user');
            expect(msg.content).toBe('Hello');
            expect(msg.id).toBeDefined();
            expect(msg.timestamp).toBeDefined();
        });

        it('should use provided ID', () => {
            const msg = handler.createMessage({
                role: 'user',
                content: 'Hello',
                id: 'custom-id',
            });

            expect(msg.id).toBe('custom-id');
        });

        it('should include metadata', () => {
            const msg = handler.createMessage({
                role: 'user',
                content: 'Hello',
                metadata: { priority: 1 },
            });

            expect(msg.metadata.priority).toBe(1);
        });
    });

    describe('createUserMessage', () => {
        it('should create user message', () => {
            const msg = handler.createUserMessage('Hello');
            expect(msg.role).toBe('user');
            expect(msg.content).toBe('Hello');
        });
    });

    describe('createAssistantMessage', () => {
        it('should create assistant message', () => {
            const msg = handler.createAssistantMessage('Hi there!');
            expect(msg.role).toBe('assistant');
            expect(msg.content).toBe('Hi there!');
        });
    });

    describe('createSystemMessage', () => {
        it('should create system message', () => {
            const msg = handler.createSystemMessage('System prompt');
            expect(msg.role).toBe('system');
        });
    });

    describe('enrichWithSentiment', () => {
        it('should add sentiment to message', () => {
            const msg = handler.createUserMessage('I am happy');
            const sentiment: SentimentScore = {
                polarity: 0.8,
                positive: 1,
                negative: 0,
                confidence: 0.9,
                emotions: ['joy'],
            };

            const enriched = handler.enrichWithSentiment(msg, sentiment);
            expect(enriched.metadata.sentiment).toEqual(sentiment);
        });

        it('should not mutate original message', () => {
            const msg = handler.createUserMessage('Test');
            const sentiment: SentimentScore = {
                polarity: 0.5,
                positive: 1,
                negative: 0,
                confidence: 0.8,
                emotions: [],
            };

            handler.enrichWithSentiment(msg, sentiment);
            expect(msg.metadata.sentiment).toBeUndefined();
        });
    });

    describe('enrichWithEmotion', () => {
        it('should add emotion to message', () => {
            const msg = handler.createUserMessage('Test');
            const emotion: EmotionalVector = {
                joy: 0.8,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0.2,
                dominant: 'joy',
                valence: 0.8,
                arousal: 0.6,
            };

            const enriched = handler.enrichWithEmotion(msg, emotion);
            expect(enriched.metadata.emotion).toEqual(emotion);
        });
    });

    describe('enrichWithMemories', () => {
        it('should add memory references', () => {
            const msg = handler.createUserMessage('Test');
            const memories = ['mem-1', 'mem-2'];

            const enriched = handler.enrichWithMemories(msg, memories);
            expect(enriched.metadata.memoryReferences).toEqual(memories);
        });
    });

    describe('addToHistory', () => {
        it('should add message to history', () => {
            const msg = handler.createUserMessage('Hello');
            handler.addToHistory(msg);
            expect(handler.getHistoryLength()).toBe(1);
        });

        it('should enforce max history', () => {
            const smallHandler = new UnifiedMessageHandler(3);
            for (let i = 0; i < 5; i++) {
                smallHandler.addToHistory(smallHandler.createUserMessage(`Message ${i}`));
            }
            expect(smallHandler.getHistoryLength()).toBe(3);
        });
    });

    describe('getRecentMessages', () => {
        it('should return recent messages', () => {
            handler.addToHistory(handler.createUserMessage('First'));
            handler.addToHistory(handler.createUserMessage('Second'));
            handler.addToHistory(handler.createUserMessage('Third'));

            const recent = handler.getRecentMessages(2);
            expect(recent.length).toBe(2);
            expect(recent[0].content).toBe('Second');
            expect(recent[1].content).toBe('Third');
        });
    });

    describe('getMessagesByRole', () => {
        it('should filter by role', () => {
            handler.addToHistory(handler.createUserMessage('User 1'));
            handler.addToHistory(handler.createAssistantMessage('Assistant 1'));
            handler.addToHistory(handler.createUserMessage('User 2'));

            const userMsgs = handler.getMessagesByRole('user');
            expect(userMsgs.length).toBe(2);
        });
    });

    describe('getMessageById', () => {
        it('should find message by ID', () => {
            const msg = handler.createUserMessage('Find me');
            handler.addToHistory(msg);

            const found = handler.getMessageById(msg.id);
            expect(found).toEqual(msg);
        });

        it('should return undefined for not found', () => {
            const found = handler.getMessageById('non-existent');
            expect(found).toBeUndefined();
        });
    });

    describe('getContextString', () => {
        it('should format messages as context', () => {
            handler.addToHistory(handler.createUserMessage('Hello'));
            handler.addToHistory(handler.createAssistantMessage('Hi!'));

            const context = handler.getContextString();
            expect(context).toContain('user: Hello');
            expect(context).toContain('assistant: Hi!');
        });
    });

    describe('clearHistory', () => {
        it('should clear all history', () => {
            handler.addToHistory(handler.createUserMessage('Test'));
            handler.clearHistory();
            expect(handler.getHistoryLength()).toBe(0);
        });
    });

    describe('getStatistics', () => {
        it('should calculate statistics', () => {
            handler.addToHistory(handler.createUserMessage('User message'));
            handler.addToHistory(handler.createAssistantMessage('Bot response'));

            const stats = handler.getStatistics();
            expect(stats.totalMessages).toBe(2);
            expect(stats.userMessages).toBe(1);
            expect(stats.assistantMessages).toBe(1);
        });
    });

    describe('searchMessages', () => {
        it('should find messages by content', () => {
            handler.addToHistory(handler.createUserMessage('Hello world'));
            handler.addToHistory(handler.createUserMessage('Goodbye world'));
            handler.addToHistory(handler.createUserMessage('Hello again'));

            const results = handler.searchMessages('hello');
            expect(results.length).toBe(2);
        });
    });

    describe('exportHistory / importHistory', () => {
        it('should export and import history', () => {
            handler.addToHistory(handler.createUserMessage('Test 1'));
            handler.addToHistory(handler.createUserMessage('Test 2'));

            const exported = handler.exportHistory();

            const newHandler = new UnifiedMessageHandler();
            newHandler.importHistory(exported);

            expect(newHandler.getHistoryLength()).toBe(2);
        });
    });

    describe('factory function', () => {
        it('should create handler with createMessageHandler', () => {
            const h = createMessageHandler(50);
            expect(h).toBeInstanceOf(UnifiedMessageHandler);
        });
    });
});

describe('formatMessagesForLLM', () => {
    it('should format messages for LLM', () => {
        const messages: UnifiedMessage[] = [
            {
                id: '1',
                timestamp: Date.now(),
                role: 'user',
                content: 'Hello',
                metadata: {},
            },
            {
                id: '2',
                timestamp: Date.now(),
                role: 'assistant',
                content: 'Hi!',
                metadata: {},
            },
        ];

        const formatted = formatMessagesForLLM(messages);
        expect(formatted).toContain('USER: Hello');
        expect(formatted).toContain('ASSISTANT: Hi!');
    });

    it('should include timestamps when requested', () => {
        const messages: UnifiedMessage[] = [
            {
                id: '1',
                timestamp: Date.now(),
                role: 'user',
                content: 'Hello',
                metadata: {},
            },
        ];

        const formatted = formatMessagesForLLM(messages, { includeTimestamps: true });
        expect(formatted).toContain('[');
    });

    it('should respect max length', () => {
        const messages: UnifiedMessage[] = [
            {
                id: '1',
                timestamp: Date.now(),
                role: 'user',
                content: 'A'.repeat(1000),
                metadata: {},
            },
        ];

        const formatted = formatMessagesForLLM(messages, { maxLength: 100 });
        expect(formatted.length).toBeLessThanOrEqual(100);
    });
});

describe('extractTopics', () => {
    it('should extract topics from messages', () => {
        const messages: UnifiedMessage[] = [
            {
                id: '1',
                timestamp: Date.now(),
                role: 'user',
                content: 'I love programming and coding in JavaScript',
                metadata: {},
            },
            {
                id: '2',
                timestamp: Date.now(),
                role: 'user',
                content: 'Programming is great for building applications',
                metadata: {},
            },
        ];

        const topics = extractTopics(messages);
        expect(topics).toContain('programming');
    });

    it('should filter stop words', () => {
        const messages: UnifiedMessage[] = [
            {
                id: '1',
                timestamp: Date.now(),
                role: 'user',
                content: 'The quick brown fox jumps',
                metadata: {},
            },
        ];

        const topics = extractTopics(messages);
        expect(topics).not.toContain('the');
    });

    it('should limit results', () => {
        const messages: UnifiedMessage[] = [
            {
                id: '1',
                timestamp: Date.now(),
                role: 'user',
                content: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
                metadata: {},
            },
        ];

        const topics = extractTopics(messages);
        expect(topics.length).toBeLessThanOrEqual(10);
    });
});

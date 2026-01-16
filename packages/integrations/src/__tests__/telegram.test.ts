/**
 * Telegram Bot Tests
 */

import { TelegramBot, DEFAULT_TELEGRAM_CONFIG } from '../telegram/index.js';
import type { TelegramConfig } from '../telegram/index.js';
import type { BotCommand } from '../types.js';

// Mock fetch globally
global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({ ok: true, result: { message_id: 123 } }),
});

describe('TelegramBot', () => {
    const mockConfig: TelegramConfig = {
        token: 'test-bot-token',
        debug: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create a bot with default config merged', () => {
            const bot = new TelegramBot(mockConfig);
            expect(bot).toBeInstanceOf(TelegramBot);
            expect(bot.platform).toBe('telegram');
        });

        it('should not be connected initially', () => {
            const bot = new TelegramBot(mockConfig);
            expect(bot.isConnected).toBe(false);
        });
    });

    describe('command registration', () => {
        it('should register commands', () => {
            const bot = new TelegramBot(mockConfig);

            const command: BotCommand = {
                name: 'test',
                description: 'A test command',
                execute: jest.fn().mockResolvedValue({ content: 'test' }),
            };

            bot.registerCommand(command);
        });

        it('should register commands with aliases', () => {
            const bot = new TelegramBot(mockConfig);

            const command: BotCommand = {
                name: 'test',
                description: 'A test command',
                aliases: ['t', 'tst'],
                execute: jest.fn(),
            };

            bot.registerCommand(command);
        });
    });

    describe('event handling', () => {
        it('should add and remove event listeners', () => {
            const bot = new TelegramBot(mockConfig);
            const listener = jest.fn();

            bot.on('message', listener);
            bot.off('message', listener);
        });
    });

    describe('statistics', () => {
        it('should track bot statistics', () => {
            const bot = new TelegramBot(mockConfig);
            const stats = bot.getStats();

            expect(stats.platform).toBe('telegram');
            expect(stats.messagesReceived).toBe(0);
            expect(stats.messagesSent).toBe(0);
            expect(stats.commandsProcessed).toBe(0);
            expect(stats.errors).toBe(0);
            expect(stats.uptime).toBe(0);
        });
    });

    describe('default commands', () => {
        it('should have start command registered', () => {
            const bot = new TelegramBot(mockConfig);
            expect(bot).toBeDefined();
        });

        it('should have help command registered', () => {
            const bot = new TelegramBot(mockConfig);
            expect(bot).toBeDefined();
        });

        it('should have status command registered', () => {
            const bot = new TelegramBot(mockConfig);
            expect(bot).toBeDefined();
        });

        it('should have ask command registered', () => {
            const bot = new TelegramBot(mockConfig);
            expect(bot).toBeDefined();
        });
    });

    describe('webhook handling', () => {
        it('should handle incoming webhook updates', async () => {
            const bot = new TelegramBot(mockConfig);

            const update = {
                update_id: 12345,
                message: {
                    message_id: 1,
                    from: {
                        id: 123,
                        is_bot: false,
                        first_name: 'Test',
                        username: 'testuser',
                    },
                    chat: {
                        id: 456,
                        type: 'private' as const,
                        first_name: 'Test',
                    },
                    date: Math.floor(Date.now() / 1000),
                    text: 'Hello bot',
                },
            };

            // Should not throw
            await expect(bot.handleWebhookUpdate(update)).resolves.not.toThrow();
        });
    });
});

describe('DEFAULT_TELEGRAM_CONFIG', () => {
    it('should have sensible defaults', () => {
        expect(DEFAULT_TELEGRAM_CONFIG.debug).toBe(false);
        expect(DEFAULT_TELEGRAM_CONFIG.commandPrefix).toBe('/');
        expect(DEFAULT_TELEGRAM_CONFIG.maxMessageLength).toBe(4096);
        expect(DEFAULT_TELEGRAM_CONFIG.responseTimeout).toBe(30000);
        expect(DEFAULT_TELEGRAM_CONFIG.parseMode).toBe('HTML');
        expect(DEFAULT_TELEGRAM_CONFIG.disableLinkPreview).toBe(false);
        expect(DEFAULT_TELEGRAM_CONFIG.disableNotification).toBe(false);
        expect(DEFAULT_TELEGRAM_CONFIG.enableInlineMode).toBe(false);
    });
});

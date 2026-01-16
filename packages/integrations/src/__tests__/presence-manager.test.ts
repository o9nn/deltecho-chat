/**
 * Tests for Cross-Platform Unified Presence Manager
 */

import {
    UnifiedPresenceManager,
    createPresenceManager,
    Platform,
    PresenceStatus,
    ActivityType,
    PresenceEventType,
    type PresenceAdapter,
} from '../cross-platform/presence-manager';

describe('UnifiedPresenceManager', () => {
    let manager: UnifiedPresenceManager;

    beforeEach(() => {
        manager = createPresenceManager({ debug: false });
    });

    afterEach(() => {
        manager.destroy();
    });

    describe('Platform Registration', () => {
        it('should register a platform adapter', () => {
            const mockAdapter: PresenceAdapter = {
                platform: Platform.DISCORD,
                setStatus: jest.fn().mockResolvedValue(undefined),
                setActivity: jest.fn().mockResolvedValue(undefined),
                getStatus: jest.fn().mockResolvedValue(PresenceStatus.ONLINE),
                isConnected: jest.fn().mockReturnValue(true),
            };

            manager.registerAdapter(mockAdapter);

            const presence = manager.getUnifiedPresence();
            expect(presence.platforms.has(Platform.DISCORD)).toBe(true);
        });

        it('should initialize platform with offline status', () => {
            const mockAdapter: PresenceAdapter = {
                platform: Platform.TELEGRAM,
                setStatus: jest.fn().mockResolvedValue(undefined),
                setActivity: jest.fn().mockResolvedValue(undefined),
                getStatus: jest.fn().mockResolvedValue(PresenceStatus.OFFLINE),
                isConnected: jest.fn().mockReturnValue(false),
            };

            manager.registerAdapter(mockAdapter);

            const platformPresence = manager.getPlatformPresence(Platform.TELEGRAM);
            expect(platformPresence?.status).toBe(PresenceStatus.OFFLINE);
            expect(platformPresence?.connected).toBe(false);
        });
    });

    describe('Presence Updates', () => {
        it('should update platform presence', async () => {
            await manager.updatePresence({
                platform: Platform.DISCORD,
                status: PresenceStatus.ONLINE,
                activity: ActivityType.CHATTING,
                activityDescription: 'Responding to messages',
            });

            const platformPresence = manager.getPlatformPresence(Platform.DISCORD);
            expect(platformPresence?.status).toBe(PresenceStatus.ONLINE);
            expect(platformPresence?.activity).toBe(ActivityType.CHATTING);
            expect(platformPresence?.activityDescription).toBe('Responding to messages');
        });

        it('should emit STATUS_CHANGED event', async () => {
            const eventHandler = jest.fn();
            manager.on(PresenceEventType.STATUS_CHANGED, eventHandler);

            // First set offline
            await manager.updatePresence({
                platform: Platform.DISCORD,
                status: PresenceStatus.OFFLINE,
            });

            // Then set online - this should trigger the event
            await manager.updatePresence({
                platform: Platform.DISCORD,
                status: PresenceStatus.ONLINE,
            });

            expect(eventHandler).toHaveBeenCalled();
        });
    });

    describe('Connection Management', () => {
        it('should mark platform as connected', () => {
            const eventHandler = jest.fn();
            manager.on(PresenceEventType.PLATFORM_CONNECTED, eventHandler);

            manager.markConnected(Platform.DISCORD);

            const presence = manager.getPlatformPresence(Platform.DISCORD);
            expect(presence?.connected).toBe(true);
            expect(presence?.status).toBe(PresenceStatus.ONLINE);
            expect(eventHandler).toHaveBeenCalled();
        });

        it('should mark platform as disconnected', () => {
            const eventHandler = jest.fn();
            manager.on(PresenceEventType.PLATFORM_DISCONNECTED, eventHandler);

            // First connect
            manager.markConnected(Platform.DISCORD);
            // Then disconnect
            manager.markDisconnected(Platform.DISCORD);

            const presence = manager.getPlatformPresence(Platform.DISCORD);
            expect(presence?.connected).toBe(false);
            expect(presence?.status).toBe(PresenceStatus.OFFLINE);
            expect(eventHandler).toHaveBeenCalled();
        });
    });

    describe('Unified Presence', () => {
        it('should aggregate presence across platforms', async () => {
            // Set up multiple platforms
            await manager.updatePresence({
                platform: Platform.DISCORD,
                status: PresenceStatus.ONLINE,
                activity: ActivityType.CHATTING,
                activeConversations: 3,
            });

            await manager.updatePresence({
                platform: Platform.TELEGRAM,
                status: PresenceStatus.ONLINE,
                activity: ActivityType.IDLE,
                activeConversations: 2,
            });

            const unified = manager.getUnifiedPresence();

            expect(unified.globalStatus).toBe(PresenceStatus.ONLINE);
            expect(unified.totalActiveConversations).toBe(5);
            expect(unified.platforms.size).toBe(2);
        });

        it('should use highest priority status as global status', async () => {
            await manager.updatePresence({
                platform: Platform.DISCORD,
                status: PresenceStatus.ONLINE,
            });

            await manager.updatePresence({
                platform: Platform.TELEGRAM,
                status: PresenceStatus.IDLE,
            });

            const unified = manager.getUnifiedPresence();
            expect(unified.globalStatus).toBe(PresenceStatus.ONLINE);
        });

        it('should use most recent non-idle activity as global activity', async () => {
            await manager.updatePresence({
                platform: Platform.DISCORD,
                activity: ActivityType.IDLE,
            });

            await manager.updatePresence({
                platform: Platform.TELEGRAM,
                activity: ActivityType.SPEAKING,
                activityDescription: 'Voice call',
            });

            const unified = manager.getUnifiedPresence();
            expect(unified.globalActivity).toBe(ActivityType.SPEAKING);
            expect(unified.globalActivityDescription).toBe('Voice call');
        });
    });

    describe('Broadcast', () => {
        it('should broadcast status to all platforms', async () => {
            manager.markConnected(Platform.DISCORD);
            manager.markConnected(Platform.TELEGRAM);

            await manager.broadcastStatus(PresenceStatus.DND);

            expect(manager.getPlatformPresence(Platform.DISCORD)?.status).toBe(PresenceStatus.DND);
            expect(manager.getPlatformPresence(Platform.TELEGRAM)?.status).toBe(PresenceStatus.DND);
        });

        it('should broadcast activity to all platforms', async () => {
            manager.markConnected(Platform.DISCORD);
            manager.markConnected(Platform.TELEGRAM);

            await manager.broadcastActivity(ActivityType.THINKING, 'Processing...');

            expect(manager.getPlatformPresence(Platform.DISCORD)?.activity).toBe(ActivityType.THINKING);
            expect(manager.getPlatformPresence(Platform.TELEGRAM)?.activity).toBe(ActivityType.THINKING);
        });
    });
});

describe('createPresenceManager', () => {
    it('should create a presence manager instance', () => {
        const manager = createPresenceManager();
        expect(manager).toBeInstanceOf(UnifiedPresenceManager);
        manager.destroy();
    });

    it('should support debug option', () => {
        const manager = createPresenceManager({ debug: true });
        expect(manager).toBeInstanceOf(UnifiedPresenceManager);
        manager.destroy();
    });
});

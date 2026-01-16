/**
 * Unified Presence System for Deep Tree Echo
 *
 * Manages bot presence across multiple platforms (Discord, Telegram, etc.)
 * with synchronized state and activity tracking.
 */

import { EventEmitter } from 'events';

/**
 * Platform identifiers
 */
export enum Platform {
    DISCORD = 'discord',
    TELEGRAM = 'telegram',
    DELTACHAT = 'deltachat',
    WEB = 'web',
}

/**
 * Presence status options
 */
export enum PresenceStatus {
    ONLINE = 'online',
    IDLE = 'idle',
    DND = 'dnd',
    INVISIBLE = 'invisible',
    OFFLINE = 'offline',
}

/**
 * Activity type
 */
export enum ActivityType {
    CHATTING = 'chatting',
    THINKING = 'thinking',
    LISTENING = 'listening',
    SPEAKING = 'speaking',
    PROCESSING = 'processing',
    REMEMBERING = 'remembering',
    LEARNING = 'learning',
    IDLE = 'idle',
}

/**
 * Platform presence state
 */
export interface PlatformPresence {
    platform: Platform;
    status: PresenceStatus;
    activity: ActivityType;
    activityDescription?: string;
    lastSeen: Date;
    connected: boolean;
    activeConversations: number;
    metadata?: Record<string, unknown>;
}

/**
 * Unified presence state across all platforms
 */
export interface UnifiedPresence {
    globalStatus: PresenceStatus;
    globalActivity: ActivityType;
    globalActivityDescription?: string;
    platforms: Map<Platform, PlatformPresence>;
    totalActiveConversations: number;
    lastUpdated: Date;
}

/**
 * Presence update request
 */
export interface PresenceUpdate {
    platform: Platform;
    status?: PresenceStatus;
    activity?: ActivityType;
    activityDescription?: string;
    activeConversations?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Presence event types
 */
export enum PresenceEventType {
    STATUS_CHANGED = 'presence:status_changed',
    ACTIVITY_CHANGED = 'presence:activity_changed',
    PLATFORM_CONNECTED = 'presence:platform_connected',
    PLATFORM_DISCONNECTED = 'presence:platform_disconnected',
    SYNC_REQUIRED = 'presence:sync_required',
}

/**
 * Presence event
 */
export interface PresenceEvent {
    type: PresenceEventType;
    platform?: Platform;
    previousState?: PlatformPresence;
    newState?: PlatformPresence;
    unifiedPresence: UnifiedPresence;
}

/**
 * Platform presence adapter interface
 */
export interface PresenceAdapter {
    platform: Platform;
    setStatus(status: PresenceStatus): Promise<void>;
    setActivity(activity: ActivityType, description?: string): Promise<void>;
    getStatus(): Promise<PresenceStatus>;
    isConnected(): boolean;
}

/**
 * Unified Presence Manager
 */
export class UnifiedPresenceManager extends EventEmitter {
    private platforms = new Map<Platform, PlatformPresence>();
    private adapters = new Map<Platform, PresenceAdapter>();
    private syncInterval: NodeJS.Timeout | null = null;
    private debug: boolean;

    constructor(options: { debug?: boolean; syncIntervalMs?: number } = {}) {
        super();
        this.debug = options.debug ?? false;

        // Start periodic sync if interval specified
        if (options.syncIntervalMs) {
            this.startPeriodicSync(options.syncIntervalMs);
        }
    }

    /**
     * Register a platform adapter
     */
    registerAdapter(adapter: PresenceAdapter): void {
        this.adapters.set(adapter.platform, adapter);
        this.log(`Registered adapter for ${adapter.platform}`);

        // Initialize platform presence
        this.platforms.set(adapter.platform, {
            platform: adapter.platform,
            status: PresenceStatus.OFFLINE,
            activity: ActivityType.IDLE,
            lastSeen: new Date(),
            connected: false,
            activeConversations: 0,
        });
    }

    /**
     * Update presence for a specific platform
     */
    async updatePresence(update: PresenceUpdate): Promise<void> {
        const current = this.platforms.get(update.platform);
        const previousState = current ? { ...current } : undefined;

        const newState: PlatformPresence = {
            platform: update.platform,
            status: update.status ?? current?.status ?? PresenceStatus.ONLINE,
            activity: update.activity ?? current?.activity ?? ActivityType.IDLE,
            activityDescription: update.activityDescription ?? current?.activityDescription,
            lastSeen: new Date(),
            connected: true,
            activeConversations: update.activeConversations ?? current?.activeConversations ?? 0,
            metadata: update.metadata ?? current?.metadata,
        };

        this.platforms.set(update.platform, newState);

        // Update adapter if available
        const adapter = this.adapters.get(update.platform);
        if (adapter) {
            try {
                if (update.status) {
                    await adapter.setStatus(update.status);
                }
                if (update.activity) {
                    await adapter.setActivity(update.activity, update.activityDescription);
                }
            } catch (error) {
                this.log(`Failed to update adapter for ${update.platform}: ${error}`);
            }
        }

        // Emit event
        this.emitEvent({
            type: previousState?.status !== newState.status
                ? PresenceEventType.STATUS_CHANGED
                : PresenceEventType.ACTIVITY_CHANGED,
            platform: update.platform,
            previousState,
            newState,
            unifiedPresence: this.getUnifiedPresence(),
        });
    }

    /**
     * Mark platform as connected
     */
    markConnected(platform: Platform): void {
        const current = this.platforms.get(platform);
        if (current) {
            current.connected = true;
            current.status = PresenceStatus.ONLINE;
            current.lastSeen = new Date();
        } else {
            this.platforms.set(platform, {
                platform,
                status: PresenceStatus.ONLINE,
                activity: ActivityType.IDLE,
                lastSeen: new Date(),
                connected: true,
                activeConversations: 0,
            });
        }

        this.emitEvent({
            type: PresenceEventType.PLATFORM_CONNECTED,
            platform,
            newState: this.platforms.get(platform),
            unifiedPresence: this.getUnifiedPresence(),
        });
    }

    /**
     * Mark platform as disconnected
     */
    markDisconnected(platform: Platform): void {
        const current = this.platforms.get(platform);
        if (current) {
            current.connected = false;
            current.status = PresenceStatus.OFFLINE;
            current.lastSeen = new Date();
        }

        this.emitEvent({
            type: PresenceEventType.PLATFORM_DISCONNECTED,
            platform,
            newState: this.platforms.get(platform),
            unifiedPresence: this.getUnifiedPresence(),
        });
    }

    /**
     * Get unified presence across all platforms
     */
    getUnifiedPresence(): UnifiedPresence {
        const platformsArray = Array.from(this.platforms.values());

        // Determine global status (highest priority status)
        const statusPriority: PresenceStatus[] = [
            PresenceStatus.ONLINE,
            PresenceStatus.IDLE,
            PresenceStatus.DND,
            PresenceStatus.INVISIBLE,
            PresenceStatus.OFFLINE,
        ];

        let globalStatus = PresenceStatus.OFFLINE;
        for (const status of statusPriority) {
            if (platformsArray.some((p) => p.status === status)) {
                globalStatus = status;
                break;
            }
        }

        // Determine global activity (most recent non-idle activity)
        const activePlatforms = platformsArray
            .filter((p) => p.activity !== ActivityType.IDLE)
            .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

        const globalActivity = activePlatforms[0]?.activity ?? ActivityType.IDLE;
        const globalActivityDescription = activePlatforms[0]?.activityDescription;

        // Total conversations
        const totalActiveConversations = platformsArray.reduce(
            (sum, p) => sum + p.activeConversations,
            0
        );

        return {
            globalStatus,
            globalActivity,
            globalActivityDescription,
            platforms: new Map(this.platforms),
            totalActiveConversations,
            lastUpdated: new Date(),
        };
    }

    /**
     * Get presence for a specific platform
     */
    getPlatformPresence(platform: Platform): PlatformPresence | undefined {
        return this.platforms.get(platform);
    }

    /**
     * Broadcast status to all platforms
     */
    async broadcastStatus(status: PresenceStatus): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [platform] of this.platforms) {
            promises.push(
                this.updatePresence({ platform, status })
            );
        }

        await Promise.all(promises);
    }

    /**
     * Broadcast activity to all platforms
     */
    async broadcastActivity(
        activity: ActivityType,
        description?: string
    ): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [platform] of this.platforms) {
            promises.push(
                this.updatePresence({
                    platform,
                    activity,
                    activityDescription: description,
                })
            );
        }

        await Promise.all(promises);
    }

    /**
     * Start periodic sync with adapters
     */
    private startPeriodicSync(intervalMs: number): void {
        this.syncInterval = setInterval(async () => {
            await this.syncWithAdapters();
        }, intervalMs);
    }

    /**
     * Sync presence state with all adapters
     */
    async syncWithAdapters(): Promise<void> {
        for (const [platform, adapter] of this.adapters) {
            try {
                const status = await adapter.getStatus();
                const connected = adapter.isConnected();

                const current = this.platforms.get(platform);
                if (current && (current.status !== status || current.connected !== connected)) {
                    this.platforms.set(platform, {
                        ...current,
                        status,
                        connected,
                        lastSeen: new Date(),
                    });

                    this.emitEvent({
                        type: PresenceEventType.SYNC_REQUIRED,
                        platform,
                        unifiedPresence: this.getUnifiedPresence(),
                    });
                }
            } catch (error) {
                this.log(`Sync error for ${platform}: ${error}`);
            }
        }
    }

    /**
     * Emit presence event
     */
    private emitEvent(event: PresenceEvent): void {
        this.emit('presence_event', event);
        this.emit(event.type, event);
    }

    /**
     * Stop periodic sync and cleanup
     */
    destroy(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    private log(message: string): void {
        if (this.debug) {
            console.log(`[Presence Manager] ${message}`);
        }
    }
}

/**
 * Create unified presence manager
 */
export function createPresenceManager(
    options?: { debug?: boolean; syncIntervalMs?: number }
): UnifiedPresenceManager {
    return new UnifiedPresenceManager(options);
}

/**
 * Discord Voice Handler for Deep Tree Echo
 *
 * Provides voice channel connection, audio streaming,
 * and integration with @deltecho/voice for VAD and speech recognition.
 */

import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    StreamType,
    VoiceConnection,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';

/**
 * Voice connection state
 */
export interface VoiceConnectionState {
    /** Guild ID */
    guildId: string;
    /** Channel ID */
    channelId: string;
    /** Whether bot is connected */
    connected: boolean;
    /** Whether bot is speaking */
    speaking: boolean;
    /** Whether bot is listening */
    listening: boolean;
    /** Number of active listeners */
    activeListeners: number;
}

/**
 * Voice event types
 */
export enum VoiceEventType {
    CONNECTED = 'voice:connected',
    DISCONNECTED = 'voice:disconnected',
    SPEAKING_START = 'voice:speaking_start',
    SPEAKING_END = 'voice:speaking_end',
    USER_SPEAKING = 'voice:user_speaking',
    USER_STOPPED = 'voice:user_stopped',
    AUDIO_RECEIVED = 'voice:audio_received',
    TRANSCRIPTION = 'voice:transcription',
    ERROR = 'voice:error',
}

/**
 * Voice event data
 */
export interface VoiceEvent {
    type: VoiceEventType;
    guildId: string;
    channelId?: string;
    userId?: string;
    data?: unknown;
    error?: Error;
}

/**
 * Transcription result from voice activity
 */
export interface VoiceTranscription {
    userId: string;
    text: string;
    confidence: number;
    duration: number;
}

/**
 * Audio processor interface for STT integration
 */
export interface AudioProcessor {
    /**
     * Process audio buffer and return transcription
     */
    processAudio(buffer: Buffer, userId: string): Promise<VoiceTranscription | null>;
}

/**
 * TTS provider interface for voice synthesis
 */
export interface TTSProvider {
    /**
     * Synthesize text to audio stream
     */
    synthesize(text: string, emotion?: string): Promise<Readable>;
}

/**
 * Discord Voice Handler
 */
export class DiscordVoiceHandler extends EventEmitter {
    private connections = new Map<string, VoiceConnection>();
    private players = new Map<string, AudioPlayer>();
    private audioProcessor?: AudioProcessor;
    private ttsProvider?: TTSProvider;
    private debug: boolean;

    constructor(options: { debug?: boolean } = {}) {
        super();
        this.debug = options.debug ?? false;
    }

    /**
     * Set the audio processor for STT
     */
    setAudioProcessor(processor: AudioProcessor): void {
        this.audioProcessor = processor;
    }

    /**
     * Set the TTS provider for voice synthesis
     */
    setTTSProvider(provider: TTSProvider): void {
        this.ttsProvider = provider;
    }

    /**
     * Join a voice channel
     */
    async joinChannel(channel: VoiceBasedChannel): Promise<VoiceConnection> {
        const guildId = channel.guild.id;

        this.log(`Joining voice channel: ${channel.name} in ${channel.guild.name}`);

        // Leave existing connection in this guild
        await this.leaveChannel(guildId);

        // Create connection
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });

        // Wait for connection to be ready
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        } catch (error) {
            connection.destroy();
            throw new Error(`Failed to join voice channel: ${error}`);
        }

        // Store connection
        this.connections.set(guildId, connection);

        // Create audio player for this connection
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });

        connection.subscribe(player);
        this.players.set(guildId, player);

        // Set up event handlers
        this.setupConnectionEvents(connection, guildId, channel.id);
        this.setupPlayerEvents(player, guildId);
        this.setupReceiver(connection, guildId);

        this.emitEvent({
            type: VoiceEventType.CONNECTED,
            guildId,
            channelId: channel.id,
        });

        return connection;
    }

    /**
     * Leave a voice channel
     */
    async leaveChannel(guildId: string): Promise<void> {
        const connection = this.connections.get(guildId);
        const player = this.players.get(guildId);

        if (player) {
            player.stop();
            this.players.delete(guildId);
        }

        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);

            this.emitEvent({
                type: VoiceEventType.DISCONNECTED,
                guildId,
            });
        }
    }

    /**
     * Speak text in a voice channel using TTS
     */
    async speak(guildId: string, text: string, emotion?: string): Promise<void> {
        const player = this.players.get(guildId);

        if (!player) {
            throw new Error(`Not connected to voice in guild ${guildId}`);
        }

        if (!this.ttsProvider) {
            throw new Error('TTS provider not configured');
        }

        this.log(`Speaking in guild ${guildId}: "${text.substring(0, 50)}..."`);

        try {
            // Generate audio from text
            const audioStream = await this.ttsProvider.synthesize(text, emotion);

            // Create audio resource
            const resource = createAudioResource(audioStream, {
                inputType: StreamType.Arbitrary,
            });

            // Play audio
            player.play(resource);

            this.emitEvent({
                type: VoiceEventType.SPEAKING_START,
                guildId,
            });

            // Wait for playback to complete
            await entersState(player, AudioPlayerStatus.Idle, 5 * 60 * 1000);

            this.emitEvent({
                type: VoiceEventType.SPEAKING_END,
                guildId,
            });
        } catch (error) {
            this.emitEvent({
                type: VoiceEventType.ERROR,
                guildId,
                error: error instanceof Error ? error : new Error(String(error)),
            });
            throw error;
        }
    }

    /**
     * Play audio buffer in voice channel
     */
    async playAudio(guildId: string, buffer: Buffer): Promise<void> {
        const player = this.players.get(guildId);

        if (!player) {
            throw new Error(`Not connected to voice in guild ${guildId}`);
        }

        const stream = new PassThrough();
        stream.end(buffer);

        const resource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
        });

        player.play(resource);
        await entersState(player, AudioPlayerStatus.Idle, 5 * 60 * 1000);
    }

    /**
     * Stop playback in a voice channel
     */
    stopPlayback(guildId: string): void {
        const player = this.players.get(guildId);
        if (player) {
            player.stop();
        }
    }

    /**
     * Get connection state for a guild
     */
    getConnectionState(guildId: string): VoiceConnectionState | null {
        const connection = this.connections.get(guildId);
        const player = this.players.get(guildId);

        if (!connection) {
            return null;
        }

        return {
            guildId,
            channelId: connection.joinConfig.channelId || '',
            connected: connection.state.status === VoiceConnectionStatus.Ready,
            speaking: player?.state.status === AudioPlayerStatus.Playing || false,
            listening: true, // We're always listening when connected
            activeListeners: 0, // Updated by receiver events
        };
    }

    /**
     * Check if connected to voice in a guild
     */
    isConnected(guildId: string): boolean {
        const connection = this.connections.get(guildId);
        return connection?.state.status === VoiceConnectionStatus.Ready || false;
    }

    /**
     * Set up connection event handlers
     */
    private setupConnectionEvents(
        connection: VoiceConnection,
        guildId: string,
        channelId: string
    ): void {
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                // Try to reconnect
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                // Reconnection failed, clean up
                connection.destroy();
                this.connections.delete(guildId);
                this.players.delete(guildId);

                this.emitEvent({
                    type: VoiceEventType.DISCONNECTED,
                    guildId,
                    channelId,
                });
            }
        });

        connection.on('error', (error) => {
            this.emitEvent({
                type: VoiceEventType.ERROR,
                guildId,
                error,
            });
        });
    }

    /**
     * Set up player event handlers
     */
    private setupPlayerEvents(player: AudioPlayer, guildId: string): void {
        player.on('error', (error) => {
            this.emitEvent({
                type: VoiceEventType.ERROR,
                guildId,
                error,
            });
        });

        player.on(AudioPlayerStatus.Playing, () => {
            this.emitEvent({
                type: VoiceEventType.SPEAKING_START,
                guildId,
            });
        });

        player.on(AudioPlayerStatus.Idle, () => {
            this.emitEvent({
                type: VoiceEventType.SPEAKING_END,
                guildId,
            });
        });
    }

    /**
     * Set up audio receiver for listening to users
     */
    private setupReceiver(connection: VoiceConnection, guildId: string): void {
        const receiver = connection.receiver;

        // Track speaking users
        const activeUsers = new Map<string, Buffer[]>();

        receiver.speaking.on('start', (userId) => {
            this.log(`User ${userId} started speaking in ${guildId}`);

            activeUsers.set(userId, []);

            this.emitEvent({
                type: VoiceEventType.USER_SPEAKING,
                guildId,
                userId,
            });
        });

        receiver.speaking.on('end', async (userId) => {
            this.log(`User ${userId} stopped speaking in ${guildId}`);

            this.emitEvent({
                type: VoiceEventType.USER_STOPPED,
                guildId,
                userId,
            });

            // Process collected audio if we have an audio processor
            const audioChunks = activeUsers.get(userId);
            activeUsers.delete(userId);

            if (audioChunks && audioChunks.length > 0 && this.audioProcessor) {
                try {
                    const fullBuffer = Buffer.concat(audioChunks);
                    const transcription = await this.audioProcessor.processAudio(
                        fullBuffer,
                        userId
                    );

                    if (transcription) {
                        this.emitEvent({
                            type: VoiceEventType.TRANSCRIPTION,
                            guildId,
                            userId,
                            data: transcription,
                        });
                    }
                } catch (error) {
                    this.log(`Error processing audio from ${userId}: ${error}`);
                }
            }
        });

        // Subscribe to audio from all users
        // Note: This requires additional setup with opus streams
        // The discord.js voice system provides opus-encoded audio
    }

    /**
     * Emit a voice event
     */
    private emitEvent(event: VoiceEvent): void {
        this.emit('voice_event', event);
        this.emit(event.type, event);
    }

    /**
     * Log debug message
     */
    private log(message: string): void {
        if (this.debug) {
            console.log(`[Discord Voice] ${message}`);
        }
    }

    /**
     * Clean up all connections
     */
    async destroy(): Promise<void> {
        for (const [guildId] of this.connections) {
            await this.leaveChannel(guildId);
        }
    }
}

/**
 * Create a Discord voice handler
 */
export function createVoiceHandler(options?: { debug?: boolean }): DiscordVoiceHandler {
    return new DiscordVoiceHandler(options);
}

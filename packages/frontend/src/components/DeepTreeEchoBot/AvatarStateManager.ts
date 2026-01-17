/**
 * Avatar State Manager - Integration between DeepTreeEcho and Avatar
 *
 * This module provides functions to control the avatar state from the
 * DeepTreeEchoIntegration and other bot components.
 *
 * Enhanced with streaming lip-sync support for real-time LLM response
 * visualization - allows the avatar to start speaking incrementally as
 * tokens arrive from the LLM.
 */

import { AvatarProcessingState } from './DeepTreeEchoAvatarContext'
import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('render/components/DeepTreeEchoBot/AvatarStateManager')

/**
 * Mouth shape interface for streaming lip-sync
 */
export interface MouthShape {
    mouthOpen: number    // 0-1, vertical opening
    mouthWide: number    // 0-1, horizontal width
    lipRound: number     // 0-1, lip rounding (for O sounds)
    timestamp: number
}

/**
 * Streaming lip-sync state
 */
interface StreamingLipSyncState {
    isActive: boolean
    currentMouthShape: MouthShape
    onMouthShapeUpdate?: (shape: MouthShape) => void
}

// Singleton reference to the avatar context setter functions
// These will be set when the context is initialized
let avatarStateSetter: {
    setProcessingState?: (state: AvatarProcessingState) => void
    setIsSpeaking?: (speaking: boolean) => void
    setAudioLevel?: (level: number) => void
    setMouthShape?: (shape: MouthShape) => void
} = {}

// Streaming lip-sync state
const streamingState: StreamingLipSyncState = {
    isActive: false,
    currentMouthShape: { mouthOpen: 0, mouthWide: 0, lipRound: 0, timestamp: 0 },
}

/**
 * Register avatar state control functions
 * Called by the AvatarContext when it's initialized
 */
export function registerAvatarStateControl(
    setProcessingState: (state: AvatarProcessingState) => void,
    setIsSpeaking: (speaking: boolean) => void,
    setAudioLevel: (level: number) => void,
    setMouthShape?: (shape: MouthShape) => void
): void {
    avatarStateSetter = {
        setProcessingState,
        setIsSpeaking,
        setAudioLevel,
        setMouthShape,
    }
    log.info('Avatar state control registered')
}

/**
 * Update the avatar processing state
 */
export function setAvatarProcessingState(state: AvatarProcessingState): void {
    if (avatarStateSetter.setProcessingState) {
        avatarStateSetter.setProcessingState(state)
    }
}

/**
 * Update the avatar speaking state
 */
export function setAvatarSpeaking(speaking: boolean): void {
    if (avatarStateSetter.setIsSpeaking) {
        avatarStateSetter.setIsSpeaking(speaking)
    }
}

/**
 * Update the avatar audio level for lip sync
 */
export function setAvatarAudioLevel(level: number): void {
    if (avatarStateSetter.setAudioLevel) {
        avatarStateSetter.setAudioLevel(level)
    }
}

/**
 * Set avatar to idle state
 */
export function setAvatarIdle(): void {
    setAvatarProcessingState(AvatarProcessingState.IDLE)
    setAvatarSpeaking(false)
    setAvatarAudioLevel(0)
}

/**
 * Set avatar to listening state (when user is typing or sending)
 */
export function setAvatarListening(): void {
    setAvatarProcessingState(AvatarProcessingState.LISTENING)
    setAvatarSpeaking(false)
    setAvatarAudioLevel(0)
}

/**
 * Set avatar to thinking state (when bot is processing)
 */
export function setAvatarThinking(): void {
    setAvatarProcessingState(AvatarProcessingState.THINKING)
    setAvatarSpeaking(false)
    setAvatarAudioLevel(0)
}

/**
 * Set avatar to responding state (when bot is generating response)
 */
export function setAvatarResponding(): void {
    setAvatarProcessingState(AvatarProcessingState.RESPONDING)
    setAvatarSpeaking(true)
    // Simulate lip sync with random audio level
    simulateLipSync()
}

/**
 * Set avatar to error state
 */
export function setAvatarError(): void {
    setAvatarProcessingState(AvatarProcessingState.ERROR)
    setAvatarSpeaking(false)
    setAvatarAudioLevel(0)
}

/**
 * Simulate lip sync animation with random audio levels
 */
let lipSyncInterval: ReturnType<typeof setInterval> | null = null
function simulateLipSync(): void {
    // Clear any existing interval
    if (lipSyncInterval) {
        clearInterval(lipSyncInterval)
    }

    // Generate random audio levels to simulate speech
    lipSyncInterval = setInterval(() => {
        const level = Math.random() * 0.8 + 0.2 // Random between 0.2 and 1.0
        setAvatarAudioLevel(level)
    }, 100)

    // Stop after a short duration (will be replaced by actual response time)
    setTimeout(() => {
        if (lipSyncInterval) {
            clearInterval(lipSyncInterval)
            lipSyncInterval = null
        }
        setAvatarAudioLevel(0)
    }, 3000)
}

/**
 * Stop any ongoing lip sync simulation
 */
export function stopLipSync(): void {
    if (lipSyncInterval) {
        clearInterval(lipSyncInterval)
        lipSyncInterval = null
    }
    setAvatarAudioLevel(0)
    stopStreamingLipSync()
}

// ============================================================
// STREAMING LIP-SYNC SUPPORT
// ============================================================

/**
 * Start streaming lip-sync mode
 * Use this when processing streaming LLM responses
 */
export function startStreamingLipSync(): void {
    streamingState.isActive = true
    setAvatarProcessingState(AvatarProcessingState.RESPONDING)
    setAvatarSpeaking(true)
    log.info('Streaming lip-sync started')
}

/**
 * Stop streaming lip-sync mode
 */
export function stopStreamingLipSync(): void {
    streamingState.isActive = false
    streamingState.currentMouthShape = { mouthOpen: 0, mouthWide: 0, lipRound: 0, timestamp: 0 }
    if (avatarStateSetter.setMouthShape) {
        avatarStateSetter.setMouthShape(streamingState.currentMouthShape)
    }
    log.info('Streaming lip-sync stopped')
}

/**
 * Update mouth shape from streaming lip-sync controller
 * This is called at high frequency (30fps) during streaming
 */
export function updateStreamingMouthShape(shape: MouthShape): void {
    if (!streamingState.isActive) {
        return
    }

    streamingState.currentMouthShape = shape

    // Update via mouth shape setter if available
    if (avatarStateSetter.setMouthShape) {
        avatarStateSetter.setMouthShape(shape)
    }

    // Also update audio level for backward compatibility with existing avatar
    // Convert mouth shape to a single audio level value
    const audioLevel = Math.max(shape.mouthOpen, shape.mouthWide * 0.7, shape.lipRound * 0.5)
    setAvatarAudioLevel(audioLevel)

    // Call external listener if registered
    if (streamingState.onMouthShapeUpdate) {
        streamingState.onMouthShapeUpdate(shape)
    }
}

/**
 * Register a callback for mouth shape updates
 * Useful for external components that need real-time lip-sync data
 */
export function onMouthShapeUpdate(callback: (shape: MouthShape) => void): void {
    streamingState.onMouthShapeUpdate = callback
}

/**
 * Unregister mouth shape update callback
 */
export function offMouthShapeUpdate(): void {
    streamingState.onMouthShapeUpdate = undefined
}

/**
 * Get current mouth shape
 */
export function getCurrentMouthShape(): MouthShape {
    return { ...streamingState.currentMouthShape }
}

/**
 * Check if streaming lip-sync is active
 */
export function isStreamingLipSyncActive(): boolean {
    return streamingState.isActive
}

/**
 * Create an AvatarLipSyncReceiver interface for the streaming handler
 * This bridges the streaming handler to the avatar state manager
 */
export function createAvatarLipSyncReceiver(): {
    updateLipSync: (mouthShape: MouthShape) => void
    setSpeaking: (speaking: boolean) => void
    setThinking: (thinking: boolean) => void
    setExpression?: (expression: string, intensity?: number) => void
} {
    return {
        updateLipSync: (mouthShape: MouthShape) => {
            updateStreamingMouthShape(mouthShape)
        },
        setSpeaking: (speaking: boolean) => {
            setAvatarSpeaking(speaking)
            if (speaking) {
                setAvatarProcessingState(AvatarProcessingState.RESPONDING)
            }
        },
        setThinking: (thinking: boolean) => {
            if (thinking) {
                setAvatarThinking()
            }
        },
        // Expression support can be added when avatar supports it
        setExpression: undefined,
    }
}

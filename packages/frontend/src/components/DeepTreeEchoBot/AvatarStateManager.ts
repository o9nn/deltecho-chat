/**
 * Avatar State Manager - Integration between DeepTreeEcho and Avatar
 *
 * This module provides functions to control the avatar state from the
 * DeepTreeEchoIntegration and other bot components.
 */

import { AvatarProcessingState } from './DeepTreeEchoAvatarContext'
import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('render/components/DeepTreeEchoBot/AvatarStateManager')

// Singleton reference to the avatar context setter functions
// These will be set when the context is initialized
let avatarStateSetter: {
    setProcessingState?: (state: AvatarProcessingState) => void
    setIsSpeaking?: (speaking: boolean) => void
    setAudioLevel?: (level: number) => void
} = {}

/**
 * Register avatar state control functions
 * Called by the AvatarContext when it's initialized
 */
export function registerAvatarStateControl(
    setProcessingState: (state: AvatarProcessingState) => void,
    setIsSpeaking: (speaking: boolean) => void,
    setAudioLevel: (level: number) => void
): void {
    avatarStateSetter = {
        setProcessingState,
        setIsSpeaking,
        setAudioLevel,
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
}

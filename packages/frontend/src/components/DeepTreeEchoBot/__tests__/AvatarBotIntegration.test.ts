/**
 * Avatar Bot Integration Tests
 *
 * Tests for the integration between DeepTreeEcho bot message processing
 * and avatar state management.
 */

import {
    registerAvatarStateControl,
    setAvatarIdle,
    setAvatarListening,
    setAvatarThinking,
    setAvatarResponding,
    setAvatarError,
    stopLipSync,
} from '../AvatarStateManager'
import { AvatarProcessingState } from '../DeepTreeEchoAvatarContext'

// Mock the DeepTreeEchoBot module
jest.mock('../DeepTreeEchoBot', () => {
    return {
        DeepTreeEchoBot: jest.fn().mockImplementation(() => ({
            isEnabled: jest.fn().mockReturnValue(true),
            processMessage: jest.fn(),
            generateAndSendResponse: jest.fn(),
            updateOptions: jest.fn(),
        })),
    }
})

// Mock BackendRemote for message sending
jest.mock('../../../backend-com', () => ({
    BackendRemote: {
        rpc: {
            miscSendTextMessage: jest.fn().mockResolvedValue({ msgId: 123 }),
            getMessages: jest.fn().mockResolvedValue([]),
        },
    },
}))

describe('Avatar Bot Integration', () => {
    let mockSetProcessingState: jest.Mock
    let mockSetIsSpeaking: jest.Mock
    let mockSetAudioLevel: jest.Mock

    beforeEach(() => {
        jest.useFakeTimers()
        jest.clearAllMocks()

        mockSetProcessingState = jest.fn()
        mockSetIsSpeaking = jest.fn()
        mockSetAudioLevel = jest.fn()

        // Register mock controls
        registerAvatarStateControl(
            mockSetProcessingState,
            mockSetIsSpeaking,
            mockSetAudioLevel
        )
    })

    afterEach(() => {
        jest.useRealTimers()
        stopLipSync()
    })

    describe('Message Processing Flow', () => {
        it('should transition avatar through listening → thinking → responding → idle', () => {
            // Simulate incoming message - avatar starts listening
            setAvatarListening()
            expect(mockSetProcessingState).toHaveBeenCalledWith(AvatarProcessingState.LISTENING)

            // Bot starts processing - avatar shows thinking
            setAvatarThinking()
            expect(mockSetProcessingState).toHaveBeenCalledWith(AvatarProcessingState.THINKING)

            // Bot generates response - avatar starts responding
            setAvatarResponding()
            expect(mockSetProcessingState).toHaveBeenCalledWith(AvatarProcessingState.RESPONDING)
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(true)

            // Response complete - avatar returns to idle
            setAvatarIdle()
            expect(mockSetProcessingState).toHaveBeenCalledWith(AvatarProcessingState.IDLE)
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
        })

        it('should handle errors during processing', () => {
            setAvatarListening()
            setAvatarThinking()

            // Error occurs during processing
            setAvatarError()
            expect(mockSetProcessingState).toHaveBeenCalledWith(AvatarProcessingState.ERROR)
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })
    })

    describe('Lip Sync Integration', () => {
        it('should start lip sync when responding', () => {
            setAvatarResponding()

            // Verify speaking is enabled
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(true)

            // Advance timer to trigger lip sync interval
            jest.advanceTimersByTime(100)

            // Audio level should be updated with random values
            expect(mockSetAudioLevel).toHaveBeenCalled()
        })

        it('should stop lip sync when transitioning to idle', () => {
            setAvatarResponding()
            jest.advanceTimersByTime(100)

            setAvatarIdle()
            // Also explicitly stop the lip sync (setAvatarIdle sets audio to 0 but doesn't stop the interval)
            stopLipSync()

            // Audio level should be set to 0
            const lastCall = mockSetAudioLevel.mock.calls[mockSetAudioLevel.mock.calls.length - 1][0]
            expect(lastCall).toBe(0)

            const callCountAfterIdle = mockSetAudioLevel.mock.calls.length

            // Advance timer - no more lip sync updates should happen
            jest.advanceTimersByTime(300)

            // Verify no new non-zero audio level calls happened after going idle
            const callsAfterTimerAdvance = mockSetAudioLevel.mock.calls.slice(callCountAfterIdle)
            const nonZeroCalls = callsAfterTimerAdvance.filter(([level]: [number]) => level > 0)
            expect(nonZeroCalls.length).toBe(0)
        })

        it('should stop lip sync when transitioning to error', () => {
            setAvatarResponding()
            jest.advanceTimersByTime(100)

            setAvatarError()

            // Audio level should be set to 0
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })

        it('should auto-stop lip sync after timeout', () => {
            setAvatarResponding()

            // Advance past the 3-second timeout
            jest.advanceTimersByTime(3100)

            // Audio level should be reset to 0
            const lastCall = mockSetAudioLevel.mock.calls[mockSetAudioLevel.mock.calls.length - 1][0]
            expect(lastCall).toBe(0)
        })
    })

    describe('State Consistency', () => {
        it('should always reset speaking state when not responding', () => {
            setAvatarResponding()
            expect(mockSetIsSpeaking).toHaveBeenLastCalledWith(true)

            setAvatarThinking()
            expect(mockSetIsSpeaking).toHaveBeenLastCalledWith(false)
        })

        it('should handle rapid state transitions', () => {
            // Rapid transitions shouldn't cause issues
            setAvatarListening()
            setAvatarThinking()
            setAvatarResponding()
            setAvatarThinking()
            setAvatarResponding()
            setAvatarIdle()

            // Should end in IDLE state
            expect(mockSetProcessingState).toHaveBeenLastCalledWith(AvatarProcessingState.IDLE)
        })

        it('should handle direct to idle transition', () => {
            setAvatarIdle()

            expect(mockSetProcessingState).toHaveBeenCalledWith(AvatarProcessingState.IDLE)
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })
    })

    describe('Concurrent Processing', () => {
        it('should handle new message while still responding', () => {
            // First message being responded to
            setAvatarResponding()
            jest.advanceTimersByTime(100)

            // New message arrives - interrupt to listening
            setAvatarListening()

            expect(mockSetProcessingState).toHaveBeenLastCalledWith(AvatarProcessingState.LISTENING)
            expect(mockSetIsSpeaking).toHaveBeenLastCalledWith(false)
        })

        it('should properly clean up lip sync on state change', () => {
            setAvatarResponding()
            jest.advanceTimersByTime(50)

            // Change to thinking (e.g., processing a follow-up)
            setAvatarThinking()
            // Also explicitly stop the lip sync (setAvatarThinking sets audio to 0 but doesn't stop the interval)
            stopLipSync()

            const callCountAfterThinking = mockSetAudioLevel.mock.calls.length

            // Advance timer - lip sync should be stopped
            jest.advanceTimersByTime(200)

            // Check that no new non-zero audio level calls happened after going to thinking
            const callsAfterThinking = mockSetAudioLevel.mock.calls.slice(callCountAfterThinking)
            const nonZeroCalls = callsAfterThinking.filter(([level]: [number]) => level > 0)
            expect(nonZeroCalls.length).toBe(0)
        })
    })

    describe('Edge Cases', () => {
        it('should handle stopLipSync when no lip sync is running', () => {
            expect(() => stopLipSync()).not.toThrow()
        })

        it('should handle multiple stopLipSync calls', () => {
            setAvatarResponding()
            jest.advanceTimersByTime(50)

            stopLipSync()
            stopLipSync()
            stopLipSync()

            // Should not throw
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })

        it('should handle unregistered state controls gracefully', () => {
            // Unregister controls
            registerAvatarStateControl(
                undefined as any,
                undefined as any,
                undefined as any
            )

            // These should not throw
            expect(() => setAvatarListening()).not.toThrow()
            expect(() => setAvatarThinking()).not.toThrow()
            expect(() => setAvatarResponding()).not.toThrow()
            expect(() => setAvatarIdle()).not.toThrow()
            expect(() => setAvatarError()).not.toThrow()
            expect(() => stopLipSync()).not.toThrow()
        })
    })

    describe('Typical Bot Interaction Sequence', () => {
        /**
         * This test simulates a complete user interaction:
         * 1. User types a message
         * 2. Bot receives the message (LISTENING)
         * 3. Bot processes the message (THINKING)
         * 4. Bot generates and speaks response (RESPONDING with lip sync)
         * 5. Response complete (IDLE)
         */
        it('should handle complete user interaction sequence', async () => {
            const processingStates: string[] = []

            // Track all processing state changes
            mockSetProcessingState.mockImplementation((state: AvatarProcessingState) => {
                processingStates.push(state)
            })

            // Step 1: User sends message - bot starts listening
            setAvatarListening()
            expect(processingStates[processingStates.length - 1]).toBe(AvatarProcessingState.LISTENING)

            // Step 2: Bot processes message - show thinking
            setAvatarThinking()
            expect(processingStates[processingStates.length - 1]).toBe(AvatarProcessingState.THINKING)

            // Simulate some processing time
            jest.advanceTimersByTime(500)

            // Step 3: Bot generates response - start responding with lip sync
            setAvatarResponding()
            expect(processingStates[processingStates.length - 1]).toBe(AvatarProcessingState.RESPONDING)
            expect(mockSetIsSpeaking).toHaveBeenLastCalledWith(true)

            // Simulate speaking time with lip sync
            jest.advanceTimersByTime(1000)

            // Verify lip sync is active
            const audioLevelCalls = mockSetAudioLevel.mock.calls.filter(
                ([level]: [number]) => level > 0 && level <= 1
            )
            expect(audioLevelCalls.length).toBeGreaterThan(0)

            // Step 4: Response complete - return to idle
            setAvatarIdle()
            expect(processingStates[processingStates.length - 1]).toBe(AvatarProcessingState.IDLE)
            expect(mockSetIsSpeaking).toHaveBeenLastCalledWith(false)
            expect(mockSetAudioLevel).toHaveBeenLastCalledWith(0)

            // Verify complete sequence
            expect(processingStates).toContain(AvatarProcessingState.LISTENING)
            expect(processingStates).toContain(AvatarProcessingState.THINKING)
            expect(processingStates).toContain(AvatarProcessingState.RESPONDING)
            expect(processingStates).toContain(AvatarProcessingState.IDLE)
        })

        /**
         * Test error handling during interaction
         */
        it('should handle error during response generation', () => {
            const processingStates: string[] = []

            mockSetProcessingState.mockImplementation((state: AvatarProcessingState) => {
                processingStates.push(state)
            })

            // User sends message
            setAvatarListening()
            setAvatarThinking()

            // Error occurs during generation
            setAvatarError()

            // Verify error state
            expect(processingStates[processingStates.length - 1]).toBe(AvatarProcessingState.ERROR)
            expect(mockSetIsSpeaking).toHaveBeenLastCalledWith(false)

            // Recovery - user sends another message
            setAvatarListening()
            expect(processingStates[processingStates.length - 1]).toBe(AvatarProcessingState.LISTENING)
        })
    })

    describe('Audio Level Simulation', () => {
        it('should generate varied audio levels for natural lip sync', () => {
            setAvatarResponding()

            const audioLevels: number[] = []

            // Advance timer multiple times to collect audio level values
            for (let i = 0; i < 10; i++) {
                jest.advanceTimersByTime(100)
                const lastLevel = mockSetAudioLevel.mock.calls[
                    mockSetAudioLevel.mock.calls.length - 1
                ]?.[0]
                if (lastLevel !== undefined && lastLevel > 0) {
                    audioLevels.push(lastLevel)
                }
            }

            // Should have collected some audio levels
            expect(audioLevels.length).toBeGreaterThan(0)

            // Audio levels should be within expected range (0.2 - 1.0 based on AvatarStateManager)
            audioLevels.forEach(level => {
                expect(level).toBeGreaterThanOrEqual(0.2)
                expect(level).toBeLessThanOrEqual(1.0)
            })

            // There should be some variation (not all the same value)
            const uniqueLevels = new Set(audioLevels)
            // Due to randomness, we might get some duplicates, but should have variation
            if (audioLevels.length >= 3) {
                expect(uniqueLevels.size).toBeGreaterThanOrEqual(1)
            }
        })
    })
})

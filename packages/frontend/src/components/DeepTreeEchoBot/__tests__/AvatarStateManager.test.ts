/**
 * AvatarStateManager Tests
 *
 * Tests for the avatar state management integration between
 * DeepTreeEcho and the avatar display components.
 */

import {
    registerAvatarStateControl,
    setAvatarProcessingState,
    setAvatarSpeaking,
    setAvatarAudioLevel,
    setAvatarIdle,
    setAvatarListening,
    setAvatarThinking,
    setAvatarResponding,
    setAvatarError,
    stopLipSync,
} from '../AvatarStateManager'
import { AvatarProcessingState } from '../DeepTreeEchoAvatarContext'

describe('AvatarStateManager', () => {
    // Mock setter functions
    let mockSetProcessingState: jest.Mock
    let mockSetIsSpeaking: jest.Mock
    let mockSetAudioLevel: jest.Mock

    beforeEach(() => {
        jest.useFakeTimers()
        mockSetProcessingState = jest.fn()
        mockSetIsSpeaking = jest.fn()
        mockSetAudioLevel = jest.fn()

        // Register the mock functions
        registerAvatarStateControl(
            mockSetProcessingState,
            mockSetIsSpeaking,
            mockSetAudioLevel
        )
    })

    afterEach(() => {
        jest.useRealTimers()
        jest.clearAllMocks()
        // Clean up any intervals
        stopLipSync()
    })

    describe('registerAvatarStateControl', () => {
        it('should register control functions', () => {
            // Already registered in beforeEach
            // Verify by calling setAvatarIdle and checking mocks are called
            setAvatarIdle()
            expect(mockSetProcessingState).toHaveBeenCalled()
        })
    })

    describe('setAvatarProcessingState', () => {
        it('should call the registered processing state setter', () => {
            setAvatarProcessingState(AvatarProcessingState.THINKING)
            expect(mockSetProcessingState).toHaveBeenCalledWith(
                AvatarProcessingState.THINKING
            )
        })

        it('should not throw if setter is not registered', () => {
            // Unregister by registering empty values
            registerAvatarStateControl(
                undefined as any,
                undefined as any,
                undefined as any
            )
            expect(() =>
                setAvatarProcessingState(AvatarProcessingState.IDLE)
            ).not.toThrow()
        })
    })

    describe('setAvatarSpeaking', () => {
        it('should call the registered speaking state setter with true', () => {
            setAvatarSpeaking(true)
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(true)
        })

        it('should call the registered speaking state setter with false', () => {
            setAvatarSpeaking(false)
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
        })
    })

    describe('setAvatarAudioLevel', () => {
        it('should call the registered audio level setter', () => {
            setAvatarAudioLevel(0.5)
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0.5)
        })

        it('should handle edge values', () => {
            setAvatarAudioLevel(0)
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)

            setAvatarAudioLevel(1)
            expect(mockSetAudioLevel).toHaveBeenCalledWith(1)
        })
    })

    describe('setAvatarIdle', () => {
        it('should set processing state to IDLE', () => {
            setAvatarIdle()
            expect(mockSetProcessingState).toHaveBeenCalledWith(
                AvatarProcessingState.IDLE
            )
        })

        it('should stop speaking', () => {
            setAvatarIdle()
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
        })

        it('should set audio level to 0', () => {
            setAvatarIdle()
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })
    })

    describe('setAvatarListening', () => {
        it('should set processing state to LISTENING', () => {
            setAvatarListening()
            expect(mockSetProcessingState).toHaveBeenCalledWith(
                AvatarProcessingState.LISTENING
            )
        })

        it('should stop speaking', () => {
            setAvatarListening()
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
        })

        it('should set audio level to 0', () => {
            setAvatarListening()
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })
    })

    describe('setAvatarThinking', () => {
        it('should set processing state to THINKING', () => {
            setAvatarThinking()
            expect(mockSetProcessingState).toHaveBeenCalledWith(
                AvatarProcessingState.THINKING
            )
        })

        it('should stop speaking', () => {
            setAvatarThinking()
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
        })

        it('should set audio level to 0', () => {
            setAvatarThinking()
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })
    })

    describe('setAvatarResponding', () => {
        it('should set processing state to RESPONDING', () => {
            setAvatarResponding()
            expect(mockSetProcessingState).toHaveBeenCalledWith(
                AvatarProcessingState.RESPONDING
            )
        })

        it('should start speaking', () => {
            setAvatarResponding()
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(true)
        })

        it('should start lip sync simulation', () => {
            setAvatarResponding()

            // Advance timers to trigger lip sync interval
            jest.advanceTimersByTime(100)

            // Audio level should be updated with a random value between 0.2 and 1.0
            expect(mockSetAudioLevel).toHaveBeenCalled()
            const lastCall = mockSetAudioLevel.mock.calls[mockSetAudioLevel.mock.calls.length - 1][0]
            expect(lastCall).toBeGreaterThanOrEqual(0.2)
            expect(lastCall).toBeLessThanOrEqual(1.0)
        })

        it('should stop lip sync after 3 seconds', () => {
            setAvatarResponding()

            // Advance timers past the 3 second timeout
            jest.advanceTimersByTime(3100)

            // Audio level should have been reset to 0
            const lastCall = mockSetAudioLevel.mock.calls[mockSetAudioLevel.mock.calls.length - 1][0]
            expect(lastCall).toBe(0)
        })
    })

    describe('setAvatarError', () => {
        it('should set processing state to ERROR', () => {
            setAvatarError()
            expect(mockSetProcessingState).toHaveBeenCalledWith(
                AvatarProcessingState.ERROR
            )
        })

        it('should stop speaking', () => {
            setAvatarError()
            expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
        })

        it('should set audio level to 0', () => {
            setAvatarError()
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })
    })

    describe('stopLipSync', () => {
        it('should stop any ongoing lip sync', () => {
            // Start lip sync
            setAvatarResponding()
            jest.advanceTimersByTime(100)

            const callCount = mockSetAudioLevel.mock.calls.length

            // Stop lip sync
            stopLipSync()

            // Advance timers more
            jest.advanceTimersByTime(200)

            // Should have been called once more with 0 by stopLipSync
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
            // But no more lip sync updates should happen
            expect(mockSetAudioLevel.mock.calls.length).toBeLessThanOrEqual(callCount + 1)
        })

        it('should set audio level to 0', () => {
            stopLipSync()
            expect(mockSetAudioLevel).toHaveBeenCalledWith(0)
        })
    })

    describe('state transitions', () => {
        it('should handle rapid state changes', () => {
            setAvatarListening()
            setAvatarThinking()
            setAvatarResponding()
            setAvatarIdle()

            // Verify all states were set in order
            expect(mockSetProcessingState).toHaveBeenNthCalledWith(
                1,
                AvatarProcessingState.LISTENING
            )
            expect(mockSetProcessingState).toHaveBeenNthCalledWith(
                2,
                AvatarProcessingState.THINKING
            )
            expect(mockSetProcessingState).toHaveBeenNthCalledWith(
                3,
                AvatarProcessingState.RESPONDING
            )
            expect(mockSetProcessingState).toHaveBeenNthCalledWith(
                4,
                AvatarProcessingState.IDLE
            )
        })

        it('should clean up lip sync when transitioning away from responding', () => {
            setAvatarResponding()
            jest.advanceTimersByTime(50)

            // Transition to idle - this should stop lip sync
            setAvatarIdle()

            const callsAfterIdle = mockSetAudioLevel.mock.calls.length

            // Advance timers - no more lip sync updates should happen
            jest.advanceTimersByTime(200)

            // The last call should be 0 from setAvatarIdle
            expect(mockSetAudioLevel.mock.calls[callsAfterIdle - 1][0]).toBe(0)
        })
    })
})

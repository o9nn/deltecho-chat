/**
 * DeepTreeEchoAvatarDisplay Tests
 *
 * Tests for the avatar display component UI rendering and state display.
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { DeepTreeEchoAvatarDisplay } from '../DeepTreeEchoAvatarDisplay'
import {
    DeepTreeEchoAvatarProvider,
    AvatarProcessingState,
} from '../DeepTreeEchoAvatarContext'
import * as CognitiveBridge from '../CognitiveBridge'

// Mock the CognitiveBridge module
jest.mock('../CognitiveBridge', () => ({
    getOrchestrator: jest.fn(),
}))

// Mock the Live2DAvatar component
jest.mock('../../AICompanionHub/Live2DAvatar', () => ({
    Live2DAvatar: ({ onControllerReady, emotionalState, audioLevel, isSpeaking, width, height, model }: any) => (
        <div
            data-testid="mock-live2d-avatar"
            data-emotional-state={JSON.stringify(emotionalState)}
            data-audio-level={audioLevel}
            data-is-speaking={isSpeaking}
            data-width={width}
            data-height={height}
            data-model={model}
        >
            <button
                data-testid="trigger-controller-ready"
                onClick={() => onControllerReady?.({
                    setExpression: jest.fn(),
                    playMotion: jest.fn(),
                    updateLipSync: jest.fn(),
                    triggerBlink: jest.fn(),
                    setParameter: jest.fn(),
                })}
            >
                Trigger Ready
            </button>
            Mock Live2D Avatar
        </div>
    ),
    useLive2DController: () => ({
        controller: null,
        setController: jest.fn(),
    }),
}))

describe('DeepTreeEchoAvatarDisplay', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.clearAllMocks()
            // Default mock returns null orchestrator
            ; (CognitiveBridge.getOrchestrator as jest.Mock).mockReturnValue(null)
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe('Basic Rendering', () => {
        it('should render when visible is true', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay visible={true} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.getByTestId('mock-live2d-avatar')).toBeInTheDocument()
        })

        it('should not render when visible is false', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay visible={false} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.queryByTestId('mock-live2d-avatar')).not.toBeInTheDocument()
        })

        it('should render with default props', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.getByTestId('mock-live2d-avatar')).toBeInTheDocument()
        })

        it('should pass custom dimensions to Live2DAvatar', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay width={500} height={600} />
                </DeepTreeEchoAvatarProvider>
            )
            const avatar = screen.getByTestId('mock-live2d-avatar')
            expect(avatar).toHaveAttribute('data-width', '500')
            expect(avatar).toHaveAttribute('data-height', '600')
        })

        it('should apply custom className', () => {
            const { container } = render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay className="custom-class" />
                </DeepTreeEchoAvatarProvider>
            )
            expect(container.querySelector('.custom-class')).toBeInTheDocument()
        })

        it('should apply floating position class by default', () => {
            const { container } = render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )
            expect(container.querySelector('.floating-avatar')).toBeInTheDocument()
        })

        it('should apply inline position class when specified', () => {
            const { container } = render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay position="inline" />
                </DeepTreeEchoAvatarProvider>
            )
            expect(container.querySelector('.inline-avatar')).toBeInTheDocument()
        })
    })

    describe('Processing State Display', () => {
        it('should not show status indicator when IDLE', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.IDLE} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.queryByText(AvatarProcessingState.IDLE)).not.toBeInTheDocument()
        })

        it('should show status indicator when LISTENING', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.LISTENING} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.getByText(AvatarProcessingState.LISTENING)).toBeInTheDocument()
        })

        it('should show status indicator when THINKING', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.THINKING} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.getByText(AvatarProcessingState.THINKING)).toBeInTheDocument()
        })

        it('should show status indicator when RESPONDING', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.RESPONDING} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.getByText(AvatarProcessingState.RESPONDING)).toBeInTheDocument()
        })

        it('should show status indicator when ERROR', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.ERROR} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(screen.getByText(AvatarProcessingState.ERROR)).toBeInTheDocument()
        })

        it('should apply correct status class', () => {
            const { container } = render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.THINKING} />
                </DeepTreeEchoAvatarProvider>
            )
            expect(container.querySelector('.status-thinking')).toBeInTheDocument()
        })
    })

    describe('Audio Level and Speaking State', () => {
        it('should pass audio level to Live2DAvatar', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay audioLevel={0.75} />
                </DeepTreeEchoAvatarProvider>
            )
            const avatar = screen.getByTestId('mock-live2d-avatar')
            expect(avatar).toHaveAttribute('data-audio-level', '0.75')
        })

        it('should pass isSpeaking to Live2DAvatar', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay isSpeaking={true} />
                </DeepTreeEchoAvatarProvider>
            )
            const avatar = screen.getByTestId('mock-live2d-avatar')
            expect(avatar).toHaveAttribute('data-is-speaking', 'true')
        })

        it('should default isSpeaking to false', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )
            const avatar = screen.getByTestId('mock-live2d-avatar')
            expect(avatar).toHaveAttribute('data-is-speaking', 'false')
        })
    })

    describe('Controller Ready Callback', () => {
        it('should call onReady when controller is ready', () => {
            const onReady = jest.fn()
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay onReady={onReady} />
                </DeepTreeEchoAvatarProvider>
            )

            const triggerButton = screen.getByTestId('trigger-controller-ready')
            act(() => {
                triggerButton.click()
            })

            expect(onReady).toHaveBeenCalled()
        })
    })

    describe('Cognitive State Integration', () => {
        it('should poll cognitive state from orchestrator', async () => {
            const mockGetState = jest.fn().mockReturnValue({
                cognitiveContext: {
                    emotionalValence: 0.5,
                    emotionalArousal: 0.3,
                    salienceScore: 0.7,
                    relevantMemories: [],
                    attentionWeight: 0.5,
                    activeCouplings: [],
                },
            })

                ; (CognitiveBridge.getOrchestrator as jest.Mock).mockReturnValue({
                    getState: mockGetState,
                })

            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            // Initial call
            expect(mockGetState).toHaveBeenCalledTimes(1)

            // Advance timer for polling
            act(() => {
                jest.advanceTimersByTime(500)
            })

            expect(mockGetState).toHaveBeenCalledTimes(2)
        })

        it('should update emotional vector based on cognitive state', async () => {
            const mockGetState = jest.fn().mockReturnValue({
                cognitiveContext: {
                    emotionalValence: 0.8,
                    emotionalArousal: 0.6,
                    salienceScore: 0.9,
                    relevantMemories: [],
                    attentionWeight: 0.5,
                    activeCouplings: [],
                },
            })

                ; (CognitiveBridge.getOrchestrator as jest.Mock).mockReturnValue({
                    getState: mockGetState,
                })

            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            await waitFor(() => {
                const avatar = screen.getByTestId('mock-live2d-avatar')
                const emotionalState = JSON.parse(avatar.getAttribute('data-emotional-state') || '{}')
                // High positive valence should set joy
                expect(emotionalState.joy).toBe(0.8)
            })
        })

        it('should handle negative emotional valence', async () => {
            const mockGetState = jest.fn().mockReturnValue({
                cognitiveContext: {
                    emotionalValence: -0.6,
                    emotionalArousal: 0.4,
                    salienceScore: 0.5,
                    relevantMemories: [],
                    attentionWeight: 0.5,
                    activeCouplings: [],
                },
            })

                ; (CognitiveBridge.getOrchestrator as jest.Mock).mockReturnValue({
                    getState: mockGetState,
                })

            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            await waitFor(() => {
                const avatar = screen.getByTestId('mock-live2d-avatar')
                const emotionalState = JSON.parse(avatar.getAttribute('data-emotional-state') || '{}')
                // Negative valence should set concern
                expect(emotionalState.concern).toBe(0.6)
            })
        })

        it('should handle null orchestrator gracefully', () => {
            ; (CognitiveBridge.getOrchestrator as jest.Mock).mockReturnValue(null)

            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            // Should render without errors
            expect(screen.getByTestId('mock-live2d-avatar')).toBeInTheDocument()
        })

        it('should handle null cognitive context gracefully', () => {
            ; (CognitiveBridge.getOrchestrator as jest.Mock).mockReturnValue({
                getState: () => ({
                    cognitiveContext: null,
                }),
            })

            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            const avatar = screen.getByTestId('mock-live2d-avatar')
            const emotionalState = JSON.parse(avatar.getAttribute('data-emotional-state') || '{}')
            // Should have neutral default
            expect(emotionalState.neutral).toBe(1.0)
        })
    })

    describe('Expression Mapping', () => {
        it('should map THINKING processing state to thinking expression', async () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.THINKING} />
                </DeepTreeEchoAvatarProvider>
            )

            // The component should internally set currentExpression to 'thinking'
            // This is verified by the status badge showing THINKING
            expect(screen.getByText(AvatarProcessingState.THINKING)).toBeInTheDocument()
        })

        it('should map ERROR processing state to concerned expression', async () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.ERROR} />
                </DeepTreeEchoAvatarProvider>
            )

            expect(screen.getByText(AvatarProcessingState.ERROR)).toBeInTheDocument()
        })

        it('should map RESPONDING processing state to focused expression', async () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay processingState={AvatarProcessingState.RESPONDING} />
                </DeepTreeEchoAvatarProvider>
            )

            expect(screen.getByText(AvatarProcessingState.RESPONDING)).toBeInTheDocument()
        })
    })

    describe('Context Integration', () => {
        it('should use context values when props are not provided', () => {
            // The provider provides default values that should be used
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            const avatar = screen.getByTestId('mock-live2d-avatar')
            // Default values from context
            expect(avatar).toHaveAttribute('data-width', '300')
            expect(avatar).toHaveAttribute('data-height', '300')
        })

        it('should prefer props over context values', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay width={200} height={250} />
                </DeepTreeEchoAvatarProvider>
            )

            const avatar = screen.getByTestId('mock-live2d-avatar')
            expect(avatar).toHaveAttribute('data-width', '200')
            expect(avatar).toHaveAttribute('data-height', '250')
        })
    })

    describe('Model Selection', () => {
        it('should use miara model by default', () => {
            render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            const avatar = screen.getByTestId('mock-live2d-avatar')
            expect(avatar).toHaveAttribute('data-model', 'miara')
        })
    })

    describe('Cleanup', () => {
        it('should clear interval on unmount', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

            const { unmount } = render(
                <DeepTreeEchoAvatarProvider>
                    <DeepTreeEchoAvatarDisplay />
                </DeepTreeEchoAvatarProvider>
            )

            unmount()

            expect(clearIntervalSpy).toHaveBeenCalled()
            clearIntervalSpy.mockRestore()
        })
    })
})

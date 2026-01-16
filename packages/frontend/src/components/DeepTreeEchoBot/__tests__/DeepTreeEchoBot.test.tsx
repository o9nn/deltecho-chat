import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import DeepTreeEchoBot from '../DeepTreeEchoBot'

// Mock the cognitive modules to avoid complex initializations in tests
jest.mock('../HyperDimensionalMemory', () => ({
  HyperDimensionalMemory: class MockHyperDimensionalMemory {
    storeMemory = jest.fn()
    recallMemories = jest.fn().mockReturnValue([])
    exportMemoryState = jest.fn().mockReturnValue({})
    importMemoryState = jest.fn()
  },
}))

jest.mock('../AdaptivePersonality', () => ({
  AdaptivePersonality: class MockAdaptivePersonality {
    adaptToSocialContext = jest.fn()
    recordInteraction = jest.fn()
    getCurrentPersonality = jest.fn().mockReturnValue({})
    getCurrentEmotionalState = jest.fn().mockReturnValue({
      joy: 0.6,
      trust: 0.7,
      anticipation: 0.5,
      sadness: 0.1,
      fear: 0.1,
      balance: 0.8,
    })
    getDominantTraits = jest
      .fn()
      .mockReturnValue(['openness', 'creativity', 'empathy'])
    analyzePersonalityEvolution = jest.fn().mockReturnValue({
      stabilityScore: 0.8,
      adaptabilityScore: 0.7,
      dominantTraits: ['openness', 'creativity', 'empathy'],
      emergentPatterns: [],
    })
    exportState = jest.fn().mockReturnValue({})
    importState = jest.fn()
  },
}))

jest.mock('../QuantumBeliefPropagation', () => ({
  QuantumBeliefPropagation: class MockQuantumBeliefPropagation {
    addBelief = jest.fn()
    getRelevantBeliefs = jest.fn().mockReturnValue([])
    inferBeliefs = jest.fn()
    evaluateCoherence = jest.fn().mockReturnValue({
      overallCoherence: 0.9,
      contradictions: [],
      strongestBeliefs: ['Knowledge evolves through conversation'],
    })
    exportBeliefNetwork = jest.fn().mockReturnValue({})
    importBeliefNetwork = jest.fn()
  },
}))

jest.mock('../EmotionalIntelligence', () => ({
  EmotionalIntelligence: class MockEmotionalIntelligence {
    analyzeEmotion = jest.fn().mockReturnValue({
      arousal: 0.6,
      valence: 0.7,
      dominantEmotion: 'joy',
    })
    generateEmotionalResponseParameters = jest.fn().mockReturnValue({
      tone: 'cheerful',
      intensity: 0.7,
      empathyLevel: 0.8,
      suggestedPhrases: [
        'I understand',
        'That makes sense',
        'I see what you mean',
      ],
    })
    analyzeEmotionalTrends = jest.fn().mockReturnValue({
      dominantEmotions: [],
      volatility: 0.2,
      emotionalRange: 0.5,
      patterns: [],
    })
  },
}))

jest.mock('../SecureIntegration', () => ({
  SecureIntegration: class MockSecureIntegration {
    handleUserRequest = jest.fn().mockResolvedValue({
      canProcess: true,
      requiresVerification: false,
    })
    secureStore = jest.fn().mockResolvedValue(true)
    secureRetrieve = jest.fn().mockResolvedValue(null)
    getSecurityInfo = jest.fn().mockReturnValue({
      encryptionState: 'end_to_end_encrypted',
      dataTypeStats: {},
      canExportIdentity: true,
    })
  },
}))

// Mock jsonrpc-client
jest.mock('@deltachat/jsonrpc-client', () => ({
  C: {},
}))

describe('DeepTreeEchoBot Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Use fake timers to handle any setTimeout/setInterval in the component
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the bot with idle state by default', async () => {
    await act(async () => {
      render(<DeepTreeEchoBot />)
    })

    // Check for the bot state indicator
    const statusElement = screen.getByText(/idle/i, { exact: false })
    expect(statusElement).toBeInTheDocument()
  })

  it('renders the bot-state-indicator element', async () => {
    await act(async () => {
      render(<DeepTreeEchoBot />)
    })

    // Check for the container class
    const container = document.querySelector('.deep-tree-echo-bot')
    expect(container).toBeInTheDocument()
  })

  it('has no pending response by default', async () => {
    await act(async () => {
      render(<DeepTreeEchoBot />)
    })

    // The bot response element should not exist initially
    const responseElement = document.querySelector('.bot-response')
    expect(responseElement).not.toBeInTheDocument()
  })

  it('displays Status text in the indicator', async () => {
    await act(async () => {
      render(<DeepTreeEchoBot />)
    })

    // Check for the Status label
    expect(screen.getByText(/Status:/)).toBeInTheDocument()
  })

  it('initializes with cognitive state "idle"', async () => {
    await act(async () => {
      render(<DeepTreeEchoBot />)
    })

    // Find the status indicator and verify it shows "idle"
    const statusIndicator = document.querySelector('.bot-state-indicator')
    expect(statusIndicator).toHaveTextContent('idle')
  })
})

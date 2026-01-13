import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BotSettings from '../BotSettings'
import { RAGMemoryStore } from '../../chat/DeepTreeEchoBot'

// Mock the RAGMemoryStore
jest.mock('../../chat/DeepTreeEchoBot', () => {
  return {
    RAGMemoryStore: {
      getInstance: jest.fn().mockReturnValue({
        clearMemory: jest.fn(),
      }),
    },
  }
})

// Mock confirm and alert for memory clearing
window.confirm = jest.fn()
window.alert = jest.fn()

// Mock translation function
jest.mock('../../../hooks/useTranslationFunction', () => ({
  __esModule: true,
  default: () => jest.fn(str => str),
}))

describe('BotSettings', () => {
  const mockSettingsStore = {
    // Required properties from SettingsStoreState
    accountId: 1,
    selfContact: {
      address: 'test@example.com',
      displayName: 'Test User',
      color: '#5555FF',
      authName: 'Test User',
      status: 'Available',
      id: 1,
      name: 'Test User',
      profileImage: '',
      nameAndAddr: 'Test User (test@example.com)',
      isBlocked: false,
      isVerified: true,
      verifier: '',
      wasSeenRecently: true,
      lastSeen: new Date().getTime(),
      isBot: false,
      isArchiveLink: false,
    },
    settings: {},
    rc: {},
    desktopSettings: {
      // Required base settings from DesktopSettingsType
      bounds: {},
      enterKeySends: false,
      notifications: true,
      showNotificationContent: true,
      locale: null,
      lastAccount: undefined,
      enableAVCalls: false,
      enableBroadcastLists: false,
      enableChatAuditLog: false,
      enableOnDemandLocationStreaming: false,
      zoomFactor: 1,
      activeTheme: 'system',
      minimizeToTray: true,
      syncAllAccounts: true,
      experimentalEnableMarkdownInMessages: false,
      enableWebxdcDevTools: false,
      HTMLEmailAskForRemoteLoadingConfirmation: true,
      HTMLEmailAlwaysLoadRemoteContent: false,
      enableRelatedChats: false,
      galleryImageKeepAspectRatio: false,
      useSystemUIFont: false,
      contentProtectionEnabled: false,
      isMentionsEnabled: true,
      autostart: true,

      // Deep Tree Echo Bot settings
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotMemoryEnabled: false,
      deepTreeEchoBotPersonality: 'Test personality',
      deepTreeEchoBotApiKey: 'test-api-key',
      deepTreeEchoBotApiEndpoint: 'https://api.example.com',
      deepTreeEchoBotVisionEnabled: false,
      deepTreeEchoBotWebAutomationEnabled: false,
      deepTreeEchoBotEmbodimentEnabled: false,
      deepTreeEchoBotPersonaState: '',
      deepTreeEchoBotMemories: '',
      deepTreeEchoBotReflections: '',
      deepTreeEchoBotCognitiveKeys: '',
    },
    setDesktopSetting: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with initial settings', () => {
    render(<BotSettings settingsStore={mockSettingsStore} />)

    // Check if main elements are rendered
    expect(screen.getByText('Deep Tree Echo Bot Settings')).toBeInTheDocument()
    expect(screen.getByText('Enable Deep Tree Echo Bot')).toBeInTheDocument()
    expect(screen.getByText('Enable Learning')).toBeInTheDocument()
    expect(screen.getByText('API Configuration')).toBeInTheDocument()
    expect(screen.getByText('Bot Personality')).toBeInTheDocument()
    expect(screen.getByText('Memory Management')).toBeInTheDocument()

    // Check if form elements reflect initial values
    expect(screen.getByLabelText('API Key:')).toHaveValue('test-api-key')
    expect(screen.getByLabelText('API Endpoint:')).toHaveValue(
      'https://api.example.com'
    )
    expect(
      screen.getByPlaceholderText(
        "Define the bot's personality and behavior..."
      )
    ).toHaveValue('Test personality')
  })

  it('updates settings when form values change', () => {
    render(<BotSettings settingsStore={mockSettingsStore} />)

    // Change bot enabled toggle
    const enableSwitch = screen.getByRole('checkbox', {
      name: 'Enable Deep Tree Echo Bot',
    })
    fireEvent.click(enableSwitch)
    expect(mockSettingsStore.setDesktopSetting).toHaveBeenCalledWith(
      'deepTreeEchoBotEnabled',
      true
    )

    // Change learning toggle
    const learningSwitch = screen.getByRole('checkbox', {
      name: 'Enable Learning',
    })
    fireEvent.click(learningSwitch)
    expect(mockSettingsStore.setDesktopSetting).toHaveBeenCalledWith(
      'deepTreeEchoBotMemoryEnabled',
      true
    )

    // Change API key
    const apiKeyInput = screen.getByLabelText('API Key:')
    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } })
    expect(mockSettingsStore.setDesktopSetting).toHaveBeenCalledWith(
      'deepTreeEchoBotApiKey',
      'new-api-key'
    )

    // Change API endpoint
    const apiEndpointInput = screen.getByLabelText('API Endpoint:')
    fireEvent.change(apiEndpointInput, {
      target: { value: 'https://new-endpoint.com' },
    })
    expect(mockSettingsStore.setDesktopSetting).toHaveBeenCalledWith(
      'deepTreeEchoBotApiEndpoint',
      'https://new-endpoint.com'
    )

    // Change personality
    const personalityTextarea = screen.getByPlaceholderText(
      "Define the bot's personality and behavior..."
    )
    fireEvent.change(personalityTextarea, {
      target: { value: 'New personality description' },
    })
    expect(mockSettingsStore.setDesktopSetting).toHaveBeenCalledWith(
      'deepTreeEchoBotPersonality',
      'New personality description'
    )
  })

  it('clears memory when clear button is clicked and confirmed', () => {
    ;(window.confirm as jest.Mock).mockReturnValue(true)

    render(<BotSettings settingsStore={mockSettingsStore} />)

    const clearButton = screen.getByRole('button', { name: 'Clear Memory' })
    fireEvent.click(clearButton)

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to clear all of Deep Tree Echo's memory? This action cannot be undone."
    )

    const { clearMemory } = RAGMemoryStore.getInstance()
    expect(clearMemory).toHaveBeenCalled()
    expect(window.alert).toHaveBeenCalledWith('Memory has been cleared.')
  })

  it('does not clear memory if confirmation is cancelled', () => {
    ;(window.confirm as jest.Mock).mockReturnValue(false)

    render(<BotSettings settingsStore={mockSettingsStore} />)

    const clearButton = screen.getByRole('button', { name: 'Clear Memory' })
    fireEvent.click(clearButton)

    expect(window.confirm).toHaveBeenCalled()

    const { clearMemory } = RAGMemoryStore.getInstance()
    expect(clearMemory).not.toHaveBeenCalled()
    expect(window.alert).not.toHaveBeenCalled()
  })

  it('disables inputs when bot is disabled', () => {
    render(
      <BotSettings
        settingsStore={{
          ...mockSettingsStore,
          desktopSettings: {
            ...mockSettingsStore.desktopSettings,
            botEnabled: false,
          },
        }}
      />
    )

    // Learning switch should be disabled
    const learningSwitch = screen.getByRole('checkbox', {
      name: 'Enable Learning',
    })
    expect(learningSwitch).toBeDisabled()

    // API inputs should be disabled
    expect(screen.getByLabelText('API Key:')).toBeDisabled()
    expect(screen.getByLabelText('API Endpoint:')).toBeDisabled()

    // Personality textarea should be disabled
    expect(
      screen.getByPlaceholderText(
        "Define the bot's personality and behavior..."
      )
    ).toBeDisabled()

    // Clear memory button should be disabled
    expect(screen.getByRole('button', { name: 'Clear Memory' })).toBeDisabled()
  })
})

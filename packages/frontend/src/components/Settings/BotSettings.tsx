import React, { useState, useEffect } from 'react'
import { getLogger } from '../../../../shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { saveBotSettings } from '../DeepTreeEchoBot'
import { PersonaCore } from '../DeepTreeEchoBot/PersonaCore'
import type { SettingsStoreState } from '../../stores/settings'
import SettingsHeading from './SettingsHeading'
import DesktopSettingsSwitch from './DesktopSettingsSwitch'
import SettingsSeparator from './SettingsSeparator'
import SettingsButton from './SettingsButton'
import { DeltaInput, DeltaTextarea } from '../Login-Styles'
import Callout from '../Callout'

const log = getLogger('render/components/Settings/BotSettings')

type Props = {
  settingsStore: SettingsStoreState
  onNavigateToAdvanced?: () => void
}

export default function BotSettings({
  settingsStore,
  onNavigateToAdvanced,
}: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [personaCore, setPersonaCore] = useState<PersonaCore | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  // State for non-boolean settings that need text input
  const [apiKey, setApiKey] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState('')
  const [personality, setPersonality] = useState('')

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const desktopSettings = await runtime.getDesktopSettings()

        setApiKey(desktopSettings.deepTreeEchoBotApiKey || '')
        setApiEndpoint(desktopSettings.deepTreeEchoBotApiEndpoint || '')
        setPersonality(
          desktopSettings.deepTreeEchoBotPersonality ||
          'Deep Tree Echo is a helpful, friendly AI assistant that provides thoughtful responses to users in Delta Chat.'
        )

        // Initialize persona core if bot is enabled
        if (desktopSettings.deepTreeEchoBotEnabled) {
          setPersonaCore(PersonaCore.getInstance())
        }

        setIsLoading(false)
      } catch (error) {
        log.error('Failed to load bot settings:', error)
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Handle saving text settings
  const handleSaveTextSetting = async (key: string, value: string) => {
    try {
      log.info(`Saving bot setting: ${key} = ${value}`)

      // For personality, check with persona core first if enabled
      if (personaCore && key === 'personality') {
        const alignment = personaCore.evaluateSettingAlignment(key, value)
        if (!alignment.approved) {
          setFeedbackMessage(
            `Deep Tree Echo declined this change: ${alignment.reasoning}`
          )
          // Revert UI
          const desktopSettings = await runtime.getDesktopSettings()
          setPersonality(desktopSettings.deepTreeEchoBotPersonality || '')
          return
        }
      }

      setFeedbackMessage('')

      // Update via runtime
      const settingKey = `deepTreeEchoBot${key.charAt(0).toUpperCase() + key.slice(1)
        }` as any // Type casting as dynamic keys are tricky

      await runtime.setDesktopSetting(settingKey, value)

      // Also update via bot utility for immediate effect (if needed)
      saveBotSettings({ [key]: value })

      log.info(`Successfully saved bot setting: ${key}`)
    } catch (error) {
      log.error(`Failed to save bot setting ${key}:`, error)
      setFeedbackMessage(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  const isBotEnabled = settingsStore.desktopSettings.deepTreeEchoBotEnabled

  return (
    <>
      <SettingsHeading>General</SettingsHeading>
      <DesktopSettingsSwitch
        settingsKey='deepTreeEchoBotEnabled'
        label='Enable Deep Tree Echo Bot'
        description='When enabled, Deep Tree Echo will automatically respond to messages in your chats.'
      />

      {feedbackMessage && <Callout>{feedbackMessage}</Callout>}

      <SettingsSeparator />
      <SettingsHeading>Capabilities</SettingsHeading>

      <DesktopSettingsSwitch
        settingsKey='deepTreeEchoBotMemoryEnabled'
        label='Enable Memory'
        description='Allows the bot to remember conversation history using RAG.'
        disabled={!isBotEnabled}
      />

      <DesktopSettingsSwitch
        settingsKey='deepTreeEchoBotVisionEnabled'
        label='Enable Vision'
        description='Allows the bot to analyze images. Use /vision [image].'
        disabled={!isBotEnabled}
      />

      <DesktopSettingsSwitch
        settingsKey='deepTreeEchoBotWebAutomationEnabled'
        label='Enable Web Automation'
        description='Allows the bot to search the web and take screenshots.'
        disabled={!isBotEnabled}
      />

      <DesktopSettingsSwitch
        settingsKey='deepTreeEchoBotEmbodimentEnabled'
        label='Enable Embodiment'
        description='Physical awareness training capabilities.'
        disabled={!isBotEnabled}
      />

      <SettingsSeparator />
      <SettingsHeading>API Configuration</SettingsHeading>

      <div style={{ marginBottom: '10px' }}>
        <DeltaInput
          type='password'
          placeholder='Enter your LLM API key'
          value={apiKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
          onBlur={() => handleSaveTextSetting('apiKey', apiKey)}
          disabled={!isBotEnabled}
        />
        <div style={{ fontSize: '12px', color: 'var(--color-text-meta)', marginTop: '4px' }}>
          API Key
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <DeltaInput
          type='text'
          placeholder='Enter LLM API endpoint'
          value={apiEndpoint}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiEndpoint(e.target.value)}
          onBlur={() => handleSaveTextSetting('apiEndpoint', apiEndpoint)}
          disabled={!isBotEnabled}
        />
        <div style={{ fontSize: '12px', color: 'var(--color-text-meta)', marginTop: '4px' }}>
          API Endpoint (Optional)
        </div>
      </div>

      <SettingsSeparator />
      <SettingsHeading>Personality</SettingsHeading>

      <div style={{ marginBottom: '10px' }}>
        <DeltaTextarea
          value={personality}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonality(e.target.value)}
          onBlur={() => handleSaveTextSetting('personality', personality)}
          disabled={!isBotEnabled}
          placeholder="Define the bot's personality..."
        />
        <div style={{ fontSize: '12px', color: 'var(--color-text-meta)', marginTop: '4px' }}>
          Define how Deep Tree Echo should interact. She may decline changes that contradict her core values.
        </div>
      </div>

      <SettingsSeparator />
      <SettingsButton
        onClick={() => onNavigateToAdvanced?.()}
        disabled={!isBotEnabled || !onNavigateToAdvanced}
      >
        Advanced Settings
      </SettingsButton>

      <div style={{ marginTop: '20px', padding: '10px', background: 'var(--color-background-soft)', borderRadius: '4px' }}>
        <strong>Available Commands:</strong>
        <ul style={{ margin: '5px 0 0 20px', fontSize: '12px' }}>
          <li>/help - List commands</li>
          <li>/vision - Analyze images</li>
          <li>/search - Web search</li>
        </ul>
      </div>
    </>
  )
}
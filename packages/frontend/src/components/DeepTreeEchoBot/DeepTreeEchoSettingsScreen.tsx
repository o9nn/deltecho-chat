import React, { useState, useEffect } from 'react'
import { getLogger } from '@deltachat-desktop/shared/logger'
import BotSettings from './BotSettings'
import { saveBotSettings, getBotInstance } from './DeepTreeEchoIntegration'
import { runtime } from '@deltachat-desktop/runtime-interface'

const log = getLogger(
  'render/components/DeepTreeEchoBot/DeepTreeEchoSettingsScreen'
)

interface DeepTreeEchoSettingsScreenProps {
  onNavigateToMain?: () => void
  embedded?: boolean
}

/**
 * DeepTreeEchoSettingsScreen - Main settings screen component for the Deep Tree Echo bot
 * This can be mounted inside DeltaChat's settings component
 */
const DeepTreeEchoSettingsScreen: React.FC<DeepTreeEchoSettingsScreenProps> = ({
  onNavigateToMain,
  embedded = false,
}) => {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [botVersion, setBotVersion] = useState('1.0.0')
  const [statusMessage, setStatusMessage] = useState('')

  // Handle saving settings
  const handleSaveSettings = async (settings: any) => {
    try {
      setIsSaving(true)
      setSaveMessage('Saving settings...')

      await saveBotSettings(settings)

      setSaveMessage('Settings saved successfully!')

      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('')
      }, 3000)
    } catch (error) {
      log.error('Error saving settings:', error)
      setSaveMessage('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  // Effect to fetch bot status information
  useEffect(() => {
    const fetchBotInfo = async () => {
      try {
        const botInstance = getBotInstance()
        if (botInstance) {
          // Get version from desktop settings or use default
          const desktopSettings = await runtime.getDesktopSettings()
          setBotVersion('1.0.0') // Default version

          // Get status information
          let memorySize = '0 KB'
          let lastActivity = 'Never'

          // Try to get memory information - either from a dedicated setting or from memories count
          if (desktopSettings.deepTreeEchoBotMemories) {
            try {
              // Try to parse memories count if it exists
              const memoryCount =
                typeof desktopSettings.deepTreeEchoBotMemories === 'string'
                  ? JSON.parse(desktopSettings.deepTreeEchoBotMemories)
                      .length || 0
                  : 0

              memorySize = `${memoryCount} entries`
              lastActivity = new Date().toLocaleString()
            } catch (e) {
              log.error('Failed to parse memory information:', e)
            }
          }

          const state = botInstance.isEnabled() ? 'Active' : 'Inactive'
          setStatusMessage(
            `Status: ${state}, Memory: ${memorySize}, Last Activity: ${lastActivity}`
          )
        }
      } catch (error) {
        log.error('Error fetching bot info:', error)
      }
    }

    fetchBotInfo()
    // Set up a refresh interval
    const interval = setInterval(fetchBotInfo, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Check if Deep Tree Echo is enabled
  const botInstance = getBotInstance()
  const isEnabled = botInstance?.isEnabled() || false

  return (
    <div className='deep-tree-echo-settings-screen'>
      <div className='settings-header'>
        <div className='settings-header-main'>
          <div className='bot-icon'>
            <div className='material-icons'>psychology</div>
          </div>
          <div className='header-content'>
            <h2>Deep Tree Echo AI Assistant</h2>
            <div className='version-info'>{botVersion}</div>
          </div>
        </div>
        <p className='settings-description'>
          Deep Tree Echo is an advanced AI assistant that weaves intelligent
          responses, memory capabilities, and a distinct personality into your
          DeltaChat experience.
        </p>
      </div>

      {saveMessage && (
        <div className={`save-message ${isSaving ? 'saving' : ''}`}>
          {saveMessage}
        </div>
      )}

      {isEnabled && (
        <div className='bot-status-banner'>
          <div className='status-indicator active'></div>
          <p>
            {statusMessage ||
              'Deep Tree Echo is currently active and listening for messages.'}
          </p>
        </div>
      )}

      <BotSettings
        saveSettings={handleSaveSettings}
        onNavigateToMain={embedded ? onNavigateToMain : undefined}
      />

      <div className='bot-ecosystem'>
        <h3>AI Companion Ecosystem</h3>
        <p>
          Deep Tree Echo is part of the AI Companion Neighborhood - a network of
          specialized AI entities designed to collaborate, share knowledge, and
          enhance your digital experience through Delta Chat.
        </p>
        <div className='ecosystem-companions'>
          <div className='companion-item'>
            <div className='companion-icon'>🧠</div>
            <div className='companion-name'>Echo Core</div>
          </div>
          <div className='companion-item'>
            <div className='companion-icon'>📚</div>
            <div className='companion-name'>Marduk</div>
          </div>
          <div className='companion-item'>
            <div className='companion-icon'>🔍</div>
            <div className='companion-name'>Archivist</div>
          </div>
        </div>
      </div>

      <div className='settings-footer'>
        <p className='privacy-note'>
          Note: All AI processing is done through external API calls. Your API
          keys and message content will be sent to the configured API endpoints.
          Please review the privacy policy of your chosen AI provider for more
          information.
        </p>
      </div>
    </div>
  )
}

export default DeepTreeEchoSettingsScreen

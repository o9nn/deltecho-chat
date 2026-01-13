/**
 * useDeepTreeEchoInitialization - Initialize the Deep Tree Echo bot system
 *
 * This hook sets up the Deep Tree Echo cognitive system when the app starts,
 * configuring message listeners and proactive messaging capabilities.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { getLogger } from '../../../shared/logger'
import { BackendRemote } from '../backend-com'
import { selectedAccountId } from '../ScreenController'

const log = getLogger('render/hooks/useDeepTreeEchoInitialization')

/**
 * Deep Tree Echo initialization state
 */
export interface DeepTreeEchoState {
  initialized: boolean
  botEnabled: boolean
  proactiveEnabled: boolean
  error: Error | null
}

/**
 * Deep Tree Echo bot settings stored in localStorage
 */
interface DeepTreeEchoSettings {
  enabled: boolean
  proactiveMessagingEnabled: boolean
  triggerOnMention: boolean
  autoReplyEnabled: boolean
  quietHoursStart: number
  quietHoursEnd: number
  rateLimit: {
    messagesPerHour: number
    messagesPerDay: number
  }
}

const DEFAULT_SETTINGS: DeepTreeEchoSettings = {
  enabled: false,
  proactiveMessagingEnabled: false,
  triggerOnMention: true,
  autoReplyEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  rateLimit: {
    messagesPerHour: 5,
    messagesPerDay: 20,
  },
}

const STORAGE_KEY = 'deepTreeEchoSettings'

/**
 * Load settings from localStorage
 */
function loadSettings(): DeepTreeEchoSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (error) {
    log.warn('Failed to load Deep Tree Echo settings:', error)
  }
  return DEFAULT_SETTINGS
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: DeepTreeEchoSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    log.warn('Failed to save Deep Tree Echo settings:', error)
  }
}

/**
 * Hook to initialize and manage the Deep Tree Echo bot system
 *
 * @param accountId - The account ID to associate with the bot
 * @returns State and control functions for the bot
 */
export function useDeepTreeEchoInitialization(accountId?: number) {
  const effectiveAccountId = accountId ?? selectedAccountId()
  const [state, setState] = useState<DeepTreeEchoState>({
    initialized: false,
    botEnabled: false,
    proactiveEnabled: false,
    error: null,
  })
  const [settings, setSettings] = useState<DeepTreeEchoSettings>(loadSettings)
  const initRef = useRef(false)

  // Initialize the bot system
  useEffect(() => {
    if (initRef.current || !effectiveAccountId) {
      return
    }

    const initialize = async () => {
      try {
        log.info('Initializing Deep Tree Echo system', { accountId: effectiveAccountId })

        // Initialize the integration if settings.enabled is true
        if (settings.enabled) {
          // Import the bot modules dynamically to avoid circular dependencies
          const { initDeepTreeEchoBot } = await import(
            '../components/DeepTreeEchoBot/DeepTreeEchoIntegration'
          )
          await initDeepTreeEchoBot()
          log.info('Deep Tree Echo integration initialized')
        }

        setState(prev => ({
          ...prev,
          initialized: true,
          botEnabled: settings.enabled,
          proactiveEnabled: settings.proactiveMessagingEnabled,
        }))

        initRef.current = true
        log.info('Deep Tree Echo system initialized successfully')
      } catch (error) {
        log.error('Failed to initialize Deep Tree Echo:', error)
        setState(prev => ({
          ...prev,
          initialized: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }))
      }
    }

    initialize()
  }, [effectiveAccountId, settings.enabled, settings.proactiveMessagingEnabled])

  // Enable/disable the bot
  const setBotEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, enabled }
    setSettings(newSettings)
    saveSettings(newSettings)
    setState(prev => ({ ...prev, botEnabled: enabled }))
    log.info('Deep Tree Echo bot', enabled ? 'enabled' : 'disabled')
  }, [settings])

  // Enable/disable proactive messaging
  const setProactiveEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, proactiveMessagingEnabled: enabled }
    setSettings(newSettings)
    saveSettings(newSettings)
    setState(prev => ({ ...prev, proactiveEnabled: enabled }))
    log.info('Proactive messaging', enabled ? 'enabled' : 'disabled')
  }, [settings])

  // Update settings
  const updateSettings = useCallback((updates: Partial<DeepTreeEchoSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    saveSettings(newSettings)
    log.debug('Deep Tree Echo settings updated:', updates)
  }, [settings])

  return {
    state,
    settings,
    setBotEnabled,
    setProactiveEnabled,
    updateSettings,
  }
}

/**
 * Simplified hook that just tracks initialization state
 * Use this when you don't need full control over the bot
 */
export function useDeepTreeEchoStatus() {
  const [initialized, setInitialized] = useState(false)
  const [enabled, setEnabled] = useState(() => loadSettings().enabled)

  useEffect(() => {
    // Check if the bot has been initialized by looking for the global instance
    const checkInitialization = () => {
      const settings = loadSettings()
      setEnabled(settings.enabled)
      setInitialized(settings.enabled)
    }

    checkInitialization()

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        checkInitialization()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return { initialized, enabled }
}

export default useDeepTreeEchoInitialization

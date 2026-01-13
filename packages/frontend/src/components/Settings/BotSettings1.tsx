import React from 'react'
import { DesktopSettingsType } from '@deltachat-desktop/shared/shared-types'
import { SettingsStoreState } from '../../stores/settings'
import {
  BotSettings as DeepTreeEchoBotSettings,
  saveBotSettings,
} from '../DeepTreeEchoBot'
import SettingsHeading from './SettingsHeading'
import SettingsSeparator from './SettingsSeparator'

type Props = {
  settingsStore: SettingsStoreState
}

export default function BotSettings({ settingsStore }: Props) {
  // Get desktop settings from the store
  const { desktopSettings } = settingsStore

  // Pass the settings to the DeepTreeEchoBotSettings component
  // and handle saving settings
  const handleSaveSettings = (settings: any) => {
    saveBotSettings(settings)
  }

  return (
    <div>
      <SettingsHeading>Deep Tree Echo Bot</SettingsHeading>
      <p className='settings-description'>
        Configure AI assistant capabilities for your DeltaChat experience
      </p>
      <SettingsSeparator />

      <DeepTreeEchoBotSettings saveSettings={handleSaveSettings} />
    </div>
  )
}

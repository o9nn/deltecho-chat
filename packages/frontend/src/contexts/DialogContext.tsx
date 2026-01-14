import React, { createElement, useCallback, useEffect, useMemo, useState } from 'react'

import type { JSXElementConstructor, PropsWithChildren } from 'react'

import { generateRandomUUID } from '../utils/random'
import { getLogger } from '@deltachat-desktop/shared/logger'

// Deep Tree Echo integration
import { registerDialogContext } from '../components/DeepTreeEchoBot/DeepTreeEchoIntegration'

const log = getLogger('renderer/contexts/DialogContext')

export type DialogId = string

export type DialogProps = {
  onClose: (result?: any) => void
  dataTestid?: string
}

type DialogElementConstructor<T> = JSXElementConstructor<DialogProps & T>

export type OpenDialog = <T extends { [key: string]: any }>(
  dialogElement: DialogElementConstructor<T>,
  additionalProps?: T
) => DialogId

export type CloseDialog = (id: DialogId) => void

export type CloseAllDialogs = () => void

type DialogContextValue = {
  hasOpenDialogs: boolean
  openDialog: OpenDialog
  closeDialog: CloseDialog
  closeAllDialogs: CloseAllDialogs
  openDialogIds: String[] // IDs of currently opened dialogs
}

const initialValues: DialogContextValue = {
  hasOpenDialogs: false,
  openDialog: _ => '',
  closeDialog: _ => { },
  closeAllDialogs: () => { },
  openDialogIds: [],
}

export const DialogContext =
  React.createContext<DialogContextValue>(initialValues)

export const DialogContextProvider = ({ children }: PropsWithChildren<{}>) => {
  const [dialogs, setDialogs] = useState<{ [id: DialogId]: JSX.Element }>({})

  const closeDialog = useCallback((id: DialogId) => {
    setDialogs(({ [id]: _, ...rest }) => rest)
  }, [])

  const closeAllDialogs: CloseAllDialogs = useCallback(() => {
    setDialogs({})
  }, [])

  const openDialog = useCallback<OpenDialog>(
    (dialogElement, additionalProps) => {
      const newDialogId = generateRandomUUID()

      const newDialog = createElement(
        // From this point on we are only interested in the `DialogProps`
        dialogElement as DialogElementConstructor<DialogProps>,
        {
          key: `dialog-${newDialogId}`,
          onClose: () => {
            closeDialog(newDialogId)
          },
          ...additionalProps,
        }
      )

      setDialogs(dialogs => {
        return {
          ...dialogs,
          [newDialogId]: newDialog,
        }
      })

      return newDialogId
    },
    [closeDialog]
  )

  const hasOpenDialogs = useMemo(() => {
    return Object.keys(dialogs).length > 0
  }, [dialogs])

  const openDialogIds = useMemo(() => {
    return Object.keys(dialogs)
  }, [dialogs])

  const value = {
    hasOpenDialogs,
    openDialog,
    closeDialog,
    closeAllDialogs,
    openDialogIds,
  }

  // Register with Deep Tree Echo UI Bridge for AI-controlled dialogs
  // This allows Deep Tree Echo to trigger dialogs like a normal user would
  useEffect(() => {
    try {
      registerDialogContext({
        openDialog: (_type: string, _props?: any) => {
          // Note: The actual dialog component mapping is handled by DialogAdapter
          // This simplified interface allows the AI to request dialogs by type
          log.info('DialogContext registered with Deep Tree Echo')
        },
        closeDialog: () => {
          closeAllDialogs()
        }
      })
      log.info('DialogContext registered with Deep Tree Echo UI Bridge')
    } catch (error) {
      // Log but don't crash if Deep Tree Echo module isn't available
      log.warn('Failed to register DialogContext with Deep Tree Echo:', error)
    }
  }, [closeAllDialogs])

  return (
    <DialogContext.Provider value={value}>
      {children}
      {Object.keys(dialogs).map(id => {
        return dialogs[id]
      })}
    </DialogContext.Provider>
  )
}

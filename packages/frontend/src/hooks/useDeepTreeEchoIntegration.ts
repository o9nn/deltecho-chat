/**
 * useDeepTreeEchoIntegration - React hook to connect Deep Tree Echo with the UI
 *
 * This hook registers the necessary React contexts with the Deep Tree Echo UIBridge,
 * enabling the AI to interact with the chat application like a normal user.
 */

import { useEffect, useCallback } from 'react'
import { getLogger } from '../../../shared/logger'
import { uiBridge } from '../components/DeepTreeEchoBot/DeepTreeEchoUIBridge'
import { selectedAccountId } from '../ScreenController'

import type { ChatContextValue } from '../contexts/ChatContext'

const log = getLogger('render/hooks/useDeepTreeEchoIntegration')

/**
 * Interface for dialog context that can be registered with UIBridge
 */
interface DialogContextInterface {
  openDialog: (type: string, props?: any) => void
  closeDialog: () => void
}

/**
 * Hook to integrate Deep Tree Echo UIBridge with the React chat context
 *
 * @param chatContext - The chat context from useChat()
 * @param accountId - Optional account ID (defaults to selected account)
 */
export function useDeepTreeEchoChatIntegration(
  chatContext: ChatContextValue,
  accountId?: number
): void {
  const effectiveAccountId = accountId ?? selectedAccountId()

  useEffect(() => {
    if (!effectiveAccountId) {
      log.warn('No account ID available for UIBridge registration')
      return
    }

    // Create a compatible interface for the UIBridge
    const chatContextInterface = {
      selectChat: chatContext.selectChat,
      unselectChat: chatContext.unselectChat,
      chatId: chatContext.chatId,
      chatWithLinger: chatContext.chatWithLinger,
    }

    // Register with UIBridge
    uiBridge.registerChatContext(chatContextInterface, effectiveAccountId)
    log.info('Chat context registered with Deep Tree Echo UIBridge', {
      accountId: effectiveAccountId,
      chatId: chatContext.chatId,
    })

    // Cleanup on unmount
    return () => {
      log.debug('Chat context unregistered from UIBridge')
    }
  }, [chatContext, effectiveAccountId])

  // Update UIBridge when chat changes
  useEffect(() => {
    if (chatContext.chatId && effectiveAccountId) {
      uiBridge.setAccountId(effectiveAccountId)
    }
  }, [chatContext.chatId, effectiveAccountId])
}

/**
 * Hook to register the dialog context with UIBridge
 *
 * @param openDialog - Function to open dialogs
 * @param closeDialog - Function to close dialogs
 */
export function useDeepTreeEchoDialogIntegration(
  openDialog: (component: any, props?: any) => void,
  closeDialog?: () => void
): void {
  useEffect(() => {
    // Create a compatible interface
    const dialogContextInterface: DialogContextInterface = {
      openDialog: (type: string, props?: any) => {
        // Map dialog type strings to actual components if needed
        openDialog(type, props)
      },
      closeDialog: closeDialog || (() => {
        log.warn('closeDialog not provided')
      }),
    }

    uiBridge.registerDialogContext(dialogContextInterface)
    log.info('Dialog context registered with Deep Tree Echo UIBridge')
  }, [openDialog, closeDialog])
}

/**
 * Hook to register a composer textarea with UIBridge
 *
 * @param textareaRef - Ref to the textarea element
 */
export function useDeepTreeEchoComposerIntegration(
  textareaRef: React.RefObject<HTMLTextAreaElement>
): void {
  useEffect(() => {
    if (textareaRef.current) {
      uiBridge.registerComposer(textareaRef.current)
      log.debug('Composer registered with Deep Tree Echo UIBridge')
    }

    return () => {
      uiBridge.registerComposer(null)
    }
  }, [textareaRef])
}

/**
 * Combined hook that provides callbacks for registering UI elements
 * This is useful when you need to register multiple elements from different components
 */
export function useDeepTreeEchoUIRegistration() {
  const registerComposer = useCallback((element: HTMLTextAreaElement | null) => {
    uiBridge.registerComposer(element)
  }, [])

  return {
    uiBridge,
    registerComposer,
  }
}

export default useDeepTreeEchoChatIntegration

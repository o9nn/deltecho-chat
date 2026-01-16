import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import debounce from 'debounce'

import {
    BackendRemote,
    onDCEvent,
    EffectfulBackendActions,
} from '../../backend-com'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { avatarInitial } from '../Avatar'
import { getLogger } from '../../../../shared/logger'
import useTranslationFunction from '../../hooks/useTranslationFunction'
import { useContextMenuWithActiveState } from '../ContextMenu'
import { ActionEmitter, KeybindAction } from '../../keybindings'
import AccountNotificationStoreInstance from '../../stores/accountNotifications'
import Icon from '../Icon'

import styles from './NeighborhoodSidebar.module.scss'

import { C, type T } from '@deltachat/jsonrpc-client'
import { openMapWebxdc } from '../../system-integration/webxdc'
import useDialog from '../../hooks/dialog/useDialog'
import { EditPrivateTagDialog } from '../AccountListSidebar/EditPrivateTagDialog'
import { useRovingTabindex } from '../../contexts/RovingTabindex'

type Props = {
    accountId: number
    isSelected: boolean
    onSelectAccount: (accountId: number) => Promise<void>
    openAccountDeletionScreen: (accountId: number) => Promise<void>
    updateAccountForHoverInfo: (actingAccount: T.Account, select: boolean) => void
    syncAllAccounts: boolean
    muted: boolean
}

const log = getLogger('NeighborhoodSidebar/NeighborItem')

export default function NeighborItem({
    accountId,
    isSelected,
    onSelectAccount,
    updateAccountForHoverInfo,
    openAccountDeletionScreen,
    syncAllAccounts,
    muted,
}: Props) {
    const tx = useTranslationFunction()
    const [unreadCount, setUnreadCount] = useState<number>(0)
    const [account, setAccount] = useState<T.Account | null>(null)
    const { openDialog } = useDialog()

    useEffect(() => {
        const updateAccount = debounce(() => {
            BackendRemote.rpc
                .getAccountInfo(accountId)
                .then(setAccount)
                .catch(log.error)
        }, 200)
        const updateUnread = debounce(() => {
            BackendRemote.rpc
                .getFreshMsgs(accountId)
                .then(u => setUnreadCount(u?.length || 0))
                .catch(log.error)
        }, 200)

        updateAccount()
        updateUnread()

        const cleanup = [
            onDCEvent(accountId, 'AccountsItemChanged', updateAccount),
            onDCEvent(accountId, 'IncomingMsg', updateUnread),
            onDCEvent(accountId, 'ChatlistChanged', updateUnread),
            onDCEvent(accountId, 'MsgsNoticed', updateUnread),
            onDCEvent(accountId, 'ChatModified', updateUnread),
        ]

        return () => cleanup.forEach(off => off())
    }, [accountId])

    const bgSyncDisabled = syncAllAccounts === false && !isSelected

    const { onContextMenu, isContextMenuActive } = useContextMenuWithActiveState([
        muted
            ? {
                label: tx('menu_unmute'),
                action: () => {
                    AccountNotificationStoreInstance.effect.setMuted(accountId, false)
                },
            }
            : {
                label: tx('menu_mute'),
                action: () => {
                    AccountNotificationStoreInstance.effect.setMuted(accountId, true)
                },
            },
        {
            label: tx('mark_all_as_read'),
            action: () => {
                markAccountAsRead(accountId)
            },
        },
        {
            label: tx('menu_all_media'),
            action: async () => {
                await onSelectAccount(accountId)
                setTimeout(() => {
                    ActionEmitter.emitAction(KeybindAction.GlobalGallery_Open)
                }, 50)
            },
        },
        {
            label: tx('menu_show_global_map'),
            action: async () => {
                await onSelectAccount(accountId)
                openMapWebxdc(accountId)
            },
        },
        { type: 'separator' },
        {
            label: tx('menu_settings'),
            action: async () => {
                await onSelectAccount(accountId)
                setTimeout(() => {
                    ActionEmitter.emitAction(KeybindAction.Settings_Open)
                }, 100)
            },
            dataTestid: 'open-settings-menu-item',
        },
        {
            label: tx('profile_tag'),
            action: async () => {
                openDialog(EditPrivateTagDialog, {
                    accountId,
                    currentTag: await BackendRemote.rpc.getConfig(
                        accountId,
                        'private_tag'
                    ),
                })
            },
        },
        { type: 'separator' },
        {
            label: tx('delete_account'),
            action: openAccountDeletionScreen.bind(null, accountId),
            dataTestid: 'delete-account-menu-item',
        },
    ])

    let badgeContent
    if (bgSyncDisabled) {
        badgeContent = (
            <div
                className={classNames(styles.accountBadgeIcon, styles.bgSyncDisabled)}
                aria-label={tx('background_sync_disabled_explaination')}
            >
                ⏻
            </div>
        )
    } else if (unreadCount > 0) {
        badgeContent = (
            <div
                className={classNames(styles.accountBadgeIcon, {
                    [styles.muted]: muted,
                })}
                aria-label={tx('chat_n_new_messages', String(unreadCount), {
                    quantity: unreadCount,
                })}
            >
                {unreadCount}
            </div>
        )
    }

    const isSticky = unreadCount > 0

    const ref = useRef<HTMLButtonElement>(null)
    useLayoutEffect(() => {
        if (!isSelected) {
            return
        }

        if (ref.current == null) {
            log.warn(
                'Could not scroll the selected account into view. Element:',
                ref.current
            )
            return
        }

        ref.current.scrollIntoView({
            behavior: 'instant',
            block: 'nearest',
            inline: 'nearest',
        })
    }, [isSelected, isSticky, window.__screen])

    const rovingTabindex = useRovingTabindex(ref)

    return (
        <button
            className={classNames(styles.account, rovingTabindex.className, {
                [styles.active]: isSelected,
                [styles['context-menu-active']]: isContextMenuActive,
                [styles.isSticky]: isSticky,
                'unconfigured-account': account?.kind !== 'Configured',
            })}
            role='tab'
            aria-selected={isSelected ? 'true' : 'false'}
            aria-busy={account ? 'false' : 'true'}
            aria-label={account ? `${account.kind === 'Configured' ? account.displayName : tx('unconfigured_account')}${unreadCount > 0 ? `, ${tx('chat_n_new_messages', String(unreadCount), { quantity: unreadCount })}` : ''}` : tx('loading')}
            onClick={() => onSelectAccount(accountId)}
            onContextMenu={onContextMenu}
            onMouseEnter={() => account && updateAccountForHoverInfo(account, true)}
            onMouseLeave={() => account && updateAccountForHoverInfo(account, false)}
            x-account-sidebar-account-id={accountId}
            data-testid={`account-item-${accountId}`}
            ref={ref}
            tabIndex={rovingTabindex.tabIndex}
            onFocus={rovingTabindex.setAsActiveElement}
            onKeyDown={rovingTabindex.onKeydown}
        >
            {!account ? (
                <div className={styles.avatar}>
                    <div className={styles.content}>⏳</div>
                </div>
            ) : account.kind == 'Configured' ? (
                <div className={styles.avatar}>
                    {account.profileImage ? (
                        <img
                            className={styles.content}
                            src={runtime.transformBlobURL(account.profileImage)}
                            alt="Account Avatar"
                        />
                    ) : (
                        <div
                            className={styles.content}
                            style={{ backgroundColor: account.color }}
                        >
                            {avatarInitial(
                                account.displayName || '',
                                account.addr || undefined
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.avatar}>
                    <div className={styles.content}>?</div>
                </div>
            )}
            {muted && (
                <div
                    aria-label='Account notifications muted'
                    className={styles.accountMutedIconShadow}
                >
                    <Icon className={styles.accountMutedIcon} icon='audio-muted' />
                </div>
            )}
            <div className={classNames(styles.accountBadge)}>{badgeContent}</div>
        </button>
    )
}

async function markAccountAsRead(accountId: number) {
    const msgs = await BackendRemote.rpc.getFreshMsgs(accountId)
    const messages = await BackendRemote.rpc.getMessages(accountId, msgs)

    const uniqueChatIds = new Set<number>()
    for (const key in messages) {
        if (Object.prototype.hasOwnProperty.call(messages, key)) {
            const message = messages[key]
            if (message.kind === 'message') {
                uniqueChatIds.add(message.chatId)
            }
        }
    }
    uniqueChatIds.add(C.DC_CHAT_ID_ARCHIVED_LINK)

    for (const chatId of uniqueChatIds) {
        await EffectfulBackendActions.marknoticedChat(accountId, chatId)
    }
}

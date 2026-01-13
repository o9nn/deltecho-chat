import React, { ReactElement } from 'react'

import Icon from '../Icon'

import type { IconName } from '../Icon'
import type { PropsWithChildren, ReactNode } from 'react'

import styles from './styles.module.scss'

type BaseProps = PropsWithChildren<{
  isLink?: boolean
  onClick: () => void
  dataTestid?: string
}>

type StandardIconProps = BaseProps & {
  icon: IconName
  customIcon?: never
}

type CustomIconProps = BaseProps & {
  icon?: never
  customIcon: ReactNode
}

type Props = StandardIconProps | CustomIconProps

export default function SettingsIconButton({
  children,
  icon,
  customIcon,
  isLink = false,
  onClick,
  dataTestid,
}: Props) {
  return (
    <button
      className={styles.settingsIconButton}
      onClick={onClick}
      data-testid={dataTestid}
    >
      {icon ? (
        <Icon className={styles.settingsIcon} icon={icon} />
      ) : customIcon ? (
        <div className={styles.settingsIcon}>{customIcon}</div>
      ) : null}
      <span className={styles.settingsIconButtonLabel}>{children}</span>
      {isLink && <Icon className={styles.settingsIcon} icon='open_in_new' />}
    </button>
  )
}

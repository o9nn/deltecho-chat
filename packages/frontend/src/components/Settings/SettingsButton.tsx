import React from "react";
import classNames from "classnames";

import type { PropsWithChildren } from "react";

import styles from "./styles.module.scss";

type Props = PropsWithChildren<{
  onClick: () => void;
  highlight?: boolean;
  dataTestid?: string;
  disabled?: boolean;
}>;

export default function SettingsButton({
  children,
  onClick,
  highlight = false,
  dataTestid,
  disabled,
}: Props) {
  return (
    <button
      type="button" className={classNames(styles.settingsButton, {
        [styles.highlight]: highlight,
      })}
      onClick={onClick}
      data-testid={dataTestid}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

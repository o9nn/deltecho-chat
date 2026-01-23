import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { debounce } from "debounce";
import { Brain, Plus, Settings as SettingsIcon } from "lucide-react";
import classNames from "classnames";

import NeighborItem from "./NeighborItem";
import Settings from "../Settings";
import useDialog from "../../hooks/dialog/useDialog";
import { BackendRemote } from "../../backend-com";
import { runtime } from "@deltachat-desktop/runtime-interface";
import { useAccountNotificationStore } from "../../stores/accountNotifications";

import styles from "./NeighborhoodSidebar.module.scss";

import type { T } from "@deltachat/jsonrpc-client";
import { ScreenContext } from "../../contexts/ScreenContext";
import useChat from "../../hooks/chat/useChat";
import { Screens } from "../../ScreenController";
import { ActionEmitter, KeybindAction } from "../../keybindings";
import useTranslationFunction from "../../hooks/useTranslationFunction";
import {
  RovingTabindexProvider,
  useRovingTabindex,
} from "../../contexts/RovingTabindex";
import AccountHoverInfo from "../AccountListSidebar/AccountHoverInfo";

type Props = {
  onAddAccount: () => Promise<number>;
  onSelectAccount: (accountId: number) => Promise<void>;
  openAccountDeletionScreen: (accountId: number) => Promise<void>;
  selectedAccountId?: number;
};

export default function NeighborhoodSidebar({
  onAddAccount,
  onSelectAccount,
  openAccountDeletionScreen,
  selectedAccountId,
}: Props) {
  const tx = useTranslationFunction();

  const accountsListRef = useRef<HTMLDivElement>(null);
  const { openDialog } = useDialog();
  const [accounts, setAccounts] = useState<number[]>([]);
  const [{ accounts: noficationSettings }] = useAccountNotificationStore();

  const { smallScreenMode, changeScreen, screen } = useContext(ScreenContext);
  const { chatId } = useChat();

  const shouldBeHidden = smallScreenMode && chatId !== undefined;

  const selectAccount = async (accountId: number) => {
    if (selectedAccountId === accountId) {
      ActionEmitter.emitAction(KeybindAction.ChatList_ExitSearch);
      return;
    }

    await onSelectAccount(accountId);
  };

  const [syncAllAccounts, setSyncAllAccounts] = useState(true);

  const refresh = useMemo(
    () => async () => {
      const accounts = await BackendRemote.rpc.getAllAccountIds();
      setAccounts(accounts);
      const desktopSettings = await runtime.getDesktopSettings();
      setSyncAllAccounts(desktopSettings.syncAllAccounts);
    },
    [],
  );

  useEffect(() => {
    refresh();
  }, [selectedAccountId, refresh]);

  const [accountForHoverInfo, internalSetAccountForHoverInfo] =
    useState<T.Account | null>(null);

  const updateAccountForHoverInfo = (
    actingAccount: T.Account,
    select: boolean,
  ) => {
    internalSetAccountForHoverInfo((oldAccount) => {
      if (actingAccount === oldAccount && select === false) {
        return null;
      }
      if (select) return actingAccount;
      return null;
    });
  };

  const hoverInfo = useRef<HTMLDivElement | null>(null);

  const updateHoverInfoPosition = useCallback(() => {
    if (hoverInfo.current && accountForHoverInfo) {
      const elem = document.querySelector(
        `[x-account-sidebar-account-id="${accountForHoverInfo.id}"]`,
      );
      if (elem) {
        const rect = elem.getBoundingClientRect();
        hoverInfo.current.style.top = `${rect.top}px`;
        hoverInfo.current.style.left = `${rect.right + 15}px`;
      }
    }
  }, [accountForHoverInfo]);

  useEffect(() => {
    updateHoverInfoPosition();
  }, [accountForHoverInfo, updateHoverInfoPosition]);

  useEffect(() => {
    const debouncedUpdate = debounce(() => {
      refresh();
    }, 200);

    window.__updateAccountListSidebar = debouncedUpdate;
    BackendRemote.on("AccountsChanged", debouncedUpdate);
    return () => {
      BackendRemote.off("AccountsChanged", debouncedUpdate);
    };
  }, [refresh]);

  const openSettings = () => openDialog(Settings);

  if (shouldBeHidden) {
    return <div></div>;
  }

  const isOverviewActive = screen === Screens.AINeighborhood;

  return (
    <div className={styles.neighborhoodSidebar}>
      {runtime.getRuntimeInfo().isMac && !smallScreenMode && (
        <div
          className={styles.macOSTrafficLightBackground}
          data-tauri-drag-region
        />
      )}

      <div className={styles.header}>
        <button
          className={classNames(styles.overviewButton, {
            [styles.active]: isOverviewActive,
          })}
          onClick={() => changeScreen(Screens.AINeighborhood)}
          title="AI Neighborhood Overview"
        >
          <Brain size={24} />
        </button>
      </div>

      <div
        ref={accountsListRef}
        className={styles.homesList}
        onScroll={updateHoverInfoPosition}
      >
        <div role="tablist" aria-orientation="vertical">
          <RovingTabindexProvider wrapperElementRef={accountsListRef}>
            {accounts.map((id) => (
              <NeighborItem
                key={id}
                accountId={id}
                isSelected={selectedAccountId === id && !isOverviewActive}
                onSelectAccount={async (id) => {
                  if (screen === Screens.AINeighborhood) {
                    changeScreen(Screens.Main);
                  }
                  await selectAccount(id);
                }}
                openAccountDeletionScreen={openAccountDeletionScreen}
                updateAccountForHoverInfo={updateAccountForHoverInfo}
                syncAllAccounts={syncAllAccounts}
                muted={noficationSettings[id]?.muted || false}
              />
            ))}
          </RovingTabindexProvider>
        </div>
        <AddHomeButton onClick={onAddAccount} />
      </div>

      <div className={styles.footer}>
        <button
          className={styles.settingsButton}
          onClick={openSettings}
          title={tx("menu_settings")}
          aria-label={tx("menu_settings")}
        >
          <SettingsIcon size={20} />
        </button>
      </div>

      <div className={styles.accountHoverInfoContainer} ref={hoverInfo}>
        {accountForHoverInfo && (
          <AccountHoverInfo
            account={accountForHoverInfo}
            isSelected={selectedAccountId === accountForHoverInfo.id}
            muted={noficationSettings[accountForHoverInfo.id]?.muted || false}
          />
        )}
      </div>
    </div>
  );
}

function AddHomeButton(props: { onClick: () => void }) {
  const tx = useTranslationFunction();

  const ref = useRef<HTMLButtonElement>(null);
  const rovingTabindex = useRovingTabindex(ref);

  return (
    <button
      ref={ref}
      aria-label={tx("add_account")}
      className={classNames(styles.addButton, rovingTabindex.className)}
      tabIndex={rovingTabindex.tabIndex}
      data-testid="add-account-button"
      onKeyDown={rovingTabindex.onKeydown}
      onFocus={rovingTabindex.setAsActiveElement}
      title="Create New AI Home"
      {...props}
    >
      <Plus size={24} />
    </button>
  );
}

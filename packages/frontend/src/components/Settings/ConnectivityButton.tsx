import React, { useCallback, useEffect, useState } from "react";
import { C } from "@deltachat/jsonrpc-client";

import SettingsIconButton from "./SettingsIconButton";
import { BackendRemote, onDCEvent } from "../../backend-com";
import { maybeSelectedAccountId } from "../../ScreenController";
import ConnectivityDialog from "../dialogs/ConnectivityDialog";
import useTranslationFunction from "../../hooks/useTranslationFunction";
import useDialog from "../../hooks/dialog/useDialog";

export default function ConnectivityButton() {
  const { openDialog } = useDialog();
  const [connectivityString, setConnectivityString] = useState("");
  const accountId = maybeSelectedAccountId();
  const tx = useTranslationFunction();

  const updateConnectivity = useCallback(async () => {
    if (accountId === undefined) return;
    const connectivity = await BackendRemote.rpc.getConnectivity(accountId);

    let connectivityString = "";
    if (connectivity >= C.DC_CONNECTIVITY_CONNECTED) {
      connectivityString = window.static_translate("connectivity_connected");
    } else if (connectivity >= C.DC_CONNECTIVITY_WORKING) {
      connectivityString = window
        .static_translate("connectivity_updating")
        .replace("…", "");
    } else if (connectivity >= C.DC_CONNECTIVITY_CONNECTING) {
      connectivityString = window
        .static_translate("connectivity_connecting")
        .replace("…", "");
    } else if (connectivity >= C.DC_CONNECTIVITY_NOT_CONNECTED) {
      connectivityString = window.static_translate(
        "connectivity_not_connected",
      );
    }
    setConnectivityString(`(${connectivityString})`);
  }, [accountId]);

  useEffect(() => {
    if (accountId === undefined) return;
    updateConnectivity();
    return onDCEvent(accountId, "ConnectivityChanged", updateConnectivity);
  }, [updateConnectivity, accountId]);

  // Don't render when no account is selected
  if (accountId === undefined) {
    return null;
  }

  return (
    <SettingsIconButton
      icon="swap_vert"
      onClick={() => openDialog(ConnectivityDialog)}
    >
      {tx("connectivity") + " " + connectivityString}
    </SettingsIconButton>
  );
}

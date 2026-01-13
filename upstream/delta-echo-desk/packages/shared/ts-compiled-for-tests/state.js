"use strict";
export function getDefaultState() {
  return {
    bounds: {},
    HTMLEmailWindowBounds: void 0,
    enterKeySends: false,
    notifications: true,
    showNotificationContent: true,
    locale: null,
    // if this is null, the system chooses the system language that electron reports
    credentials: void 0,
    lastAccount: void 0,
    enableAVCalls: false,
    enableBroadcastLists: false,
    enableChatAuditLog: false,
    enableOnDemandLocationStreaming: false,
    chatViewBgImg: void 0,
    lastChats: {},
    zoomFactor: 1,
    activeTheme: "system",
    minimizeToTray: true,
    syncAllAccounts: true,
    lastSaveDialogLocation: void 0,
    experimentalEnableMarkdownInMessages: false,
    enableWebxdcDevTools: false,
    HTMLEmailAskForRemoteLoadingConfirmation: true,
    HTMLEmailAlwaysLoadRemoteContent: false,
    enableRelatedChats: false,
    galleryImageKeepAspectRatio: false,
    useSystemUIFont: false,
    contentProtectionEnabled: false,
    isMentionsEnabled: true,
    autostart: true
  };
}
//# sourceMappingURL=state.js.map

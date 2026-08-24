import React from "react";
import { render, screen } from "@testing-library/react";
import MessageListAndComposer from "../MessageListAndComposer";
import { useSettingsStore } from "../../../stores/settings";

jest.mock("@deltachat-desktop/shared/logger", () => ({
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("@deltachat-desktop/runtime-interface", () => ({
  runtime: {
    isDroppedFileFromOutside: jest.fn(),
    setDesktopSetting: jest.fn(),
  },
}));

jest.mock("../../../stores/settings", () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock("../../../hooks/dialog/useDialog", () => ({
  __esModule: true,
  default: () => ({ openDialog: jest.fn(), hasOpenDialogs: false }),
}));

jest.mock("../../../hooks/chat/useMessage", () => ({
  __esModule: true,
  default: () => ({ sendMessage: jest.fn() }),
}));

jest.mock("../../composer/Composer", () => ({
  __esModule: true,
  default: () => <div data-testid="composer" />,
  useDraft: () => ({
    draftState: {},
    updateDraftText: jest.fn(),
    onSelectReplyToShortcut: jest.fn(),
    removeQuote: jest.fn(),
    addFileToDraft: jest.fn(),
    removeFile: jest.fn(),
    clearDraftStateButKeepTextareaValue: jest.fn(),
  }),
}));

jest.mock("../MessageList", () => ({
  __esModule: true,
  default: () => <div data-testid="message-list" />,
}));

jest.mock("../../screens/RecoverableCrashScreen", () => ({
  RecoverableCrashScreen: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("../../ReactionsBar", () => ({
  ReactionsBarProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("../../DeepTreeEchoBot/DeepTreeEchoAvatarDisplay", () => ({
  DeepTreeEchoAvatarDisplay: () => <div data-testid="avatar" />,
}));

jest.mock("../../DeepTreeEchoBot/ProactiveStatusIndicator", () => ({
  __esModule: true,
  default: ({ accountId, chatId }: { accountId: number; chatId: number }) => (
    <div
      data-testid="proactive-status"
      data-account-id={accountId}
      data-chat-id={chatId}
    />
  ),
}));

jest.mock("../../Settings/Settings", () => ({
  __esModule: true,
  default: () => <div data-testid="settings-dialog" />,
}));

const chat = {
  id: 42,
  isContactRequest: false,
  isProtectionBroken: false,
  canSend: true,
} as any;

function setDesktopSettings(partial: Record<string, unknown>) {
  (useSettingsStore as jest.Mock).mockReturnValue([
    { desktopSettings: partial },
  ]);
}

describe("MessageListAndComposer proactive indicator (AE6)", () => {
  it("renders the indicator when both flags are true", () => {
    setDesktopSettings({
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotProactiveEnabled: true,
    });

    render(<MessageListAndComposer accountId={1} chat={chat} />);

    const indicator = screen.getByTestId("proactive-status");
    expect(indicator).toHaveAttribute("data-account-id", "1");
    expect(indicator).toHaveAttribute("data-chat-id", "42");
  });

  it("hides the indicator when the bot is disabled", () => {
    setDesktopSettings({
      deepTreeEchoBotEnabled: false,
      deepTreeEchoBotProactiveEnabled: true,
    });

    render(<MessageListAndComposer accountId={1} chat={chat} />);
    expect(screen.queryByTestId("proactive-status")).not.toBeInTheDocument();
  });

  it("hides the indicator when proactive messaging is disabled", () => {
    setDesktopSettings({
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotProactiveEnabled: false,
    });

    render(<MessageListAndComposer accountId={1} chat={chat} />);
    expect(screen.queryByTestId("proactive-status")).not.toBeInTheDocument();
  });
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ProactiveStatusIndicator from "../ProactiveStatusIndicator";
import { proactiveMessaging } from "../ProactiveMessaging";

jest.mock("@deltachat-desktop/shared/logger", () => ({
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("../ProactiveMessaging", () => ({
  proactiveMessaging: {
    getConfig: jest.fn(() => ({ enabled: true })),
    getTriggers: jest.fn(() => [
      {
        id: "welcome",
        enabled: true,
        targetType: "all_chats",
        type: "event",
        name: "Welcome New Contact",
      },
    ]),
    getQueuedMessages: jest.fn(() => []),
    sendGated: jest.fn(),
    cancelQueuedMessage: jest.fn(),
  },
}));

jest.mock("../DeepTreeEchoChatManager", () => ({
  chatManager: {},
}));

describe("ProactiveStatusIndicator compact chip", () => {
  beforeEach(() => {
    (proactiveMessaging.getConfig as jest.Mock).mockReturnValue({
      enabled: true,
    });
  });

  it("shows the floating chip and opens settings from the panel", () => {
    const onOpenSettings = jest.fn();
    const onOpenTriggers = jest.fn();

    render(
      <ProactiveStatusIndicator
        accountId={1}
        chatId={42}
        compact
        onOpenSettings={onOpenSettings}
        onOpenTriggers={onOpenTriggers}
      />,
    );

    const chip = screen.getByTestId("proactive-status");
    expect(chip).toHaveTextContent("🤖 1");

    fireEvent.click(screen.getByTitle("Proactive messaging active"));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Triggers" }));

    expect(onOpenSettings).toHaveBeenCalled();
    expect(onOpenTriggers).toHaveBeenCalled();
  });

  it("hides when the engine is disabled", () => {
    (proactiveMessaging.getConfig as jest.Mock).mockReturnValue({
      enabled: false,
    });

    render(<ProactiveStatusIndicator accountId={1} chatId={42} compact />);
    expect(screen.queryByTestId("proactive-status")).not.toBeInTheDocument();
  });
});

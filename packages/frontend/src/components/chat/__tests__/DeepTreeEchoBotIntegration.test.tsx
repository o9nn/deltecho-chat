import React from "react";
import { render } from "@testing-library/react";
import DeepTreeEchoBot from "../DeepTreeEchoBot";
import { getUIBridge as _getUIBridge } from "../../DeepTreeEchoBot/DeepTreeEchoUIBridge";

// Note: DeepTreeEchoBot is in components/chat/DeepTreeEchoBot.tsx
// It imports from ../DeepTreeEchoBot/DeepTreeEchoUIBridge, which is physically located at
// components/DeepTreeEchoBot/DeepTreeEchoUIBridge.ts
// Wait, in DeepTreeEchoBot.tsx I used:
// import { getUIBridge } from '../DeepTreeEchoBot/DeepTreeEchoUIBridge'
// But logicially DeepTreeEchoBot.tsx is in components/chat
// So '../DeepTreeEchoBot/DeepTreeEchoUIBridge' resolves to components/DeepTreeEchoBot/DeepTreeEchoUIBridge
// Correct.

// Mock dependencies
jest.mock("../../../hooks/chat/useMessage", () => ({
  default: () => ({ sendMessage: jest.fn() }),
}));

jest.mock("../../../stores/settings", () => ({
  useSettingsStore: () => [
    {
      desktopSettings: {
        deepTreeEchoBotEnabled: true,
        deepTreeEchoBotApiKey: "test-key",
      },
    },
  ],
}));

jest.mock("../../DeepTreeEchoBot/LLMService", () => ({
  LLMService: {
    getInstance: () => ({
      setConfig: jest.fn(),
    }),
  },
}));

// Mock useDialog hook
const mockDialogContext = {
  openDialog: jest.fn(),
  closeDialog: jest.fn(),
};

jest.mock("../../../hooks/dialog/useDialog", () => ({
  default: () => mockDialogContext,
}));

// Mock UI Bridge
jest.mock("../../DeepTreeEchoBot/DeepTreeEchoUIBridge", () => ({
  getUIBridge: jest.fn().mockReturnValue({
    registerDialogContext: jest.fn(),
  }),
}));

jest.mock("../../../backend-com", () => ({
  onDCEvent: jest.fn(),
  BackendRemote: {
    rpc: {
      getMessage: jest.fn(),
    },
  },
}));

jest.mock("../../../ScreenController", () => ({
  selectedAccountId: () => 123,
}));

describe("DeepTreeEchoBot Integration", () => {
  it("should register DialogContext with DeepTreeEchoUIBridge", () => {
    const {
      getUIBridge,
    } = require("../../DeepTreeEchoBot/DeepTreeEchoUIBridge");
    const mockRegisterDialogContext = jest.fn();
    getUIBridge.mockReturnValue({
      registerDialogContext: mockRegisterDialogContext,
    });

    render(<DeepTreeEchoBot enabled={true} />);

    expect(getUIBridge).toHaveBeenCalled();
    expect(mockRegisterDialogContext).toHaveBeenCalledWith(mockDialogContext);
  });
});

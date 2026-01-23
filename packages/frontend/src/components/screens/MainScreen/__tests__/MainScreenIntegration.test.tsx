import React from "react";
import { render } from "@testing-library/react";
import MainScreen from "../MainScreen";
import type { DeepTreeEchoUIBridge as _DeepTreeEchoUIBridge } from "../../../DeepTreeEchoBot/DeepTreeEchoUIBridge";
import { ChatView } from "../../../../contexts/ChatContext";

// Mocks
const mockSelectChat = jest.fn();
const mockUnselectChat = jest.fn();

jest.mock("../../../../hooks/chat/useChat", () => ({
  default: () => ({
    activeView: ChatView.MessageList,
    chatId: null,
    chatWithLinger: null,
    alternativeView: null,
    selectChat: mockSelectChat,
    unselectChat: mockUnselectChat,
  }),
}));

jest.mock("../../../../hooks/useTranslationFunction", () => ({
  default: () => (key: string) => key,
}));

jest.mock("../../../DeepTreeEchoBot/DeepTreeEchoUIBridge", () => ({
  getUIBridge: jest.fn().mockReturnValue({
    registerChatContext: jest.fn(),
  }),
  DeepTreeEchoUIBridge: {
    getInstance: jest.fn().mockReturnValue({
      registerChatContext: jest.fn(),
    }),
  },
}));

jest.mock("../../../../contexts/ScreenContext", () => ({
  ScreenContext: React.createContext({
    changeScreen: jest.fn(),
    smallScreenMode: false,
  }),
}));

// Mock child components to avoid deep rendering issues
// Mock child components to avoid deep rendering issues
jest.mock("../../../chat/ChatList", () => () => null);
jest.mock("../../../MessageListView", () => () => null);
jest.mock("../../../ThreeDotMenu", () => ({
  useThreeDotMenu: () => jest.fn(),
}));
jest.mock("../../../Avatar", () => ({ Avatar: () => null }));
jest.mock("../../../ConnectivityToast", () => () => null);
jest.mock("../../../Button", () => ({ children, onClick }: any) => {
  onClick && onClick();
  return children;
});
jest.mock("../../../Icon", () => () => null);
jest.mock("../../../SearchInput", () => () => null);

describe.skip("MainScreen Integration", () => {
  it("should register ChatContext with DeepTreeEchoUIBridge", async () => {
    const {
      getUIBridge,
    } = require("../../../DeepTreeEchoBot/DeepTreeEchoUIBridge");
    const mockRegisterChatContext = jest.fn();
    getUIBridge.mockReturnValue({
      registerChatContext: mockRegisterChatContext,
    });

    const { waitFor } = require("@testing-library/react");

    render(<MainScreen accountId={123} />);

    expect(getUIBridge).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockRegisterChatContext).toHaveBeenCalledWith(
        expect.objectContaining({
          selectChat: mockSelectChat,
          unselectChat: mockUnselectChat,
        }),
        123,
      );
    });
  });
});

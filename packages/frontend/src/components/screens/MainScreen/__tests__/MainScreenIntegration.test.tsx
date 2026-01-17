import React from 'react';
import { render } from '@testing-library/react';
import MainScreen from '../MainScreen';
import { DeepTreeEchoUIBridge } from '../../../DeepTreeEchoBot/DeepTreeEchoUIBridge';
import { ChatView } from '../../../../contexts/ChatContext';

// Mocks
const mockSelectChat = jest.fn();
const mockUnselectChat = jest.fn();

jest.mock('../../../../hooks/chat/useChat', () => ({
    default: () => ({
        activeView: ChatView.MessageList,
        chatId: null,
        chatWithLinger: null,
        alternativeView: null,
        selectChat: mockSelectChat,
        unselectChat: mockUnselectChat,
    }),
}));

jest.mock('../../../../hooks/useTranslationFunction', () => ({
    default: () => (key: string) => key,
}));

jest.mock('../../../DeepTreeEchoBot/DeepTreeEchoUIBridge', () => ({
    getUIBridge: jest.fn().mockReturnValue({
        registerChatContext: jest.fn(),
    }),
    DeepTreeEchoUIBridge: {
        getInstance: jest.fn().mockReturnValue({
            registerChatContext: jest.fn(),
        }),
    }
}));

jest.mock('../../../../contexts/ScreenContext', () => ({
    ScreenContext: React.createContext({
        changeScreen: jest.fn(),
        smallScreenMode: false,
    }),
}));

// Mock child components to avoid deep rendering issues
jest.mock('../../chat/ChatList', () => () => <div data-testid="chat-list">ChatList</div>);
jest.mock('../../MessageListView', () => () => <div data-testid="message-list">MessageListView</div>);
jest.mock('../../ThreeDotMenu', () => ({ useThreeDotMenu: () => jest.fn() }));
jest.mock('../../Avatar', () => ({ Avatar: () => <div>Avatar</div> }));
jest.mock('../../ConnectivityToast', () => () => <div>Toast</div>);
jest.mock('../../Button', () => ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>);
jest.mock('../../Icon', () => () => <div>Icon</div>);
jest.mock('../../SearchInput', () => () => <input data-testid="search-input" />);


describe('MainScreen Integration', () => {

    it('should register ChatContext with DeepTreeEchoUIBridge', () => {
        const { getUIBridge } = require('../../../DeepTreeEchoBot/DeepTreeEchoUIBridge');
        const mockRegisterChatContext = jest.fn();
        getUIBridge.mockReturnValue({
            registerChatContext: mockRegisterChatContext
        });

        render(<MainScreen accountId={123} />);

        expect(getUIBridge).toHaveBeenCalled();
        expect(mockRegisterChatContext).toHaveBeenCalledWith(
            expect.objectContaining({
                selectChat: mockSelectChat,
                unselectChat: mockUnselectChat,
            }),
            123
        );
    });
});

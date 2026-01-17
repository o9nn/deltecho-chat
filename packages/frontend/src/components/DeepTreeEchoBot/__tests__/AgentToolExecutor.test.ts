import { AgentToolExecutor } from '../AgentToolExecutor';
import { DeepTreeEchoChatManager } from '../DeepTreeEchoChatManager';
import { BackendRemote } from '../../backend-com';

jest.mock('../DeepTreeEchoChatManager', () => ({
    DeepTreeEchoChatManager: {
        getInstance: jest.fn().mockReturnValue({
            listChats: jest.fn(),
            openChat: jest.fn(),
            searchContacts: jest.fn(),
            getChatHistory: jest.fn(),
            createChat: jest.fn(),
            scheduleMessage: jest.fn(),
        })
    }
}));

jest.mock('../../backend-com', () => ({
    BackendRemote: {
        rpc: {
            miscSendTextMessage: jest.fn(),
        }
    }
}));

// Mock logger
jest.mock('@deltachat-desktop/shared/logger', () => ({
    getLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

describe('AgentToolExecutor', () => {
    let executor: AgentToolExecutor;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton hack
        (AgentToolExecutor as any).instance = null;
        executor = AgentToolExecutor.getInstance();
    });

    it('should list available tools', () => {
        const tools = executor.getAvailableTools();
        expect(tools.length).toBeGreaterThan(0);
        expect(tools.find(t => t.name === 'list_chats')).toBeDefined();
        expect(tools.find(t => t.name === 'send_message')).toBeDefined();
    });

    it('should execute list_chats tool', async () => {
        const mockListChats = DeepTreeEchoChatManager.getInstance().listChats as jest.Mock;
        mockListChats.mockResolvedValue([
            { id: 1, name: 'Chat 1', unreadCount: 1, isGroup: false, lastMessagePreview: 'Hello' }
        ]);

        const result = await executor.executeTool({
            id: '1',
            name: 'list_chats',
            input: { accountId: 1, filter: 'all' }
        }, 1);

        expect(result.success).toBe(true);
        const chats = JSON.parse(result.output);
        expect(chats).toHaveLength(1);
        expect(chats[0].name).toBe('Chat 1');
        expect(mockListChats).toHaveBeenCalledWith(1);
    });

    it('should execute send_message tool', async () => {
        (BackendRemote.rpc.miscSendTextMessage as jest.Mock).mockResolvedValue(100);

        const result = await executor.executeTool({
            id: '2',
            name: 'send_message',
            input: { accountId: 1, chatId: 10, text: 'Hi' }
        }, 1);

        expect(result.success).toBe(true);
        expect(result.output).toContain('Message sent');
        expect(BackendRemote.rpc.miscSendTextMessage).toHaveBeenCalledWith(1, 10, 'Hi');
    });

    it('should handle unknown tool', async () => {
        const result = await executor.executeTool({
            id: '3',
            name: 'unknown_tool',
            input: {}
        }, 1);

        expect(result.success).toBe(false);
        expect(result.output).toContain('Unknown tool');
    });
});

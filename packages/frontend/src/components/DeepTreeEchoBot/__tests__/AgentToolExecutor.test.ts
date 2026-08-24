import { AgentToolExecutor } from "../AgentToolExecutor";
import { DeepTreeEchoChatManager } from "../DeepTreeEchoChatManager";
import { BackendRemote } from "../../../backend-com";
import { proactiveMessaging } from "../ProactiveMessaging";

jest.mock("../DeepTreeEchoChatManager", () => ({
  DeepTreeEchoChatManager: {
    getInstance: jest.fn().mockReturnValue({
      listChats: jest.fn(),
      openChat: jest.fn(),
      searchContacts: jest.fn(),
      getChatHistory: jest.fn(),
      createChat: jest.fn(),
      scheduleMessage: jest.fn(),
    }),
  },
}));

jest.mock("../ProactiveMessaging", () => ({
  proactiveMessaging: {
    sendGated: jest.fn(),
    getStatusSnapshot: jest.fn(),
    getQueuedMessages: jest.fn(() => []),
  },
}));

jest.mock("../../../backend-com", () => ({
  BackendRemote: {
    rpc: {
      miscSendTextMessage: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock("@deltachat-desktop/shared/logger", () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe("AgentToolExecutor", () => {
  let executor: AgentToolExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton hack
    (AgentToolExecutor as any).instance = null;
    executor = AgentToolExecutor.getInstance();
  });

  it("should list available tools", () => {
    const tools = executor.getAvailableTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.find((t) => t.name === "list_chats")).toBeDefined();
    expect(tools.find((t) => t.name === "send_message")).toBeDefined();
    expect(tools.find((t) => t.name === "get_proactive_status")).toBeDefined();
  });

  it("should execute list_chats tool", async () => {
    const mockListChats = DeepTreeEchoChatManager.getInstance()
      .listChats as jest.Mock;
    mockListChats.mockResolvedValue([
      {
        id: 1,
        name: "Chat 1",
        unreadCount: 1,
        isGroup: false,
        lastMessagePreview: "Hello",
      },
    ]);

    const result = await executor.executeTool(
      {
        id: "1",
        name: "list_chats",
        input: { accountId: 1, filter: "all" },
      },
      1,
    );

    expect(result.success).toBe(true);
    const chats = JSON.parse(result.output);
    expect(chats).toHaveLength(1);
    expect(chats[0].name).toBe("Chat 1");
    expect(mockListChats).toHaveBeenCalledWith(1);
  });

  it("should execute send_message through the gated API", async () => {
    (proactiveMessaging.sendGated as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 100,
    });

    const result = await executor.executeTool(
      {
        id: "2",
        name: "send_message",
        input: { accountId: 1, chatId: 10, text: "Hi" },
      },
      1,
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain("Message sent");
    expect(proactiveMessaging.sendGated).toHaveBeenCalledWith({
      accountId: 1,
      chatId: 10,
      message: "Hi",
    });
    expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
  });

  it("returns disabled without sending when proactive is off (AE1)", async () => {
    (proactiveMessaging.sendGated as jest.Mock).mockResolvedValue({
      success: false,
      reason: "disabled",
    });

    const result = await executor.executeTool(
      {
        id: "2b",
        name: "send_message",
        input: { accountId: 1, chatId: 10, text: "Hi" },
      },
      1,
    );

    expect(result.success).toBe(false);
    expect(result.metadata?.reason).toBe("disabled");
    expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
  });

  it("queues during quiet hours and reports quiet_hours (AE3)", async () => {
    (proactiveMessaging.sendGated as jest.Mock).mockResolvedValue({
      success: true,
      queued: true,
      reason: "quiet_hours",
      queueId: "msg-1",
    });

    const result = await executor.executeTool(
      {
        id: "2c",
        name: "send_message",
        input: { accountId: 1, chatId: 10, text: "Hi" },
      },
      1,
    );

    expect(result.metadata?.reason).toBe("quiet_hours");
    expect(result.metadata?.queued).toBe(true);
    expect(result.metadata?.queueId).toBe("msg-1");
    expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
  });

  it("schedules onto the proactive queue (AE7)", async () => {
    (proactiveMessaging.sendGated as jest.Mock).mockResolvedValue({
      success: true,
      queued: true,
      queueId: "msg-scheduled",
    });

    const result = await executor.executeTool(
      {
        id: "2d",
        name: "schedule_message",
        input: {
          accountId: 1,
          chatId: 10,
          text: "Later",
          delayMinutes: 5,
        },
      },
      1,
    );

    expect(result.success).toBe(true);
    expect(result.metadata?.queued).toBe(true);
    const gatedCall = (proactiveMessaging.sendGated as jest.Mock).mock
      .calls[0][0];
    expect(gatedCall.accountId).toBe(1);
    expect(gatedCall.chatId).toBe(10);
    expect(gatedCall.message).toBe("Later");
    expect(gatedCall.triggerId).toBe("agent-schedule");
    expect(gatedCall.scheduledTime).toBeGreaterThan(Date.now() - 1000);
    expect(
      DeepTreeEchoChatManager.getInstance().scheduleMessage,
    ).not.toHaveBeenCalled();
  });

  it("returns read-only proactive status without trigger templates", async () => {
    (proactiveMessaging.getStatusSnapshot as jest.Mock).mockReturnValue({
      enabled: true,
      quietHours: false,
      hourlyUsed: 1,
      hourlyLimit: 10,
      dailyUsed: 2,
      dailyLimit: 50,
      triggerIds: ["trigger-1"],
      queuedIds: ["msg-1"],
    });

    const result = await executor.executeTool(
      {
        id: "2e",
        name: "get_proactive_status",
        input: { chatId: 10 },
      },
      1,
    );

    expect(result.success).toBe(true);
    expect(result.metadata?.enabled).toBe(true);
    expect(result.output).toContain('"enabled":true');
    expect(result.output).not.toContain("Hello! I'm Deep Tree Echo");
  });

  it("should handle unknown tool", async () => {
    const result = await executor.executeTool(
      {
        id: "3",
        name: "unknown_tool",
        input: {},
      },
      1,
    );

    expect(result.success).toBe(false);
    expect(result.output).toContain("Unknown tool");
  });
});

import { DeepTreeEchoChatManager } from "../DeepTreeEchoChatManager";
import { BackendRemote } from "../../../backend-com";

jest.mock("../../../backend-com", () => ({
  BackendRemote: {
    rpc: {
      getChatlistEntries: jest.fn(),
      getBasicChatInfo: jest.fn(),
      getMessageIds: jest.fn(),
      getMessage: jest.fn(),
      createContact: jest.fn(),
      createChatByContactId: jest.fn(),
      miscSendTextMessage: jest.fn(),
    },
    on: jest.fn(),
  },
  C: {
    DC_CHAT_TYPE_GROUP: 20,
    DC_CHAT_TYPE_BROADCAST: 30,
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

describe("DeepTreeEchoChatManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DeepTreeEchoChatManager.resetInstance();
  });

  it("should list chats correctly", async () => {
    (BackendRemote.rpc.getChatlistEntries as jest.Mock).mockResolvedValue([1]);
    (BackendRemote.rpc.getBasicChatInfo as jest.Mock).mockResolvedValue({
      name: "Test Chat",
      chatType: 0,
      archived: false,
      isMuted: false,
    });

    const manager = DeepTreeEchoChatManager.getInstance();
    const chats = await manager.listChats(1);

    expect(chats).toHaveLength(1);
    expect(chats[0].name).toBe("Test Chat");
    expect(BackendRemote.rpc.getChatlistEntries).toHaveBeenCalledWith(
      1,
      0,
      null,
      null,
    );
  });

  it("should create a new chat", async () => {
    (BackendRemote.rpc.createContact as jest.Mock).mockResolvedValue(100);
    (BackendRemote.rpc.createChatByContactId as jest.Mock).mockResolvedValue(
      200,
    );

    const manager = DeepTreeEchoChatManager.getInstance();
    const chatId = await manager.createChat(1, "test@example.com");

    expect(chatId).toBe(200);
    expect(BackendRemote.rpc.createContact).toHaveBeenCalledWith(
      1,
      "test@example.com",
      "test",
    );
    expect(BackendRemote.rpc.createChatByContactId).toHaveBeenCalledWith(
      1,
      100,
    );
  });

  it("should send a message", async () => {
    (BackendRemote.rpc.miscSendTextMessage as jest.Mock).mockResolvedValue(999);

    const manager = DeepTreeEchoChatManager.getInstance();
    const msgId = await manager.sendMessage(1, 200, "Hello World");

    expect(msgId).toBe(999);
    expect(BackendRemote.rpc.miscSendTextMessage).toHaveBeenCalledWith(
      1,
      200,
      "Hello World",
    );
  });
});

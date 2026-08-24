/**
 * Tests for Proactive Messaging Components
 *
 * Tests cover:
 * - DeepTreeEchoChatManager
 * - DeepTreeEchoUIBridge
 * - ProactiveMessaging
 */

// Mock BackendRemote
jest.mock("../../../backend-com", () => ({
  C: {
    DC_CHAT_TYPE_SINGLE: 100,
    DC_CHAT_TYPE_GROUP: 120,
    DC_CHAT_TYPE_BROADCAST: 160,
    DC_CHAT_TYPE_MAILINGLIST: 140,
  },
  BackendRemote: {
    rpc: {
      getChatlistEntries: jest.fn().mockResolvedValue([]),
      getBasicChatInfo: jest.fn().mockResolvedValue({
        name: "Test Chat",
        chatType: 100, // DC_CHAT_TYPE_SINGLE
        archived: false,
        isMuted: false,
      }),
      getFullChatById: jest.fn().mockResolvedValue({
        id: 1,
        name: "Test Chat",
        contactIds: [],
      }),
      getMessage: jest.fn().mockResolvedValue({
        id: 1,
        text: "Hello",
        fromId: 2,
        timestamp: Date.now(),
      }),
      getMessageIds: jest.fn().mockResolvedValue([1, 2, 3]),
      miscSendTextMessage: jest.fn().mockResolvedValue(100),
      markseenMsgs: jest.fn().mockResolvedValue(true), // Updated mock
      createContact: jest.fn().mockResolvedValue(1),
      createChatByContactId: jest.fn().mockResolvedValue(1),
      createGroupChat: jest.fn().mockResolvedValue(1),
      addContactToChat: jest.fn().mockResolvedValue(undefined),
      getAllAccounts: jest.fn().mockResolvedValue([{ id: 1 }]),
      getChatIdByContactId: jest.fn().mockResolvedValue(0),
      getFreshMsgCnt: jest.fn().mockResolvedValue(0),
      getContacts: jest.fn().mockResolvedValue([]),
      getContactIds: jest.fn().mockResolvedValue([]),
    },
    on: jest.fn(),
    off: jest.fn(),
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

// Mock keybindings
jest.mock("../../../keybindings", () => ({
  ActionEmitter: {
    emitAction: jest.fn(),
  },
  KeybindAction: {
    Settings_Open: "Settings_Open",
    GlobalGallery_Open: "GlobalGallery_Open",
    ChatList_FocusSearchInput: "ChatList_FocusSearchInput",
    ChatList_FocusChatList: "ChatList_FocusChatList",
    ChatList_SelectNextChat: "ChatList_SelectNextChat",
    ChatList_SelectPreviousChat: "ChatList_SelectPreviousChat",
    ChatList_SwitchToArchiveView: "ChatList_SwitchToArchiveView",
    ChatList_SwitchToNormalView: "ChatList_SwitchToNormalView",
  },
}));

describe("DeepTreeEchoChatManager", () => {
  let chatManager: any;

  beforeEach(async () => {
    // Reset singleton instance explicitly
    const {
      DeepTreeEchoChatManager,
      getChatManager: getCM,
    } = require("../DeepTreeEchoChatManager");
    DeepTreeEchoChatManager.resetInstance();

    // Use the actual instance instead of Proxy
    chatManager = getCM();
  });

  afterEach(() => {
    chatManager.cleanup();
  });

  describe("listChats", () => {
    it("should return empty array when no chats", async () => {
      const chats = await chatManager.listChats(1);
      expect(Array.isArray(chats)).toBe(true);
    });
  });

  describe("openChat", () => {
    it("should open a chat and update active state", async () => {
      const result = await chatManager.openChat(1, 100);
      expect(result).toBe(true);

      const activeChat = chatManager.getActiveChat();
      expect(activeChat).not.toBeNull();
      expect(activeChat?.chatId).toBe(100);
      expect(activeChat?.accountId).toBe(1);
    });
  });

  describe("closeChat", () => {
    it("should close the active chat", async () => {
      await chatManager.openChat(1, 100);
      chatManager.closeChat();

      const activeChat = chatManager.getActiveChat();
      expect(activeChat).toBeNull();
    });
  });

  describe("sendMessage", () => {
    it("should send a message to a chat", async () => {
      const msgId = await chatManager.sendMessage(1, 100, "Hello!");
      expect(msgId).toBe(100); // Mocked return value
    });
  });

  describe("scheduleMessage", () => {
    it("should schedule a message for later", () => {
      const id = chatManager.scheduleMessage(
        1,
        100,
        "Scheduled message",
        Date.now() + 60000,
        "Test reason",
      );

      expect(id).toMatch(/^scheduled-/);

      const scheduled = chatManager.getScheduledMessages();
      expect(scheduled.length).toBe(1);
      expect(scheduled[0].text).toBe("Scheduled message");
    });

    it("should cancel a scheduled message", () => {
      const id = chatManager.scheduleMessage(
        1,
        100,
        "To be cancelled",
        Date.now() + 60000,
        "Test",
      );

      const result = chatManager.cancelScheduledMessage(id);
      expect(result).toBe(true);

      const scheduled = chatManager.getScheduledMessages();
      expect(scheduled.length).toBe(0);
    });
  });

  describe("checkForMention", () => {
    it("should detect Deep Tree Echo mentions", () => {
      expect(chatManager.checkForMention("Hey Deep Tree Echo!")).toBe(true);
      expect(chatManager.checkForMention("Hello DTE")).toBe(true);
      expect(chatManager.checkForMention("@bot help")).toBe(true);
      expect(chatManager.checkForMention("Hey echo, how are you?")).toBe(true);
      expect(chatManager.checkForMention("Hello there")).toBe(false);
    });
  });

  describe("watchChat", () => {
    it("should register and unregister watchers", () => {
      const callback = jest.fn();
      const unwatch = chatManager.watchChat(1, 100, callback);

      expect(typeof unwatch).toBe("function");

      // Unwatch
      unwatch();
    });
  });
});

describe("DeepTreeEchoUIBridge", () => {
  let uiBridge: any;
  let mockContext: any;

  beforeEach(async () => {
    // Reset singleton instance explicitly
    const {
      DeepTreeEchoUIBridge,
      getUIBridge: getUB,
    } = require("../DeepTreeEchoUIBridge");
    DeepTreeEchoUIBridge.resetInstance();

    uiBridge = getUB();
    mockContext = {
      selectChat: jest.fn().mockResolvedValue(true),
      unselectChat: jest.fn(),
      chatId: 100,
    };
  });

  afterEach(() => {
    uiBridge.cleanup();
  });

  describe("registerChatContext", () => {
    it("should register a chat context", () => {
      uiBridge.registerChatContext(mockContext, 1);

      const selected = uiBridge.getSelectedChat();
      expect(selected).not.toBeNull();
      expect(selected?.chatId).toBe(100);
    });
  });

  describe("selectChat", () => {
    it("should return false when no context registered", async () => {
      const result = await uiBridge.selectChat(1, 100);
      expect(result).toBe(false);
    });

    it("should select chat when context is registered", async () => {
      const mockContext = {
        selectChat: jest.fn().mockResolvedValue(true),
        unselectChat: jest.fn(),
      };

      uiBridge.registerChatContext(mockContext, 1);
      const result = await uiBridge.selectChat(1, 100);

      expect(result).toBe(true);
      expect(mockContext.selectChat).toHaveBeenCalledWith(1, 100);
    });
  });

  describe("getState", () => {
    it("should return current UI state", () => {
      const state = uiBridge.getState();

      expect(state).toHaveProperty("currentView");
      expect(state).toHaveProperty("activeAccountId");
      expect(state).toHaveProperty("activeChatId");
      expect(state).toHaveProperty("isDialogOpen");
    });
  });

  describe("event system", () => {
    it("should emit and receive events", async () => {
      const listener = jest.fn();
      const unsubscribe = uiBridge.on(listener);

      const mockContext = {
        selectChat: jest.fn().mockResolvedValue(true),
        unselectChat: jest.fn(),
      };

      uiBridge.registerChatContext(mockContext, 1);
      await uiBridge.selectChat(1, 100);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "chat_selected",
          chatId: 100,
          accountId: 1,
        }),
      );

      unsubscribe();
    });
  });
});

describe("ProactiveMessaging", () => {
  let proactiveMessaging: any;

  beforeEach(async () => {
    // Reset singleton instance explicitly
    const {
      ProactiveMessaging,
      getProactiveMessaging: getPM,
    } = require("../ProactiveMessaging");
    const { DeepTreeEchoChatManager } = require("../DeepTreeEchoChatManager");
    const { DeepTreeEchoUIBridge } = require("../DeepTreeEchoUIBridge");

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-24T12:00:00"));

    ProactiveMessaging.resetInstance();
    DeepTreeEchoChatManager.resetInstance();
    DeepTreeEchoUIBridge.resetInstance();

    proactiveMessaging = getPM();
  });

  afterEach(() => {
    proactiveMessaging.cleanup();
    jest.useRealTimers();
  });

  describe("configuration", () => {
    it("should have default configuration", () => {
      const config = proactiveMessaging.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.maxMessagesPerHour).toBe(10);
      expect(config.maxMessagesPerDay).toBe(50);
    });

    it("should update configuration", () => {
      proactiveMessaging.updateConfig({
        maxMessagesPerHour: 20,
        quietHoursStart: 23,
      });

      const config = proactiveMessaging.getConfig();
      expect(config.maxMessagesPerHour).toBe(20);
      expect(config.quietHoursStart).toBe(23);
    });

    it("should enable/disable proactive messaging", () => {
      proactiveMessaging.setEnabled(false);
      expect(proactiveMessaging.getConfig().enabled).toBe(false);

      proactiveMessaging.setEnabled(true);
      expect(proactiveMessaging.getConfig().enabled).toBe(true);
    });
  });

  describe("triggers", () => {
    it("should add a trigger", () => {
      const id = proactiveMessaging.addTrigger({
        type: "scheduled",
        name: "Test Trigger",
        description: "A test trigger",
        enabled: true,
        scheduledTime: Date.now() + 60000,
        targetType: "specific_chat",
        targetChatId: 100,
        targetAccountId: 1,
        messageTemplate: "Test message",
      });

      expect(id).toMatch(/^trigger-/);

      const triggers = proactiveMessaging.getTriggers();
      expect(triggers.some((t: any) => t.id === id)).toBe(true);
    });

    it("should remove a trigger", () => {
      const id = proactiveMessaging.addTrigger({
        type: "interval",
        name: "To Remove",
        description: "Will be removed",
        enabled: true,
        intervalMinutes: 60,
        targetType: "all_chats",
        messageTemplate: "Test",
      });

      const result = proactiveMessaging.removeTrigger(id);
      expect(result).toBe(true);

      const trigger = proactiveMessaging.getTrigger(id);
      expect(trigger).toBeUndefined();
    });

    it("should enable/disable a trigger", () => {
      const id = proactiveMessaging.addTrigger({
        type: "interval",
        name: "Toggle Test",
        description: "Test",
        enabled: true,
        intervalMinutes: 60,
        targetType: "all_chats",
        messageTemplate: "Test",
      });

      proactiveMessaging.setTriggerEnabled(id, false);

      const trigger = proactiveMessaging.getTrigger(id);
      expect(trigger?.enabled).toBe(false);
    });

    it("should have default triggers", () => {
      const triggers = proactiveMessaging.getTriggers();

      // Should have at least the welcome trigger
      const welcomeTrigger = triggers.find(
        (t: any) => t.name === "Welcome New Contact",
      );
      expect(welcomeTrigger).toBeDefined();
      expect(welcomeTrigger?.enabled).toBe(true);
    });
  });

  describe("message queue", () => {
    it("should queue a message", () => {
      const id = proactiveMessaging.queueMessage({
        triggerId: "test-trigger",
        accountId: 1,
        chatId: 100,
        message: "Queued message",
        priority: "normal",
      });

      expect(id).toMatch(/^msg-/);

      const queued = proactiveMessaging.getQueuedMessages();
      expect(queued.some((m: any) => m.id === id)).toBe(true);
    });

    it("should cancel a queued message", () => {
      const id = proactiveMessaging.queueMessage({
        triggerId: "test-trigger",
        accountId: 1,
        chatId: 100,
        message: "To cancel",
      });

      const result = proactiveMessaging.cancelQueuedMessage(id);
      expect(result).toBe(true);

      const queued = proactiveMessaging.getQueuedMessages();
      expect(queued.some((m: any) => m.id === id)).toBe(false);
    });

    it("should prioritize high priority messages", () => {
      proactiveMessaging.queueMessage({
        triggerId: "test",
        accountId: 1,
        chatId: 100,
        message: "Low priority",
        priority: "low",
      });

      proactiveMessaging.queueMessage({
        triggerId: "test",
        accountId: 1,
        chatId: 100,
        message: "High priority",
        priority: "high",
      });

      const queued = proactiveMessaging.getQueuedMessages();
      expect(queued[0].message).toBe("High priority");
    });
  });

  describe("scheduling", () => {
    it("should schedule a one-time message", () => {
      const triggerId = proactiveMessaging.scheduleOneTime(
        1,
        100,
        "Scheduled message",
        Date.now() + 3600000,
      );

      expect(triggerId).toMatch(/^trigger-/);

      const trigger = proactiveMessaging.getTrigger(triggerId);
      expect(trigger?.type).toBe("scheduled");
      expect(trigger?.maxTriggers).toBe(1);
    });

    it("should set up periodic check-ins", () => {
      const triggerId = proactiveMessaging.setupPeriodicCheckIn(
        1,
        100,
        24, // Every 24 hours
        "Daily check-in message",
      );

      const trigger = proactiveMessaging.getTrigger(triggerId);
      expect(trigger?.type).toBe("interval");
      expect(trigger?.intervalMinutes).toBe(24 * 60);
    });
  });

  describe("event handling", () => {
    it("should handle events", async () => {
      // Add an event trigger
      proactiveMessaging.addTrigger({
        type: "event",
        name: "Test Event Handler",
        description: "Handles test events",
        enabled: true,
        eventType: "app_startup",
        targetType: "all_chats",
        messageTemplate: "App started!",
      });

      // This should not throw
      await proactiveMessaging.handleEvent("app_startup", {});
    });
  });

  describe("quiet hours (AE3)", () => {
    const { BackendRemote } = require("../../../backend-com");

    it("does not send from processQueue during overnight quiet hours", async () => {
      jest.setSystemTime(new Date("2026-08-24T23:00:00"));
      BackendRemote.rpc.miscSendTextMessage.mockClear();

      proactiveMessaging.queueMessage({
        triggerId: "test",
        accountId: 1,
        chatId: 100,
        message: "overnight",
      });

      await proactiveMessaging.processQueue();

      expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
      expect(proactiveMessaging.getQueuedMessages()).toHaveLength(1);
    });

    it("does not queue interval silence checks during overnight quiet hours", async () => {
      jest.setSystemTime(new Date("2026-08-24T23:00:00"));
      const silence = proactiveMessaging
        .getTriggers()
        .find((t: any) => t.name === "Check In After Silence");
      proactiveMessaging.setTriggerEnabled(silence.id, true);
      BackendRemote.rpc.getChatlistEntries.mockResolvedValue([100]);
      BackendRemote.rpc.getBasicChatInfo.mockResolvedValue({
        name: "Quiet Chat",
        chatType: 100,
        archived: false,
        isMuted: false,
      });
      BackendRemote.rpc.getMessageIds.mockResolvedValue([1]);
      BackendRemote.rpc.getMessage.mockResolvedValue({
        id: 1,
        text: "old",
        fromId: 2,
        timestamp: Math.floor(Date.now() / 1000) - 25 * 60 * 60,
      });

      await proactiveMessaging.checkTriggers();

      expect(proactiveMessaging.getQueuedMessages()).toHaveLength(0);
    });

    it("does not send from processQueue during same-day quiet hours", async () => {
      jest.setSystemTime(new Date("2026-08-24T10:00:00"));
      proactiveMessaging.updateConfig({
        quietHoursStart: 9,
        quietHoursEnd: 17,
      });
      BackendRemote.rpc.miscSendTextMessage.mockClear();

      proactiveMessaging.queueMessage({
        triggerId: "test",
        accountId: 1,
        chatId: 100,
        message: "daytime quiet",
      });

      await proactiveMessaging.processQueue();

      expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
      expect(proactiveMessaging.getQueuedMessages()).toHaveLength(1);
    });
  });

  describe("welcome new contact (AE2)", () => {
    const { BackendRemote, C } = require("../../../backend-com");

    beforeEach(() => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      BackendRemote.rpc.miscSendTextMessage.mockClear();
    });

    it("queues one welcome for a new contact with an existing 1:1 chat", async () => {
      BackendRemote.rpc.getChatIdByContactId.mockResolvedValue(42);
      BackendRemote.rpc.getFullChatById.mockResolvedValue({
        id: 42,
        name: "Alice",
        isSelfTalk: false,
        isDeviceTalk: false,
        chatType: C.DC_CHAT_TYPE_SINGLE,
      });

      await proactiveMessaging.handleEvent("new_contact", {
        accountId: 1,
        contactId: 7,
      });

      const queued = proactiveMessaging.getQueuedMessages();
      expect(queued).toHaveLength(1);
      expect(queued[0].chatId).toBe(42);

      await proactiveMessaging.handleEvent("new_contact", {
        accountId: 1,
        contactId: 7,
      });
      expect(proactiveMessaging.getQueuedMessages()).toHaveLength(1);
    });

    it("queues none when the contact has no chat", async () => {
      BackendRemote.rpc.getChatIdByContactId.mockResolvedValue(0);

      await proactiveMessaging.handleEvent("new_contact", {
        accountId: 1,
        contactId: 8,
      });

      expect(proactiveMessaging.getQueuedMessages()).toHaveLength(0);
    });

    it.each([
      ["self-talk", { isSelfTalk: true, isDeviceTalk: false }],
      ["device-talk", { isSelfTalk: false, isDeviceTalk: true }],
      ["broadcast", { isSelfTalk: false, isDeviceTalk: false, chatType: 160 }],
      [
        "mailing-list",
        { isSelfTalk: false, isDeviceTalk: false, chatType: 140 },
      ],
    ])("skips %s chats", async (_label, extra) => {
      BackendRemote.rpc.getChatIdByContactId.mockResolvedValue(55);
      BackendRemote.rpc.getFullChatById.mockResolvedValue({
        id: 55,
        name: "Skip me",
        chatType: C.DC_CHAT_TYPE_SINGLE,
        ...extra,
      });

      await proactiveMessaging.handleEvent("new_contact", {
        accountId: 1,
        contactId: 9,
      });

      expect(proactiveMessaging.getQueuedMessages()).toHaveLength(0);
    });
  });

  describe("silence duration (R7)", () => {
    const { BackendRemote } = require("../../../backend-com");

    async function enableSilenceTrigger() {
      const silence = proactiveMessaging
        .getTriggers()
        .find((t: any) => t.name === "Check In After Silence");
      expect(silence).toBeDefined();
      proactiveMessaging.setTriggerEnabled(silence.id, true);
      return silence;
    }

    it("queues when last message is older than the threshold", async () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      await enableSilenceTrigger();

      const nowSec = Math.floor(Date.now() / 1000);
      BackendRemote.rpc.getChatlistEntries.mockResolvedValue([100]);
      BackendRemote.rpc.getBasicChatInfo.mockResolvedValue({
        name: "Quiet Chat",
        chatType: 100,
        archived: false,
        isMuted: false,
      });
      BackendRemote.rpc.getMessageIds.mockResolvedValue([1]);
      BackendRemote.rpc.getMessage.mockResolvedValue({
        id: 1,
        text: "old",
        fromId: 2,
        timestamp: nowSec - 25 * 60 * 60,
      });

      await proactiveMessaging.checkTriggers();

      expect(
        proactiveMessaging
          .getQueuedMessages()
          .some((m: any) => m.chatId === 100),
      ).toBe(true);
    });

    it("does not queue when last message is newer than the threshold", async () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      await enableSilenceTrigger();

      const nowSec = Math.floor(Date.now() / 1000);
      BackendRemote.rpc.getChatlistEntries.mockResolvedValue([101]);
      BackendRemote.rpc.getBasicChatInfo.mockResolvedValue({
        name: "Active Chat",
        chatType: 100,
        archived: false,
        isMuted: false,
      });
      BackendRemote.rpc.getMessageIds.mockResolvedValue([1]);
      BackendRemote.rpc.getMessage.mockResolvedValue({
        id: 1,
        text: "recent",
        fromId: 2,
        timestamp: nowSec - 60 * 60,
      });

      await proactiveMessaging.checkTriggers();

      expect(
        proactiveMessaging
          .getQueuedMessages()
          .some((m: any) => m.chatId === 101),
      ).toBe(false);
    });
  });

  describe("null send result (AE4)", () => {
    const { BackendRemote } = require("../../../backend-com");

    it("does not mark sent or increment hourly count when send returns null", async () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      BackendRemote.rpc.miscSendTextMessage.mockResolvedValue(null);

      proactiveMessaging.queueMessage({
        triggerId: "test",
        accountId: 1,
        chatId: 100,
        message: "will fail",
      });

      await proactiveMessaging.processQueue();

      const stillQueued = proactiveMessaging.getQueuedMessages();
      expect(stillQueued.some((m: any) => m.message === "will fail")).toBe(
        true,
      );
      expect(proactiveMessaging.getRateUsage().hourly).toBe(0);

      BackendRemote.rpc.miscSendTextMessage.mockResolvedValue(101);
      await proactiveMessaging.processQueue();
      expect(proactiveMessaging.getRateUsage().hourly).toBe(1);
    });
  });

  describe("persistence helpers (AE5, R8)", () => {
    const { BackendRemote, C } = require("../../../backend-com");

    it("replaceTriggers replaces defaults instead of appending", () => {
      proactiveMessaging.replaceTriggers([
        {
          id: "custom-a",
          type: "event",
          name: "Custom A",
          description: "a",
          enabled: true,
          eventType: "new_contact",
          targetType: "new_contacts",
          messageTemplate: "A",
          triggerCount: 0,
        },
        {
          id: "custom-b",
          type: "event",
          name: "Custom B",
          description: "b",
          enabled: true,
          eventType: "new_contact",
          targetType: "new_contacts",
          messageTemplate: "B",
          triggerCount: 0,
        },
      ]);

      const names = proactiveMessaging
        .getTriggers()
        .map((t: any) => t.name)
        .sort();
      expect(names).toEqual(["Custom A", "Custom B"]);
    });

    it("seeded welcomed ids block a second welcome", async () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      BackendRemote.rpc.getChatIdByContactId.mockResolvedValue(42);
      BackendRemote.rpc.getFullChatById.mockResolvedValue({
        id: 42,
        name: "Alice",
        isSelfTalk: false,
        isDeviceTalk: false,
        chatType: C.DC_CHAT_TYPE_SINGLE,
      });

      proactiveMessaging.seedWelcomedContacts([7]);
      await proactiveMessaging.handleEvent("new_contact", {
        accountId: 1,
        contactId: 7,
      });

      expect(proactiveMessaging.getQueuedMessages()).toHaveLength(0);
    });

    it("policy quiet hours 21-07 block at hour 22", async () => {
      jest.setSystemTime(new Date("2026-08-24T22:00:00"));
      proactiveMessaging.updateConfig({
        quietHoursStart: 21,
        quietHoursEnd: 7,
      });
      BackendRemote.rpc.miscSendTextMessage.mockClear();

      proactiveMessaging.queueMessage({
        triggerId: "test",
        accountId: 1,
        chatId: 100,
        message: "late",
      });
      await proactiveMessaging.processQueue();

      expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
    });
  });

  describe("gated send API (KTD8)", () => {
    const { BackendRemote } = require("../../../backend-com");

    it("returns disabled without sending when proactive is off", async () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      proactiveMessaging.setEnabled(false);
      BackendRemote.rpc.miscSendTextMessage.mockClear();

      const result = await proactiveMessaging.sendGated({
        accountId: 1,
        chatId: 100,
        message: "blocked",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("disabled");
      expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
    });

    it("queues a future scheduledTime without sending", async () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      BackendRemote.rpc.miscSendTextMessage.mockClear();

      const result = await proactiveMessaging.sendGated({
        accountId: 1,
        chatId: 100,
        message: "later",
        scheduledTime: Date.now() + 60_000,
      });

      expect(result.queued).toBe(true);
      expect(result.queueId).toMatch(/^msg-/);
      expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
      expect(
        proactiveMessaging
          .getQueuedMessages()
          .some((m: any) => m.id === result.queueId),
      ).toBe(true);
    });

    it("restarts queue processing after cleanup", async () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00"));
      proactiveMessaging.cleanup();
      proactiveMessaging.setEnabled(true);
      BackendRemote.rpc.miscSendTextMessage.mockResolvedValue(202);

      proactiveMessaging.queueMessage({
        triggerId: "test",
        accountId: 1,
        chatId: 100,
        message: "after restart",
      });
      await proactiveMessaging.processQueue();

      expect(BackendRemote.rpc.miscSendTextMessage).toHaveBeenCalledWith(
        1,
        100,
        "after restart",
      );
    });

    it("queues during quiet hours and reports quiet_hours", async () => {
      jest.setSystemTime(new Date("2026-08-24T23:00:00"));
      BackendRemote.rpc.miscSendTextMessage.mockClear();

      const result = await proactiveMessaging.sendGated({
        accountId: 1,
        chatId: 100,
        message: "later",
      });

      expect(result.queued).toBe(true);
      expect(result.reason).toBe("quiet_hours");
      expect(result.queueId).toMatch(/^msg-/);
      expect(BackendRemote.rpc.miscSendTextMessage).not.toHaveBeenCalled();
    });
  });
});

describe("Integration", () => {
  it("should export all required functions", async () => {
    const module = require("../index");

    // Chat Manager exports
    expect(module.chatManager).toBeDefined();
    expect(module.openChat).toBeDefined();
    expect(module.createChat).toBeDefined();
    expect(module.listChats).toBeDefined();
    expect(module.getUnreadChats).toBeDefined();
    expect(module.initiateConversation).toBeDefined();

    // UI Bridge exports
    expect(module.uiBridge).toBeDefined();
    expect(module.registerChatContext).toBeDefined();
    expect(module.registerDialogContext).toBeDefined();
    expect(module.registerComposer).toBeDefined();

    // Proactive Messaging exports
    expect(module.proactiveMessaging).toBeDefined();
    expect(module.sendProactiveMessage).toBeDefined();
    expect(module.scheduleMessage).toBeDefined();
  });
});

import { describe, expect, it, jest } from "@jest/globals";
import type { AutonomyPipeline } from "../autonomy-pipeline.js";
import {
  DeltaChatAutonomyBridge,
  type BridgeConfig,
  type ProactiveTarget,
} from "../deltachat-autonomy-bridge.js";
import { Orchestrator, type OrchestratorConfig } from "../orchestrator.js";

interface MockBridge {
  getConfig: () => BridgeConfig;
  checkProactiveMessage: () => Promise<{ chatId: number; text: string } | null>;
  recordProactiveMessageSent: () => void;
}

interface MockDeltaChat {
  isConnected: () => boolean;
  getAllAccounts: () => Promise<Array<{ id: number }>>;
  getAllChats: (
    accountId: number,
  ) => Promise<Array<{ id: number; canSend: boolean }>>;
  sendMessage: (
    accountId: number,
    chatId: number,
    text: string,
  ) => Promise<number>;
}

interface ProactiveOrchestratorInternals {
  config: Pick<
    OrchestratorConfig,
    "enableProactiveMessaging" | "proactiveTarget"
  >;
  autonomyBridge?: MockBridge;
  deltachatInterface?: MockDeltaChat;
  checkAndSendProactiveMessage: () => Promise<void>;
}

function createSubject(
  target: ProactiveTarget | undefined,
  bridge: MockBridge,
  deltaChat: MockDeltaChat,
): ProactiveOrchestratorInternals {
  const subject = Object.create(
    Orchestrator.prototype,
  ) as ProactiveOrchestratorInternals;
  subject.config = {
    enableProactiveMessaging: true,
    ...(target ? { proactiveTarget: target } : {}),
  };
  subject.autonomyBridge = bridge;
  subject.deltachatInterface = deltaChat;
  return subject;
}

function createBridgeMock(
  target: ProactiveTarget | undefined,
  proposal: { chatId: number; text: string } | null = {
    chatId: 999,
    text: "A bounded proactive proposal",
  },
): jest.Mocked<MockBridge> {
  return {
    getConfig: jest.fn(() => ({
      enableAutonomousResponse: true,
      preferCoreSelf: true,
      maxResponseLength: 2000,
      enableProactiveMessaging: true,
      ...(target ? { proactiveTarget: target } : {}),
      proactiveCoherenceThreshold: 0.5,
      proactiveCooldownMs: 300_000,
    })),
    checkProactiveMessage: jest.fn(async () => proposal),
    recordProactiveMessageSent: jest.fn(),
  };
}

function createDeltaChatMock(
  chats: Array<{ id: number; canSend: boolean }>,
  accounts: Array<{ id: number }> = [{ id: 11 }],
): jest.Mocked<MockDeltaChat> {
  return {
    isConnected: jest.fn(() => true),
    getAllAccounts: jest.fn(async () => accounts),
    getAllChats: jest.fn(async () => chats),
    sendMessage: jest.fn(async () => 77),
  };
}

describe("bounded proactive DeltaChat outbound", () => {
  it("defaults the orchestrator grant off when its environment flag is unset", () => {
    const prior = process.env.DELTECHO_PROACTIVE_MESSAGING;
    delete process.env.DELTECHO_PROACTIVE_MESSAGING;

    try {
      const orchestrator = new Orchestrator();
      const internal = orchestrator as unknown as {
        config: OrchestratorConfig;
      };

      expect(internal.config.enableProactiveMessaging).toBe(false);
    } finally {
      if (prior === undefined) {
        delete process.env.DELTECHO_PROACTIVE_MESSAGING;
      } else {
        process.env.DELTECHO_PROACTIVE_MESSAGING = prior;
      }
    }
  });

  it("is default-off in the bridge and never evaluates a proactive proposal", async () => {
    const pipeline = {
      getStats: jest.fn(),
      getCognitiveProcessor: jest.fn(),
      processWithCoreSelf: jest.fn(),
    } as unknown as AutonomyPipeline;
    const bridge = new DeltaChatAutonomyBridge(pipeline);

    expect(bridge.getConfig().enableProactiveMessaging).toBe(false);
    await expect(bridge.checkProactiveMessage()).resolves.toBeNull();
    expect(pipeline.getStats).not.toHaveBeenCalled();
    expect(pipeline.processWithCoreSelf).not.toHaveBeenCalled();
  });

  it.each([
    ["false", false],
    ["0", false],
    ["off", false],
    ["true", true],
    ["1", true],
    ["unexpected", false],
  ])(
    "parses explicit process flag %s after module initialization",
    (value, expected) => {
      const prior = process.env.DELTECHO_PROACTIVE_MESSAGING;
      process.env.DELTECHO_PROACTIVE_MESSAGING = String(value);
      try {
        const internal = new Orchestrator() as unknown as {
          config: OrchestratorConfig;
        };
        expect(internal.config.enableProactiveMessaging).toBe(expected);
      } finally {
        if (prior === undefined)
          delete process.env.DELTECHO_PROACTIVE_MESSAGING;
        else process.env.DELTECHO_PROACTIVE_MESSAGING = prior;
      }
    },
  );

  it("requires an explicit valid target even when the bridge opt-in is true", async () => {
    const pipeline = {
      getStats: jest.fn(),
      getCognitiveProcessor: jest.fn(),
      processWithCoreSelf: jest.fn(),
    } as unknown as AutonomyPipeline;
    const bridge = new DeltaChatAutonomyBridge(pipeline, {
      enableProactiveMessaging: true,
    });

    await expect(bridge.checkProactiveMessage()).resolves.toBeNull();
    expect(pipeline.getStats).not.toHaveBeenCalled();
    expect(pipeline.processWithCoreSelf).not.toHaveBeenCalled();
  });

  it("does not inspect accounts or generate a proposal without a configured target", async () => {
    const bridge = createBridgeMock(undefined);
    const deltaChat = createDeltaChatMock([{ id: 7, canSend: true }]);
    const subject = createSubject(undefined, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getAllAccounts).not.toHaveBeenCalled();
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("rejects a malformed target before account, chat, or proposal work", async () => {
    const malformedTarget = { accountId: 11, chatId: 0 } as ProactiveTarget;
    const bridge = createBridgeMock(malformedTarget);
    const deltaChat = createDeltaChatMock([{ id: 7, canSend: true }]);
    const subject = createSubject(malformedTarget, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getAllAccounts).not.toHaveBeenCalled();
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
  });

  it("does not generate a proposal or consume cooldown state when the target chat is unavailable", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock([]);
    const subject = createSubject(target, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getAllAccounts).toHaveBeenCalledWith();
    expect(deltaChat.getAllChats).toHaveBeenCalledWith(11);
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("does not generate a proposal when the configured chat exists but cannot send", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock([{ id: 7, canSend: false }]);
    const subject = createSubject(target, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getAllChats).toHaveBeenCalledWith(11);
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("sends an explicit opt-in proposal only to the configured recipient, not its proposed chat", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target, {
      chatId: 999,
      text: "Send only to the configured recipient",
    });
    const deltaChat = createDeltaChatMock([{ id: 7, canSend: true }]);
    const subject = createSubject(target, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(bridge.checkProactiveMessage).toHaveBeenCalledTimes(1);
    expect(deltaChat.getAllAccounts).toHaveBeenCalledTimes(2);
    expect(deltaChat.getAllChats).toHaveBeenNthCalledWith(1, 11);
    expect(deltaChat.getAllChats).toHaveBeenNthCalledWith(2, 11);
    expect(deltaChat.sendMessage).toHaveBeenCalledWith(
      11,
      7,
      "Send only to the configured recipient",
    );
    expect(deltaChat.sendMessage).not.toHaveBeenCalledWith(
      11,
      999,
      expect.any(String),
    );
    expect(bridge.recordProactiveMessageSent).toHaveBeenCalledTimes(1);
  });

  it("revokes a grant changed during the final async capability check", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock([{ id: 7, canSend: true }]);
    const subject = createSubject(target, bridge, deltaChat);
    deltaChat.getAllChats
      .mockResolvedValueOnce([{ id: 7, canSend: true }])
      .mockImplementationOnce(async () => {
        subject.config.enableProactiveMessaging = false;
        return [{ id: 7, canSend: true }];
      });
    await subject.checkAndSendProactiveMessage();
    expect(bridge.checkProactiveMessage).toHaveBeenCalledTimes(1);
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("allows only one in-flight send check and releases it after completion", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock([{ id: 7, canSend: true }]);
    let release!: (accounts: Array<{ id: number }>) => void;
    deltaChat.getAllAccounts.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const subject = createSubject(target, bridge, deltaChat);
    const first = subject.checkAndSendProactiveMessage();
    await subject.checkAndSendProactiveMessage();
    expect(deltaChat.getAllAccounts).toHaveBeenCalledTimes(1);
    release([{ id: 11 }]);
    await first;
    expect(deltaChat.sendMessage).toHaveBeenCalledTimes(1);
    await subject.checkAndSendProactiveMessage();
    expect(deltaChat.sendMessage).toHaveBeenCalledTimes(2);
  });
});

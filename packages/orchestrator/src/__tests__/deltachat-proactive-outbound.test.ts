import { describe, expect, it, jest } from "@jest/globals";
import type { AutonomyPipeline } from "../autonomy-pipeline.js";
import {
  DeltaChatAutonomyBridge,
  type BridgeConfig,
  type ProactiveTarget,
} from "../deltachat-autonomy-bridge.js";
import {
  createAutonomyBridgeStartupConfig,
  Orchestrator,
  type OrchestratorConfig,
} from "../orchestrator.js";

interface MockBridge {
  getConfig: () => BridgeConfig;
  checkProactiveMessage: () => Promise<{ chatId: number; text: string } | null>;
  recordProactiveMessageSent: () => void;
}

interface MockDeltaChat {
  isConnected: () => boolean;
  getChat: (
    accountId: number,
    chatId: number,
  ) => Promise<{ id: number; canSend: boolean }>;
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
  proactiveSendInFlight?: boolean;
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
  chat: { id: number; canSend: boolean } = { id: 7, canSend: true },
): jest.Mocked<MockDeltaChat> {
  return {
    isConnected: jest.fn(() => true),
    getChat: jest.fn(async () => chat),
    // Retained solely as a compatibility sentinel: target validation must never
    // fall back to a serial account-wide chat scan.
    getAllChats: jest.fn(async () => {
      throw new Error("proactive target lookup must not scan getAllChats");
    }),
    sendMessage: jest.fn(async () => 77),
  };
}

function createProactivePipeline(): AutonomyPipeline {
  return {
    getStats: jest.fn(() => ({
      cognitiveState: { latestSelfImage: { coherenceScore: 1 } },
    })),
    getCognitiveProcessor: jest.fn(() => ({
      getGoals: () => [{ status: "active", description: "communicate status" }],
    })),
    processWithCoreSelf: jest.fn(async () => ({
      content: "A real bounded proactive proposal",
      source: "core-self",
      coherence: 1,
    })),
  } as unknown as AutonomyPipeline;
}

function waitForAsyncDispatch(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
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

  it("preserves caller bridge policy while forcing only the orchestrator proactive grant and exact target", () => {
    const orchestratorTarget = { accountId: 11, chatId: 7 };
    const callerTarget = { accountId: 99, chatId: 999 };
    const pipeline = createProactivePipeline();
    const bridge = new DeltaChatAutonomyBridge(
      pipeline,
      createAutonomyBridgeStartupConfig({
        autonomyBridge: {
          enableAutonomousResponse: false,
          preferCoreSelf: false,
          enableProactiveMessaging: false,
          proactiveTarget: callerTarget,
          proactiveCoherenceThreshold: 0.91,
          proactiveCooldownMs: 3_600_000,
        },
        enableProactiveMessaging: true,
        proactiveTarget: orchestratorTarget,
      }),
    );

    expect(bridge.getConfig()).toMatchObject({
      enableAutonomousResponse: false,
      preferCoreSelf: false,
      // Bridge defaults still supply omitted policy values.
      maxResponseLength: 2000,
      enableProactiveMessaging: true,
      proactiveTarget: orchestratorTarget,
      proactiveCoherenceThreshold: 0.91,
      proactiveCooldownMs: 3_600_000,
    });
  });

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

  it("does not inspect an account or generate a proposal without a configured target", async () => {
    const bridge = createBridgeMock(undefined);
    const deltaChat = createDeltaChatMock();
    const subject = createSubject(undefined, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getChat).not.toHaveBeenCalled();
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("rejects a malformed target before chat lookup or proposal work", async () => {
    const malformedTarget = { accountId: 11, chatId: 0 } as ProactiveTarget;
    const bridge = createBridgeMock(malformedTarget);
    const deltaChat = createDeltaChatMock();
    const subject = createSubject(malformedTarget, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getChat).not.toHaveBeenCalled();
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a target when its direct chat lookup fails without scanning the account", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock();
    deltaChat.getChat.mockRejectedValueOnce(new Error("chat unavailable"));
    const subject = createSubject(target, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getChat).toHaveBeenCalledWith(11, 7);
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("rejects a direct lookup whose returned chat id does not match the configured target", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock({ id: 8, canSend: true });
    const subject = createSubject(target, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getChat).toHaveBeenCalledWith(11, 7);
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a direct lookup when the configured chat cannot send", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock({ id: 7, canSend: false });
    const subject = createSubject(target, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(deltaChat.getChat).toHaveBeenCalledWith(11, 7);
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(bridge.checkProactiveMessage).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("sends an explicit opt-in proposal only to the configured recipient, never its proposed chat or an account scan", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target, {
      chatId: 999,
      text: "Send only to the configured recipient",
    });
    const deltaChat = createDeltaChatMock({ id: 7, canSend: true });
    const subject = createSubject(target, bridge, deltaChat);

    await subject.checkAndSendProactiveMessage();

    expect(bridge.checkProactiveMessage).toHaveBeenCalledTimes(1);
    expect(deltaChat.getChat).toHaveBeenNthCalledWith(1, 11, 7);
    expect(deltaChat.getChat).toHaveBeenNthCalledWith(2, 11, 7);
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
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
    const deltaChat = createDeltaChatMock();
    const subject = createSubject(target, bridge, deltaChat);
    deltaChat.getChat
      .mockResolvedValueOnce({ id: 7, canSend: true })
      .mockImplementationOnce(async () => {
        subject.config.enableProactiveMessaging = false;
        return { id: 7, canSend: true };
      });

    await subject.checkAndSendProactiveMessage();

    expect(bridge.checkProactiveMessage).toHaveBeenCalledTimes(1);
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    expect(deltaChat.sendMessage).not.toHaveBeenCalled();
    expect(bridge.recordProactiveMessageSent).not.toHaveBeenCalled();
  });

  it("accounts for a completed authorized dispatch when bridge config is revoked during its RPC", async () => {
    const target = { accountId: 11, chatId: 7 };
    const pipeline = createProactivePipeline();
    const bridge = new DeltaChatAutonomyBridge(pipeline, {
      enableProactiveMessaging: true,
      proactiveTarget: target,
      proactiveCooldownMs: 3_600_000,
    });
    const deltaChat = createDeltaChatMock();
    let resolveSend!: (messageId: number) => void;
    deltaChat.sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    );
    const subject = createSubject(target, bridge, deltaChat);

    const inFlight = subject.checkAndSendProactiveMessage();
    await waitForAsyncDispatch();
    expect(deltaChat.sendMessage).toHaveBeenCalledTimes(1);

    bridge.updateConfig({
      enableProactiveMessaging: false,
      proactiveTarget: undefined,
    });
    resolveSend(77);
    await inFlight;

    expect(bridge.getStats().proactiveMessages).toBe(1);
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
    await subject.checkAndSendProactiveMessage();
    expect(deltaChat.sendMessage).toHaveBeenCalledTimes(1);

    bridge.updateConfig({
      enableProactiveMessaging: true,
      proactiveTarget: target,
    });
    await subject.checkAndSendProactiveMessage();
    expect(bridge.getStats().proactiveMessages).toBe(1);
    expect(deltaChat.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("allows only one in-flight send check and releases it after completion", async () => {
    const target = { accountId: 11, chatId: 7 };
    const bridge = createBridgeMock(target);
    const deltaChat = createDeltaChatMock();
    let release!: (chat: { id: number; canSend: boolean }) => void;
    deltaChat.getChat.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const subject = createSubject(target, bridge, deltaChat);
    const first = subject.checkAndSendProactiveMessage();
    await subject.checkAndSendProactiveMessage();
    expect(deltaChat.getChat).toHaveBeenCalledTimes(1);
    release({ id: 7, canSend: true });
    await first;
    expect(deltaChat.sendMessage).toHaveBeenCalledTimes(1);
    await subject.checkAndSendProactiveMessage();
    expect(deltaChat.sendMessage).toHaveBeenCalledTimes(2);
    expect(deltaChat.getAllChats).not.toHaveBeenCalled();
  });
});

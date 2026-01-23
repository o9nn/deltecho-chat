import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

import {
  DovecotInterface,
  DovecotConfig,
  EmailMessage,
} from "../dovecot-interface/index.js";

// Mock the sub-modules
jest.mock("../dovecot-interface/milter-server.js", () => ({
  MilterServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
  MilterConfig: {},
  EmailMessage: {},
}));

jest.mock("../dovecot-interface/lmtp-server.js", () => ({
  LMTPServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
  LMTPConfig: {},
}));

jest.mock("../dovecot-interface/email-processor.js", () => ({
  EmailProcessor: jest.fn().mockImplementation(() => ({
    processEmail: jest
      .fn<() => Promise<string>>()
      .mockResolvedValue("AI Response"),
    initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
}));

jest.mock("deep-tree-echo-core", () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("DovecotInterface", () => {
  let dovecotInterface: DovecotInterface;

  const testConfig: Partial<DovecotConfig> = {
    enableMilter: true,
    milterSocket: "127.0.0.1:2526",
    enableLMTP: true,
    lmtpSocket: "127.0.0.1:2627",
    allowedDomains: ["example.com", "test.local"],
    botEmailAddress: "echo@test.local",
  };

  beforeEach(() => {
    dovecotInterface = new DovecotInterface(testConfig);
  });

  afterEach(async () => {
    await dovecotInterface.stop();
  });

  describe("constructor", () => {
    it("should create interface with default config", () => {
      const defaultInterface = new DovecotInterface();
      expect(defaultInterface).toBeDefined();
    });

    it("should merge custom config with defaults", () => {
      const config = dovecotInterface.getConfig();

      expect(config.enableMilter).toBe(true);
      expect(config.milterSocket).toBe("127.0.0.1:2526");
      expect(config.enableLMTP).toBe(true);
      expect(config.botEmailAddress).toBe("echo@test.local");
    });
  });

  describe("configuration", () => {
    it("should get current configuration", () => {
      const config = dovecotInterface.getConfig();

      expect(config).toHaveProperty("enableMilter");
      expect(config).toHaveProperty("enableLMTP");
      expect(config).toHaveProperty("allowedDomains");
      expect(config).toHaveProperty("botEmailAddress");
    });

    it("should update configuration", () => {
      dovecotInterface.updateConfig({
        allowedDomains: ["new-domain.com"],
        botEmailAddress: "newbot@new-domain.com",
      });

      const config = dovecotInterface.getConfig();
      expect(config.allowedDomains).toContain("new-domain.com");
      expect(config.botEmailAddress).toBe("newbot@new-domain.com");
    });

    it("should preserve unmodified config values", () => {
      const originalSocket = dovecotInterface.getConfig().milterSocket;

      dovecotInterface.updateConfig({
        botEmailAddress: "updated@example.com",
      });

      expect(dovecotInterface.getConfig().milterSocket).toBe(originalSocket);
    });
  });

  describe("lifecycle", () => {
    it("should report running state correctly", async () => {
      expect(dovecotInterface.isRunning()).toBe(false);

      await dovecotInterface.start();
      expect(dovecotInterface.isRunning()).toBe(true);

      await dovecotInterface.stop();
      expect(dovecotInterface.isRunning()).toBe(false);
    });

    it("should handle multiple start calls gracefully", async () => {
      await dovecotInterface.start();
      await dovecotInterface.start(); // Should not throw

      expect(dovecotInterface.isRunning()).toBe(true);
    });

    it("should handle multiple stop calls gracefully", async () => {
      await dovecotInterface.start();
      await dovecotInterface.stop();
      await dovecotInterface.stop(); // Should not throw

      expect(dovecotInterface.isRunning()).toBe(false);
    });

    it("should stop gracefully if never started", async () => {
      // Should not throw
      await dovecotInterface.stop();
      expect(dovecotInterface.isRunning()).toBe(false);
    });
  });

  describe("event system", () => {
    it("should register event listeners", () => {
      const callback = jest.fn<(data: unknown) => void>();
      dovecotInterface.on("response", callback);

      dovecotInterface.emit("response", { to: "test@example.com" });

      expect(callback).toHaveBeenCalledWith({ to: "test@example.com" });
    });

    it("should handle multiple listeners", () => {
      const callback1 = jest.fn<(data: unknown) => void>();
      const callback2 = jest.fn<(data: unknown) => void>();

      dovecotInterface.on("response", callback1);
      dovecotInterface.on("response", callback2);

      dovecotInterface.emit("response", { data: "test" });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should handle different event types", () => {
      const responseCallback = jest.fn<(data: unknown) => void>();
      const errorCallback = jest.fn<(data: unknown) => void>();

      dovecotInterface.on("response", responseCallback);
      dovecotInterface.on("error", errorCallback);

      dovecotInterface.emit("response", { id: 1 });
      dovecotInterface.emit("error", { message: "fail" });

      expect(responseCallback).toHaveBeenCalledTimes(1);
      expect(errorCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("email handling", () => {
    it("should skip emails not addressed to bot", async () => {
      await dovecotInterface.start();

      const handleEmail = (
        dovecotInterface as unknown as {
          handleIncomingEmail: (email: EmailMessage) => Promise<void>;
        }
      ).handleIncomingEmail.bind(dovecotInterface);

      const email: Partial<EmailMessage> = {
        messageId: "<test@example.com>",
        from: "sender@example.com",
        to: ["other@example.com"], // Not addressed to bot
        subject: "Hello",
        body: "Test message",
      };

      // Should not throw
      await handleEmail(email as EmailMessage);
    });

    it("should emit response event for bot-addressed emails", async () => {
      await dovecotInterface.start();

      const responseCallback = jest.fn();
      dovecotInterface.on("response", responseCallback);

      const handleEmail = (
        dovecotInterface as unknown as {
          handleIncomingEmail: (email: EmailMessage) => Promise<void>;
        }
      ).handleIncomingEmail.bind(dovecotInterface);

      const email: Partial<EmailMessage> = {
        messageId: "<test@example.com>",
        from: "sender@example.com",
        to: ["echo@test.local"], // Addressed to bot
        subject: "Hello Deep Tree Echo",
        body: "Can you help me?",
      };

      await handleEmail(email as EmailMessage);

      // Response should have been emitted
      expect(responseCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "sender@example.com",
          from: "echo@test.local",
        }),
      );
    });
  });

  describe("Milter-only configuration", () => {
    it("should start with only Milter enabled", async () => {
      const milterOnlyInterface = new DovecotInterface({
        enableMilter: true,
        enableLMTP: false,
        milterSocket: "127.0.0.1:2528",
      });

      await milterOnlyInterface.start();
      expect(milterOnlyInterface.isRunning()).toBe(true);

      await milterOnlyInterface.stop();
    });
  });

  describe("LMTP-only configuration", () => {
    it("should start with only LMTP enabled", async () => {
      const lmtpOnlyInterface = new DovecotInterface({
        enableMilter: false,
        enableLMTP: true,
        lmtpSocket: "127.0.0.1:2629",
      });

      await lmtpOnlyInterface.start();
      expect(lmtpOnlyInterface.isRunning()).toBe(true);

      await lmtpOnlyInterface.stop();
    });
  });

  describe("disabled server configuration", () => {
    it("should handle all servers disabled", async () => {
      const disabledInterface = new DovecotInterface({
        enableMilter: false,
        enableLMTP: false,
      });

      await disabledInterface.start();
      expect(disabledInterface.isRunning()).toBe(true);

      await disabledInterface.stop();
    });
  });

  describe("domain filtering", () => {
    it("should filter allowed domains", () => {
      const config = dovecotInterface.getConfig();
      expect(config.allowedDomains).toContain("example.com");
      expect(config.allowedDomains).toContain("test.local");
    });

    it("should support wildcard domain", () => {
      const wildcardInterface = new DovecotInterface({
        allowedDomains: ["*"],
      });

      const config = wildcardInterface.getConfig();
      expect(config.allowedDomains).toContain("*");
    });
  });
});

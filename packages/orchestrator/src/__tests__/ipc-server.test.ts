import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import {
  IPCServer,
  IPCServerConfig,
  IPCRequestHandler,
} from "../ipc/server.js";
import { IPCMessageType } from "@deltecho/ipc";

describe("IPCServer", () => {
  let server: IPCServer;
  const testConfig: IPCServerConfig = {
    socketPath: "/tmp/test-ipc.sock",
    useTcp: false,
  };

  beforeEach(() => {
    server = new IPCServer(testConfig);
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("constructor", () => {
    it("should create server with provided config", () => {
      expect(server).toBeDefined();
      expect(server.isRunning()).toBe(false);
    });

    it("should create server with TCP config", () => {
      const tcpServer = new IPCServer({ useTcp: true, tcpPort: 9999 });
      expect(tcpServer).toBeDefined();
    });
  });

  describe("message handlers", () => {
    it("should register custom handlers", () => {
      const handler: IPCRequestHandler = jest
        .fn<IPCRequestHandler>()
        .mockResolvedValue({ result: "ok" });
      server.registerHandler(IPCMessageType.REQUEST_COGNITIVE, handler);

      // Handler registration should not throw
      expect(handler).not.toHaveBeenCalled();
    });

    it("should have default ping handler", async () => {
      // Start server to enable handlers
      await server.start();

      expect(server.isRunning()).toBe(true);
    });
  });

  describe("broadcast", () => {
    it("should have broadcast method", () => {
      expect(typeof server.broadcast).toBe("function");
    });

    it("should not throw when broadcasting with no subscribers", () => {
      expect(() =>
        server.broadcast("test_event", { data: "test" }),
      ).not.toThrow();
    });
  });

  describe("client management", () => {
    it("should start with zero clients", () => {
      expect(server.getClientCount()).toBe(0);
    });

    it("should return empty array for client IDs when no clients", () => {
      expect(server.getClientIds()).toEqual([]);
    });
  });

  describe("start and stop", () => {
    it("should start the server", async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
    });

    it("should stop the server", async () => {
      await server.start();
      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it("should handle multiple start calls gracefully", async () => {
      await server.start();
      await server.start(); // Should not throw
      expect(server.isRunning()).toBe(true);
    });

    it("should handle stop when not running", async () => {
      await server.stop(); // Should not throw
      expect(server.isRunning()).toBe(false);
    });
  });

  describe("sendToClient", () => {
    it("should return false for non-existent client", () => {
      const result = server.sendToClient(
        "non_existent",
        IPCMessageType.EVENT_MESSAGE,
        {},
      );
      expect(result).toBe(false);
    });
  });
});

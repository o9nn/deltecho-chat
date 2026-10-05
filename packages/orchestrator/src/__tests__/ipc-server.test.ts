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
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn } from "node:child_process";

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

    it("rejects relative, empty, and control-character IPC endpoints", () => {
      expect(() => new IPCServer({ socketPath: "relative.sock" })).toThrow();
      expect(() => new IPCServer({ socketPath: "" })).toThrow();
      expect(() => new IPCServer({ socketPath: "/tmp/x\n.sock" })).toThrow();
    });
  });

  describe("isolated local socket", () => {
    const onPosix = process.platform === "win32" ? it.skip : it;

    onPosix("binds to and cleans up an isolated absolute socket", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dte-ipc-test-"));
      const endpoint = path.join(dir, "deltecho.sock");
      const isolated = new IPCServer({ socketPath: endpoint });
      try {
        await isolated.start();
        expect(fs.lstatSync(endpoint).isSocket()).toBe(true);
        await isolated.stop();
        expect(fs.existsSync(endpoint)).toBe(false);
      } finally {
        await isolated.stop();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    onPosix(
      "does not unlink an unrelated file occupying the path",
      async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dte-ipc-test-"));
        const endpoint = path.join(dir, "deltecho.sock");
        fs.writeFileSync(endpoint, "sentinel contents");
        const isolated = new IPCServer({ socketPath: endpoint });
        try {
          await expect(isolated.start()).rejects.toThrow(/non-socket file/);
          expect(fs.readFileSync(endpoint, "utf8")).toBe("sentinel contents");
        } finally {
          await isolated.stop();
          fs.rmSync(dir, { recursive: true, force: true });
        }
      },
    );

    onPosix("refuses to steal a live daemon's socket", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dte-ipc-test-"));
      const endpoint = path.join(dir, "deltecho.sock");
      const first = new IPCServer({ socketPath: endpoint });
      const second = new IPCServer({ socketPath: endpoint });
      try {
        await first.start();
        const before = fs.lstatSync(endpoint);
        await expect(second.start()).rejects.toThrow(/live or unverified/);
        const after = fs.lstatSync(endpoint);
        expect(after.ino).toBe(before.ino);
        expect(first.isRunning()).toBe(true);
      } finally {
        await second.stop();
        await first.stop();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    onPosix("reclaims a stale socket after an unclean exit", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dte-ipc-test-"));
      const endpoint = path.join(dir, "deltecho.sock");
      const child = spawn(
        process.execPath,
        [
          "-e",
          'require("node:net").createServer().listen(process.argv[1], () => process.stdout.write("ready\\n"))',
          endpoint,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      const replacement = new IPCServer({ socketPath: endpoint });
      try {
        await new Promise<void>((resolve, reject) => {
          child.stdout!.once("data", () => resolve());
          child.once("error", reject);
          child.once("exit", (code) =>
            reject(new Error(`Child exited ${code}`)),
          );
        });
        expect(fs.lstatSync(endpoint).isSocket()).toBe(true);
        const exited = new Promise<void>((resolve) =>
          child.once("exit", () => resolve()),
        );
        child.kill("SIGKILL");
        await exited;
        expect(fs.lstatSync(endpoint).isSocket()).toBe(true);
        await replacement.start();
        expect(replacement.isRunning()).toBe(true);
      } finally {
        if (child.exitCode === null) child.kill("SIGKILL");
        await replacement.stop();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("message handlers", () => {
    it("should register custom handlers", () => {
      const handler: IPCRequestHandler = jest
        .fn<IPCRequestHandler>()
        .mockResolvedValue({ result: "ok" });
      server.registerHandler(IPCMessageType.COGNITIVE_PROCESS, handler);

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
        IPCMessageType.EVENT,
        {},
      );
      expect(result).toBe(false);
    });
  });
});

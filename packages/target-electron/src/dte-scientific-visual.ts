import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { isAbsolute } from "node:path";

const MAX_RESPONSE_BYTES = 64 * 1024;
const TIMEOUT_MS = 1_500;

/**
 * Read only the visual projection of a running DeltEcho orchestrator. This
 * channel cannot issue mutations, return conversations, or start a daemon.
 * Absence of the daemon is an honest null, never fabricated scientific state.
 */
export function resolveDteScientificVisualSocketPath(): string | null {
  const endpoint = process.env.DEEP_TREE_ECHO_IPC_PATH?.trim();
  if (!endpoint) {
    return process.platform === "win32"
      ? "\\\\.\\pipe\\deltecho-deep-tree-echo"
      : "/tmp/deep-tree-echo.sock";
  }
  if (/[\0\r\n]/.test(endpoint)) return null;
  if (process.platform === "win32") {
    return endpoint.startsWith("\\\\.\\pipe\\deltecho-") ? endpoint : null;
  }
  return isAbsolute(endpoint) ? endpoint : null;
}

export function readDteScientificVisualState(
  socketPath: string | null = resolveDteScientificVisualSocketPath(),
): Promise<unknown | null> {
  if (!socketPath) return Promise.resolve(null);
  return new Promise((resolve) => {
    const id = randomUUID();
    let settled = false;
    let buffer = "";
    const socket = createConnection(socketPath);
    const finish = (value: unknown | null): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(TIMEOUT_MS, () => finish(null));
    socket.once("connect", () => {
      socket.write(
        JSON.stringify({
          id,
          type: "cognitive:get_state",
          payload: {},
          timestamp: Date.now(),
        }) + "\n",
      );
    });
    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      if (Buffer.byteLength(buffer, "utf8") > MAX_RESPONSE_BYTES) {
        finish(null);
        return;
      }
      const end = buffer.indexOf("\n");
      if (end < 0) return;
      try {
        const response: unknown = JSON.parse(buffer.slice(0, end));
        if (!response || typeof response !== "object") return finish(null);
        const envelope = response as Record<string, unknown>;
        if (
          envelope.id !== id ||
          envelope.type !== "response:success" ||
          !envelope.payload ||
          typeof envelope.payload !== "object"
        ) {
          return finish(null);
        }
        const visual = (envelope.payload as Record<string, unknown>)
          .scientificGeniusVisual;
        finish(visual && typeof visual === "object" ? visual : null);
      } catch {
        finish(null);
      }
    });
    socket.once("error", () => finish(null));
    socket.once("close", () => finish(null));
  });
}

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test, { after } from "node:test";

const repo = fileURLToPath(new URL("../", import.meta.url));
const requireFromElectron = createRequire(
  join(repo, "packages/target-electron/package.json"),
);
const { build } = requireFromElectron("esbuild");
const temporary = await mkdtemp(join(tmpdir(), "dte-visual-bridge-"));
const bundle = join(temporary, "broker.mjs");
await build({
  entryPoints: [
    join(repo, "packages/target-electron/src/dte-scientific-visual.ts"),
  ],
  outfile: bundle,
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { readDteScientificVisualState } = await import(
  pathToFileURL(bundle).href
);

async function withServer(responder, callback) {
  const address =
    process.platform === "win32"
      ? `\\\\.\\pipe\\dte-visual-test-${process.pid}-${Math.random()
          .toString(16)
          .slice(2)}`
      : join(temporary, `socket-${Math.random().toString(16).slice(2)}`);
  const server = createServer((socket) => {
    let incoming = "";
    socket.on("data", (chunk) => {
      incoming += chunk.toString("utf8");
      const newline = incoming.indexOf("\n");
      if (newline < 0) return;
      const request = JSON.parse(incoming.slice(0, newline));
      incoming = incoming.slice(newline + 1);
      responder(socket, request);
    });
  });
  await new Promise((resolve) => server.listen(address, resolve));
  try {
    await callback(address);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("requests only cognitive:get_state and returns only scientific visual metadata", async () => {
  await withServer(
    (socket, request) => {
      assert.equal(request.type, "cognitive:get_state");
      assert.deepEqual(request.payload, {});
      socket.write(
        JSON.stringify({
          id: request.id,
          type: "response:success",
          payload: {
            scientificGeniusVisual: {
              origin: "entelechy",
              predictiveCrystal: {
                id: "crystal-1",
                status: "tentative",
              },
            },
            privateConversation: "must-not-cross-the-main-frame-boundary",
          },
        }) + "\n",
      );
    },
    async (address) => {
      assert.deepEqual(await readDteScientificVisualState(address), {
        origin: "entelechy",
        predictiveCrystal: { id: "crystal-1", status: "tentative" },
      });
    },
  );
});

test("abstains when the orchestrator daemon is unavailable", async () => {
  const missing =
    process.platform === "win32"
      ? "\\\\.\\pipe\\dte-visual-missing-" + process.pid
      : join(temporary, "missing.sock");
  assert.equal(await readDteScientificVisualState(missing), null);
});

test("rejects responses with a mismatched request id", async () => {
  await withServer(
    (socket) => {
      socket.write(
        JSON.stringify({
          id: "spoofed",
          type: "response:success",
          payload: { scientificGeniusVisual: { origin: "entelechy" } },
        }) + "\n",
      );
    },
    async (address) => {
      assert.equal(await readDteScientificVisualState(address), null);
    },
  );
});

test("rejects an oversized cognitive response", async () => {
  await withServer(
    (socket, request) => {
      socket.write(
        JSON.stringify({
          id: request.id,
          type: "response:success",
          payload: { scientificGeniusVisual: { long: "x".repeat(70_000) } },
        }) + "\n",
      );
    },
    async (address) => {
      assert.equal(await readDteScientificVisualState(address), null);
    },
  );
});

after(async () => {
  await rm(temporary, { recursive: true, force: true });
});

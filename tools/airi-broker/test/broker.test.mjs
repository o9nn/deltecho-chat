import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { request as rawRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer as createTcpServer } from "node:net";
import { after, before, test } from "node:test";
import { createBroker, qualifiesVisual } from "../dist/broker.mjs";

const capability = "c".repeat(64);
const hash = "f".repeat(64);
const coreSelf = {
  initialized: true,
  ledgerHead: hash,
  projectedStateDigest: "a".repeat(64),
  acceptedEventCount: 2,
  pendingProposalCount: 0,
};
function visual() {
  return {
    origin: "entelechy",
    mode: "Synthesis Phase",
    scientificGenius: 0.7,
    insightPotential: 0.7,
    entelechyScore: 0.6,
    selfAwareness: 0.5,
    sentience: 0.5,
    flow: 0.7,
    temporalCoherence: 0.7,
    salience: 0.4,
    valence: 0.3,
    arousal: 0.5,
    phi: 0.6,
    freeEnergy: 0.2,
    isProcessing: true,
    coreSelf,
    conversationText: "private message must not leave IPC",
  };
}
let dir;
let archive;
let port;
let current;
let broker;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "dte-airi-broker-"));
  archive = join(dir, "model.zip");
  await writeFile(archive, randomBytes(64));
  const reservation = createTcpServer();
  await new Promise((ok) => reservation.listen(0, "127.0.0.1", ok));
  port = reservation.address().port;
  await new Promise((ok) => reservation.close(ok));
  broker = await createBroker({
    modelArchive: archive,
    stageUrl: "http://127.0.0.1:5173/",
    port,
    capability,
    readVisual: async () => current,
  });
});
after(async () => {
  if (broker) await broker.close();
  if (dir) await rm(dir, { recursive: true, force: true });
});

const request = (path, options = {}) =>
  fetch(`${broker.url}${path}`, {
    ...options,
    headers: {
      Host: `127.0.0.1:${port}`,
      "X-DTE-Capability": capability,
      ...(options.headers || {}),
    },
  });

test("cannot bind a non-loopback stage and rejects fabricated proof", async () => {
  assert.equal(qualifiesVisual(visual()), true);
  assert.equal(
    qualifiesVisual({
      ...visual(),
      coreSelf: { ...coreSelf, initialized: false },
    }),
    false,
  );
  assert.equal(
    qualifiesVisual({
      ...visual(),
      coreSelf: { ...coreSelf, ledgerHead: null },
    }),
    false,
  );
  assert.equal(qualifiesVisual({ ...visual(), origin: "browser" }), false);
  assert.equal(qualifiesVisual({ ...visual(), phi: Infinity }), false);
  await assert.rejects(
    createBroker({
      modelArchive: archive,
      stageUrl: "https://airi.moeru.ai/",
      port: port + 1,
    }),
    /loopback/,
  );
  assert.equal(broker.server.address().address, "127.0.0.1");
});

test("denies an unauthenticated, wrong-origin, or DNS-rebound browser", async () => {
  assert.equal((await fetch(`${broker.url}/api/config`)).status, 401);
  assert.equal(
    (
      await request("/api/config", {
        headers: { Origin: "https://attacker.invalid" },
      })
    ).status,
    403,
  );
  const wrongHostStatus = await new Promise((resolve, reject) => {
    const req = rawRequest(
      `${broker.url}/api/config`,
      {
        headers: {
          Host: `attacker.invalid:${port}`,
          "X-DTE-Capability": capability,
        },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(wrongHostStatus, 403);
  const response = await request("/api/config");
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.equal(config.origin, broker.url);
  assert.equal(config.modelId, "miara");
});

test("drops a missing daemon, false core-self proof, or mismatched model", async () => {
  current = null;
  assert.equal(
    (await request(`/api/cue?modelId=miara&modelSha256=${broker.modelSha256}`))
      .status,
    204,
  );
  current = { ...visual(), coreSelf: { ...coreSelf, initialized: false } };
  assert.equal(
    (await request(`/api/cue?modelId=miara&modelSha256=${broker.modelSha256}`))
      .status,
    204,
  );
  current = visual();
  assert.equal(
    (await request(`/api/cue?modelId=other&modelSha256=${broker.modelSha256}`))
      .status,
    400,
  );
  assert.equal(
    (await request(`/api/cue?modelId=miara&modelSha256=${hash}`)).status,
    400,
  );
});

test("exports only a bounded presentation cue and retires its lease on release", async () => {
  current = visual();
  const path = `/api/cue?modelId=miara&modelSha256=${broker.modelSha256}`;
  const response = await request(path);
  assert.equal(response.status, 200);
  const cue = await response.json();
  assert.equal(cue.kind, "dte.presentation.cue");
  assert.equal(cue.modelId, "miara");
  assert.equal(cue.modelSha256, broker.modelSha256);
  assert.equal(cue.expressionName, null);
  assert.equal(cue.motion, null);
  assert.ok(Object.keys(cue.pose).length > 0);
  assert.equal(JSON.stringify(cue).includes("private message"), false);
  assert.equal(JSON.stringify(cue).includes("coreSelf"), false);
  assert.equal(JSON.stringify(cue).includes("mouth"), false);
  assert.ok(cue.expiresAt - cue.observedAt <= 3000);
  const second = await request(path);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).leaseId, cue.leaseId);
  assert.equal((await request("/api/release", { method: "POST" })).status, 204);
  const third = await request(path);
  assert.equal(third.status, 200);
  assert.notEqual((await third.json()).leaseId, cue.leaseId);
  current = null;
  assert.equal((await request(path)).status, 204);
  current = visual();
  const recovered = await request(path);
  assert.equal(recovered.status, 200);
  assert.notEqual((await recovered.json()).leaseId, cue.leaseId);
});

test("production reader only accepts a matched read-only daemon reply", async () => {
  const endpoint =
    process.platform === "win32"
      ? `\\\\.\\pipe\\deltecho-test-${randomBytes(6).toString("hex")}`
      : join(dir, "daemon.sock");
  const previous = process.env.DEEP_TREE_ECHO_IPC_PATH;
  let sendWrongId = false;
  const pipe = createTcpServer((socket) => {
    socket.once("data", (data) => {
      const request = JSON.parse(data.toString("utf8"));
      assert.equal(request.type, "cognitive:get_state");
      socket.end(
        JSON.stringify({
          id: sendWrongId ? "forged" : request.id,
          type: "response:success",
          payload: {
            scientificGeniusVisual: visual(),
            chatText: "not-for-broker",
          },
        }) + "\n",
      );
    });
  });
  await new Promise((ok) => pipe.listen(endpoint, ok));
  process.env.DEEP_TREE_ECHO_IPC_PATH = endpoint;
  const otherPort = port + 1;
  let live;
  try {
    live = await createBroker({
      modelArchive: archive,
      stageUrl: "http://127.0.0.1:5173/",
      port: otherPort,
      capability: "d".repeat(64),
    });
    const url = `${live.url}/api/cue?modelId=miara&modelSha256=${live.modelSha256}`;
    const headers = { "X-DTE-Capability": "d".repeat(64) };
    const accepted = await fetch(url, { headers });
    assert.equal(accepted.status, 200);
    const body = await accepted.text();
    assert.equal(body.includes("not-for-broker"), false);
    sendWrongId = true;
    assert.equal((await fetch(url, { headers })).status, 204);
  } finally {
    if (live) await live.close();
    await new Promise((ok) => pipe.close(ok));
    if (previous === undefined) delete process.env.DEEP_TREE_ECHO_IPC_PATH;
    else process.env.DEEP_TREE_ECHO_IPC_PATH = previous;
  }
});

test("the built broker runs from a flat portable directory", async () => {
  const portable = join(dir, "portable");
  await mkdir(portable);
  for (const name of ["broker.mjs", "client.js", "index.html"])
    await copyFile(
      new URL(`../dist/${name}`, import.meta.url),
      join(portable, name),
    );
  const { createBroker: portableBroker } = await import(
    pathToFileURL(join(portable, "broker.mjs")).href
  );
  const instance = await portableBroker({
    modelArchive: archive,
    stageUrl: "http://127.0.0.1:5173/",
    port: port + 2,
    capability: "e".repeat(64),
  });
  try {
    const page = await fetch(instance.url);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Open AIRI stage/);
    assert.equal((await fetch(`${instance.url}/client.js`)).status, 200);
  } finally {
    await instance.close();
  }
});

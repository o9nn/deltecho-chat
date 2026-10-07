import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AiriStageCueAdapter,
  type AiriStageCue,
} from "../../../packages/avatar/src/adapters/airi-stage-cue-adapter";
import { projectDTEchoCognitiveState } from "../../../packages/avatar/src/dtecho-expression-driver";
import { readDteScientificVisualState } from "../../../packages/target-electron/src/dte-scientific-visual";

const SHA = /^[a-f0-9]{64}$/;
const MODEL = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const HOST = "127.0.0.1";
const MAX_OBSERVATION_BYTES = 8 * 1024;
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
};
const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export interface BrokerOptions {
  modelArchive: string;
  stageUrl: string;
  modelId?: string;
  port?: number;
  /** Test-only injection; production reads the existing read-only DTE daemon pipe. */
  readVisual?: () => Promise<unknown | null>;
  now?: () => number;
  capability?: string;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A marker alone is never authority: it must come from the matched local daemon IPC reply. */
export function qualifiesVisual(input: unknown): boolean {
  const visual = object(input);
  const proof = object(visual?.coreSelf);
  if (
    visual?.origin !== "entelechy" ||
    proof?.initialized !== true ||
    !SHA.test(String(proof.ledgerHead)) ||
    !SHA.test(String(proof.projectedStateDigest))
  )
    return false;
  if (
    !Number.isSafeInteger(proof.acceptedEventCount) ||
    (proof.acceptedEventCount as number) < 0
  )
    return false;
  for (const key of [
    "scientificGenius",
    "insightPotential",
    "entelechyScore",
    "selfAwareness",
    "sentience",
    "flow",
    "temporalCoherence",
    "salience",
    "arousal",
    "phi",
    "freeEnergy",
  ]) {
    const n = visual[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1)
      return false;
  }
  return (
    typeof visual.valence === "number" &&
    Number.isFinite(visual.valence) &&
    visual.valence >= -1 &&
    visual.valence <= 1 &&
    typeof visual.isProcessing === "boolean"
  );
}

function safeStageUrl(input: string): string {
  const url = new URL(input);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("AIRI stage URL must be an explicit loopback HTTP origin.");
  return url.toString();
}

function send(
  res: ServerResponse,
  code: number,
  body = "",
  headers: Record<string, string> = JSON_HEADERS,
): void {
  res.writeHead(code, {
    ...headers,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function hashArchive(path: string): Promise<string> {
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of createReadStream(path)) {
    size += chunk.length;
    if (size > 64 * 1024 * 1024)
      throw new Error("The selected archive exceeds the AIRI bridge limit.");
    hash.update(chunk);
  }
  if (size === 0) throw new Error("The selected archive is empty.");
  return hash.digest("hex");
}

/** No POST ingestion, no conversation data, no public interface, no identity write. */
export async function createBroker(options: BrokerOptions): Promise<{
  server: Server;
  url: string;
  capability: string;
  modelSha256: string;
  close: () => Promise<void>;
}> {
  const port = options.port ?? 8765;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid loopback port.");
  const configuredModelId = options.modelId ?? "miara";
  if (!MODEL.test(configuredModelId))
    throw new Error("Invalid selected model ID.");
  const stageUrl = safeStageUrl(options.stageUrl);
  const digest = await hashArchive(options.modelArchive);
  const capability = options.capability ?? randomBytes(32).toString("hex");
  if (!SHA.test(capability))
    throw new Error("Capability must be a 256-bit lowercase hex value.");
  const now = options.now ?? Date.now;
  const readVisual =
    options.readVisual ?? (() => readDteScientificVisualState());
  const origin = `http://${HOST}:${port}`;
  const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const client = readFileSync(new URL("./client.js", import.meta.url));
  let active: {
    adapter: AiriStageCueAdapter;
    modelId: string;
    leaseId: string;
    cue?: AiriStageCue;
  } | null = null;
  let busy = false;
  let closed = false;
  const revoke = (): void => {
    active?.adapter.revoke();
    active?.adapter.dispose();
    active = null;
  };
  const authorized = (request: IncomingMessage): boolean => {
    const received = request.headers["x-dte-capability"];
    if (typeof received !== "string" || !SHA.test(received)) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(capability));
  };
  const server = createServer(async (req, res) => {
    if (closed) return send(res, 503);
    // A literal Host check also prevents DNS rebinding onto this loopback-only listener.
    if (
      req.headers.host !== `${HOST}:${port}` ||
      req.headers["transfer-encoding"] ||
      Number(req.headers["content-length"] || 0) > MAX_OBSERVATION_BYTES
    )
      return send(res, 403);
    const requestOrigin = req.headers.origin;
    if (requestOrigin && requestOrigin !== origin) return send(res, 403);
    const url = new URL(req.url || "/", origin);
    if (req.method === "GET" && url.pathname === "/")
      return send(res, 200, html, HTML_HEADERS);
    if (req.method === "GET" && url.pathname === "/client.js")
      return send(res, 200, client.toString("utf8"), {
        ...JSON_HEADERS,
        "Content-Type": "text/javascript; charset=utf-8",
      });
    if (!authorized(req)) return send(res, 401);
    if (req.method === "GET" && url.pathname === "/api/config")
      return send(
        res,
        200,
        JSON.stringify({
          stageUrl,
          modelId: configuredModelId,
          modelSha256: digest,
          origin,
        }),
      );
    if (req.method === "POST" && url.pathname === "/api/release") {
      revoke();
      return send(res, 204);
    }
    if (req.method !== "GET" || url.pathname !== "/api/cue")
      return send(res, 404);
    const modelId = url.searchParams.get("modelId") || "";
    if (
      modelId !== configuredModelId ||
      url.searchParams.get("modelSha256") !== digest
    ) {
      revoke();
      return send(res, 400);
    }
    if (busy) return send(res, 429);
    busy = true;
    try {
      // The existing IPC reader checks request ID, success envelope, socket timeout and 64 KiB cap.
      const visual = await readVisual();
      if (!qualifiesVisual(visual)) {
        revoke();
        return send(res, 204);
      }
      if (active && (!active.cue || active.adapter.tick())) revoke();
      if (active?.modelId !== modelId) {
        revoke();
        const leaseId = randomUUID();
        const state: {
          adapter: AiriStageCueAdapter;
          modelId: string;
          leaseId: string;
          cue?: AiriStageCue;
        } = {
          adapter: null as unknown as AiriStageCueAdapter,
          modelId,
          leaseId,
        };
        const adapter = new AiriStageCueAdapter(
          {
            publish: (cue) => {
              state.cue = cue;
            },
            release: () => {
              state.cue = undefined;
            },
          },
          {
            modelId,
            modelSha256: digest,
            availableExpressions: [],
            availableMotions: [],
            now,
            maxObservationAgeMs: 500,
            maxLeaseMs: 2_800,
          },
        );
        state.adapter = adapter;
        active = state;
      }
      const observedAt = now();
      const projection = projectDTEchoCognitiveState(
        visual as Parameters<typeof projectDTEchoCognitiveState>[0],
      );
      // The model-bound adapter is the only route from cognitive projection to exported axes.
      const sinkAdapter = active!.adapter;
      const result = sinkAdapter.submit(projection, {
        source: "dte-local-cognitive-bridge",
        modelId,
        modelSha256: digest,
        leaseId: active!.leaseId,
        observedAt,
        expiresAt: observedAt + 2_800,
        coreSelfInitialized: true,
        audioActive: true,
      });
      const cue = active?.cue;
      if (result !== "published" || !cue) {
        revoke();
        return send(res, 204);
      }
      return send(res, 200, JSON.stringify(cue));
    } catch {
      revoke();
      return send(res, 204);
    } finally {
      busy = false;
    }
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, HOST, resolveListen);
  });
  const address = server.address();
  const url =
    typeof address === "object" && address
      ? `http://${HOST}:${address.port}`
      : origin;
  return {
    server,
    url,
    capability,
    modelSha256: digest,
    close: async () => {
      closed = true;
      revoke();
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    },
  };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const args = process.argv.slice(2);
  const arg = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  const archive = arg("--model");
  const stage = arg("--stage");
  const modelId = arg("--model-id") || "miara";
  const port = Number(arg("--port") || 8765);
  if (!archive || !stage) {
    process.stderr.write(
      "Usage: node broker.mjs --model <private-miara.zip> --stage http://127.0.0.1:5173/ [--model-id miara] [--port 8765]\n",
    );
    process.exitCode = 2;
  } else
    createBroker({
      modelArchive: resolve(archive),
      stageUrl: stage,
      modelId,
      port,
    })
      .then(({ url, capability, close }) => {
        process.stdout.write(
          `AIRI broker is loopback-only. Open ${url}/#cap=${capability} in a private browser window.\n`,
        );
        process.stdout.write(
          "Close this terminal or press Ctrl+C to revoke the bridge.\n",
        );
        process.on("SIGINT", () => {
          void close().then(() => process.exit(0));
        });
        process.on("SIGTERM", () => {
          void close().then(() => process.exit(0));
        });
      })
      .catch((error) => {
        process.stderr.write(
          `${
            error instanceof Error ? error.message : "Broker startup failed"
          }\n`,
        );
        process.exitCode = 1;
      });
}

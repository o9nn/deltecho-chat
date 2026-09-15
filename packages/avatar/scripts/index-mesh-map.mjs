#!/usr/bin/env node
/**
 * Inspect each identity's Cubism package and write that folder's mesh-map.
 * Melody's index always names `models/melody/melody_t03.model3.json`.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../e2e-tests/node_modules/@playwright/test/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const avatarRoot = path.resolve(here, "..");
const frontendStatic = path.join(root, "packages/frontend/static");
const distDir = path.join(avatarRoot, "dist");
const demoLib = path.join(avatarRoot, "demo/lib");
const melodyMap = path.join(frontendStatic, "models/melody/mesh-map.json");
const miaraMap = path.join(frontendStatic, "models/miara/mesh-map.json");
const groveMap = path.join(
  frontendStatic,
  "models/deep-tree-echo/mesh-map.json",
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".moc3": "application/octet-stream",
  ".wasm": "application/wasm",
};

function resolvePublicPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  if (clean === "/" || clean === "/index-mesh-map") {
    return path.join(here, "index-mesh-map.html");
  }
  const mounts = [
    ["/avatar-dist/", distDir],
    ["/demo/lib/", demoLib],
    ["/models/", path.join(frontendStatic, "models")],
    ["/images/", path.join(frontendStatic, "images")],
    ["/scripts/", here],
  ];
  for (const [prefix, base] of mounts) {
    if (!clean.startsWith(prefix)) continue;
    return path.join(base, clean.slice(prefix.length));
  }
  return null;
}

async function existingFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) return filePath;
  } catch {
    // try extensionless ESM
  }
  try {
    const withJs = `${filePath}.js`;
    const stat = await fs.stat(withJs);
    if (stat.isFile()) return withJs;
  } catch {
    return null;
  }
  return null;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const mapped = resolvePublicPath(request.url ?? "/");
        const filePath = mapped ? await existingFile(mapped) : null;
        if (!filePath) {
          response.writeHead(404);
          response.end("not found");
          return;
        }
        const ext = path.extname(filePath);
        const data = await fs.readFile(filePath);
        response.writeHead(200, {
          "content-type": MIME[ext] ?? "application/octet-stream",
          "cache-control": "no-store",
        });
        response.end(data);
      } catch (error) {
        response.writeHead(500);
        response.end(String(error));
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("server failed to bind"));
        return;
      }
      resolve({ server, port: address.port });
    });
    server.on("error", reject);
  });
}

function withIdentity(meshMap, identity, sourceModel) {
  return {
    ...meshMap,
    identity,
    sourceModel,
  };
}

async function main() {
  await fs.access(path.join(distDir, "automesh/index.js"));
  await fs.access(
    path.join(frontendStatic, "models/miara/miara_pro_t03.model3.json"),
  );

  const { server, port } = await startServer();
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--ignore-gpu-blocklist"],
  });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => {
      console.error("pageerror", error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        console.error("console", message.text());
      }
    });
    await page.goto(
      `http://127.0.0.1:${port}/scripts/index-mesh-map.html?identity=melody`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    const resultHandle = await page.waitForFunction(
      () => window.__MESH_MAP_RESULT__ || window.__MESH_MAP_ERROR__,
      null,
      { timeout: 180_000 },
    );
    const value = await resultHandle.jsonValue();
    if (typeof value === "string") {
      throw new Error(value);
    }
    if (!value || value.ok !== true) {
      throw new Error(await page.evaluate(() => window.__MESH_MAP_ERROR__));
    }

    const pretty = (document) => `${JSON.stringify(document, null, 2)}\n`;
    await fs.mkdir(path.dirname(melodyMap), { recursive: true });
    const identityModel3Path = (identity) =>
      ({
        miara: "models/miara/miara_pro_t03.model3.json",
        melody: "models/melody/melody_t03.model3.json",
        "deep-tree-echo": "models/deep-tree-echo/deep-tree-echo_t03.model3.json",
      })[identity] ?? `models/${identity}/${identity}_t03.model3.json`;
    await fs.writeFile(
      melodyMap,
      pretty(
        withIdentity(value.meshMap, "melody", identityModel3Path("melody")),
      ),
    );
    await fs.writeFile(
      miaraMap,
      pretty(withIdentity(value.meshMap, "miara", identityModel3Path("miara"))),
    );
    await fs.mkdir(path.dirname(groveMap), { recursive: true });
    await fs.writeFile(
      groveMap,
      pretty(
        withIdentity(
          value.meshMap,
          "deep-tree-echo",
          identityModel3Path("deep-tree-echo"),
        ),
      ),
    );

    console.log(
      JSON.stringify(
        {
          melody: melodyMap,
          miara: miaraMap,
          grove: groveMap,
          drawableCount: value.drawableCount,
          counts: value.counts,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

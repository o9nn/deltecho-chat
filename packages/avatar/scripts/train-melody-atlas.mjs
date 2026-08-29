#!/usr/bin/env node
/**
 * Load the official Miara Cubism mesh in Chromium, reproject the shipped
 * Melody still through live drawable triangles, and write melody-atlas.png.
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
const outPng = path.join(
  frontendStatic,
  "images/avatar/identities/melody-atlas.png",
);
const outDump = path.join(avatarRoot, "scripts/melody-mesh-dump.json");

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
  if (clean === "/" || clean === "/train") {
    return path.join(here, "train-melody-atlas.html");
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
    let resolved = path.join(base, clean.slice(prefix.length));
    return resolved;
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

function decodeDataUrl(dataUrl) {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("train page did not return a PNG data URL");
  return Buffer.from(match[1], "base64");
}

async function main() {
  await fs.access(path.join(distDir, "automesh/index.js"));
  await fs.access(
    path.join(frontendStatic, "images/avatar/identities/melody.webp"),
  );
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
    await page.goto(`http://127.0.0.1:${port}/scripts/train-melody-atlas.html`, {
      waitUntil: "domcontentloaded",
    });
    const result = await page.waitForFunction(
      () => window.__TRAIN_RESULT__ || window.__TRAIN_ERROR__,
      null,
      { timeout: 180_000 },
    );
    const value = await result.jsonValue();
    if (typeof value === "string") {
      throw new Error(value);
    }
    if (!value || value.ok !== true) {
      throw new Error(await page.evaluate(() => window.__TRAIN_ERROR__));
    }
    await fs.mkdir(path.dirname(outPng), { recursive: true });
    await fs.writeFile(outPng, decodeDataUrl(value.atlasDataUrl));
    await fs.writeFile(
      outDump,
      JSON.stringify(
        {
          drawableCount: value.drawableCount,
          triangleDrawables: value.triangleDrawables,
          environmentDrawables: value.environmentDrawables,
          figure: value.figure,
          painted: value.painted,
          purplePixels: value.purplePixels,
          goldPixels: value.goldPixels,
          meanRgb: value.meanRgb,
          triangles: value.triangles,
          envSkipped: value.envSkipped,
          residual: value.residual,
          atlasWidth: value.atlasWidth,
          atlasHeight: value.atlasHeight,
          opaquePixels: value.opaquePixels,
          photoWidth: value.photoWidth,
          photoHeight: value.photoHeight,
          ids: value.ids,
          mapping: value.mapping,
        },
        null,
        2,
      ),
    );
    const shotDir = "/opt/cursor/artifacts";
    await fs.mkdir(shotDir, { recursive: true });
    await page.locator("#stage").screenshot({
      path: path.join(shotDir, "melody_automesh_live_overlay.png"),
    });
    await page.screenshot({
      path: path.join(shotDir, "melody_automesh_train_page.png"),
      fullPage: true,
    });
    console.log(
      JSON.stringify(
        {
          atlas: outPng,
          dump: outDump,
          drawableCount: value.drawableCount,
          triangleDrawables: value.triangleDrawables,
          painted: value.painted,
          purplePixels: value.purplePixels,
          goldPixels: value.goldPixels,
          meanRgb: value.meanRgb,
          envSkipped: value.envSkipped,
          withUvs: value.withUvs,
          withPositions: value.withPositions,
          sample: value.sample,
          figure: value.figure,
          residual: value.residual,
          opaquePixels: value.opaquePixels,
          bytes: (await fs.stat(outPng)).size,
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

#!/usr/bin/env node
import { watch } from "chokidar";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(cwd, "../..");
let running = false;
let dirty = false;
let stopping = false;
let child;

function build() {
  if (stopping) return;
  dirty = true;
  if (running) return;
  running = true;
  dirty = false;
  // Preserve the repository's ordinary copy logic; build:static selects the core last.
  child = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["build:static"],
    {
      cwd,
      stdio: "inherit",
      env: process.env,
    },
  );
  child.on("error", (error) => {
    console.error(error);
    process.exitCode = 1;
    watcher.close();
  });
  child.on("exit", (code) => {
    running = false;
    if (code !== 0) {
      process.exitCode = code || 1;
      watcher.close();
      return;
    }
    if (dirty) build();
  });
}

const watcher = watch(
  [
    resolve(root, "static"),
    resolve(cwd, "static"),
    resolve(root, "images"),
    resolve(root, "third_party/purism-core/1.1.0"),
    resolve(root, "scripts/purism-cubism4-adapter.js"),
  ],
  { ignoreInitial: true },
);
watcher.on("ready", build);
watcher.on("all", build);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    watcher.close();
    child?.kill(signal);
  });
}

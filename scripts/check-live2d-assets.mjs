#!/usr/bin/env node

import { access, readFile, readdir, stat } from "node:fs/promises";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
const root = resolve(import.meta.dirname, "..");
const modelPaths = [];
const collectModelManifests = async (relativeDirectory) => {
  const absoluteDirectory = resolve(root, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) {
      await collectModelManifests(relativePath);
    } else if (entry.isFile() && entry.name.endsWith(".model3.json")) {
      modelPaths.push(relativePath);
    }
  }
};
for (const directory of [
  "packages/frontend/static",
  "packages/avatar/demo/assets",
]) {
  await collectModelManifests(directory);
}
modelPaths.sort();
if (modelPaths.length === 0) {
  throw new Error("No Live2D model3 manifests were discovered");
}

const verified = new Map();
const failures = [];
const record = async (relativePath, kind) => {
  const absolutePath = resolve(root, relativePath);
  const repositoryRelative = relative(root, absolutePath);
  if (
    isAbsolute(repositoryRelative) ||
    repositoryRelative === ".." ||
    repositoryRelative.startsWith(`..${sep}`)
  ) {
    throw new Error(`Live2D reference escapes the repository: ${relativePath}`);
  }
  if (verified.has(repositoryRelative)) return;
  try {
    await access(absolutePath);
    const metadata = await stat(absolutePath);
    if (!metadata.isFile() || metadata.size === 0) {
      throw new Error("resource is not a non-empty file");
    }
    if (extname(absolutePath).toLowerCase() === ".json") {
      JSON.parse(await readFile(absolutePath, "utf8"));
    }
    verified.set(repositoryRelative, { kind, bytes: metadata.size });
  } catch (error) {
    failures.push(
      `${repositoryRelative}\t${kind}\t${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

for (const modelPath of modelPaths) {
  await record(modelPath, "model3");
  const absoluteModelPath = resolve(root, modelPath);
  const model = JSON.parse(await readFile(absoluteModelPath, "utf8"));
  const base = dirname(absoluteModelPath);
  const references = model.FileReferences ?? {};
  const files = [
    [references.Moc, "moc3"],
    [references.Physics, "physics3"],
    [references.Pose, "pose3"],
    [references.DisplayInfo, "cdi3"],
    ...(Array.isArray(references.Textures)
      ? references.Textures.map((path) => [path, "texture"])
      : []),
    ...(Array.isArray(references.Expressions)
      ? references.Expressions.map((entry) => [entry?.File, "expression"])
      : []),
    ...Object.values(references.Motions ?? {}).flatMap((motions) =>
      Array.isArray(motions)
        ? motions.map((entry) => [entry?.File, "motion"])
        : [],
    ),
  ];
  for (const [path, kind] of files) {
    if (typeof path !== "string" || path.length === 0) continue;
    const absoluteAsset = resolve(base, path);
    const fromBase = relative(base, absoluteAsset);
    if (
      isAbsolute(fromBase) ||
      fromBase === ".." ||
      fromBase.startsWith(`..${sep}`)
    ) {
      failures.push(`${relative(root, absoluteAsset)}\t${kind}\tpath escape`);
      continue;
    }
    await record(relative(root, absoluteAsset), kind);
  }
}

if (failures.length > 0) {
  console.error("path\tkind\terror");
  failures.forEach((failure) => console.error(failure));
  process.exitCode = 1;
} else {
  const byKind = {};
  let totalBytes = 0;
  for (const { kind, bytes } of verified.values()) {
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    totalBytes += bytes;
  }
  console.log(
    `[live2d-assets] ${modelPaths.length} manifests; ${verified.size} unique non-empty resources; ${totalBytes} bytes`,
  );
  console.log(`[live2d-assets] ${JSON.stringify(byKind)}`);
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const moduleUrl = pathToFileURL(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../bin/lib/gather-version-info.js",
  ),
).href;

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function fixture(t, withGit = true) {
  const cwd = mkdtempSync(path.join(tmpdir(), "dte-version-fixture-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  if (withGit) {
    git(cwd, "init", "--quiet", "--initial-branch=main");
    git(cwd, "config", "user.name", "Version fixture");
    git(cwd, "config", "user.email", "version-fixture@example.invalid");
    writeFileSync(path.join(cwd, "fixture.txt"), "version fixture\n");
    git(cwd, "add", "fixture.txt");
    git(
      cwd,
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      "Temporary version fixture",
    );
  }
  return cwd;
}

function gather(cwd, overrides = {}) {
  const env = { ...process.env };
  for (const name of [
    "GITHUB_HEAD_REF",
    "GITHUB_REF",
    "VERSION_INFO_GIT_REF",
    "SOURCE_DATE_EPOCH",
    "GIT_DIR",
    "GIT_WORK_TREE",
  ]) {
    delete env[name];
  }
  Object.assign(env, overrides);
  const script = `import {gatherBuildInfo} from ${JSON.stringify(
    moduleUrl,
  )}; console.log(JSON.stringify(await gatherBuildInfo()))`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    { cwd, env, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  return { info: JSON.parse(result.stdout.trim()), stderr: result.stderr };
}

test("tagless checkout reports its real short commit with no error noise", (t) => {
  const cwd = fixture(t);
  const { info, stderr } = gather(cwd);
  assert.equal(info.GIT_REF, git(cwd, "describe", "--tags", "--always"));
  assert.equal(stderr, "");
});

test("tagged checkout retains tag semantics", (t) => {
  const cwd = fixture(t);
  git(cwd, "tag", "v-fixture");
  const { info, stderr } = gather(cwd);
  assert.equal(info.GIT_REF, "v-fixture");
  assert.equal(stderr, "");
});

test("detached checkout reports genuine commit without symbolic-ref stack trace", (t) => {
  const cwd = fixture(t);
  git(cwd, "checkout", "--quiet", "--detach", "HEAD");
  const { info, stderr } = gather(cwd);
  assert.equal(info.GIT_REF, git(cwd, "describe", "--tags", "--always"));
  assert.equal(stderr, "");
});

test("named feature branch retains the existing suffix convention", (t) => {
  const cwd = fixture(t);
  git(cwd, "checkout", "--quiet", "-b", "feature/repair");
  const { info, stderr } = gather(cwd);
  assert.equal(
    info.GIT_REF,
    git(cwd, "describe", "--tags", "--always") + "-repair",
  );
  assert.equal(stderr, "");
});

test("CI branch override precedes detached-checkout fallback", (t) => {
  const cwd = fixture(t);
  git(cwd, "checkout", "--quiet", "--detach", "HEAD");
  const { info, stderr } = gather(cwd, {
    GITHUB_HEAD_REF: "feature/review",
    GITHUB_REF: "refs/pull/1/merge",
  });
  assert.equal(
    info.GIT_REF,
    git(cwd, "describe", "--tags", "--always") + "-review",
  );
  assert.equal(stderr, "");
});

test("explicit ref and reproducible timestamp work in a non-Git source archive", (t) => {
  const cwd = fixture(t, false);
  const { info, stderr } = gather(cwd, {
    VERSION_INFO_GIT_REF: "declared-build-ref",
    SOURCE_DATE_EPOCH: "123",
  });
  assert.equal(info.GIT_REF, "declared-build-ref");
  assert.equal(info.BUILD_TIMESTAMP, 123000);
  assert.equal(stderr, "");
});

test("source archive without declared provenance reports unknown with one useful warning", (t) => {
  const cwd = fixture(t, false);
  const { info, stderr } = gather(cwd);
  assert.equal(info.GIT_REF, "unknown");
  assert.equal(
    stderr.trim(),
    "Git version metadata unavailable; set VERSION_INFO_GIT_REF manually for source archives.",
  );
});

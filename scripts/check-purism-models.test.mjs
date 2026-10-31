import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import vm from "node:vm";
import { test } from "node:test";
import { copyLive2dCore } from "./copy-live2d-core.mjs";

const root = resolve(import.meta.dirname, "..");
const vendorRoot = resolve(root, "third_party/purism-core");
const coreRoot = resolve(vendorRoot, "1.1.0");
const provenancePath = resolve(coreRoot, "provenance.json");
const adapterPath = resolve(root, "scripts/purism-cubism4-adapter.js");
const fixturePath = resolve(vendorRoot, "testdata/fixture.moc3");
const reportPath = process.env.PURISM_CI_REPORT;

const EXPECTED = Object.freeze({
  sourceRevision: "1069334965522df5d0b791e97f01e26b19c45456",
  release: "v1.1.0",
  project: "SakuraMotion/PurismCore",
  files: Object.freeze({
    "1.1.0/LICENSE": {
      bytes: 1103,
      sha256:
        "0c420f717a04a7bbc4cd3c652c83e77d0d7883a14b363d60af94ff6cdf3b7768",
      license: "MIT",
    },
    "1.1.0/core-v5.js": {
      bytes: 256528,
      sha256:
        "3eec0b1e6cd20bab0773744228aac21f4c882dbef708c28379ba6315a11b15f4",
      license: "MIT",
    },
    "1.1.0/core-v6.js": {
      bytes: 257887,
      sha256:
        "48ce3fcad8e420c4870d4c7895bafa490527dec21901f965b3ac158554f5de79",
      license: "MIT",
    },
    "testdata/LICENSE_TESTDATA": {
      bytes: 184,
      sha256:
        "02aac1527d5a54df5ee373fd77899ff44fcdc05629c2fdc1ea35a28aa9ac8da1",
      license: "CC0 (upstream assertion)",
    },
    "testdata/fixture.moc3": {
      bytes: 849664,
      sha256:
        "edd79490147c4920d16dc7c80dffe3fc998db0e599c9024c884fd9d4e1041f9b",
      license: "CC0 (upstream assertion)",
    },
  }),
});

const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
const adapterSource = readFileSync(adapterPath, "utf8");
const fixtureBytes = readFileSync(fixturePath);
const report = {
  schema_version: 1,
  fixture: {
    path: "third_party/purism-core/testdata/fixture.moc3",
    qa_only: true,
    shipped_with_app: false,
  },
  provenance: {
    project: provenance.project,
    release: provenance.release,
    source_revision: provenance.source_revision,
  },
  checks: {},
};

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function writeReport() {
  if (!reportPath) return;
  const destination = resolve(root, reportPath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
}

function fixtureArrayBuffer() {
  return fixtureBytes.buffer.slice(
    fixtureBytes.byteOffset,
    fixtureBytes.byteOffset + fixtureBytes.byteLength,
  );
}

function createRuntime(coreFile, sourcePath) {
  const corePath = sourcePath ?? resolve(coreRoot, coreFile);
  const quietConsole = Object.freeze({
    debug() {},
    error() {},
    info() {},
    log() {},
    warn() {},
  });
  const context = vm.createContext({
    ArrayBuffer,
    Buffer,
    Float32Array,
    Int32Array,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WebAssembly,
    __dirname: dirname(corePath),
    __filename: corePath,
    console: quietConsole,
    process,
    require: createRequire(import.meta.url),
  });
  vm.runInContext(readFileSync(corePath, "utf8"), context, {
    filename: relative(root, corePath),
    timeout: 20_000,
  });
  return context;
}

function evaluate(context, source) {
  return vm.runInContext(source, context, { timeout: 20_000 });
}

function fromRuntime(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadAdapter(context) {
  vm.runInContext(adapterSource, context, {
    filename: relative(root, adapterPath),
    timeout: 20_000,
  });
}

test("pinned Purism vendor provenance, filenames, and bytes are exact", () => {
  assert.equal(provenance.schema_version, 1);
  assert.equal(provenance.project, EXPECTED.project);
  assert.equal(provenance.source_revision, EXPECTED.sourceRevision);
  assert.equal(provenance.release, EXPECTED.release);
  assert.equal(provenance.default_backend, "cubism");
  assert.equal(provenance.purism_host_abi, "v5");
  assert.deepEqual(
    Object.keys(provenance.files).sort(),
    Object.keys(EXPECTED.files).sort(),
    "provenance must retain the pinned vendor-relative filenames; renamed samples are not accepted",
  );

  const observed = {};
  for (const [vendorRelativePath, expected] of Object.entries(EXPECTED.files)) {
    const absolutePath = resolve(vendorRoot, vendorRelativePath);
    assert.equal(
      relative(vendorRoot, absolutePath),
      vendorRelativePath,
      `vendor path escaped: ${vendorRelativePath}`,
    );
    assert.ok(
      existsSync(absolutePath),
      `missing pinned vendor file: ${vendorRelativePath}`,
    );
    const bytes = readFileSync(absolutePath);
    const actual = {
      bytes: bytes.byteLength,
      license: provenance.files[vendorRelativePath]?.license,
      sha256: digest(bytes),
    };
    assert.deepEqual(
      provenance.files[vendorRelativePath],
      expected,
      `provenance entry for ${vendorRelativePath} differs from the fixed v1.1.0 pin`,
    );
    assert.deepEqual(
      actual,
      expected,
      `vendored bytes changed: ${vendorRelativePath}`,
    );
    observed[vendorRelativePath] = actual;
  }

  assert.match(
    readFileSync(resolve(coreRoot, "LICENSE"), "utf8"),
    /^MIT License$/m,
  );
  assert.match(
    readFileSync(resolve(vendorRoot, "testdata/LICENSE_TESTDATA"), "utf8"),
    /3d8e869a678a1dac\.moc3 \(CC0\)/,
  );
  report.checks.provenance = { passed: true, files: observed };
  writeReport();
});

test("unadapted v5 evaluator exposes native render orders but no legacy drawable alias", () => {
  const context = createRuntime("core-v5.js");
  context.fixture = fixtureArrayBuffer();
  const result = evaluate(
    context,
    `(() => {
      const moc = PurismCore.Moc.fromArrayBuffer(fixture);
      if (!moc) throw new Error("the pinned fixture did not produce a native MOC");
      const model = PurismCore.Model.fromMoc(moc);
      if (!model) throw new Error("the pinned fixture did not produce a native model");
      try {
        return {
          abi: PurismCore.Version.csmGetVersion(),
          drawableCount: model.drawables.count,
          legacyAliasMissing: model.drawables.renderOrders === undefined,
          nativeRenderOrderCount: model.renderOrders.length,
          parameterCount: model.parameters.count,
        };
      } finally {
        model.release();
        moc._release();
      }
    })()`,
  );
  assert.deepEqual(fromRuntime(result), {
    abi: 0x05010000,
    drawableCount: 29,
    legacyAliasMissing: true,
    nativeRenderOrderCount: 29,
    parameterCount: 32,
  });
  report.checks.unadapted_native_layout = { passed: true, ...result };
  writeReport();
});

test("adapter aliases the exact native render-order typed array, is idempotent, and keeps numeric arrays finite", () => {
  const context = createRuntime("core-v5.js");
  context.fixture = fixtureArrayBuffer();
  loadAdapter(context);
  const result = evaluate(
    context,
    `(() => {
      installDtePurismCubism4(PurismCore);
      const firstAdaptedFactory = PurismCore.Model.fromMoc;
      installDtePurismCubism4(PurismCore);
      const moc = PurismCore.Moc.fromArrayBuffer(fixture);
      if (!moc) throw new Error("the pinned fixture did not produce a native MOC");
      const model = PurismCore.Model.fromMoc(moc);
      if (!model) throw new Error("the pinned fixture did not produce a native model");
      try {
        model.update();
        const failures = [];
        let numericArrayCount = 0;
        const seen = new Set();
        const scan = (value, label) => {
          if (!value || typeof value !== "object" || seen.has(value)) return;
          seen.add(value);
          if (ArrayBuffer.isView(value)) {
            numericArrayCount++;
            for (let index = 0; index < value.length; index++) {
              if (!Number.isFinite(value[index])) failures.push(label + "[" + index + "]");
            }
            return;
          }
          if (Array.isArray(value)) {
            if (value.every((entry) => typeof entry === "number")) {
              numericArrayCount++;
              value.forEach((entry, index) => {
                if (!Number.isFinite(entry)) failures.push(label + "[" + index + "]");
              });
            } else {
              value.forEach((entry, index) => scan(entry, label + "[" + index + "]"));
            }
            return;
          }
          for (const [key, entry] of Object.entries(value)) scan(entry, label + "." + key);
        };
        scan(model, "model");
        const descriptor = Object.getOwnPropertyDescriptor(model.drawables, "renderOrders");
        return {
          adapterIdempotent: firstAdaptedFactory === PurismCore.Model.fromMoc,
          allNumericArrayDataFinite: failures.length === 0,
          drawableCount: model.drawables.count,
          finiteArrayCount: numericArrayCount,
          lastError: model.getLastError(),
          legacyAliasIsExactNativeArray: model.drawables.renderOrders === model.renderOrders,
          legacyAliasSharesNativeBuffer: model.drawables.renderOrders.buffer === model.renderOrders.buffer,
          legacyAliasWritable: descriptor?.writable,
          renderOrderCount: model.renderOrders.length,
        };
      } finally {
        model.release();
        moc._release();
      }
    })()`,
  );
  assert.equal(result.adapterIdempotent, true);
  assert.equal(result.legacyAliasIsExactNativeArray, true);
  assert.equal(result.legacyAliasSharesNativeBuffer, true);
  assert.equal(result.legacyAliasWritable, false);
  assert.equal(result.allNumericArrayDataFinite, true);
  assert.equal(result.lastError, 0);
  assert.equal(result.drawableCount, 29);
  assert.equal(result.renderOrderCount, 29);
  assert.ok(
    result.finiteArrayCount > 0,
    "native numeric arrays were not inspected",
  );
  report.checks.adapter = { passed: true, ...result };
  writeReport();
});

test("actual blink and mouth parameters alter evaluated fixture vertices", () => {
  const context = createRuntime("core-v5.js");
  context.fixture = fixtureArrayBuffer();
  loadAdapter(context);
  const result = evaluate(
    context,
    `(() => {
      installDtePurismCubism4(PurismCore);
      const moc = PurismCore.Moc.fromArrayBuffer(fixture);
      if (!moc) throw new Error("the pinned fixture did not produce a native MOC");
      const model = PurismCore.Model.fromMoc(moc);
      if (!model) throw new Error("the pinned fixture did not produce a native model");
      try {
        const results = [];
        for (const id of ["ParamEyeLOpen", "ParamEyeROpen", "ParamMouthOpenY"]) {
          model.parameters.values.set(model.parameters.defaultValues);
          model.update();
          const before = model.drawables.vertexPositions.map((positions) => Array.from(positions));
          const index = model.parameters.ids.indexOf(id);
          if (index < 0) throw new Error("fixture is missing " + id);
          model.parameters.values[index] = id.includes("Eye") ? 0 : 1;
          model.update();
          let changedScalars = 0;
          model.drawables.vertexPositions.forEach((positions, drawableIndex) => {
            for (let scalarIndex = 0; scalarIndex < positions.length; scalarIndex++) {
              if (Math.abs(positions[scalarIndex] - before[drawableIndex][scalarIndex]) > 1e-7) {
                changedScalars++;
              }
            }
          });
          results.push({ id, changedScalars, lastError: model.getLastError() });
        }
        return results;
      } finally {
        model.release();
        moc._release();
      }
    })()`,
  );
  for (const parameter of result) {
    assert.ok(
      parameter.changedScalars > 0,
      `${parameter.id} did not alter native evaluated vertices`,
    );
    assert.equal(
      parameter.lastError,
      0,
      `${parameter.id} set a native evaluator error`,
    );
  }
  report.checks.geometry_evaluation = {
    passed: true,
    parameter_results: result,
  };
  writeReport();
});

test("native parser rejects invalid and materially truncated MOC3 bytes", () => {
  const context = createRuntime("core-v5.js");
  context.fixture = fixtureArrayBuffer();
  const result = evaluate(
    context,
    `(() => ({
      absent: PurismCore.Moc.fromArrayBuffer(null) === null,
      invalid80: PurismCore.Moc.fromArrayBuffer(new Uint8Array(80).buffer) === null,
      truncatedHalf: PurismCore.Moc.fromArrayBuffer(fixture.slice(0, Math.floor(fixture.byteLength / 2))) === null,
    }))()`,
  );
  assert.deepEqual(fromRuntime(result), {
    absent: true,
    invalid80: true,
    truncatedHalf: true,
  });
  report.checks.parser_rejection = { passed: true, ...result };
  writeReport();
});

test("v6 evaluator is rejected by the v5-only compatibility adapter", () => {
  const context = createRuntime("core-v6.js");
  loadAdapter(context);
  assert.throws(
    () => evaluate(context, "installDtePurismCubism4(PurismCore)"),
    /requires the tested PurismCore v5 ABI build/,
  );
  report.checks.v6_rejection = { passed: true };
  writeReport();
});

test("exact product-packaged script bootstraps the native adapter and loads a genuine model", () => {
  const destination = mkdtempSync(resolve(tmpdir(), "dte-packaged-purism-"));
  try {
    const metadata = copyLive2dCore({ destination, backend: "purism" });
    const packagedPath = resolve(destination, "live2dcubismcore.min.js");
    assert.equal(
      digest(readFileSync(packagedPath)),
      metadata.packagedCoreSha256,
    );
    const context = createRuntime("core-v5.js", packagedPath);
    context.fixture = fixtureArrayBuffer();
    const result = evaluate(
      context,
      `(() => {
      if (Live2DCubismCore !== PurismCore) throw new Error("product bootstrap did not bind PurismCore");
      const moc = Live2DCubismCore.Moc.fromArrayBuffer(fixture);
      if (!moc) throw new Error("packaged runtime rejected the genuine fixture");
      const model = Live2DCubismCore.Model.fromMoc(moc);
      if (!model) throw new Error("packaged runtime could not initialize the genuine model");
      try {
        model.update();
        return { alias: model.drawables.renderOrders === model.renderOrders,
          drawableCount: model.drawables.count, lastError: model.getLastError(),
          finiteVertices: model.drawables.vertexPositions.every(p => Array.from(p).every(Number.isFinite)) };
      } finally { model.release(); moc._release(); }
    })()`,
    );
    assert.deepEqual(fromRuntime(result), {
      alias: true,
      drawableCount: 29,
      lastError: 0,
      finiteVertices: true,
    });
    report.checks.product_packaged_bootstrap = {
      passed: true,
      packaged_sha256: metadata.packagedCoreSha256,
      ...result,
    };
    writeReport();
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
});

process.on("exit", writeReport);

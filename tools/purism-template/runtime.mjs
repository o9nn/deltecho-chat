import vm from "node:vm";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { copyLive2dCore } from "../../scripts/copy-live2d-core.mjs";

export function loadPurismRuntime(destination) {
  copyLive2dCore({ destination, backend: "purism" });
  const path = resolve(destination, "live2dcubismcore.min.js");
  const context = vm.createContext({
    ArrayBuffer,
    Buffer,
    Uint8Array,
    Float32Array,
    Int32Array,
    WebAssembly,
    TextEncoder,
    TextDecoder,
    __dirname: dirname(path),
    __filename: path,
    process,
    require: createRequire(import.meta.url),
    console: { log() {}, error() {}, warn() {}, debug() {}, info() {} },
  });
  vm.runInContext(readFileSync(path, "utf8"), context, {
    timeout: 20000,
    filename: path,
  });
  return context;
}
export function inspectModel(context, bytes, values = {}) {
  context.templateBytes = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  context.templateValues = values;
  return JSON.parse(
    JSON.stringify(
      vm.runInContext(
        `(() => {
    const moc = Live2DCubismCore.Moc.fromArrayBuffer(templateBytes);
    if (!moc) throw new Error('native Purism parser rejected generated model');
    let model;
    try {
      model = Live2DCubismCore.Model.fromMoc(moc);
      if (!model) throw new Error('native model initialization failed');
      for (const [id, value] of Object.entries(templateValues)) {
        if (!Number.isFinite(value)) throw new Error('non-finite parameter');
        const index = model.parameters.ids.indexOf(id);
        if (index < 0) throw new Error('unknown parameter ' + id);
        model.parameters.values[index] = value;
      }
      model.update();
      const positions = model.drawables.vertexPositions.map(p => Array.from(p));
      if (!positions.every(p => p.every(Number.isFinite)) || model.getLastError() !== 0) throw new Error('native evaluation failed');
      return {parameterIds: model.parameters.ids, drawableIds: model.drawables.ids, positions,
        vertexCounts: Array.from(model.drawables.vertexCounts), opacities: Array.from(model.drawables.opacities),
        canvas: model.canvasinfo, lastError: model.getLastError(), nativeRenderOrderAlias: model.drawables.renderOrders === model.renderOrders};
    } finally { if (model) model.release(); moc._release(); }
  })()`,
        context,
        { timeout: 20000 },
      ),
    ),
  );
}

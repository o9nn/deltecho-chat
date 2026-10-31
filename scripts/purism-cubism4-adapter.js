/* MIT. DeltEcho host compatibility adapter for PurismCore v1.1.0, ABI v5.
 * No model data, generated geometry, renderer or neural logic is replaced.
 * Upstream: https://github.com/SakuraMotion/PurismCore
 */
(function (global) {
  "use strict";
  global.installDtePurismCubism4 = function (core) {
    if (!core || typeof core.Model?.fromMoc !== "function") {
      throw new TypeError("A loaded PurismCore runtime is required");
    }
    if (core.Version.csmGetVersion() !== 0x05010000) {
      throw new Error(
        "This adapter requires the tested PurismCore v5 ABI build",
      );
    }
    if (core.Model.fromMoc.__dteNativeRenderOrdersAlias) return core;
    const original = core.Model.fromMoc;
    const adapted = function (moc) {
      const model = original.call(this, moc);
      if (!model) return model;
      const orders = model.renderOrders;
      if (
        !(orders instanceof Int32Array) ||
        orders.length !== model.drawables.count
      ) {
        model.release();
        throw new Error(
          "Unsupported native render-order layout; no fallback fabricated",
        );
      }
      if (model.drawables.renderOrders === undefined) {
        Object.defineProperty(model.drawables, "renderOrders", {
          value: orders,
          writable: false,
          configurable: false,
          enumerable: true,
        });
      } else if (model.drawables.renderOrders !== orders) {
        model.release();
        throw new Error("Conflicting render-order buffers");
      }
      return model;
    };
    Object.defineProperty(adapted, "__dteNativeRenderOrdersAlias", {
      value: true,
    });
    core.Model.fromMoc = adapted;
    global.Live2DCubismCore = core;
    return core;
  };
})(globalThis);
